'use client';
// context/AuthContext.js — Firebase Auth state across the app
import { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
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
    return signInWithPopup(auth, new GoogleAuthProvider());
  };
  const logout = () => {
    if (!auth) return Promise.resolve();
    return signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
