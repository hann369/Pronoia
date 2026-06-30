'use client';

/*
 * Manager tab — "Die Steuerzentrale deiner Routine."
 * The control center for routine: circadian + environment routine, focus sessions,
 * link automation, outlier research and the finance tracker (full Financial Vision
 * opens from the Finanz-Tracker panel).
 *
 * All state is persisted via useTabData (Firestore users/{uid}.tabs.*),
 * with an automatic fallback migration from legacy profile.managerConfig.
 * Fully responsive and supports light/dark dynamic themes.
 */

import { useState, useEffect } from 'react';
import FinancialTracker from './FinancialTracker';
import { useTabData } from '@/hooks/useTabData';
import { db, auth } from '@/lib/firebase';
import styles from './TabManager.module.css';

// ═══════════════════════════════════════════════════════════════════
// CUSTOM INTERACTIVE SVG CHARTS FOR FINANCE TRACKER (No libraries)
// ═══════════════════════════════════════════════════════════════════

// 1. Line Chart: Cumulative Balance Trend
function LineChart({ transactions }) {
  const [hoveredIdx, setHoveredIdx] = useState(null);

  // Sort chronological
  const sorted = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date));
  let bal = 0;
  const points = sorted.map(tx => {
    if (tx.type === 'income') bal += tx.amount;
    else bal -= tx.amount;
    return { date: tx.date, balance: bal, amount: tx.amount, type: tx.type, category: tx.category };
  });

  if (points.length === 0) {
    return (
      <div className={styles.emptyChartState}>
        <p>Noch keine Daten vorhanden. Füge Transaktionen hinzu, um den Verlauf zu sehen.</p>
      </div>
    );
  }

  const width = 500;
  const height = 180;
  const paddingLeft = 50;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 30;

  const chartW = width - paddingLeft - paddingRight;
  const chartH = height - paddingTop - paddingBottom;

  const balances = points.map(p => p.balance);
  const maxB = Math.max(...balances, 100);
  const minB = Math.min(...balances, -100);
  const range = maxB - minB || 1;

  const getX = (idx) => {
    if (points.length <= 1) return paddingLeft + chartW / 2;
    return paddingLeft + (idx / (points.length - 1)) * chartW;
  };

  const getY = (val) => {
    return paddingTop + chartH - ((val - minB) / range) * chartH;
  };

  let pathD = '';
  let areaD = '';
  points.forEach((p, idx) => {
    const x = getX(idx);
    const y = getY(p.balance);
    if (idx === 0) {
      pathD = `M ${x} ${y}`;
      areaD = `M ${x} ${paddingTop + chartH} L ${x} ${y}`;
    } else {
      pathD += ` L ${x} ${y}`;
      areaD += ` L ${x} ${y}`;
    }
  });
  if (points.length > 0) {
    areaD += ` L ${getX(points.length - 1)} ${paddingTop + chartH} Z`;
  }

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id="lineAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1A6AFF" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#1A6AFF" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((r) => {
          const val = minB + r * range;
          const y = getY(val);
          return (
            <g key={r}>
              <line x1={paddingLeft} y1={y} x2={width - paddingRight} y2={y} stroke="var(--chart-grid)" className="stroke-slate-200 dark:stroke-white/5" strokeDasharray="3 4" strokeWidth="1" />
              <text x={paddingLeft - 10} y={y + 3} fill="var(--chart-text)" className="fill-slate-400 dark:fill-white/40" fontSize="8" fontFamily="monospace" textAnchor="end">
                {Math.round(val)} €
              </text>
            </g>
          );
        })}

        {/* Areas & Path */}
        <path d={areaD} fill="url(#lineAreaGrad)" />
        <path d={pathD} fill="none" stroke="#1A6AFF" strokeWidth="2.5" />

        {/* Interactive Circles */}
        {points.map((p, idx) => {
          const x = getX(idx);
          const y = getY(p.balance);
          const isH = hoveredIdx === idx;
          return (
            <circle
              key={idx}
              cx={x}
              cy={y}
              r={isH ? 7 : 4}
              fill={isH ? "#1A6AFF" : "var(--chart-dot-bg)"}
              className="fill-slate-50 dark:fill-[#060509]"
              stroke="#1A6AFF"
              strokeWidth="2.5"
              style={{ cursor: 'pointer', transition: 'r 0.15s ease' }}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
            />
          );
        })}
      </svg>

      {/* Tooltip */}
      {hoveredIdx !== null && points[hoveredIdx] && (
        <div
          className={styles.chartTooltip}
          style={{
            position: 'absolute',
            left: `${(getX(hoveredIdx) / width) * 100}%`,
            top: `${getY(points[hoveredIdx].balance) - 55}px`,
            transform: 'translateX(-50%)',
            zIndex: 10,
            pointerEvents: 'none'
          }}
        >
          <div className={styles.tooltipDate}>{points[hoveredIdx].date}</div>
          <div className={styles.tooltipBalance}>
            Saldo: <strong>{points[hoveredIdx].balance.toFixed(1)} €</strong>
          </div>
          <div className={styles.tooltipTx} style={{ color: points[hoveredIdx].type === 'income' ? '#22c55e' : '#ff4d4d' }}>
            {points[hoveredIdx].type === 'income' ? '+' : '-'}{points[hoveredIdx].amount} € ({points[hoveredIdx].category})
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// FOCUS WEEKLY SVG BAR CHART
// ═══════════════════════════════════════════════════════════════════
const getLast7DaysData = (sessions) => {
  const data = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const daySessions = (sessions || []).filter(s => (s.ts || '').slice(0, 10) === dateStr);
    const mins = daySessions.reduce((sum, s) => sum + (s.durationMin || 0), 0);
    const label = d.toLocaleDateString('de-DE', { weekday: 'short' }).slice(0, 2); // e.g. "Mo", "Di"
    data.push({ dateStr, mins, label });
  }
  return data;
};

function FocusWeeklyChart({ sessions, labelStyle }) {
  const data = getLast7DaysData(sessions);
  const maxMins = Math.max(...data.map(d => d.mins), 60); // minimum scale is 60m

  const width = 280;
  const height = 90;
  const paddingLeft = 25;
  const paddingRight = 10;
  const paddingTop = 10;
  const paddingBottom = 15;
  const chartW = width - paddingLeft - paddingRight;
  const chartH = height - paddingTop - paddingBottom;

  return (
    <div className="space-y-2 mt-4 pt-4 border-t border-slate-200 dark:border-white/5">
      <div className={`${labelStyle} text-[10px] text-slate-500 dark:text-[rgba(236,232,242,0.6)]`}>Wochen-Fokus (Minuten)</div>
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
        {[0, 0.5, 1].map((r) => {
          const val = r * maxMins;
          const y = paddingTop + chartH - r * chartH;
          return (
            <g key={r}>
              <line x1={paddingLeft} y1={y} x2={width - paddingRight} y2={y} stroke="currentColor" className="text-slate-200 dark:text-white/5" strokeDasharray="2 2" />
              <text x={paddingLeft - 5} y={y + 2.5} fill="currentColor" className="text-slate-400 dark:text-white/40" fontSize="7" fontFamily="monospace" textAnchor="end">
                {Math.round(val)}m
              </text>
            </g>
          );
        })}
        {data.map((d, idx) => {
          const barW = Math.min(16, chartW / 7 - 6);
          const gap = (chartW - 7 * barW) / 6;
          const x = paddingLeft + idx * (barW + gap);
          const barH = (d.mins / maxMins) * chartH;
          const y = paddingTop + chartH - barH;

          return (
            <g key={d.dateStr} className="group">
              <rect
                x={x}
                y={y}
                width={barW}
                height={Math.max(barH, 2)}
                rx="2"
                fill={d.mins > 0 ? '#1A6AFF' : 'currentColor'}
                className={`${d.mins > 0 ? 'text-[#1A6AFF]' : 'text-slate-200 dark:text-white/10'} hover:fill-[#3b82f6] transition-all duration-300`}
                style={{ cursor: 'pointer' }}
              />
              <text
                x={x + barW / 2}
                y={height - 2}
                fill="currentColor"
                className={d.mins > 0 ? 'text-slate-800 dark:text-[#ECE8F2]' : 'text-slate-400 dark:text-white/40'}
                fontSize="8"
                fontFamily="monospace"
                textAnchor="middle"
              >
                {d.label}
              </text>
              <title>{`${d.dateStr}: ${d.mins} Min`}</title>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

const ACCENT = '#1A6AFF';
const glass = 'bg-white/70 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] backdrop-blur-md shadow-sm dark:shadow-none text-slate-800 dark:text-[#ECE8F2]';
const label = 'font-mono text-[0.6rem] uppercase tracking-[0.18em]';

// Daily circadian-environment routine — things the user actually controls.
const ENV_ITEMS = [
  { key: 'morningLight', label: 'Morgenlicht 10k+ Lux', icon: 'wb_sunny' },
  { key: 'redLight',     label: 'Abend-Rotlicht',       icon: 'nightlight' },
  { key: 'hepa',         label: 'HEPA-Luftfilter',       icon: 'air' },
  { key: 'aleppoSoap',   label: 'Aleppo-Seife',          icon: 'spa' },
  { key: 'linen',        label: 'Leinen-Bettwäsche',     icon: 'bed' },
];

export default function TabManager({
  profile,
  saveProfile,
  blocks = [],
  blockIdx = 0,
  timeLeft = 0,
  totalTime = 0,
  managerHistory = [],
  setManagerHistory,
  setAgentMsg
}) {
  const [view, setView] = useState('dashboard'); // 'dashboard' | 'financial'
  const [research, setResearch] = useState('');

  // Link Automation states
  const [pattern, setPattern] = useState('');
  const [url, setUrl] = useState('');
  const [showAddMapping, setShowAddMapping] = useState(false);

  // Outlier Research states
  const [selectedResearch, setSelectedResearch] = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(0);
  const [playingVideoId, setPlayingVideoId] = useState(null);

  // Outlier Custom Notes & Tags state
  const [researchNotes, setResearchNotes] = useState('');
  const [researchTags, setResearchTags] = useState('');

  // Client Telemetry states
  const [isOnline, setIsOnline] = useState(true);
  const [latency, setLatency] = useState(14);

  // ── Unified tab persistence hook ──
  const { data: managerConfig, save: saveManagerConfig } = useTabData('managerConfig', {
    mappings: [],
    finance: { transactions: [], customAssets: [], customLiabilities: [], customGoals: [], buyInterest: [], recurringTemplates: [], customBudgets: [] },
    research: [],
    circadian: { wake: '06:30', sleep: '22:15' },
    autoOpenEnabled: false
  });

  const [wake, setWake] = useState('06:30');
  const [sleep, setSleep] = useState('22:15');

  // Sync wake/sleep states from migrated managerConfig
  useEffect(() => {
    if (managerConfig?.circadian?.wake) setWake(managerConfig.circadian.wake);
    if (managerConfig?.circadian?.sleep) setSleep(managerConfig.circadian.sleep);
  }, [managerConfig]);

  // Monitor online status
  useEffect(() => {
    if (typeof window === 'undefined') return;
    setIsOnline(window.navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Measure server latency
  useEffect(() => {
    const measureLatency = async () => {
      try {
        const t0 = performance.now();
        const res = await fetch('/api/ping');
        if (res.ok) {
          const t1 = performance.now();
          setLatency(Math.round(t1 - t0));
        }
      } catch (err) {
        console.warn("Failed to check latency:", err);
      }
    };

    measureLatency();
    const interval = setInterval(measureLatency, 30000); // check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  // Reset video player when active research target changes
  useEffect(() => {
    setPlayingVideoId(null);
    if (selectedResearch) {
      setResearchNotes(selectedResearch.notes || '');
      setResearchTags((selectedResearch.tags || []).join(', '));
    }
  }, [selectedResearch]);

  // Focus sessions — persisted + wall-clock based (survive reload), with history.
  const { data: focusData, save: saveFocus } = useTabData('managerFocus', { sessions: [], active: null, lastPreset: 60 });
  const [nowTs, setNowTs] = useState(() => Date.now());
  const focusSessions = focusData.sessions || [];
  const focusPreset = focusData.lastPreset || 60;
  const focusActive = focusData.active;
  const focusTimeLeft = !focusActive
    ? focusPreset * 60
    : focusActive.status === 'paused'
      ? focusActive.remainingSec
      : Math.max(0, Math.round((focusActive.endsAt - nowTs) / 1000));
  const focusRunning = !!focusActive && focusActive.status === 'running' && focusTimeLeft > 0;

  // Environment routine — daily checklist + lux target, persisted; resets each day.
  const { data: envData, save: saveEnv } = useTabData('managerEnv', { luxTarget: 10000, day: '', checks: {}, history: {} });
  const envTodayKey = new Date().toISOString().slice(0, 10);
  const envChecks = (envData.day === envTodayKey ? envData.checks : {}) || {};
  const envDoneCount = ENV_ITEMS.filter((i) => envChecks[i.key]).length;
  const envProgress = Math.round((envDoneCount / ENV_ITEMS.length) * 100);

  // Monk Mode Blocker Integration
  const { data: monkModeConfig } = useTabData('monkModeConfig', {
    initialTime: 5400,
    blockedProtocols: { youtube: true, social: true, gaming: false, caffeine: false, junkfood: true }
  });
  const isMonkModeActive = !!(monkModeConfig && monkModeConfig.active && monkModeConfig.active.status === 'running');
  const monkBlockedProtocols = monkModeConfig?.blockedProtocols || {};

  const isUrlBlockedByMonkMode = (url) => {
    if (!isMonkModeActive) return false;
    const lowerUrl = (url || '').toLowerCase();
    if (monkBlockedProtocols.youtube && (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be') || lowerUrl.includes('netflix.com') || lowerUrl.includes('twitch.tv'))) return 'Video Streaming';
    if (monkBlockedProtocols.social && (lowerUrl.includes('twitter.com') || lowerUrl.includes('x.com') || lowerUrl.includes('instagram.com') || lowerUrl.includes('tiktok.com') || lowerUrl.includes('facebook.com'))) return 'Social Networks';
    if (monkBlockedProtocols.gaming && (lowerUrl.includes('steampowered.com') || lowerUrl.includes('epicgames.com') || lowerUrl.includes('roblox.com'))) return 'Steam & Gaming';
    if (monkBlockedProtocols.caffeine && (lowerUrl.includes('starbucks.com') || lowerUrl.includes('redbull.com') || lowerUrl.includes('nespresso.com'))) return 'Koffein Tracker';
    if (monkBlockedProtocols.junkfood && (lowerUrl.includes('lieferando.de') || lowerUrl.includes('ubereats.com') || lowerUrl.includes('dominos.de') || lowerUrl.includes('pizza.de'))) return 'Fast-Food Portale';
    return false;
  };

  const toggleEnv = (key) => {
    saveEnv((prev) => {
      const day = new Date().toISOString().slice(0, 10);
      const checks = prev.day === day ? { ...(prev.checks || {}) } : {};
      checks[key] = !checks[key];

      const doneCount = ENV_ITEMS.filter((i) => checks[i.key]).length;
      const isFull = doneCount === ENV_ITEMS.length;

      let history = prev.history || {};
      history[day] = {
        checks,
        doneCount,
        total: ENV_ITEMS.length,
        completed: isFull
      };

      // Keep last 30 days
      const keys = Object.keys(history).sort();
      if (keys.length > 30) {
        const nextHistory = {};
        keys.slice(-30).forEach(k => { nextHistory[k] = history[k]; });
        history = nextHistory;
      }

      return { ...prev, day, checks, history };
    });
  };

  // Circadian Routine Streak calculation
  const circadianStreak = (() => {
    const history = envData.history || {};
    let streak = 0;
    const d = new Date();
    const todayStr = d.toISOString().slice(0, 10);
    if (!history[todayStr]?.completed) {
      d.setDate(d.getDate() - 1);
    }
    while (streak < 100) {
      const curStr = d.toISOString().slice(0, 10);
      if (history[curStr]?.completed) {
        streak++;
        d.setDate(d.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  })();

  // Last 7 days environmental dot status calculation
  const getLast7DaysEnvDots = (history) => {
    const dots = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dayStr = d.toISOString().slice(0, 10);
      const dayData = (history || {})[dayStr];
      dots.push({
        dayStr,
        label: d.toLocaleDateString('de-DE', { weekday: 'narrow' }),
        completed: !!dayData?.completed,
        partial: !!dayData && !dayData.completed && dayData.doneCount > 0,
        doneCount: dayData?.doneCount || 0
      });
    }
    return dots;
  };
  const envDots = getLast7DaysEnvDots(envData.history || {});

  const config = managerConfig || {};
  const mappings = config.mappings || [];
  const finance = config.finance || {};
  const transactions = finance.transactions || [];

  const totalIncome = transactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const netBalance = totalIncome - totalExpense;

  const currentMonthStr = new Date().toISOString().substring(0, 7);
  const mtdNet = transactions
    .filter((t) => (t.date || '').startsWith(currentMonthStr))
    .reduce((acc, t) => acc + (t.type === 'income' ? t.amount : -t.amount), 0);

  const cockpitExpenseCats = (() => {
    const map = {};
    transactions.filter((t) => t.type === 'expense').forEach((t) => {
      map[t.category] = (map[t.category] || 0) + t.amount;
    });
    const rows = Object.keys(map).map((c) => ({ category: c, value: map[c] })).sort((a, b) => b.value - a.value);
    const max = rows.length ? rows[0].value : 1;
    return rows.slice(0, 3).map((r, i) => ({ ...r, pct: Math.round((r.value / max) * 100) }));
  })();

  const recentTransactions = [...transactions]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 3);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const saveCircadian = () => {
    saveManagerConfig(prev => ({
      ...prev,
      circadian: { wake, sleep }
    }));
  };

  const handleAddMapping = (e) => {
    if (e) e.preventDefault();
    if (!pattern.trim() || !url.trim()) return;

    let formattedUrl = url.trim();
    if (!/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = 'https://' + formattedUrl;
    }

    const newMapping = {
      id: `map_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      pattern: pattern.trim(),
      url: formattedUrl
    };

    saveManagerConfig(prev => ({
      ...prev,
      mappings: [...(prev.mappings || []), newMapping]
    }));
    setPattern('');
    setUrl('');
    setShowAddMapping(false);
    if (typeof setAgentMsg === 'function') {
      setAgentMsg(`Link-Zuordnung für "${pattern.trim()}" hinzugefügt.`);
    }
  };

  const handleDeleteMapping = (id) => {
    saveManagerConfig(prev => ({
      ...prev,
      mappings: (prev.mappings || []).filter((m) => m.id !== id)
    }));
    if (typeof setAgentMsg === 'function') {
      setAgentMsg('Link-Zuordnung entfernt.');
    }
  };

  // Fire-and-forget notification — only if the user already opted in. We never
  // prompt for permission mid-session (that belongs to an explicit opt-in click).
  const notifyFocus = (body) => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission === 'granted') {
      new Notification('Pronoia Fokus-Modus', { body, icon: '/favicon.ico' });
    }
  };
  const focusNotifDefault = typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default';
  const enableFocusNotifications = () => {
    if (focusNotifDefault) Notification.requestPermission().then(() => setNowTs(Date.now()));
  };

  // Log a finished session to history and clear the active timer. Idempotent:
  // a no-longer-active timer is ignored, so it can't double-count.
  const completeFocusSession = () => {
    saveFocus((prev) => {
      const a = prev.active;
      if (!a) return prev;
      const durationMin = Math.round((a.durationSec || (prev.lastPreset || 60) * 60) / 60);
      const session = {
        ts: new Date().toISOString(),
        durationMin,
        preset: a.preset || prev.lastPreset || 60,
        pillar: a.pillar || null,
        blockTitle: a.blockTitle || null,
      };
      return { ...prev, active: null, sessions: [session, ...(prev.sessions || [])].slice(0, 100) };
    });
    if (typeof setAgentMsg === 'function') setAgentMsg('Focus-Session abgeschlossen — in der Historie geloggt. ☕');
    notifyFocus('Deine Focus-Session ist abgeschlossen! Zeit für eine Pause.');
  };

  // Tick while running so the wall-clock countdown re-renders.
  useEffect(() => {
    if (!focusActive || focusActive.status !== 'running') return;
    const id = setInterval(() => setNowTs(Date.now()), 250);
    return () => clearInterval(id);
  }, [focusActive]);

  // Fire completion when the clock runs out — also catches sessions that
  // finished while the tab was closed/backgrounded (checked on mount).
  useEffect(() => {
    if (focusActive?.status === 'running' && focusActive.endsAt - nowTs <= 0) {
      completeFocusSession();
    }
  }, [focusActive, nowTs]);

  const activeBlock = blocks[blockIdx];
  const activeBlockTitle = activeBlock?.title && activeBlock.title !== 'Kein aktiver Block' ? activeBlock.title : '';

  // Link automation matching
  const matchingMappings = activeBlockTitle
    ? mappings.filter(m => m.pattern && activeBlockTitle.toLowerCase().includes(m.pattern.toLowerCase()))
    : [];

  const handleStartPauseFocus = () => {
    setNowTs(Date.now());
    if (focusRunning) {
      // pause: freeze remaining time
      saveFocus((prev) => {
        const a = prev.active;
        if (a?.status !== 'running') return prev;
        const remainingSec = Math.max(0, Math.round((a.endsAt - Date.now()) / 1000));
        return { ...prev, active: { status: 'paused', remainingSec, durationSec: a.durationSec, preset: a.preset } };
      });
    } else {
      // start fresh or resume from pause
      saveFocus((prev) => {
        const a = prev.active;
        if (a?.status === 'paused') {
          return { ...prev, active: { status: 'running', endsAt: Date.now() + a.remainingSec * 1000, durationSec: a.durationSec, preset: a.preset } };
        }
        const preset = prev.lastPreset || 60;
        const durationSec = preset * 60;
        const cur = blocks[blockIdx] || {};
        return { ...prev, active: { status: 'running', endsAt: Date.now() + durationSec * 1000, durationSec, preset, pillar: cur.pillar || cur.type || null, blockTitle: cur.title || null } };
      });
    }
  };

  const handleResetFocus = () => {
    setNowTs(Date.now());
    saveFocus((prev) => ({ ...prev, active: null }));
  };

  const handlePresetSelect = (minutes) => {
    setNowTs(Date.now());
    saveFocus((prev) => ({ ...prev, lastPreset: minutes, active: null }));
  };

  // --- Focus history stats ---
  const focusTodayKey = new Date().toISOString().slice(0, 10);
  const focusTodaySessions = focusSessions.filter((s) => (s.ts || '').slice(0, 10) === focusTodayKey);
  const focusTodayMinutes = focusTodaySessions.reduce((sum, s) => sum + (s.durationMin || 0), 0);
  const focusStreak = (() => {
    const days = new Set(focusSessions.map((s) => (s.ts || '').slice(0, 10)));
    let streak = 0;
    const d = new Date();
    while (days.has(d.toISOString().slice(0, 10)) && streak < 100) {
      streak++;
      d.setDate(d.getDate() - 1);
    }
    return streak;
  })();

  // --- Outlier Research analysis steps ---
  const analysisSteps = [
    'Initialisiere Outlier-Crawler-Engine...',
    'Analysiere historische Durchschnittswerte & Benchmarks...',
    'Scanne YouTube-Videos & Content-Katalog...',
    'Analysiere Titel-Hooks, CTR-Treiber und Thumbnail-Konzepte...',
    'Synthetisiere strategische Erkenntnisse...'
  ];

  // Upgraded runOutlierAnalysis: calls real search API and populates rich data
  const runOutlierAnalysis = async (item, targetChannelId = null) => {
    if (!item) return;
    setAnalysisLoading(true);
    setAnalysisStep(0);

    try {
      setAnalysisStep(1);
      await new Promise(r => setTimeout(r, 600));
      setAnalysisStep(2);
      await new Promise(r => setTimeout(r, 600));
      setAnalysisStep(3);

      let queryUrl = `/api/youtube-search?q=${encodeURIComponent(item.title)}`;
      if (targetChannelId) {
        queryUrl = `/api/youtube-search?channelId=${targetChannelId}`;
      } else if (item.url) {
        const handleMatch = item.url.match(/youtube\.com\/(@[a-zA-Z0-9_-]+)/);
        const idMatch = item.url.match(/youtube\.com\/channel\/([a-zA-Z0-9_-]+)/);
        if (idMatch) {
          queryUrl = `/api/youtube-search?channelId=${idMatch[1]}`;
        } else if (handleMatch) {
          queryUrl = `/api/youtube-search?q=${encodeURIComponent(handleMatch[1])}`;
        }
      }

      const res = await fetch(queryUrl);
      if (!res.ok) {
        throw new Error(`YouTube API returned HTTP status ${res.status}`);
      }

      const searchData = await res.json();
      setAnalysisStep(4);
      await new Promise(r => setTimeout(r, 400));

      if (searchData.error) {
        throw new Error(searchData.error);
      }

      let report = '';
      if (searchData.mode === 'channel') {
        const chan = searchData.channel || { title: item.title, subscribersText: 'N/A' };
        const videoListText = searchData.videos.map((v, idx) =>
          `${idx + 1}. **${v.title}**\n   - Aufrufe: ${v.viewsText || 'N/A'} | Veröffentlicht: ${v.publishedText || 'N/A'}\n   - Link: ${v.watchUrl}`
        ).join('\n');

        report = `### 🚀 OUTLIER ANALYSE: KANAL PERFORMANCE FÜR "${chan.title}"
**Abonnenten:** ${chan.subscribersText || 'N/A'} ${chan.verified ? '✓ (Verifiziert)' : ''}
**Kanal-URL:** https://youtube.com/${chan.handle || ''}
**Analyse-Datum:** ${new Date().toLocaleDateString('de-DE')}

#### Die 5 neuesten Videos des Kanals (chronologisch geordnet):
${videoListText}

#### Content- & Nischen-Erkenntnisse:
- Kanäle wie "${chan.title}" skalieren durch konsistente Branding-Muster und starke visuelle CTR-Driver.
- Die neuesten Uploads zeigen die aktuelle Themen-Ausrichtung des Creators. Analysiere Titel-Formate und Upload-Zyklen.`;
      } else if (searchData.mode === 'keyword' || searchData.mode === 'uncertain') {
        const videoListText = searchData.videos.slice(0, 5).map((v, idx) =>
          `${idx + 1}. **${v.title}**\n   - Aufrufe: ${v.viewsText || 'N/A'} | Veröffentlicht: ${v.publishedText || 'N/A'}\n   - Link: ${v.watchUrl}`
        ).join('\n');

        report = `### 🔍 OUTLIER THEMEN-ANALYSE FÜR "${item.title}"
**Kategorie:** ${item.category || 'YouTube'}
**Analyse-Datum:** ${new Date().toLocaleDateString('de-DE')}

#### Relevante Top-Videos in dieser Nische:
${videoListText}

#### Nischen-Outlier-Metriken:
- Suchbegriffe wie "${item.title}" besitzen hohe organische Suchanfragen.
- Videos mit exakter Keyword-Platzierung am Titelanfang erzielen signifikant höhere organische Einstiegs-CTR.`;
      } else if (searchData.mode === 'multiple_channels') {
        report = `### ⚠️ MEHRERE KANÄLE GEFUNDEN FÜR "${item.title}"
Bitte wähle den gewünschten Kanal in der Auswahlliste aus, um die detaillierte Outlier-Analyse zu starten.`;
      }

      const updatedResearch = (config.research || []).map((r) => {
        if (r.id === item.id) {
          return { ...r, analysisReport: report, analysisData: searchData };
        }
        return r;
      });

      saveManagerConfig(prev => ({ ...prev, research: updatedResearch }));
      const updatedItem = { ...item, analysisReport: report, analysisData: searchData };
      setSelectedResearch(updatedItem);
      setAnalysisLoading(false);

    } catch (err) {
      console.error("[YouTube Search] Analysis failed:", err);
      const errorReport = `### ❌ FEHLER BEI DER ANALYSE FÜR "${item.title}"
Es ist ein Fehler bei der Kontaktaufnahme mit den YouTube/Web-Diensten aufgetreten.

**Details:** ${err.message || 'Rate-Limit erreicht oder Netzwerkfehler.'}

Bitte versuche es in wenigen Minuten erneut.`;

      const updatedResearch = (config.research || []).map((r) => {
        if (r.id === item.id) {
          return { ...r, analysisReport: errorReport, analysisData: { mode: 'error', error: err.message } };
        }
        return r;
      });

      saveManagerConfig(prev => ({ ...prev, research: updatedResearch }));
      setSelectedResearch({ ...item, analysisReport: errorReport, analysisData: { mode: 'error', error: err.message } });
      setAnalysisLoading(false);
    }
  };

  const handleCockpitResearch = (e) => {
    if (e) e.preventDefault();
    const val = research.trim();
    if (!val) return;
    let formattedUrl = '';
    let title = val;
    if (/^https?:\/\//i.test(val) || /\./.test(val)) {
      formattedUrl = /^https?:\/\//i.test(val) ? val : 'https://' + val;
      title = val.replace(/^https?:\/\//i, '').slice(0, 60);
    }
    const newItem = {
      id: `res_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title,
      category: 'YouTube',
      url: formattedUrl,
      notes: '',
      date: new Date().toLocaleDateString('de-DE'),
      analysisReport: null,
      analysisData: null,
      tags: []
    };
    saveManagerConfig(prev => ({ ...prev, research: [newItem, ...(prev.research || [])] }));
    setResearch('');
    // Automatically trigger analysis
    runOutlierAnalysis(newItem);
  };

  const handleSaveResearchNotes = (notesText, tagsText) => {
    if (!selectedResearch) return;
    const tagsArr = tagsText.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
    const updated = (config.research || []).map(r => {
      if (r.id === selectedResearch.id) {
        return { ...r, notes: notesText, tags: tagsArr };
      }
      return r;
    });
    saveManagerConfig(prev => ({ ...prev, research: updated }));
    setSelectedResearch(prev => ({ ...prev, notes: notesText, tags: tagsArr }));
    if (typeof setAgentMsg === 'function') {
      setAgentMsg('Recherche-Notizen & Tags gespeichert. 💾');
    }
  };

  const exportToVault = async (item) => {
    if (!item) return;
    const tags = ['research', 'outlier', ...(item.tags || [])];
    const payload = {
      user_id: auth.currentUser?.uid || 'local',
      type: item.url ? 'link' : 'note',
      title: `Outlier: ${item.title}`,
      content: `Ziel-URL: ${item.url || 'Keine'}\n\nNotizen: ${item.notes || ''}\n\nBericht:\n${item.analysisReport || ''}`,
      tags: tags.map(t => t.trim().toLowerCase()).filter(Boolean),
      created_at: new Date().toISOString(),
    };

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    let saved = false;
    if (supabaseUrl && supabaseAnonKey) {
      try {
        const res = await fetch(`${supabaseUrl}/rest/v1/vault_items`, {
          method: 'POST',
          headers: {
            'apikey': supabaseAnonKey,
            'Authorization': `Bearer ${supabaseAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload)
        });
        if (res.ok) saved = true;
      } catch (err) {
        console.warn("Failed to export research to Supabase Vault:", err);
      }
    }

    if (!saved) {
      try {
        const local = JSON.parse(localStorage.getItem('px_vault') || '[]');
        localStorage.setItem('px_vault', JSON.stringify([{ id: new Date().getTime().toString(), ...payload }, ...local]));
      } catch (e) {
        console.error("Local storage vault save failed:", e);
      }
    }

    if (typeof setAgentMsg === 'function') {
      setAgentMsg(`"${item.title}" erfolgreich in den Vault exportiert! 💾`);
    }
  };

  // Dynamic Bio-Sync percentage calculation
  const bioSync = (() => {
    let score = 70;
    score += envDoneCount * 4; // max 20%
    if (wake && sleep) score += 10;
    return Math.min(100, score);
  })();

  // Full Financial Tracker takes over the whole canvas — reached only from here.
  if (view === 'financial') {
    return (
      <FinancialTracker
        onBack={() => setView('dashboard')}
        profile={profile}
        managerConfig={managerConfig}
        saveManagerConfig={saveManagerConfig}
      />
    );
  }

  return (
    <div className="relative w-full text-slate-800 dark:text-[#ECE8F2] text-left pt-12 md:pt-20">

      {/* Atmospheric glow (scoped to this panel, no global bleed) */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-[40%] h-[40%] rounded-full" style={{ background: 'rgba(26,106,255,0.06)', filter: 'blur(120px)' }} />
        <div className="absolute -bottom-20 -right-20 w-[35%] h-[35%] rounded-full" style={{ background: 'rgba(26,106,255,0.04)', filter: 'blur(100px)' }} />
      </div>

      {/* ── Editorial Header ── */}
      <header className="max-w-3xl mb-14">
        <span className={`${label} block mb-5`} style={{ color: ACCENT, letterSpacing: '0.35em' }}>
          Manager · Systemkonfiguration &amp; Automatisierung
        </span>
        <h2 className="font-serif text-4xl md:text-5xl font-light tracking-tight mb-6 text-slate-900 dark:text-white">
          Die Steuerzentrale deiner Routine.
        </h2>
        <p className="text-slate-600 dark:text-[rgba(236,232,242,0.6)] text-lg leading-relaxed font-light">
          Präzise Abstimmung deiner biologischen Rhythmen und Umgebungsvariablen. Wir kalibrieren
          deine physische Existenz für maximale kognitive Kapazität.
        </p>
      </header>

      {/* ── Bento Grid ── */}
      <div className="grid grid-cols-12 gap-x-6 gap-y-8">

        {/* Circadian & Environment */}
        <section className={`${glass} col-span-12 lg:col-span-8 p-10 xl:p-12 rounded-xl space-y-10 min-h-[460px] flex flex-col justify-between`}>
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-serif text-2xl mb-1 text-slate-900 dark:text-white">Circadianer Rhythmus</h3>
              <p className={`${label} text-slate-500 dark:text-[rgba(236,232,242,0.6)]`}>Rhythmus &amp; Umgebung</p>
            </div>
            <span className="material-symbols-outlined" style={{ color: ACCENT }}>light_mode</span>
          </div>

          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-4">
              <label className={`${label} text-slate-500 dark:text-[rgba(236,232,242,0.6)] block`}>Aufwach-Fenster</label>
              <div className="flex items-end gap-2">
                <input
                  type="text"
                  value={wake}
                  onChange={(e) => setWake(e.target.value)}
                  onBlur={saveCircadian}
                  className="bg-transparent border-b border-slate-300 dark:border-white/20 focus:border-[#1A6AFF] transition-colors text-3xl font-serif w-24 p-0 outline-none text-slate-800 dark:text-white"
                />
                <span className={`${label} text-slate-500 dark:text-[rgba(236,232,242,0.6)] mb-2`}>AM</span>
              </div>
            </div>
            <div className="space-y-4">
              <label className={`${label} text-slate-500 dark:text-[rgba(236,232,242,0.6)] block`}>Einschlaf-Fenster</label>
              <div className="flex items-end gap-2">
                <input
                  type="text"
                  value={sleep}
                  onChange={(e) => setSleep(e.target.value)}
                  onBlur={saveCircadian}
                  className="bg-transparent border-b border-slate-300 dark:border-white/20 focus:border-[#1A6AFF] transition-colors text-3xl font-serif w-24 p-0 outline-none text-slate-800 dark:text-white"
                />
                <span className={`${label} text-slate-500 dark:text-[rgba(236,232,242,0.6)] mb-2`}>PM</span>
              </div>
            </div>
          </div>

          {/* Daily environment routine */}
          <div className="space-y-4 pt-4">
            <div className="space-y-3">
              <div className={`flex justify-between items-center ${label} text-slate-600 dark:text-[rgba(236,232,242,0.6)]`}>
                <span>Umgebungs-Routine heute</span>
                <span style={{ color: ACCENT }}>{envDoneCount}/{ENV_ITEMS.length}</span>
              </div>
              <div className="h-1 bg-slate-200 dark:bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full transition-all duration-500"
                  style={{ width: `${envProgress}%`, background: ACCENT, boxShadow: '0 0 30px rgba(26,106,255,0.15)' }}
                />
              </div>
            </div>

            {/* Streak & dot history indicator */}
            <div className="flex justify-between items-center pt-2">
              <div className="flex gap-1.5">
                {envDots.map((dot) => {
                  let tooltip = `${dot.dayStr}: ${dot.doneCount}/5 erledigt`;
                  let colorClass = "bg-slate-200 dark:bg-white/10 border-slate-300/30 dark:border-white/5";
                  if (dot.completed) colorClass = "bg-[#1A6AFF] border-[#1A6AFF]/50 shadow-[0_0_10px_rgba(26,106,255,0.4)] text-white";
                  else if (dot.partial) colorClass = "bg-[#1A6AFF]/40 dark:bg-[#1A6AFF]/45 border-[#1A6AFF]/20 dark:border-[#1A6AFF]/30 text-white";

                  return (
                    <div
                      key={dot.dayStr}
                      className={`w-4 h-4 rounded-full border flex items-center justify-center text-[7px] font-bold ${colorClass}`}
                      title={tooltip}
                    >
                      <span className="text-[6.5px] opacity-70">{dot.label}</span>
                    </div>
                  );
                })}
              </div>
              <div className="text-right">
                <span className="font-serif text-lg text-slate-900 dark:text-white" style={circadianStreak > 0 ? { color: ACCENT } : undefined}>{circadianStreak}</span>
                <span className={`${label} text-[8px] text-slate-500 dark:text-[rgba(236,232,242,0.6)] ml-1`}>Routine-Streak</span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
              {ENV_ITEMS.map((item) => {
                const on = !!envChecks[item.key];
                return (
                  <button
                    type="button"
                    key={item.key}
                    onClick={() => toggleEnv(item.key)}
                    aria-pressed={on}
                    className={`p-3 rounded-lg border flex items-center gap-2 text-left transition-all duration-300 hover:border-slate-300 dark:hover:border-white/20 ${
                      on 
                        ? 'border-[#1A6AFF]/40 bg-[#1A6AFF]/10 text-slate-900 dark:text-white' 
                        : 'border-slate-200 dark:border-white/5 bg-slate-100/30 dark:bg-white/[0.02] text-slate-600 dark:text-white/60'
                    }`}
                  >
                    <span className="material-symbols-outlined text-base shrink-0 animate-none" style={{ color: on ? ACCENT : undefined }}>
                      {on ? 'check_circle' : item.icon}
                    </span>
                    <span className="text-[0.7rem] leading-tight font-medium">
                      {item.label}
                    </span>
                  </button>
                );
              })}

              {/* Lux target — editable, persisted */}
              <div className="p-3 rounded-lg border border-slate-200 dark:border-white/[0.06] bg-slate-100/20 dark:bg-white/[0.02] flex flex-col justify-center gap-1">
                <span className={`${label} text-[0.5rem] text-slate-500 dark:text-[rgba(236,232,242,0.6)]`}>Morgenlicht-Ziel</span>
                <div className="flex items-baseline gap-1">
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={envData.luxTarget ?? 10000}
                    onChange={(e) => saveEnv((prev) => ({ ...prev, luxTarget: Number(e.target.value) }))}
                    className="bg-transparent border-b border-slate-300 dark:border-white/15 focus:border-[#1A6AFF] transition-colors text-base font-serif w-16 p-0 outline-none text-slate-800 dark:text-white"
                  />
                  <span className={`${label} text-[0.5rem] text-slate-500 dark:text-[rgba(236,232,242,0.6)]`}>Lux</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Focus Intervals */}
        <section className={`${glass} col-span-12 lg:col-span-4 p-10 xl:p-12 rounded-xl flex flex-col justify-between min-h-[460px]`}>
          <div>
            <h3 className="font-serif text-2xl mb-1 text-slate-900 dark:text-white">Fokus-Intervalle</h3>
            <p className={`${label} text-slate-500 dark:text-[rgba(236,232,242,0.6)] mb-4`}>Neuro-Sync Presets</p>
          </div>

          {/* Coupled block display */}
          <div className="p-3 bg-slate-100/50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 rounded-lg text-center space-y-1 my-1">
            <span className={`${label} text-[9px] text-slate-500 dark:text-[rgba(236,232,242,0.5)]`}>Gekoppelter Block</span>
            {focusRunning ? (
              <div className="text-xs font-serif italic text-slate-800 dark:text-white">
                {focusActive?.blockTitle || 'Deep Work'} ({focusActive?.pillar || 'Fokus'})
              </div>
            ) : (
              <div className="text-xs font-serif text-slate-600 dark:text-[rgba(236,232,242,0.55)]">
                {activeBlockTitle ? `${activeBlockTitle} (${activeBlock?.pillar || activeBlock?.type || 'Routine'})` : 'Kein aktiver Block'}
              </div>
            )}
          </div>

          <div className="flex flex-col items-center justify-center py-2 space-y-4">
            <div className="text-5xl font-mono tracking-wider font-light text-slate-900 dark:text-[#ECE8F2]" style={focusRunning ? { color: ACCENT } : undefined}>
              {formatTime(focusTimeLeft)}
            </div>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={handleStartPauseFocus}
                className="px-4 py-2 rounded-lg text-xs font-mono tracking-widest uppercase transition-all duration-300 border border-slate-200 dark:border-white/10 hover:bg-[#1A6AFF] hover:border-[#1A6AFF] hover:text-white text-slate-800 dark:text-white"
                style={focusRunning ? { borderColor: 'rgba(26,106,255,0.4)', background: 'rgba(26,106,255,0.1)' } : {}}
              >
                {focusRunning ? 'Pause' : 'Start'}
              </button>
              <button
                type="button"
                onClick={handleResetFocus}
                className="px-4 py-2 rounded-lg text-xs font-mono tracking-widest uppercase border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-800 dark:text-white transition-all duration-300"
              >
                Reset
              </button>
            </div>
            {/* Notification Permission Opt-in */}
            {focusNotifDefault && (
              <button
                type="button"
                onClick={enableFocusNotifications}
                className="text-[9px] font-mono hover:underline flex items-center justify-center gap-1"
                style={{ color: ACCENT }}
              >
                <span className="material-symbols-outlined text-xs">notifications_active</span>
                Mitteilungen erlauben
              </button>
            )}
          </div>

          <div className="space-y-2 mt-2">
            {[
              { min: 25, labelStr: '25m', name: 'Deep Work Sprint' },
              { min: 45, labelStr: '45m', name: 'Extended Flow' },
              { min: 60, labelStr: '60m', name: 'Master Protocol' },
            ].map((p) => {
              const active = focusPreset === p.min;
              return (
                <button
                  key={p.min}
                  type="button"
                  onClick={() => handlePresetSelect(p.min)}
                  className={`w-full group p-3 border rounded-xl flex items-center justify-between transition-all duration-300 hover:bg-[#1A6AFF] hover:border-[#1A6AFF] hover:text-white ${
                    active 
                      ? 'border-[#1A6AFF]/40 bg-[#1A6AFF]/10 text-slate-800 dark:text-white' 
                      : 'border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02] text-slate-600 dark:text-white/60'
                  }`}
                >
                  <span className="font-serif italic text-xl group-hover:text-white">{p.labelStr}</span>
                  <span className={`${label} text-[0.55rem] group-hover:text-white/80`}>{p.name}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-white/5 space-y-4">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <div className="font-serif text-xl text-slate-900 dark:text-white">{focusTodayMinutes}</div>
                <div className={`${label} text-[8px] text-slate-500 dark:text-[rgba(236,232,242,0.6)]`}>Min heute</div>
              </div>
              <div>
                <div className="font-serif text-xl text-slate-900 dark:text-white">{focusTodaySessions.length}</div>
                <div className={`${label} text-[8px] text-slate-500 dark:text-[rgba(236,232,242,0.6)]`}>Sessions</div>
              </div>
              <div>
                <div className="font-serif text-xl" style={focusStreak > 0 ? { color: ACCENT } : undefined}>{focusStreak}</div>
                <div className={`${label} text-[8px] text-slate-500 dark:text-[rgba(236,232,242,0.6)]`}>Tages-Streak</div>
              </div>
            </div>
          </div>

          {/* Simple SVG Focus Weekly Chart */}
          <FocusWeeklyChart sessions={focusSessions} labelStyle={label} />
        </section>

        {/* Link Automation */}
        <section className={`${glass} col-span-12 lg:col-span-6 p-10 xl:p-12 rounded-xl min-h-[320px] flex flex-col justify-between`}>
          <div className="w-full">
            <div className="flex justify-between items-start mb-6">
              <h3 className="font-serif text-2xl text-slate-900 dark:text-white">Link-Automatisierung</h3>
              <button
                type="button"
                onClick={() => setShowAddMapping(!showAddMapping)}
                className="px-3 py-1.5 rounded-lg text-xs font-mono tracking-widest uppercase border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-800 dark:text-white transition-all duration-300"
              >
                {showAddMapping ? 'Abbrechen' : 'Neu'}
              </button>
            </div>

            {/* Toggle Switch for Auto-Opening Matched Links */}
            <div className="flex items-center gap-2 mb-4 p-3 bg-slate-100/30 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 rounded-lg justify-between">
              <span className="text-xs text-slate-600 dark:text-[rgba(236,232,242,0.65)] font-mono font-medium">Automatisches Öffnen aktiver Blöcke</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!config.autoOpenEnabled}
                  onChange={(e) => saveManagerConfig(prev => ({ ...prev, autoOpenEnabled: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-300 dark:bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-white after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#1A6AFF]"></div>
              </label>
            </div>

            {/* Matching Mappings Widget */}
            {matchingMappings.length > 0 && (
              <div className="mb-6 p-4 bg-[#1A6AFF]/10 border border-[#1A6AFF]/20 rounded-xl space-y-3">
                <div className="flex items-center gap-2 text-xs font-mono" style={{ color: ACCENT }}>
                  <span className="material-symbols-outlined text-sm">auto_awesome</span>
                  <span>Passende Link-Zuordnung gefunden</span>
                </div>
                <p className="text-xs text-slate-700 dark:text-[rgba(236,232,242,0.7)]">
                  Aktueller Block: <strong>{activeBlockTitle}</strong>
                </p>
                <div className="space-y-2">
                  {matchingMappings.map(m => (
                    <div key={m.id} className="flex justify-between items-center bg-slate-100 dark:bg-black/20 p-2.5 rounded-lg border border-slate-200 dark:border-white/5">
                      <span className="text-[11px] font-mono text-slate-800 dark:text-white truncate max-w-[180px]">{m.pattern}</span>
                      <button
                        type="button"
                        onClick={() => {
                          const blockReason = isUrlBlockedByMonkMode(m.url);
                          if (blockReason) {
                            alert(`🛡️ Monk Mode Block\n\nDieser Link ist aktuell blockiert: ${blockReason}`);
                          } else {
                            window.open(m.url, '_blank');
                          }
                        }}
                        className="px-3 py-1 rounded text-[10px] font-mono bg-[#1A6AFF] hover:bg-[#3b82f6] text-white transition-colors flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-xs">open_in_new</span>
                        Öffnen
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {showAddMapping ? (
              <form onSubmit={handleAddMapping} className="space-y-4 mb-6">
                <div>
                  <label className={`${label} text-slate-500 dark:text-[rgba(236,232,242,0.6)] block mb-1`}>Suchbegriff / Pattern</label>
                  <input
                    type="text"
                    value={pattern}
                    onChange={(e) => setPattern(e.target.value)}
                    placeholder="z.B. Deep Work"
                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2.5 text-xs font-mono placeholder:text-slate-400 dark:placeholder:text-white/20 text-slate-800 dark:text-[#ECE8F2] focus:ring-1 focus:ring-[#1A6AFF] focus:border-[#1A6AFF] transition-all outline-none"
                    required
                  />
                </div>
                <div>
                  <label className={`${label} text-slate-500 dark:text-[rgba(236,232,242,0.6)] block mb-1`}>Ziel-URL</label>
                  <input
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="z.B. notion.so/workspace"
                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2.5 text-xs font-mono placeholder:text-slate-400 dark:placeholder:text-white/20 text-slate-800 dark:text-[#ECE8F2] focus:ring-1 focus:ring-[#1A6AFF] focus:border-[#1A6AFF] transition-all outline-none"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-lg text-xs font-mono tracking-widest uppercase text-white transition-all active:scale-95 hover:brightness-110"
                  style={{ background: ACCENT }}
                >
                  Speichern
                </button>
              </form>
            ) : (
              <div>
                <div className={`grid grid-cols-12 ${label} text-[0.65rem] text-slate-500 dark:text-[rgba(236,232,242,0.6)] pb-4 mb-2 border-b border-slate-200 dark:border-white/5`}>
                  <span className="col-span-5">Suchmuster</span>
                  <span className="col-span-5 text-right">Ziel-URL</span>
                  <span className="col-span-2 text-right">Aktion</span>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-white/[0.04] max-h-[180px] overflow-y-auto">
                  {mappings.map((m) => (
                    <div key={m.id} className="grid grid-cols-12 items-center gap-2 py-3 hover:bg-slate-100 dark:hover:bg-white/[0.015] -mx-2 px-2 rounded-md transition-colors">
                      <span className="col-span-5 font-medium text-sm truncate text-slate-900 dark:text-white" style={{ color: ACCENT }}>{m.pattern}</span>
                      <span className="col-span-5 font-mono text-xs text-slate-500 dark:text-[rgba(236,232,242,0.6)] truncate text-right" title={m.url}>{m.url}</span>
                      <div className="col-span-2 flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const blockReason = isUrlBlockedByMonkMode(m.url);
                            if (blockReason) {
                              alert(`🛡️ Monk Mode Block\n\nDieser Link ist aktuell blockiert: ${blockReason}`);
                            } else {
                              window.open(m.url, '_blank');
                            }
                          }}
                          className="hover:text-[#1A6AFF] dark:hover:text-white/80 transition-colors text-slate-400 dark:text-white/40 flex items-center justify-center animate-none"
                          title="Öffnen"
                        >
                          <span className="material-symbols-outlined text-base">open_in_new</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteMapping(m.id)}
                          className="hover:text-red-500 transition-colors text-slate-400 dark:text-white/40 flex items-center justify-center animate-none"
                          title="Löschen"
                        >
                          <span className="material-symbols-outlined text-base">delete</span>
                        </button>
                      </div>
                    </div>
                  ))}
                  {mappings.length === 0 && (
                    <div className="py-6 text-center text-xs text-slate-400 dark:text-white/40">
                      Keine Zuordnungen definiert. Klicken Sie auf 'Neu', um ein Mapping hinzuzufügen.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          {!showAddMapping && (
            <button
              type="button"
              onClick={() => setShowAddMapping(true)}
              className={`pt-6 ${label} text-[0.65rem] flex items-center gap-2 hover:translate-x-1 transition-transform`}
              style={{ color: ACCENT }}
            >
              Mapping hinzufügen <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </button>
          )}
        </section>

        {/* Outlier Research */}
        <section className={`${glass} col-span-12 lg:col-span-6 p-10 xl:p-12 rounded-xl space-y-6 min-h-[320px] flex flex-col justify-between`}>
          <div className="space-y-6 w-full">
            <h3 className="font-serif text-2xl text-slate-900 dark:text-white">Outlier-Recherche</h3>
            <form onSubmit={handleCockpitResearch} className="relative">
              <input
                type="text"
                value={research}
                onChange={(e) => setResearch(e.target.value)}
                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-4 py-3 text-xs font-mono tracking-widest uppercase placeholder:text-slate-400 dark:placeholder:text-white/20 text-slate-800 dark:text-white focus:ring-1 focus:ring-[#1A6AFF] focus:border-[#1A6AFF] transition-all outline-none"
                placeholder="Youtube Context Ingestion URL oder Begriff..."
              />
              <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 p-2 hover:scale-110 transition-transform" style={{ color: ACCENT }}>
                <span className="material-symbols-outlined">bolt</span>
              </button>
            </form>
            <div className="space-y-3 max-h-[180px] overflow-y-auto pr-1">
              {(config.research || []).map((item) => (
                <div
                  key={item.id}
                  onClick={() => setSelectedResearch(item)}
                  className="p-3 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 rounded-lg flex items-center justify-between cursor-pointer hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-all duration-200"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="material-symbols-outlined text-slate-500 dark:text-[rgba(236,232,242,0.6)] text-sm animate-none">
                      {item.category === 'YouTube' ? 'smart_display' : 'article'}
                    </span>
                    <span className="text-xs truncate max-w-[200px] text-slate-800 dark:text-[#ECE8F2]" title={item.title}>{item.title}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {item.tags && item.tags.length > 0 && (
                      <span className="bg-slate-200 dark:bg-white/5 border border-slate-300 dark:border-white/10 text-[8px] font-mono px-1.5 py-0.5 rounded text-slate-600 dark:text-white/50">
                        #{item.tags[0]}
                      </span>
                    )}
                    <span className={`${label} text-[0.55rem]`} style={{ color: item.analysisReport ? ACCENT : undefined }}>
                      {item.analysisReport ? 'Bereit' : 'Keine Analyse'}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const updatedResearch = (config.research || []).filter((r) => r.id !== item.id);
                        saveManagerConfig(prev => ({ ...prev, research: updatedResearch }));
                        if (selectedResearch?.id === item.id) {
                          setSelectedResearch(null);
                        }
                      }}
                      className="hover:text-red-500 transition-colors text-slate-400 dark:text-white/40 flex items-center justify-center animate-none"
                      title="Löschen"
                    >
                      <span className="material-symbols-outlined text-sm">delete</span>
                    </button>
                  </div>
                </div>
              ))}
              {(config.research || []).length === 0 && (
                <div className="py-6 text-center text-xs text-slate-400 dark:text-white/40">
                  Keine Forschungsziele hinterlegt. Fügen Sie oben ein URL- oder Suchziel hinzu.
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Finanz-Tracker card → opens full Financial Tracker */}
        <section className={`${glass} col-span-12 p-10 xl:p-12 rounded-xl space-y-8`}>
          <div className="flex flex-col md:flex-row justify-between md:items-end gap-6">
            <div className="space-y-2">
              <span className={`${label} block`} style={{ color: ACCENT, letterSpacing: '0.3em' }}>Cash Flow Analysis</span>
              <h3 className="font-serif text-3xl text-slate-900 dark:text-white">Finanz-Tracker</h3>
            </div>
            <div className="flex items-end gap-8 flex-wrap">
              <div className="text-right">
                <p className={`${label} text-[0.55rem] text-slate-500 dark:text-[rgba(236,232,242,0.6)] mb-1`}>Liquidität</p>
                <p className="font-serif text-2xl text-slate-900 dark:text-white">
                  € {netBalance.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div className="text-right border-l border-slate-200 dark:border-white/10 pl-6">
                <p className={`${label} text-[0.55rem] text-slate-500 dark:text-[rgba(236,232,242,0.6)] mb-1`}>Netto MTD</p>
                <p className="font-serif text-2xl" style={{ color: mtdNet >= 0 ? ACCENT : '#ff4d4d' }}>
                  {mtdNet >= 0 ? '+' : ''}€ {mtdNet.toLocaleString('de-DE', { maximumFractionDigits: 0 })}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setView('financial')}
                className="self-center flex items-center gap-2 px-5 py-3 rounded-lg text-xs font-medium tracking-widest uppercase text-white transition-all active:scale-95 hover:brightness-110"
                style={{ background: ACCENT }}
              >
                Financial Tracker <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-8 lg:gap-12">
            {/* Cumulative balance (dynamic LineChart) */}
            <div className="col-span-12 lg:col-span-4 space-y-6">
              <div className="flex justify-between items-center">
                <p className={`${label} text-slate-500 dark:text-[rgba(236,232,242,0.6)]`}>Kumulativer Saldo</p>
              </div>
              <LineChart transactions={transactions} />
            </div>

            {/* Category overview */}
            <div className="col-span-12 lg:col-span-4 space-y-6">
              <p className={`${label} text-slate-500 dark:text-[rgba(236,232,242,0.6)]`}>Kategorie-Übersicht</p>
              <div className="space-y-5">
                {cockpitExpenseCats.map((c, i) => (
                  <div key={c.category} className="space-y-2">
                    <div className="flex justify-between text-[0.65rem] font-mono">
                      <span className="text-slate-800 dark:text-[#ECE8F2]">{c.category}</span>
                      <span className="text-slate-500 dark:text-[rgba(236,232,242,0.6)]">
                        € {c.value.toLocaleString('de-DE', { maximumFractionDigits: 0 })}
                      </span>
                    </div>
                    <div className="h-1 bg-slate-200 dark:bg-white/5 w-full rounded-full overflow-hidden">
                      <div className="h-full" style={{ width: `${c.pct}%`, background: ACCENT, opacity: 1 - i * 0.3 }} />
                    </div>
                  </div>
                ))}
                {cockpitExpenseCats.length === 0 && (
                  <p className="text-xs text-slate-400 dark:text-[rgba(236,232,242,0.4)]">Noch keine Ausgaben erfasst.</p>
                )}
              </div>
            </div>

            {/* Transaction log */}
            <div className="col-span-12 lg:col-span-4 space-y-6">
              <p className={`${label} text-slate-500 dark:text-[rgba(236,232,242,0.6)]`}>Transaktions-Log</p>
              <div className="space-y-3">
                {recentTransactions.map((t) => (
                  <div key={t.id} className="p-3 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="material-symbols-outlined text-sm shrink-0 animate-none" style={{ color: ACCENT }}>
                        {t.type === 'income' ? 'trending_up' : 'sync'}
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-slate-900 dark:text-[#ECE8F2] truncate">{t.description || t.category}</p>
                        <p className={`${label} text-[0.55rem] text-slate-500 dark:text-[rgba(236,232,242,0.6)]`}>
                          {t.category} • {t.date}
                        </p>
                      </div>
                    </div>
                    <span className="text-[0.6rem] font-mono shrink-0 ml-2" style={{ color: t.type === 'income' ? '#22c55e' : undefined }}>
                      {t.type === 'income' ? '+' : '-'}€ {t.amount.toLocaleString('de-DE', { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                ))}
                {recentTransactions.length === 0 && (
                  <p className="text-xs text-slate-400 dark:text-[rgba(236,232,242,0.4)]">Noch keine Transaktionen.</p>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Strategic Analysis Details Drawer */}
      {selectedResearch && (
        <section className={`${glass} w-full p-10 xl:p-12 rounded-xl border-l-4 border-l-[#1A6AFF] space-y-6 mt-8 relative`}>
          <div className="flex justify-between items-center pb-4 border-b border-slate-200 dark:border-white/10">
            <h3 className="font-serif text-2xl text-slate-900 dark:text-white">Analyse: {selectedResearch.title}</h3>
            <button
              type="button"
              onClick={() => setSelectedResearch(null)}
              className="text-slate-400 hover:text-slate-900 dark:text-white/40 dark:hover:text-white transition-colors"
              title="Schließen"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          {analysisLoading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className={styles.spinner} />
              <p className="font-mono text-xs text-[#1A6AFF] animate-pulse">
                {analysisSteps[analysisStep]}
              </p>
            </div>
          ) : selectedResearch.analysisData ? (
            <div className="space-y-6">

              {/* Inline Video Player */}
              {playingVideoId && (
                <div className={styles.videoPlayerContainer}>
                  <iframe
                    src={`https://www.youtube.com/embed/${playingVideoId}?autoplay=1`}
                    title="YouTube video player"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    className={styles.videoPlayerIframe}
                  />
                  <button className={styles.videoPlayerClose} onClick={() => setPlayingVideoId(null)}>✕</button>
                </div>
              )}

              {/* Mode: Multi-channels found */}
              {selectedResearch.analysisData.mode === 'multiple_channels' && (
                <div className={styles.pickerContainer}>
                  <h4 className={styles.pickerTitle}>Mehrere Kanäle gefunden. Welchen meintest du?</h4>
                  <div className={styles.pickerGrid}>
                    {selectedResearch.analysisData.channels.map(chan => (
                      <div key={chan.channelId} className={styles.pickerCard}>
                        <img src={chan.thumbnail || '/avatar-placeholder.png'} className={styles.pickerAvatar} alt={chan.title} />
                        <div className={styles.pickerInfo}>
                          <div className={styles.pickerName}>
                            {chan.title} {chan.verified && <span className={styles.verifiedCheck}>✓</span>}
                          </div>
                          <div className={styles.pickerMeta}>{chan.subscribersText || 'Keine Angabe'}</div>
                        </div>
                        <button
                          className={styles.pickerSelectBtn}
                          onClick={() => runOutlierAnalysis(selectedResearch, chan.channelId)}
                        >
                          Auswählen
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Mode: Single Channel Dashboard */}
              {selectedResearch.analysisData.mode === 'channel' && (
                <div className={styles.channelDashboard}>
                  <div className={styles.channelHeaderCard}>
                    {selectedResearch.analysisData.channel && (
                      <>
                        <img src={selectedResearch.analysisData.channel.thumbnail || '/avatar-placeholder.png'} className={styles.channelAvatar} alt="" />
                        <div className={styles.channelInfo}>
                          <h4 className={styles.channelName}>
                            {selectedResearch.analysisData.channel.title}
                            {selectedResearch.analysisData.channel.verified && <span className={styles.verifiedBadge} title="Verifiziert">✓</span>}
                          </h4>
                          <div className={styles.channelSubscribers}>{selectedResearch.analysisData.channel.subscribersText}</div>
                          <a href={`https://youtube.com/${selectedResearch.analysisData.channel.handle}`} target="_blank" rel="noopener noreferrer" className={styles.channelLink}>
                            Kanal ansehen ↗
                          </a>
                        </div>
                      </>
                    )}
                  </div>

                  <h4 className="font-mono text-xs text-slate-500 dark:text-white/60 mb-3 uppercase tracking-wider">Die 5 neuesten Videos des Kanals:</h4>
                  <div className={styles.videoGrid}>
                    {selectedResearch.analysisData.videos && selectedResearch.analysisData.videos.map(vid => (
                      <div key={vid.videoId} className={styles.videoCard} onClick={() => setPlayingVideoId(vid.videoId)}>
                        <div className={styles.videoThumbContainer}>
                          <img src={vid.thumbnail} alt="" className={styles.videoThumb} />
                          <div className={styles.playIconOverlay}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M8 5v14l11-7z" />
                            </svg>
                          </div>
                        </div>
                        <div className={styles.videoTitle} title={vid.title}>{vid.title}</div>
                        <div className={styles.videoMeta}>
                          <span>{vid.viewsText}</span>
                          <span>•</span>
                          <span>{vid.publishedText}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Mode: Keyword search dashboard & Uncertain Fallback */}
              {(selectedResearch.analysisData.mode === 'keyword' || selectedResearch.analysisData.mode === 'uncertain') && (
                <div className={styles.keywordDashboard}>
                  <h4 className="font-mono text-xs text-slate-500 dark:text-white/60 mb-3 uppercase tracking-wider">Suchergebnisse für Nische:</h4>
                  <div className={styles.videoList}>
                    {selectedResearch.analysisData.videos && selectedResearch.analysisData.videos.map(vid => (
                      <div key={vid.videoId} className={styles.videoListRow} onClick={() => setPlayingVideoId(vid.videoId)}>
                        <img src={vid.thumbnail} className={styles.videoRowThumb} alt="" />
                        <div className={styles.videoRowInfo}>
                          <div className={styles.videoRowTitle}>{vid.title}</div>
                          <div className={styles.videoRowMeta}>{vid.viewsText} • {vid.publishedText}</div>
                        </div>
                        <button className={styles.videoRowPlayBtn}>Abspielen</button>
                      </div>
                    ))}
                  </div>

                  {/* Suggestions for uncertain channel matching */}
                  {selectedResearch.analysisData.mode === 'uncertain' && selectedResearch.analysisData.suggestedChannels && (
                    <div className={styles.pickerContainer} style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
                      <h4 className={styles.pickerTitle} style={{ fontSize: '0.8rem' }}>Meintest du einen dieser Kanäle?</h4>
                      <div className={styles.pickerGrid}>
                        {selectedResearch.analysisData.suggestedChannels.map(chan => (
                          <div key={chan.channelId} className={styles.pickerCard} style={{ padding: '0.5rem 0.75rem' }}>
                            <img src={chan.thumbnail || '/avatar-placeholder.png'} className={styles.pickerAvatar} style={{ width: '30px', height: '30px' }} alt="" />
                            <div className={styles.pickerInfo}>
                              <div className={styles.pickerName} style={{ fontSize: '0.75rem' }}>{chan.title}</div>
                              <div className={styles.pickerMeta} style={{ fontSize: '0.65rem' }}>{chan.subscribersText}</div>
                            </div>
                            <button
                              className={styles.pickerSelectBtn}
                              style={{ fontSize: '0.65rem', padding: '0.2rem 0.5rem' }}
                              onClick={() => runOutlierAnalysis(selectedResearch, chan.channelId)}
                            >
                              Analysieren
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Notes & Tags Editor */}
              <div className="p-5 bg-slate-100/50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 rounded-xl space-y-4">
                <h5 className={`${label} text-[10px] text-slate-800 dark:text-white/70`}>Notizen &amp; Tags</h5>
                <div className="space-y-3">
                  <div>
                    <label className={`${label} text-[8px] text-slate-500 dark:text-[rgba(236,232,242,0.5)] block mb-1`}>Tags (kommagetrennt)</label>
                    <input
                      type="text"
                      value={researchTags}
                      onChange={(e) => setResearchTags(e.target.value)}
                      placeholder="competitor, hook-idea, learning..."
                      className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-xs font-mono placeholder:text-slate-400 dark:placeholder:text-white/20 text-slate-800 dark:text-[#ECE8F2] focus:ring-1 focus:ring-[#1A6AFF] focus:border-[#1A6AFF] transition-all outline-none"
                    />
                  </div>
                  <div>
                    <label className={`${label} text-[8px] text-slate-500 dark:text-[rgba(236,232,242,0.5)] block mb-1`}>Eigene Notizen</label>
                    <textarea
                      value={researchNotes}
                      onChange={(e) => setResearchNotes(e.target.value)}
                      placeholder="Eigene Gedanken..."
                      rows={3}
                      className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-xs font-mono placeholder:text-slate-400 dark:placeholder:text-white/20 text-slate-800 dark:text-[#ECE8F2] focus:ring-1 focus:ring-[#1A6AFF] focus:border-[#1A6AFF] transition-all outline-none resize-none"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => handleSaveResearchNotes(researchNotes, researchTags)}
                      className="flex-1 py-2 rounded-lg text-[10px] font-mono tracking-wider bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-800 dark:text-white transition-all font-medium"
                    >
                      Änderungen speichern
                    </button>
                    <button
                      type="button"
                      onClick={() => exportToVault(selectedResearch)}
                      className="flex-1 py-2 rounded-lg text-[10px] font-mono tracking-wider text-white transition-all bg-[#1A6AFF] hover:bg-[#3b82f6] flex items-center justify-center gap-1 font-medium"
                    >
                      <span className="material-symbols-outlined text-xs">archive</span>
                      In den Vault exportieren
                    </button>
                  </div>
                </div>
              </div>

              {/* Strategic Report text */}
              {selectedResearch.analysisReport && (
                <div className={styles.reportViewer}>
                  <h4 className="font-mono text-xs text-slate-500 dark:text-white/60 mb-2 uppercase tracking-wider">Strategische Auswertung:</h4>
                  <div className="reportContent text-slate-800 dark:text-[#ECE8F2]">{selectedResearch.analysisReport}</div>
                </div>
              )}

            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <p className="text-sm text-slate-400 dark:text-white/40">Noch keine Outlier-Analyse für dieses Ziel durchgeführt.</p>
              <button
                type="button"
                onClick={() => runOutlierAnalysis(selectedResearch)}
                className="px-6 py-2.5 rounded-lg text-xs font-mono tracking-widest uppercase text-white transition-all active:scale-95 hover:brightness-110"
                style={{ background: ACCENT }}
              >
                Outlier Analyse starten
              </button>
            </div>
          )}
        </section>
      )}

      {/* Footer bar */}
      <footer className={`mt-12 border-t border-slate-200 dark:border-white/5 pt-6 flex flex-col sm:flex-row justify-between gap-3 ${label} text-slate-500 dark:text-[rgba(236,232,242,0.6)]`} style={{ letterSpacing: '0.3em' }}>
        <span>System: {isOnline ? 'Optimal' : 'Offline'}</span>
        <div className="flex gap-8">
          <span>Latenz: {latency}ms</span>
          <span>Bio-Sync: {bioSync}%</span>
          <span style={{ color: ACCENT }}>Pronoia OS Cloud Linked</span>
        </div>
      </footer>
    </div>
  );
}
