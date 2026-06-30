// lib/tiers.js
// Single source of truth for subscription-tier capabilities. The marketing copy
// lives in the TIERS array (app/life-os/page.js); this file is the *enforceable*
// mirror of that copy. Every feature gate in the app should derive from here so a
// free user can't silently use premium/max-only features.
//
// Tier value is stored at profile.subscriptionTier (see hooks/useProtocol.js +
// the Stripe webhook). Anything unknown / missing resolves to 'free'.

export const TIER_RANK = { free: 0, premium: 1, max: 2 };
export const TIER_LABEL = { free: 'Free', premium: 'Premium', max: 'Max' };

// Feature matrix — keep in lockstep with the TIERS feature list.
//   connectorLimit : max number of installed API connectors
//   refills        : automated nootropic refills
//   bioFuel        : bio-adaptive fuel / curated meals
//   apparel        : Shell V1 textile apparel
const FEATURES = {
  free:    { connectorLimit: 2,        refills: false, bioFuel: false, apparel: false },
  premium: { connectorLimit: Infinity, refills: true,  bioFuel: true,  apparel: false },
  max:     { connectorLimit: Infinity, refills: true,  bioFuel: true,  apparel: true  },
};

export function normalizeTier(tier) {
  return FEATURES[tier] ? tier : 'free';
}

export function getTier(profile) {
  return normalizeTier(profile?.subscriptionTier);
}

export function tierFeatures(profile) {
  return FEATURES[getTier(profile)];
}

// Boolean feature check (refills | bioFuel | apparel).
export function hasFeature(profile, feature) {
  return !!tierFeatures(profile)[feature];
}

export function connectorLimit(profile) {
  return tierFeatures(profile).connectorLimit;
}

// Lowest tier that unlocks a given feature — used to phrase the upgrade prompt.
// `connectors` is treated as a feature key meaning "unlimited connectors".
export function requiredTierFor(feature) {
  for (const tier of ['premium', 'max']) {
    if (feature === 'connectors' ? FEATURES[tier].connectorLimit === Infinity : FEATURES[tier][feature]) {
      return tier;
    }
  }
  return 'max';
}
