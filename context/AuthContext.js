'use client';
// context/AuthContext.js — Firebase Auth state across the app
import { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signOut,
} from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [profile, setProfile] = useState(null);
  const [role, setRole]       = useState('user');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth) {
      Promise.resolve().then(() => {
        setLoading(false);
      });
      return;
    }
    // Retrieve redirect login result when returning to the page
    getRedirectResult(auth)
      .then((result) => {
        if (result?.user) {
          setUser(result.user);
        }
      })
      .catch((err) => {
        console.error("Google redirect sign-in failed:", err);
      });

    let unsubDoc = null;

    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (unsubDoc) {
        unsubDoc();
        unsubDoc = null;
      }

      if (u && db) {
        const userDocRef = doc(db, 'users', u.uid);
        unsubDoc = onSnapshot(userDocRef, (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            setProfile(data.profile || null);
            setRole(data.role || 'user');
          } else {
            setProfile(null);
            setRole('user');
          }
          setLoading(false);
        }, (err) => {
          console.error("AuthContext user doc onSnapshot error:", err);
          setLoading(false);
        });
      } else {
        setProfile(null);
        setRole('user');
        setLoading(false);
      }
    });

    return () => {
      unsub();
      if (unsubDoc) unsubDoc();
    };
  }, []);

  const login = (email, pw) => {
    if (!auth) return Promise.reject(new Error("Authentifizierung offline: Firebase ist nicht konfiguriert. Bitte füge die Umgebungsvariablen in Vercel hinzu."));
    return signInWithEmailAndPassword(auth, email, pw);
  };
  const signup = (email, pw) => {
    if (!auth) return Promise.reject(new Error("Registrierung offline: Firebase ist nicht konfiguriert. Bitte füge die Umgebungsvariablen in Vercel hinzu."));
    return createUserWithEmailAndPassword(auth, email, pw);
  };
  const loginWithGoogle = () => {
    if (!auth) return Promise.reject(new Error("Google Login offline: Firebase ist nicht konfiguriert. Bitte füge die Umgebungsvariablen in Vercel hinzu."));
    const provider = new GoogleAuthProvider();
    // Try popup first. If blocked or closed, fall back to redirect.
    return signInWithPopup(auth, provider).catch((err) => {
      if (
        err.code === 'auth/popup-blocked' ||
        err.code === 'auth/popup-closed-by-user' ||
        err.code === 'auth/cancelled-popup-request'
      ) {
        console.warn("Popup blocked or closed, falling back to signInWithRedirect...");
        return signInWithRedirect(auth, provider);
      }
      throw err;
    });
  };
  const resetPassword = (email) => {
    if (!auth) return Promise.reject(new Error("Passwort-Reset offline: Firebase ist nicht konfiguriert."));
    return sendPasswordResetEmail(auth, email);
  };
  const logout = () => {
    if (!auth) return Promise.resolve();
    return signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, profile, role, loading, login, signup, loginWithGoogle, resetPassword, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
