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

// Map one-time store product ids to their live Stripe Price ids.
// Authoritative server-side map — the client only sends product ids + quantity,
// never prices, so amounts can't be tampered with. Env vars override the
// defaults if set (e.g. for a test-mode catalogue).
const PRODUCT_PRICES = {
  px_v1:       process.env.STRIPE_PRICE_PX_V1       || 'price_1TnanTRXEmDshqwoKiTjnP6p',
  linen_towel: process.env.STRIPE_PRICE_LINEN_TOWEL || 'price_1TnQZ7RXEmDshqwoL6PZDTV5',
  soap_rose:   process.env.STRIPE_PRICE_SOAP_ROSE   || 'price_1TnQZ9RXEmDshqwo0N9dNBpg',
  soap_breeze: process.env.STRIPE_PRICE_SOAP_BREEZE || 'price_1TnQZBRXEmDshqwoUUaqOQGC',
  soap_meadow: process.env.STRIPE_PRICE_SOAP_MEADOW || 'price_1TnQZCRXEmDshqwoOYisTU6k',
};

export function priceIdForProduct(productId) {
  return PRODUCT_PRICES[productId] || null;
}
