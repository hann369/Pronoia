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
  exportPrivateKey,
  importPrivateKey,
  getPublicKeyJwkFromPrivateKey,
  wrapGroupKeyNew,
  unwrapGroupKeyNew
} from '@/lib/crypto';

// A usable EC public key needs non-empty x/y coordinates. Older builds wrote a
// placeholder with empty strings for hermes_agent_node, which poisoned every
// import attempt — treat such keys as absent.
function isValidJwk(jwk) {
  return !!(jwk && typeof jwk.x === 'string' && jwk.x.length > 10 && typeof jwk.y === 'string' && jwk.y.length > 10);
}

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
          
          // Save private key locally in IndexedDB/localStorage
          await storeLocalPrivateKey(user.uid, prvKey);
          
          // Export and upload public key to Firestore
          const pubJwk = await exportPublicKey(keyPair.publicKey);
          await setDoc(doc(db, 'users', user.uid), {
            publicKey: {
              jwk: pubJwk,
              createdAt: new Date().toISOString()
            }
          }, { merge: true });
        } else {
          // Verify public key in Firestore exists and matches
          const userDocRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userDocRef);
          const pubJwk = await getPublicKeyJwkFromPrivateKey(prvKey);
          const currentPubJwk = userDoc.exists() ? userDoc.data().publicKey?.jwk : null;
          
          if (!currentPubJwk || currentPubJwk.x !== pubJwk.x || currentPubJwk.y !== pubJwk.y) {
            console.log("[E2E Chat] Firestore public key missing or mismatch. Syncing public key...");
            await setDoc(userDocRef, {
              publicKey: {
                jwk: pubJwk,
                createdAt: new Date().toISOString()
              }
            }, { merge: true });
          }
        }
        
        setMyPrivateKey(prvKey);
        
        // Register hermes_agent_node placeholder if missing. No fake public key —
        // the bridge daemon publishes its real key via hermes_register; until
        // then the chat works with the user's key only and heals automatically.
        try {
          const hermesDoc = await getDoc(doc(db, 'users', 'hermes_agent_node'));
          const hermesKey = hermesDoc.exists() ? hermesDoc.data().publicKey?.jwk : null;
          if (!hermesDoc.exists() || (hermesKey && !isValidJwk(hermesKey))) {
            console.log("[E2E Chat] Registering virtual companion hermes_agent_node (no placeholder key)...");
            const idToken = await user.getIdToken();
            await fetch('/api/agent-webhook', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
              body: JSON.stringify({ event: 'hermes_register', publicKey: null })
            });
          }
        } catch (hermesErr) {
          console.warn("[E2E Chat] Failed to register hermes companion placeholder:", hermesErr.message);
        }
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
  // No private key required: key wrapping uses only public keys (ECIES).
  const createDirectChat = useCallback(async (targetUid) => {
    if (!user || !db) return null;
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

      // Generate a symmetric key for the direct chat
      const chatKey = await generateGroupKey();
      const groupKeyPayload = {};

      // Wrap key for self
      const myUserDoc = await getDoc(doc(db, 'users', user.uid));
      const myPubJwk = myUserDoc.exists() ? myUserDoc.data().publicKey?.jwk : null;
      if (isValidJwk(myPubJwk)) {
        const myPub = await importPublicKey(myPubJwk);
        const wrapped = await wrapGroupKeyNew(chatKey, myPub);
        wrapped.pubKeyFingerprint = myPubJwk.x;
        groupKeyPayload[user.uid] = wrapped;
      }

      // Wrap key for peer — tolerate a missing/invalid peer key (e.g. the Hermes
      // bridge hasn't registered yet). The chat is still created; key healing in
      // listenToMessages wraps the key for the peer once their real key appears.
      try {
        const peerDoc = await getDoc(doc(db, 'users', targetUid));
        const peerPubJwk = peerDoc.exists() ? peerDoc.data().publicKey?.jwk : null;
        if (isValidJwk(peerPubJwk)) {
          const peerPub = await importPublicKey(peerPubJwk);
          const wrapped = await wrapGroupKeyNew(chatKey, peerPub);
          wrapped.pubKeyFingerprint = peerPubJwk.x;
          groupKeyPayload[targetUid] = wrapped;
        } else {
          console.warn(`[E2E Chat] Peer ${targetUid} has no valid public key yet — chat created, key will heal later.`);
        }
      } catch (peerErr) {
        console.warn(`[E2E Chat] Wrapping key for peer ${targetUid} failed (continuing):`, peerErr.message);
      }

      const payload = {
        type: 'direct',
        participants: [user.uid, targetUid],
        groupKey: groupKeyPayload,
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
  // Uses ECIES wrapping (public keys only) — no private key needed, and the
  // unwrap path already supports the ephemPub format for every member.
  const createGroupChat = useCallback(async (name, memberUids) => {
    if (!user || !db) return null;
    try {
      const chatDocRef = doc(collection(db, 'chats'));
      const participants = [user.uid, ...memberUids];

      // 1. Generate new AES group key
      const groupKey = await generateGroupKey();

      // 2. Wrap the group key for every participant's public key (best-effort)
      const groupKeyPayload = {};
      for (const mUid of participants) {
        try {
          const uDoc = await getDoc(doc(db, 'users', mUid));
          const jwk = uDoc.exists() ? uDoc.data().publicKey?.jwk : null;
          if (isValidJwk(jwk)) {
            const memberPub = await importPublicKey(jwk);
            const wrapped = await wrapGroupKeyNew(groupKey, memberPub);
            wrapped.pubKeyFingerprint = jwk.x;
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
  // Works without an E2E key: plaintext messages render normally, encrypted
  // ones show a key-missing hint instead of the chat staying empty.
  const listenToMessages = useCallback((chatId) => {
    if (!user || !db) return;

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

      // Resolve key depending on chat type (only possible with a local private key)
      let activeKey = null;

      if (myPrivateKey && chatData.type === 'direct') {
        const peerUid = chatData.participants.find(id => id !== user.uid) || user.uid;

        // 1. Try to unwrap from groupKey (new ECIES format)
        const wrappedKeyInfo = chatData.groupKey?.[user.uid];
        if (wrappedKeyInfo && wrappedKeyInfo.ephemPub) {
          try {
            activeKey = await unwrapGroupKeyNew(wrappedKeyInfo, myPrivateKey);
          } catch (err) {
            console.warn("[E2E Chat] Failed to unwrap direct chat key from groupKey:", err);
          }
        }
        
        // 2. Fallback to deriving shared secret (old format) - ONLY if groupKey is not present
        if (!activeKey && !chatData.groupKey) {
          try {
            const peerDoc = await getDoc(doc(db, 'users', peerUid));
            if (peerDoc.exists() && peerDoc.data().publicKey?.jwk) {
              const peerPub = await importPublicKey(peerDoc.data().publicKey.jwk);
              activeKey = await deriveSharedSecret(myPrivateKey, peerPub);
              
              // Auto-migrate old direct chat to new ECIES wrapped format
              try {
                const myUserDoc = await getDoc(doc(db, 'users', user.uid));
                const myPubJwk = myUserDoc.data().publicKey?.jwk;
                const peerPubJwk = peerDoc.data().publicKey?.jwk;
                
                if (myPubJwk && peerPubJwk) {
                  const myPub = await importPublicKey(myPubJwk);
                  const peerPubObj = await importPublicKey(peerPubJwk);
                  
                  const myWrapped = await wrapGroupKeyNew(activeKey, myPub);
                  const peerWrapped = await wrapGroupKeyNew(activeKey, peerPubObj);
                  
                  myWrapped.pubKeyFingerprint = myPubJwk.x;
                  peerWrapped.pubKeyFingerprint = peerPubJwk.x;
                  
                  await setDoc(doc(db, 'chats', chatId), {
                    groupKey: {
                      [user.uid]: myWrapped,
                      [peerUid]: peerWrapped
                    }
                  }, { merge: true });
                  console.log(`[E2E Chat] Migrated direct chat ${chatId} to ECIES`);
                }
              } catch (migErr) {
                console.warn("[E2E Chat] Direct chat migration failed:", migErr);
              }
            }
          } catch (err) {
            console.error("Failed to derive E2E shared secret with peer:", peerUid, err);
          }
        }
        
        // 3. Key Healing: If we have activeKey, check if peer needs healing
        if (activeKey) {
          try {
            const peerDoc = await getDoc(doc(db, 'users', peerUid));
            if (peerDoc.exists() && isValidJwk(peerDoc.data().publicKey?.jwk)) {
              const peerPubJwk = peerDoc.data().publicKey.jwk;
              const currentFingerprint = peerPubJwk.x;
              const storedFingerprint = chatData.groupKey?.[peerUid]?.pubKeyFingerprint;
              
              if (currentFingerprint !== storedFingerprint) {
                console.log(`[E2E Chat] Healing key for peer ${peerUid}...`);
                const peerPub = await importPublicKey(peerPubJwk);
                const peerWrapped = await wrapGroupKeyNew(activeKey, peerPub);
                peerWrapped.pubKeyFingerprint = currentFingerprint;
                
                await setDoc(doc(db, 'chats', chatId), {
                  [`groupKey.${peerUid}`]: peerWrapped
                }, { merge: true });
                console.log(`[E2E Chat] Key healed for peer ${peerUid}`);
              }
            }
          } catch (healErr) {
            console.warn("[E2E Chat] Key healing failed:", healErr);
          }
        }

      } else if (myPrivateKey && (chatData.type === 'group' || chatData.type === 'community')) {
        const wrappedKeyInfo = chatData.groupKey?.[user.uid];
        if (wrappedKeyInfo) {
          // 1. Try new ECIES format
          if (wrappedKeyInfo.ephemPub) {
            try {
              activeKey = await unwrapGroupKeyNew(wrappedKeyInfo, myPrivateKey);
            } catch (err) {
              console.warn("[E2E Chat] Failed to unwrap group key using ECIES:", err);
            }
          }
          
          // 2. Fallback to old format
          if (!activeKey) {
            try {
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
                
                // Auto-migrate group key to new ECIES format for user
                try {
                  const myUserDoc = await getDoc(doc(db, 'users', user.uid));
                  const myPubJwk = myUserDoc.data().publicKey?.jwk;
                  if (myPubJwk) {
                    const myPub = await importPublicKey(myPubJwk);
                    const myWrapped = await wrapGroupKeyNew(activeKey, myPub);
                    myWrapped.pubKeyFingerprint = myPubJwk.x;
                    
                    await setDoc(doc(db, 'chats', chatId), {
                      groupKey: {
                        [user.uid]: myWrapped
                      }
                    }, { merge: true });
                    console.log(`[E2E Chat] Migrated own group key to ECIES in chat ${chatId}`);
                  }
                } catch (migErr) {
                  console.warn("[E2E Chat] Group key migration failed:", migErr);
                }
              }
            } catch (err) {
              console.error("Failed to unwrap group key:", err);
            }
          }
        }
        
        // 3. Group Key Healing: If we have activeKey, check if any other participants need healing
        if (activeKey) {
          try {
            for (const memberUid of chatData.participants) {
              if (memberUid === user.uid) continue;
              const memberDoc = await getDoc(doc(db, 'users', memberUid));
              if (memberDoc.exists() && isValidJwk(memberDoc.data().publicKey?.jwk)) {
                const memberPubJwk = memberDoc.data().publicKey.jwk;
                const currentFingerprint = memberPubJwk.x;
                const storedFingerprint = chatData.groupKey?.[memberUid]?.pubKeyFingerprint;
                
                if (currentFingerprint !== storedFingerprint) {
                  console.log(`[E2E Chat] Healing group key for member ${memberUid}...`);
                  const memberPub = await importPublicKey(memberPubJwk);
                  const memberWrapped = await wrapGroupKeyNew(activeKey, memberPub);
                  memberWrapped.pubKeyFingerprint = currentFingerprint;
                  
                  await setDoc(doc(db, 'chats', chatId), {
                    [`groupKey.${memberUid}`]: memberWrapped
                  }, { merge: true });
                  console.log(`[E2E Chat] Group key healed for member ${memberUid}`);
                }
              }
            }
          } catch (healErr) {
            console.warn("[E2E Chat] Group key healing failed:", healErr);
          }
        }
      }

      for (const d of snapshot.docs) {
        const msgData = d.data();
        let decryptedText = msgData.text ||
          (activeKey
            ? "[Verschlüsselte Nachricht]"
            : "[E2E-Schlüssel fehlt auf diesem Gerät — im E2E-Tab importieren oder zurücksetzen]");

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
  // Guaranteed delivery: sending only requires being signed in. E2E encryption
  // is a best-effort layer on top — if no usable key exists (key init failed,
  // fresh device, peer not provisioned), the message is sent in plaintext,
  // still access-protected by Firestore rules (only chat participants can
  // read). The bubble shows 🔓 for such messages.
  const sendMessage = useCallback(async (chatId, plaintext, type = 'text') => {
    if (!user || !db) {
      console.error("[Chat] sendMessage blocked: user or Firestore unavailable", { user: !!user, db: !!db });
      return false;
    }
    try {
      const chatDoc = await getDoc(doc(db, 'chats', chatId));
      if (!chatDoc.exists()) {
        console.error("[Chat] sendMessage: chat document not found:", chatId);
        return false;
      }
      const chatData = chatDoc.data();

      let activeKey = null;

      if (myPrivateKey && chatData.type === 'direct') {
        const peerUid = chatData.participants.find(id => id !== user.uid) || user.uid;
        
        // 1. Try to unwrap from groupKey
        const wrappedKeyInfo = chatData.groupKey?.[user.uid];
        if (wrappedKeyInfo && wrappedKeyInfo.ephemPub) {
          try {
            activeKey = await unwrapGroupKeyNew(wrappedKeyInfo, myPrivateKey);
          } catch (err) {
            console.warn("[E2E Chat] Failed to unwrap direct chat key on send:", err);
          }
        }
        
        // 2. Fallback to deriving shared secret - ONLY if groupKey is not present
        if (!activeKey && !chatData.groupKey) {
          try {
            const peerDoc = await getDoc(doc(db, 'users', peerUid));
            const peerJwk = peerDoc.exists() ? peerDoc.data().publicKey?.jwk : null;
            if (isValidJwk(peerJwk)) {
              const peerPub = await importPublicKey(peerJwk);
              activeKey = await deriveSharedSecret(myPrivateKey, peerPub);
            }
          } catch (deriveErr) {
            console.warn("[E2E Chat] Shared-secret derivation failed on send:", deriveErr.message);
          }
        }
        
        // 3. If still no key, generate a brand new direct chat key.
        //    The key is only USED if it could be persisted (wrapped for self) —
        //    otherwise the message would be encrypted with a key nobody stores
        //    and become permanently unreadable. Peer wrap is optional; key
        //    healing covers the peer once their real key exists.
        if (!activeKey) {
          try {
            console.log("[E2E Chat] Key materials unavailable. Generating new direct chat key...");
            const newKey = await generateGroupKey();

            const myUserDoc = await getDoc(doc(db, 'users', user.uid));
            const myPubJwk = myUserDoc.exists() ? myUserDoc.data().publicKey?.jwk : null;
            if (!isValidJwk(myPubJwk)) {
              throw new Error("Own public key missing/invalid — cannot persist chat key");
            }

            const myPub = await importPublicKey(myPubJwk);
            const myWrapped = await wrapGroupKeyNew(newKey, myPub);
            myWrapped.pubKeyFingerprint = myPubJwk.x;
            const groupKeyUpdate = { [user.uid]: myWrapped };

            try {
              const peerDoc = await getDoc(doc(db, 'users', peerUid));
              const peerPubJwk = peerDoc.exists() ? peerDoc.data().publicKey?.jwk : null;
              if (isValidJwk(peerPubJwk)) {
                const peerPubObj = await importPublicKey(peerPubJwk);
                const peerWrapped = await wrapGroupKeyNew(newKey, peerPubObj);
                peerWrapped.pubKeyFingerprint = peerPubJwk.x;
                groupKeyUpdate[peerUid] = peerWrapped;
              }
            } catch (peerErr) {
              console.warn("[E2E Chat] Peer wrap skipped (will heal later):", peerErr.message);
            }

            await setDoc(doc(db, 'chats', chatId), { groupKey: groupKeyUpdate }, { merge: true });
            activeKey = newKey; // only after successful persistence
          } catch (genErr) {
            console.error("[E2E Chat] Generating new direct chat key failed:", genErr);
          }
        }
      } else if (myPrivateKey && (chatData.type === 'group' || chatData.type === 'community')) {
        const wrappedKeyInfo = chatData.groupKey?.[user.uid];
        if (wrappedKeyInfo) {
          if (wrappedKeyInfo.ephemPub) {
            try {
              activeKey = await unwrapGroupKeyNew(wrappedKeyInfo, myPrivateKey);
            } catch (err) {
              console.warn("[E2E Chat] Failed to unwrap group key on send:", err);
            }
          }
          if (!activeKey) {
            try {
              const senderUid = chatData.admins?.[0] || chatData.participants[0];
              const senderDoc = await getDoc(doc(db, 'users', senderUid));
              const senderJwk = senderDoc.exists() ? senderDoc.data().publicKey?.jwk : null;
              if (isValidJwk(senderJwk)) {
                const senderPub = await importPublicKey(senderJwk);
                activeKey = await unwrapGroupKey(
                  wrappedKeyInfo.wrappedKey,
                  wrappedKeyInfo.iv,
                  senderPub,
                  myPrivateKey
                );
              }
            } catch (legacyErr) {
              console.warn("[E2E Chat] Legacy group key unwrap failed on send:", legacyErr.message);
            }
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

        // Trigger Hermes webhook if hermes is a participant
        if (chatData.participants && chatData.participants.includes('hermes_agent_node')) {
          user.getIdToken().then(idToken =>
            fetch('/api/agent-webhook', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${idToken}`
              },
              body: JSON.stringify({
                event: 'hermes_trigger',
                source: 'webapp',
                chatId,
                message: {
                  text: plaintext,
                  senderUid: user.uid,
                  timestamp
                },
                participants: chatData.participants,
                groupKey: chatData.groupKey || null
              })
            })
          ).catch(err => console.warn("Failed to trigger Hermes webhook:", err));
        }

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

      // Trigger Hermes webhook if hermes is a participant
      if (chatData.participants && chatData.participants.includes('hermes_agent_node')) {
        user.getIdToken().then(idToken =>
          fetch('/api/agent-webhook', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${idToken}`
            },
            body: JSON.stringify({
              event: 'hermes_trigger',
              source: 'webapp',
              chatId,
              message: {
                ciphertext: encrypted.ciphertext,
                iv: encrypted.iv,
                senderUid: user.uid,
                timestamp
              },
              participants: chatData.participants,
              groupKey: chatData.groupKey || null
            })
          })
        ).catch(err => console.warn("Failed to trigger Hermes webhook:", err));
      }

      return true;
    } catch (err) {
      console.error("sendMessage failed:", err);
      return false;
    }
  }, [user, myPrivateKey, profileName]);
  // --- Manual Reset of E2E Keys ---
  const resetE2EKeys = useCallback(async () => {
    if (!user || !db) return false;
    try {
      console.log("[E2E Chat] Resetting E2E key pair...");
      const keyPair = await generateKeyPair();
      const prvKey = keyPair.privateKey;
      
      // Save locally in IndexedDB/localStorage
      await storeLocalPrivateKey(user.uid, prvKey);
      
      // Upload public key to Firestore
      const pubJwk = await exportPublicKey(keyPair.publicKey);
      await setDoc(doc(db, 'users', user.uid), {
        publicKey: {
          jwk: pubJwk,
          createdAt: new Date().toISOString()
        }
      }, { merge: true });
      
      setMyPrivateKey(prvKey);
      return true;
    } catch (err) {
      console.error("[E2E Chat] Resetting keys failed:", err);
      return false;
    }
  }, [user]);

  // --- Export E2E Private Key (base64 string) ---
  const exportE2EPrivateKey = useCallback(async () => {
    if (!myPrivateKey) return null;
    try {
      return await exportPrivateKey(myPrivateKey);
    } catch (err) {
      console.error("[E2E Chat] Exporting private key failed:", err);
      return null;
    }
  }, [myPrivateKey]);

  // --- Import E2E Private Key (base64 string) ---
  const importE2EPrivateKey = useCallback(async (base64Jwk) => {
    if (!user || !db) return false;
    try {
      console.log("[E2E Chat] Importing E2E private key...");
      const prvKey = await importPrivateKey(base64Jwk);
      
      // Save locally in IndexedDB/localStorage
      await storeLocalPrivateKey(user.uid, prvKey);
      
      // Extract public key and upload to Firestore
      const pubJwk = await getPublicKeyJwkFromPrivateKey(prvKey);
      await setDoc(doc(db, 'users', user.uid), {
        publicKey: {
          jwk: pubJwk,
          createdAt: new Date().toISOString()
        }
      }, { merge: true });
      
      setMyPrivateKey(prvKey);
      return true;
    } catch (err) {
      console.error("[E2E Chat] Importing private key failed:", err);
      return false;
    }
  }, [user]);

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
    sendMessage,
    resetE2EKeys,
    exportE2EPrivateKey,
    importE2EPrivateKey
  };
}
