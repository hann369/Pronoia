'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import styles from './page.module.css';

const COMPOUNDS_BASE = [
  { id: 'C01', name: 'Creatin Monohydrat', doseBase: 3.0, maxDose: 6.0, unit: 'g', desc: 'Zelluläre ATP-Regeneration. Erhöht den zellulären Energie-Output während tiefen Fokus-Blöcken.' },
  { id: 'C02', name: 'Taurin', doseBase: 1.0, maxDose: 3.0, unit: 'g', desc: 'ZNS-Beruhigung. Moduliert GABA-Rezeptoren und verhindert Überreizung durch Koffein/Stimulation.' },
  { id: 'C03', name: 'Bromantane', doseBase: 25, maxDose: 75, unit: 'mg', desc: 'Dopamin-Synthese-Upregulation. Steigert die intrinsische Motivation und Ausdauer ohne adrenergen Crash.' },
  { id: 'C04', name: 'Magnesiumglycinat', doseBase: 200, maxDose: 500, unit: 'mg', desc: 'Senkung des Cortisolspiegels, Regulation der neuralen Erregung und Unterstützung der muskulären Entspannung.' }
];

const BATCHES = {
  '#001': { batchId: '#001', purity: '99.82%', spectrometry: 'COMPLETE', heavyMetals: 'UNDETECTED', status: 'VERIFIED', date: 'April 2026' },
  '#002': { batchId: '#002', purity: '99.78%', spectrometry: 'COMPLETE', heavyMetals: 'UNDETECTED', status: 'VERIFIED', date: 'Mai 2026' },
  '#003': { batchId: '#003', purity: '99.91%', spectrometry: 'COMPLETE', heavyMetals: 'UNDETECTED', status: 'VERIFIED', date: 'Juni 2026' }
};

export default function LabsPage() {
  const [expandedRow, setExpandedRow] = useState(null);

  // Synergy Calculator States
  const [cognitiveLoad, setCognitiveLoad] = useState(50);
  const [physicalStress, setPhysicalStress] = useState(30);
  const [sleepDeficit, setSleepDeficit] = useState(20);

  // Batch Check States
  const [batchSearch, setBatchSearch] = useState('#001');
  const [activeBatch, setActiveBatch] = useState(BATCHES['#001']);
  const [batchError, setBatchError] = useState('');

  const toggleRow = (id) => {
    setExpandedRow(prev => prev === id ? null : id);
  };

  // Calculate synergy dosages dynamically based on user parameters
  const calculatedDoses = useMemo(() => {
    const cogFactor = cognitiveLoad / 100;
    const physFactor = physicalStress / 100;
    const sleepFactor = sleepDeficit / 100;

    return {
      C01: (3.0 + cogFactor * 1.5 + physFactor * 1.5).toFixed(2), // Creatine (max 6.0g)
      C02: (1.0 + cogFactor * 1.5 + sleepFactor * 0.5).toFixed(2), // Taurine (max 3.0g)
      C03: Math.round(25 + cogFactor * 30 + physFactor * 20),      // Bromantane (max 75mg)
      C04: Math.round(200 + physFactor * 150 + sleepFactor * 150)  // Magnesium (max 500mg)
    };
  }, [cognitiveLoad, physicalStress, sleepDeficit]);

  const handleBatchSearch = (e) => {
    e.preventDefault();
    const query = batchSearch.trim();
    const formatted = query.startsWith('#') ? query : `#${query}`;
    
    if (BATCHES[formatted]) {
      setActiveBatch(BATCHES[formatted]);
      setBatchError('');
    } else {
      setBatchError(`Batch ${query} nicht im Verzeichnis gefunden.`);
    }
  };

  return (
    <>
      {/* Dynamic Ambient Background */}
      <div className="sky-background" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: -2, overflow: 'hidden', pointerEvents: 'none' }}>
        <div className="orb orb-1" style={{ position: 'absolute', width: '65vw', height: '65vw', borderRadius: '50%', filter: 'blur(120px)', opacity: 0.1, background: 'var(--tan)', top: '-10%', right: '-15%', animation: 'orb-float 22s infinite alternate' }}></div>
        <div className="orb orb-2" style={{ position: 'absolute', width: '55vw', height: '55vw', borderRadius: '50%', filter: 'blur(120px)', opacity: 0.12, background: 'var(--cobalt)', bottom: '-15%', left: '-10%', animation: 'orb-float 18s infinite alternate', animationDelay: '-6s' }}></div>
      </div>

      <div className={styles.container}>

        {/* ─── Hero Section ─── */}
        <section className={styles.heroSection}>
          <div className={styles.heroContent}>
            <h1 className={styles.heroTitle}>PX-V1<br/>Architecture</h1>
            <p className={styles.heroSubtitle}>
              Die bio-kognitive Matrix von Pronoia Labs. Eine synergetische Nootropika-Formel, entwickelt für kompromisslose mentale Klarheit und neuroplastische Anpassung.
            </p>
            <div className={styles.heroActions}>
              <Link href="/life-os" className={styles.btnPrimary}>
                Launch Life OS →
              </Link>
              <a href="#playground" className={styles.btnLink}>
                Synergy Matrix _
              </a>
            </div>
          </div>
          <div className={styles.heroImageContainer}>
            <img src="/graphic assets/px-v1.png" alt="Molecular Architecture" className={styles.heroImage} />
          </div>
        </section>

        {/* ─── Telemetry Statistics Row ─── */}
        <section className={styles.statsSection}>
          {[
            { label: 'Active Batch', value: '#003' },
            { label: 'Purity Index', value: '99.91%' },
            { label: 'Latency Shift', value: '-2.8ms' },
            { label: 'Formulation status', value: 'VERIFIED' }
          ].map(stat => (
            <div key={stat.label} className={styles.statCard}>
              <div className={styles.statLabel}>{stat.label}</div>
              <div className={styles.statValue}>{stat.value}</div>
            </div>
          ))}
        </section>

        {/* ─── Interactive Synergy & Batch Checker Playground ─── */}
        <section id="playground" className={styles.interactiveSection}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--cobalt-bright)', letterSpacing: '0.2em', textTransform: 'uppercase' }}>Adaptive Formulation Lab</span>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem', marginTop: '0.5rem', fontWeight: 400 }}>Interaktives Telemetrie-Center</h2>
          </div>

          <div className={styles.interactiveGrid}>
            
            {/* Compound Synergy Calculator */}
            <div className={styles.calcCard}>
              <div className={styles.calcHeader}>
                <h3>PX-V1 Synergy Calculator</h3>
                <p>Simuliere Dosierungsverhältnisse basierend auf kognitiven und physischen Parametern.</p>
              </div>

              <div className={styles.sliderGroup}>
                <div className={styles.sliderRow}>
                  <div className={styles.sliderLabel}>
                    <span>Kognitive Belastung</span>
                    <span>{cognitiveLoad}%</span>
                  </div>
                  <input type="range" className={styles.slider} min="0" max="100" value={cognitiveLoad} onChange={e => setCognitiveLoad(parseInt(e.target.value))} />
                </div>
                <div className={styles.sliderRow}>
                  <div className={styles.sliderLabel}>
                    <span>Physischer Stress</span>
                    <span>{physicalStress}%</span>
                  </div>
                  <input type="range" className={styles.slider} min="0" max="100" value={physicalStress} onChange={e => setPhysicalStress(parseInt(e.target.value))} />
                </div>
                <div className={styles.sliderRow}>
                  <div className={styles.sliderLabel}>
                    <span>Schlafdefizit</span>
                    <span>{sleepDeficit}%</span>
                  </div>
                  <input type="range" className={styles.slider} min="0" max="100" value={sleepDeficit} onChange={e => setSleepDeficit(parseInt(e.target.value))} />
                </div>
              </div>

              <div className={styles.compoundBreakdown}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'var(--text3)', letterSpacing: '0.1em', marginBottom: '0.5rem', fontWeight: 700, textTransform: 'uppercase' }}>Optimiertes Bio-Stack Verhältnis</div>
                {COMPOUNDS_BASE.map(comp => {
                  const dose = calculatedDoses[comp.id] || comp.doseBase;
                  const ratio = Math.min(100, (dose / comp.maxDose) * 100);
                  return (
                    <div key={comp.id} className={styles.compRow}>
                      <span className={styles.compName}>{comp.name}</span>
                      <div className={styles.compFill}>
                        <div className={styles.compFillBar} style={{ width: `${ratio}%` }} />
                      </div>
                      <span className={styles.compAmount}>{dose}{comp.unit}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Batch Spectrometry Checker */}
            <div className={styles.batchCard}>
              <div className={styles.batchHeader}>
                <h3>Spectrometry Batch Check</h3>
                <p>Verifiziere Reinheit und Authentizität deiner Charge direkt über das Laborregister.</p>
              </div>

              <form onSubmit={handleBatchSearch} className={styles.batchInputGroup}>
                <input 
                  type="text" 
                  className={styles.batchInput} 
                  placeholder="Chargencode eingeben (z.B. #003)" 
                  value={batchSearch} 
                  onChange={e => setBatchSearch(e.target.value)} 
                />
                <button type="submit" className={styles.batchBtn}>Prüfen</button>
              </form>

              {batchError ? (
                <div style={{ color: 'var(--red)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', padding: '0.5rem' }}>
                  ⚠ {batchError}
                </div>
              ) : (
                <div className={styles.batchResult}>
                  <div className={styles.reportRow}>
                    <span>Batch ID</span>
                    <span style={{ color: 'var(--tan)', fontWeight: 'bold' }}>{activeBatch.batchId}</span>
                  </div>
                  <div className={styles.reportRow}>
                    <span>Synthese-Datum</span>
                    <span>{activeBatch.date}</span>
                  </div>
                  <div className={styles.reportRow}>
                    <span>Spectrometry Check</span>
                    <span style={{ color: 'var(--green)' }}>{activeBatch.spectrometry}</span>
                  </div>
                  <div className={styles.reportRow}>
                    <span>Heavy Metals Check</span>
                    <span style={{ color: 'var(--green)' }}>{activeBatch.heavyMetals}</span>
                  </div>
                  <div className={styles.reportRow}>
                    <span>Purity Index</span>
                    <span style={{ color: 'var(--tan)' }}>{activeBatch.purity}</span>
                  </div>
                  <div style={{ textAlign: 'center', marginTop: '0.5rem' }}>
                    <span style={{ background: 'var(--green-dim)', border: '1px solid var(--green)', color: 'var(--green)', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.65rem', fontFamily: 'var(--font-mono)' }}>
                      STATUS: {activeBatch.status}
                    </span>
                  </div>
                </div>
              )}
            </div>

          </div>
        </section>

        {/* ─── Compound Accordion List ─── */}
        <section className={styles.matrixSection}>
          <div className={styles.sectionHeader}>
            <h2>Molecular Matrix</h2>
            <span>PX-V1_COMPOUND_LIST.JSON</span>
          </div>
          
          <div className={styles.matrixList}>
            {COMPOUNDS_BASE.map(comp => (
              <div 
                key={comp.id} 
                className={`${styles.matrixRow} ${expandedRow === comp.id ? styles.matrixRowActive : ''}`} 
                onClick={() => toggleRow(comp.id)}
              >
                <div className={styles.matrixRowHeader}>
                  <span className={styles.matrixId}>{comp.id}</span>
                  <span className={styles.matrixName}>{comp.name}</span>
                  <span className={styles.matrixDose}>{comp.maxDose}{comp.unit} Max</span>
                </div>
                <div className={styles.matrixDesc}>
                  {comp.desc}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ─── Lab Quality Verification Banner ─── */}
        <section className={styles.certSection}>
          <div className={styles.certContent}>
            <h2>Purity is a system standard.</h2>
            <p>
              Graumarkt-Intransparenz existiert bei uns nicht. Wir veröffentlichen die gaschromatographischen Analysen (GC-MS) für jede einzelne Charge im System. Was nicht zertifiziert ist, gelangt nicht in unsere Stacks.
            </p>
            <button onClick={() => alert('Zertifikatsregister vollständig verifiziert. Alle Dokumente sind im System archiviert.')}>
              View Certificates
            </button>
          </div>
          <div className={styles.certReport}>
            <span>&gt; SPECTROMETRY TELEMETRY REGISTER</span><br />
            &gt; SYSTEM STATE: COMPLETE<br />
            &gt; TOXINS & HEAVY METALS: UNDETECTED<br />
            &gt; AVERAGE PURITY INDEX: 99.84%<br /><br />
            <span style={{ background: 'var(--cobalt-bright)', color: '#fff', padding: '0.2rem 0.5rem', borderRadius: '3px', fontSize: '0.7rem' }}>
              TELEMETRY: VERIFIED
            </span>
          </div>
        </section>

      </div>
    </>
  );
}
