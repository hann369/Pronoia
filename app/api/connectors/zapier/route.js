// app/api/connectors/zapier/route.js — fire a user-configured Zapier
// (or generic) webhook. Proxied server-side to avoid browser CORS limits.
//
// Body: { webhookUrl, event, data? }

import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { webhookUrl, event, data } = await req.json();

    if (!webhookUrl || !/^https:\/\//i.test(webhookUrl)) {
      return NextResponse.json(
        { success: false, message: 'Zapier: Gültige HTTPS Webhook-URL erforderlich.' },
        { status: 400 }
      );
    }

    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: event || 'pronoia_event',
        source: 'pronoia',
        timestamp: new Date().toISOString(),
        ...(data || {}),
      }),
    });

    if (!res.ok) {
      return NextResponse.json(
        { success: false, message: `Zapier: Webhook antwortete mit ${res.status}.` },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true, message: `Zapier: Event "${event || 'pronoia_event'}" ausgelöst.` });
  } catch (err) {
    console.error('[Zapier Connector] error:', err);
    return NextResponse.json({ success: false, message: `Zapier: ${err.message}` }, { status: 500 });
  }
}
