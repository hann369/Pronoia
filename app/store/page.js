'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useProtocol } from '@/hooks/useProtocol';
import styles from './page.module.css';

const TIERS = [
  {
    id: 'free',
    name: 'Free',
    subtitle: 'Core Life OS System',
    price: 0,
    period: 'Dauerhaft',
    badge: 'ENTRY LEVEL',
    description: 'Für Bio-Cognitive Adepts, die ihr System manuell verwalten und das zirkadiane Kern-Protokoll austesten möchten.',
    features: [
      { text: 'Zugang zum Life OS Dashboard', available: true },
      { text: 'Max. 2 tägliche API-Konnektoren', available: true },
      { text: 'Zirkadianer Kalender & Skill Lab', available: true },
      { text: 'Automatisierte Nootropika-Refills', available: false },
      { text: 'Bio-Adaptive Fuel (curated meals)', available: false },
      { text: 'Functional Gear (Shell V1 Apparel)', available: false },
    ],
    ctaText: 'Kostenlos starten',
    accentColor: 'var(--text3)'
  },
  {
    id: 'premium',
    name: 'Premium',
    subtitle: 'Nootropics & Bio-Fuel Sync',
    price: 59,
    period: 'Monat',
    badge: 'POPULÄR',
    description: 'Für High-Performer, die ihre kognitiven Zyklen physisch mit nootropischen Refills und bio-nutritiven Lebensmittel-Boxen koppeln wollen.',
    features: [
      { text: 'Zugang zum Life OS Dashboard', available: true },
      { text: 'Unbegrenzte API-Konnektoren', available: true },
      { text: 'Zirkadianer Kalender & Skill Lab', available: true },
      { text: 'Automatisierte PX-V1 Refills', available: true },
      { text: 'Bio-Adaptive Fuel (curated meals)', available: true },
      { text: 'Functional Gear (Shell V1 Apparel)', available: false },
    ],
    ctaText: 'Premium aktivieren',
    accentColor: 'var(--cobalt-bright)',
    featured: true
  },
  {
    id: 'max',
    name: 'Max',
    subtitle: 'Biometrics & Apparel Shield',
    price: 99,
    period: 'Monat',
    badge: 'ULTIMATIVE ERFAHRUNG',
    description: 'Das ultimative Pronoia-Substrat. Umfassende Biometrie-Kalibrierung, maximale Nährstoffzufuhr und quartalsweises Shell V1 Gear.',
    features: [
      { text: 'Zugang zum Life OS Dashboard', available: true },
      { text: 'Unbegrenzte API-Konnektoren', available: true },
      { text: 'Zirkadianer Kalender & Skill Lab', available: true },
      { text: 'Automatisierte PX-V1 Refills', available: true },
      { text: 'Erweiterte Bio-Meals & Superfoods', available: true },
      { text: 'Shell V1 Textile Apparel (Kleidung)', available: true },
    ],
    ctaText: 'System maximieren',
    accentColor: 'var(--tan)'
  }
];

export default function StorePage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { profile, saveProfile } = useProtocol();
  const [toast, setToast] = useState('');
  const [activeTier, setActiveTier] = useState('free');

  useEffect(() => {
    if (profile?.subscriptionTier) {
      setActiveTier(profile.subscriptionTier);
    }
  }, [profile]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 4000);
  };

  const handleCheckout = async (tierId) => {
    if (loading) return;
    if (!user) {
      showToast('Bitte melde dich an, um dein Pronoia-Abonnement zu wählen.');
      setTimeout(() => router.push('/auth'), 1500);
      return;
    }

    showToast(`Aktiviere ${tierId.toUpperCase()} Abonnement...`);
    
    try {
      // Simulate Stripe redirection / update Firestore user model
      await saveProfile({
        subscriptionTier: tierId
      });
      setActiveTier(tierId);
      showToast(`Abonnement erfolgreich auf ${tierId.toUpperCase()} aktualisiert! Dein Life OS wurde freigeschaltet.`);
    } catch (e) {
      showToast('Fehler bei der Abrechnungs-Synchronisation.');
    }
  };

  return (
    <div className={styles.wrapper}>
      {toast && (
        <div className={styles.toast} role="status">
          {toast}
        </div>
      )}

      {/* ─── HERO SECTION ─── */}
      <section className={styles.hero}>
        <div className="container">
          <div className={styles.heroInner}>
            <span className={styles.heroBadge}>
              <span className={styles.pulseDot} />
              Pronoia Ecosystem Store
            </span>
            <h1 className={styles.heroTitle}>
              Invest in your<br />
              <em>system.</em>
            </h1>
            <p className={styles.heroSub}>
              Pronoia ist eine ganzheitliche Umbrella Brand. Wähle dein Abonnement, um das Life OS freizuschalten, automatische Nootropika-Refills zu erhalten oder direkt mit Bio-Fuel (Lebensmittel) und Functional Gear (Kleidung) versorgt zu werden.
            </p>
            
            <div className={styles.currentPlanNudge}>
              <span>Aktive Systemstufe:</span>
              <strong style={{ color: activeTier === 'max' ? 'var(--tan)' : activeTier === 'premium' ? 'var(--cobalt-bright)' : 'var(--text2)' }}>
                {activeTier.toUpperCase()}
              </strong>
            </div>
          </div>
        </div>
      </section>

      {/* ─── SUBSCRIPTION COLUMNS ─── */}
      <section className={styles.pricingSection}>
        <div className="container">
          <div className={styles.pricingGrid}>
            {TIERS.map(tier => {
              const isActive = activeTier === tier.id;
              return (
                <div 
                  key={tier.id} 
                  className={`${styles.pricingCard} ${tier.featured ? styles.pricingCardFeatured : ''} ${isActive ? styles.pricingCardActive : ''}`}
                  style={{ '--border-color': tier.accentColor }}
                >
                  {tier.badge && (
                    <span className={styles.tierBadge} style={{ backgroundColor: tier.accentColor, color: tier.id === 'max' ? '#030408' : '#fff' }}>
                      {tier.badge}
                    </span>
                  )}
                  
                  <div className={styles.cardHeader}>
                    <h3 className={styles.tierName}>{tier.name}</h3>
                    <p className={styles.tierSubtitle}>{tier.subtitle}</p>
                    <div className={styles.priceRow}>
                      <span className={styles.currency}>€</span>
                      <span className={styles.price}>{tier.price}</span>
                      <span className={styles.period}>/ {tier.period}</span>
                    </div>
                  </div>

                  <p className={styles.tierDesc}>{tier.description}</p>

                  <div className={styles.divider} />

                  <ul className={styles.featureList}>
                    {tier.features.map((feature, i) => (
                      <li key={i} className={`${styles.featureItem} ${feature.available ? '' : styles.featureItemDisabled}`}>
                        <span className={styles.checkIcon}>{feature.available ? '✓' : '×'}</span>
                        <span>{feature.text}</span>
                      </li>
                    ))}
                  </ul>

                  <button 
                    type="button"
                    className={`${styles.ctaBtn} ${tier.featured ? styles.ctaBtnFeatured : ''} ${isActive ? styles.ctaBtnActive : ''}`}
                    onClick={() => handleCheckout(tier.id)}
                  >
                    {isActive ? 'Aktiver Plan ✓' : tier.ctaText}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── ECOSYSTEM FOOTNOTE ─── */}
      <section className={styles.footnoteSection}>
        <div className="container">
          <div className={styles.footnoteInner}>
            <h3>Echtes Ecosystem. Keine Insellösungen.</h3>
            <p>
              In den Premium- und Max-Plänen erhältst du automatisierten Zugriff auf Partner-Lieferungen für Bio-Foods und Bekleidung. Das Pronoia System kalibriert deine Nahrung und Ausrüstung basierend auf dem Echtzeit-Verbrauch im Life OS Dashboard.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
