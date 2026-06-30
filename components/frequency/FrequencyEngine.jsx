'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useTabData } from '@/hooks/useTabData';
import styles from './FrequencyEngine.module.css';

/*
 * FrequencyEngine — immersive binaural-beat player (Web Audio API).
 * Design: "Aetheric Resonance" (generated with Google Stitch) — a quiet,
 * luminous sound-meditation room. Each state carries its own mood color;
 * a slowly breathing orb is the visualizer. Requires headphones.
 */

const STATES = [
  { id: 'focus',    label: 'Fokus',        band: 'Beta',  beat: 18,  carrier: 220, accent: '#7C9BFF', soft: 'rgba(124,155,255,0.16)' },
  { id: 'flow',     label: 'Flow',         band: 'Alpha', beat: 10,  carrier: 200, accent: '#5FD0A6', soft: 'rgba(95,208,166,0.15)' },
  { id: 'healing',  label: 'Heilung',      band: '432 Hz',beat: 7.8, carrier: 432, accent: '#E0C097', soft: 'rgba(224,192,151,0.15)' },
  { id: 'meditate', label: 'Meditation',   band: 'Theta', beat: 6,   carrier: 180, accent: '#C9AEFF', soft: 'rgba(201,174,255,0.17)' },
  { id: 'recover',  label: 'Regeneration', band: 'Theta', beat: 4.5, carrier: 160, accent: '#E8B07A', soft: 'rgba(232,176,122,0.15)' },
  { id: 'sleep',    label: 'Schlaf',       band: 'Delta', beat: 2.5, carrier: 140, accent: '#8FA6F0', soft: 'rgba(143,166,240,0.15)' },
];
const DURATIONS = [10, 20, 30, 45];

function fmt(secs) {
  if (secs == null) return '--:--';
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

const PlayIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M8 5.14v13.72a1 1 0 0 0 1.52.85l11-6.86a1 1 0 0 0 0-1.7l-11-6.86A1 1 0 0 0 8 5.14z" />
  </svg>
);
const PauseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <rect x="6" y="5" width="4" height="14" rx="1.6" />
    <rect x="14" y="5" width="4" height="14" rx="1.6" />
  </svg>
);

const todayKey = () => new Date().toISOString().slice(0, 10);

export default function FrequencyEngine() {
  const [stateId, setStateId] = useState('meditate');
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.4);
  const [duration, setDuration] = useState(20);
  const [remaining, setRemaining] = useState(null);
  const [supported, setSupported] = useState(true);

  const ctxRef = useRef(null);
  const nodesRef = useRef(null);
  const timerRef = useRef(null);
  const startRef = useRef(null); // { startMs, stateId, label, band, beat, totalSec }
  const hydratedRef = useRef(false);

  // Persisted config + session history (Firestore tabs signed-in, localStorage signed-out).
  const { data: cfg, save: saveCfg, loading: cfgLoading } = useTabData('frequencyConfig', {
    lastState: 'meditate', duration: 20, volume: 0.4, sessions: [],
  });

  const current = STATES.find(s => s.id === stateId) || STATES[0];

  useEffect(() => {
    if (typeof window !== 'undefined' && !(window.AudioContext || window.webkitAudioContext)) {
      setSupported(false);
    }
  }, []);

  // Hydrate controls from saved config once (after the async load).
  useEffect(() => {
    if (hydratedRef.current || cfgLoading) return;
    hydratedRef.current = true;
    if (cfg) {
      if (cfg.lastState && STATES.some(s => s.id === cfg.lastState)) setStateId(cfg.lastState);
      if (DURATIONS.includes(cfg.duration)) setDuration(cfg.duration);
      if (typeof cfg.volume === 'number') setVolume(cfg.volume);
    }
  }, [cfgLoading, cfg]);

  // Persist control selections (debounced by the hook).
  useEffect(() => {
    if (!hydratedRef.current) return;
    saveCfg(prev => ({ ...prev, lastState: stateId, duration, volume }));
  }, [stateId, duration, volume, saveCfg]);

  // ── Session history stats ──
  const sessions = cfg?.sessions || [];
  const todayMinutes = sessions
    .filter(s => (s.ts || '').slice(0, 10) === todayKey())
    .reduce((sum, s) => sum + (s.minutes || 0), 0);
  const sessionStreak = (() => {
    const days = new Set(sessions.map(s => (s.ts || '').slice(0, 10)));
    let c = 0;
    const d = new Date();
    if (!days.has(d.toISOString().slice(0, 10))) d.setDate(d.getDate() - 1);
    while (days.has(d.toISOString().slice(0, 10)) && c < 365) { c++; d.setDate(d.getDate() - 1); }
    return c;
  })();

  const stopAudio = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    const ctx = ctxRef.current;
    const n = nodesRef.current;
    if (n && ctx) {
      try { n.gain.gain.cancelScheduledValues(ctx.currentTime); } catch (e) {}
      try { n.gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.25); } catch (e) {}
      setTimeout(() => { try { n.oscL.stop(); n.oscR.stop(); } catch (e) {} }, 300);
    }
    nodesRef.current = null;
    setRemaining(null);
    setPlaying(false);

    // Log the finished session (≥60s); idempotent — startRef is cleared after.
    const sr = startRef.current;
    if (sr) {
      const elapsed = Math.min(sr.totalSec, Math.round((Date.now() - sr.startMs) / 1000));
      startRef.current = null;
      if (elapsed >= 60) {
        const entry = {
          ts: new Date().toISOString(),
          stateId: sr.stateId,
          label: sr.label,
          band: sr.band,
          beat: sr.beat,
          minutes: Math.round(elapsed / 60),
        };
        saveCfg(prev => ({ ...prev, sessions: [entry, ...(prev.sessions || [])].slice(0, 50) }));
      }
    }
  }, [saveCfg]);

  const startAudio = useCallback((stateObj, durMin, vol) => {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) { setSupported(false); return; }
    if (!ctxRef.current) ctxRef.current = new Ctx();
    const ctx = ctxRef.current;
    if (ctx.state === 'suspended') ctx.resume();

    const oscL = ctx.createOscillator();
    const oscR = ctx.createOscillator();
    const panL = ctx.createStereoPanner();
    const panR = ctx.createStereoPanner();
    const gain = ctx.createGain();
    panL.pan.value = -1;
    panR.pan.value = 1;
    oscL.type = 'sine';
    oscR.type = 'sine';
    oscL.frequency.value = stateObj.carrier;
    oscR.frequency.value = stateObj.carrier + stateObj.beat;
    oscL.connect(panL).connect(gain);
    oscR.connect(panR).connect(gain);
    gain.gain.value = 0;
    gain.connect(ctx.destination);
    gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + 0.6);
    oscL.start();
    oscR.start();
    nodesRef.current = { oscL, oscR, gain };
    startRef.current = {
      startMs: Date.now(),
      stateId: stateObj.id,
      label: stateObj.label,
      band: stateObj.band,
      beat: stateObj.beat,
      totalSec: durMin * 60,
    };

    setPlaying(true);
    let secs = durMin * 60;
    setRemaining(secs);
    timerRef.current = setInterval(() => {
      secs -= 1;
      setRemaining(secs);
      if (secs <= 0) stopAudio();
    }, 1000);
  }, [stopAudio]);

  const togglePlay = () => {
    if (playing) stopAudio();
    else startAudio(current, duration, volume);
  };

  const selectState = (id) => {
    setStateId(id);
    if (playing) {
      stopAudio();
      const next = STATES.find(s => s.id === id) || STATES[0];
      setTimeout(() => startAudio(next, duration, volume), 320);
    }
  };

  useEffect(() => {
    const n = nodesRef.current;
    const ctx = ctxRef.current;
    if (n && ctx) {
      try { n.gain.gain.setTargetAtTime(volume, ctx.currentTime, 0.1); } catch (e) {}
    }
  }, [volume]);

  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
    const n = nodesRef.current;
    if (n) { try { n.oscL.stop(); n.oscR.stop(); } catch (e) {} }
    if (ctxRef.current) { try { ctxRef.current.close(); } catch (e) {} }
  }, []);

  return (
    <div
      className={styles.fq}
      style={{ '--fq-accent': current.accent, '--fq-accent-soft': current.soft }}
    >
      <div className={styles.fqAtmos} aria-hidden="true" />

      <div className={styles.fqStage}>
        <div className={`${styles.fqOrb} ${playing ? styles.fqOrbBreathing : ''}`}>
          <div className={styles.fqOrbCore}>
            <div className={styles.fqHz}>{current.beat} Hz</div>
            <div className={styles.fqBand}>{current.band}</div>
          </div>
        </div>

        <div className={styles.fqTimer}>{playing ? fmt(remaining) : `${duration}:00`}</div>

        <button
          className={styles.fqPlay}
          onClick={togglePlay}
          disabled={!supported}
          aria-label={playing ? 'Pause' : 'Start'}
        >
          {playing ? <PauseIcon /> : <PlayIcon />}
        </button>
      </div>

      <div className={styles.fqControls}>
        <div className={styles.fqStates}>
          {STATES.map(s => (
            <button
              key={s.id}
              className={`${styles.fqPill} ${stateId === s.id ? styles.fqPillActive : ''}`}
              onClick={() => selectState(s.id)}
            >
              <span className={styles.fqPillLabel}>{s.label}</span>
              <span className={styles.fqPillMeta}>{s.band} · {s.beat} Hz</span>
            </button>
          ))}
        </div>

        <div className={styles.fqDur}>
          {DURATIONS.map(d => (
            <button
              key={d}
              className={`${styles.fqDurItem} ${duration === d ? styles.fqDurActive : ''}`}
              onClick={() => setDuration(d)}
              disabled={playing}
            >
              {d} Min
            </button>
          ))}
        </div>

        <div className={styles.fqVol}>
          <span className={styles.fqVolIcon}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M11 5 6 9H3v6h3l5 4V5z" />
            </svg>
          </span>
          <input
            type="range" min="0" max="1" step="0.01"
            value={volume}
            onChange={e => setVolume(Number(e.target.value))}
            className={styles.fqVolSlider}
            aria-label="Lautstärke"
          />
        </div>

        {!supported && <p className={styles.fqWarn}>Web Audio wird von diesem Browser nicht unterstützt.</p>}
        <p className={styles.fqDisclaimer}>Kopfhörer empfohlen · Wellness, kein Medizinprodukt</p>

        {/* Session stats — persisted history */}
        <div className={styles.fqStats}>
          <div className={styles.fqStat}>
            <span className={styles.fqStatVal}>{todayMinutes}</span>
            <span className={styles.fqStatLabel}>Min heute</span>
          </div>
          <div className={styles.fqStat}>
            <span className={styles.fqStatVal}>{sessions.length}</span>
            <span className={styles.fqStatLabel}>Sessions</span>
          </div>
          <div className={styles.fqStat}>
            <span className={styles.fqStatVal}>{sessionStreak}</span>
            <span className={styles.fqStatLabel}>Tage-Streak</span>
          </div>
        </div>
        {sessions.length > 0 ? (
          <div className={styles.fqRecent}>
            {sessions.slice(0, 3).map((s, i) => (
              <div key={i} className={styles.fqRecentItem}>
                <span>{s.label} · {s.minutes} Min</span>
                <span className={styles.fqRecentTime}>
                  {s.ts ? new Date(s.ts).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : ''}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className={styles.fqRecentEmpty}>Noch keine Sessions protokolliert.</p>
        )}
      </div>
    </div>
  );
}
