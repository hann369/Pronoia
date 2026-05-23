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
            {/* Calendar switch controls */}
            <div className={styles.card}>
              <span className={styles.panelTitle}>
                <span>📅</span> Circadianer Zyklus
              </span>
              <div className={styles.calendarGrid}>
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
              placeholder="Imperialen Befehl an das System senden..." 
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
    </div>
  );
}
