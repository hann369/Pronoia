'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import styles from './page.module.css';

export default function HomePage() {
  const [isLoading, setIsLoading] = useState(true);
  const [fadeLoader, setFadeLoader] = useState(false);
  const loaderVideoRef = useRef(null);

  useEffect(() => {
    // When loader video ends
    const video = loaderVideoRef.current;
    if (video) {
      video.onended = () => {
        setFadeLoader(true);
        setTimeout(() => {
          setIsLoading(false);
        }, 1000); // Wait for fade out transition
      };
    }
    
    // Fallback if video fails to play or doesn't have an ended event
    const fallbackTimer = setTimeout(() => {
      setFadeLoader(true);
      setTimeout(() => setIsLoading(false), 1000);
    }, 4500); // Video is ~4 seconds

    return () => clearTimeout(fallbackTimer);
  }, []);

  return (
    <>
      {isLoading && (
        <div 
          id="loader" 
          style={{
            position: 'fixed',
            inset: 0,
            background: '#fff',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: fadeLoader ? 0 : 1,
            transition: 'opacity 1s ease',
            pointerEvents: fadeLoader ? 'none' : 'all'
          }}
        >
          <video 
            ref={loaderVideoRef}
            autoPlay 
            muted 
            playsInline
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          >
            <source src="/graphic assets/Pronoia Loading Screen.mp4" type="video/mp4" />
          </video>
        </div>
      )}

      {/* ═══ HERO SECTION ═══ */}
      <section id="hero-new" style={{ position: 'relative', width: '100%', height: '100vh', overflow: 'hidden', backgroundColor: 'var(--bg)' }}>
        <div className="hero-video-box" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
          <video 
            autoPlay 
            muted 
            loop 
            playsInline 
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.65, zIndex: 0 }}
          >
            <source src="/graphic assets/From KlickPin CF Pin by My Brain on LOVELY _ Nature aesthetic Beautiful view video nature Beautiful scenery nature - Pin-65443000831729610.mp4" type="video/mp4" />
          </video>
          
          <div className="hero-content-center" style={{ position: 'relative', zIndex: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', textAlign: 'center', padding: '0 2rem' }}>
            <span className="ed-label" style={{ color: 'var(--text)', opacity: 0.8, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '1.5rem', display: 'block', fontWeight: 600 }}>
              Human Optimization System
            </span>
            <h1 className="hero-h1-10x" style={{ fontSize: 'clamp(3.5rem, 8vw, 6rem)', lineHeight: 1.1, margin: '0', fontFamily: 'var(--font-display)', color: 'var(--text)' }}>
              <span className="h-line" style={{ display: 'block' }}>Silent.</span>
              <span className="h-line" style={{ display: 'block' }}>Superior.</span>
              <span className="h-line" style={{ display: 'block', color: 'var(--tan)' }}>Pronoia.</span>
            </h1>
            <p className="hero-p-10x" style={{ fontSize: '1.25rem', opacity: 0.8, maxWidth: '600px', margin: '2rem auto', color: 'var(--text)' }}>
              An integrated system for biological and cognitive upgrade.
            </p>
            <div className="hero-btn-group" style={{ display: 'flex', gap: '1rem', marginTop: '1rem', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' }}>
              <Link href="/auth" className="btn-10x btn-10x-solid" style={{ padding: '1rem 2.5rem', background: 'var(--tan)', color: 'var(--bg)', textDecoration: 'none', borderRadius: '50px', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.15em', fontWeight: 700, transition: 'all 0.3s' }}>
                Begin Assessment
              </Link>
              <Link href="/life-os" className="btn-10x btn-10x-outline" style={{ padding: '1rem 2.5rem', border: '1px solid var(--border-strong)', color: 'var(--text)', textDecoration: 'none', borderRadius: '50px', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.15em', fontWeight: 700, transition: 'all 0.3s', backdropFilter: 'blur(10px)' }}>
                Explore Life OS
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ BIOMETRIC TELEMETRY TICKER ═══ */}
      <TickerTape direction="left" items={TELEMETRY_ITEMS} />

      {/* ═══ TRUST BAR (CHEMICAL TRANSPARENCY) ═══ */}
      <TrustBar />

      {/* ═══ PARADIGM SHIFT (FRICTION VS. SYSTEM) ═══ */}
      <ParadigmShift />

      {/* ═══ THE 6 SPECIALIZED AGENTS GRID ═══ */}
      <AgentCoreGrid />

      {/* ═══ SOCIAL PROOF TICKER ═══ */}
      <TickerTape direction="right" items={SOCIAL_PROOF_ITEMS} accent />

      {/* ═══ THE 5 PILLARS ECOSYSTEM GRID ═══ */}
      <EcosystemGrid />

      {/* ═══ STAGE DIAGNOSIS QUIZ ═══ */}
      <DiagnosisQuiz />

      {/* ═══ EVOLUTION STAGES ═══ */}
      <StagesSection />

      {/* ═══ AUTO-REPLENISHMENT VISUALIZER ═══ */}
      <ReplenishmentVisualizer />

      {/* ═══ FREQUENTLY ASKED QUESTIONS ═══ */}
      <FaqSection />

      {/* ═══ MANIFESTO & FOOTER ═══ */}
      <ManifestoAndFooter />
    </>
  );
}

/* ═══════════════════════════════════════════════════════
   TICKER DATA
   ═══════════════════════════════════════════════════════ */

const TELEMETRY_ITEMS = [
  { label: 'VO₂ MAX', value: '54.1', delta: '+1.3', status: 'OPTIMAL' },
  { label: 'CORTISOL', value: '12 MG/DL', status: 'NOMINAL' },
  { label: 'HRV', value: '82MS', delta: '+4.2%', status: 'OPTIMAL' },
  { label: 'DEEP SLEEP', value: '2H 24M', status: 'OPTIMAL' },
  { label: 'GLUCOSE', value: '92 MG/DL', status: 'STABLE' },
  { label: 'COGNITIVE LOAD', value: '34%', status: 'AVAILABLE' },
  { label: 'PURITY INDEX', value: '99.8%', status: 'VERIFIED' },
  { label: 'BATCH', value: '#001', status: 'ACTIVE' },
];

const SOCIAL_PROOF_ITEMS = [
  { label: 'USER #104', value: '+12%', status: 'DEEP WORK FOCUS' },
  { label: 'USER #082', value: '-14%', status: 'CORTISOL REDUCTION' },
  { label: 'USER #219', value: '+18MS', status: 'HRV IMPROVEMENT' },
  { label: 'USER #055', value: '+22%', status: 'DEEP SLEEP' },
  { label: 'USER #174', value: '94%', status: 'BIOMARKER COMPLIANCE' },
  { label: 'USER #311', value: '-8 BPM', status: 'RESTING HEART RATE' },
  { label: 'USER #067', value: '+31%', status: 'FOCUS DURATION' },
  { label: 'USER #198', value: '7 WEEKS', status: 'PROTOCOL ADHERENCE' },
];

/* ═══════════════════════════════════════════════════════
   SUB-COMPONENTS (Page Assembly)
   ═══════════════════════════════════════════════════════ */

function TickerTape({ direction = 'left', items = [], accent = false }) {
  // Duplicate items for seamless loop
  const repeated = [...items, ...items, ...items];
  const animClass = direction === 'left' ? styles.tickerLeft : styles.tickerRight;

  return (
    <div className={`${styles.tickerWrap} ${accent ? styles.tickerWrapAccent : ''}`}>
      <div className={`${styles.tickerTrack} ${animClass}`}>
        {repeated.map((item, i) => (
          <span key={i} className={styles.tickerItem}>
            <span className={styles.tickerLabel}>{item.label}</span>
            <span className={`${styles.tickerValue} ${accent ? styles.tickerValueAccent : ''}`}>{item.value}</span>
            {item.delta && <span className={styles.tickerDelta}>{item.delta}</span>}
            <span className={styles.tickerStatus}>{item.status}</span>
            <span className={styles.tickerSep}>/</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function ParadigmShift() {
  return (
    <section className={styles.paradigmSection}>
      <div className={styles.paradigmGrid}>
        <div className={styles.columnFriction}>
          <span className="label-mono" style={{ color: 'var(--red)', marginBottom: '1.5rem', display: 'block' }}>The Antagonist</span>
          <h2 className={styles.paradigmTitle}>The <em>Friction</em></h2>
          <div className={styles.contrastList}>
            <div className={styles.contrastItem}>
              <span className={styles.contrastNum}>01</span>
              <div className={styles.contrastContent}>
                <h3>Dashboard Paralysis</h3>
                <p>Noisy streaks, gamified scores, and attention-seeking push notifications. A system that sells dependency instead of self-mastery.</p>
              </div>
            </div>
            <div className={styles.contrastItem}>
              <span className={styles.contrastNum}>02</span>
              <div className={styles.contrastContent}>
                <h3>Proprietary Blends</h3>
                <p>Supplement formulations with hidden dosages, massive marketing markups, and unverified raw materials sourced from the grey market.</p>
              </div>
            </div>
            <div className={styles.contrastItem}>
              <span className={styles.contrastNum}>03</span>
              <div className={styles.contrastContent}>
                <h3>Environmental Toxicity</h3>
                <p>Synthetic clothing, disruptors in soaps, and poor light exposure cycles that quietly sap your baseline performance.</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className={styles.columnSystem}>
          <span className="label-mono" style={{ color: 'var(--green)', marginBottom: '1.5rem', display: 'block' }}>The Solution</span>
          <h2 className={styles.paradigmTitle}>The <em>System</em></h2>
          <div className={styles.contrastList}>
            <div className={styles.contrastItem}>
              <span className={styles.contrastNum}>01</span>
              <div className={styles.contrastContent}>
                <h3>Subtractive Routines</h3>
                <p>No streaks, no badges. A silent protocol runner showing only the next 3 actions based on circadian phase and bio-cognitive load.</p>
              </div>
            </div>
            <div className={styles.contrastItem}>
              <span className={styles.contrastNum}>02</span>
              <div className={styles.contrastContent}>
                <h3>CoA Transparency</h3>
                <p>Full ingredient disclosure, certified laboratory analysis published for each batch, and formulations aligned with clinical evidence.</p>
              </div>
            </div>
            <div className={styles.contrastItem}>
              <span className={styles.contrastNum}>03</span>
              <div className={styles.contrastContent}>
                <h3>Physical Integrity</h3>
                <p>Dermal detox protocols, organic textile sync, and zirkadian light regulation to establish a clean foundation for focus.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══ 6 AGENTS GRID ═══════════════════════════════════ */
const AGENTS = [
  {
    id: 'A.01',
    title: 'Neuro-Cognitive',
    subtitle: 'FLOW ARCHITECT',
    desc: 'Monitors EEG-derived focus indices and gates incoming notifications to protect deep work windows.',
  },
  {
    id: 'A.02',
    title: 'Metabolic Director',
    subtitle: 'FUEL SCHEDULER',
    desc: 'Tracks glucose variability and insulin sensitivity, recommending meal composition and timing in real time.',
  },
  {
    id: 'A.03',
    title: 'Circadian Guardian',
    subtitle: 'LIGHT & TEMPERATURE',
    desc: 'Choreographs lux exposure, ambient temperature, and sleep onset to preserve architectural sleep stages.',
  },
  {
    id: 'A.04',
    title: 'Recovery Conductor',
    subtitle: 'LOAD BALANCER',
    desc: 'Calibrates training intensity against HRV, sleep debt, and inflammatory markers to prevent overshoot.',
  },
  {
    id: 'A.05',
    title: 'Behavioral Anchor',
    subtitle: 'HABIT ENFORCER',
    desc: 'Nudges, contracts, and friction adjustments that translate intent into compounding daily behavior.',
  },
  {
    id: 'A.06',
    title: 'Orchestrator',
    subtitle: 'META-AGENT',
    desc: 'Resolves conflicts between specialized agents and surfaces a single coherent protocol for the day.',
  },
];

function AgentCoreGrid() {
  return (
    <section className={styles.agentsSection}>
      <div className="container">
        <div className={styles.agentsHeader}>
          <span className="label-mono" style={{ color: 'var(--cobalt-bright)', marginBottom: '1rem', display: 'block' }}>System Intelligence</span>
          <h2 className={styles.agentsTitle}>Six Agents. One Protocol.</h2>
          <p className={styles.agentsSub}>
            Each agent operates autonomously, feeding a single coherent daily queue. No dashboards, no noise — just the next optimal action.
          </p>
        </div>
        <div className={styles.agentsGrid}>
          {AGENTS.map(agent => (
            <div key={agent.id} className={styles.agentCard}>
              <div className={styles.agentCardTop}>
                <span className={styles.agentId}>{agent.id}</span>
                <span className={styles.agentStatus}>
                  <span className={styles.agentDot} />
                  ACTIVE
                </span>
              </div>
              <h3 className={styles.agentTitle}>{agent.title}</h3>
              <p className={styles.agentSubtitle}>{agent.subtitle}</p>
              <p className={styles.agentDesc}>{agent.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function EcosystemGrid() {
  const [coords, setCoords] = useState({});

  const handleMouseMove = (id, e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setCoords(prev => ({
      ...prev,
      [id]: { x: `${x}px`, y: `${y}px` }
    }));
  };

  const pillars = [
    { id: 'life-os', label: 'Life OS', icon: '⏳', desc: 'Das Herzstück des Systems. Steuert deine täglichen bio-kognitiven Blöcke, deinen Kalender und das Skill Lab. Inkl. eingebettetem Knowledge Vault.', path: '/life-os' },
    { id: 'labs', label: 'Pronoia Labs', icon: '🧪', desc: 'Die Neurochemie-Einheit. PX-V1 Nootropika-Specs, Reinheitsberichte und offene Zertifikate für jede Charge.', path: '/labs' },
    { id: 'bio-synthetics', label: 'Bio-Synthetics', icon: '🌿', desc: 'Bio-Adaptive Fuel und Functional Gear. Biologische Integrität durch kuratierte Mahlzeiten, nootropische Refills und organische Textilien.', path: '/bio-synthetics' },
    { id: 'store', label: 'Pronoia Store', icon: '💳', desc: 'Wähle dein Abo-Modell: Free, Premium oder Max. Automatische Produkt-Lieferungen je nach Stufe inklusive.', path: '/store' }
  ];

  return (
    <section className={styles.ecosystemSection}>
      <div className={styles.ecosystemHeader}>
        <span className="label-mono" style={{ color: 'var(--tan)', marginBottom: '1rem', display: 'block' }}>Platform Core</span>
        <h2 className={styles.ecosystemTitle}>Integrated Performance</h2>
        <p className={styles.ecosystemSub}>Five pillars operating as a unified system to align biological telemetry and cognitive execution.</p>
      </div>
      <div className={styles.ecosystemGrid}>
        {pillars.map(p => {
          const cardCoord = coords[p.id] || { x: '50%', y: '50%' };
          return (
            <Link
              href={p.path}
              key={p.id}
              className={styles.ecoCard}
              onMouseMove={(e) => handleMouseMove(p.id, e)}
              style={{
                '--mx': cardCoord.x,
                '--my': cardCoord.y
              }}
            >
              <div className={styles.ecoIcon}>{p.icon}</div>
              <h3 className={styles.ecoLabel}>{p.label}</h3>
              <p className={styles.ecoDesc}>{p.desc}</p>
              <span className={styles.ecoArrow}>Access Pillar _</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function ReplenishmentVisualizer() {
  const [supply, setSupply] = useState(100);
  const [isAutoShipping, setIsAutoShipping] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setSupply(prev => {
        if (prev <= 1) {
          setIsAutoShipping(false);
          return 100; // Reset automatically or stay at 0
        }
        const next = prev - 1;
        if (next === 15) {
          setIsAutoShipping(true);
        }
        return next;
      });
    }, 150); // fast simulation for visual impact

    return () => clearInterval(interval);
  }, []);

  const handleRefill = () => {
    setSupply(100);
    setIsAutoShipping(false);
  };

  const isCritical = supply <= 30;

  return (
    <section className={styles.replenishSection}>
      <div className={styles.replenishGrid}>
        <div className={styles.replenishVisual}>
          <div className={styles.visualHeader}>
            <span className={styles.visualTitle}>STACK SUPPLY RADAR</span>
            <span className={`${styles.stackStatus} ${isCritical ? styles.statusCritical : styles.statusNormal}`}>
              {isCritical ? 'Supply Low' : 'Supply OK'}
            </span>
          </div>
          <div className={styles.replenishWidget}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className={styles.widgetLabel}>PX-V1 Nootropic Matrix</span>
              <button 
                onClick={handleRefill} 
                style={{ 
                  background: 'transparent', 
                  border: '1px solid var(--border-strong)', 
                  color: 'var(--text)', 
                  padding: '0.35rem 0.8rem', 
                  borderRadius: '100px', 
                  fontSize: '0.6rem', 
                  fontFamily: 'var(--font-mono)', 
                  cursor: 'pointer' 
                }}
              >
                REFILL STACK
              </button>
            </div>
            <div className={styles.widgetProgressContainer}>
              <div
                className={styles.widgetProgressFill}
                style={{
                  width: `${supply}%`,
                  backgroundColor: supply <= 15 ? 'var(--red)' : supply <= 30 ? 'var(--amber)' : 'var(--green)'
                }}
              />
            </div>
            <div className={styles.widgetDetails}>
              <span>Supply Level: {supply}%</span>
              <span>{supply <= 7 ? 'Critical Threshold reached' : `${Math.ceil(supply / 3.3)} Days remaining`}</span>
            </div>
          </div>

          {supply <= 15 ? (
            <div className={`${styles.replenishAlert} ${styles.alertCritical}`}>
              <span className={styles.alertIcon}>⚡</span>
              <div>
                <strong>[Auto-Ship Triggered]</strong>
                <p style={{ marginTop: '0.2rem', opacity: 0.8 }}>Stripe Webhook received. Authorized payment for Batch #002. Shipping label generated automatically.</p>
              </div>
            </div>
          ) : (
            <div className={`${styles.replenishAlert} ${styles.alertNormal}`}>
              <span className={styles.alertIcon}>✓</span>
              <div>
                <strong>Stack Safe</strong>
                <p style={{ marginTop: '0.2rem', opacity: 0.8 }}>No action required. The system is tracking your protocol usage. Invoicing will trigger when levels hit 15%.</p>
              </div>
            </div>
          )}
        </div>

        <div>
          <span className="label-mono" style={{ color: 'var(--tan)', marginBottom: '1.5rem', display: 'block' }}>Zero Friction Logistics</span>
          <h2 className={styles.replenishHeadline}>Your stack knows when it's running low.</h2>
          <p className={styles.replenishText}>
            Pronoia links stack metrics to protocol timers. When your PX-V1 supplies reach the critical 7-day reserve mark, the system automatically triggers replenishment through Stripe invoicing. No checkout screens, no checkout carts, no decision fatigue.
          </p>
          <Link href="/auth" className="btn btn-dark btn-lg">
            Initialize Protocol Auto-Ship
          </Link>
        </div>
      </div>
    </section>
  );
}

function ManifestoAndFooter() {
  return (
    <>
      <section className={styles.manifestoSection}>
        <div className={styles.manifestoInner}>
          <blockquote className={styles.manifestoQuote}>
            "Die meisten Menschen scheitern nicht an Talent. Sie scheitern an Friction. Wir bauen das System, das <em>Friction entfernt</em>. Der Rest bist du."
          </blockquote>
          <div className={styles.manifestoBtnGroup}>
            <Link href="/auth" className="btn btn-primary btn-lg">Begin System Assessment</Link>
            <Link href="/life-os" className="btn btn-ghost btn-lg" style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.2)' }}>Launch Life OS</Link>
          </div>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerLinks}>
          <Link href="/life-os">Life OS</Link>
          <Link href="/labs">Pronoia Labs</Link>
          <Link href="/bio-synthetics">Bio-Synthetics</Link>
          <Link href="/store">Store</Link>
        </div>
        <div className={styles.footerCopy}>
          &copy; 2026 PRONOIA SYSTEM. BATCH #001 COMPLIANCE REGULATION. ALL RIGHTS RESERVED.
        </div>
      </footer>
    </>
  );
}

function TrustBar() {
  return (
    <div className={styles.trustBar}>
      <div className={styles.trustInner}>
        <div className={styles.trustMetric}>
          <span className={styles.metricValue}>99.85%</span>
          <span className={styles.metricLabel}>VERIFIED PURITY (HPLC)</span>
        </div>
        <div className={styles.trustMetric}>
          <span className={styles.metricValue}>&lt; 0.05 PPM</span>
          <span className={styles.metricLabel}>HEAVY METALS (ICP-MS)</span>
        </div>
        <div className={styles.trustMetric}>
          <span className={styles.metricValue}>GC-MS ND</span>
          <span className={styles.metricLabel}>RESIDUAL SOLVENTS</span>
        </div>
        <div className={styles.trustMetric}>
          <span className={styles.metricValue}>#PX-2026-B01</span>
          <span className={styles.metricLabel}>BATCH TRACEABILITY</span>
        </div>
      </div>
    </div>
  );
}

function DiagnosisQuiz() {
  const [currentStep, setCurrentStep] = useState(0); // 0: intro, 1-5: questions, 6: result
  const [scores, setScores] = useState([]);
  const [systemLogs, setSystemLogs] = useState(['> INITIALIZING NEURAL AUDIT...']);

  const questions = [
    {
      pillar: 'HEALTH',
      q: 'Wie stark kontrollierst du deine unmittelbare physische Umgebung (Luftfilterung, gefiltertes Wasser, EMF-Abschirmung)?',
      options: [
        { text: 'Gar nicht – Standard-Leitungswasser und ungefilterte Stadtluft.', score: 0 },
        { text: 'Teilweise – Ich filtere mein Trinkwasser und lüfte regelmäßig.', score: 1 },
        { text: 'Systematisch – 3-Stufen-Luftfilterung, strukturiertes Aktivkohle-Wasser, EMF-Schutz im Schlafbereich.', score: 2 }
      ]
    },
    {
      pillar: 'FITNESS',
      q: 'Wie steuerst du deine körperliche Leistungsfähigkeit und Regeneration?',
      options: [
        { text: 'Reaktiv – Gelegentliches Training nach Gefühl ohne strukturierte Erfassung.', score: 0 },
        { text: 'Strukturiert – Regelmäßiges Training (3-4x/Woche) mit einfacher Pulsmessung.', score: 1 },
        { text: 'Präzise – HRV-gesteuertes Training, Laktat-Messungen, CNS-Stimulation.', score: 2 }
      ]
    },
    {
      pillar: 'FOCUS',
      q: 'Wie schützt und unterstützt du deine kognitiven Deep Work Fenster?',
      options: [
        { text: 'Reaktiv – Ständige Ablenkungen, paralleler Medienkonsum, unregelmäßiger Fokus.', score: 0 },
        { text: 'Manuell – Stummschalten des Telefons, Pomodoro-Timer bei Bedarf.', score: 1 },
        { text: 'Algorithmisch – Zirkadian getaktete Blöcke, systemweite Notification-Sperre, neurochemische Unterstützung (PX-V1).', score: 2 }
      ]
    },
    {
      pillar: 'SOCIAL',
      q: 'Nach welchen Kriterien bewertest und sortierst du dein soziales Umfeld?',
      options: [
        { text: 'Zufällig – Kontakte basieren auf räumlicher Nähe oder historischer Gewohnheit.', score: 0 },
        { text: 'Selektiv – Ich distanziere mich bewusst von offensichtlich negativen Einflüssen.', score: 1 },
        { text: 'Synergetisch – Kuratiertes Umfeld mit komplementären Zielen und wöchentlichem kognitiven Austausch.', score: 2 }
      ]
    },
    {
      pillar: 'SKILLS',
      q: 'Wie verankerst du neues Wissen oder komplexe Fähigkeiten in deinem Gedächtnis?',
      options: [
        { text: 'Passiv – Lesen von Büchern, Hören von Podcasts, Konsumieren von Tutorials.', score: 0 },
        { text: 'Aktiv – Notizen schreiben, Zusammenfassungen erstellen, Mind-Mapping.', score: 1 },
        { text: 'Myelinisierend – Deliberate Practice, Active Recall, praktische Hard-Coding Phasen unter Zeitdruck.', score: 2 }
      ]
    }
  ];

  const addLog = (msg) => {
    setSystemLogs(prev => [...prev, msg].slice(-4));
  };

  const handleAnswer = (score) => {
    const nextScores = [...scores, score];
    setScores(nextScores);
    
    if (currentStep < 5) {
      addLog(`> PILLAR_${questions[currentStep - 1]?.pillar || 'INIT'}_AUDITED: SCORE_${score}`);
      setCurrentStep(prev => prev + 1);
    } else {
      addLog(`> PILLAR_SKILLS_AUDITED: SCORE_${score}`);
      addLog(`> COMPUTING SYSTEM STAGE RANK...`);
      setCurrentStep(6);
    }
  };

  const getResult = () => {
    const total = scores.reduce((a, b) => a + b, 0);
    if (total <= 2) {
      return {
        stage: '00',
        name: 'BLIND',
        desc: 'Du bist reaktiv und den unkontrollierten Einflüssen deines Umfelds ausgesetzt. Kognitiver und biologischer Standard-Zustand.',
        tip: 'Fokus auf Grundlagen: Filtere dein Trinkwasser, etabliere feste Schlafenszeiten und führe erste bildschirmfreie Arbeitsblöcke ein.'
      };
    } else if (total <= 5) {
      return {
        stage: '01',
        name: 'AWARE',
        desc: 'Du erkennst kognitive Friction und biologische Blockaden, hast jedoch noch kein stabiles Regelkreis-System implementiert.',
        tip: 'Strukturiere deine Arbeitsblöcke mit festen Timern. Beginne mit einem einfachen Bio-Stack und logge deine HRV.'
      };
    } else if (total <= 7) {
      return {
        stage: '02',
        name: 'BUILDING',
        desc: 'Du wendest zirkadiane Taktungen an und trackst deine Biomarker. Das System läuft stabil, ist bei hohem Stress aber noch fragil.',
        tip: 'Optimiere deinen Bio-Stack mit reinsten Substanzen (HPLC-verifiziert). Schließe Lücken im zirkadianen Rhythmus.'
      };
    } else if (total <= 9) {
      return {
        stage: '03',
        name: 'COMPOUNDING',
        desc: 'Deine Systeme greifen synergetisch ineinander. Kognitive Kapazität und körperliche Regeneration verstärken sich exponentiell.',
        tip: 'Automatisiere deine Abläufe. Nutze den Knowledge Vault als RAG-Kontext zur automatisierten Protokoll-Generierung.'
      };
    } else {
      return {
        stage: '04',
        name: 'TEACHING (MASTER)',
        desc: 'Vollkommene biologische und kognitive Integration. Du beherrschst das System vollständig und optimierst es adaptiv.',
        tip: 'Teile deine custom Blocksets und Bio-Synthetics Konfigurationen mit dem Netzwerk. Führe Audits für andere durch.'
      };
    }
  };

  const restartQuiz = () => {
    setScores([]);
    setCurrentStep(0);
    setSystemLogs(['> INITIALIZING NEURAL AUDIT...']);
  };

  const currentQuestion = questions[currentStep - 1];

  return (
    <section id="diagnosis" className={styles.diagSection}>
      <div className="container">
        <span className="label-mono" style={{ color: 'var(--tan)', marginBottom: '1rem', display: 'block' }}>System Initialization</span>
        <h2 className={styles.diagSectionTitle}>Identification & Strategy</h2>

        <div className={styles.diagGrid}>
          <div className={styles.diagQuizBox}>
            {currentStep === 0 ? (
              <div className={styles.quizStart}>
                <p className={styles.quizIntroText}>
                  Wir beginnen mit einer ehrlichen Kartierung deines Ist-Zustands über die 5 Pronoia-Säulen. 
                  Das System ermittelt deine aktuelle Mastery-Stufe (Stage 00 – 04) und liefert dir konkrete Handlungsempfehlungen.
                </p>
                <button className={`${styles.diagBtn} ${styles.diagBtnSolid}`} onClick={() => { setCurrentStep(1); addLog('> AUDIT_STARTED: STANDBY...'); }}>
                  AUDIT INITIALISIEREN
                </button>
              </div>
            ) : currentStep <= 5 ? (
              <div className={styles.quizQuestion}>
                <div className={styles.quizProgress}>
                  <span>SÄULE {currentStep} / 5</span>
                  <div className={styles.quizProgressBarBg}>
                    <div className={styles.quizProgressBarFill} style={{ width: `${(currentStep / 5) * 100}%` }}></div>
                  </div>
                </div>
                <h3 className={styles.quizQuestionTitle}>{currentQuestion.q}</h3>
                <div className={styles.quizOptionsGrid}>
                  {currentQuestion.options.map((opt, i) => (
                    <button key={i} className={styles.quizOptionBtn} onClick={() => handleAnswer(opt.score)}>
                      {opt.text}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className={styles.quizResult}>
                <span className={styles.resultStageLabel}>ERGEBNIS: STAGE {getResult().stage}</span>
                <h3 className={styles.resultStageName}>{getResult().name}</h3>
                <p className={styles.resultDesc}>{getResult().desc}</p>
                <div className={styles.resultTipBox}>
                  <strong>STRATEGISCHER SCHRITT:</strong>
                  <p>{getResult().tip}</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', flexWrap: 'wrap' }}>
                  <Link href="/auth" className={`${styles.diagBtn} ${styles.diagBtnSolid}`}>
                    SYSTEM ZUGANG BEANTRAGEN
                  </Link>
                  <button className={`${styles.diagBtn} ${styles.diagBtnOutline}`} onClick={restartQuiz}>
                    NEUSTART
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className={styles.diagScannerCol}>
            <div className={styles.scannerWrapper}>
              <div className={styles.scannerLine} style={{ animationPlayState: currentStep > 0 && currentStep <= 5 ? 'running' : 'paused' }} />
              <div className={styles.scannerContent}>
                <div className={styles.logList}>
                  {systemLogs.map((log, idx) => (
                    <div key={idx} className={styles.logLine}>{log}</div>
                  ))}
                </div>
                <div className={styles.pulseIndicator}>
                  <div className={styles.pulseRing}></div>
                  <div className={styles.pulseDot}></div>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--tan)' }}>BIOMETRIC SYNC RATE: {80 + (scores.length * 3.5)}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const STAGES_DATA = [
  { id: '00', name: 'Blind', desc: 'Du weißt nicht, was du nicht weißt. Der reaktive Zustand der Masse.' },
  { id: '01', name: 'Aware', desc: 'Du siehst die kognitive Friction, kennst das System aber noch nicht.' },
  { id: '02', name: 'Building', desc: 'Du implementierst erste Protokolle. Das System läuft, ist aber fragil.' },
  { id: '03', name: 'Compounding', desc: 'Synergien entstehen. Kognitive Kapazität wächst exponentiell.' },
  { id: '04', name: 'Teaching', desc: 'Vollkommene Systembeherrschung. Biologische Integration abgeschlossen.' }
];

function StagesSection() {
  return (
    <section id="stages" className={styles.stagesSection}>
      <div className="container">
        <span className="label-mono" style={{ color: 'var(--tan)', marginBottom: '1rem', display: 'block' }}>Die Evolution</span>
        <h2 className={styles.stagesTitle}>Die 5 Stufen der <em>Meisterschaft.</em></h2>
        <div className={styles.stagesGrid}>
          {STAGES_DATA.map((stage) => (
            <div key={stage.id} className={styles.stageCard}>
              <span className={styles.stageNum}>STAGE {stage.id}</span>
              <h3 className={styles.stageName}>{stage.name}</h3>
              <p className={styles.stageDesc}>{stage.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const FAQ_DATA = [
  { q: 'Warum "Pronoia"?', a: 'Das Gegenteil von Paranoia. Die radikale Annahme, dass das Universum darauf ausgelegt ist, dir zu helfen. Nicht durch Esoterik, sondern durch anwendbare Biologie und Physik.' },
  { q: 'Was ist PX-V1 konkret?', a: 'Eine präzise formulierte Neuro-Supplementation: Creatin, Taurin, Glycin, Magnesiumglycinat, Bromantane. Keine proprietären Blends, keine versteckten Dosierungen. Alles transparent dokumentiert.' },
  { q: 'Ist Pronoia ein Supplement-Brand?', a: 'Nein. PX-V1 ist ein Element des Systems. Pronoia ist das System selbst — fünf Säulen, die ineinandergreifen. Supplements sind Verstärker von Grundlagen, keine Abkürzungen.' },
  { q: 'Wo liegt der Unterschied zu anderen Plattformen?', a: 'Wir verkaufen keine Motivation. Kein Hype, keine 30-Tage-Challenges. Pronoia ist ein System für Menschen, die verstehen, dass Kompetenz durch Struktur entsteht — nicht durch Inspiration.' },
  { q: 'Wie erhalte ich Zugang?', a: 'Der Zugang zum Pronoia-System ist limitiert. Er beginnt mit der Identifikation deines Ist-Zustands über den Diagnose-Audit. Qualität erfordert Selektion.' }
];

function FaqSection() {
  const [openIdx, setOpenIdx] = useState(null);

  const toggleOpen = (idx) => {
    setOpenIdx(prev => (prev === idx ? null : idx));
  };

  return (
    <section id="faq" className={styles.faqSection}>
      <div className="container" style={{ maxWidth: '800px', margin: '0 auto' }}>
        <span className="label-mono" style={{ color: 'var(--tan)', marginBottom: '1rem', display: 'block', textAlign: 'center' }}>Häufige Fragen</span>
        <h2 className={styles.faqTitle} style={{ textAlign: 'center' }}>Fragen zur <em>Pronoia.</em></h2>
        <div className={styles.faqList}>
          {FAQ_DATA.map((item, idx) => {
            const isOpen = openIdx === idx;
            return (
              <div key={idx} className={`${styles.faqItem} ${isOpen ? styles.faqItemOpen : ''}`}>
                <button className={styles.faqQuestionBtn} onClick={() => toggleOpen(idx)}>
                  <span>{item.q}</span>
                  <span className={styles.faqArrow}>{isOpen ? '↑' : '↓'}</span>
                </button>
                <div className={styles.faqAnswer} style={{ maxHeight: isOpen ? '200px' : '0' }}>
                  <div className={styles.faqAnswerContent}>{item.a}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
