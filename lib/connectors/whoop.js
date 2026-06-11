// lib/connectors/whoop.js — server-only WHOOP OAuth2 token management.
//
// Tokens are persisted per user at users/{uid}.connectors.whoop via the Admin SDK.
// Env: WHOOP_CLIENT_ID, WHOOP_CLIENT_SECRET, WHOOP_REDIRECT_URI (optional;
// otherwise derived from the request origin).

import { adminDb } from '@/lib/firebaseAdmin';

const WHOOP_AUTH_URL = 'https://api.prod.whoop.com/oauth/oauth2/auth';
const WHOOP_TOKEN_URL = 'https://api.prod.whoop.com/oauth/oauth2/token';
const WHOOP_API = 'https://api.prod.whoop.com/developer';
export const WHOOP_SCOPES = 'offline read:recovery read:sleep read:profile';

export function whoopConfigured() {
  return !!(process.env.WHOOP_CLIENT_ID && process.env.WHOOP_CLIENT_SECRET);
}

export function buildAuthorizeUrl({ redirectUri, state }) {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.WHOOP_CLIENT_ID,
    redirect_uri: redirectUri,
    scope: WHOOP_SCOPES,
    state,
  });
  return `${WHOOP_AUTH_URL}?${params.toString()}`;
}

async function postToken(form) {
  const res = await fetch(WHOOP_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(form).toString(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`WHOOP token endpoint ${res.status}: ${text}`);
  }
  return res.json();
}

export async function exchangeCodeForTokens({ code, redirectUri }) {
  return postToken({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    client_id: process.env.WHOOP_CLIENT_ID,
    client_secret: process.env.WHOOP_CLIENT_SECRET,
  });
}

export async function storeTokens(uid, tokens) {
  if (!adminDb) throw new Error('Admin SDK not configured');
  const expiresAt = Date.now() + (tokens.expires_in || 3600) * 1000;
  await adminDb.collection('users').doc(uid).set(
    {
      connectors: {
        whoop: {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token || null,
          expiresAt,
          connectedAt: new Date().toISOString(),
        },
      },
    },
    { merge: true }
  );
}

// Return a valid access token for the user, refreshing if expired. Null if not connected.
export async function getValidAccessToken(uid) {
  if (!adminDb) throw new Error('Admin SDK not configured');
  const snap = await adminDb.collection('users').doc(uid).get();
  const whoop = snap.exists ? snap.data().connectors?.whoop : null;
  if (!whoop?.accessToken) return null;

  // Refresh if it expires within the next 60s
  if (whoop.expiresAt && Date.now() > whoop.expiresAt - 60_000 && whoop.refreshToken) {
    const refreshed = await postToken({
      grant_type: 'refresh_token',
      refresh_token: whoop.refreshToken,
      client_id: process.env.WHOOP_CLIENT_ID,
      client_secret: process.env.WHOOP_CLIENT_SECRET,
      scope: WHOOP_SCOPES,
    });
    await storeTokens(uid, { ...refreshed, refresh_token: refreshed.refresh_token || whoop.refreshToken });
    return refreshed.access_token;
  }

  return whoop.accessToken;
}

// Fetch the latest recovery (HRV) and sleep performance for the user.
export async function fetchLatestMetrics(accessToken) {
  const headers = { Authorization: `Bearer ${accessToken}` };

  let hrv = null;
  let sleep = null;

  try {
    const recRes = await fetch(`${WHOOP_API}/v1/recovery?limit=1`, { headers });
    if (recRes.ok) {
      const rec = await recRes.json();
      const score = rec.records?.[0]?.score;
      if (score) hrv = Math.round(score.hrv_rmssd_milli ?? score.hrv_rmssd ?? 0) || null;
    }
  } catch (e) {
    console.warn('[WHOOP] recovery fetch failed:', e.message);
  }

  try {
    const sleepRes = await fetch(`${WHOOP_API}/v1/activity/sleep?limit=1`, { headers });
    if (sleepRes.ok) {
      const s = await sleepRes.json();
      const perf = s.records?.[0]?.score?.sleep_performance_percentage;
      if (perf != null) sleep = Math.round(perf);
    }
  } catch (e) {
    console.warn('[WHOOP] sleep fetch failed:', e.message);
  }

  return { hrv, sleep };
}
