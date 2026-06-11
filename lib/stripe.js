// lib/stripe.js — server-only Stripe client singleton.
// Returns null when STRIPE_SECRET_KEY is unset so builds/previews don't crash.
import Stripe from 'stripe';

const key = process.env.STRIPE_SECRET_KEY;

export const stripe = key && key !== 'sk_live_REPLACE_ME' ? new Stripe(key) : null;

// Map subscription tier ids to configured Stripe Price ids.
export function priceIdForTier(tierId) {
  const map = {
    premium: process.env.STRIPE_PRICE_PREMIUM,
    max: process.env.STRIPE_PRICE_MAX,
  };
  return map[tierId] || null;
}
