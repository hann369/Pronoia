// app/api/connectors/whoop/authorize/route.js
// Authenticated (Firebase ID token) → returns the WHOOP consent URL with a
// signed `state` carrying the uid. The client then navigates the browser to it.

import { NextResponse } from 'next/server';
import { verifyIdToken, signState } from '@/lib/serverAuth';
import { whoopConfigured, buildAuthorizeUrl } from '@/lib/connectors/whoop';

export async function GET(req) {
  if (!whoopConfigured()) {
    return NextResponse.json(
      { success: false, message: 'WHOOP: Server-Credentials (WHOOP_CLIENT_ID/SECRET) nicht konfiguriert.' },
      { status: 503 }
    );
  }

  const user = await verifyIdToken(req.headers.get('authorization'));
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const redirectUri =
    process.env.WHOOP_REDIRECT_URI || `${req.nextUrl.origin}/api/connectors/whoop/callback`;

  const state = signState({ uid: user.uid, redirectUri });
  if (!state) {
    return NextResponse.json(
      { success: false, message: 'WHOOP: CONNECTOR_STATE_SECRET/WEBHOOK_SECRET nicht konfiguriert.' },
      { status: 503 }
    );
  }

  return NextResponse.json({ success: true, authorizeUrl: buildAuthorizeUrl({ redirectUri, state }) });
}
