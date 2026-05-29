'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useProtocol } from '@/hooks/useProtocol';
import TelemetryVisualizer from '@/components/TelemetryVisualizer';
import styles from './page.module.css';

const AGENTS = [
  { id: 'A.01', name: 'Neuro-Cognitive', role: 'FLOW ARCHITECT' },
  { id: 'A.02', name: 'Metabolic Director', role: 'FUEL SCHEDULER' },
  { id: 'A.03', name: 'Circadian Guardian', role: 'LIGHT & TEMPERATURE' },
  { id: 'A.04', name: 'Recovery Conductor', role: 'LOAD BALANCER' },
  { id: 'A.05', name: 'Behavioral Anchor', role: 'HABIT ENFORCER' },
  { id: 'A.06', name: 'Orchestrator', role: 'META-AGENT' }
];

const WEEKDAYS = ['MO', 'DI', 'MI', 'DO', 'FR', 'SA', 'SO'];

export default function ProtocolPage() {
  const { user } = useAuth();
  const {
    blocks,
    blockIdx,
    timeLeft,
    totalTime,
    isRunning,
    profile,
    stack,
    frictionLogs,
    dataSources,
    agentMsg,
    isTyping,
    directives,
    calendar,
    selectedDate,
    currentMonth,
    formatDate,
    selectDate,
    prevMonth,
    nextMonth,
    addCalendarBlock,
    editCalendarBlock,
    deleteCalendarBlock,
    generateDayAI,
    generateMonthAI,
    chatWithDayAI,
    syncToActive,
    generateSkillMaterials,
    completeSkillSession,
    start,
    pause,
    toggleTimer,
    nextBlock,
    prevBlock,
    skipBlock,
    handleCommand,
    setAgentMsg,
    consumeStackItem,
    addStackItem,
    removeStackItem,
    updateStackItem,
    saveProfile,
    logFriction,
    loadProtocolQueue,
    addCustomBlock,
    uploadDataSource
  } = useProtocol();

  const [leftTab, setLeftTab] = useState('queue'); // 'queue' | 'personal'
  const [messages, setMessages] = useState([
    { role: 'agent', text: 'System-Performance aktiv. Bereit für kognitives Laden.' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [customDuration, setCustomDuration] = useState('30');
  const [newGoalText, setNewGoalText] = useState('');
  
  // Biometric edits
  const [editHrv, setEditHrv] = useState('');
  const [editSleep, setEditSleep] = useState('');

  // Modals state
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [showSkillLabModal, setShowSkillLabModal] = useState(false);
  const [skillContent, setSkillContent] = useState('');
  const [isGeneratingSkill, setIsGeneratingSkill] = useState(false);
  const [dayChatInput, setDayChatInput] = useState('');

  const chatEndRef = useRef(null);

  // Sync edit states on initial load
  useEffect(() => {
    if (profile?.metrics) {
      setEditHrv(profile.metrics.hrv?.toString() || '72');
      setEditSleep(profile.metrics.sleep?.toString() || '84');
    }
  }, [profile]);

  // Sync AgentMsg
  useEffect(() => {
    if (agentMsg) {
      setMessages(prev => {
        if (prev[prev.length - 1]?.text === agentMsg) return prev;
        return [...prev, { role: 'agent', text: agentMsg }];
      });
    }
  }, [agentMsg]);

  // Scroll to chat bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSendChat = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg = { role: 'user', text: chatInput };
    setMessages(prev => [...prev, userMsg]);
    const promptToSend = chatInput;
    setChatInput('');

    await handleCommand(promptToSend);
  };

  const handleAddGoal = (e) => {
    e.preventDefault();
    if (!newGoalText.trim()) return;
    const updatedGoals = [
      ...(profile.weeklyGoals || []),
      { text: newGoalText, completed: false }
    ];
    saveProfile({ weeklyGoals: updatedGoals });
    setNewGoalText('');
  };

  const toggleGoal = (idx) => {
    const updatedGoals = (profile.weeklyGoals || []).map((g, i) => {
      if (i === idx) return { ...g, completed: !g.completed };
      return g;
    });
    saveProfile({ weeklyGoals: updatedGoals });
  };

  const handleSaveMetrics = (e) => {
    e.preventDefault();
    const hrvNum = parseInt(editHrv) || 70;
    const sleepNum = parseInt(editSleep) || 80;
    saveProfile({
      metrics: { hrv: hrvNum, sleep: sleepNum }
    });
  };

  const handleAddBlock = (e) => {
    e.preventDefault();
    if (!customTitle.trim()) return;
    const durationMins = parseInt(customDuration) || 30;
    addCustomBlock(customTitle, durationMins, 'Focus', 'focus');
    setCustomTitle('');
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      uploadDataSource(file);
    }
  };

  // --- Dynamic Calendar Grid logic ---
  const getDaysInMonth = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sunday
    const totalDays = new Date(year, month + 1, 0).getDate();
    
    // Adjust for Monday start (0=Mon, 6=Sun)
    let startPadding = firstDayIndex === 0 ? 6 : firstDayIndex - 1;
    
    const dayCells = [];
    const prevMonthDays = new Date(year, month, 0).getDate();
    
    // Previous Month padding days
    for (let i = startPadding - 1; i >= 0; i--) {
      dayCells.push({ day: prevMonthDays - i, isCurrent: false, date: new Date(year, month - 1, prevMonthDays - i) });
    }
    
    // Current Month days
    for (let d = 1; d <= totalDays; d++) {
      dayCells.push({ day: d, isCurrent: true, date: new Date(year, month, d) });
    }
    
    // Next Month padding days
    const totalCells = dayCells.length;
    const endPadding = 42 - totalCells;
    for (let i = 1; i <= endPadding; i++) {
      dayCells.push({ day: i, isCurrent: false, date: new Date(year, month + 1, i) });
    }
    
    return dayCells;
  };

  const days = getDaysInMonth();
  const dateStrSelected = formatDate(selectedDate);
  const dateStrToday = formatDate(new Date());

  // Current selected day's blocks
  const selectedDateStr = formatDate(selectedDate);
  const daySchedule = calendar[selectedDateStr] || { blocks: [] };

  const handleAddCalendarBlock = () => {
    const t = prompt("Titel des neuen Blocks / Block Title:");
    if (!t) return;
    const time = prompt("Startzeit (HH:MM) / Start time:", "12:00");
    addCalendarBlock(t, time);
  };

  const handleEditCalendarBlock = (idx, currentTitle, currentTime) => {
    const newTitle = prompt("Titel anpassen / Edit title:", currentTitle);
    const newTime = prompt("Startzeit anpassen / Edit start time (HH:MM):", currentTime);
    editCalendarBlock(idx, { 
      title: newTitle !== null ? newTitle : currentTitle,
      startTime: newTime !== null ? newTime : currentTime
    });
  };

  const handleDayChatSubmit = async (e) => {
    e.preventDefault();
    if (!dayChatInput.trim()) return;
    await chatWithDayAI(dayChatInput);
    setDayChatInput('');
  };

  // --- Skill Lab triggers ---
  const handleOpenSkillLab = async () => {
    setShowSkillLabModal(true);
    setIsGeneratingSkill(true);
    setSkillContent('');
    const content = await generateSkillMaterials();
    setSkillContent(content);
    setIsGeneratingSkill(false);
  };

  const handleCompleteSkillSession = () => {
    completeSkillSession(150);
    setShowSkillLabModal(false);
  };

  // SVG Circular progress computation
  const radius = 88;
  const circumference = 2 * Math.PI * radius; // ~552.92
  const progressRatio = totalTime > 0 ? (timeLeft / totalTime) : 0;
  const strokeDashoffset = circumference - progressRatio * circumference;

  const formatTime = (s) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const currentBlock = blocks[blockIdx] || {
    title: 'Kein aktiver Block',
    type: 'Focus',
    pillar: 'focus',
    rec: 'Keine Empfehlungen geladen.',
    insight: 'Initialisiere das Pronoia System.'
  };

  // Advanced Neuro-State Calculations
  const prog = totalTime > 0 ? 1 - timeLeft / totalTime : 0;
  let ltpPotential = 45;
  let plasticity = 50;
  
  if (currentBlock.pillar === 'skills') {
    ltpPotential = Math.min(98, Math.round(70 + prog * 28));
    plasticity = Math.min(95, Math.round(60 + prog * 35));
  } else if (currentBlock.pillar === 'focus') {
    ltpPotential = Math.min(85, Math.round(50 + prog * 20));
    plasticity = Math.min(90, Math.round(55 + prog * 25));
  } else {
    ltpPotential = Math.max(20, Math.round(50 - prog * 30));
    plasticity = Math.max(30, Math.round(60 - prog * 20));
  }

  // Dynamic Agent Status Mapping for consensus reporting
  const getAgentStatus = (agentId) => {
    const isFocus = currentBlock.pillar === 'focus';
    const isSkills = currentBlock.pillar === 'skills';
    const isRecovery = currentBlock.pillar === 'recovery';
    const isHealth = currentBlock.pillar === 'health';

    const recentFriction = frictionLogs.length > 0 && (Date.now() - frictionLogs[frictionLogs.length - 1].timestamp < 60000);
    const lastFrictionStatus = frictionLogs.length > 0 ? frictionLogs[frictionLogs.length - 1].status : null;

    switch (agentId) {
      case 'A.01':
        if (isFocus) return { status: 'LEADING', text: 'Kognitiver Fokus-Index: 94% (Optimal) - Notification-Filter aktiv.' };
        return { status: 'MONITORING', text: 'Bereitschaft hoch. Überwacht kognitive Baseline.' };
      
      case 'A.02':
        if (currentBlock.title?.toLowerCase().includes('stack') || currentBlock.title?.toLowerCase().includes('mahlzeit') || currentBlock.title?.toLowerCase().includes('protein')) {
          return { status: 'LEADING', text: 'PX-V1 Nootropic Absorption Peak: 78%. Biosynthese nominal.' };
        }
        if (isHealth) return { status: 'ACTIVE', text: 'Glukosespiegel: 92 mg/dL (Stabil). Lipolyse initiiert.' };
        return { status: 'MONITORING', text: 'Glukose & Insulin stabil. Stoffwechsel nominal.' };
      
      case 'A.03':
        if (currentBlock.title?.toLowerCase().includes('sleep') || currentBlock.title?.toLowerCase().includes('evening') || currentBlock.title?.toLowerCase().includes('sunset') || currentBlock.title?.toLowerCase().includes('detox')) {
          return { status: 'LEADING', text: 'Circadian Gate: OFFEN. Melatonin-Synthese aktiv. Licht: Rotbereich.' };
        }
        if (currentBlock.title?.toLowerCase().includes('cold') || currentBlock.title?.toLowerCase().includes('morning')) {
          return { status: 'LEADING', text: 'Zirkadiane Phasenverschiebung. Noradrenalin-Peak erzwungen.' };
        }
        return { status: 'MONITORING', text: 'Licht-Synchronisation nominal. Phasen-Sync aktiv.' };
      
      case 'A.04':
        if (isRecovery) return { status: 'LEADING', text: 'PNS-Aktivierung aktiv. HRV steigt. Cortisol sinkt.' };
        if (profile?.metrics?.hrv < 60) return { status: 'ALERT', text: 'HRV niedrig! Sympathikotonus erhöht. NSDR empfohlen.' };
        return { status: 'MONITORING', text: `HRV: ${profile?.metrics?.hrv || 72}ms. Regeneration voll im Plan.` };
      
      case 'A.05':
        if (recentFriction && (lastFrictionStatus === 'warn' || lastFrictionStatus === 'miss')) {
          return { status: 'ACTIVE', text: 'Friction detektiert! Anpassung kognitiver Barrieren läuft.' };
        }
        if (isSkills) return { status: 'LEADING', text: 'Neuroplastisches Lernen aktiv. Deliberate Practice läuft.' };
        return { status: 'MONITORING', text: 'Habit-Adhärenz hoch. Verhaltens-Vertrag stabil.' };
      
      case 'A.06':
        return { status: 'SUPERVISING', text: `Consensus nominal. Steuert Ablaufplan: ${currentBlock.title}.` };
      default:
        return { status: 'MONITORING', text: 'Aktiv.' };
    }
  };

  return (
    <div className={styles.container}>
      {/* ─── LEFT PANEL: SCHEDULE & PROFILE ─── */}
      <aside className={styles.leftPanel}>
        <nav className={styles.tabHeader}>
          <button 
            className={`${styles.tabBtn} ${leftTab === 'queue' ? styles.tabBtnActive : ''}`} 
            onClick={() => setLeftTab('queue')}
          >
            Ablaufplan
          </button>
          <button 
            className={`${styles.tabBtn} ${leftTab === 'personal' ? styles.tabBtnActive : ''}`} 
            onClick={() => setLeftTab('personal')}
          >
            Biometrie
          </button>
        </nav>

        {leftTab === 'queue' ? (
          <div>
            {/* Interactive Calendar Trigger Card */}
            <div className={styles.card}>
              <span className={styles.panelTitle}>
                <span>📅</span> Zirkadianer Kalender
              </span>
              <button 
                type="button"
                className={styles.calendarTriggerBtn}
                onClick={() => setShowCalendarModal(true)}
              >
                📅 ARCHIV & AI KALENDER ÖFFNEN
              </button>
              
              <div className={styles.calendarGrid} style={{ marginTop: '0.8rem' }}>
                <button className={styles.calendarBtn} onClick={() => loadProtocolQueue('focus_optimization')}>
                  🧠 Focus Opt.
                </button>
                <button className={styles.calendarBtn} onClick={() => loadProtocolQueue('high_performance')}>
                  ⚡ High Perf.
                </button>
                <button className={styles.calendarBtn} onClick={() => loadProtocolQueue('metabolic_rest')}>
                  💤 Metabolic
                </button>
                <button className={styles.calendarBtn} onClick={() => loadProtocolQueue('emergency_recovery')}>
                  🛡️ Recovery
                </button>
                <button className={styles.calendarBtn} onClick={() => loadProtocolQueue('physical_training')}>
                  🏋️ Physical
                </button>
              </div>
            </div>

            {/* Workflow Optimization Nudge Card based on HRV biometrics */}
            {profile?.metrics?.hrv < 60 && (
              <div className={styles.optCard}>
                <span className={styles.panelTitle} style={{ color: 'var(--tan)', marginBottom: '0.5rem' }}>
                  <span>⚡</span> Workflow-Optimierung
                </span>
                <p style={{ fontSize: '0.7rem', lineHeight: '1.4', margin: 0, color: 'var(--text2)' }}>
                  <strong>Recovery Conductor:</strong> Erhöhter sympathischer Tonus (HRV: {profile.metrics.hrv}ms). Das Pronoia System empfiehlt eine präventive Anpassung deiner Ablauf-Queue zur Vermeidung von kognitivem Fatigue.
                </p>
                <button 
                  type="button" 
                  className={styles.optBtn} 
                  onClick={() => {
                    loadProtocolQueue('emergency_recovery');
                  }}
                >
                  RECOVERY-WORKFLOW LADEN
                </button>
              </div>
            )}

            {/* Active protocol block lists */}
            <div className={styles.card}>
              <span className={styles.panelTitle}>
                <span>⏳</span> Aktive Ablauf-Queue
              </span>
              <div className={styles.queueList}>
                {blocks.map((block, idx) => (
                  <div 
                    key={idx} 
                    className={`${styles.queueItem} ${idx === blockIdx ? styles.queueItemActive : ''}`}
                  >
                    <span className={styles.queueIndex}>{idx + 1}</span>
                    <div className={styles.queueMeta}>
                      <div className={styles.queueTitle}>{block.title}</div>
                      <span className={styles.queueDuration}>{Math.round(block.duration / 60)} Min • {block.type}</span>
                    </div>
                    <span 
                      className={`${styles.queueIndicator} ${idx === blockIdx ? styles.queueIndicatorActive : ''}`} 
                    />
                  </div>
                ))}
                {blocks.length === 0 && <p className="dim text-xs">Keine Ablauf-Blöcke aktiv.</p>}
              </div>
            </div>

            {/* Custom Block Adder */}
            <div className={styles.card}>
              <span className={styles.panelTitle}>
                <span>➕</span> Custom Focus Block
              </span>
              <form onSubmit={handleAddBlock}>
                <div className={styles.formGroup}>
                  <input 
                    type="text" 
                    placeholder="Block Title..." 
                    className={styles.formInput}
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    required
                  />
                </div>
                <div className={styles.formGroup}>
                  <input 
                    type="number" 
                    placeholder="Dauer in Minuten..." 
                    className={styles.formInput}
                    value={customDuration}
                    onChange={(e) => setCustomDuration(e.target.value)}
                    required
                  />
                </div>
                <button type="submit" className={styles.formBtn}>BLOCK ANLEGEN</button>
              </form>
            </div>

            {/* Spatial Context Data Ingest */}
            <div className={styles.card}>
              <span className={styles.panelTitle}>
                <span>🧬</span> Kognitiver Kontext
              </span>
              <div className={styles.fileUploader}>
                <span className={styles.uploaderText}>CSV / JSON Daten einlesen</span>
                <input type="file" accept=".csv,.json" onChange={handleFileChange} />
              </div>
              <div className={styles.dataSourceList}>
                {dataSources.map((src, i) => (
                  <div key={i} className={styles.dataSourceItem}>
                    <span>{src.name}</span>
                    <span className="dim">{src.size} • {src.date}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div>
            {/* Weekly goals */}
            <div className={styles.card}>
              <span className={styles.panelTitle}>
                <span>🎯</span> Wochen-Ziele
              </span>
              <div style={{ marginBottom: '1rem' }}>
                {(profile.weeklyGoals || []).map((goal, idx) => (
                  <div key={idx} className={styles.goalItem} onClick={() => toggleGoal(idx)}>
                    <input 
                      type="checkbox" 
                      checked={goal.completed} 
                      className={styles.goalCheck}
                      readOnly 
                    />
                    <span className={goal.completed ? styles.goalTextDone : ''}>{goal.text}</span>
                  </div>
                ))}
              </div>
              <form onSubmit={handleAddGoal} style={{ display: 'flex', gap: '0.5rem' }}>
                <input 
                  type="text" 
                  placeholder="Neues Ziel..." 
                  className={styles.formInput} 
                  style={{ flex: 1 }}
                  value={newGoalText}
                  onChange={(e) => setNewGoalText(e.target.value)}
                />
                <button type="submit" className={styles.formBtn} style={{ padding: '0 0.8rem' }}>+</button>
              </form>
            </div>

            {/* Health parameters */}
            <div className={styles.card}>
              <span className={styles.panelTitle}>
                <span>📊</span> Biometrische Indikatoren
              </span>
              <form onSubmit={handleSaveMetrics}>
                <div className={styles.metricsGrid}>
                  <div className={styles.metricInputCard}>
                    <div className={styles.metricInputVal}>{profile.metrics?.hrv || 72}</div>
                    <span className="label-mono" style={{ fontSize: '0.55rem', display: 'block', color: 'var(--text3)' }}>HRV (ms)</span>
                    <input 
                      type="number" 
                      className={styles.formInput} 
                      style={{ width: '100%', marginTop: '0.4rem', textAlign: 'center' }} 
                      value={editHrv}
                      onChange={(e) => setEditHrv(e.target.value)}
                    />
                  </div>
                  <div className={styles.metricInputCard}>
                    <div className={styles.metricInputVal}>{profile.metrics?.sleep || 84}</div>
                    <span className="label-mono" style={{ fontSize: '0.55rem', display: 'block', color: 'var(--text3)' }}>Sleep Score</span>
                    <input 
                      type="number" 
                      className={styles.formInput} 
                      style={{ width: '100%', marginTop: '0.4rem', textAlign: 'center' }} 
                      value={editSleep}
                      onChange={(e) => setEditSleep(e.target.value)}
                    />
                  </div>
                </div>
                <button type="submit" className={styles.formBtn} style={{ width: '100%', marginTop: '0.8rem' }}>SYNCHRONISIEREN</button>
              </form>
            </div>

            {/* Adaptive Deliberate Skill Lab Focus Panel */}
            <div className={styles.card}>
              <span className={styles.panelTitle}>
                <span>🧪</span> Adaptive Skill Lab
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.5rem', marginBottom: '0.8rem' }}>
                <div>
                  <label className="label-mono" style={{ fontSize: '0.5rem', color: 'var(--text3)', display: 'block', marginBottom: '0.2rem' }}>Ziel-Skill</label>
                  <input 
                    type="text" 
                    className={styles.formInput} 
                    style={{ width: '100%', padding: '0.3rem 0.5rem', fontSize: '0.75rem' }} 
                    value={profile.skill || 'Programmieren'}
                    onChange={(e) => saveProfile({ skill: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label-mono" style={{ fontSize: '0.5rem', color: 'var(--text3)', display: 'block', marginBottom: '0.2rem' }}>Skill Lvl</label>
                  <input 
                    type="number" 
                    className={styles.formInput} 
                    style={{ width: '100%', padding: '0.3rem 0.5rem', fontSize: '0.75rem' }} 
                    value={profile.skillLevel || 1}
                    onChange={(e) => saveProfile({ skillLevel: parseInt(e.target.value) || 1 })}
                  />
                </div>
              </div>
              <button 
                type="button" 
                className={styles.formBtn} 
                style={{ width: '100%', background: 'rgba(245, 166, 35, 0.1)', borderColor: 'var(--amber)', color: 'var(--amber)', fontWeight: '600' }}
                onClick={handleOpenSkillLab}
              >
                🔬 SKILL LAB GENERIEREN
              </button>
            </div>

            {/* XP Level progression */}
            <div className={styles.card}>
              <span className={styles.panelTitle}>
                <span>🏆</span> Kognitives Level
              </span>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontFamily: 'var(--font-mono)' }}>
                <span>Level {profile.skillLevel}</span>
                <span className="dim">{profile.xp} / {profile.nextLevelXp} XP</span>
              </div>
              <div className={styles.xpBar}>
                <div 
                  className={styles.xpFill} 
                  style={{ width: `${Math.min(100, (profile.xp / profile.nextLevelXp) * 100)}%` }} 
                />
              </div>
              <p className="dim text-xs" style={{ fontSize: '0.65rem', lineHeight: '1.3', marginTop: '0.4rem' }}>
                Jeder abgeschlossene Deep Work- oder Skill-Block lädt dein Level. Höhere Levels schalten neuronale Empfehlungen frei.
              </p>
            </div>
          </div>
        )}
      </aside>

      {/* ─── CENTER PANEL: RING TIMER & TELEMETRY & CHAT ─── */}
      <main className={styles.centerPanel}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-s)', paddingBottom: '0.75rem' }}>
          <div>
            <span className="badge badge-cobalt" style={{ textTransform: 'uppercase' }}>{currentBlock.type}</span>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '700', fontFamily: 'var(--font-display)', marginTop: '0.2rem' }}>{currentBlock.title}</h3>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn-ghost" style={{ padding: '0.3rem 0.6rem', fontSize: '0.65rem' }} onClick={prevBlock}>ZURÜCK</button>
            <button className="btn-ghost" style={{ padding: '0.3rem 0.6rem', fontSize: '0.65rem' }} onClick={skipBlock}>SKIP</button>
          </div>
        </div>

        {/* Circular SVG ring timer */}
        <div className={styles.timerWrapper}>
          <svg width="220" height="220" className={styles.timerSvg}>
            <circle cx="110" cy="110" r={radius} className={styles.timerTrack} />
            <circle 
              cx="110" 
              cy="110" 
              r={radius} 
              className={styles.timerProgress} 
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
            />
          </svg>
          <div className={styles.timerCenter}>
            <div className={styles.timerDigits}>{formatTime(timeLeft)}</div>
            <div className={styles.timerStatus}>{isRunning ? 'System Aktiv' : 'Pausiert'}</div>
          </div>
          
          <div className={styles.timerControls}>
            <button 
              className="btn-primary" 
              style={{ padding: '0.5rem 1.5rem', borderRadius: '50px', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}
              onClick={toggleTimer}
            >
              {isRunning ? 'PAUSIEREN' : 'STARTEN'}
            </button>
          </div>
        </div>

        {/* Friction Logger triggers */}
        <div className={styles.card}>
          <span className={styles.panelTitle}>
            <span>⚡</span> Fokus-Friction Logger
          </span>
          <div className={styles.frictionBtnGroup}>
            <button className={`${styles.frictionBtn} ${styles.frictionBtnOk}`} onClick={() => logFriction('ok')}>
              🟢 Stabil (OK)
            </button>
            <button className={`${styles.frictionBtn} ${styles.frictionBtnWarn}`} onClick={() => logFriction('warn')}>
              🟡 Ablenkung (WARN)
            </button>
            <button className={`${styles.frictionBtn} ${styles.frictionBtnMiss}`} onClick={() => logFriction('miss')}>
              🔴 Blockade (MISS)
            </button>
          </div>
        </div>

        {/* Telemetry Visualizer canvas charts */}
        <div className={styles.card} style={{ padding: '1rem' }}>
          <span className={styles.panelTitle}>
            <span>📈</span> Bio-Kognitive Telemetrie
          </span>
          <TelemetryVisualizer 
            timeLeft={timeLeft} 
            totalTime={totalTime} 
            pillar={currentBlock.pillar} 
          />
        </div>

        {/* Live chat command intelligence */}
        <div className={styles.chatBox}>
          <div className={styles.messageArea}>
            {messages.map((msg, i) => (
              <div 
                key={i} 
                className={`${styles.chatMessage} ${msg.role === 'agent' ? styles.chatMsgAgent : styles.chatMsgUser}`}
              >
                {msg.text}
              </div>
            ))}
            {isTyping && (
              <div className={`${styles.chatMessage} ${styles.chatMsgAgent}`}>
                System analysiert...
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
          <form className={styles.chatInputArea} onSubmit={handleSendChat}>
            <input 
              type="text" 
              placeholder="Systembefehl senden... (e.g. 'pause', 'starte block 2', 'ersetze block durch Meditation 15')" 
              className={styles.chatInput}
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              disabled={isTyping}
            />
            <button type="submit" className={styles.chatSendBtn} disabled={isTyping}>
              SEND
            </button>
          </form>
        </div>
      </main>

      {/* ─── RIGHT PANEL: BIO-STACK & RECOMMENDATIONS ─── */}
      <aside className={styles.rightPanel}>
        {/* Consumable Bio-Stack replenishment */}
        <div className={styles.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <span className={styles.panelTitle} style={{ marginBottom: 0 }}>
              <span>💊</span> Bio-Stack
            </span>
            <button className={styles.stackActionBtn} onClick={addStackItem}>+ ADD</button>
          </div>
          <div className={styles.stackList}>
            {stack.map((item, idx) => (
              <div key={idx} className={styles.stackItem}>
                <div className={styles.stackHeader}>
                  <span className={styles.stackTitle}>{item.name}</span>
                  <span className={styles.stackDose}>{item.dose} • {item.timing}</span>
                </div>
                <div className={styles.stackSupplyRow}>
                  <div className={styles.stackSupplyBar}>
                    <div 
                      className={styles.stackSupplyFill} 
                      style={{ 
                        width: `${item.supply}%`,
                        backgroundColor: item.supply < 30 ? '#ff4b4b' : item.supply < 60 ? '#d4a574' : '#00c48c' 
                      }} 
                    />
                  </div>
                  <span className={styles.stackSupplyText}>{item.supply}%</span>
                  <button className={styles.stackActionBtn} onClick={() => consumeStackItem(idx)}>
                    KONSUM
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Neuro-States tracking */}
        <div className={styles.card}>
          <span className={styles.panelTitle}>
            <span>🧬</span> Neuro-Zustände
          </span>
          <div className={styles.neuroRow}>
            <span>LTP Potential:</span>
            <span className={styles.neuroValue}>{ltpPotential}%</span>
          </div>
          <div className={styles.neuroRow}>
            <span>Plasticity Index:</span>
            <span className={styles.neuroValue}>{plasticity}%</span>
          </div>
          <div className={styles.neuroRow}>
            <span>Circadian Gate:</span>
            <span className={styles.neuroValue} style={{ color: '#00c48c' }}>Offen</span>
          </div>
        </div>

        {/* ═══ AGENTEN-KONSOLE (6 AGENTS HUB) ═══ */}
        <div className={styles.card} style={{ borderLeft: '3px solid var(--cobalt-bright)' }}>
          <span className={styles.panelTitle}>
            <span>🤖</span> System-Intelligence
          </span>
          
          <div className={styles.consensusOrchestrator}>
            <div className={styles.consensusBadge}>
              <span className={styles.pulsingDotGreen} />
              Consensus: 6/6 Freigaben
            </div>
            <p className={styles.consensusSummary}>
              <strong>A.06 Orchestrator:</strong> "{currentBlock.rec ? `${currentBlock.title} freigegeben. ` : ''}{currentBlock.insight || 'Alle biologischen Subsysteme synchronisiert.'}"
            </p>
          </div>

          <div className={styles.agentStatusList}>
            {AGENTS.map((agent) => {
              const info = getAgentStatus(agent.id);
              let cardClass = styles.agentMiniCard;
              let badgeClass = styles.badgeMonitoring;
              let statusLabel = 'MONITORING';

              if (info.status === 'LEADING') {
                cardClass = `${styles.agentMiniCard} ${styles.agentMiniCardLeading}`;
                badgeClass = styles.badgeLeading;
                statusLabel = 'LEADING';
              } else if (info.status === 'ACTIVE') {
                cardClass = `${styles.agentMiniCard} ${styles.agentMiniCardActive}`;
                badgeClass = styles.badgeActive;
                statusLabel = 'ACTIVE';
              } else if (info.status === 'SUPERVISING') {
                cardClass = `${styles.agentMiniCard} ${styles.agentMiniCardActive}`;
                badgeClass = styles.badgeSupervising;
                statusLabel = 'SUPERVISING';
              } else if (info.status === 'ALERT') {
                cardClass = `${styles.agentMiniCard} ${styles.agentMiniCardAlert}`;
                badgeClass = styles.badgeAlert;
                statusLabel = 'ALERT';
              }

              return (
                <div key={agent.id} className={cardClass}>
                  <div className={styles.agentMiniCardTop}>
                     <div className={styles.agentMiniMeta}>
                       <span className={styles.agentMiniId}>{agent.id}</span>
                       <span className={styles.agentMiniName}>{agent.name}</span>
                     </div>
                     <span className={`${styles.agentMiniBadge} ${badgeClass}`}>
                       {statusLabel}
                     </span>
                  </div>
                  <span className={styles.agentMiniRole}>{agent.role}</span>
                  <p className={styles.agentMiniText}>{info.text}</p>
                </div>
              );
            })}
          </div>

          {directives.length > 0 && (
            <div className={styles.recItem} style={{ borderLeftColor: '#00c48c', marginTop: '1rem', marginBottom: 0 }}>
              <strong>Letzte Anweisung:</strong> {directives[0].text}
            </div>
          )}
        </div>
      </aside>

      {/* ═══ INTERACTIVE CALENDAR MODAL ═══ */}
      {showCalendarModal && (
        <div className={styles.modalOverlay} onClick={() => setShowCalendarModal(false)}>
          <div className={styles.calendarModal} onClick={(e) => e.stopPropagation()}>
            <button className={styles.modalCloseBtn} onClick={() => setShowCalendarModal(false)}>&times;</button>
            
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Zirkadianes Protokoll-Archiv</h2>
              <p className="dim text-xs" style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Plane und optimiere deine bio-kognitiven Tage vorausschauend mit AI Sync.
              </p>
            </div>

            <div className={styles.calendarLayout}>
              {/* Left Side: Calendar Grid */}
              <div className={styles.calendarMain}>
                <div className={styles.calendarHeaderRow}>
                  <button className={styles.calNavBtn} onClick={prevMonth}>&lt;</button>
                  <span className={styles.calMonthTitle}>
                    {currentMonth.toLocaleString('de-DE', { month: 'long', year: 'numeric' }).toUpperCase()}
                  </span>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <button className={styles.calAiBtn} onClick={generateMonthAI}>Month AI Sync</button>
                    <button className={styles.calNavBtn} onClick={nextMonth}>&gt;</button>
                  </div>
                </div>

                <div className={styles.calWeekdayHeader}>
                  {WEEKDAYS.map(d => <span key={d}>{d}</span>)}
                </div>

                <div className={styles.calGridDays}>
                  {days.map((cell, idx) => {
                    const cellDateStr = formatDate(cell.date);
                    const isToday = cellDateStr === dateStrToday;
                    const isActive = cellDateStr === dateStrSelected;
                    const hasProto = !!calendar[cellDateStr]?.blocks?.length;
                    const blockCount = calendar[cellDateStr]?.blocks?.length || 0;

                    let cellClass = styles.calDayCell;
                    if (!cell.isCurrent) cellClass += ` ${styles.calDayCellOtherMonth}`;
                    if (isToday) cellClass += ` ${styles.calDayCellToday}`;
                    if (isActive) cellClass += ` ${styles.calDayCellActive}`;
                    if (hasProto) cellClass += ` ${styles.calDayCellHasProtocol}`;

                    return (
                      <div key={idx} className={cellClass} onClick={() => selectDate(cell.date)}>
                        <span className={styles.calDayNumber}>{cell.day}</span>
                        {hasProto && (
                          <span className={styles.calDayBadge}>{blockCount} Blöcke</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Side: Day Details & AI Commands */}
              <div className={styles.calendarSidebar}>
                <div className={styles.sidebarHeader}>
                  <h3 className={styles.sidebarDate}>
                    {selectedDate.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })}
                  </h3>
                  <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.4rem' }}>
                    <button className={styles.sidebarActionBtn} onClick={handleAddCalendarBlock}>+ Block</button>
                    <button className={styles.sidebarActionBtn} onClick={generateDayAI}>AI Sync</button>
                    <button 
                      className={styles.sidebarActionBtn} 
                      style={{ background: 'var(--green)', border: 'none', color: '#fff' }}
                      onClick={() => {
                        syncToActive();
                        setShowCalendarModal(false);
                      }}
                    >
                      Sync Active
                    </button>
                  </div>
                </div>

                <div className={styles.sidebarBlockList}>
                  {daySchedule.blocks?.map((block, idx) => (
                    <div 
                      key={idx} 
                      className={styles.sidebarBlockCard}
                      style={{ borderLeftColor: block.pillar === 'skills' ? 'var(--amber)' : block.pillar === 'recovery' ? '#00a3ff' : block.pillar === 'health' ? '#00c48c' : 'var(--cobalt-bright)' }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '600', fontSize: '0.75rem', color: 'var(--text)' }}>{block.title}</div>
                        <div style={{ fontSize: '0.6rem', color: 'var(--text2)', opacity: 0.8, marginTop: '0.1rem' }}>{block.rec}</div>
                      </div>
                      <div className={styles.sidebarBlockTime}>{block.startTime || '--:--'}</div>
                      <div className={styles.sidebarBlockControls}>
                        <button 
                          onClick={() => handleEditCalendarBlock(idx, block.title, block.startTime)}
                          className={styles.sidebarIconButton}
                        >
                          ✎
                        </button>
                        <button 
                          onClick={() => deleteCalendarBlock(idx)}
                          className={styles.sidebarIconButton}
                          style={{ color: 'var(--red)' }}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                  {(!daySchedule.blocks || daySchedule.blocks.length === 0) && (
                    <div className="dim" style={{ textAlign: 'center', padding: '2rem 1rem', fontSize: '0.7rem', opacity: 0.5 }}>
                      Kein Protokoll für diesen Tag hinterlegt.<br />
                      Nutze AI Sync für optimalen Ablaufplan.
                    </div>
                  )}
                </div>

                {/* Day Chat Customizer */}
                <form onSubmit={handleDayChatSubmit} className={styles.sidebarChatForm}>
                  <input 
                    type="text" 
                    placeholder="Tagesplan mit AI anpassen... (e.g. 'Arzttermin 14-15 Uhr')"
                    className={styles.sidebarChatInput}
                    value={dayChatInput}
                    onChange={(e) => setDayChatInput(e.target.value)}
                    disabled={isTyping}
                  />
                  <button type="submit" className={styles.sidebarChatBtn} disabled={isTyping}>
                    Sync
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ SKILL LAB MODAL ═══ */}
      {showSkillLabModal && (
        <div className={styles.modalOverlay} onClick={() => setShowSkillLabModal(false)}>
          <div className={styles.skillLabModal} onClick={(e) => e.stopPropagation()}>
            <button className={styles.modalCloseBtn} onClick={() => setShowSkillLabModal(false)}>&times;</button>
            
            <div className={styles.modalHeader} style={{ borderBottom: '1px solid var(--border-s)', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
              <div className="label-mono" style={{ fontSize: '0.55rem', color: 'var(--amber)', textTransform: 'uppercase', letterSpacing: '0.15em' }}>
                Agentic Skill Lab • Level {profile.skillLevel}
              </div>
              <h2 className={styles.modalTitle} style={{ color: 'var(--amber)' }}>
                {profile.skill || 'Allgemeine Produktivität'} Deliberate Lab
              </h2>
            </div>

            <div className={styles.skillLabBody}>
              {isGeneratingSkill ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 1rem', gap: '1rem' }}>
                  <div className={styles.thinkingSpinner} />
                  <div className="label-mono" style={{ fontSize: '0.65rem', color: 'var(--text3)', textAlign: 'center' }}>
                     GENERATING_NEURAL_PATHWAYS...<br />
                     <span style={{ opacity: 0.5 }}>Analysiere Skill Focus: {profile.skill || 'Programmieren'} (Lvl {profile.skillLevel})</span>
                  </div>
                </div>
              ) : (
                <div>
                  <div 
                    className={styles.skillLabContent}
                    dangerouslySetInnerHTML={{ __html: skillContent }} 
                  />
                  <button 
                    type="button" 
                    className={styles.formBtn}
                    style={{ width: '100%', marginTop: '2rem', background: 'var(--amber)', color: '#000', border: 'none', fontWeight: '700' }}
                    onClick={handleCompleteSkillSession}
                  >
                    Session Abschließen (+150 XP)
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
