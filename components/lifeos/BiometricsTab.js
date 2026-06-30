'use client';

/*
 * Biometrie (Bio-Stack & Indicators) tab.
 *
 * Functional upgrade (2026-06-25): HRV & Sleep are now logged as a persisted
 * day-keyed time series (useTabData 'biometricsLog'), driving real 7-day
 * sparklines + computed deltas (replacing the old hardcoded 4.2%/1.5%). A
 * one-click WHOOP sync fills the values from the live wearable endpoint, and the
 * Bio-Stack is fully editable (name/dose/timing inline, restock, delete).
 *
 * profile.metrics.{hrv,sleep} stays the canonical "current value" (consensus + AI
 * in useProtocol read it) — we keep writing it via saveProfile and additionally
 * append to the history log. Signature accent: jade #34D399.
 */

import { useState } from 'react';
import { Heart, Moon, TrendingUp, TrendingDown, Trash2, RotateCw } from 'lucide-react';
import { auth } from '@/lib/firebase';
import { useTabData } from '@/hooks/useTabData';
import styles from './BiometricsTab.module.css';

const todayKey = () => new Date().toISOString().slice(0, 10);

// Build a chronological numeric series for a field, overlaying today's live
// value when it isn't logged yet, capped to the last 7 points.
function buildSeries(history, field, current) {
  const days = Object.keys(history || {}).sort();
  const arr = days.map((d) => history[d]?.[field]).filter((v) => Number.isFinite(v));
  const t = todayKey();
  if (!(t in (history || {})) && Number.isFinite(current)) arr.push(current);
  return arr.slice(-7);
}

// Percent change of the last point vs the previous one (null when <2 points).
function computeDelta(series) {
  if (!series || series.length < 2) return null;
  const last = series[series.length - 1];
  const prev = series[series.length - 2];
  if (!prev) return null;
  return ((last - prev) / prev) * 100;
}

function Sparkline({ data }) {
  if (!data || data.length < 2) {
    return <div className={styles.bmSparkEmpty}>Noch keine Trenddaten — speichere Werte über mehrere Tage.</div>;
  }
  const w = 240;
  const h = 34;
  const n = data.length;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const bw = Math.min(16, w / n - 4);
  const gap = n > 1 ? (w - n * bw) / (n - 1) : 0;
  return (
    <svg className={styles.bmSparkline} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true">
      {data.map((v, i) => {
        const bh = 4 + ((v - min) / range) * (h - 6);
        const x = i * (bw + gap);
        const y = h - bh;
        const last = i === n - 1;
        return <rect key={i} x={x} y={y} width={bw} height={bh} rx="2" fill="var(--bm-jade)" opacity={last ? 1 : 0.4} />;
      })}
    </svg>
  );
}

function DeltaBadge({ delta }) {
  if (delta == null) return <span className={styles.bmStatBase}>Noch keine Historie</span>;
  const up = delta >= 0;
  return (
    <span className={`${styles.bmDelta} ${up ? styles.bmDeltaUp : styles.bmDeltaDown}`}>
      {up ? <TrendingUp size={13} /> : <TrendingDown size={13} />} {Math.abs(delta).toFixed(1)}%
    </span>
  );
}

export default function BiometricsTab({
  profile,
  ltpPotential,
  plasticity,
  editHrv,
  setEditHrv,
  editSleep,
  setEditSleep,
  newGoalText,
  setNewGoalText,
  stack = [],
  saveProfile,
  setActiveTab,
  handleSaveMetrics,
  toggleGoal,
  handleAddGoal,
  addStackItem,
  consumeStackItem,
  updateStackItem,
  removeStackItem,
}) {
  const hrv = Number(profile?.metrics?.hrv || 72);
  const sleep = Number(profile?.metrics?.sleep || 84);

  const { data: bioLog, save: saveLog } = useTabData('biometricsLog', { history: {} });
  const history = bioLog?.history || {};

  const [whoop, setWhoop] = useState({ loading: false, msg: null, needConnect: false });

  const hrvSeries = buildSeries(history, 'hrv', hrv);
  const sleepSeries = buildSeries(history, 'sleep', sleep);
  const hrvDelta = computeDelta(hrvSeries);
  const sleepDelta = computeDelta(sleepSeries);

  // Append/overwrite today's entry, trimming to the last 60 days.
  const logMetrics = (h, s, source) => {
    saveLog((prev) => {
      const hist = { ...(prev.history || {}), [todayKey()]: { hrv: h, sleep: s, source } };
      const days = Object.keys(hist).sort();
      if (days.length > 60) {
        const keep = {};
        days.slice(-60).forEach((d) => { keep[d] = hist[d]; });
        return { ...prev, history: keep };
      }
      return { ...prev, history: hist };
    });
  };

  const submitMetrics = (e) => {
    e.preventDefault();
    // Write profile.metrics via the existing handler (consensus/AI source).
    handleSaveMetrics(e);
    const nh = parseInt(editHrv, 10);
    const ns = parseInt(editSleep, 10);
    logMetrics(Number.isFinite(nh) ? nh : hrv, Number.isFinite(ns) ? ns : sleep, 'manual');
  };

  const syncWhoop = async () => {
    setWhoop({ loading: true, msg: null, needConnect: false });
    try {
      const user = auth.currentUser;
      if (!user) {
        setWhoop({ loading: false, msg: 'Bitte einloggen, um WHOOP zu synchronisieren.', needConnect: false });
        return;
      }
      const token = await user.getIdToken();
      const res = await fetch('/api/connectors/whoop/sync', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.connected) {
        setWhoop({
          loading: false,
          msg: json.message || 'WHOOP ist nicht verbunden.',
          needConnect: !json.connected,
        });
        return;
      }
      const wh = Number(json.data?.hrv);
      const ws = Number(json.data?.sleep);
      const nh = Number.isFinite(wh) ? wh : hrv;
      const ns = Number.isFinite(ws) ? ws : sleep;
      if (Number.isFinite(wh)) setEditHrv(String(wh));
      if (Number.isFinite(ws)) setEditSleep(String(ws));
      if (typeof saveProfile === 'function') saveProfile({ metrics: { hrv: nh, sleep: ns } });
      logMetrics(nh, ns, 'whoop');
      setWhoop({ loading: false, msg: `Übernommen: HRV ${nh}ms · Sleep ${ns}`, needConnect: false });
    } catch (err) {
      setWhoop({ loading: false, msg: `WHOOP-Sync fehlgeschlagen: ${err.message}`, needConnect: false });
    }
  };

  const neuro = [
    { label: 'LTP Potential', pct: ltpPotential, val: `${ltpPotential}%` },
    { label: 'Plasticity Index', pct: plasticity, val: `${plasticity}%` },
    { label: 'Circadian Gate', val: 'Offen', segmented: true },
  ];

  return (
    <div className={styles.bmView}>
      <div className={styles.bmGlow} aria-hidden="true" />

      <header className={styles.bmHero}>
        <div className={styles.bmEyebrow}>Biometrie · Bio-Stack &amp; Indikatoren</div>
        <h1 className={styles.bmTitle}>Dein Körper,<br />in Echtzeit.</h1>
        <p className={styles.bmLede}>Kontinuierliche Überwachung neurobiologischer Parameter und systemischer Vitaldaten zur Optimierung der Homöostase.</p>
      </header>

      <div className={styles.bmGrid}>
        {/* Main column */}
        <div className={styles.bmMain}>
          <form onSubmit={submitMetrics}>
            <div className={styles.bmStatRow}>
              <div className={styles.bmStatCard}>
                <Heart className={styles.bmStatIcon} aria-hidden="true" />
                <span className={styles.bmStatLabel}>Heart Rate Variability</span>
                <div className={styles.bmStatValueRow}>
                  <span className={styles.bmStatValue}>{hrv}</span>
                  <span className={styles.bmStatUnit}>ms</span>
                </div>
                <Sparkline data={hrvSeries} />
                <div className={styles.bmStatFoot}>
                  <DeltaBadge delta={hrvDelta} />
                  <input type="number" className={styles.bmInlineInput} placeholder="neu" value={editHrv} onChange={(e) => setEditHrv(e.target.value)} />
                </div>
              </div>

              <div className={styles.bmStatCard}>
                <Moon className={styles.bmStatIcon} aria-hidden="true" />
                <span className={styles.bmStatLabel}>Sleep Score</span>
                <div className={styles.bmStatValueRow}>
                  <span className={styles.bmStatValue}>{sleep}</span>
                  <span className={styles.bmStatUnit}>/100</span>
                </div>
                <Sparkline data={sleepSeries} />
                <div className={styles.bmStatFoot}>
                  <DeltaBadge delta={sleepDelta} />
                  <input type="number" className={styles.bmInlineInput} placeholder="neu" value={editSleep} onChange={(e) => setEditSleep(e.target.value)} />
                </div>
              </div>
            </div>

            <div className={styles.bmBtnRow}>
              <button type="submit" className={styles.bmSyncBtn}>Synchronisieren</button>
              <button type="button" className={styles.bmWhoopBtn} onClick={syncWhoop} disabled={whoop.loading}>
                <RotateCw size={13} className={whoop.loading ? 'animate-spin' : undefined} />
                {whoop.loading ? 'WHOOP…' : 'Von WHOOP'}
              </button>
            </div>
            {whoop.msg && (
              <div className={styles.bmHint}>
                <span>{whoop.msg}</span>
                {whoop.needConnect && typeof setActiveTab === 'function' && (
                  <button type="button" className={styles.bmHintLink} onClick={() => setActiveTab('connectors')}>
                    In Konnektoren verbinden
                  </button>
                )}
              </div>
            )}
          </form>

          <section className={styles.bmCard}>
            <div className={styles.bmCardHead}>
              Neuro-Zustände · Live
              <span className={styles.bmLiveDot} aria-hidden="true" />
            </div>
            <div className={styles.bmCardBody}>
              {neuro.map((r) => (
                <div key={r.label} className={styles.bmNeuroRow}>
                  <div className={styles.bmNeuroTop}>
                    <span className={styles.bmNeuroLabel}>{r.label}</span>
                    <span className={styles.bmNeuroVal}>{r.val}</span>
                  </div>
                  {r.segmented ? (
                    <div className={styles.bmNeuroSeg}>
                      <span />
                      <span className={styles.bmNeuroSegOn} />
                      <span />
                    </div>
                  ) : (
                    <div className={styles.bmNeuroBar}>
                      <div className={styles.bmNeuroBarFill} style={{ width: `${r.pct}%` }} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          <section className={styles.bmCard}>
            <div className={styles.bmCardHead}>Wochen-Ziele</div>
            <div className={styles.bmCardBody}>
              {(profile?.weeklyGoals || []).map((goal, idx) => (
                <button type="button" key={idx} className={styles.bmGoal} onClick={() => toggleGoal(idx)}>
                  <span className={`${styles.bmGoalCheck} ${goal.completed ? styles.bmGoalCheckOn : ''}`} aria-hidden="true" />
                  <span className={goal.completed ? styles.bmGoalDone : ''}>{goal.text}</span>
                </button>
              ))}
              <form onSubmit={handleAddGoal} className={styles.bmGoalForm}>
                <input type="text" placeholder="Neues Ziel…" className={styles.bmInput} value={newGoalText} onChange={(e) => setNewGoalText(e.target.value)} />
                <button type="submit" className={styles.bmAddBtn}>+</button>
              </form>
            </div>
          </section>
        </div>

        {/* Side column — bio-stack */}
        <aside className={styles.bmSide}>
          <section className={styles.bmCard}>
            <div className={styles.bmCardHead}>
              Bio-Stack Inventar
              <button className={styles.bmAddBtn} onClick={addStackItem}>+ ADD</button>
            </div>
            <div className={styles.bmCardBody}>
              {stack.map((item, idx) => (
                <div key={idx} className={styles.bmStackCard}>
                  <div className={styles.bmStackTop}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {typeof updateStackItem === 'function' ? (
                        <>
                          <input
                            className={styles.bmStackNameInput}
                            value={item.name}
                            aria-label="Name"
                            onChange={(e) => updateStackItem(idx, 'name', e.target.value)}
                          />
                          <div className={styles.bmStackMeta}>
                            <input
                              className={`${styles.bmStackMetaInput} ${styles.bmDose}`}
                              value={item.dose}
                              aria-label="Dosis"
                              onChange={(e) => updateStackItem(idx, 'dose', e.target.value)}
                            />
                            <span className={styles.bmStackDose}>·</span>
                            <input
                              className={`${styles.bmStackMetaInput} ${styles.bmTiming}`}
                              value={item.timing}
                              aria-label="Timing"
                              onChange={(e) => updateStackItem(idx, 'timing', e.target.value)}
                            />
                          </div>
                        </>
                      ) : (
                        <>
                          <div className={styles.bmStackName}>{item.name}</div>
                          <div className={styles.bmStackDose}>{item.dose} · {item.timing}</div>
                        </>
                      )}
                    </div>
                    <div className={styles.bmStackActions}>
                      {typeof updateStackItem === 'function' && (
                        <button
                          type="button"
                          className={styles.bmIconBtn}
                          title="Vorrat auffüllen"
                          onClick={() => updateStackItem(idx, 'supply', 100)}
                        >
                          <RotateCw size={13} />
                        </button>
                      )}
                      <button className={styles.bmConsumeBtn} onClick={() => consumeStackItem(idx)}>Konsum</button>
                      {typeof removeStackItem === 'function' && (
                        <button
                          type="button"
                          className={`${styles.bmIconBtn} ${styles.bmIconBtnDanger}`}
                          title="Entfernen"
                          onClick={() => removeStackItem(idx)}
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className={styles.bmBar}>
                    <div
                      className={styles.bmBarFill}
                      style={{
                        width: `${item.supply}%`,
                        background: item.supply < 30 ? 'var(--red)' : item.supply < 60 ? 'var(--amber)' : 'var(--bm-jade)',
                      }}
                    />
                  </div>
                  <div className={styles.bmSupplyText}>{item.supply}% Vorrat</div>
                </div>
              ))}
              {stack.length === 0 && <p className={styles.bmEmpty}>Kein Stack konfiguriert.</p>}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
