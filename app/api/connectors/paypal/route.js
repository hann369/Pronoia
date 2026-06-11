// app/api/connectors/paypal/route.js — real PayPal Orders v2 integration.
//
// Server credentials (never exposed to the client):
//   PAYPAL_CLIENT_ID, PAYPAL_SECRET
//   PAYPAL_ENV = "live" | "sandbox" (default: sandbox)
//
// Action create_order { item, amount, currency?, returnUrl?, cancelUrl? }
// Returns the PayPal approval link the client should redirect the buyer to.

import { NextResponse } from 'next/server';

function paypalBase() {
  return process.env.PAYPAL_ENV === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';
}

async function getAccessToken() {
  const id = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_SECRET;
  if (!id || !secret) return null;

  const res = await fetch(`${paypalBase()}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  if (!res.ok) throw new Error(`PayPal OAuth failed: ${res.status}`);
  const data = await res.json();
  return data.access_token;
}

export async function POST(req) {
  try {
    const { action, item, amount, currency = 'EUR', returnUrl, cancelUrl } = await req.json();

    if (action !== 'create_order') {
      return NextResponse.json({ success: false, message: `PayPal: Unbekannte Aktion "${action}".` }, { status: 400 });
    }

    const token = await getAccessToken();
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'PayPal: Server-Credentials (PAYPAL_CLIENT_ID/SECRET) nicht konfiguriert.' },
        { status: 503 }
      );
    }

    const res = await fetch(`${paypalBase()}/v2/checkout/orders`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [
          {
            description: String(item || 'Pronoia Order').slice(0, 127),
            amount: { currency_code: currency, value: Number(amount || 0).toFixed(2) },
          },
        ],
        application_context: {
          brand_name: 'Pronoia',
          user_action: 'PAY_NOW',
          return_url: returnUrl || undefined,
          cancel_url: cancelUrl || undefined,
        },
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json(
        { success: false, message: `PayPal API: ${data.message || res.status}` },
        { status: res.status }
      );
    }

    const approveLink = (data.links || []).find((l) => l.rel === 'approve')?.href || null;
    return NextResponse.json({
      success: true,
      message: `PayPal: Bestellung für "${item}" (${currency} ${amount}) erstellt.`,
      data: { orderId: data.id, approveLink },
    });
  } catch (err) {
    console.error('[PayPal Connector] error:', err);
    return NextResponse.json({ success: false, message: `PayPal: ${err.message}` }, { status: 500 });
  }
}
