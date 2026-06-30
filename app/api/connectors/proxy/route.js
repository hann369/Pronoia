// app/api/connectors/proxy/route.js
// Minimal allowlisted GET proxy for token-based connector APIs (Oura, Toggl, …).
// Browsers can't call these directly (no CORS); the user's own token is forwarded
// from the client. Host is strictly allowlisted to prevent SSRF.

import { NextResponse } from 'next/server';

const ALLOWED_HOSTS = new Set([
  'api.ouraring.com',
  'api.track.toggl.com',
]);

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Ungültiger Request-Body.' }, { status: 400 });
  }

  const { url, token, auth = 'bearer' } = body || {};
  if (!url || typeof url !== 'string') {
    return NextResponse.json({ error: 'URL fehlt.' }, { status: 400 });
  }

  let target;
  try {
    target = new URL(url);
  } catch {
    return NextResponse.json({ error: 'URL ungültig.' }, { status: 400 });
  }
  if (target.protocol !== 'https:' || !ALLOWED_HOSTS.has(target.hostname)) {
    return NextResponse.json({ error: `Host nicht erlaubt: ${target.hostname}` }, { status: 403 });
  }

  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    // Toggl uses HTTP Basic with the API token as username + 'api_token' as password.
    headers['Authorization'] =
      auth === 'basic'
        ? `Basic ${Buffer.from(`${token}:api_token`).toString('base64')}`
        : `Bearer ${token}`;
  }

  try {
    const res = await fetch(target.toString(), { headers, signal: AbortSignal.timeout(10000) });
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }
    if (!res.ok) {
      return NextResponse.json({ error: `API ${res.status}`, detail: data }, { status: res.status });
    }
    return NextResponse.json({ ok: true, data });
  } catch (err) {
    return NextResponse.json({ error: `Abruf fehlgeschlagen: ${err.message}` }, { status: 502 });
  }
}
