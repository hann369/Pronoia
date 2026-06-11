// lib/firebaseAdmin.js — server-only Firebase Admin SDK singleton.
//
// The Admin SDK runs with full privileges and BYPASSES Firestore security rules,
// so server routes no longer need the `tempSecret` backdoor. Never import this
// file from client ("use client") code.
//
// Configure with ONE of:
//   FIREBASE_SERVICE_ACCOUNT       → the service-account JSON, raw or base64-encoded
//   GOOGLE_APPLICATION_CREDENTIALS → path to a service-account JSON file (ADC)
//
// Falls back to null (mock mode) when no credentials are present, so `next build`
// and previews don't crash — callers must handle a null `adminDb`.

import { initializeApp, getApps, cert, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;

function parseServiceAccount(raw) {
  if (!raw) return null;
  let jsonStr = raw.trim();
  // Allow base64-encoded JSON (convenient for single-line env vars on Vercel)
  if (!jsonStr.startsWith('{')) {
    try {
      jsonStr = Buffer.from(jsonStr, 'base64').toString('utf8');
    } catch {
      return null;
    }
  }
  try {
    const parsed = JSON.parse(jsonStr);
    // Private keys stored in env vars often have literal "\n" instead of newlines
    if (parsed.private_key && parsed.private_key.includes('\\n')) {
      parsed.private_key = parsed.private_key.replace(/\\n/g, '\n');
    }
    return parsed;
  } catch {
    return null;
  }
}

function initAdmin() {
  if (getApps().length) return getApps()[0];

  const svc = parseServiceAccount(process.env.FIREBASE_SERVICE_ACCOUNT);

  try {
    if (svc) {
      return initializeApp({
        credential: cert(svc),
        projectId: svc.project_id || PROJECT_ID,
      });
    }
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      return initializeApp({
        credential: applicationDefault(),
        projectId: PROJECT_ID,
      });
    }
  } catch (err) {
    console.error('[firebaseAdmin] Initialization failed:', err.message);
    return null;
  }

  if (typeof window === 'undefined') {
    console.warn(
      '⚠️ [firebaseAdmin] No service-account credentials found. ' +
      'Server-side privileged Firestore access is disabled (mock/build mode).'
    );
  }
  return null;
}

const app = initAdmin();
const adminDb = app ? getFirestore(app) : null;

export { adminDb };
export default app;
