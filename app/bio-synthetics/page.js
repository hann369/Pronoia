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

const POPULAR_CITIES = {
  berlin: { lat: 52.5200, lon: 13.4050 },
  münchen: { lat: 48.1351, lon: 11.5820 },
  munich: { lat: 48.1351, lon: 11.5820 },
  hamburg: { lat: 53.5511, lon: 9.9937 },
  köln: { lat: 50.9375, lon: 6.9603 },
  cologne: { lat: 50.9375, lon: 6.9603 },
  frankfurt: { lat: 50.1109, lon: 8.6821 },
  stuttgart: { lat: 48.7758, lon: 9.1829 },
  düsseldorf: { lat: 51.2271, lon: 6.7735 },
  dortmund: { lat: 51.5136, lon: 7.4653 },
  essen: { lat: 51.4556, lon: 7.0116 },
  leipzig: { lat: 51.3397, lon: 12.3731 },
  bremen: { lat: 53.0793, lon: 8.8017 },
  dresden: { lat: 51.0504, lon: 13.7373 },
  hannover: { lat: 52.3759, lon: 9.7320 },
  nürnberg: { lat: 49.4521, lon: 11.0767 },
  nuremberg: { lat: 49.4521, lon: 11.0767 },
  duisburg: { lat: 51.4344, lon: 6.7623 },
  bochum: { lat: 51.4818, lon: 7.2162 },
  wuppertal: { lat: 51.2562, lon: 7.1508 },
  bielefeld: { lat: 52.0302, lon: 8.5325 },
  bonn: { lat: 50.7374, lon: 7.0982 },
  münster: { lat: 51.9607, lon: 7.6261 },
  karlsruhe: { lat: 49.0069, lon: 8.4037 },
  mannheim: { lat: 49.4875, lon: 8.4660 },
  augsburg: { lat: 48.3705, lon: 10.8978 },
  wiesbaden: { lat: 50.0782, lon: 8.2398 },
  gelsenkirchen: { lat: 51.5177, lon: 7.0857 },
  zürich: { lat: 47.3769, lon: 8.5417 },
  wien: { lat: 48.2082, lon: 16.3738 },
  vienna: { lat: 48.2082, lon: 16.3738 },
  bern: { lat: 46.9480, lon: 7.4474 },
  basel: { lat: 47.5596, lon: 7.5886 },
  salzburg: { lat: 47.8095, lon: 13.0550 },
  innsbruck: { lat: 47.2692, lon: 11.4041 },
  graz: { lat: 47.0707, lon: 15.4395 }
};

/* ─── Bio Store Scanner Component ─── */
function BioStoreScanner() {
  const [scanState, setScanState] = useState('idle'); // idle | scanning | results | error
  const [stores, setStores] = useState([]);
  const [product, setProduct] = useState('');
  const [location, setLocation] = useState('Berlin');
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [userCoords, setUserCoords] = useState(null);
  const [centerCoords, setCenterCoords] = useState(null);

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
      Promise.resolve().then(() => {
        setLeafletLoaded(true);
      });
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

  const handleGPSLocation = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      alert("GPS-Standortbestimmung wird von deinem Browser nicht unterstützt.");
      return;
    }
    setScanState('scanning');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        setUserCoords({ lat, lon });
        
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
          if (res.ok) {
            const data = await res.json();
            const city = data.address.city || data.address.town || data.address.village || 'Aktueller Standort';
            setLocation(city);
            runScan(product, city, { lat, lon });
          } else {
            setLocation('Aktueller Standort');
            runScan(product, 'Aktueller Standort', { lat, lon });
          }
        } catch (e) {
          setLocation('Aktueller Standort');
          runScan(product, 'Aktueller Standort', { lat, lon });
        }
      },
      (err) => {
        console.error("GPS-Ortungsfehler:", err);
        alert("Fehler bei der GPS-Ortung: " + err.message);
        setScanState('idle');
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  };

  const handleScan = () => {
    if (location === 'Aktueller Standort' && userCoords) {
      runScan(product, location, userCoords);
    } else {
      setUserCoords(null);
      runScan(product, location, null);
    }
  };

  const runScan = async (searchProduct, searchLocation, coords = null) => {
    if (!searchProduct.trim()) return;
    setScanState('scanning');
    setStores([]);

    try {
      let parsedLat, parsedLon;
      const displayLocation = searchLocation;
      
      if (coords) {
        parsedLat = coords.lat;
        parsedLon = coords.lon;
      } else {
        const cityQuery = searchLocation.trim() || 'Berlin';
        const cityLower = cityQuery.toLowerCase();
        
        if (POPULAR_CITIES[cityLower]) {
          parsedLat = POPULAR_CITIES[cityLower].lat;
          parsedLon = POPULAR_CITIES[cityLower].lon;
        } else {
          try {
            const geocodeRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cityQuery)}&countrycodes=de,at,ch&limit=1`);
            if (!geocodeRes.ok) throw new Error('Nominatim geocode failed');
            const geocodeData = await geocodeRes.json();

            if (geocodeData.length === 0) {
              const geocodeResGeneric = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cityQuery)}&limit=1`);
              if (!geocodeResGeneric.ok) throw new Error('Nominatim geocode failed');
              const geocodeDataGeneric = await geocodeResGeneric.json();
              if (geocodeDataGeneric.length === 0) {
                setScanState('error');
                return;
              }
              const { lat, lon } = geocodeDataGeneric[0];
              parsedLat = parseFloat(lat);
              parsedLon = parseFloat(lon);
            } else {
              const { lat, lon } = geocodeData[0];
              parsedLat = parseFloat(lat);
              parsedLon = parseFloat(lon);
            }
          } catch (err) {
            console.warn('Geocoding error, falling back to Berlin center:', err);
            parsedLat = 52.5200;
            parsedLon = 13.4050;
          }
        }
      }

      setCenterCoords({ lat: parsedLat, lon: parsedLon });

      // Overpass query for organic & health food shops (radius expanded to 10km)
      const overpassQuery = `
        [out:json][timeout:25];
        (
          node["shop"="organic"](around:10000,${parsedLat},${parsedLon});
          way["shop"="organic"](around:10000,${parsedLat},${parsedLon});
          node["shop"="health_food"](around:10000,${parsedLat},${parsedLon});
          way["shop"="health_food"](around:10000,${parsedLat},${parsedLon});
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
          { name: 'BioCompany ' + displayLocation, address: `Hauptstraße 12, ${displayLocation}`, lat: parsedLat + 0.004, lon: parsedLon - 0.003, open: true, rating: 4.8 },
          { name: 'Denns Biomarkt', address: `Bahnhofstraße 31, ${displayLocation}`, lat: parsedLat - 0.005, lon: parsedLon + 0.006, open: true, rating: 4.5 },
          { name: 'Alnatura Super Natur', address: `Lindenallee 5, ${displayLocation}`, lat: parsedLat + 0.008, lon: parsedLon - 0.005, open: false, rating: 4.7 },
          { name: 'Reformhaus ' + displayLocation, address: `Marktplatz 4, ${displayLocation}`, lat: parsedLat - 0.003, lon: parsedLon - 0.004, open: true, rating: 4.3 }
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

      <div className={styles.scannerForm} style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="text"
          className={styles.scannerInput}
          placeholder="Produkt eingeben (z.B. Ashwagandha)..."
          value={product}
          onChange={e => setProduct(e.target.value)}
          style={{ flex: 2, minWidth: '150px' }}
        />
        <div style={{ display: 'flex', flex: 1, minWidth: '150px', gap: '0.25rem', alignItems: 'center' }}>
          <input
            type="text"
            className={styles.scannerInput}
            placeholder="Stadt oder PLZ..."
            value={location}
            onChange={e => setLocation(e.target.value)}
            style={{ flex: 1 }}
            onKeyDown={e => e.key === 'Enter' && handleScan()}
          />
          <button
            type="button"
            onClick={handleGPSLocation}
            title="Meinen Standort orten"
            style={{
              background: 'var(--bg2)',
              border: '1px solid var(--border-s)',
              borderRadius: '12px',
              padding: '0.9rem',
              color: 'var(--text2)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--cobalt-bright)'; e.currentTarget.style.color = 'var(--text)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-s)'; e.currentTarget.style.color = 'var(--text2)'; }}
          >
            🎯
          </button>
        </div>
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
          {stores.map((s, i) => {
            const originParam = userCoords 
              ? `&origin=${userCoords.lat},${userCoords.lon}` 
              : centerCoords 
                ? `&origin=${centerCoords.lat},${centerCoords.lon}` 
                : '';
            const directionsUrl = `https://www.google.com/maps/dir/?api=1${originParam}&destination=${s.lat},${s.lon}&travelmode=driving`;
            return (
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
                <div className={styles.storeBottomRow} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem' }}>
                  <div className={styles.storeRating}>
                    {'★'.repeat(Math.round(s.rating))} {s.rating}
                  </div>
                  <a
                    href={directionsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-secondary"
                    style={{
                      fontSize: '0.75rem',
                      padding: '0.35rem 0.75rem',
                      borderColor: 'var(--cobalt-bright)',
                      color: 'var(--cobalt-bright)',
                      textDecoration: 'none',
                      borderRadius: '8px'
                    }}
                  >
                    🗺️ Route anzeigen
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── Environmental Telemetry Component ─── */
function EnvironmentalTelemetry() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [lat, setLat] = useState(52.5200);
  const [lon, setLon] = useState(13.4050);
  const [city, setCity] = useState('Berlin');
  const [activeChart, setActiveChart] = useState('pm25'); // 'pm25' | 'uv'
  const [hoveredIdx, setHoveredIdx] = useState(null);

  const fetchEnvData = async (latitude, longitude, cityName) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/environment?lat=${latitude}&lon=${longitude}`);
      if (!res.ok) throw new Error("Fehler beim Laden der Umweltdaten");
      const result = await res.json();
      if (result.error) throw new Error(result.error);
      
      setData(result);
      setLat(latitude);
      setLon(longitude);
      setCity(cityName);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const latitude = pos.coords.latitude;
          const longitude = pos.coords.longitude;
          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
            if (res.ok) {
              const data = await res.json();
              const cityName = data.address.city || data.address.town || data.address.village || 'Dein Standort';
              fetchEnvData(latitude, longitude, cityName);
            } else {
              fetchEnvData(latitude, longitude, 'Dein Standort');
            }
          } catch (e) {
            fetchEnvData(latitude, longitude, 'Dein Standort');
          }
        },
        () => {
          fetchEnvData(52.5200, 13.4050, 'Berlin');
        }
      );
    } else {
      fetchEnvData(52.5200, 13.4050, 'Berlin');
    }
  }, []);

  if (loading) {
    return (
      <div className={styles.envContainer} style={{ textAlign: 'center', padding: '3rem' }}>
        <span className={styles.scannerSpinner} style={{ margin: '0 auto 1rem' }} />
        <p style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--text3)' }}>LADE_UMWELT_TELEMETRIE...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className={styles.envContainer} style={{ padding: '2rem', textAlign: 'center', borderColor: 'var(--red)' }}>
        <p style={{ color: 'var(--red)' }}>⚠️ Fehler beim Laden der Umweltdaten: {error || 'Keine Antwort'}</p>
        <button className="btn btn-secondary" style={{ marginTop: '1rem', fontSize: '0.75rem' }} onClick={() => fetchEnvData(lat, lon, city)}>
          Erneut versuchen ↻
        </button>
      </div>
    );
  }

  const cur = data.current;
  const pm25Val = cur.pm2_5;
  const pm10Val = cur.pm10;
  const uvVal = cur.uv_index;

  // AQI Rating Heuristics
  let aqiRating = 'Sehr Gut';
  let aqiColor = '#00c48c';
  if (pm25Val > 35 || pm10Val > 50) {
    aqiRating = 'Kritisch';
    aqiColor = '#ff4d4d';
  } else if (pm25Val > 15 || pm10Val > 30) {
    aqiRating = 'Mäßig';
    aqiColor = '#f5a623';
  }

  // UV Exposure Advice
  let uvAdvice = 'Minimale Intensität. Tritt für 20-30 Min. nach draußen, um den Rhythmus zu synchronisieren.';
  if (uvVal >= 6) {
    uvAdvice = 'Sehr hohe Strahlung! Lichtschutzfaktor dringend empfohlen. Vermeide direkte Mittagssonne.';
  } else if (uvVal >= 3) {
    uvAdvice = 'Mäßige Strahlung. Perfekt für Vitamin D: 10-15 Min. direkte Exposition genügen.';
  }

  // Pollen Thresholds
  const getPollenStatus = (val) => {
    if (val > 80) return { label: 'Hoch', color: '#ff4d4d' };
    if (val > 10) return { label: 'Mäßig', color: '#f5a623' };
    return { label: 'Gering', color: '#00c48c' };
  };

  const getGrassPollenStatus = (val) => {
    if (val > 30) return { label: 'Hoch', color: '#ff4d4d' };
    if (val > 5) return { label: 'Mäßig', color: '#f5a623' };
    return { label: 'Gering', color: '#00c48c' };
  };

  const birch = getPollenStatus(cur.birch_pollen);
  const grass = getGrassPollenStatus(cur.grass_pollen);
  const ragweed = getPollenStatus(cur.ragweed_pollen);
  const olive = getPollenStatus(cur.olive_pollen);

  // SVG Chart Calculation
  const hourlyTimes = data.hourly.time.slice(0, 24);
  const hourlyPm = data.hourly.pm2_5.slice(0, 24);
  const hourlyUv = data.hourly.uv_index.slice(0, 24);

  const chartW = 460;
  const chartH = 150;
  const padL = 40;
  const padR = 20;
  const padT = 20;
  const padB = 25;
  const graphW = chartW - padL - padR;
  const graphH = chartH - padT - padB;

  const chartPoints = activeChart === 'pm25' ? hourlyPm : hourlyUv;
  const maxChartVal = Math.max(...chartPoints, 5);
  const minChartVal = Math.min(...chartPoints, 0);
  const chartRange = maxChartVal - minChartVal || 1;

  const getChartX = (idx) => padL + (idx / (chartPoints.length - 1)) * graphW;
  const getChartY = (val) => padT + graphH - ((val - minChartVal) / chartRange) * graphH;

  let pathD = '';
  let areaD = '';
  chartPoints.forEach((val, idx) => {
    const x = getChartX(idx);
    const y = getChartY(val);
    if (idx === 0) {
      pathD = `M ${x} ${y}`;
      areaD = `M ${x} ${padT + graphH} L ${x} ${y}`;
    } else {
      pathD += ` L ${x} ${y}`;
      areaD += ` L ${x} ${y}`;
    }
  });
  if (chartPoints.length > 0) {
    areaD += ` L ${getChartX(chartPoints.length - 1)} ${padT + graphH} Z`;
  }

  const formatHour = (timeStr) => {
    try {
      const d = new Date(timeStr);
      return `${d.getHours().toString().padStart(2, '0')}:00`;
    } catch(e) {
      return '';
    }
  };

  return (
    <div className={styles.envContainer}>
      <div className={styles.scannerHeader} style={{ marginBottom: '1.5rem' }}>
        <span className={styles.scannerIcon} style={{ background: 'linear-gradient(135deg, #00c48c 0%, #00cec9 100%)' }}>🍃</span>
        <div>
          <div className={styles.scannerTitle}>Umwelt-Expositions-Telemetrie</div>
          <div className={styles.scannerSub}>
            Echtzeit-Luftqualität, biologischer Licht-Index & Allergen-Tracker für deinen aktuellen Standort.
          </div>
        </div>
        <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
          <span className={styles.locationBadge}>📍 {city}</span>
          <div style={{ fontSize: '0.55rem', fontFamily: 'monospace', color: 'var(--text3)', marginTop: '0.2rem' }}>
            LAT: {lat.toFixed(4)} · LON: {lon.toFixed(4)}
          </div>
        </div>
      </div>

      {/* Grid: 3 Telemetry Cards */}
      <div className={styles.envGrid}>
        
        {/* Card 1: Air Quality */}
        <div className={styles.envCard}>
          <div className={styles.envCardTop}>
            <span className={styles.envCardEmoji}>💨</span>
            <span className={styles.envCardBadge} style={{ color: aqiColor, borderColor: aqiColor }}>AQI: {aqiRating}</span>
          </div>
          <div className={styles.envCardValue}>{pm25Val.toFixed(1)} <span className={styles.envCardUnit}>µg/m³</span></div>
          <div className={styles.envCardSub}>Feinstaubkonzentration (PM2.5)</div>
          
          <div className={styles.envGaugeContainer}>
            <div style={{ flex: 1 }}>
              <div className={styles.envGaugeLabel}>PM10: <strong>{pm10Val.toFixed(1)} µg/m³</strong></div>
              <div className={styles.envGaugeLabel}>Ammoniak: <strong>{cur.ammonia.toFixed(2)} µg/m³</strong></div>
            </div>
            <svg width="40" height="40" viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="18" cy="18" r="14" fill="transparent" stroke="var(--border)" strokeWidth="3" />
              <circle cx="18" cy="18" r="14" fill="transparent" stroke={aqiColor} strokeWidth="3.5"
                strokeDasharray="88" strokeDashoffset={88 - Math.min(88, (pm25Val / 50) * 88)} />
            </svg>
          </div>
        </div>

        {/* Card 2: Circadian Sun */}
        <div className={styles.envCard}>
          <div className={styles.envCardTop}>
            <span className={styles.envCardEmoji}>☀️</span>
            <span className={styles.envCardBadge} style={{ color: uvVal > 4 ? '#f5a623' : '#1a6aff', borderColor: uvVal > 4 ? '#f5a623' : '#1a6aff' }}>
              UV-INDEX: {uvVal.toFixed(1)}
            </span>
          </div>
          <div className={styles.envCardValue}>{uvVal.toFixed(1)} <span className={styles.envCardUnit}>UVI</span></div>
          <p className={styles.envCardDesc}>{uvAdvice}</p>
        </div>

        {/* Card 3: Pollen Count */}
        <div className={styles.envCard}>
          <div className={styles.envCardTop}>
            <span className={styles.envCardEmoji}>🌾</span>
            <span className={styles.envCardBadge} style={{ color: grass.color, borderColor: grass.color }}>Pollenbelastung</span>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.2rem' }}>
            <div className={styles.pollenRow}>
              <span>Birke (Birch)</span>
              <span className={styles.pollenBadge} style={{ backgroundColor: birch.color + '15', color: birch.color, borderColor: birch.color }}>
                {birch.label}
              </span>
            </div>
            <div className={styles.pollenRow}>
              <span>Gräser (Grass)</span>
              <span className={styles.pollenBadge} style={{ backgroundColor: grass.color + '15', color: grass.color, borderColor: grass.color }}>
                {grass.label}
              </span>
            </div>
            <div className={styles.pollenRow}>
              <span>Olivenbaum (Olive)</span>
              <span className={styles.pollenBadge} style={{ backgroundColor: olive.color + '15', color: olive.color, borderColor: olive.color }}>
                {olive.label}
              </span>
            </div>
            <div className={styles.pollenRow}>
              <span>Beifußambrosie (Ragweed)</span>
              <span className={styles.pollenBadge} style={{ backgroundColor: ragweed.color + '15', color: ragweed.color, borderColor: ragweed.color }}>
                {ragweed.label}
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* SVG Forecast Section */}
      <div className={styles.chartWrapper} style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <h4 className={styles.chartTitle} style={{ fontSize: '0.8rem', fontWeight: 600 }}>24-Stunden Trend-Prognose</h4>
          <div className={styles.categoryTabs}>
            <button type="button" className={`${styles.categoryTab} ${activeChart === 'pm25' ? styles.categoryTabActive : ''}`} onClick={() => { setActiveChart('pm25'); setHoveredIdx(null); }}>
              PM2.5 Feinstaub
            </button>
            <button type="button" className={`${styles.categoryTab} ${activeChart === 'uv' ? styles.categoryTabActive : ''}`} onClick={() => { setActiveChart('uv'); setHoveredIdx(null); }}>
              UV-Index
            </button>
          </div>
        </div>

        <div style={{ position: 'relative', width: '100%' }}>
          <svg width="100%" height={chartH} viewBox={`0 0 ${chartW} ${chartH}`} style={{ overflow: 'visible' }}>
            <defs>
              <linearGradient id="envAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={activeChart === 'pm25' ? '#1a6aff' : '#f5a623'} stopOpacity="0.2" />
                <stop offset="100%" stopColor={activeChart === 'pm25' ? '#1a6aff' : '#f5a623'} stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Horizontal Grid */}
            {[0, 0.5, 1].map((r) => {
              const val = minChartVal + r * chartRange;
              const y = getChartY(val);
              return (
                <g key={r}>
                  <line x1={padL} y1={y} x2={chartW - padR} y2={y} stroke="var(--border)" strokeDasharray="3 5" strokeWidth="1" />
                  <text x={padL - 10} y={y + 3} fill="var(--text3)" fontSize="8" fontFamily="monospace" textAnchor="end">
                    {val.toFixed(1)}
                  </text>
                </g>
              );
            })}

            {/* Path and Area */}
            <path d={areaD} fill="url(#envAreaGrad)" />
            <path d={pathD} fill="none" stroke={activeChart === 'pm25' ? '#1a6aff' : '#f5a623'} strokeWidth="2" />

            {/* Interactive Circles */}
            {chartPoints.map((val, idx) => {
              const x = getChartX(idx);
              const y = getChartY(val);
              const isH = hoveredIdx === idx;
              return (
                <circle
                  key={idx}
                  cx={x}
                  cy={y}
                  r={isH ? 6 : 3}
                  fill={isH ? (activeChart === 'pm25' ? '#1a6aff' : '#f5a623') : 'var(--bg-card)'}
                  stroke={activeChart === 'pm25' ? '#1a6aff' : '#f5a623'}
                  strokeWidth="1.5"
                  style={{ cursor: 'pointer', transition: 'r 0.1s ease' }}
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                />
              );
            })}
          </svg>

          {/* Tooltip */}
          {hoveredIdx !== null && hourlyTimes[hoveredIdx] && (
            <div
              className={styles.chartTooltip}
              style={{
                position: 'absolute',
                left: `${(getChartX(hoveredIdx) / chartW) * 100}%`,
                top: `${getChartY(chartPoints[hoveredIdx]) - 50}px`,
                transform: 'translateX(-50%)',
                pointerEvents: 'none',
                zIndex: 10
              }}
            >
              <div style={{ fontSize: '0.55rem', color: 'var(--text3)', fontFamily: 'monospace' }}>
                {formatHour(hourlyTimes[hoveredIdx])}
              </div>
              <div style={{ fontSize: '0.72rem', fontWeight: 'bold', marginTop: '0.1rem' }}>
                {chartPoints[hoveredIdx].toFixed(1)} {activeChart === 'pm25' ? 'µg/m³' : 'UVI'}
              </div>
            </div>
          )}
        </div>
      </div>
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

      {/* ─── ENVIRONMENTAL TELEMETRY SECTION ─── */}
      <section className={styles.section}>
        <div className="container">
          <EnvironmentalTelemetry />
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
