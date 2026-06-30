// app/api/stripe/cart/route.js
// Create a Stripe Checkout Session for one-time store products (soaps, towel,
// PX-V1). The client sends only product ids + quantities; the server resolves
// the price from its own authoritative map (lib/stripe.js) so amounts can never
// be tampered with. Authenticated via Firebase ID token so the uid travels with
// the session for the webhook / order reconciliation.

import { NextResponse } from 'next/server';
import { stripe, priceIdForProduct } from '@/lib/stripe';
import { verifyIdToken } from '@/lib/serverAuth';

const SHIPPING_COUNTRIES = ['DE', 'AT', 'CH', 'NL', 'BE', 'FR', 'IT', 'ES', 'LU'];

export async function POST(req) {
  if (!stripe) {
    return NextResponse.json(
      { error: 'Stripe ist nicht konfiguriert (STRIPE_SECRET_KEY fehlt).' },
      { status: 503 }
    );
  }

  // Auth is optional: the public store page allows anonymous guest checkout.
  // When a token is present we attach the uid so the purchase can be tied to
  // the account; otherwise Stripe still collects the customer email.
  const user = await verifyIdToken(req.headers.get('authorization'));

  try {
    const { items } = await req.json();
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Warenkorb ist leer.' }, { status: 400 });
    }

    // Resolve each item against the server-side price map and clamp quantity.
    const line_items = [];
    const unknown = [];
    for (const item of items) {
      const priceId = priceIdForProduct(item?.id);
      if (!priceId) { unknown.push(item?.id); continue; }
      const qty = Math.min(Math.max(parseInt(item?.qty, 10) || 1, 1), 10);
      line_items.push({ price: priceId, quantity: qty });
    }

    if (line_items.length === 0) {
      return NextResponse.json(
        { error: `Keine kaufbaren Artikel im Warenkorb${unknown.length ? ` (unbekannt: ${unknown.join(', ')})` : ''}.` },
        { status: 400 }
      );
    }

    const origin = req.nextUrl.origin;
    // Where to return after checkout: standalone /store for guests/public,
    // the Life OS store tab when the request came from inside the app.
    const returnTo = (() => {
      try {
        const ref = req.headers.get('referer') || '';
        if (ref.includes('/life-os')) return { ok: '/life-os?tab=store&checkout=success&kind=products', no: '/life-os?tab=store&checkout=cancel&kind=products' };
      } catch {}
      return { ok: '/store?checkout=success', no: '/store?checkout=cancel' };
    })();

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items,
      client_reference_id: user?.uid || undefined,
      customer_email: user?.email || undefined,
      metadata: { uid: user?.uid || 'guest', kind: 'store_products' },
      shipping_address_collection: { allowed_countries: SHIPPING_COUNTRIES },
      success_url: `${origin}${returnTo.ok}`,
      cancel_url: `${origin}${returnTo.no}`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('[Stripe Cart] error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
