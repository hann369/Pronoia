'use client';

import { useState, useEffect, useRef, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useProtocol } from '@/hooks/useProtocol';
import TelemetryVisualizer from '@/components/TelemetryVisualizer';
import styles from './page.module.css';

import { collection, query, orderBy, getDocs, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

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
  { id: 'queue',      icon: '⏳', label: 'Protokoll' },
  { id: 'biometrics', icon: '📊', label: 'Biometrie' },
  { id: 'stack',      icon: '💊', label: 'Bio-Stack' },
  { id: 'vault',      icon: '✦',  label: 'Vault' },
  { id: 'agents',     icon: '🤖', label: 'Agenten' },
];

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
    profile, profileLoading, stack, frictionLogs, dataSources, agentMsg, isTyping, directives,
    calendar, selectedDate, currentMonth, formatDate, selectDate, prevMonth, nextMonth,
    addCalendarBlock, editCalendarBlock, deleteCalendarBlock,
    generateDayAI, generateMonthAI, chatWithDayAI, syncToActive,
    generateSkillMaterials, completeSkillSession,
    toggleTimer, nextBlock, prevBlock, skipBlock, handleCommand, setAgentMsg,
    consumeStackItem, addStackItem, removeStackItem, updateStackItem,
    saveProfile, linkTelegramId, logFriction, loadProtocolQueue, addCustomBlock, uploadDataSource
  } = useProtocol();

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

  /* ─── Drawer Navigation ─── */
  const [activeDrawer, setActiveDrawer] = useState(null);
  const toggleDrawer = (id) => setActiveDrawer(prev => prev === id ? null : id);

  /* ─── Profile Sidebar ─── */
  const [showProfile, setShowProfile] = useState(false);

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

  /* ─── Modals ─── */
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [showSkillLabModal, setShowSkillLabModal] = useState(false);
  const [skillContent, setSkillContent] = useState('');
  const [isGeneratingSkill, setIsGeneratingSkill] = useState(false);
  const [dayChatInput, setDayChatInput] = useState('');

  /* ─── Tutorial ─── */
  const [tutorialStep, setTutorialStep] = useState(0);

  /* ─── Vault ─── */
  const [vaultItems, setVaultItems] = useState([]);
  const [vaultLoading, setVaultLoading] = useState(true);
  const [vaultFilterTag, setVaultFilterTag] = useState('all');
  const [vaultForm, setVaultForm] = useState({ type: 'note', title: '', content: '', tags: '' });
  const [vaultSaving, setVaultSaving] = useState(false);
  const [vaultToast, setVaultToast] = useState('');

  const chatEndRef = useRef(null);

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
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    if (profile && profile.hasCompletedTutorial === false && tutorialStep === 0) {
      const t = setTimeout(() => setTutorialStep(1), 1200);
      return () => clearTimeout(t);
    }
  }, [profile, tutorialStep]);

  // Auto-open UI drawers during onboarding tour
  useEffect(() => {
    if (tutorialStep === 0) return;
    switch (tutorialStep) {
      case 1:
        setActiveDrawer('queue');
        setShowProfile(false);
        setShowCalendarModal(false);
        break;
      case 2:
        setActiveDrawer(null);
        setShowProfile(false);
        setShowCalendarModal(true);
        break;
      case 3:
        setActiveDrawer('biometrics');
        setShowProfile(false);
        setShowCalendarModal(false);
        break;
      case 4:
      case 5:
        setActiveDrawer(null);
        setShowProfile(false);
        setShowCalendarModal(false);
        break;
      case 6:
        setActiveDrawer('stack');
        setShowProfile(false);
        setShowCalendarModal(false);
        break;
      case 7:
        setActiveDrawer('agents');
        setShowProfile(false);
        setShowCalendarModal(false);
        break;
      default:
        break;
    }
  }, [tutorialStep]);

  /* ─── Vault CRUD ─── */
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
    setShowSkillLabModal(true);
    setIsGeneratingSkill(true);
    setSkillContent('');
    const content = await generateSkillMaterials();
    setSkillContent(content);
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
  return (
    <div className={styles.shell}>
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
              className={`${styles.sidebarBtn} ${activeDrawer === item.id ? styles.sidebarBtnActive : ''}`}
              onClick={() => toggleDrawer(item.id)}
              title={item.label}
            >
              <span className={styles.sidebarBtnIcon}>{item.icon}</span>
              <span className={styles.sidebarBtnLabel}>{item.label}</span>
            </button>
          ))}
        </div>

        {/* Profile button at bottom */}
        <div className={styles.sidebarBottom}>
          <button
            className={`${styles.sidebarBtn} ${showProfile ? styles.sidebarBtnActive : ''}`}
            onClick={() => { setShowProfile(p => !p); setActiveDrawer(null); }}
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

      {/* ═══ MAIN DASHBOARD — always visible ═══ */}
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
              <button className={styles.mainNavBtn} onClick={prevBlock}>←</button>
              <button className={styles.mainNavBtn} onClick={skipBlock}>→</button>
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

        {/* Block label under status bar */}
        <div className={styles.blockLabel}>
          <span className={styles.mainHeaderBadge}>{currentBlock.type}</span>
          <h1 className={styles.mainHeaderTitle}>{currentBlock.title}</h1>
        </div>

        {/* ─── CHRONOMETER ─── */}
        <div className={styles.chronoSection}>
          <div className={styles.chronoWrapper}>
            <svg width="240" height="240" className={styles.chronoSvg}>
              <defs>
                <linearGradient id="progGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="var(--cobalt-bright)" />
                  <stop offset="100%" stopColor="var(--tan)" />
                </linearGradient>
              </defs>
              {/* Outer decorative ring */}
              <circle cx="120" cy="120" r="115" className={styles.chronoOuter} />
              {/* Track */}
              <circle cx="120" cy="120" r={radius} className={styles.chronoTrack} />
              {/* Progress arc */}
              <circle
                cx="120" cy="120" r={radius}
                className={styles.chronoProgress}
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
              />
            </svg>
            <div className={styles.chronoCenter}>
              <div className={styles.chronoTime}>{formatTime(timeLeft)}</div>
              <div className={styles.chronoStatus}>{isRunning ? 'AKTIV' : 'PAUSIERT'}</div>
              <button
                className={`${styles.chronoBtn} ${isRunning ? styles.chronoBtnPause : styles.chronoBtnStart}`}
                onClick={toggleTimer}
              >
                {isRunning ? 'PAUSE' : 'START'}
              </button>
            </div>
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

        {/* ─── CURRENT BLOCK INSIGHT ─── */}
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

        {/* ─── FRICTION LOGGER ─── */}
        <div className={styles.frictionRow}>
          <span className={styles.frictionLabel}>Fokus-Status</span>
          <div className={styles.frictionBtns}>
            <button className={`${styles.frictionBtn} ${styles.fbOk}`} onClick={() => logFriction('ok')}>🟢 Stabil</button>
            <button className={`${styles.frictionBtn} ${styles.fbWarn}`} onClick={() => logFriction('warn')}>🟡 Ablenkung</button>
            <button className={`${styles.frictionBtn} ${styles.fbMiss}`} onClick={() => logFriction('miss')}>🔴 Blockade</button>
          </div>
        </div>

        {/* ─── AI COMMAND CHAT ─── */}
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

      </main>

      {/* ═══ SLIDE-IN DRAWER ═══ */}
      {activeDrawer && (
        <>
          <div className={styles.drawerOverlay} onClick={() => setActiveDrawer(null)} />
          <aside className={styles.drawer}>
            <div className={styles.drawerHeader}>
              <h2 className={styles.drawerTitle}>
                {NAV_ITEMS.find(n => n.id === activeDrawer)?.icon}{' '}
                {NAV_ITEMS.find(n => n.id === activeDrawer)?.label}
              </h2>
              <button className={styles.drawerClose} onClick={() => setActiveDrawer(null)}>✕</button>
            </div>
            <div className={styles.drawerBody}>

              {/* ─── QUEUE DRAWER ─── */}
              {activeDrawer === 'queue' && (
                <div className={styles.drawerSection}>
                  {/* Protocol presets */}
                  <div className={styles.drawerGroup}>
                    <div className={styles.drawerGroupLabel}>Protokoll laden</div>
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
                  <div className={styles.drawerGroup}>
                    <div className={styles.drawerGroupLabel}>Aktive Queue ({blocks.length} Blöcke)</div>
                    <div className={styles.queueList}>
                      {blocks.map((block, idx) => (
                        <div key={idx} className={`${styles.queueItem} ${idx === blockIdx ? styles.queueItemActive : ''}`}>
                          <span className={styles.queueNum}>{idx + 1}</span>
                          <div className={styles.queueInfo}>
                            <div className={styles.queueTitle}>{block.title}</div>
                            <div className={styles.queueMeta}>{Math.round(block.duration / 60)} Min · {block.type}</div>
                          </div>
                          {idx === blockIdx && <span className={styles.queueActiveDot} />}
                        </div>
                      ))}
                      {blocks.length === 0 && <p className={styles.emptyState}>Keine Blöcke aktiv.</p>}
                    </div>
                  </div>

                  {/* Add custom block */}
                  <div className={styles.drawerGroup}>
                    <div className={styles.drawerGroupLabel}>Custom Block anlegen</div>
                    <form onSubmit={handleAddBlock} className={styles.stackedForm}>
                      <input type="text" placeholder="Block Title…" className={styles.formInput} value={customTitle} onChange={e => setCustomTitle(e.target.value)} required />
                      <input type="number" placeholder="Dauer in Minuten…" className={styles.formInput} value={customDuration} onChange={e => setCustomDuration(e.target.value)} required />
                      <button type="submit" className={styles.formBtn}>BLOCK ANLEGEN</button>
                    </form>
                  </div>

                  {/* Knowledge Vault trigger */}
                  <div className={styles.drawerGroup}>
                    <div className={styles.drawerGroupLabel}>Kognitiver Kontext</div>
                    <button className={styles.vaultTrigger} onClick={() => { setActiveDrawer('vault'); }}>
                      ✦ Knowledge Vault öffnen
                    </button>
                    <div className={styles.fileUpload}>
                      <span>CSV / JSON einlesen</span>
                      <input type="file" accept=".csv,.json" onChange={e => e.target.files[0] && uploadDataSource(e.target.files[0])} />
                    </div>
                  </div>
                </div>
              )}

              {/* ─── BIOMETRICS DRAWER ─── */}
              {activeDrawer === 'biometrics' && (
                <div className={styles.drawerSection}>
                  <div className={styles.drawerGroup}>
                    <div className={styles.drawerGroupLabel}>Biometrische Indikatoren</div>
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
                      <button type="submit" className={styles.formBtn}>SYNCHRONISIEREN</button>
                    </form>
                  </div>

                  <div className={styles.drawerGroup}>
                    <div className={styles.drawerGroupLabel}>Neuro-Zustände (Live)</div>
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

                  <div className={styles.drawerGroup}>
                    <div className={styles.drawerGroupLabel}>Skill Lab</div>
                    <div className={styles.skillRow}>
                      <input type="text" className={styles.formInput} placeholder="Ziel-Skill…" value={profile?.skill || ''} onChange={e => saveProfile({ skill: e.target.value })} />
                      <input type="number" className={styles.formInput} style={{ width: '80px' }} value={profile?.skillLevel || 1} onChange={e => saveProfile({ skillLevel: parseInt(e.target.value) || 1 })} />
                    </div>
                    <button className={`${styles.formBtn} ${styles.formBtnAmber}`} onClick={handleOpenSkillLab}>
                      🔬 SKILL LAB GENERIEREN
                    </button>
                  </div>

                  <div className={styles.drawerGroup}>
                    <div className={styles.drawerGroupLabel}>Kognitives Level</div>
                    <div className={styles.xpRow}>
                      <span>Level {profile?.skillLevel || 1}</span>
                      <span className={styles.xpLabel}>{profile?.xp || 0} / {profile?.nextLevelXp || 500} XP</span>
                    </div>
                    <div className={styles.xpBar}>
                      <div className={styles.xpFill} style={{ width: `${Math.min(100, ((profile?.xp || 0) / (profile?.nextLevelXp || 500)) * 100)}%` }} />
                    </div>
                  </div>

                  <div className={styles.drawerGroup}>
                    <div className={styles.drawerGroupLabel}>Wochen-Ziele</div>
                    {(profile?.weeklyGoals || []).map((goal, idx) => (
                      <div key={idx} className={styles.goalItem} onClick={() => toggleGoal(idx)}>
                        <input type="checkbox" checked={goal.completed} readOnly className={styles.goalCheck} />
                        <span style={{ textDecoration: goal.completed ? 'line-through' : 'none', color: goal.completed ? 'var(--text3)' : 'var(--text)' }}>{goal.text}</span>
                      </div>
                    ))}
                    <form onSubmit={handleAddGoal} className={styles.goalForm}>
                      <input type="text" placeholder="Neues Ziel…" className={styles.formInput} value={newGoalText} onChange={e => setNewGoalText(e.target.value)} />
                      <button type="submit" className={styles.formBtn} style={{ padding: '0 1rem' }}>+</button>
                    </form>
                  </div>
                </div>
              )}

              {/* ─── STACK DRAWER ─── */}
              {activeDrawer === 'stack' && (
                <div className={styles.drawerSection}>
                  <div className={styles.drawerGroup}>
                    <div className={styles.drawerGroupHeader}>
                      <div className={styles.drawerGroupLabel}>Bio-Stack Inventar</div>
                      <button className={styles.addBtn} onClick={addStackItem}>+ ADD</button>
                    </div>
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

                  {/* Telemetry */}
                  <div className={styles.drawerGroup}>
                    <div className={styles.drawerGroupLabel}>Bio-Kognitive Telemetrie</div>
                    <TelemetryVisualizer timeLeft={timeLeft} totalTime={totalTime} pillar={currentBlock.pillar} />
                  </div>
                </div>
              )}

              {/* ─── VAULT DRAWER ─── */}
              {activeDrawer === 'vault' && (
                <div className={styles.drawerSection}>
                  {vaultToast && <div className={styles.vaultToast}>{vaultToast}</div>}

                  <div className={styles.drawerGroup}>
                    <div className={styles.drawerGroupLabel}>Context Ingestion</div>
                    <div className={styles.vaultStats}>
                      <span>{vaultItems.length} Items</span>
                      <span>{new Set(vaultItems.flatMap(i => i.tags || [])).size} Tags</span>
                    </div>
                    <div className={styles.stackedForm}>
                      <select className={styles.formInput} value={vaultForm.type} onChange={e => setVaultForm(f => ({ ...f, type: e.target.value }))}>
                        <option value="note">Note / Text</option>
                        <option value="link">Web Link</option>
                        <option value="youtube">YouTube Video</option>
                        <option value="file">File Reference</option>
                      </select>
                      <input type="text" className={styles.formInput} placeholder="Titel…" value={vaultForm.title} onChange={e => setVaultForm(f => ({ ...f, title: e.target.value }))} />
                      <textarea className={styles.formInput} rows={3} style={{ resize: 'none' }} placeholder="Inhalt / URL…" value={vaultForm.content} onChange={e => setVaultForm(f => ({ ...f, content: e.target.value }))} />
                      <input type="text" className={styles.formInput} placeholder="Tags: neuroscience, focus…" value={vaultForm.tags} onChange={e => setVaultForm(f => ({ ...f, tags: e.target.value }))} />
                      <button className={styles.formBtn} onClick={handleSaveVaultItem} disabled={vaultSaving}>
                        {vaultSaving ? 'Einspeisen…' : 'INGEST INTO VAULT →'}
                      </button>
                    </div>
                  </div>

                  <div className={styles.drawerGroup}>
                    <div className={styles.drawerGroupLabel}>Gespeicherte Items</div>
                    <div className={styles.vaultTagsRow}>
                      {['all', ...new Set(vaultItems.flatMap(i => i.tags || []))].map(tag => (
                        <button key={tag} className={`${styles.vaultTag} ${vaultFilterTag === tag ? styles.vaultTagActive : ''}`} onClick={() => setVaultFilterTag(tag)}>
                          #{tag}
                        </button>
                      ))}
                    </div>
                    {vaultLoading ? (
                      <p className={styles.emptyState}>Lade Vault…</p>
                    ) : (
                      (vaultFilterTag === 'all' ? vaultItems : vaultItems.filter(i => (i.tags || []).includes(vaultFilterTag))).map(item => (
                        <div key={item.id} className={styles.vaultCard}>
                          <div className={styles.vaultCardTop}>
                            <span className={styles.vaultType}>{item.type === 'note' ? '✦ note' : item.type === 'link' ? '⌘ link' : '▶ video'}</span>
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
              )}

              {/* ─── AGENTS DRAWER ─── */}
              {activeDrawer === 'agents' && (
                <div className={styles.drawerSection}>
                  <div className={styles.drawerGroup}>
                    <div className={styles.consensusBadge}>
                      <span className={styles.consensusDot} />
                      Consensus: 6/6 Freigaben
                    </div>
                    <p className={styles.consensusSummary}>
                      <strong>A.06 Orchestrator:</strong> {currentBlock.insight || 'Alle Subsysteme synchronisiert.'}
                    </p>
                  </div>
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
                  {directives.length > 0 && (
                    <div className={styles.directiveCard}>
                      <strong>Letzte Anweisung:</strong> {directives[0].text}
                    </div>
                  )}
                </div>
              )}

            </div>
          </aside>
        </>
      )}

      {/* ═══ PROFILE PANEL (right-side overlay) ═══ */}
      {showProfile && (
        <>
          <div className={styles.drawerOverlay} onClick={() => setShowProfile(false)} />
          <aside className={styles.drawer}>
            <div className={styles.drawerHeader}>
              <h2 className={styles.drawerTitle}>👤 Bio-Profil</h2>
              <button className={styles.drawerClose} onClick={() => setShowProfile(false)}>✕</button>
            </div>
            <div className={styles.drawerBody}>
              <div className={styles.profileCard}>
                <img src={profile?.avatar || AVATAR_PRESETS[0].url} alt="Avatar" className={styles.profileAvatar} />
                <div className={styles.profileInfo}>
                  <div className={styles.profileName}>{profile?.username || 'BioHacker_Alpha'}</div>
                  <div className={styles.profileRank}>{getStandingRank(profile?.skillLevel || 1)}</div>
                  <div className={styles.profileId}>SYSID: {profile?.systemId || 'PX-2026-88'}</div>
                </div>
              </div>

              <div className={styles.drawerGroup}>
                <div className={styles.drawerGroupLabel}>Avatar wählen</div>
                <div className={styles.avatarGrid}>
                  {AVATAR_PRESETS.map((p, i) => (
                    <button key={i} className={`${styles.avatarBtn} ${profile?.avatar === p.url ? styles.avatarBtnActive : ''}`} onClick={() => saveProfile({ avatar: p.url })}>
                      <img src={p.url} alt={p.name} />
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.drawerGroup}>
                <div className={styles.drawerGroupLabel}>Profil bearbeiten</div>
                <div className={styles.stackedForm}>
                  <label className={styles.formLabel}>Identitäts-Name</label>
                  <input type="text" className={styles.formInput} value={profile?.username || ''} onChange={e => saveProfile({ username: e.target.value })} />
                  <label className={styles.formLabel}>Bio-Leitmotiv</label>
                  <textarea className={styles.formInput} rows={3} style={{ resize: 'none' }} value={profile?.bio || ''} onChange={e => saveProfile({ bio: e.target.value })} />
                  <label className={styles.formLabel}>Fokus Systemklasse</label>
                  <select className={styles.formInput} value={profile?.class || 'Flow Architect'} onChange={e => saveProfile({ class: e.target.value })}>
                    <option>Flow Architect</option>
                    <option>Fuel Scheduler</option>
                    <option>Light & Temperature</option>
                    <option>Load Balancer</option>
                    <option>Habit Enforcer</option>
                    <option>Meta-Agent Orchestrator</option>
                  </select>
                  <label className={styles.formLabel}>Eigene Avatar-URL</label>
                  <input type="text" className={styles.formInput} placeholder="https://…" value={profile?.avatar || ''} onChange={e => saveProfile({ avatar: e.target.value })} />
                </div>
              </div>

              <div className={styles.drawerGroup}>
                <div className={styles.drawerGroupLabel}>System-Einweisung</div>
                <button className={styles.formBtn} style={{ width: '100%', background: 'rgba(26,106,255,0.1)', borderColor: 'var(--cobalt-bright)', color: 'var(--cobalt-bright)' }}
                  onClick={() => { setShowProfile(false); setTutorialStep(1); }}>
                  🎓 Tour starten
                </button>
              </div>

              <div className={styles.drawerGroup}>
                <div className={styles.drawerGroupLabel}>Profil-Daten</div>
                {[
                  { label: 'Systemklasse', val: profile?.class || 'Flow Architect' },
                  { label: 'Erstellt am', val: profile?.joinedDate || 'Mai 2026' },
                  { label: 'Abo-Plan', val: (profile?.subscriptionTier || 'free').toUpperCase() },
                  { label: 'Telegram ID', val: profile?.telegramId || 'Nicht verknüpft' },
                  { label: 'Firebase Projekt', val: db?.app?.options?.projectId || 'nicht initialisiert' },
                ].map(r => (
                  <div key={r.label} className={styles.neuroRow}>
                    <span>{r.label}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text)' }}>{r.val}</span>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </>
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

      {/* ═══ SKILL LAB MODAL ═══ */}
      {showSkillLabModal && (
        <div className={styles.modalOverlay} onClick={() => setShowSkillLabModal(false)}>
          <div className={styles.skillModal} onClick={e => e.stopPropagation()}>
            <button className={styles.modalClose} onClick={() => setShowSkillLabModal(false)}>✕</button>
            <div className={styles.skillModalHeader}>
              <span className={styles.skillModalTag}>Agentic Skill Lab · Level {profile?.skillLevel || 1}</span>
              <h2 className={styles.skillModalTitle}>{profile?.skill || 'Allgemeine Produktivität'} Deliberate Lab</h2>
            </div>
            <div className={styles.skillModalBody}>
              {isGeneratingSkill ? (
                <div className={styles.generatingState}>
                  <div className={styles.generatingSpinner} />
                  <div className={styles.generatingText}>GENERATING_NEURAL_PATHWAYS…</div>
                  <div className={styles.generatingSub}>Skill: {profile?.skill || 'Programmieren'} (Lvl {profile?.skillLevel || 1})</div>
                </div>
              ) : (
                <>
                  <div className={styles.skillContent} dangerouslySetInnerHTML={{ __html: skillContent }} />
                  <button className={styles.skillCompleteBtn} onClick={() => { completeSkillSession(150); setShowSkillLabModal(false); }}>
                    Session Abschließen (+150 XP)
                  </button>
                </>
              )}
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
              {['', '⏳ Die Ablauf-Queue', '📅 Zirkadianer Kalender', '📊 Biometrie & Skill Lab', '⏱️ Der Bio-Chronometer', '💬 AI-Chat & Friction', '💊 Bio-Stack', '🤖 6 Agenten-Hub'][tutorialStep]}
            </h3>
            <p className={styles.tourText}>
              {['',
                'Klicke auf das ⏳ Protokoll-Icon im linken Sidebar, um deine Ablauf-Queue auf der rechten Seite zu öffnen, vordefinierte Zyklen zu laden oder eigene Blöcke zu erstellen.',
                'Klicke oben rechts im Hauptbereich auf das 📅 Kalender-Icon. Hier kannst du Tage vorausschauend planen und per AI Sync synchronisieren.',
                'Das 📊 Biometrie-Icon im linken Sidebar öffnet den Biometrie-Drawer. Hier verwaltest du HRV & Schlafwerte und startest dein AI Skill Lab.',
                'Der Chronometer in der Mitte des Hauptbereichs ist dein bio-kognitiver Taktgeber. Starte oder pausiere hier deinen aktiven Protokollblock.',
                'Unten im Hauptbereich siehst du deinen AI-Chat zur Steuerung per Text und den Friction Logger zur Protokollierung deines Fokus-Status.',
                'Das 💊 Bio-Stack-Icon öffnet das Supplement-Inventar, in dem du Vorräte verwaltest und deine Bio-Telemetrie-Daten einsehen kannst.',
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
