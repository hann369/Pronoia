// app/api/connectors/whoop/callback/route.js
// WHOOP redirects here after consent. We verify the signed `state` to recover
// the uid (CSRF-safe), exchange the code for tokens, persist them, and bounce
// the user back into the Life OS connectors tab.

import { NextResponse } from 'next/server';
import { verifyState } from '@/lib/serverAuth';
import { exchangeCodeForTokens, storeTokens } from '@/lib/connectors/whoop';

function redirectToConnectors(origin, status) {
  return NextResponse.redirect(`${origin}/life-os?tab=connectors&whoop=${status}`);
}

export async function GET(req) {
  const origin = req.nextUrl.origin;
  const code = req.nextUrl.searchParams.get('code');
  const state = req.nextUrl.searchParams.get('state');
  const error = req.nextUrl.searchParams.get('error');

  if (error || !code || !state) {
    return redirectToConnectors(origin, 'error');
  }

  const payload = verifyState(state);
  if (!payload?.uid) {
    return redirectToConnectors(origin, 'error');
  }

  try {
    const redirectUri = payload.redirectUri || `${origin}/api/connectors/whoop/callback`;
    const tokens = await exchangeCodeForTokens({ code, redirectUri });
    await storeTokens(payload.uid, tokens);
    return redirectToConnectors(origin, 'connected');
  } catch (err) {
    console.error('[WHOOP Callback] error:', err);
    return redirectToConnectors(origin, 'error');
  }
}
