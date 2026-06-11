// app/api/stripe/checkout/route.js
// Create a Stripe Checkout Session for a subscription tier (premium | max).
// Authenticated via Firebase ID token so the uid is trustworthy and travels
// with the session (client_reference_id + metadata) for the webhook.

import { NextResponse } from 'next/server';
import { stripe, priceIdForTier } from '@/lib/stripe';
import { verifyIdToken } from '@/lib/serverAuth';

export async function POST(req) {
  if (!stripe) {
    return NextResponse.json(
      { error: 'Stripe ist nicht konfiguriert (STRIPE_SECRET_KEY fehlt).' },
      { status: 503 }
    );
  }

  const user = await verifyIdToken(req.headers.get('authorization'));
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { tierId } = await req.json();
    const priceId = priceIdForTier(tierId);
    if (!priceId) {
      return NextResponse.json(
        { error: `Kein Stripe-Preis für Tier "${tierId}" konfiguriert (STRIPE_PRICE_*).` },
        { status: 400 }
      );
    }

    const origin = req.nextUrl.origin;
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      client_reference_id: user.uid,
      customer_email: user.email || undefined,
      metadata: { uid: user.uid, tierId },
      subscription_data: { metadata: { uid: user.uid, tierId } },
      success_url: `${origin}/life-os?tab=store&checkout=success`,
      cancel_url: `${origin}/life-os?tab=store&checkout=cancel`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('[Stripe Checkout] error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
