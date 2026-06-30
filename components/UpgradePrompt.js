'use client';

/*
 * UpgradePrompt — shown when a Free (or lower-tier) user tries to use a feature
 * their plan doesn't include. The feature stays visible/clickable; the gate is
 * enforced here with a soft prompt that routes to the Store, rather than hiding
 * or disabling the control. Driven by a single `gate` object from the page.
 *
 *   gate: { title, message, requiredTier } | null
 */

import { TIER_LABEL } from '@/lib/tiers';

export default function UpgradePrompt({ gate, onClose, onUpgrade }) {
  if (!gate) return null;
  const tierName = TIER_LABEL[gate.requiredTier] || 'Premium';

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 100001,
        background: 'rgba(6,5,9,0.82)', backdropFilter: 'blur(14px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem',
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative', width: '100%', maxWidth: '420px',
          background: 'rgba(12,14,22,0.97)', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '18px', padding: '2rem', color: '#fff', textAlign: 'center',
          boxShadow: '0 32px 64px rgba(0,0,0,0.6)',
        }}
      >
        <button
          onClick={onClose}
          aria-label="Schließen"
          style={{
            position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none',
            color: 'rgba(255,255,255,0.35)', fontSize: '1.4rem', lineHeight: 1, cursor: 'pointer',
          }}
        >
          &times;
        </button>

        <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>🔓</div>
        <h2 style={{ fontSize: '1.25rem', margin: '0 0 0.5rem', fontWeight: 700 }}>
          {gate.title || `${tierName}-Feature`}
        </h2>
        <p style={{ fontSize: '0.9rem', lineHeight: 1.6, color: 'rgba(255,255,255,0.65)', margin: '0 0 1.5rem' }}>
          {gate.message || `Diese Funktion ist im ${tierName}-Abo enthalten. Upgrade, um sie freizuschalten.`}
        </p>

        <div style={{ display: 'flex', gap: '0.6rem' }}>
          <button
            onClick={onClose}
            style={{
              flex: 1, padding: '0.7rem 1rem', background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px',
              color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', cursor: 'pointer',
            }}
          >
            Später
          </button>
          <button
            onClick={onUpgrade}
            style={{
              flex: 2, padding: '0.7rem 1rem',
              background: 'var(--theme-accent, var(--cobalt-bright, #1A6AFF))',
              border: 'none', borderRadius: '10px', color: '#fff', fontWeight: 600,
              fontSize: '0.85rem', cursor: 'pointer',
            }}
          >
            🚀 Auf {tierName} upgraden
          </button>
        </div>
      </div>
    </div>
  );
}
