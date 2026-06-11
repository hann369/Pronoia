// lib/serverAuth.js — server-only authentication helpers for Route Handlers.
import crypto from 'crypto';
import { getAuth } from 'firebase-admin/auth';
import adminApp from '@/lib/firebaseAdmin';

/**
 * Validate the shared webhook secret used by trusted external callers
 * (Telegram bot, Hermes daemon). Returns true ONLY when WEBHOOK_SECRET is
 * configured and the provided value matches exactly. There is no hardcoded
 * fallback — if the secret is unset, all secret-based auth is denied.
 */
export function checkWebhookSecret(provided) {
  const expected = process.env.WEBHOOK_SECRET;
  if (!expected) return false;
  return typeof provided === 'string' && provided === expected;
}

/**
 * Verify a Firebase Auth ID token (sent by the browser as a Bearer token).
 * Returns the decoded token ({ uid, ... }) on success, or null on failure.
 * Used so client-initiated privileged calls authenticate as a real user
 * instead of carrying a shared secret in client-side JavaScript.
 */
export async function verifyIdToken(authorizationHeader) {
  if (!adminApp || !authorizationHeader) return null;
  const match = /^Bearer\s+(.+)$/i.exec(authorizationHeader);
  const token = match ? match[1] : authorizationHeader;
  if (!token) return null;
  try {
    return await getAuth(adminApp).verifyIdToken(token);
  } catch (err) {
    console.warn('[serverAuth] ID token verification failed:', err.message);
    return null;
  }
}

/**
 * Verify a Telegram Mini App `initData` string (the value of
 * window.Telegram.WebApp.initData). Validates the HMAC-SHA256 signature against
 * TELEGRAM_BOT_TOKEN per Telegram's Web App auth spec, so the Mini App proves it
 * is genuinely Telegram acting for a specific user — no shared secret in client JS.
 *
 * Returns { user, authDate } on success, or null on failure.
 * Optionally rejects data older than `maxAgeSeconds` (default 24h).
 */
export function verifyTelegramInitData(initData, maxAgeSeconds = 86400) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || !initData) return null;

  let params;
  try {
    params = new URLSearchParams(initData);
  } catch {
    return null;
  }

  const hash = params.get('hash');
  if (!hash) return null;
  params.delete('hash');

  const dataCheckString = [...params.entries()]
    .map(([k, v]) => `${k}=${v}`)
    .sort()
    .join('\n');

  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(token).digest();
  const computed = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

  // Constant-time comparison
  const a = Buffer.from(computed, 'hex');
  const b = Buffer.from(hash, 'hex');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  const authDate = Number(params.get('auth_date')) || 0;
  if (maxAgeSeconds && authDate) {
    const ageSeconds = Math.floor(Date.now() / 1000) - authDate;
    if (ageSeconds > maxAgeSeconds) {
      console.warn('[serverAuth] Telegram initData expired:', ageSeconds, 's old');
      return null;
    }
  }

  let user = null;
  try {
    const userStr = params.get('user');
    user = userStr ? JSON.parse(userStr) : null;
  } catch {
    user = null;
  }

  return { user, authDate };
}

// HMAC key for short-lived signed values (e.g. OAuth `state`). Falls back to
// WEBHOOK_SECRET so there is one less env var to configure.
function stateSecret() {
  return process.env.CONNECTOR_STATE_SECRET || process.env.WEBHOOK_SECRET || null;
}

/**
 * Sign an arbitrary string payload with an expiry, returning "<b64payload>.<sig>".
 * Used to carry the authenticated uid through a third-party OAuth redirect
 * without trusting client-supplied values on the callback (CSRF protection).
 */
export function signState(payload, ttlSeconds = 600) {
  const secret = stateSecret();
  if (!secret) return null;
  const body = JSON.stringify({ p: payload, exp: Math.floor(Date.now() / 1000) + ttlSeconds });
  const b64 = Buffer.from(body, 'utf8').toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(b64).digest('base64url');
  return `${b64}.${sig}`;
}

/** Verify a value produced by signState. Returns the original payload or null. */
export function verifyState(value) {
  const secret = stateSecret();
  if (!secret || !value || typeof value !== 'string') return null;
  const [b64, sig] = value.split('.');
  if (!b64 || !sig) return null;
  const expected = crypto.createHmac('sha256', secret).update(b64).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const { p, exp } = JSON.parse(Buffer.from(b64, 'base64url').toString('utf8'));
    if (!exp || Math.floor(Date.now() / 1000) > exp) return null;
    return p;
  } catch {
    return null;
  }
}
