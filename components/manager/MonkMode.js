'use client';

import React, { useState, useEffect } from 'react';
import styles from './MonkMode.module.css';
import { useTheme } from 'next-themes';
import { useTabData } from '@/hooks/useTabData';
import {
  Play,
  Pause,
  X,
  Shield,
  ShieldAlert,
  Brain,
  Clock,
  ArrowLeft,
  TrendingUp,
  Zap
} from 'lucide-react';

const DEFAULT_PROTOCOLS = {
  youtube: true,
  social: true,
  gaming: false,
  caffeine: false,
  junkfood: true
};

export default function MonkMode({ setActiveTab }) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme !== 'light';

  // Persisted state via useTabData.
  // Source of truth for the timer is `active` (wall-clock based) — mirrors the
  // proven Manager focus timer in TabManager.js so it survives reload/tab-switch.
  const { data: monkModeConfig, save: saveMonkModeConfig } = useTabData('monkModeConfig', {
    initialTime: 5400,
    blockedProtocols: DEFAULT_PROTOCOLS,
    // active === null when idle, otherwise:
    //   { status: 'running', endsAt, remainingSec, totalSec }
    //   { status: 'paused',  endsAt: null, remainingSec, totalSec }
    active: null,
    completedSessions: []     // [{ finishedAt, durationSecs }] for charting
  });

  const initialTime = monkModeConfig?.initialTime ?? 5400;
  const blockedProtocols = monkModeConfig?.blockedProtocols ?? DEFAULT_PROTOCOLS;
  const active = monkModeConfig?.active ?? null;
  const completedSessions = monkModeConfig?.completedSessions ?? [];

  // Ticking wall-clock. The only local state — everything else is derived from
  // the persisted `active`, so leaving the tab / reloading never loses progress.
  const [nowTs, setNowTs] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNowTs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const timeLeft = !active
    ? initialTime
    : active.status === 'paused'
      ? active.remainingSec
      : Math.max(0, Math.round((active.endsAt - nowTs) / 1000));
  const isRunning = !!active && active.status === 'running' && timeLeft > 0;

  // Auto-complete: when a running session reaches 0, log it once and clear.
  useEffect(() => {
    if (active && active.status === 'running' && timeLeft <= 0) {
      saveMonkModeConfig((prev) => {
        if (!prev?.active || prev.active.status !== 'running') return prev; // already handled
        return {
          ...prev,
          active: null,
          completedSessions: [
            ...(prev.completedSessions ?? []),
            { finishedAt: Date.now(), durationSecs: prev.active.totalSec ?? prev.initialTime ?? 0 }
          ]
        };
      });
    }
  }, [active, timeLeft, saveMonkModeConfig]);

  const toggleTimer = () => {
    if (!isRunning) {
      // START / RESUME — anchor an end time to the wall clock.
      const remaining = active?.status === 'paused' ? active.remainingSec : initialTime;
      const totalSec = active?.status === 'paused' ? (active.totalSec ?? initialTime) : initialTime;
      saveMonkModeConfig((prev) => ({
        ...prev,
        active: {
          status: 'running',
          endsAt: Date.now() + remaining * 1000,
          remainingSec: remaining,
          totalSec
        }
      }));
    } else {
      // PAUSE — freeze the remaining time.
      const remaining = Math.max(0, Math.round((active.endsAt - Date.now()) / 1000));
      saveMonkModeConfig((prev) => ({
        ...prev,
        active: {
          status: 'paused',
          endsAt: null,
          remainingSec: remaining,
          totalSec: prev.active?.totalSec ?? initialTime
        }
      }));
    }
  };

  const resetTimer = () => {
    saveMonkModeConfig((prev) => ({ ...prev, active: null }));
  };

  const handleTimeChange = (mins) => {
    if (isRunning) return;
    saveMonkModeConfig((prev) => ({
      ...prev,
      initialTime: mins * 60,
      active: null
    }));
  };

  const handleToggle = (key) => {
    saveMonkModeConfig((prev) => ({
      ...prev,
      blockedProtocols: {
        ...(prev?.blockedProtocols ?? DEFAULT_PROTOCOLS),
        [key]: !(prev?.blockedProtocols ?? DEFAULT_PROTOCOLS)[key]
      }
    }));
  };

  // Format time (HH:MM:SS)
  const formatTime = (seconds) => {
    const safe = Math.max(0, seconds);
    const h = Math.floor(safe / 3600);
    const m = Math.floor((safe % 3600) / 60);
    const s = safe % 60;
    return [
      h > 0 ? String(h).padStart(2, '0') : null,
      String(m).padStart(2, '0'),
      String(s).padStart(2, '0')
    ].filter(Boolean).join(':');
  };

  // SVG circular properties
  const radius = 110;
  const stroke = 8;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const effectiveDuration = active?.totalSec ?? initialTime ?? 1;
  const strokeDashoffset = circumference - (Math.min(timeLeft, effectiveDuration) / effectiveDuration) * circumference;

  // ─── Detox Recovery Chart — dynamic from completed sessions ──────────────
  // Show focus time per day over the last 7 days; the in-progress session
  // feeds today's slot live so the graph moves while you focus.
  const activeCount = Object.values(blockedProtocols).filter(Boolean).length;

  const buildChartPoints = (field) => {
    const now = Date.now();
    const msPerDay = 86400000;
    const daily = Array(7).fill(0);
    completedSessions.forEach(({ finishedAt, durationSecs }) => {
      const daysAgo = Math.floor((now - finishedAt) / msPerDay);
      if (daysAgo >= 0 && daysAgo < 7) {
        daily[6 - daysAgo] += durationSecs;
      }
    });
    // Fold in the running session's elapsed time so today's point is live.
    if (active && active.status === 'running') {
      const elapsed = (active.totalSec ?? initialTime) - timeLeft;
      if (elapsed > 0) daily[6] += elapsed;
    }
    const maxSec = Math.max(...daily, 1);
    return daily.map((sec, i) => {
      const x = 50 + i * 50;
      let y;
      if (field === 'dopamine') {
        y = 150 - Math.round((sec / maxSec) * 120);
      } else {
        y = 45 + Math.round((1 - sec / maxSec) * 110);
      }
      return `${x},${y}`;
    }).join(' ');
  };

  const dopaminePoints = buildChartPoints('dopamine');
  const stressPoints = buildChartPoints('stress');

  // ─── Hermes insight — based on real timer state ───────────────────────────
  const todayStart = new Date().setHours(0, 0, 0, 0);
  const sessionsToday = completedSessions.filter((s) => s.finishedAt >= todayStart);
  const totalFocusToday = sessionsToday.reduce((sum, s) => sum + s.durationSecs, 0);

  const getHermesInsight = () => {
    if (isRunning) {
      return `Fokus-Protokoll aktiv. ${activeCount} Protokolle gesperrt, Dopamin-Rezeptoren erholen sich. ${Math.round(timeLeft / 60)} min verbleibend – bleib standhaft.`;
    }
    if (active?.status === 'paused') {
      return `Session pausiert bei ${formatTime(timeLeft)}. Die Sperren sind ausgesetzt – nimm das Protokoll wieder auf, sobald du bereit bist.`;
    }
    if (totalFocusToday > 0) {
      const hrs = Math.floor(totalFocusToday / 3600);
      const mins = Math.floor((totalFocusToday % 3600) / 60);
      return `Heute abgeschlossen: ${hrs > 0 ? `${hrs}h ` : ''}${mins}min Deep Work. Starte eine neue Session, um die neuronale Erholung fortzusetzen.`;
    }
    return 'Hermes bereit. Starte den Fokus-Timer, um deine kognitive Erholung zu priorisieren und störende Umweltreize vollständig auszublenden.';
  };

  return (
    <div className={styles.container}>
      {/* Top action row */}
      <div className={styles.topActions}>
        <button className={styles.backBtn} onClick={() => setActiveTab('apps')}>
          <ArrowLeft size={16} /> Zurück zu Apps
        </button>
        <span className={`${styles.badge} ${isRunning ? styles.badgeActive : ''}`}>
          {isRunning ? 'Protokoll Aktiv' : 'Standby'}
        </span>
      </div>

      {/* Left Focus Panel */}
      <div className={styles.focusPanel}>
        <div className={styles.glassCard}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Focus Engine</h2>
            <Clock className={styles.statusIcon} size={20} />
          </div>

          <div className={styles.timerContainer}>
            <svg className={styles.circleSvg}>
              <circle
                className={styles.circleBg}
                r={normalizedRadius}
                cx={radius}
                cy={radius}
              />
              <circle
                className={styles.circleProgress}
                r={normalizedRadius}
                cx={radius}
                cy={radius}
                strokeDasharray={circumference + ' ' + circumference}
                style={{ strokeDashoffset }}
              />
            </svg>

            <div className={styles.timerLabelContainer}>
              <span className={styles.timerText}>{formatTime(timeLeft)}</span>
              <span className={styles.timerSub}>Verbleibend</span>
            </div>

            <div className={styles.timerControls}>
              <button className={styles.btnPrimary} onClick={toggleTimer}>
                {isRunning ? <Pause size={16} /> : <Play size={16} />}
                {isRunning ? 'Pause' : (active?.status === 'paused' ? 'Fortsetzen' : 'Start Focus')}
              </button>
              <button className={styles.btnSecondary} onClick={resetTimer}>
                <X size={16} /> Zurücksetzen
              </button>
            </div>
          </div>

          {/* Duration presets — only when not running */}
          {!isRunning && (
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginTop: '1rem' }}>
              {[25, 45, 60, 90, 120].map((mins) => (
                <button
                  key={mins}
                  className={styles.btnSecondary}
                  style={{
                    padding: '0.4rem 0.8rem',
                    fontSize: '0.75rem',
                    borderColor: initialTime === mins * 60 ? 'rgba(26, 106, 255, 0.4)' : (isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)'),
                    background: initialTime === mins * 60 ? 'rgba(26, 106, 255, 0.1)' : 'transparent'
                  }}
                  onClick={() => handleTimeChange(mins)}
                >
                  {mins}m
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Hermes Agent Insight */}
        <div className={styles.glassCard}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Hermes Agent Insight</h2>
            <Brain size={18} style={{ color: '#1a6aff' }} />
          </div>
          <div className={styles.hermesConsole}>
            <div className={styles.consoleHeader}>
              <Zap size={12} /> Live Neurofeedback
            </div>
            <p>{getHermesInsight()}</p>
            {totalFocusToday > 0 && (
              <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.45)', fontFamily: 'JetBrains Mono, monospace' }}>
                Sessions heute: {sessionsToday.length} |
                Gesamt Focus: {Math.floor(totalFocusToday / 60)}min
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Details Panel */}
      <div className={styles.detailsPanel}>
        {/* Status Banner — honest about whether enforcement is live */}
        <div className={styles.statusBanner}>
          <Shield className={styles.statusIcon} size={24} />
          <div className={styles.statusText}>
            {isRunning ? (
              <><strong>Detox Modus: Aktiv.</strong> {activeCount} Protokolle werden im Manager-Link-Launcher blockiert, solange die Session läuft.</>
            ) : (
              <><strong>Detox Modus: Standby.</strong> Starte eine Fokus-Session, um die aktivierten Protokolle zu sperren.</>
            )}
          </div>
        </div>

        {/* Restricted Protocols Toggles */}
        <div className={styles.glassCard}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Restricted Protocols</h2>
            <ShieldAlert size={18} style={{ color: '#1a6aff' }} />
          </div>
          <div className={styles.protocolList}>
            {[
              { id: 'youtube', name: 'Video Streaming', desc: 'YouTube, Netflix, Twitch' },
              { id: 'social', name: 'Social Networks', desc: 'X.com, Instagram, TikTok' },
              { id: 'gaming', name: 'Steam & Gaming', desc: 'Client Connections & Launchers' },
              { id: 'caffeine', name: 'Koffein Tracker', desc: 'Kaffee & Energy Drinks blockieren' },
              { id: 'junkfood', name: 'Fast-Food Portale', desc: 'Lieferando, UberEats Sperre' }
            ].map((p) => (
              <div className={styles.protocolItem} key={p.id}>
                <div className={styles.protocolMeta}>
                  <div className={styles.statusIndicator}>
                    <div className={`${styles.led} ${blockedProtocols[p.id] ? styles.ledBlocked : ''}`} />
                  </div>
                  <div>
                    <div className={styles.protocolName}>{p.name}</div>
                    <div className={styles.protocolDesc}>{p.desc}</div>
                  </div>
                </div>
                <label className={styles.switchLabel}>
                  <input
                    type="checkbox"
                    className={styles.switchInput}
                    checked={!!blockedProtocols[p.id]}
                    onChange={() => handleToggle(p.id)}
                  />
                  <span className={styles.slider} />
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Detox Recovery Chart */}
        <div className={styles.glassCard}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Detox Recovery Timeline</h2>
            <TrendingUp size={18} style={{ color: '#1a6aff' }} />
          </div>

          <div className={styles.chartWrapper}>
            <svg width="100%" height="100%" viewBox="0 0 400 180" preserveAspectRatio="none">
              {/* Grid Lines */}
              <line x1="50" y1="30" x2="350" y2="30" className={styles.gridLine} />
              <line x1="50" y1="80" x2="350" y2="80" className={styles.gridLine} />
              <line x1="50" y1="130" x2="350" y2="130" className={styles.gridLine} />
              <line x1="50" y1="160" x2="350" y2="160" className={styles.gridLine} />

              {/* Chart lines */}
              <polyline
                fill="none"
                stroke="#1a6aff"
                strokeWidth="3"
                points={dopaminePoints}
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ filter: isDark ? 'drop-shadow(0 0 3px rgba(26,106,255,0.4))' : 'none' }}
              />
              <polyline
                fill="none"
                stroke={isDark ? "rgba(255,255,255,0.3)" : "rgba(0, 0, 0, 0.2)"}
                strokeWidth="2"
                points={stressPoints}
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Data points */}
              {dopaminePoints.split(' ').map((p, idx) => {
                const [x, y] = p.split(',');
                return <circle key={'d-'+idx} cx={x} cy={y} r="4" fill="#1a6aff" />;
              })}
              {stressPoints.split(' ').map((p, idx) => {
                const [x, y] = p.split(',');
                return <circle key={'s-'+idx} cx={x} cy={y} r="3" fill={isDark ? "#ffffff" : "#475569"} />;
              })}

              {/* Y Axis labels */}
              <text x="15" y="35" className={styles.chartLabel}>100%</text>
              <text x="15" y="85" className={styles.chartLabel}>50%</text>
              <text x="15" y="135" className={styles.chartLabel}>10%</text>

              {/* X Axis labels */}
              {['T-6', 'T-5', 'T-4', 'T-3', 'T-2', 'T-1', 'Heute'].map((day, idx) => (
                <text key={day} x={50 + idx * 50} y="175" className={styles.chartLabel} textAnchor="middle">
                  {day}
                </text>
              ))}
            </svg>
          </div>

          <div className={styles.chartLegend}>
            <div className={styles.legendItem}>
              <span className={styles.legendColor} style={{ backgroundColor: '#1a6aff' }} />
              Dopamin-Sensitivität
            </div>
            <div className={styles.legendItem}>
              <span className={styles.legendColor} style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.25)' }} />
              Stresslevel
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
