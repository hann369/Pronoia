// app/api/stripe/webhook/route.js
// Stripe webhook receiver. Verifies the signature against STRIPE_WEBHOOK_SECRET,
// then reconciles subscription state into Firestore (users/{uid}) via the Admin SDK.
//
// Configure this URL as an endpoint in the Stripe Dashboard and subscribe to:
//   checkout.session.completed, customer.subscription.updated,
//   customer.subscription.deleted

import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { adminDb } from '@/lib/firebaseAdmin';

// Stripe requires the raw, unparsed body for signature verification.
export async function POST(req) {
  if (!stripe || !adminDb) {
    return NextResponse.json({ error: 'Stripe or Admin SDK not configured' }, { status: 503 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret || webhookSecret === 'whsec_REPLACE_ME') {
    return NextResponse.json({ error: 'STRIPE_WEBHOOK_SECRET not configured' }, { status: 503 });
  }

  const sig = req.headers.get('stripe-signature');
  const rawBody = await req.text();

  let evt;
  try {
    evt = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    console.error('[Stripe Webhook] Signature verification failed:', err.message);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  try {
    switch (evt.type) {
      case 'checkout.session.completed': {
        const s = evt.data.object;
        const uid = s.client_reference_id || s.metadata?.uid;
        const tierId = s.metadata?.tierId;
        // Only subscription checkouts activate a tier. One-time store-product
        // purchases (mode: 'payment') must NOT grant a subscription.
        if (uid && s.mode === 'subscription') {
          await adminDb.collection('users').doc(uid).set(
            {
              subscriptionTier: tierId || 'premium',
              subscription: {
                status: 'active',
                stripeCustomerId: s.customer || null,
                stripeSubscriptionId: s.subscription || null,
                tierId: tierId || 'premium',
                updatedAt: new Date().toISOString(),
              },
            },
            { merge: true }
          );
          console.log(`[Stripe Webhook] Activated ${tierId} for uid=${uid}`);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const sub = evt.data.object;
        const uid = sub.metadata?.uid || (await uidByCustomer(sub.customer));
        if (uid) {
          const active = sub.status === 'active' || sub.status === 'trialing';
          await adminDb.collection('users').doc(uid).set(
            {
              subscriptionTier: active ? sub.metadata?.tierId || 'premium' : 'free',
              subscription: {
                status: sub.status,
                stripeCustomerId: sub.customer || null,
                stripeSubscriptionId: sub.id,
                tierId: sub.metadata?.tierId || 'premium',
                updatedAt: new Date().toISOString(),
              },
            },
            { merge: true }
          );
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = evt.data.object;
        const uid = sub.metadata?.uid || (await uidByCustomer(sub.customer));
        if (uid) {
          await adminDb.collection('users').doc(uid).set(
            {
              subscriptionTier: 'free',
              subscription: { status: 'canceled', updatedAt: new Date().toISOString() },
            },
            { merge: true }
          );
        }
        break;
      }

      default:
        // Unhandled event types are acknowledged with 200.
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('[Stripe Webhook] Handler error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// Fallback uid resolution when metadata is missing: match a stored customer id.
async function uidByCustomer(customerId) {
  if (!customerId) return null;
  const snap = await adminDb
    .collection('users')
    .where('subscription.stripeCustomerId', '==', customerId)
    .limit(1)
    .get();
  return snap.empty ? null : snap.docs[0].id;
}
