'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './page.module.css';

/* ─── Product Data ─── */
const WEAR_CATEGORIES = [
  {
    id: 'casual',
    label: 'Casual Wear',
    tag: 'CASUAL.01',
    icon: '◎',
    headline: 'Alltag ohne Kompromisse',
    desc: 'Organische Baumwolle, GOTS-zertifiziert. Frei von synthetischen Färbemitteln, Formaldehyd und endokrinen Disruptoren. Designed für maximale Hautgesundheit im Alltag.',
    items: ['Organic T-Shirts', 'Linen Pants', 'Hemp Hoodies', 'Natural Underwear'],
    color: 'var(--tan)'
  },
  {
    id: 'formal',
    label: 'Formal Wear',
    tag: 'FORMAL.02',
    icon: '◈',
    headline: 'Präsenz ohne toxische Last',
    desc: 'Chemikalienfreie Merinowolle und Tencel. Keine PFC-Imprägnierungen, keine Synthetikfasern. Für Boardrooms und Meetings, die Performance fordern.',
    items: ['Merino Blazers', 'Tencel Shirts', 'Wool Trousers', 'Natural Ties'],
    color: 'var(--cobalt-bright)'
  },
  {
    id: 'functional',
    label: 'Functional Wear',
    tag: 'FUNCTIONAL.03',
    icon: '◐',
    headline: 'Performance-Ausrüstung für den Bio-Athleten',
    desc: 'Schlafmasken aus organischer Seide, Barfußschuhe für natürliche Propriozeption, Sportkleidung ohne Mikroplastik-Eintrag — designed für den ganzen zirkadianen Zyklus.',
    items: ['Silk Sleep Masks', 'Barefoot Shoes', 'Organic Sportswear', 'Compression Socks', 'Grounding Sandals', 'Cold Therapy Caps'],
    color: 'var(--green)'
  }
];

const FOOD_CATEGORIES = [
  {
    id: 'raw',
    label: 'Rohe Bio-Produkte',
    tag: 'RAW.01',
    icon: '○',
    desc: 'Unverarbeitete Erde-zu-Tisch Produkte. Gemüse, Nüsse, Samen und Superfoods direkt von zertifizierten Biobauern. Kein Zwischenhändler, keine Zusätze.',
    items: ['Sprossen & Mikrogreens', 'Adaptogene (Ashwagandha, Reishi)', 'Rohe Kakaonibs', 'Gekeimte Samen', 'Tiefkühlobst & -gemüse', 'Kalt-gepresste Öle'],
    color: 'var(--green)'
  },
  {
    id: 'supplements',
    label: 'Nootropika & Supplements',
    tag: 'SUPP.02',
    icon: '◔',
    desc: 'PX-V1 Formulation. Zertifizierte Reinheit, klinische Dosierungen, vollständige CoA-Transparenz. Automatisierter Refill im Premium & Max Abo.',
    items: ['PX-V1 Nootropic Matrix', 'Mg-Threonat', 'Alpha-GPC', 'L-Theanin', 'Bromantane', 'Vitamin D3+K2'],
    color: 'var(--tan)'
  }
];

/* ─── Bio Store Scanner Component ─── */
function BioStoreScanner() {
  const [scanState, setScanState] = useState('idle'); // idle | scanning | results | error
  const [stores, setStores] = useState([]);
  const [product, setProduct] = useState('');

  const MOCK_STORES = [
    { name: 'BioCompany Mitte', distance: '0.4 km', address: 'Rosenthaler Str. 40, Berlin', open: true, rating: 4.8 },
    { name: 'Reformhaus Hensel', distance: '0.9 km', address: 'Kastanienallee 12, Berlin', open: true, rating: 4.5 },
    { name: 'denn\'s Biomarkt', distance: '1.2 km', address: 'Schönhauser Allee 36, Berlin', open: false, rating: 4.3 },
    { name: 'Bio-Bioladen', distance: '1.8 km', address: 'Prenzlauer Allee 44, Berlin', open: true, rating: 4.7 },
  ];

  const handleScan = () => {
    if (!product.trim()) return;
    setScanState('scanning');
    // Simulate geolocation + store lookup
    setTimeout(() => {
      setStores(MOCK_STORES);
      setScanState('results');
    }, 2200);
  };

  return (
    <div className={styles.scanner}>
      <div className={styles.scannerHeader}>
        <span className={styles.scannerIcon}>📍</span>
        <div>
          <div className={styles.scannerTitle}>Bio Store Finder</div>
          <div className={styles.scannerSub}>
            Produkt nicht im Sortiment? Der Scanner lokalisiert den nächsten zertifizierten Bioladen mit deinem gesuchten Produkt.
          </div>
        </div>
      </div>

      <div className={styles.scannerForm}>
        <input
          type="text"
          className={styles.scannerInput}
          placeholder="Produkt eingeben (z.B. Ashwagandha Root)..."
          value={product}
          onChange={e => setProduct(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleScan()}
        />
        <button
          className={styles.scannerBtn}
          onClick={handleScan}
          disabled={scanState === 'scanning' || !product.trim()}
        >
          {scanState === 'scanning' ? (
            <span className={styles.scannerSpinner} />
          ) : '🔍 Scannen'}
        </button>
      </div>

      {scanState === 'scanning' && (
        <div className={styles.scannerStatus}>
          <span className={styles.scannerPulse} />
          Standort wird ermittelt... Bioläden werden gescannt...
        </div>
      )}

      {scanState === 'results' && (
        <div className={styles.scannerResults}>
          <div className={styles.scannerResultsHeader}>
            {stores.length} Bioläden in der Nähe mit „{product}"
          </div>
          {stores.map((s, i) => (
            <div key={i} className={styles.storeCard}>
              <div className={styles.storeTop}>
                <div>
                  <div className={styles.storeName}>{s.name}</div>
                  <div className={styles.storeAddress}>{s.address}</div>
                </div>
                <div className={styles.storeRight}>
                  <span className={`${styles.storeBadge} ${s.open ? styles.storeOpen : styles.storeClosed}`}>
                    {s.open ? 'GEÖFFNET' : 'GESCHLOSSEN'}
                  </span>
                  <div className={styles.storeDistance}>{s.distance}</div>
                </div>
              </div>
              <div className={styles.storeRating}>
                {'★'.repeat(Math.round(s.rating))} {s.rating}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Main Page ─── */
export default function BioSyntheticsPage() {
  const [activeWear, setActiveWear] = useState('casual');
  const activeWearData = WEAR_CATEGORIES.find(c => c.id === activeWear);

  return (
    <div className={styles.wrapper}>

      {/* ─── HERO ─── */}
      <section className={styles.hero}>
        <div className={styles.heroBg} aria-hidden="true">
          <div className={styles.heroGlow} />
          <div className={styles.heroGlow2} />
        </div>
        <div className="container">
          <div className={styles.heroInner}>
            <span className={styles.heroBadge}>PRONOIA BIO-SYNTHETICS</span>
            <h1 className={styles.heroTitle}>
              Kleidung &<br />Nahrung, die<br /><em>für dich arbeiten.</em>
            </h1>
            <p className={styles.heroSub}>
              Bio-Synthetics ist das Material-Fundament des Pronoia Systems. Was du trägst und was du isst erzeugt eine biologische Baseline — wir curatieren beides auf höchstem Standard.
            </p>
            <div className={styles.heroPillGrid}>
              <div className={styles.heroPill}><span>◎</span> Casual Wear</div>
              <div className={styles.heroPill}><span>◈</span> Formal Wear</div>
              <div className={styles.heroPill}><span>◐</span> Functional Wear</div>
              <div className={styles.heroPill}><span>○</span> Raw Foods</div>
              <div className={styles.heroPill}><span>◔</span> Supplements</div>
              <div className={styles.heroPill}><span>📍</span> Store Finder</div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── WEAR SECTION ─── */}
      <section className={styles.section}>
        <div className="container">
          <div className={styles.sectionLabelRow}>
            <span className={styles.sectionLabel}>01 — KLEIDUNG</span>
            <h2 className={styles.sectionTitle}>Functional Wardrobe System</h2>
          </div>

          {/* Tab switcher */}
          <div className={styles.tabRow}>
            {WEAR_CATEGORIES.map(cat => (
              <button
                key={cat.id}
                className={`${styles.tabBtn} ${activeWear === cat.id ? styles.tabBtnActive : ''}`}
                style={activeWear === cat.id ? { borderColor: cat.color, color: cat.color } : {}}
                onClick={() => setActiveWear(cat.id)}
              >
                <span>{cat.icon}</span> {cat.label}
              </button>
            ))}
          </div>

          {/* Active category detail */}
          {activeWearData && (
            <div className={styles.wearDetail}>
              <div className={styles.wearDetailLeft}>
                <span className={styles.wearTag} style={{ color: activeWearData.color, borderColor: activeWearData.color }}>
                  {activeWearData.tag}
                </span>
                <h3 className={styles.wearHeadline}>{activeWearData.headline}</h3>
                <p className={styles.wearDesc}>{activeWearData.desc}</p>
                <div className={styles.wearItems}>
                  {activeWearData.items.map(item => (
                    <span key={item} className={styles.wearItem}>✓ {item}</span>
                  ))}
                </div>
                <Link href="/store" className={styles.wearCta}>
                  Im {activeWearData.label.split(' ')[0]}-Abo enthalten →
                </Link>
              </div>
              <div className={styles.wearDetailRight}>
                <div className={styles.wearVisual} style={{ '--accent': activeWearData.color }}>
                  <div className={styles.wearVisualIcon}>{activeWearData.icon}</div>
                  <div className={styles.wearVisualLabel}>{activeWearData.label}</div>
                  <div className={styles.wearBioTag}>GOTS CERTIFIED · ZERO TOXINS</div>
                  <div className={styles.wearStats}>
                    <div className={styles.wearStat}><span>0</span>Synthetik-fasern</div>
                    <div className={styles.wearStat}><span>100%</span>Organisch</div>
                    <div className={styles.wearStat}><span>0</span>PFC / PFAS</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ─── FOOD SECTION ─── */}
      <section className={`${styles.section} ${styles.sectionDark}`}>
        <div className="container">
          <div className={styles.sectionLabelRow}>
            <span className={styles.sectionLabel}>02 — NAHRUNG</span>
            <h2 className={styles.sectionTitle}>Bio-Adaptive Fuel</h2>
          </div>

          <div className={styles.foodGrid}>
            {FOOD_CATEGORIES.map(cat => (
              <div key={cat.id} className={styles.foodCard}>
                <div className={styles.foodCardTop}>
                  <span className={styles.foodIcon} style={{ color: cat.color }}>{cat.icon}</span>
                  <span className={styles.foodTag} style={{ color: cat.color, borderColor: cat.color }}>
                    {cat.tag}
                  </span>
                </div>
                <h3 className={styles.foodTitle}>{cat.label}</h3>
                <p className={styles.foodDesc}>{cat.desc}</p>
                <div className={styles.foodItems}>
                  {cat.items.map(item => (
                    <span key={item} className={styles.foodItem}>{item}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Bio Store Scanner */}
          <BioStoreScanner />
        </div>
      </section>

      {/* ─── LIFE OS INTEGRATION CTA ─── */}
      <section className={styles.integrationSection}>
        <div className="container">
          <div className={styles.integrationCard}>
            <div className={styles.integrationLeft}>
              <span className={styles.sectionLabel} style={{ color: 'var(--cobalt-bright)' }}>
                LIFE OS INTEGRATION
              </span>
              <h2 className={styles.integrationTitle}>
                Deine Kleidung & Nahrung<br />werden zu Systemdaten.
              </h2>
              <p className={styles.integrationDesc}>
                Im Life OS Dashboard ist Bio-Synthetics direkt integriert. Dein nootropischer Stack-Verbrauch wird live getrackt, Mahlzeiten werden in die Ablauf-Queue eingebettet, und der Biomarker-Sync spiegelt den Einfluss deiner Nahrungsmittel auf HRV und Schlafarchitektur wider.
              </p>
              <Link href="/life-os" className={styles.integrationCta}>
                Life OS starten →
              </Link>
            </div>
            <div className={styles.integrationRight}>
              <div className={styles.integrationWidget}>
                <div className={styles.iwHeader}>
                  <span className={styles.iwDot} />
                  <span>BIO-SYNTHETICS LIVE SYNC</span>
                </div>
                <div className={styles.iwRows}>
                  {[
                    { label: 'Stack Supply (PX-V1)', value: '72%', color: 'var(--green)' },
                    { label: 'Nächster Refill', value: '8 Tage', color: 'var(--tan)' },
                    { label: 'Letzte Mahlzeit', value: 'vor 2h', color: 'var(--cobalt-bright)' },
                    { label: 'Schlafmaske', value: 'AKTIV', color: 'var(--green)' },
                  ].map(row => (
                    <div key={row.label} className={styles.iwRow}>
                      <span className={styles.iwLabel}>{row.label}</span>
                      <span className={styles.iwValue} style={{ color: row.color }}>{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
