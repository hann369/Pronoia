'use client';

import { useState, useEffect, useRef, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useProtocol } from '@/hooks/useProtocol';
import TelemetryVisualizer from '@/components/TelemetryVisualizer';
import styles from './page.module.css';

import { collection, query, orderBy, getDocs, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';

/* ─── Constants ─── */
const AGENTS = [
  { id: 'A.01', name: 'Neuro-Cognitive', role: 'FLOW ARCHITECT' },
  { id: 'A.02', name: 'Metabolic Director', role: 'FUEL SCHEDULER' },
  { id: 'A.03', name: 'Circadian Guardian', role: 'LIGHT & TEMPERATURE' },
  { id: 'A.04', name: 'Recovery Conductor', role: 'LOAD BALANCER' },
  { id: 'A.05', name: 'Behavioral Anchor', role: 'HABIT ENFORCER' },
  { id: 'A.06', name: 'Orchestrator', role: 'META-AGENT' }
];
const WEEKDAYS = ['MO', 'DI', 'MI', 'DO', 'FR', 'SA', 'SO'];
const AVATAR_PRESETS = [
  { name: 'Cyber-Neophyte', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=200' },
  { name: 'Flow Master', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200' },
  { name: 'Circadian Guardian', url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200' },
  { name: 'Metabolic Sage', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200' }
];

const NAV_ITEMS = [
  { id: 'dashboard',  label: 'Dashboard' },
  { id: 'biometrics', label: 'Biometrie' },
  { id: 'skills',     label: 'Skill Lab' },
  { id: 'store',      label: 'Ecosystem' },
  { id: 'connectors', label: 'Konnektoren' },
  { id: 'vault',      label: 'Vault' },
  { id: 'agents',     label: 'Agenten' },
];

const renderNavIcon = (id, active) => {
  const color = active ? 'var(--cobalt-bright)' : 'var(--text3)';
  const strokeWidth = 2;
  
  switch (id) {
    case 'dashboard':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'stroke 0.3s ease' }}>
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      );
    case 'biometrics':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'stroke 0.3s ease' }}>
          <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
        </svg>
      );
    case 'skills':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'stroke 0.3s ease' }}>
          <path d="M10 2v6L4.2 18.5A2 2 0 0 0 6 21h12a2 2 0 0 0 1.8-2.5L14 8V2h-4z" />
          <path d="M6 16h12" />
        </svg>
      );
    case 'store':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'stroke 0.3s ease' }}>
          <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
          <line x1="3" y1="6" x2="21" y2="6" />
          <path d="M16 10a4 4 0 0 1-8 0" />
        </svg>
      );
    case 'connectors':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'stroke 0.3s ease' }}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      );
    case 'vault':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'stroke 0.3s ease' }}>
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      );
    case 'agents':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'stroke 0.3s ease' }}>
          <path d="M12 2a10 10 0 0 1 10 10v4a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-4A10 10 0 0 1 12 2z" />
          <path d="M12 18v3" />
          <path d="M8 21h8" />
          <circle cx="9" cy="11" r="1" />
          <circle cx="15" cy="11" r="1" />
        </svg>
      );
    default:
      return null;
  }
};

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
      { text: 'Max. 2 API-Konnektoren', available: true },
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
    accentColor: 'var(--theme-accent, var(--cobalt-bright))',
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

const STORE_PRODUCTS = {
  apparel: [
    { id: 'gots_tee', name: 'GOTS Organic Tee', price: 120, desc: '100% chemiefreie, zertifizierte Bio-Baumwolle. Schützt die Hautbarriere vor Disruptoren.', badge: 'TEXTIL', status: 'AUF LAGER', tags: ['Organic', 'Toxin-Free', 'SkinShield'] },
    { id: 'barefoot_shoes', name: 'Pronoia Barefoot Shoes', price: 290, desc: 'Maximiert sensorisches Feedback, weitet die Zehenbox und reaktiviert Fußmuskulatur.', badge: 'FOOTWEAR', status: 'BEGRENZT', tags: ['Ergonomic', 'Proprioception', 'Zero-Drop'] },
    { id: 'merino_blazer', name: 'Merino Wool Blazer', price: 350, desc: 'Klimaregulierend, geruchsneutral und frei von synthetischen PFAS-Beschichtungen.', badge: 'APPAREL', status: 'AUF LAGER', tags: ['Merino', 'Thermoregulation', 'PFAS-Free'] },
    { id: 'grounding_sandals', name: 'Grounding Sandals', price: 180, desc: 'Sohle mit Kupfer-Plug zur elektrischen Erdung mit der Erdoberfläche.', badge: 'BIO-HACK', status: 'AUF LAGER', tags: ['Grounding', 'Bio-Electric', 'Earthing'] }
  ],
  supplements: [
    { id: 'mg_threonate', name: 'Magnesium-L-Threonat', price: 80, desc: 'Passiert die Blut-Hirn-Schranke zur Maximierung kognitiver Synapsen-Dichte.', badge: 'NOOTROPIC', status: 'AUTO-REFILL', tags: ['BBB-Crossing', 'Synapse-Density', 'Sleep'] },
    { id: 'alpha_gpc', name: 'Alpha-GPC Matrix', price: 90, desc: 'Direkter Cholin-Spender. Verbessert die Signalübertragung im Gehirn.', badge: 'FOCUS-FUEL', status: 'AUTO-REFILL', tags: ['Choline-Donor', 'Acetylcholine', 'Signal-Speed'] },
    { id: 'px_v1', name: 'PX-V1 Nootropic Core', price: 150, desc: 'Nootropisches Master-Substrat zur Steigerung von Fokus und Ausdauer.', badge: 'CORE-STACK', status: 'VERFÜGBAR', tags: ['Master-Formula', 'High-Stamina', 'Focus'] },
    { id: 'bromantane', name: 'Bromantane Formel', price: 120, desc: 'Fördert die Dopamin-Resynthese nachhaltig ohne Rezeptoren-Downregulation.', badge: 'DOPAMIN', status: 'VERFÜGBAR', tags: ['Dopamine-Synthesizer', 'Non-Depleting', 'Mood'] }
  ],
  food: [
    { id: 'microgreens', name: 'Frische Bio-Microgreens', price: 60, desc: 'Lebende Sprossen mit der 40-fachen Nährstoffdichte von ausgewachsenem Gemüse.', badge: 'SUPERFOOD', status: 'VERFÜGBAR', tags: ['Soil-to-Table', '40x-Density', 'Vitamins'] },
    { id: 'adaptogen_powder', name: 'Raw Adaptogen Complex', price: 90, desc: 'Mischung aus Cordyceps & Lion\'s Mane Extrakten zur Stressregulation.', badge: 'ADAPTOGEN', status: 'AUF LAGER', tags: ['Cordyceps', 'Lions-Mane', 'Stress-Control'] },
    { id: 'cacao_nibs', name: 'Rohe Kakao Nibs (Bio)', price: 50, desc: 'Mineralstoff-Bombe reich an Magnesium und zellschützenden Polyphenolen.', badge: 'ANTIOXIDANT', status: 'AUF LAGER', tags: ['Raw-Cacao', 'Polyphenols', 'Magnesium'] }
  ]
};


/* ─── Gate Screen ─── */
function GateScreen({ reason }) {
  const isAuth = reason === 'auth';
  const searchParams = useSearchParams();
  const tgId = searchParams.get('tg_id');
  const authUrl = tgId ? `/auth?tg_id=${tgId}` : '/auth';

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'radial-gradient(circle at 50% 40%, rgba(26,106,255,0.06) 0%, #030408 60%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--font-body)', color: 'var(--text)', padding: '2rem'
    }}>
      <div style={{
        background: 'rgba(15,18,26,0.95)', border: '1px solid rgba(26,106,255,0.2)',
        borderRadius: '20px', padding: '3rem 3.5rem', maxWidth: '480px', width: '100%',
        textAlign: 'center', backdropFilter: 'blur(20px)',
        boxShadow: '0 30px 60px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.04)'
      }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '1.25rem' }}>{isAuth ? '🔐' : '⚡'}</div>
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: '0.55rem', fontWeight: 700,
          color: 'var(--cobalt-bright)', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '1rem'
        }}>ZUGRIFF VERWEIGERT</div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 400, marginBottom: '1rem', lineHeight: 1.2 }}>
          Anmeldung erforderlich
        </h2>
        <p style={{ fontSize: '0.9rem', color: 'var(--text2)', lineHeight: 1.7, marginBottom: '2rem' }}>
          Melde dich an, um das Life OS System zu starten.
        </p>
        <Link href={authUrl} style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          background: 'var(--cobalt)', color: '#fff', border: '1px solid var(--cobalt-bright)',
          borderRadius: '8px', padding: '0.9rem 2rem', fontSize: '0.85rem', fontWeight: 600,
          textDecoration: 'none', width: '100%'
        }}>
          Jetzt anmelden →
        </Link>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════ */
function LifeOSDashboard() {
  const { user, loading: authLoading } = useAuth();
  const {
    blocks, blockIdx, timeLeft, totalTime, isRunning,
    circadianMode, setCircadianMode, overrideActiveBlockDuration,
    profile, profileLoading, stack, frictionLogs, dataSources, agentMsg, isTyping, directives,
    calendar, selectedDate, currentMonth, formatDate, selectDate, prevMonth, nextMonth,
    addCalendarBlock, editCalendarBlock, deleteCalendarBlock,
    generateDayAI, generateMonthAI, chatWithDayAI, syncToActive,
    generateSkillMaterials, completeSkillSession,
    toggleTimer, nextBlock, prevBlock, skipBlock, handleCommand, setAgentMsg,
    consumeStackItem, addStackItem, removeStackItem, updateStackItem,
    saveProfile, linkTelegramId, logFriction, loadProtocolQueue, addCustomBlock, uploadDataSource,
    manualPeekIdx, setManualPeekIdx, pendingQueueOverride, setPendingQueueOverride, confirmQueueOverride, restoreCalendarBlocks
  } = useProtocol();

  // Drag/Swipe gestures states on Chronometer
  const [dragStartX, setDragStartX] = useState(null);
  const [dragCurrentX, setDragCurrentX] = useState(null);

  const handleDragStart = (x, e = null) => {
    if (e && e.type === 'mousedown') {
      e.preventDefault(); // Prevents selection and ghost-dragging of SVG
    }
    setDragStartX(x);
    setDragCurrentX(x);
  };

  const handleDragMove = (x) => {
    if (dragStartX !== null) {
      setDragCurrentX(x);
    }
  };

  const handleDragEnd = () => {
    if (dragStartX === null || dragCurrentX === null) return;
    const diff = dragCurrentX - dragStartX;
    const threshold = 60;
    if (diff > threshold) {
      prevBlock();
    } else if (diff < -threshold) {
      skipBlock();
    }
    setDragStartX(null);
    setDragCurrentX(null);
  };

  // Global window listeners for drag gestures to allow dragging outside circle boundary
  useEffect(() => {
    if (dragStartX === null) return;

    const handleGlobalMouseMove = (e) => {
      handleDragMove(e.clientX);
    };

    const handleGlobalMouseUp = () => {
      handleDragEnd();
    };

    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [dragStartX, dragCurrentX]);

  // Time manual edit states
  const [showTimeEdit, setShowTimeEdit] = useState(false);
  const [editTimeMinutes, setEditTimeMinutes] = useState('');

  const handleTimeEditSubmit = (e) => {
    e.preventDefault();
    const mins = parseInt(editTimeMinutes);
    if (!isNaN(mins) && mins > 0) {
      overrideActiveBlockDuration(mins);
    }
    setShowTimeEdit(false);
  };

  /* ─── Access Gate ─── */
  const [gateState, setGateState] = useState('loading');
  const searchParams = useSearchParams();
  const [linkNotification, setLinkNotification] = useState(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setGateState('auth'); return; }
    setGateState('ok');
  }, [authLoading, user]);

  useEffect(() => {
    const tgId = searchParams.get('tg_id');
    if (tgId && user && !profileLoading && profile) {
      const parsedId = parseInt(tgId);
      if (profile.telegramId !== parsedId) {
        linkTelegramId(parsedId, user).then((success) => {
          if (success) {
            setLinkNotification("Telegram-Konto erfolgreich verknüpft! ⊕");
          } else {
            setLinkNotification("Verknüpfungs-Fehler! Siehe Alert.");
          }
        });
        // Remove query param from URL
        const newUrl = window.location.pathname;
        window.history.replaceState({ path: newUrl }, '', newUrl);
      }
    }
  }, [searchParams, user, profile, profileLoading, linkTelegramId]);

  /* ─── Tab Navigation ─── */
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const [portalTab, setPortalTab] = useState('subscriptions'); // 'subscriptions' | 'store'

  /* ─── Live Clock ─── */
  const [liveTime, setLiveTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setLiveTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  /* ─── Core State ─── */
  const [messages, setMessages] = useState([
    { role: 'agent', text: 'System-Performance aktiv. Bereit für kognitives Laden.' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [customDuration, setCustomDuration] = useState('30');
  const [newGoalText, setNewGoalText] = useState('');
  const [editHrv, setEditHrv] = useState('');
  const [editSleep, setEditSleep] = useState('');

  /* ─── Ecosystem Shop State ─── */
  const [activeInvoice, setActiveInvoice] = useState(null);

  /* ─── Modals ─── */
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [skillContent, setSkillContent] = useState('');
  const [isGeneratingSkill, setIsGeneratingSkill] = useState(false);
  const [dayChatInput, setDayChatInput] = useState('');

  /* ─── Interactive Skill Lab State ─── */
  const [activeModuleId, setActiveModuleId] = useState(null);
  const [skillNotes, setSkillNotes] = useState({});
  const [completedSteps, setCompletedSteps] = useState({});
  const [watchedVideos, setWatchedVideos] = useState({});

  /* ─── Tutorial ─── */
  const [tutorialStep, setTutorialStep] = useState(0);

  /* ─── Vault ─── */
  const [vaultItems, setVaultItems] = useState([]);
  const [vaultLoading, setVaultLoading] = useState(true);
  const [vaultFilterTag, setVaultFilterTag] = useState('all');
  const [vaultForm, setVaultForm] = useState({ type: 'note', title: '', content: '', tags: '' });
  const [vaultSaving, setVaultSaving] = useState(false);
  const [vaultToast, setVaultToast] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const chatEndRef = useRef(null);
  
  // Connectors Terminal Logs
  const [terminalLogs, setTerminalLogs] = useState([
    '[SYS] Pronoia Connector Engine v1.0.0 is ready.',
    '[SYS] Listening for local wearable and Notion webhook updates...'
  ]);
  const [isSyncingWhoop, setIsSyncingWhoop] = useState(false);
  const [isExportingNotion, setIsExportingNotion] = useState(false);

  const handleWhoopSync = async () => {
    if (isSyncingWhoop) return;
    setIsSyncingWhoop(true);
    setTerminalLogs(prev => [...prev, `[WHOOP] Initiating connection handshake...`]);
    setTimeout(() => {
      setTerminalLogs(prev => [...prev, `[WHOOP] Handshake SUCCESS. Authorized via OAuth2.`]);
    }, 600);
    setTimeout(() => {
      setTerminalLogs(prev => [...prev, `[WHOOP] Querying /v2/activity/sleep and /v2/recovery...`]);
    }, 1200);
    setTimeout(() => {
      const mockHrv = Math.round(70 + Math.random() * 22);
      const mockSleep = Math.round(76 + Math.random() * 20);
      setTerminalLogs(prev => [...prev, `[WHOOP] Received metrics: HRV=${mockHrv}ms Sleep=${mockSleep}%`]);
      setTerminalLogs(prev => [...prev, `[SYS] Syncing biometric telemetry index...`]);
      saveProfile({ metrics: { hrv: mockHrv, sleep: mockSleep } });
      setIsSyncingWhoop(false);
    }, 2000);
  };

  const handleNotionExport = async () => {
    if (isExportingNotion) return;
    setIsExportingNotion(true);
    setTerminalLogs(prev => [...prev, `[NOTION] Opening integration page context...`]);
    setTimeout(() => {
      setTerminalLogs(prev => [...prev, `[NOTION] Finding database matching 'Pronoia Daily Protocols'...`]);
    }, 600);
    setTimeout(() => {
      setTerminalLogs(prev => [...prev, `[NOTION] Appending page for date: ${formatDate(new Date())}`]);
    }, 1200);
    setTimeout(() => {
      setTerminalLogs(prev => [
        ...prev,
        `[NOTION] Successfully synced ${blocks.length} blocks to daily table.`,
        `[SYS] Export successfully completed!`
      ]);
      setIsExportingNotion(false);
    }, 2000);
  };

  /* ─── Ecosystem Shop Checkout & Stripe WebSocket client ─── */
  const handleOrderProduct = (product) => {
    const orderId = `PRN-OS-${Math.floor(100000 + Math.random() * 900000)}`;
    setActiveInvoice({
      item: product.name,
      cost: product.price,
      date: new Date().toLocaleDateString('de-DE'),
      orderId
    });
    setAgentMsg(`Bestellung für ${product.name} erfasst. Zirkadianer Supply-Chain-Sync aktiv.`);

    // Supplement restocking
    let matchName = product.name.toLowerCase();
    let restocked = false;

    stack.forEach((item, idx) => {
      let itemLower = item.name.toLowerCase();
      if (matchName.includes(itemLower) || itemLower.includes(matchName) ||
          (matchName.includes("magnesium") && itemLower.includes("mg-threonate")) ||
          (matchName.includes("mg-threonat") && itemLower.includes("mg-threonate")) ||
          (matchName.includes("gpc") && itemLower.includes("gpc")) ||
          (matchName.includes("px-v1") && itemLower.includes("oxiracetam"))
      ) {
        updateStackItem(idx, 'supply', 100);
        restocked = true;
      }
    });

    if (restocked) {
      setAgentMsg(`Bio-Stack restocked! Vorrat für ${product.name} auf 100% angehoben.`);
    }
  };



  // Customizer dynamic accent and UI Mode effect
  useEffect(() => {
    if (!profile?.customization) return;
    const { accent, mode } = profile.customization;
    
    // Set UI Mode
    document.documentElement.setAttribute('data-ui-mode', mode || 'serious');
    
    // Map accents
    const ACCENTS = {
      blue: { accent: '#1A6AFF', dark: '#0047AB', dim: 'rgba(26, 106, 255, 0.12)', glow: 'rgba(26, 106, 255, 0.18)' },
      green: { accent: '#00C48C', dark: '#00855A', dim: 'rgba(0, 196, 140, 0.12)', glow: 'rgba(0, 196, 140, 0.18)' },
      tan: { accent: '#d5b893', dark: '#8A6E4D', dim: 'rgba(213, 184, 147, 0.12)', glow: 'rgba(213, 184, 147, 0.18)' },
      amber: { accent: '#F5A623', dark: '#A06000', dim: 'rgba(245, 166, 35, 0.12)', glow: 'rgba(245, 166, 35, 0.18)' },
      red: { accent: '#FF4D4D', dark: '#B30000', dim: 'rgba(255, 77, 77, 0.12)', glow: 'rgba(255, 77, 77, 0.18)' },
      pink: { accent: '#FF33A8', dark: '#B30071', dim: 'rgba(255, 51, 168, 0.12)', glow: 'rgba(255, 51, 168, 0.18)' }
    };
    
    const sel = ACCENTS[accent] || ACCENTS.blue;
    document.documentElement.style.setProperty('--theme-accent', sel.accent);
    document.documentElement.style.setProperty('--theme-accent-dark', sel.dark);
    document.documentElement.style.setProperty('--theme-accent-dim', sel.dim);
    document.documentElement.style.setProperty('--theme-accent-glow', sel.glow);
  }, [profile?.customization]);

  /* ─── Effects ─── */
  useEffect(() => {
    if (profile?.metrics) {
      setEditHrv(profile.metrics.hrv?.toString() || '72');
      setEditSleep(profile.metrics.sleep?.toString() || '84');
    }
  }, [profile]);

  useEffect(() => {
    if (agentMsg) {
      setMessages(prev => {
        if (prev[prev.length - 1]?.text === agentMsg) return prev;
        return [...prev, { role: 'agent', text: agentMsg }];
      });
    }
  }, [agentMsg]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollTop = chatEndRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  useEffect(() => {
    if (profile && profile.hasCompletedTutorial === false && tutorialStep === 0) {
      const t = setTimeout(() => setTutorialStep(1), 1200);
      return () => clearTimeout(t);
    }
  }, [profile, tutorialStep]);

  // Auto-open UI tabs during onboarding tour
  useEffect(() => {
    if (tutorialStep === 0) return;
    switch (tutorialStep) {
      case 1:
        setActiveTab('dashboard');
        setShowCalendarModal(false);
        break;
      case 2:
        setShowCalendarModal(true);
        break;
      case 3:
        setActiveTab('biometrics');
        setShowCalendarModal(false);
        break;
      case 4:
      case 5:
        setActiveTab('dashboard');
        setShowCalendarModal(false);
        break;
      case 6:
        setActiveTab('biometrics'); // Bio-Stack is now inside the biometrics tab
        setShowCalendarModal(false);
        break;
      case 7:
        setActiveTab('agents');
        setShowCalendarModal(false);
        break;
      default:
        break;
    }
  }, [tutorialStep]);

  /* ─── Vault CRUD ─── */
  const handleVaultFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    setUploadProgress(0);

    const fileName = `${Date.now()}_${file.name}`;
    
    if (storage) {
      try {
        const fileRef = ref(storage, `vault/${user?.uid || 'shared'}/${fileName}`);
        const uploadTask = uploadBytesResumable(fileRef, file);

        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            setUploadProgress(Math.round(progress));
          },
          (error) => {
            console.error("Upload error:", error);
            triggerVaultToast("Upload fehlgeschlagen: " + error.message);
            setUploadingFile(false);
          },
          async () => {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            setVaultForm(f => ({
              ...f,
              title: f.title ? f.title : file.name,
              content: downloadURL
            }));
            triggerVaultToast("Datei erfolgreich hochgeladen.");
            setUploadingFile(false);
          }
        );
      } catch (err) {
        console.error("Upload error:", err);
        triggerVaultToast("Upload-Fehler: " + err.message);
        setUploadingFile(false);
      }
    } else {
      // Fallback/mock upload simulator if storage is null (e.g. build time or missing credentials)
      let currentProgress = 0;
      const interval = setInterval(() => {
        currentProgress += 10;
        setUploadProgress(currentProgress);
        if (currentProgress >= 100) {
          clearInterval(interval);
          const simulatedURL = `https://firebasestorage.googleapis.com/v0/b/mock-bucket/o/vault%2F${user?.uid || 'shared'}%2F${fileName}?alt=media`;
          setVaultForm(f => ({
            ...f,
            title: f.title ? f.title : file.name,
            content: simulatedURL
          }));
          triggerVaultToast("Datei hochgeladen (Simuliert).");
          setUploadingFile(false);
        }
      }, 150);
    }
  };

  const loadVaultItems = async () => {
    setVaultLoading(true);
    try {
      if (db) {
        const q = query(collection(db, 'vault_items'), orderBy('created_at', 'desc'));
        const snap = await getDocs(q);
        setVaultItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } else throw new Error();
    } catch {
      setVaultItems(JSON.parse(localStorage.getItem('px_vault') || '[]'));
    } finally { setVaultLoading(false); }
  };
  useEffect(() => { loadVaultItems(); }, []);

  const triggerVaultToast = (msg) => { setVaultToast(msg); setTimeout(() => setVaultToast(''), 3000); };

  const handleSaveVaultItem = async () => {
    if (!vaultForm.title.trim()) return triggerVaultToast('Titel ist erforderlich.');
    setVaultSaving(true);
    const payload = {
      user_id: user?.uid || 'local',
      type: vaultForm.type,
      title: vaultForm.title.trim(),
      content: vaultForm.content.trim(),
      tags: vaultForm.tags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean),
      created_at: new Date().toISOString(),
    };
    try {
      if (db) await addDoc(collection(db, 'vault_items'), payload);
      else throw new Error();
    } catch {
      const local = JSON.parse(localStorage.getItem('px_vault') || '[]');
      localStorage.setItem('px_vault', JSON.stringify([{ id: Date.now().toString(), ...payload }, ...local]));
    }
    await loadVaultItems();
    setVaultForm({ type: 'note', title: '', content: '', tags: '' });
    setVaultSaving(false);
    triggerVaultToast('Erfolgreich in den Vault eingespeist.');
  };

  const handleDeleteVaultItem = async (id) => {
    try { if (db) await deleteDoc(doc(db, 'vault_items', id)); else throw new Error(); }
    catch {
      const local = JSON.parse(localStorage.getItem('px_vault') || '[]');
      localStorage.setItem('px_vault', JSON.stringify(local.filter(i => i.id !== id)));
    }
    setVaultItems(prev => prev.filter(i => i.id !== id));
    triggerVaultToast('Eintrag gelöscht.');
  };

  /* ─── Handlers ─── */
  const handleSendChat = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    setMessages(prev => [...prev, { role: 'user', text: chatInput }]);
    const prompt = chatInput;
    setChatInput('');
    await handleCommand(prompt);
  };

  const handleAddGoal = (e) => {
    e.preventDefault();
    if (!newGoalText.trim()) return;
    saveProfile({ weeklyGoals: [...(profile.weeklyGoals || []), { text: newGoalText, completed: false }] });
    setNewGoalText('');
  };

  const toggleGoal = (idx) => {
    saveProfile({ weeklyGoals: (profile.weeklyGoals || []).map((g, i) => i === idx ? { ...g, completed: !g.completed } : g) });
  };

  const handleSaveMetrics = (e) => {
    e.preventDefault();
    saveProfile({ metrics: { hrv: parseInt(editHrv) || 70, sleep: parseInt(editSleep) || 80 } });
  };

  const handleAddBlock = (e) => {
    e.preventDefault();
    if (!customTitle.trim()) return;
    addCustomBlock(customTitle, parseInt(customDuration) || 30, 'Focus', 'focus');
    setCustomTitle('');
  };

  const handleAddCalendarBlock = () => {
    const t = prompt('Titel des neuen Blocks:');
    if (!t) return;
    const time = prompt('Startzeit (HH:MM):', '12:00');
    addCalendarBlock(t, time);
  };

  const handleEditCalendarBlock = (idx, currentTitle, currentTime) => {
    const newTitle = prompt('Titel anpassen:', currentTitle);
    const newTime = prompt('Startzeit anpassen (HH:MM):', currentTime);
    editCalendarBlock(idx, { title: newTitle ?? currentTitle, startTime: newTime ?? currentTime });
  };

  const handleDayChatSubmit = async (e) => {
    e.preventDefault();
    if (!dayChatInput.trim()) return;
    await chatWithDayAI(dayChatInput);
    setDayChatInput('');
  };

  const handleOpenSkillLab = async () => {
    setIsGeneratingSkill(true);
    setSkillContent('');
    setActiveModuleId(null);
    setSkillNotes({});
    setCompletedSteps({});
    setWatchedVideos({});
    const content = await generateSkillMaterials();
    setSkillContent(content);
    try {
      const parsed = JSON.parse(content);
      if (parsed && parsed.modules && parsed.modules.length > 0) {
        setActiveModuleId(parsed.modules[0].id);
      }
    } catch (e) {
      console.error("[Skill Lab] Error initializing module selection:", e);
    }
    setIsGeneratingSkill(false);
  };

  /* ─── Computed Values ─── */
  const radius = 100;
  const circumference = 2 * Math.PI * radius;
  const progressRatio = totalTime > 0 ? (timeLeft / totalTime) : 0;
  const strokeDashoffset = circumference - progressRatio * circumference;

  const formatTime = (s) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatMinToTime = (min) => {
    const h = Math.floor((min % (24 * 60)) / 60);
    const m = Math.floor(min % 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  const currentBlock = blocks[blockIdx] || {
    title: 'Kein aktiver Block', type: 'Focus', pillar: 'focus',
    rec: 'Keine Empfehlungen geladen.', insight: 'Initialisiere das Pronoia System.'
  };

  /* ─── Live Clock Helpers ─── */
  const clockHH = liveTime.getHours().toString().padStart(2, '0');
  const clockMM = liveTime.getMinutes().toString().padStart(2, '0');
  const clockSS = liveTime.getSeconds().toString().padStart(2, '0');
  const greeting = useMemo(() => {
    const h = liveTime.getHours();
    if (h < 5)  return 'Nacht-Modus';
    if (h < 12) return 'Guten Morgen';
    if (h < 17) return 'Guten Tag';
    if (h < 21) return 'Guten Abend';
    return 'Erholung-Modus';
  }, [clockHH]);

  const todayStr = liveTime.toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long' });

  /* ─── Focus Score ─── */
  const focusScore = useMemo(() => {
    const hrv    = profile?.metrics?.hrv   || 72;
    const sleep  = profile?.metrics?.sleep || 84;
    const hrvNorm  = Math.min(100, (hrv / 100) * 100);
    const raw = Math.round((hrvNorm * 0.55) + (sleep * 0.45));
    return Math.max(10, Math.min(99, raw));
  }, [profile]);

  const focusLabel = focusScore >= 80 ? 'PEAK' : focusScore >= 60 ? 'OPTIMAL' : focusScore >= 40 ? 'MODERAT' : 'KRITISCH';
  const focusColor = focusScore >= 80 ? 'var(--green)' : focusScore >= 60 ? 'var(--cobalt-bright)' : focusScore >= 40 ? 'var(--amber)' : 'var(--red)';

  const prog = totalTime > 0 ? 1 - timeLeft / totalTime : 0;
  let ltpPotential = 45;
  let plasticity = 50;
  if (currentBlock.pillar === 'skills') { ltpPotential = Math.min(98, Math.round(70 + prog * 28)); plasticity = Math.min(95, Math.round(60 + prog * 35)); }
  else if (currentBlock.pillar === 'focus') { ltpPotential = Math.min(85, Math.round(50 + prog * 20)); plasticity = Math.min(90, Math.round(55 + prog * 25)); }
  else { ltpPotential = Math.max(20, Math.round(50 - prog * 30)); plasticity = Math.max(30, Math.round(60 - prog * 20)); }

  const getAgentStatus = (agentId) => {
    const isFocus = currentBlock.pillar === 'focus';
    const isSkills = currentBlock.pillar === 'skills';
    const isRecovery = currentBlock.pillar === 'recovery';
    const isHealth = currentBlock.pillar === 'health';
    const recentFriction = frictionLogs.length > 0 && (Date.now() - frictionLogs[frictionLogs.length - 1].timestamp < 60000);
    const lastFrictionStatus = frictionLogs.length > 0 ? frictionLogs[frictionLogs.length - 1].status : null;
    switch (agentId) {
      case 'A.01': return isFocus ? { status: 'LEADING', text: 'Kognitiver Fokus-Index: 94% — Notification-Filter aktiv.' } : { status: 'MONITORING', text: 'Bereitschaft hoch. Überwacht kognitive Baseline.' };
      case 'A.02': return currentBlock.title?.toLowerCase().includes('stack') ? { status: 'LEADING', text: 'PX-V1 Absorption Peak: 78%. Biosynthese nominal.' } : { status: 'MONITORING', text: 'Glukose & Insulin stabil.' };
      case 'A.03': return currentBlock.title?.toLowerCase().includes('sleep') ? { status: 'LEADING', text: 'Circadian Gate OFFEN. Melatonin-Synthese aktiv.' } : { status: 'MONITORING', text: 'Licht-Synchronisation nominal.' };
      case 'A.04': return isRecovery ? { status: 'LEADING', text: 'PNS-Aktivierung aktiv. HRV steigt.' } : { status: 'MONITORING', text: `HRV: ${profile?.metrics?.hrv || 72}ms. Regeneration im Plan.` };
      case 'A.05': return (recentFriction && lastFrictionStatus === 'miss') ? { status: 'ACTIVE', text: 'Friction detektiert! Anpassung aktiv.' } : { status: 'MONITORING', text: 'Habit-Adhärenz hoch.' };
      case 'A.06': return { status: 'SUPERVISING', text: `Consensus nominal. Steuert: ${currentBlock.title}.` };
      default: return { status: 'MONITORING', text: 'Aktiv.' };
    }
  };

  const getStandingRank = (level) => {
    if (level >= 8) return 'Bio-Cognitive Pioneer';
    if (level >= 4) return 'Bio-Cognitive Specialist';
    return 'Bio-Cognitive Adept';
  };

  const getDaysInMonth = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    let startPadding = firstDayIndex === 0 ? 6 : firstDayIndex - 1;
    const dayCells = [];
    const prevMonthDays = new Date(year, month, 0).getDate();
    for (let i = startPadding - 1; i >= 0; i--) dayCells.push({ day: prevMonthDays - i, isCurrent: false, date: new Date(year, month - 1, prevMonthDays - i) });
    for (let d = 1; d <= totalDays; d++) dayCells.push({ day: d, isCurrent: true, date: new Date(year, month, d) });
    for (let i = 1; i <= 42 - dayCells.length; i++) dayCells.push({ day: i, isCurrent: false, date: new Date(year, month + 1, i) });
    return dayCells;
  };

  const days = getDaysInMonth();
  const dateStrSelected = formatDate(selectedDate);
  const dateStrToday = formatDate(new Date());
  const selectedDateStr = formatDate(selectedDate);
  const daySchedule = calendar[selectedDateStr] || { blocks: [] };
  const hasTodayCalBlocks = calendar[dateStrToday]?.blocks?.length > 0;

  /* ─── Gate Renders ─── */
  if (gateState === 'loading') {
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9999, background: '#080a0f',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: '#6a7890', letterSpacing: '0.15em', gap: '1.5rem'
      }}>
        <div style={{ width: '36px', height: '36px', border: '2px solid rgba(26,106,255,0.15)', borderTopColor: '#1A6AFF', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        LIFE_OS_INITIALIZING...
      </div>
    );
  }
  if (gateState === 'auth') return <GateScreen reason="auth" />;

  /* ═══════════════════════════════════════════════════════
     MAIN RENDER
  ═══════════════════════════════════════════════════════ */
  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div className={styles.tabContentGrid}>
            <div className={styles.tabContentMainCol}>
              {/* Block label under status bar */}
              <div className={styles.blockLabel}>
                <span className={styles.mainHeaderBadge}>
                  {circadianMode && currentBlock.calculatedStartMin !== undefined && currentBlock.calculatedEndMin !== undefined ? (
                    `${formatMinToTime(currentBlock.calculatedStartMin)} – ${formatMinToTime(currentBlock.calculatedEndMin)} · ${currentBlock.type}`
                  ) : (
                    currentBlock.type
                  )}
                </span>
                <h1 className={styles.mainHeaderTitle}>{currentBlock.title}</h1>
              </div>

              {/* CHRONOMETER */}
              <div className={styles.chronoSection}>
                <div className={styles.chronoControlLayout} style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', justifyContent: 'center', width: '100%', touchAction: 'none' }}>
                  <button 
                    className={styles.chronoArrowBtn} 
                    onClick={prevBlock}
                    title="Vorheriger Block"
                    style={{
                      background: 'none',
                      border: '1px solid var(--border-s)',
                      borderRadius: '50%',
                      color: 'var(--text2)',
                      width: '40px',
                      height: '40px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      fontSize: '1.2rem',
                      transition: 'all 0.3s ease',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--cobalt-bright)'; e.currentTarget.style.color = 'var(--text)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-s)'; e.currentTarget.style.color = 'var(--text2)'; }}
                  >
                    ←
                  </button>

                  <div 
                    className={styles.chronoWrapper}
                    onMouseDown={(e) => handleDragStart(e.clientX, e)}
                    onTouchStart={(e) => handleDragStart(e.touches[0].clientX)}
                    onTouchMove={(e) => handleDragMove(e.touches[0].clientX)}
                    onTouchEnd={handleDragEnd}
                    style={{
                      cursor: 'grab',
                      userSelect: 'none',
                      transform: `translateX(${dragStartX !== null ? (dragCurrentX - dragStartX) * 0.35 : 0}px)`,
                      transition: dragStartX !== null ? 'none' : 'transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)'
                    }}
                  >
                    <svg width="240" height="240" className={styles.chronoSvg}>
                      <defs>
                        <linearGradient id="progGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="var(--theme-accent, #1A6AFF)" />
                          <stop offset="100%" stopColor="var(--tan, #d5b893)" />
                        </linearGradient>
                      </defs>
                      <circle cx="120" cy="120" r="115" className={styles.chronoOuter} />
                      <circle cx="120" cy="120" r={radius} className={styles.chronoTrack} />
                      <circle
                        cx="120" cy="120" r={radius}
                        className={styles.chronoProgress}
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                      />
                    </svg>
                    <div className={styles.chronoCenter}>
                      {showTimeEdit ? (
                        <form 
                          onSubmit={handleTimeEditSubmit} 
                          onClick={e => e.stopPropagation()} 
                          onMouseDown={e => e.stopPropagation()} 
                          onTouchStart={e => e.stopPropagation()} 
                          style={{ display: 'flex', gap: '0.25rem', justifyContent: 'center', alignItems: 'center' }}
                        >
                          <input
                            type="number"
                            min="1"
                            max="480"
                            className={styles.chronoTimeInput}
                            value={editTimeMinutes}
                            onChange={e => setEditTimeMinutes(e.target.value)}
                            autoFocus
                            style={{
                              width: '70px',
                              background: 'var(--bg3)',
                              border: '1px solid var(--border-s)',
                              color: 'var(--text)',
                              fontSize: '1.4rem',
                              textAlign: 'center',
                              borderRadius: '6px',
                              outline: 'none'
                            }}
                          />
                          <button type="submit" className="btn btn-primary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.85rem' }}>✓</button>
                        </form>
                      ) : (
                        <div 
                          className={styles.chronoTime}
                          onClick={() => { setEditTimeMinutes(Math.round(timeLeft / 60).toString()); setShowTimeEdit(true); }}
                          title="Dauer manuell anpassen"
                          style={{ cursor: 'pointer', transition: 'color 0.2s' }}
                          onMouseEnter={e => e.currentTarget.style.color = 'var(--cobalt-bright)'}
                          onMouseLeave={e => e.currentTarget.style.color = 'var(--text)'}
                        >
                          {formatTime(timeLeft)}
                        </div>
                      )}
                      <div className={styles.chronoStatus}>
                        {circadianMode ? (manualPeekIdx !== null ? 'PEEK (TEMP)' : 'ZIRKADIAN') : isRunning ? 'AKTIV' : 'PAUSIERT'}
                      </div>
                      {circadianMode && manualPeekIdx !== null && (
                        <button
                          style={{
                            background: 'rgba(26, 106, 255, 0.15)',
                            color: 'var(--cobalt-bright)',
                            border: '1px solid var(--cobalt-bright)',
                            borderRadius: '12px',
                            padding: '2px 8px',
                            fontSize: '0.65rem',
                            marginTop: '4px',
                            cursor: 'pointer',
                            fontFamily: 'var(--font-mono)',
                            letterSpacing: '0.05em'
                          }}
                          onClick={() => setManualPeekIdx(null)}
                        >
                          ↩ LIVE BLOCK
                        </button>
                      )}
                      {!circadianMode && (
                        <button
                          className={`${styles.chronoBtn} ${isRunning ? styles.chronoBtnPause : styles.chronoBtnStart}`}
                          onClick={toggleTimer}
                        >
                          {isRunning ? 'PAUSE' : 'START'}
                        </button>
                      )}
                    </div>
                  </div>

                  <button 
                    className={styles.chronoArrowBtn} 
                    onClick={skipBlock}
                    title="Nächster Block"
                    style={{
                      background: 'none',
                      border: '1px solid var(--border-s)',
                      borderRadius: '50%',
                      color: 'var(--text2)',
                      width: '40px',
                      height: '40px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      fontSize: '1.2rem',
                      transition: 'all 0.3s ease',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--cobalt-bright)'; e.currentTarget.style.color = 'var(--text)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-s)'; e.currentTarget.style.color = 'var(--text2)'; }}
                  >
                    →
                  </button>
                </div>

                {/* Zirkadian Mode Toggle Control */}
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1.5rem', marginBottom: '0.5rem' }}>
                  <button
                    onClick={() => setCircadianMode(!circadianMode)}
                    style={{
                      background: circadianMode ? 'rgba(26, 106, 255, 0.08)' : 'none',
                      border: '1px solid',
                      borderColor: circadianMode ? 'var(--cobalt-bright)' : 'var(--border-s)',
                      borderRadius: '20px',
                      color: circadianMode ? 'var(--cobalt-bright)' : 'var(--text3)',
                      padding: '0.4rem 1rem',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.7rem',
                      letterSpacing: '0.05em',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      transition: 'all 0.3s ease',
                      boxShadow: circadianMode ? '0 0 12px rgba(26,106,255,0.15)' : 'none'
                    }}
                  >
                    <span style={{ 
                      width: '6px', 
                      height: '6px', 
                      borderRadius: '50%', 
                      background: circadianMode ? 'var(--cobalt-bright)' : 'var(--text3)',
                      display: 'inline-block'
                    }} />
                    ZIRKADIANER SYNC: {circadianMode ? 'AKTIV (ECHTZEIT)' : 'MANUELL'}
                  </button>
                </div>

                {/* Progress markers */}
                <div className={styles.chronoMeta}>
                  <div className={styles.chronoMetaItem}>
                    <span className={styles.chronoMetaLabel}>BLOCK</span>
                    <span className={styles.chronoMetaValue}>{blockIdx + 1} / {blocks.length || 1}</span>
                  </div>
                  <div className={styles.chronoMetaItem}>
                    <span className={styles.chronoMetaLabel}>PROTOKOLL</span>
                    <span className={styles.chronoMetaValue}>{currentBlock.pillar?.toUpperCase() || 'FOCUS'}</span>
                  </div>
                  <div className={styles.chronoMetaItem}>
                    <span className={styles.chronoMetaLabel}>HRV</span>
                    <span className={styles.chronoMetaValue}>{profile?.metrics?.hrv || 72}ms</span>
                  </div>
                  <div className={styles.chronoMetaItem}>
                    <span className={styles.chronoMetaLabel}>SCHLAF</span>
                    <span className={styles.chronoMetaValue}>{profile?.metrics?.sleep || 84}%</span>
                  </div>
                </div>
              </div>

              {/* Live Telemetry Card */}
              {(!profile?.customization || profile.customization.layout?.telemetry !== false) && (
                <div className={styles.insightCard} style={{ marginTop: '0', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'stretch' }}>
                  <span className={styles.insightLabel}>BIO-KOGNITIVE TELEMETRIE</span>
                  <TelemetryVisualizer timeLeft={timeLeft} totalTime={totalTime} pillar={currentBlock.pillar} />
                </div>
              )}

              {/* CURRENT BLOCK INSIGHT */}
              {(!profile?.customization || profile.customization.layout?.directives !== false) && (
                <div className={styles.insightCard}>
                  <div className={styles.insightLeft}>
                    <span className={styles.insightLabel}>SYSTEM-DIREKTIVE</span>
                    <p className={styles.insightText}>{currentBlock.rec || currentBlock.insight || 'Starte das Protokoll, um Empfehlungen zu erhalten.'}</p>
                  </div>
                  <div className={styles.insightRight}>
                    <div className={styles.neuroStat}>
                      <span className={styles.neuroStatVal}>{ltpPotential}%</span>
                      <span className={styles.neuroStatLabel}>LTP</span>
                    </div>
                    <div className={styles.neuroStat}>
                      <span className={styles.neuroStatVal}>{plasticity}%</span>
                      <span className={styles.neuroStatLabel}>Plastizität</span>
                    </div>
                  </div>
                </div>
              )}

              {/* FRICTION LOGGER */}
              {(!profile?.customization || profile.customization.layout?.friction !== false) && (
                <div className={styles.frictionRow}>
                  <span className={styles.frictionLabel}>Fokus-Status</span>
                  <div className={styles.frictionBtns}>
                    <button className={`${styles.frictionBtn} ${styles.fbOk}`} onClick={() => logFriction('ok')}>🟢 Stabil</button>
                    <button className={`${styles.frictionBtn} ${styles.fbWarn}`} onClick={() => logFriction('warn')}>🟡 Ablenkung</button>
                    <button className={`${styles.frictionBtn} ${styles.fbMiss}`} onClick={() => logFriction('miss')}>🔴 Blockade</button>
                  </div>
                </div>
              )}

              {/* AI COMMAND CHAT */}
              <div className={styles.chatBox}>
                <div className={styles.chatMessages} ref={chatEndRef}>
                  {messages.map((msg, i) => (
                    <div key={i} className={`${styles.chatMsg} ${msg.role === 'agent' ? styles.chatMsgAgent : styles.chatMsgUser}`}>
                      {msg.text}
                    </div>
                  ))}
                  {isTyping && <div className={`${styles.chatMsg} ${styles.chatMsgAgent} ${styles.chatMsgTyping}`}>System analysiert…</div>}
                </div>
                <form className={styles.chatForm} onSubmit={handleSendChat}>
                  <input
                    type="text"
                    className={styles.chatInput}
                    placeholder="Systembefehl… (z.B. 'starte block 2', 'ersetze durch Meditation 15')"
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    disabled={isTyping}
                  />
                  <button type="submit" className={styles.chatSend} disabled={isTyping}>SEND</button>
                </form>
              </div>
            </div>

            <div className={styles.tabContentSideCol}>
              {/* Ablauf-Queue panel */}
              <div className={styles.panelHeader}>
                <h3 className={styles.panelTitle}>⏳ Ablauf-Queue</h3>
              </div>
              <div className={styles.panelBody}>
                {pendingQueueOverride && (
                  <div className={styles.alertCard} style={{ borderColor: 'var(--amber)', background: 'rgba(245, 166, 35, 0.05)', marginBottom: '1rem' }}>
                    <strong>⚠️ Kalender-Blöcke vorhanden</strong>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0.25rem 0' }}>Für heute sind bereits Kalender-Blöcke geplant. Möchtest du sie wirklich mit dem Protokoll "{pendingQueueOverride}" überschreiben?</p>
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                      <button className={styles.alertBtn} onClick={confirmQueueOverride} style={{ background: 'var(--cobalt-bright)', color: 'white', padding: '0.4rem 0.8rem', borderRadius: '4px', fontSize: '0.75rem', cursor: 'pointer', border: 'none' }}>Ja</button>
                      <button className={styles.alertBtn} onClick={() => setPendingQueueOverride(null)} style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-s)', color: 'var(--text2)', padding: '0.4rem 0.8rem', borderRadius: '4px', fontSize: '0.75rem', cursor: 'pointer' }}>Nein</button>
                    </div>
                  </div>
                )}

                {hasTodayCalBlocks && (
                  <div style={{ marginBottom: '1rem' }}>
                    <button 
                      className={styles.alertBtn} 
                      onClick={restoreCalendarBlocks} 
                      style={{ 
                        width: '100%', 
                        background: 'rgba(0, 196, 140, 0.1)', 
                        borderColor: 'var(--green)',
                        color: 'var(--green)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        padding: '0.6rem',
                        fontSize: '0.75rem',
                        fontWeight: 'bold',
                        letterSpacing: '0.05em',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        border: '1px solid var(--green)'
                      }}
                    >
                      📅 HEUTIGEN KALENDER WIEDERHERSTELLEN
                    </button>
                  </div>
                )}

                {/* Protocol presets */}
                <div className={styles.panelGroup}>
                  <div className={styles.panelGroupLabel}>Protokoll laden</div>
                  <div className={styles.presetGrid}>
                    {[
                      { id: 'focus_optimization', icon: '🧠', label: 'Focus Opt.' },
                      { id: 'high_performance',   icon: '⚡', label: 'High Perf.' },
                      { id: 'metabolic_rest',      icon: '💤', label: 'Metabolic' },
                      { id: 'emergency_recovery',  icon: '🛡️', label: 'Recovery' },
                      { id: 'physical_training',   icon: '🏋️', label: 'Physical' },
                    ].map(p => (
                      <button key={p.id} className={styles.presetBtn} onClick={() => loadProtocolQueue(p.id)}>
                        {p.icon} {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* HRV nudge */}
                {profile?.metrics?.hrv < 60 && (
                  <div className={styles.alertCard}>
                    <strong>⚡ Workflow-Optimierung</strong>
                    <p>HRV: {profile.metrics.hrv}ms — Recovery-Workflow empfohlen.</p>
                    <button className={styles.alertBtn} onClick={() => loadProtocolQueue('emergency_recovery')}>
                      RECOVERY LADEN
                    </button>
                  </div>
                )}

                {/* Block list */}
                <div className={styles.panelGroup}>
                  <div className={styles.panelGroupLabel}>Aktive Queue ({blocks.length} Blöcke)</div>
                  <div className={styles.queueList}>
                    {blocks.map((block, idx) => (
                      <div key={idx} className={`${styles.queueItem} ${idx === blockIdx ? styles.queueItemActive : ''}`}>
                        <span className={styles.queueNum}>{idx + 1}</span>
                        <div className={styles.queueInfo}>
                          <div className={styles.queueTitle}>{block.title}</div>
                          <div className={styles.queueMeta}>
                            {circadianMode && block.calculatedStartMin !== undefined && block.calculatedEndMin !== undefined ? (
                              `${formatMinToTime(block.calculatedStartMin)} – ${formatMinToTime(block.calculatedEndMin)} (${Math.round((block.virtualDuration || block.duration) / 60)} Min) · ${block.type}`
                            ) : (
                              `${Math.round(block.duration / 60)} Min · ${block.type}`
                            )}
                          </div>
                        </div>
                        {idx === blockIdx && <span className={styles.queueActiveDot} />}
                      </div>
                    ))}
                    {blocks.length === 0 && <p className={styles.emptyState}>Keine Blöcke aktiv.</p>}
                  </div>
                </div>

                {/* Add custom block */}
                <div className={styles.panelGroup}>
                  <div className={styles.panelGroupLabel}>Custom Block anlegen</div>
                  <form onSubmit={handleAddBlock} className={styles.stackedForm}>
                    <input type="text" placeholder="Block Title…" className={styles.formInput} value={customTitle} onChange={e => setCustomTitle(e.target.value)} required />
                    <input type="number" placeholder="Dauer in Minuten…" className={styles.formInput} value={customDuration} onChange={e => setCustomDuration(e.target.value)} required />
                    <button type="submit" className={styles.formBtn}>BLOCK ANLEGEN</button>
                  </form>
                </div>

                {/* Knowledge Vault trigger */}
                <div className={styles.panelGroup}>
                  <div className={styles.panelGroupLabel}>Kognitiver Kontext</div>
                  <button className={styles.vaultTrigger} onClick={() => { setActiveTab('vault'); }}>
                    ✦ Knowledge Vault öffnen
                  </button>
                  <div className={styles.fileUpload}>
                    <span>CSV / JSON einlesen</span>
                    <input type="file" accept=".csv,.json" onChange={e => e.target.files[0] && uploadDataSource(e.target.files[0])} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case 'biometrics':
        return (
          <div className={styles.tabContentGrid}>
            <div className={styles.tabContentMainCol}>
              <div className={styles.panelHeader}>
                <h3 className={styles.panelTitle}>📊 Biometrische Indikatoren</h3>
              </div>
              <div className={styles.panelBody}>
                <form onSubmit={handleSaveMetrics} className={styles.metricsForm}>
                  <div className={styles.metricCards}>
                    <div className={styles.metricCard}>
                      <div className={styles.metricCardVal}>{profile?.metrics?.hrv || 72}</div>
                      <div className={styles.metricCardLabel}>HRV (ms)</div>
                      <input type="number" className={styles.formInput} value={editHrv} onChange={e => setEditHrv(e.target.value)} />
                    </div>
                    <div className={styles.metricCard}>
                      <div className={styles.metricCardVal}>{profile?.metrics?.sleep || 84}</div>
                      <div className={styles.metricCardLabel}>Sleep Score</div>
                      <input type="number" className={styles.formInput} value={editSleep} onChange={e => setEditSleep(e.target.value)} />
                    </div>
                  </div>
                  <button type="submit" className={styles.formBtn} style={{ marginTop: '1rem' }}>SYNCHRONISIEREN</button>
                </form>

                <div className={styles.panelGroup} style={{ marginTop: '2rem' }}>
                  <div className={styles.panelGroupLabel}>Neuro-Zustände (Live)</div>
                  {[
                    { label: 'LTP Potential', val: `${ltpPotential}%`, color: ltpPotential > 70 ? 'var(--green)' : 'var(--amber)' },
                    { label: 'Plasticity Index', val: `${plasticity}%`, color: plasticity > 70 ? 'var(--green)' : 'var(--amber)' },
                    { label: 'Circadian Gate', val: 'Offen', color: 'var(--green)' },
                  ].map(r => (
                    <div key={r.label} className={styles.neuroRow}>
                      <span>{r.label}</span>
                      <span style={{ color: r.color, fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{r.val}</span>
                    </div>
                  ))}
                </div>

                <div className={styles.panelGroup} style={{ marginTop: '2rem' }}>
                  <div className={styles.panelGroupLabel}>Wochen-Ziele</div>
                  {(profile?.weeklyGoals || []).map((goal, idx) => (
                    <div key={idx} className={styles.goalItem} onClick={() => toggleGoal(idx)}>
                      <input type="checkbox" checked={goal.completed} readOnly className={styles.goalCheck} />
                      <span style={{ textDecoration: goal.completed ? 'line-through' : 'none', color: goal.completed ? 'var(--text3)' : 'var(--text)' }}>{goal.text}</span>
                    </div>
                  ))}
                  <form onSubmit={handleAddGoal} className={styles.goalForm} style={{ marginTop: '1rem' }}>
                    <input type="text" placeholder="Neues Ziel…" className={styles.formInput} value={newGoalText} onChange={e => setNewGoalText(e.target.value)} />
                    <button type="submit" className={styles.formBtn} style={{ padding: '0 1rem' }}>+</button>
                  </form>
                </div>
              </div>
            </div>

            <div className={styles.tabContentSideCol}>
              <div className={styles.panelHeader}>
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                  <h3 className={styles.panelTitle}>💊 Bio-Stack Inventar</h3>
                  <button className={styles.addBtn} onClick={addStackItem}>+ ADD</button>
                </div>
              </div>
              <div className={styles.panelBody}>
                {stack.map((item, idx) => (
                  <div key={idx} className={styles.stackCard}>
                    <div className={styles.stackCardTop}>
                      <div>
                        <div className={styles.stackName}>{item.name}</div>
                        <div className={styles.stackDose}>{item.dose} · {item.timing}</div>
                      </div>
                      <button className={styles.stackConsumeBtn} onClick={() => consumeStackItem(idx)}>KONSUM</button>
                    </div>
                    <div className={styles.stackBar}>
                      <div
                        className={styles.stackBarFill}
                        style={{
                          width: `${item.supply}%`,
                          background: item.supply < 30 ? 'var(--red)' : item.supply < 60 ? 'var(--amber)' : 'var(--green)'
                        }}
                      />
                    </div>
                    <div className={styles.stackSupplyText}>{item.supply}% Vorrat</div>
                  </div>
                ))}
                {stack.length === 0 && <p className={styles.emptyState}>Kein Stack konfiguriert.</p>}
              </div>
            </div>
          </div>
        );
      case 'skills': {
        let parsedSkillSession = null;
        try {
          if (skillContent) {
            parsedSkillSession = JSON.parse(skillContent);
          }
        } catch (e) {
          console.error("Failed to parse skill content JSON:", e);
        }

        const getModuleProgress = (mod) => {
          if (!mod) return 0;
          if (mod.type === 'video' || mod.type === 'theory') {
            return watchedVideos[mod.id] ? 100 : 0;
          }
          if (mod.type === 'practice') {
            const steps = mod.steps || [];
            if (steps.length === 0) return 0;
            const done = completedSteps[mod.id] || [];
            return Math.round((done.length / steps.length) * 100);
          }
          return 0;
        };

        const getOverallProgress = () => {
          if (!parsedSkillSession || !parsedSkillSession.modules) return 0;
          const total = parsedSkillSession.modules.reduce((acc, mod) => acc + getModuleProgress(mod), 0);
          return Math.round(total / parsedSkillSession.modules.length);
        };

        const overallProgress = getOverallProgress();
        const selectedModule = parsedSkillSession?.modules?.find(m => m.id === activeModuleId);

        return (
          <div className={styles.singlePanelLayout}>
            <div className={styles.panelHeader}>
              <h3 className={styles.panelTitle}>🔬 Agentic Skill Lab</h3>
            </div>
            <div className={styles.panelBody}>
              <div className={styles.skillsTopGrid}>
                <div className={styles.panelGroup}>
                  <div className={styles.panelGroupLabel}>Ziel-Skill & Stufe festlegen</div>
                  <div className={styles.skillInputRow}>
                    <input 
                      type="text" 
                      className={styles.formInput} 
                      placeholder="Ziel-Skill (z.B. Python)..." 
                      value={profile?.skill || ''} 
                      onChange={e => saveProfile({ skill: e.target.value })} 
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span className={styles.formLabel} style={{ margin: 0 }}>Lvl:</span>
                      <input 
                        type="number" 
                        className={styles.formInput} 
                        style={{ width: '80px' }} 
                        value={profile?.skillLevel || 1} 
                        onChange={e => saveProfile({ skillLevel: parseInt(e.target.value) || 1 })} 
                      />
                    </div>
                  </div>
                </div>

                <div className={styles.panelGroup}>
                  <div className={styles.panelGroupLabel}>Kognitives Level & XP Fortschritt</div>
                  <div className={styles.xpRow}>
                    <strong>Level {profile?.skillLevel || 1}</strong>
                    <span className={styles.xpLabel}>{profile?.xp || 0} / {profile?.nextLevelXp || 500} XP</span>
                  </div>
                  <div className={styles.xpBar} style={{ marginTop: '0.5rem' }}>
                    <div className={styles.xpFill} style={{ width: `${Math.min(100, ((profile?.xp || 0) / (profile?.nextLevelXp || 500)) * 100)}%` }} />
                  </div>
                </div>
              </div>

              <div className={styles.skillPracticeWorkspace} style={{ marginTop: '2rem' }}>
                <div className={styles.panelGroupLabel}>Deliberate practice workspace</div>
                {isGeneratingSkill ? (
                  <div className={styles.generatingState}>
                    <div className={styles.generatingSpinner} />
                    <div className={styles.generatingText}>GENERATING_NEURAL_PATHWAYS…</div>
                    <div className={styles.generatingSub}>Skill: {profile?.skill || 'Programmieren'} (Lvl {profile?.skillLevel || 1})</div>
                  </div>
                ) : parsedSkillSession ? (
                  <div className={styles.practiceSessionWorkspace}>
                    
                    {/* Card grid row like in the user's screenshot */}
                    <div className={styles.skillModulesGrid}>
                      {parsedSkillSession.modules.map(mod => {
                        const prog = getModuleProgress(mod);
                        const isActive = mod.id === activeModuleId;
                        return (
                          <div 
                            key={mod.id} 
                            className={`${styles.skillModuleCard} ${isActive ? styles.skillModuleCardActive : ''}`}
                            onClick={() => setActiveModuleId(mod.id)}
                          >
                            {/* Visual Thumbnail */}
                            <div className={styles.skillModuleThumbnail}>
                              {mod.type === 'video' && (
                                <div className={`${styles.thumbnailBg} ${styles.thumbnailVideoBg}`}>
                                  <div className={styles.videoPlayButton}>▶</div>
                                  <span className={styles.thumbnailLabel}>YOUTUBE LESSON</span>
                                </div>
                              )}
                              {mod.type === 'theory' && (
                                <div className={`${styles.thumbnailBg} ${styles.thumbnailTheoryBg}`}>
                                  <svg className={styles.neuralNetSvg} viewBox="0 0 100 60">
                                    <line x1="20" y1="30" x2="50" y2="15" stroke="var(--border-strong)" strokeWidth="1" />
                                    <line x1="20" y1="30" x2="50" y2="45" stroke="var(--border-strong)" strokeWidth="1" />
                                    <line x1="50" y1="15" x2="80" y2="30" stroke="var(--border-strong)" strokeWidth="1" />
                                    <line x1="50" y1="45" x2="80" y2="30" stroke="var(--border-strong)" strokeWidth="1" />
                                    <line x1="20" y1="30" x2="80" y2="30" stroke="var(--border-strong)" strokeWidth="1" />
                                    <circle cx="20" cy="30" r="4" fill="var(--theme-accent, var(--cobalt-bright))" />
                                    <circle cx="50" cy="15" r="4" fill="var(--amber)" />
                                    <circle cx="50" cy="45" r="4" fill="var(--green)" />
                                    <circle cx="80" cy="30" r="4" fill="var(--theme-accent, var(--cobalt-bright))" />
                                  </svg>
                                  <span className={styles.thumbnailLabel}>THEORIE / KONZEPT</span>
                                </div>
                              )}
                              {mod.type === 'practice' && (
                                <div className={`${styles.thumbnailBg} ${styles.thumbnailPracticeBg}`}>
                                  <div className={styles.miniTerminal}>
                                    <div className={styles.terminalHeader}><span className={styles.termDot}/><span className={styles.termDot}/><span className={styles.termDot}/></div>
                                    <div className={styles.terminalCode}>
                                      <span className={styles.codeCyan}>const</span> <span className={styles.codeBlue}>practice</span> = () =&gt; &#123;<br/>
                                      &nbsp;&nbsp;console.<span className={styles.codeGreen}>log</span>(<span className={styles.codeAmber}>"Focus..."</span>);<br/>
                                      &#125;;
                                    </div>
                                  </div>
                                  <span className={styles.thumbnailLabel}>ISOLIERTE ÜBUNG</span>
                                </div>
                              )}
                            </div>
                            
                            {/* Card Details */}
                            <div className={styles.skillModuleCardInfo}>
                              <h4 className={styles.skillModuleCardTitle}>{mod.title}</h4>
                              <div className={styles.cardProgressWrapper}>
                                <div className={styles.cardProgressBar}>
                                  <div className={styles.cardProgressFill} style={{ width: `${prog}%` }} />
                                </div>
                                <span className={styles.cardProgressPercent}>{prog}%</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Active Detail Workspace Area */}
                    {selectedModule && (
                      <div className={styles.activeModuleDetailPanel}>
                        <div className={styles.activeModuleHeader}>
                          <span className={styles.activeModuleTypeLabel}>
                            {selectedModule.type === 'video' ? '📺 VIDEO WORKSPACE' : 
                             selectedModule.type === 'theory' ? '📚 THEORIE WORKSPACE' : '🛠️ CHALLENGE WORKSPACE'}
                          </span>
                          <h3 className={styles.activeModuleTitle}>{selectedModule.title}</h3>
                        </div>

                        <div className={styles.activeModuleBodyGrid}>
                          <div className={styles.activeModuleMainContent}>
                            {/* Module type specific layouts */}
                            {selectedModule.type === 'video' && (
                              <div className={styles.videoPlayerContainer}>
                                <div className={styles.videoPlayerFrameWrapper}>
                                  <iframe 
                                    className={styles.videoIframe}
                                    src={selectedModule.videoUrl} 
                                    title={selectedModule.title}
                                    frameBorder="0" 
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                                    allowFullScreen
                                  />
                                </div>
                                <p className={styles.videoSummaryText}>{selectedModule.summary}</p>
                                <button
                                  type="button"
                                  className={`${styles.moduleActionBtn} ${watchedVideos[selectedModule.id] ? styles.moduleActionBtnCompleted : ''}`}
                                  onClick={() => setWatchedVideos(prev => ({ ...prev, [selectedModule.id]: !prev[selectedModule.id] }))}
                                >
                                  {watchedVideos[selectedModule.id] ? 'Lektion wiederholen ↩' : 'Lektion abschließen ✓'}
                                </button>
                              </div>
                            )}

                            {selectedModule.type === 'theory' && (
                              <div className={styles.theoryReaderContainer}>
                                <div className={styles.theoryTextContent}>
                                  {selectedModule.content.split('\n\n').map((para, i) => (
                                    <p key={i}>{para}</p>
                                  ))}
                                </div>
                                <button
                                  type="button"
                                  className={`${styles.moduleActionBtn} ${watchedVideos[selectedModule.id] ? styles.moduleActionBtnCompleted : ''}`}
                                  onClick={() => setWatchedVideos(prev => ({ ...prev, [selectedModule.id]: !prev[selectedModule.id] }))}
                                >
                                  {watchedVideos[selectedModule.id] ? 'Als ungelesen markieren ↩' : 'Als gelesen markieren ✓'}
                                </button>
                              </div>
                            )}

                            {selectedModule.type === 'practice' && (
                              <div className={styles.practiceContainer}>
                                <p className={styles.practiceInstructions}>{selectedModule.instructions}</p>
                                
                                <div className={styles.practiceStepsChecklist}>
                                  {(selectedModule.steps || []).map((step, idx) => {
                                    const currentDone = completedSteps[selectedModule.id] || [];
                                    const isChecked = currentDone.includes(idx);
                                    return (
                                      <label key={idx} className={`${styles.checklistRow} ${isChecked ? styles.checklistRowChecked : ''}`}>
                                        <input 
                                          type="checkbox" 
                                          className={styles.checklistCheckbox}
                                          checked={isChecked}
                                          onChange={() => {
                                            const updated = isChecked 
                                              ? currentDone.filter(x => x !== idx) 
                                              : [...currentDone, idx];
                                            setCompletedSteps(prev => ({ ...prev, [selectedModule.id]: updated }));
                                          }}
                                        />
                                        <span className={styles.checklistText}>{step}</span>
                                      </label>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Notes/Sidebar panel */}
                          <div className={styles.activeModuleSidebar}>
                            <div className={styles.notesPanelHeader}>
                              <span>✍️ PERSÖNLICHE NOTIZEN</span>
                            </div>
                            <textarea
                              className={styles.notesTextArea}
                              placeholder="Halte hier deine Notizen, Code-Snippets oder Erkenntnisse für diese Lektion fest..."
                              value={skillNotes[selectedModule.id] || ''}
                              onChange={(e) => setSkillNotes(prev => ({ ...prev, [selectedModule.id]: e.target.value }))}
                            />
                            <div className={styles.notesFooter}>
                              <span className={styles.notesSaveStatus}>Auto-saved locally</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Progress tracker & Session controls */}
                    <div className={styles.sessionControlFooter}>
                      <div className={styles.overallSessionProgress}>
                        <span className={styles.overallProgressLabel}>GESAMT-FORTSCHRITT DER LAB-SESSION:</span>
                        <div className={styles.overallProgressRow}>
                          <div className={styles.overallProgressTrack}>
                            <div className={styles.overallProgressFill} style={{ width: `${overallProgress}%` }} />
                          </div>
                          <span className={styles.overallProgressText}>{overallProgress}% abgeschlossen</span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                        <button 
                          className={`${styles.skillCompleteBtn} ${overallProgress < 100 ? styles.skillCompleteBtnDisabled : ''}`} 
                          onClick={() => {
                            if (overallProgress === 100) {
                              completeSkillSession(150);
                              setSkillContent('');
                              setActiveModuleId(null);
                              setSkillNotes({});
                              setCompletedSteps({});
                              setWatchedVideos({});
                            }
                          }}
                          disabled={overallProgress < 100}
                        >
                          Session abschließen (+150 XP) {overallProgress < 100 ? '🔒' : '✨'}
                        </button>
                        <button 
                          className={`${styles.formBtn} ${styles.formBtnAmber}`}
                          onClick={handleOpenSkillLab}
                          style={{ margin: 0, width: 'auto' }}
                        >
                          Session verwerfen & Neu generieren 🔄
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className={styles.emptyPracticeState}>
                    <p>Bereit für eine bio-kognitive Trainingseinheit? Generiere deinen adaptiven Trainingsplan.</p>
                    <button className={`${styles.formBtn} ${styles.formBtnAmber}`} onClick={handleOpenSkillLab} style={{ maxWidth: '320px', margin: '1rem auto 0' }}>
                      🔬 LAB SESSION GENERIEREN
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      }
      case 'store':
        return (
          <div className={styles.singlePanelLayout}>
            {/* Store Portal Tab Switcher */}
            <div className={styles.portalTabSwitcher} style={{ marginBottom: '2rem' }}>
              <button 
                className={`${styles.portalTabBtn} ${portalTab === 'subscriptions' ? styles.portalTabBtnActive : ''}`}
                onClick={() => setPortalTab('subscriptions')}
              >
                Abonnements (Systemstufen)
              </button>
              <button 
                className={`${styles.portalTabBtn} ${portalTab === 'store' ? styles.portalTabBtnActive : ''}`}
                onClick={() => setPortalTab('store')}
              >
                Ecosystem Store (Produkte)
              </button>
            </div>

            {portalTab === 'subscriptions' ? (
              <div className={styles.pricingGrid}>
                {TIERS.map(tier => {
                  const isActive = profile?.subscriptionTier === tier.id;
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
                        onClick={async () => {
                          if (authLoading) return;
                          setAgentMsg(`Upgrade auf ${tier.name} angefordert.`);
                          try {
                            await saveProfile({ subscriptionTier: tier.id });
                            setAgentMsg(`Abonnement auf ${tier.name} aktualisiert.`);
                          } catch (e) {
                            setAgentMsg('Fehler beim Speichern des System-Abos.');
                          }
                        }}
                        disabled={isActive}
                      >
                        {isActive ? 'Aktiver Plan ✓' : tier.ctaText}
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className={styles.storeContent}>
                {/* 1. APPAREL */}
                <div className={styles.storeCategoryTitle}>
                  <span>01 — Functional Apparel (Kleidung)</span>
                  <span className={styles.storeCategoryTag}>TOXIN-FREE GOTS GEAR</span>
                </div>
                <div className={styles.storeGrid}>
                  {STORE_PRODUCTS.apparel.map(prod => (
                    <div key={prod.id} className={styles.storeCard}>
                      <div className={styles.storeCardTop}>
                        <div className={styles.storeCardHeader}>
                          <span className={styles.storeCardBadge}>{prod.badge}</span>
                          <span className={`${styles.storeCardStatus} ${
                            prod.status === 'AUTO-REFILL' ? styles.statusRefill : 
                            prod.status === 'BEGRENZT' ? styles.statusLimited : styles.statusAvailable
                          }`}>{prod.status}</span>
                        </div>
                        <h4 className={styles.storeCardName}>{prod.name}</h4>
                        <p className={styles.storeCardDesc}>{prod.desc}</p>
                        {prod.tags && (
                          <div className={styles.storeCardTags}>
                            {prod.tags.map(tag => (
                              <span key={tag} className={styles.storeCardTag}>#{tag}</span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className={styles.storeCardFooter}>
                        <div className={styles.storeCardPriceInfo}>
                          <span className={styles.storeCardPriceLabel}>REDEEM COST</span>
                          <span className={styles.storeCardPrice}>🪙 {prod.price} CR</span>
                        </div>
                        <button 
                          className={styles.storeBuyBtn}
                          onClick={() => handleOrderProduct(prod)}
                        >
                          Bestellen
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* 2. SUPPLEMENTS */}
                <div className={styles.storeCategoryTitle} style={{ marginTop: '3rem' }}>
                  <span>02 — Supplements & Refills</span>
                  <span className={styles.storeCategoryTag}>COA LAB-TESTED MATRIX</span>
                </div>
                <div className={styles.storeGrid}>
                  {STORE_PRODUCTS.supplements.map(prod => (
                    <div key={prod.id} className={styles.storeCard}>
                      <div className={styles.storeCardTop}>
                        <div className={styles.storeCardHeader}>
                          <span className={styles.storeCardBadge}>{prod.badge}</span>
                          <span className={`${styles.storeCardStatus} ${
                            prod.status === 'AUTO-REFILL' ? styles.statusRefill : 
                            prod.status === 'BEGRENZT' ? styles.statusLimited : styles.statusAvailable
                          }`}>{prod.status}</span>
                        </div>
                        <h4 className={styles.storeCardName}>{prod.name}</h4>
                        <p className={styles.storeCardDesc}>{prod.desc}</p>
                        {prod.tags && (
                          <div className={styles.storeCardTags}>
                            {prod.tags.map(tag => (
                              <span key={tag} className={styles.storeCardTag}>#{tag}</span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className={styles.storeCardFooter}>
                        <div className={styles.storeCardPriceInfo}>
                          <span className={styles.storeCardPriceLabel}>REDEEM COST</span>
                          <span className={styles.storeCardPrice}>🪙 {prod.price} CR</span>
                        </div>
                        <button 
                          className={styles.storeBuyBtn}
                          onClick={() => handleOrderProduct(prod)}
                        >
                          Bestellen
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* 3. FOOD */}
                <div className={styles.storeCategoryTitle} style={{ marginTop: '3rem' }}>
                  <span>03 — Bio-Adaptive Fuel (Nahrung)</span>
                  <span className={styles.storeCategoryTag}>RAW SOIL-TO-TABLE</span>
                </div>
                <div className={styles.storeGrid}>
                  {STORE_PRODUCTS.food.map(prod => (
                    <div key={prod.id} className={styles.storeCard}>
                      <div className={styles.storeCardTop}>
                        <div className={styles.storeCardHeader}>
                          <span className={styles.storeCardBadge}>{prod.badge}</span>
                          <span className={`${styles.storeCardStatus} ${
                            prod.status === 'AUTO-REFILL' ? styles.statusRefill : 
                            prod.status === 'BEGRENZT' ? styles.statusLimited : styles.statusAvailable
                          }`}>{prod.status}</span>
                        </div>
                        <h4 className={styles.storeCardName}>{prod.name}</h4>
                        <p className={styles.storeCardDesc}>{prod.desc}</p>
                        {prod.tags && (
                          <div className={styles.storeCardTags}>
                            {prod.tags.map(tag => (
                              <span key={tag} className={styles.storeCardTag}>#{tag}</span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className={styles.storeCardFooter}>
                        <div className={styles.storeCardPriceInfo}>
                          <span className={styles.storeCardPriceLabel}>REDEEM COST</span>
                          <span className={styles.storeCardPrice}>🪙 {prod.price} CR</span>
                        </div>
                        <button 
                          className={styles.storeBuyBtn}
                          onClick={() => handleOrderProduct(prod)}
                        >
                          Bestellen
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      case 'connectors':
        return (
          <div className={styles.tabContentGrid}>
            <div className={styles.tabContentMainCol}>
              <div className={styles.panelHeader}>
                <h3 className={styles.panelTitle}>🔌 Konnektoren Konfiguration</h3>
              </div>
              <div className={styles.panelBody}>
                <div className={styles.stackedForm}>
                  <label className={styles.formLabel}>WHOOP Client ID</label>
                  <input 
                    type="text" 
                    className={styles.formInput} 
                    placeholder="whoop_client_xxxx" 
                    value={profile?.connectors?.whoopClientId || ''} 
                    onChange={e => {
                      const conn = { ...(profile?.connectors || {}), whoopClientId: e.target.value };
                      saveProfile({ connectors: conn });
                    }} 
                  />
                  <label className={styles.formLabel} style={{ marginTop: '1.25rem', display: 'block' }}>Notion Integration Token</label>
                  <input 
                    type="password" 
                    className={styles.formInput} 
                    placeholder="secret_notion_xxxx" 
                    value={profile?.connectors?.notionToken || ''} 
                    onChange={e => {
                      const conn = { ...(profile?.connectors || {}), notionToken: e.target.value };
                      saveProfile({ connectors: conn });
                    }} 
                  />
                </div>

                <div className={styles.panelGroup} style={{ marginTop: '2.5rem' }}>
                  <div className={styles.panelGroupLabel}>System-Kopplung</div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text2)', lineHeight: 1.5 }}>
                    Verbinde deine physischen Wearables und externen Wissensdatenbanken direkt mit dem Pronoia Life OS. Die Synchronisation erfolgt im Hintergrund verschlüsselt.
                  </p>
                </div>
              </div>
            </div>

            <div className={styles.tabContentSideCol}>
              <div className={styles.panelHeader}>
                <h3 className={styles.panelTitle}>⚙️ API Terminal Konsole</h3>
              </div>
              <div className={styles.panelBody}>
                <div className={styles.terminalCard}>
                  {terminalLogs.map((log, i) => (
                    <div key={i} className={styles.terminalRow}>{log}</div>
                  ))}
                </div>
                <div className={styles.terminalActions}>
                  <button 
                    type="button" 
                    className={`${styles.terminalBtn} ${styles.terminalBtnGreen}`}
                    onClick={handleWhoopSync}
                    disabled={isSyncingWhoop}
                  >
                    {isSyncingWhoop ? 'Syncing...' : '🔄 Sync WHOOP'}
                  </button>
                  <button 
                    type="button" 
                    className={styles.terminalBtn}
                    onClick={handleNotionExport}
                    disabled={isExportingNotion}
                  >
                    {isExportingNotion ? 'Exporting...' : '📝 Export Notion'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      case 'vault':
        return (
          <div className={styles.tabContentGrid}>
            <div className={styles.tabContentMainCol}>
              <div className={styles.panelHeader}>
                <h3 className={styles.panelTitle}>✦ Context Ingestion</h3>
              </div>
              <div className={styles.panelBody}>
                {vaultToast && <div className={styles.vaultToast}>{vaultToast}</div>}
                <div className={styles.vaultStats} style={{ marginBottom: '1.25rem' }}>
                  <span>{vaultItems.length} Items im Vault</span>
                  <span>{new Set(vaultItems.flatMap(i => i.tags || [])).size} Tags registriert</span>
                </div>
                <div className={styles.stackedForm}>
                  <label className={styles.formLabel}>Typ wählen</label>
                  <select className={styles.formInput} value={vaultForm.type} onChange={e => setVaultForm(f => ({ ...f, type: e.target.value }))}>
                    <option value="note">Note / Text</option>
                    <option value="link">Web Link</option>
                    <option value="youtube">YouTube Video</option>
                    <option value="file">File Reference</option>
                  </select>
                  {vaultForm.type === 'file' && (
                    <div style={{ marginTop: '1rem' }}>
                      <label className={styles.formLabel}>Datei hochladen</label>
                      <input 
                        type="file" 
                        onChange={handleVaultFileUpload} 
                        disabled={uploadingFile}
                        style={{ display: 'block', marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--text)' }} 
                      />
                      {uploadingFile && (
                        <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--theme-accent)' }}>
                          Upload-Status: {uploadProgress}%
                          <div style={{ width: '100%', height: '4px', backgroundColor: 'var(--border)', borderRadius: '2px', marginTop: '4px', overflow: 'hidden' }}>
                            <div style={{ width: `${uploadProgress}%`, height: '100%', backgroundColor: 'var(--theme-accent)', transition: 'width 0.1s ease' }} />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  <label className={styles.formLabel} style={{ marginTop: '1rem', display: 'block' }}>Titel</label>
                  <input type="text" className={styles.formInput} placeholder="Titel…" value={vaultForm.title} onChange={e => setVaultForm(f => ({ ...f, title: e.target.value }))} />
                  <label className={styles.formLabel} style={{ marginTop: '1rem', display: 'block' }}>Inhalt / URL</label>
                  <textarea className={styles.formInput} rows={4} style={{ resize: 'none' }} placeholder="Inhalt / URL…" value={vaultForm.content} onChange={e => setVaultForm(f => ({ ...f, content: e.target.value }))} />
                  <label className={styles.formLabel} style={{ marginTop: '1rem', display: 'block' }}>Tags (kommagetrennt)</label>
                  <input type="text" className={styles.formInput} placeholder="neuroscience, focus, learning…" value={vaultForm.tags} onChange={e => setVaultForm(f => ({ ...f, tags: e.target.value }))} />
                  <button className={styles.formBtn} onClick={handleSaveVaultItem} disabled={vaultSaving} style={{ marginTop: '1.5rem' }}>
                    {vaultSaving ? 'Einspeisen…' : 'INGEST INTO VAULT →'}
                  </button>
                </div>
              </div>
            </div>

            <div className={styles.tabContentSideCol}>
              <div className={styles.panelHeader}>
                <h3 className={styles.panelTitle}>📂 Saved Items</h3>
              </div>
              <div className={styles.panelBody}>
                <div className={styles.vaultTagsRow}>
                  {['all', ...new Set(vaultItems.flatMap(i => i.tags || []))].map(tag => (
                    <button key={tag} className={`${styles.vaultTag} ${vaultFilterTag === tag ? styles.vaultTagActive : ''}`} onClick={() => setVaultFilterTag(tag)}>
                      #{tag}
                    </button>
                  ))}
                </div>
                <div style={{ maxHeight: '500px', overflowY: 'auto', paddingRight: '0.25rem' }}>
                  {vaultLoading ? (
                    <p className={styles.emptyState}>Lade Vault…</p>
                  ) : (
                    (vaultFilterTag === 'all' ? vaultItems : vaultItems.filter(i => (i.tags || []).includes(vaultFilterTag))).map(item => (
                      <div key={item.id} className={styles.vaultCard}>
                        <div className={styles.vaultCardTop}>
                          <span className={styles.vaultType}>{item.type === 'note' ? '✦ note' : item.type === 'link' ? '⌘ link' : item.type === 'youtube' ? '▶ video' : '💾 file'}</span>
                          <button className={styles.vaultDeleteBtn} onClick={() => handleDeleteVaultItem(item.id)}>✕</button>
                        </div>
                        <h4 className={styles.vaultCardTitle}>{item.title}</h4>
                        <p className={styles.vaultCardContent}>{item.content}</p>
                        <div className={styles.vaultCardTags}>
                          {(item.tags || []).map(tag => <span key={tag} className={styles.vaultItemTag} onClick={() => setVaultFilterTag(tag)}>#{tag}</span>)}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      case 'agents':
        return (
          <div className={styles.tabContentGrid}>
            <div className={styles.tabContentMainCol}>
              <div className={styles.panelHeader}>
                <h3 className={styles.panelTitle}>🤖 Consensus Hub</h3>
              </div>
              <div className={styles.panelBody}>
                <div className={styles.consensusBox}>
                  <div className={styles.consensusBadge}>
                    <span className={styles.consensusDot} />
                    Consensus: 6/6 Freigaben
                  </div>
                  <p className={styles.consensusSummary} style={{ marginTop: '1rem', fontSize: '0.85rem' }}>
                    <strong>A.06 Orchestrator:</strong> {currentBlock.insight || 'Alle Subsysteme synchronisiert.'}
                  </p>
                </div>

                <div className={styles.agentsListGrid} style={{ marginTop: '2rem' }}>
                  {AGENTS.map(agent => {
                    const info = getAgentStatus(agent.id);
                    const statusColor = info.status === 'LEADING' ? 'var(--green)' : info.status === 'ACTIVE' ? 'var(--cobalt-bright)' : info.status === 'ALERT' ? 'var(--red)' : 'var(--text3)';
                    return (
                      <div key={agent.id} className={styles.agentCard}>
                        <div className={styles.agentCardTop}>
                          <div>
                            <span className={styles.agentId}>{agent.id}</span>
                            <span className={styles.agentName}>{agent.name}</span>
                          </div>
                          <span className={styles.agentBadge} style={{ color: statusColor, borderColor: statusColor }}>
                            {info.status}
                          </span>
                        </div>
                        <div className={styles.agentRole}>{agent.role}</div>
                        <p className={styles.agentText}>{info.text}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className={styles.tabContentSideCol}>
              <div className={styles.panelHeader}>
                <h3 className={styles.panelTitle}>📜 System-Directives</h3>
              </div>
              <div className={styles.panelBody}>
                {directives.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {directives.map((dir, idx) => (
                      <div key={idx} className={styles.directiveCard} style={{ margin: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.65rem', color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>
                          <span>DIREKTIVE #{directives.length - idx}</span>
                          <span>{dir.timestamp ? new Date(dir.timestamp).toLocaleTimeString('de-DE') : ''}</span>
                        </div>
                        <strong>Anweisung:</strong> {dir.text}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className={styles.emptyState}>Keine Direktiven protokolliert.</p>
                )}
              </div>
            </div>
          </div>
        );
      case 'profile':
        return (
          <div className={styles.tabContentGrid}>
            <div className={styles.tabContentMainCol}>
              <div className={styles.panelHeader}>
                <h3 className={styles.panelTitle}>👤 Bio-Profil Identität</h3>
              </div>
              <div className={styles.panelBody}>
                <div className={styles.profileCard} style={{ marginBottom: '2rem' }}>
                  <img src={profile?.avatar || AVATAR_PRESETS[0].url} alt="Avatar" className={styles.profileAvatar} style={{ width: '64px', height: '64px' }} />
                  <div className={styles.profileInfo}>
                    <div className={styles.profileName} style={{ fontSize: '1.2rem' }}>{profile?.username || 'BioHacker_Alpha'}</div>
                    <div className={styles.profileRank}>{getStandingRank(profile?.skillLevel || 1)}</div>
                    <div className={styles.profileId}>SYSID: {profile?.systemId || 'PX-2026-88'}</div>
                  </div>
                </div>

                <div className={styles.panelGroup}>
                  <div className={styles.panelGroupLabel}>Avatar wählen</div>
                  <div className={styles.avatarGrid} style={{ marginTop: '0.5rem', marginBottom: '2rem' }}>
                    {AVATAR_PRESETS.map((p, i) => (
                      <button key={i} className={`${styles.avatarBtn} ${profile?.avatar === p.url ? styles.avatarBtnActive : ''}`} onClick={() => saveProfile({ avatar: p.url })}>
                        <img src={p.url} alt={p.name} />
                      </button>
                    ))}
                  </div>
                </div>

                <div className={styles.panelGroup}>
                  <div className={styles.panelGroupLabel}>Identitäts-Daten bearbeiten</div>
                  <div className={styles.stackedForm}>
                    <label className={styles.formLabel}>Identitäts-Name</label>
                    <input type="text" className={styles.formInput} value={profile?.username || ''} onChange={e => saveProfile({ username: e.target.value })} />
                    <label className={styles.formLabel} style={{ marginTop: '1rem', display: 'block' }}>Bio-Leitmotiv</label>
                    <textarea className={styles.formInput} rows={3} style={{ resize: 'none' }} value={profile?.bio || ''} onChange={e => saveProfile({ bio: e.target.value })} />
                    <label className={styles.formLabel} style={{ marginTop: '1rem', display: 'block' }}>Fokus Systemklasse</label>
                    <select className={styles.formInput} value={profile?.class || 'Flow Architect'} onChange={e => saveProfile({ class: e.target.value })}>
                      <option>Flow Architect</option>
                      <option>Fuel Scheduler</option>
                      <option>Light & Temperature</option>
                      <option>Load Balancer</option>
                      <option>Habit Enforcer</option>
                      <option>Meta-Agent Orchestrator</option>
                    </select>
                    <label className={styles.formLabel} style={{ marginTop: '1rem', display: 'block' }}>Eigene Avatar-URL</label>
                    <input type="text" className={styles.formInput} placeholder="https://…" value={profile?.avatar || ''} onChange={e => saveProfile({ avatar: e.target.value })} />
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.tabContentSideCol}>
              <div className={styles.panelHeader}>
                <h3 className={styles.panelTitle}>🎛️ System Customizer</h3>
              </div>
              <div className={styles.panelBody}>
                <div className={styles.customizerSection}>
                  
                  {/* Accent selection */}
                  <label className={styles.formLabel}>Accent Farbe</label>
                  <div className={styles.accentPickerGrid} style={{ marginTop: '0.5rem' }}>
                    {['blue', 'green', 'tan', 'amber', 'red', 'pink'].map(acc => (
                      <button
                        key={acc}
                        type="button"
                        className={`${styles.accentPickBtn} ${profile?.customization?.accent === acc ? styles.accentPickActive : ''}`}
                        onClick={() => {
                          const newCust = { ...(profile?.customization || {}), accent: acc };
                          saveProfile({ customization: newCust });
                        }}
                        style={{ '--accent-color': acc === 'blue' ? '#1A6AFF' : acc === 'green' ? '#00C48C' : acc === 'tan' ? '#d5b893' : acc === 'amber' ? '#F5A623' : acc === 'red' ? '#FF4D4D' : '#FF33A8' }}
                      >
                        <span className={styles.accentColorDot} style={{ '--accent-color': acc === 'blue' ? '#1A6AFF' : acc === 'green' ? '#00C48C' : acc === 'tan' ? '#d5b893' : acc === 'amber' ? '#F5A623' : acc === 'red' ? '#FF4D4D' : '#FF33A8' }} />
                        <span style={{ textTransform: 'capitalize' }}>{acc}</span>
                      </button>
                    ))}
                  </div>

                  {/* Mode selection */}
                  <label className={styles.formLabel} style={{ marginTop: '1.5rem', display: 'block' }}>Interface Theme</label>
                  <div className={styles.modePickerGrid} style={{ marginTop: '0.5rem' }}>
                    {[
                      { id: 'serious', label: 'Matte Dark' },
                      { id: 'cyber', label: 'Cyber Glow' },
                      { id: 'mono', label: 'Clinical Slate' }
                    ].map(mode => (
                      <button
                        key={mode.id}
                        type="button"
                        className={`${styles.modePickBtn} ${profile?.customization?.mode === mode.id ? styles.modePickActive : ''}`}
                        onClick={() => {
                          const newCust = { ...(profile?.customization || {}), mode: mode.id };
                          saveProfile({ customization: newCust });
                        }}
                      >
                        {mode.label}
                      </button>
                    ))}
                  </div>

                  {/* Widget layout selection */}
                  <label className={styles.formLabel} style={{ marginTop: '1.5rem', display: 'block' }}>Modular Widgets</label>
                  <div className={styles.layoutPickerList} style={{ marginTop: '0.5rem' }}>
                    {[
                      { key: 'telemetry', label: 'Telemetry Visualizer' },
                      { key: 'directives', label: 'System Directives' },
                      { key: 'friction', label: 'Friction Logger' }
                    ].map(lay => {
                      const isVisible = profile?.customization?.layout?.[lay.key] ?? true;
                      return (
                        <div key={lay.key} className={styles.layoutToggleRow}>
                          <span>{lay.label}</span>
                          <button
                            type="button"
                            className={`${styles.toggleSwitchBtn} ${isVisible ? styles.toggleActive : ''}`}
                            onClick={() => {
                              const newLayout = { ...(profile?.customization?.layout || { telemetry: true, directives: true, friction: true }), [lay.key]: !isVisible };
                              const newCust = { ...(profile?.customization || {}), layout: newLayout };
                              saveProfile({ customization: newCust });
                            }}
                          >
                            {isVisible ? 'ON' : 'OFF'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className={styles.panelGroup} style={{ marginTop: '2.5rem' }}>
                  <div className={styles.panelGroupLabel}>System-Einweisung</div>
                  <button className={styles.formBtn} style={{ width: '100%', background: 'rgba(26,106,255,0.1)', borderColor: 'var(--theme-accent, var(--cobalt-bright))', color: 'var(--theme-accent, var(--cobalt-bright))', marginTop: '0.5rem' }}
                    onClick={() => { setTutorialStep(1); }}>
                    🎓 Tour starten
                  </button>
                </div>

                <div className={styles.panelGroup} style={{ marginTop: '2rem' }}>
                  <div className={styles.panelGroupLabel}>Profil-Status & Tier</div>
                  {[
                    { label: 'Systemklasse', val: profile?.class || 'Flow Architect' },
                    { label: 'Erstellt am', val: profile?.joinedDate || 'Mai 2026' },
                    { label: 'Abo-Plan', val: (profile?.subscriptionTier || 'free').toUpperCase() },
                    { label: 'Telegram ID', val: profile?.telegramId || 'Nicht verknüpft' },
                  ].map(r => (
                    <div key={r.label} className={styles.neuroRow}>
                      <span>{r.label}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text)' }}>{r.val}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className={styles.shell}>
      {/* Sleek Native Window Decoration Frame */}
      <div className={styles.desktopTitleBar}>
        <div className={styles.titleBarLeft}>
          <span className={styles.titleBarDot} style={{ background: '#FF5F56' }} />
          <span className={styles.titleBarDot} style={{ background: '#FFBD2E' }} />
          <span className={styles.titleBarDot} style={{ background: '#27C93F' }} />
        </div>
        <div className={styles.titleBarCenter}>
          🔒 SECURE SYSTEM NODE // PRONOIA LIFE OS v3.2.0 [USER: {profile?.username?.toUpperCase()}]
        </div>
        <div className={styles.titleBarRight}>
          <span className={styles.statusGlowDot} />
          <span>ONLINE SYNC // ACTIVE</span>
        </div>
      </div>

      {linkNotification && (
        <div style={{
          position: 'fixed', top: '90px', left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(0,196,140,0.95)', color: '#fff', border: '1px solid #00c48c',
          padding: '0.75rem 1.5rem', borderRadius: '10px', zIndex: 10000,
          fontFamily: 'var(--font-mono)', fontSize: '0.72rem', letterSpacing: '0.05em',
          boxShadow: '0 10px 30px rgba(0,196,140,0.3)', display: 'flex', alignItems: 'center', gap: '10px',
          backdropFilter: 'blur(10px)'
        }}>
          <span>{linkNotification}</span>
          <button onClick={() => setLinkNotification(null)} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem', outline: 'none' }}>✕</button>
        </div>
      )}

      {/* ═══ SIDEBAR NAVIGATION ═══ */}
      <nav className={styles.sidebar}>
        {/* Logo mark */}
        <div className={styles.sidebarLogo}>
          <span>⊕</span>
        </div>

        {/* Section nav items */}
        <div className={styles.sidebarNav}>
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              className={`${styles.sidebarBtn} ${activeTab === item.id ? styles.sidebarBtnActive : ''}`}
              onClick={() => setActiveTab(item.id)}
              title={item.label}
            >
              <span className={styles.sidebarBtnIcon}>{renderNavIcon(item.id, activeTab === item.id)}</span>
              <span className={styles.sidebarBtnLabel}>{item.label}</span>
            </button>
          ))}
        </div>

        {/* Profile button at bottom */}
        <div className={styles.sidebarBottom}>
          <button
            className={`${styles.sidebarBtn} ${activeTab === 'profile' ? styles.sidebarBtnActive : ''}`}
            onClick={() => setActiveTab('profile')}
            title="Profil"
          >
            <img
              src={profile?.avatar || AVATAR_PRESETS[0].url}
              alt="Avatar"
              className={styles.sidebarAvatar}
            />
            <span className={styles.sidebarBtnLabel}>Profil</span>
          </button>
        </div>
      </nav>

      {/* ═══ MAIN DASHBOARD WORKSPACE ═══ */}
      <main className={styles.main}>

        {/* ─── SYSTEM STATUS BAR ─── */}
        <div className={styles.statusBar}>
          <div className={styles.statusBarLeft}>
            <div className={styles.clockDisplay}>
              <span className={styles.clockHH}>{clockHH}</span>
              <span className={styles.clockColon}>:</span>
              <span className={styles.clockMM}>{clockMM}</span>
              <span className={styles.clockSS}>:{clockSS}</span>
            </div>
            <div className={styles.statusBarInfo}>
              <span className={styles.statusGreeting}>{greeting}</span>
              <span className={styles.statusDate}>{todayStr}</span>
            </div>
          </div>
          <div className={styles.statusBarRight}>
            <div className={styles.focusScoreBadge}>
              <span className={styles.focusScoreNum} style={{ color: focusColor }}>{focusScore}</span>
              <span className={styles.focusScoreLabel}>FOCUS</span>
              <span className={styles.focusScoreTag} style={{ color: focusColor, borderColor: focusColor }}>{focusLabel}</span>
            </div>
            <div className={styles.statusActions}>
              <button
                className={styles.calendarOpenBtn}
                onClick={() => setShowCalendarModal(true)}
                title="Kalender öffnen"
              >
                📅
              </button>
            </div>
          </div>
        </div>

        {/* ─── TAB PANEL CONTENT RENDERER ─── */}
        {renderTabContent()}

      </main>

      {/* ═══ HOLOGRAPHIC INVOICE MODAL ═══ */}
      {activeInvoice && (
        <div className={styles.holoModalOverlay} onClick={() => setActiveInvoice(null)}>
          <div className={styles.holoModal} onClick={e => e.stopPropagation()}>
            <h3 className={styles.holoTitle}>✦ Bestellung Ingestion ✦</h3>
            <p className={styles.holoSub}>PRONOIA SECURE NODE BILLING GATEWAY</p>
            <div className={styles.holoInvoice}>
              <div className={styles.holoRow}>
                <span className={styles.holoLabel}>Order-ID:</span>
                <span className={styles.holoValue}>{activeInvoice.orderId}</span>
              </div>
              <div className={styles.holoRow}>
                <span className={styles.holoLabel}>Produkt:</span>
                <span className={styles.holoValue}>{activeInvoice.item}</span>
              </div>
              <div className={styles.holoRow}>
                <span className={styles.holoLabel}>Wert:</span>
                <span className={styles.holoValue}>{activeInvoice.cost} €</span>
              </div>
              <div className={styles.holoRow}>
                <span className={styles.holoLabel}>Datum:</span>
                <span className={styles.holoValue}>{activeInvoice.date}</span>
              </div>
              <div className={styles.holoRow}>
                <span className={styles.holoLabel}>Log-Sync:</span>
                <span className={styles.holoValue} style={{ color: 'var(--green)' }}>ACTIVE // SUCCESS</span>
              </div>
            </div>
            <button className={styles.holoCloseBtn} onClick={() => setActiveInvoice(null)}>System freigeben</button>
          </div>
        </div>
      )}

      {/* ═══ CALENDAR MODAL ═══ */}
      {showCalendarModal && (
        <div className={styles.modalOverlay} onClick={() => setShowCalendarModal(false)}>
          <div className={styles.calModal} onClick={e => e.stopPropagation()}>
            <button className={styles.modalClose} onClick={() => setShowCalendarModal(false)}>✕</button>
            <div className={styles.calHeader}>
              <h2 className={styles.calTitle}>Zirkadianes Protokoll-Archiv</h2>
              <p className={styles.calSub}>Plane bio-kognitive Tage vorausschauend mit AI Sync.</p>
            </div>
            <div className={styles.calLayout}>
              {/* Calendar grid */}
              <div className={styles.calMain}>
                <div className={styles.calNavRow}>
                  <button className={styles.calNavBtn} onClick={prevMonth}>‹</button>
                  <span className={styles.calMonthLabel}>
                    {currentMonth.toLocaleString('de-DE', { month: 'long', year: 'numeric' }).toUpperCase()}
                  </span>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className={styles.calAiBtn} onClick={generateMonthAI}>AI Sync</button>
                    <button className={styles.calNavBtn} onClick={nextMonth}>›</button>
                  </div>
                </div>
                <div className={styles.calWeekdays}>
                  {WEEKDAYS.map(d => <span key={d}>{d}</span>)}
                </div>
                <div className={styles.calGrid}>
                  {days.map((cell, idx) => {
                    const s = formatDate(cell.date);
                    const isToday = s === dateStrToday;
                    const isActive = s === dateStrSelected;
                    const hasProto = !!calendar[s]?.blocks?.length;
                    return (
                      <div
                        key={idx}
                        className={[
                          styles.calDay,
                          !cell.isCurrent && styles.calDayOther,
                          isToday && styles.calDayToday,
                          isActive && styles.calDayActive,
                          hasProto && styles.calDayHasProto,
                        ].filter(Boolean).join(' ')}
                        onClick={() => selectDate(cell.date)}
                      >
                        <span>{cell.day}</span>
                        {hasProto && <span className={styles.calDayDot} />}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Day detail */}
              <div className={styles.calSidebar}>
                <div className={styles.calSidebarHeader}>
                  <h3>{selectedDate.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })}</h3>
                  <div className={styles.calSidebarActions}>
                    <button className={styles.calSidebarBtn} onClick={handleAddCalendarBlock}>+ Block</button>
                    <button className={styles.calSidebarBtn} onClick={generateDayAI}>AI Sync</button>
                    <button className={styles.calSidebarBtnGreen} onClick={() => { syncToActive(); setShowCalendarModal(false); }}>Sync Active</button>
                  </div>
                </div>
                <div className={styles.calBlocks}>
                  {daySchedule.blocks?.map((block, idx) => (
                    <div key={idx} className={styles.calBlock} style={{ borderLeftColor: block.pillar === 'skills' ? 'var(--amber)' : block.pillar === 'recovery' ? 'var(--cobalt-bright)' : 'var(--green)' }}>
                      <div style={{ flex: 1 }}>
                        <div className={styles.calBlockTitle}>{block.title}</div>
                        <div className={styles.calBlockSub}>{block.rec}</div>
                      </div>
                      <div className={styles.calBlockTime}>{block.startTime || '--:--'}</div>
                      <div className={styles.calBlockBtns}>
                        <button className={styles.calIconBtn} onClick={() => handleEditCalendarBlock(idx, block.title, block.startTime)}>✎</button>
                        <button className={styles.calIconBtn} style={{ color: 'var(--red)' }} onClick={() => deleteCalendarBlock(idx)}>✕</button>
                      </div>
                    </div>
                  ))}
                  {(!daySchedule.blocks || daySchedule.blocks.length === 0) && (
                    <p className={styles.emptyState}>Kein Protokoll für diesen Tag. Nutze AI Sync.</p>
                  )}
                </div>
                <form onSubmit={handleDayChatSubmit} className={styles.calChatForm}>
                  <input type="text" className={styles.calChatInput} placeholder="Tagesplan mit AI anpassen…" value={dayChatInput} onChange={e => setDayChatInput(e.target.value)} disabled={isTyping} />
                  <button type="submit" className={styles.calChatBtn} disabled={isTyping}>Sync</button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ GUIDED TOUR OVERLAY ═══ */}
      {tutorialStep > 0 && (
        <div className={styles.tourOverlay}>
          <div className={`${styles.tourCard} ${tutorialStep === 2 ? styles.tourCardBottomLeft : ''}`}>
            <div className={styles.tourTop}>
              <span className={styles.tourStep}>SCHRITT {tutorialStep} / 7</span>
              <button className={styles.tourClose} onClick={() => { saveProfile({ hasCompletedTutorial: true }); setTutorialStep(0); }}>✕</button>
            </div>
            <h3 className={styles.tourTitle}>
              {['', '⏳ Das Dashboard & Queue', '📅 Zirkadianer Kalender', '📊 Biometrie & Bio-Stack', '⏱️ Der Bio-Chronometer', '💬 AI-Chat & Friction', '💊 Bio-Stack Vorrat', '🤖 6 Agenten-Hub'][tutorialStep]}
            </h3>
            <p className={styles.tourText}>
              {['',
                'Klicke auf das ⏳ Dashboard-Icon im linken Sidebar, um deine Ablauf-Queue auf der rechten Seite des Workspace zu öffnen, vordefinierte Zyklen zu laden oder eigene Blöcke zu erstellen.',
                'Klicke oben rechts im Hauptbereich auf das 📅 Kalender-Icon. Hier kannst du Tage vorausschauend planen und per AI Sync synchronisieren.',
                'Das 📊 Biometrie-Icon im linken Sidebar öffnet den Biometrie-Bereich im Hauptworkspace. Hier verwaltest du HRV, Schlafwerte und siehst dein Bio-Stack.',
                'Der Chronometer in der Mitte des Dashboards ist dein bio-kognitiver Taktgeber. Starte oder pausiere hier deinen aktiven Protokollblock.',
                'Unten im Dashboard siehst du deinen AI-Chat zur Steuerung per Text und den Friction Logger zur Protokollierung deines Fokus-Status.',
                'Im 📊 Biometrie-Bereich findest du auch das Bio-Stack Supplement-Inventar, in dem du Vorräte verwaltest.',
                'Das 🤖 Agenten-Icon im Sidebar zeigt dir die Aktivität und den Consensus-Status deiner 6 kognitiven Sub-Agenten im Hintergrund.'
              ][tutorialStep]}
            </p>
            <div className={styles.tourFooter}>
              <button className={styles.tourSkip} onClick={() => { saveProfile({ hasCompletedTutorial: true }); setTutorialStep(0); }}>Überspringen</button>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {tutorialStep > 1 && <button className={styles.tourBtn} onClick={() => setTutorialStep(p => p - 1)}>Zurück</button>}
                <button className={`${styles.tourBtn} ${styles.tourBtnPrimary}`} onClick={() => tutorialStep < 7 ? setTutorialStep(p => p + 1) : (saveProfile({ hasCompletedTutorial: true }), setTutorialStep(0))}>
                  {tutorialStep < 7 ? 'Weiter' : 'Abschließen'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default function LifeOSPage() {
  return (
    <Suspense fallback={
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9999, background: '#080a0f',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: '#6a7890', letterSpacing: '0.15em', gap: '1.5rem'
      }}>
        <div style={{ width: '36px', height: '36px', border: '2px solid rgba(26,106,255,0.15)', borderTopColor: '#1A6AFF', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        LIFE_OS_INITIALIZING...
      </div>
    }>
      <LifeOSDashboard />
    </Suspense>
  );
}
