// app/api/connectors/whoop/sync/route.js
// Authenticated (Firebase ID token). Uses the user's stored WHOOP tokens to
// fetch the latest recovery (HRV) and sleep performance. Returns { hrv, sleep }.
// Responds with `connected: false` when the user hasn't linked WHOOP yet so the
// client can kick off the OAuth flow.

import { NextResponse } from 'next/server';
import { verifyIdToken } from '@/lib/serverAuth';
import { getValidAccessToken, fetchLatestMetrics, whoopConfigured } from '@/lib/connectors/whoop';

export async function POST(req) {
  if (!whoopConfigured()) {
    return NextResponse.json(
      { success: false, connected: false, message: 'WHOOP: Server-Credentials nicht konfiguriert.' },
      { status: 503 }
    );
  }

  const user = await verifyIdToken(req.headers.get('authorization'));
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const accessToken = await getValidAccessToken(user.uid);
    if (!accessToken) {
      return NextResponse.json({ success: false, connected: false, message: 'WHOOP nicht verbunden.' });
    }

    const { hrv, sleep } = await fetchLatestMetrics(accessToken);
    return NextResponse.json({
      success: true,
      connected: true,
      data: { hrv, sleep },
      message: `WHOOP: HRV=${hrv ?? '—'}ms, Sleep=${sleep ?? '—'}%`,
    });
  } catch (err) {
    console.error('[WHOOP Sync] error:', err);
    return NextResponse.json({ success: false, connected: true, message: `WHOOP: ${err.message}` }, { status: 500 });
  }
}
