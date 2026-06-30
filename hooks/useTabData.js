'use client';

/*
 * useTabData — one uniform persistence primitive for Life OS tabs.
 *
 * Today each tab hand-rolls its own storage: profile slices via useProtocol's
 * saveProfile (Firestore users/{uid}.profile.*), the Vault via Supabase REST,
 * others via raw localStorage — each re-implementing its own loading flag and
 * with no error/empty handling. This hook gives every tab the same interface:
 *
 *   const { data, save, loading, error, isEmpty } = useTabData('vaultFilter', 'all');
 *
 * Storage model: a per-tab slice under `users/{uid}.tabs.{tabId}` (Firestore,
 * merge-written so it never collides with `profile` or useProtocol's debounced
 * sync). When logged out it falls back to localStorage (`pronoia_tab_{tabId}`),
 * so the same code path works signed-in or not.
 *
 * `save` is optimistic: local state updates synchronously, the write is fired in
 * the background and debounced so rapid edits collapse into one round-trip.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { db, auth } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

const lsKey = (tabId) => `pronoia_tab_${tabId}`;

function computeIsEmpty(v) {
  if (v == null) return true;
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === 'string') return v.length === 0;
  if (typeof v === 'object') return Object.keys(v).length === 0;
  return false;
}

export function useTabData(tabId, defaultValue = null, { debounceMs = 500 } = {}) {
  const [data, setDataState] = useState(defaultValue);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const userRef = useRef(null);
  const saveTimer = useRef(null);
  const pending = useRef(undefined);
  // keep the latest default without retriggering the load effect
  const defaultRef = useRef(defaultValue);
  defaultRef.current = defaultValue;

  // ── Load on mount / auth change ──
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const unsub = onAuthStateChanged(auth, async (user) => {
      userRef.current = user;
      try {
        let value = defaultRef.current;
        if (user && db) {
          const snap = await getDoc(doc(db, 'users', user.uid));
          const userData = snap.exists() ? snap.data() : {};
          const tabs = userData.tabs || {};
          if (tabId in tabs && tabs[tabId] !== undefined) {
            value = tabs[tabId];
          } else if (tabId === 'managerConfig' && userData.profile?.managerConfig) {
            value = userData.profile.managerConfig;
          }
        } else if (typeof window !== 'undefined') {
          const raw = window.localStorage.getItem(lsKey(tabId));
          if (raw != null) {
            value = JSON.parse(raw);
          } else if (tabId === 'managerConfig') {
            try {
              const localState = JSON.parse(localStorage.getItem('pronoia_protocol_state') || '{}');
              if (localState.profile?.managerConfig) {
                value = localState.profile.managerConfig;
              }
            } catch (err) {
              console.warn("Failed to check localStorage profile fallback:", err);
            }
          }
        }
        if (!cancelled) setDataState(value);
      } catch (e) {
        if (!cancelled) {
          setError(e);
          setDataState(defaultRef.current);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    });

    return () => { cancelled = true; unsub(); };
  }, [tabId]);

  const flush = useCallback(async () => {
    const next = pending.current;
    pending.current = undefined;
    if (next === undefined) return;
    try {
      const user = userRef.current;
      if (user && db) {
        await setDoc(doc(db, 'users', user.uid), { tabs: { [tabId]: next } }, { merge: true });
      } else if (typeof window !== 'undefined') {
        window.localStorage.setItem(lsKey(tabId), JSON.stringify(next));
      }
    } catch (e) {
      setError(e);
    }
  }, [tabId]);

  // ── Optimistic save (value or updater fn), debounced persist ──
  const save = useCallback((updater) => {
    setDataState((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      pending.current = next;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(flush, debounceMs);
      return next;
    });
  }, [flush, debounceMs]);

  // Persist any pending write on unmount so nothing is lost.
  useEffect(() => () => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      flush();
    }
  }, [flush]);

  return {
    data,
    save,
    setData: save, // alias
    loading,
    error,
    isEmpty: computeIsEmpty(data),
  };
}

export default useTabData;
