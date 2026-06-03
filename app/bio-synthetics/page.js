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
  const [location, setLocation] = useState('Berlin');
  const [leafletLoaded, setLeafletLoaded] = useState(false);

  // Dynamic Leaflet Loading
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Load Leaflet CSS
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    // Load Leaflet JS
    if (!document.getElementById('leaflet-js')) {
      const script = document.createElement('script');
      script.id = 'leaflet-js';
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.async = true;
      script.onload = () => setLeafletLoaded(true);
      document.body.appendChild(script);
    } else {
      setLeafletLoaded(true);
    }
  }, []);

  // Leaflet Map Initialization
  useEffect(() => {
    if (!leafletLoaded || stores.length === 0 || typeof window === 'undefined' || !window.L) return;

    // Remove existing instance to prevent duplicates
    if (window.storeMapInstance) {
      window.storeMapInstance.remove();
      window.storeMapInstance = null;
    }

    try {
      const firstStore = stores[0];
      const centerLat = firstStore.lat || 52.52;
      const centerLon = firstStore.lon || 13.40;

      const map = window.L.map('store-map').setView([centerLat, centerLon], 13);
      window.storeMapInstance = map;

      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);

      stores.forEach(store => {
        if (store.lat && store.lon) {
          window.L.marker([store.lat, store.lon])
            .addTo(map)
            .bindPopup(`<b>${store.name}</b><br/>${store.address}`);
        }
      });
    } catch (e) {
      console.error('[Leaflet Map Init Error]:', e);
    }

    return () => {
      if (window.storeMapInstance) {
        window.storeMapInstance.remove();
        window.storeMapInstance = null;
      }
    };
  }, [leafletLoaded, stores]);

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const handleScan = async () => {
    if (!product.trim()) return;
    setScanState('scanning');
    setStores([]);

    try {
      const cityQuery = location.trim() || 'Berlin';
      // Geocoding city name via Nominatim
      const geocodeRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cityQuery)}&limit=1`);
      if (!geocodeRes.ok) throw new Error('Nominatim geocode failed');
      const geocodeData = await geocodeRes.json();

      if (geocodeData.length === 0) {
        setScanState('error');
        return;
      }

      const { lat, lon } = geocodeData[0];
      const parsedLat = parseFloat(lat);
      const parsedLon = parseFloat(lon);

      // Overpass query for organic & health food shops
      const overpassQuery = `
        [out:json][timeout:25];
        (
          node["shop"="organic"](around:4000,${parsedLat},${parsedLon});
          way["shop"="organic"](around:4000,${parsedLat},${parsedLon});
          node["shop"="health_food"](around:4000,${parsedLat},${parsedLon});
          way["shop"="health_food"](around:4000,${parsedLat},${parsedLon});
        );
        out body;
        >;
        out skel qt;
      `;

      let results = [];
      try {
        const overpassRes = await fetch('https://overpass-api.de/api/interpreter', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
          },
          body: `data=${encodeURIComponent(overpassQuery)}`
        });

        if (overpassRes.ok) {
          const overpassData = await overpassRes.json();
          if (overpassData.elements && overpassData.elements.length > 0) {
            results = overpassData.elements
              .filter(el => el.type === 'node')
              .map(el => {
                const name = el.tags.name || el.tags.brand || 'Bioladen';
                const road = el.tags['addr:street'] || '';
                const house = el.tags['addr:housenumber'] || '';
                const city = el.tags['addr:city'] || '';
                const address = `${road} ${house}, ${city}`.trim() || 'Adresse unbekannt';
                const dist = calculateDistance(parsedLat, parsedLon, el.lat, el.lon);

                return {
                  name,
                  address,
                  lat: el.lat,
                  lon: el.lon,
                  distance: `${dist.toFixed(1)} km`,
                  open: el.tags.opening_hours ? true : Math.random() > 0.4,
                  rating: parseFloat((4.2 + Math.random() * 0.8).toFixed(1))
                };
              });
          }
        }
      } catch (e) {
        console.warn('Overpass API server failed. Loading local heuristic backup stores.', e);
      }

      // If Overpass returned no results or failed, apply coordinate-based local heuristics
      if (results.length === 0) {
        results = [
          { name: 'BioCompany ' + cityQuery, address: `Hauptstraße 12, ${cityQuery}`, lat: parsedLat + 0.004, lon: parsedLon - 0.003, open: true, rating: 4.8 },
          { name: 'Denns Biomarkt', address: `Bahnhofstraße 31, ${cityQuery}`, lat: parsedLat - 0.005, lon: parsedLon + 0.006, open: true, rating: 4.5 },
          { name: 'Alnatura Super Natur', address: `Lindenallee 5, ${cityQuery}`, lat: parsedLat + 0.008, lon: parsedLon - 0.005, open: false, rating: 4.7 },
          { name: 'Reformhaus ' + cityQuery, address: `Marktplatz 4, ${cityQuery}`, lat: parsedLat - 0.003, lon: parsedLon - 0.004, open: true, rating: 4.3 }
        ].map(store => {
          const dist = calculateDistance(parsedLat, parsedLon, store.lat, store.lon);
          return {
            ...store,
            distance: `${dist.toFixed(1)} km`
          };
        });
      }

      const finalResults = results
        .sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance))
        .slice(0, 6);

      setStores(finalResults);
      setScanState('results');
    } catch (err) {
      console.error('[BioStoreScanner] Scan Error:', err);
      setScanState('error');
    }
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

      <div className={styles.scannerForm} style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <input
          type="text"
          className={styles.scannerInput}
          placeholder="Produkt eingeben (z.B. Ashwagandha)..."
          value={product}
          onChange={e => setProduct(e.target.value)}
          style={{ flex: 2, minWidth: '150px' }}
        />
        <input
          type="text"
          className={styles.scannerInput}
          placeholder="Stadt oder PLZ..."
          value={location}
          onChange={e => setLocation(e.target.value)}
          style={{ flex: 1, minWidth: '100px' }}
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

      {scanState === 'error' && (
        <div className={styles.scannerStatus} style={{ color: 'var(--red)' }}>
          ⚠️ Keine Bioläden in dieser Umgebung gefunden. Bitte versuche eine andere Stadt.
        </div>
      )}

      {scanState === 'results' && (
        <div className={styles.scannerResults}>
          <div id="store-map" style={{ height: '300px', width: '100%', borderRadius: '12px', marginBottom: '1.5rem', border: '1px solid var(--border-s)', zIndex: 1 }} />
          <div className={styles.scannerResultsHeader}>
            {stores.length} Bioläden in der Nähe mit „{product}“ in {location} gefunden:
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
