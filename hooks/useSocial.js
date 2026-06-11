'use client';
// hooks/useSocial.js — Friendship, User Search and Presence hook
import { useState, useEffect, useCallback } from 'react';
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
  deleteDoc,
  onSnapshot,
  orderBy,
  limit
} from 'firebase/firestore';

// Helper function to get profile document
async function getDocProfile(uid) {
  if (!db) return null;
  try {
    const docRef = doc(db, 'users', uid);
    const snap = await getDoc(docRef);
    return snap.exists() ? snap.data()?.profile || null : null;
  } catch (e) {
    console.error("Error in getDocProfile:", e);
    return null;
  }
}

export function useSocial() {
  const { user } = useAuth();
  const [friends, setFriends] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [socialLoading, setSocialLoading] = useState(true);

  // Helper to generate a sorted double-UID string for deterministic friendship documents
  const getFriendshipDocId = useCallback((uid1, uid2) => {
    return [uid1, uid2].sort().join('_');
  }, []);

  // Listen to friendships & requests in real-time
  useEffect(() => {
    if (!user || !db) {
      Promise.resolve().then(() => {
        setFriends([]);
        setPendingRequests([]);
        setSentRequests([]);
        setSocialLoading(false);
      });
      return;
    }

    Promise.resolve().then(() => {
      setSocialLoading(true);
    });

    // Listen to all friendships where current user is a participant
    const q = query(
      collection(db, 'friendships'),
      where('users', 'array-contains', user.uid)
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const activeFriendsList = [];
      const incomingRequestsList = [];
      const outgoingRequestsList = [];

      for (const d of snapshot.docs) {
        const data = d.data();
        const friendUid = data.users.find(id => id !== user.uid);

        // Auto-heal: Hermes can never click "accept" itself, so any friendship
        // with it stuck on 'pending' (created before auto-accept existed) is
        // accepted on sight. The snapshot re-fires with the healed status.
        if (friendUid === 'hermes_agent_node' && data.status === 'pending') {
          setDoc(doc(db, 'friendships', d.id), {
            status: 'accepted',
            updatedAt: new Date().toISOString()
          }, { merge: true }).catch(err => {
            console.warn('Hermes friendship auto-heal failed:', err.message);
          });
          data.status = 'accepted'; // reflect immediately in this render pass
        }
        
        // Load the friend's profile details
        let friendProfile = { username: 'BioHacker_Beta', avatar: '' };
        try {
          const userDoc = await getDocProfile(friendUid);
          if (userDoc) {
            friendProfile = { ...friendProfile, ...userDoc };
          }
        } catch (e) {
          console.error("Failed to load profile for user:", friendUid, e);
        }

        const friendship = {
          id: d.id,
          friendUid,
          status: data.status,
          initiator: data.initiator,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
          profile: friendProfile
        };

        if (data.status === 'accepted') {
          activeFriendsList.push(friendship);
        } else if (data.status === 'pending') {
          if (data.initiator === user.uid) {
            outgoingRequestsList.push(friendship);
          } else {
            incomingRequestsList.push(friendship);
          }
        }
      }

      setFriends(activeFriendsList);
      setPendingRequests(incomingRequestsList);
      setSentRequests(outgoingRequestsList);
      setSocialLoading(false);
    }, (err) => {
      console.error("useSocial snapshot error:", err);
      setSocialLoading(false);
    });

    return unsubscribe;
  }, [user]);



  // Search users in Firestore by username or Telegram ID
  const searchUsers = useCallback(async (searchQuery) => {
    const term = searchQuery.trim();
    if (!db || !term || !user) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const resultsMap = new Map();
      const queries = [];

      // 1. Exact username query
      queries.push(
        query(
          collection(db, 'users'),
          where('profile.username', '==', term),
          limit(10)
        )
      );

      // Prefix startsWith query for username (e.g. "han" matches "hann369")
      queries.push(
        query(
          collection(db, 'users'),
          where('profile.username', '>=', term),
          where('profile.username', '<=', term + '\uf8ff'),
          limit(10)
        )
      );

      // Capitalized version startsWith query
      const capitalized = term.charAt(0).toUpperCase() + term.slice(1);
      if (capitalized !== term) {
        queries.push(
          query(
            collection(db, 'users'),
            where('profile.username', '>=', capitalized),
            where('profile.username', '<=', capitalized + '\uf8ff'),
            limit(10)
          )
        );
      }

      // 2. Telegram ID queries if input looks like a number
      if (/^\d+$/.test(term)) {
        const numVal = parseInt(term, 10);
        queries.push(
          query(
            collection(db, 'users'),
            where('profile.telegramId', '==', numVal),
            limit(10)
          )
        );
        queries.push(
          query(
            collection(db, 'users'),
            where('profile.telegramId', '==', term),
            limit(10)
          )
        );
      }

      await Promise.all(
        queries.map(async (q) => {
          try {
            const snap = await getDocs(q);
            snap.forEach((doc) => {
              if (doc.id === user.uid) return; // skip self
              const data = doc.data();
              resultsMap.set(doc.id, {
                uid: doc.id,
                role: data.role || 'user',
                profile: data.profile || { username: data.profile?.username || 'Unnamed Hacker' }
              });
            });
          } catch (e) {
            console.warn("Individual search query failed (check firestore security rules):", e.message);
          }
        })
      );

      setSearchResults(Array.from(resultsMap.values()));
    } catch (err) {
      console.error("searchUsers failed:", err);
    } finally {
      setSearching(false);
    }
  }, [user]);


  // Send a friend request
  const sendFriendRequest = useCallback(async (targetUid) => {
    if (!user || !db) return;
    const docId = getFriendshipDocId(user.uid, targetUid);
    const docRef = doc(db, 'friendships', docId);

    // Hermes is an AI companion without an auth session — it can never click
    // "accept", so requests to it are accepted immediately (Variante A).
    const isHermes = targetUid === 'hermes_agent_node';

    const payload = {
      users: [user.uid, targetUid],
      status: isHermes ? 'accepted' : 'pending',
      initiator: user.uid,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await setDoc(docRef, payload, { merge: true });

    if (isHermes) {
      // Variante B as server-side backup: confirm the acceptance via the
      // agent webhook (Admin SDK), in case rules ever tighten client writes.
      try {
        const idToken = await user.getIdToken();
        await fetch('/api/agent-webhook', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
          body: JSON.stringify({
            event: 'hermes_accept_friendship',
            source: 'webapp',
            friendshipId: docId
          })
        });
      } catch (e) {
        console.warn('Hermes server-side accept failed (client accept already applied):', e.message);
      }
    }
  }, [user, getFriendshipDocId]);

  // Accept a friend request
  const acceptFriendRequest = useCallback(async (friendshipId) => {
    if (!user || !db) return;
    const docRef = doc(db, 'friendships', friendshipId);
    
    await setDoc(docRef, {
      status: 'accepted',
      updatedAt: new Date().toISOString()
    }, { merge: true });
  }, [user]);

  // Decline/Remove a friend request or friend
  const declineFriendRequest = useCallback(async (friendshipId) => {
    if (!user || !db) return;
    const docRef = doc(db, 'friendships', friendshipId);
    await deleteDoc(docRef);
  }, [user]);

  return {
    friends,
    pendingRequests,
    sentRequests,
    searchResults,
    searching,
    socialLoading,
    searchUsers,
    sendFriendRequest,
    acceptFriendRequest,
    declineFriendRequest,
    removeFriend: declineFriendRequest
  };
}
