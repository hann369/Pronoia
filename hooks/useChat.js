'use client';
// hooks/useChat.js — Real-time E2E Chat Hook
import { useState, useEffect, useCallback, useRef } from 'react';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import {
  collection,
  doc,
  query,
  where,
  getDocs,
  getDoc,
  setDoc,
  addDoc,
  onSnapshot,
  orderBy,
  limit
} from 'firebase/firestore';
import {
  generateKeyPair,
  exportPublicKey,
  importPublicKey,
  storeLocalPrivateKey,
  loadLocalPrivateKey,
  deriveSharedSecret,
  encryptMessage,
  decryptMessage,
  generateGroupKey,
  wrapGroupKey,
  unwrapGroupKey,
  encryptWithGroupKey, // Wait! We will implement message encryption in crypto.js
  // Let's use AES key raw bytes wrapping/unwrapping directly.
} from '@/lib/crypto';

export function useChat() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [activeChatMessages, setActiveChatMessages] = useState([]);
  const [loadingChats, setLoadingChats] = useState(true);
  const [myPrivateKey, setMyPrivateKey] = useState(null);
  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  
  // Track listeners to clean up
  const activeUnsubscribeRef = useRef(null);

  // --- Initialize Keys on Load ---
  useEffect(() => {
    async function initKeys() {
      if (!user || !db) return;
      try {
        // 1. Try to load local private key
        let prvKey = await loadLocalPrivateKey(user.uid);
        if (!prvKey) {
          console.log("[E2E Chat] Generating new E2E key pair...");
          // No key found: generate a new pair
          const keyPair = await generateKeyPair();
          prvKey = keyPair.privateKey;
          
          // Save private key locally in IndexedDB
          await storeLocalPrivateKey(user.uid, prvKey);
          
          // Export and upload public key to Firestore
          const pubJwk = await exportPublicKey(keyPair.publicKey);
          await setDoc(doc(db, 'users', user.uid), {
            publicKey: {
              jwk: pubJwk,
              createdAt: new Date().toISOString()
            }
          }, { merge: true });
        }
        
        setMyPrivateKey(prvKey);
      } catch (err) {
        console.error("[E2E Chat] Key initialization failed:", err);
      }
    }
    
    initKeys();
  }, [user]);

  // --- Helper to fetch own username ---
  const profileName = useCallback(() => {
    return user?.email?.split('@')[0] || 'User';
  }, [user]);

  // --- Mark Chat as Read ---
  const markChatAsRead = useCallback(async (chatId, chatData) => {
    if (!user || !db || !chatData || !chatData.lastMessage) return;
    const lastMsg = chatData.lastMessage;
    
    if (lastMsg.senderUid !== user.uid && (!lastMsg.readBy || !lastMsg.readBy.includes(user.uid))) {
      const updatedReadBy = [...(lastMsg.readBy || []), user.uid];
      await setDoc(doc(db, 'chats', chatId), {
        lastMessage: {
          ...lastMsg,
          readBy: updatedReadBy
        }
      }, { merge: true });
    }
  }, [user]);

  // --- Listen to Conversations ---
  useEffect(() => {
    if (!user || !db) {
      Promise.resolve().then(() => {
        setConversations([]);
        setLoadingChats(false);
      });
      return;
    }

    Promise.resolve().then(() => {
      setLoadingChats(true);
    });

    const q = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', user.uid)
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const chatList = [];
      let totalUnread = 0;

      for (const d of snapshot.docs) {
        const data = d.data();
        
        // Resolve metadata for Direct chats (profile details of peer)
        let resolvedTitle = data.name || "Group Chat";
        let resolvedAvatar = data.icon || "";
        
        if (data.type === 'direct') {
          const peerUid = data.participants.find(uid => uid !== user.uid);
          // Fetch peer profile
          try {
            const peerDoc = await getDoc(doc(db, 'users', peerUid));
            if (peerDoc.exists()) {
              const profile = peerDoc.data().profile;
              resolvedTitle = profile?.username || peerUid.substring(0, 8);
              resolvedAvatar = profile?.avatar || "";
            }
          } catch (e) {
            console.error("Failed to load peer profile:", peerUid, e);
          }
        } else if (data.type === 'community') {
          resolvedTitle = "Pronoia Community 📣";
        }

        // Count unread messages
        const hasUnread = data.lastMessage && 
                          data.lastMessage.senderUid !== user.uid && 
                          (!data.lastMessage.readBy || !data.lastMessage.readBy.includes(user.uid));
        if (hasUnread) {
          totalUnread++;
        }

        chatList.push({
          id: d.id,
          title: resolvedTitle,
          avatar: resolvedAvatar,
          ...data,
          hasUnread
        });
      }

      // Sort conversations by last message timestamp desc
      chatList.sort((a, b) => {
        const tA = a.lastMessage?.timestamp ? new Date(a.lastMessage.timestamp) : 0;
        const tB = b.lastMessage?.timestamp ? new Date(b.lastMessage.timestamp) : 0;
        return tB - tA;
      });

      setConversations(chatList);
      setChatUnreadCount(totalUnread);
      setLoadingChats(false);
    }, (err) => {
      console.error("useChat conversations snapshot error:", err);
      setLoadingChats(false);
    });

    return unsubscribe;
  }, [user]);

  // --- Create Direct 1:1 Chat ---
  const createDirectChat = useCallback(async (targetUid) => {
    if (!user || !db || !myPrivateKey) return null;
    try {
      // Check if chat already exists
      const existingQuery = query(
        collection(db, 'chats'),
        where('participants', 'array-contains', user.uid)
      );
      const snap = await getDocs(existingQuery);
      let existingChat = null;
      snap.forEach(d => {
        const data = d.data();
        if (data.type === 'direct' && data.participants.includes(targetUid)) {
          existingChat = { id: d.id, ...data };
        }
      });

      if (existingChat) return existingChat.id;

      // Create new chat doc
      const chatDocRef = doc(collection(db, 'chats'));
      const payload = {
        type: 'direct',
        participants: [user.uid, targetUid],
        createdAt: new Date().toISOString(),
        lastMessage: null
      };
      
      await setDoc(chatDocRef, payload);
      return chatDocRef.id;
    } catch (err) {
      console.error("createDirectChat failed:", err);
      return null;
    }
  }, [user, myPrivateKey]);

  // --- Create Group Chat ---
  const createGroupChat = useCallback(async (name, memberUids) => {
    if (!user || !db || !myPrivateKey) return null;
    try {
      const chatDocRef = doc(collection(db, 'chats'));
      const participants = [user.uid, ...memberUids];
      
      // 1. Generate new AES group key
      const groupKey = await generateGroupKey();
      
      // 2. Fetch public keys of all members to wrap group key
      const groupKeyPayload = {};
      
      // Wrap for self
      const myUserDoc = await getDoc(doc(db, 'users', user.uid));
      if (myUserDoc.exists() && myUserDoc.data().publicKey?.jwk) {
        const myPub = await importPublicKey(myUserDoc.data().publicKey.jwk);
        const wrapped = await wrapGroupKey(groupKey, myPub, myPrivateKey);
        groupKeyPayload[user.uid] = wrapped;
      }

      // Wrap for other members
      for (const mUid of memberUids) {
        try {
          const uDoc = await getDoc(doc(db, 'users', mUid));
          if (uDoc.exists() && uDoc.data().publicKey?.jwk) {
            const memberPub = await importPublicKey(uDoc.data().publicKey.jwk);
            const wrapped = await wrapGroupKey(groupKey, memberPub, myPrivateKey);
            groupKeyPayload[mUid] = wrapped;
          }
        } catch (e) {
          console.warn("Failed to wrap key for member:", mUid, e);
        }
      }

      const payload = {
        type: 'group',
        name,
        participants,
        admins: [user.uid],
        groupKey: groupKeyPayload,
        createdAt: new Date().toISOString(),
        lastMessage: null
      };

      await setDoc(chatDocRef, payload);
      return chatDocRef.id;
    } catch (err) {
      console.error("createGroupChat failed:", err);
      return null;
    }
  }, [user, myPrivateKey]);

  // --- Listen to Messages of Active Chat ---
  const listenToMessages = useCallback((chatId) => {
    if (!user || !db || !myPrivateKey) return;

    if (activeUnsubscribeRef.current) {
      activeUnsubscribeRef.current();
    }

    setActiveChatMessages([]);

    const messagesQuery = query(
      collection(db, 'chats', chatId, 'messages'),
      orderBy('timestamp', 'asc')
    );

    activeUnsubscribeRef.current = onSnapshot(messagesQuery, async (snapshot) => {
      const messagesList = [];
      
      // Load chat metadata first to check group keys
      const chatDoc = await getDoc(doc(db, 'chats', chatId));
      if (!chatDoc.exists()) return;
      const chatData = chatDoc.data();

      // Resolve key depending on chat type
      let activeKey = null;

      if (chatData.type === 'direct') {
        const peerUid = chatData.participants.find(id => id !== user.uid) || user.uid;
        try {
          const peerDoc = await getDoc(doc(db, 'users', peerUid));
          if (peerDoc.exists() && peerDoc.data().publicKey?.jwk) {
            const peerPub = await importPublicKey(peerDoc.data().publicKey.jwk);
            activeKey = await deriveSharedSecret(myPrivateKey, peerPub);
          }
        } catch (err) {
          console.error("Failed to derive E2E shared secret with peer:", peerUid, err);
        }
      } else if (chatData.type === 'group' || chatData.type === 'community') {
        const wrappedKeyInfo = chatData.groupKey?.[user.uid];
        if (wrappedKeyInfo) {
          try {
            // Find sender of the group key (usually chat creator / admins)
            // For simplicity, unwrap with the creator's key or the admin's key
            const senderUid = chatData.admins?.[0] || chatData.participants[0];
            const senderDoc = await getDoc(doc(db, 'users', senderUid));
            if (senderDoc.exists() && senderDoc.data().publicKey?.jwk) {
              const senderPub = await importPublicKey(senderDoc.data().publicKey.jwk);
              activeKey = await unwrapGroupKey(
                wrappedKeyInfo.wrappedKey,
                wrappedKeyInfo.iv,
                senderPub,
                myPrivateKey
              );
            }
          } catch (err) {
            console.error("Failed to unwrap group key:", err);
          }
        }
      }

      for (const d of snapshot.docs) {
        const msgData = d.data();
        let decryptedText = msgData.text || "[Verschlüsselte Nachricht]";

        if (activeKey && msgData.ciphertext && msgData.iv) {
          try {
            decryptedText = await decryptMessage(activeKey, msgData.ciphertext, msgData.iv);
          } catch (err) {
            console.warn("Message decryption failed for message ID:", d.id, err);
            decryptedText = "[E2E-Schlüssel ungültig (Gerät gewechselt oder Cache gelöscht)]";
          }
        }

        messagesList.push({
          id: d.id,
          text: decryptedText,
          ...msgData
        });
      }

      setActiveChatMessages(messagesList);

      // Automatically mark as read if chat is open
      markChatAsRead(chatId, chatData);
    });
  }, [user, myPrivateKey, markChatAsRead]);

  // --- Send Message ---
  const sendMessage = useCallback(async (chatId, plaintext, type = 'text') => {
    if (!user || !db || !myPrivateKey) return false;
    try {
      const chatDoc = await getDoc(doc(db, 'chats', chatId));
      if (!chatDoc.exists()) return false;
      const chatData = chatDoc.data();

      let activeKey = null;

      if (chatData.type === 'direct') {
        const peerUid = chatData.participants.find(id => id !== user.uid) || user.uid;
        const peerDoc = await getDoc(doc(db, 'users', peerUid));
        if (peerDoc.exists() && peerDoc.data().publicKey?.jwk) {
          const peerPub = await importPublicKey(peerDoc.data().publicKey.jwk);
          activeKey = await deriveSharedSecret(myPrivateKey, peerPub);
        }
      } else if (chatData.type === 'group' || chatData.type === 'community') {
        const wrappedKeyInfo = chatData.groupKey?.[user.uid];
        if (wrappedKeyInfo) {
          const senderUid = chatData.admins?.[0] || chatData.participants[0];
          const senderDoc = await getDoc(doc(db, 'users', senderUid));
          if (senderDoc.exists() && senderDoc.data().publicKey?.jwk) {
            const senderPub = await importPublicKey(senderDoc.data().publicKey.jwk);
            activeKey = await unwrapGroupKey(
              wrappedKeyInfo.wrappedKey,
              wrappedKeyInfo.iv,
              senderPub,
              myPrivateKey
            );
          }
        }
      }

      const timestamp = new Date().toISOString();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      if (!activeKey) {
        // Fallback to sending in plaintext (e.g. for communities or when key exchange is not finished)
        const msgPayload = {
          senderUid: user.uid,
          senderName: profileName(),
          timestamp,
          expiresAt,
          type,
          text: plaintext,
          readBy: [user.uid]
        };

        await addDoc(collection(db, 'chats', chatId, 'messages'), msgPayload);

        await setDoc(doc(db, 'chats', chatId), {
          lastMessage: {
            text: plaintext.substring(0, 60),
            senderUid: user.uid,
            timestamp,
            readBy: [user.uid]
          }
        }, { merge: true });

        return true;
      }

      // Encrypt message
      const encrypted = await encryptMessage(activeKey, plaintext);

      const msgPayload = {
        senderUid: user.uid,
        senderName: profileName(),
        timestamp,
        expiresAt,
        type,
        ciphertext: encrypted.ciphertext,
        iv: encrypted.iv,
        readBy: [user.uid]
      };

      // Add to messages subcollection
      await addDoc(collection(db, 'chats', chatId, 'messages'), msgPayload);

      // Update last message in chat document
      await setDoc(doc(db, 'chats', chatId), {
        lastMessage: {
          ciphertext: encrypted.ciphertext,
          iv: encrypted.iv,
          senderUid: user.uid,
          timestamp,
          readBy: [user.uid]
        }
      }, { merge: true });

      return true;
    } catch (err) {
      console.error("sendMessage failed:", err);
      return false;
    }
  }, [user, myPrivateKey, profileName]);



  // Clean up active listener on unmount
  useEffect(() => {
    return () => {
      if (activeUnsubscribeRef.current) activeUnsubscribeRef.current();
    };
  }, []);

  return {
    conversations,
    activeChatMessages,
    loadingChats,
    chatUnreadCount,
    createDirectChat,
    createGroupChat,
    listenToMessages,
    sendMessage
  };
}
