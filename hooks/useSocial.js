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
    if (!db || !searchQuery.trim() || !user) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const q = query(
        collection(db, 'users'),
        limit(100)
      );

      const querySnapshot = await getDocs(q);
      const results = [];
      
      const searchLower = searchQuery.toLowerCase().trim();
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (doc.id === user.uid) return; // don't search self
        
        const username = data.profile?.username || '';
        const telegramId = data.profile?.telegramId ? String(data.profile.telegramId) : '';
        const telegramUsername = data.profile?.telegramUser?.username || '';

        const matchUsername = username.toLowerCase().includes(searchLower);
        const matchTelegramId = telegramId.toLowerCase().includes(searchLower);
        const matchTelegramUser = telegramUsername.toLowerCase().includes(searchLower);

        if (matchUsername || matchTelegramId || matchTelegramUser) {
          results.push({
            uid: doc.id,
            profile: data.profile || { username: username || 'Unnamed Hacker' }
          });
        }
      });

      setSearchResults(results);
    } catch (err) {
      console.error("searchUsers query failed:", err);
    } finally {
      setSearching(false);
    }
  }, [user]);

  // Send a friend request
  const sendFriendRequest = useCallback(async (targetUid) => {
    if (!user || !db) return;
    const docId = getFriendshipDocId(user.uid, targetUid);
    const docRef = doc(db, 'friendships', docId);

    const payload = {
      users: [user.uid, targetUid],
      status: 'pending',
      initiator: user.uid,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await setDoc(docRef, payload, { merge: true });
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
