'use client';

import React, { useState } from 'react';
import styles from './GymTab.module.css';
import { useTheme } from 'next-themes';
import { useTabData } from '@/hooks/useTabData';
import {
  Dumbbell,
  Sparkles,
  Plus,
  Trash2,
  Save,
  ArrowLeft,
  Flame,
  TrendingUp,
  Loader2,
  X,
  Activity
} from 'lucide-react';

const LEVELS = [
  { id: 'beginner', label: 'Einsteiger' },
  { id: 'intermediate', label: 'Mittel' },
  { id: 'advanced', label: 'Fortgeschritten' }
];

const repsToNum = (reps) => {
  const m = String(reps ?? '').match(/\d+/);
  return m ? parseInt(m[0], 10) : 0;
};

// Volume = Σ Sätze × Wiederholungen × Gewicht (kg)
const exerciseVolume = (ex) => {
  const sets = Number(ex.sets) || 0;
  const reps = repsToNum(ex.reps);
  const weight = Number(ex.weight) || 0;
  return sets * reps * weight;
};

const sessionVolume = (session) =>
  (session.exercises || []).reduce((sum, ex) => sum + exerciseVolume(ex), 0);

export default function GymTab({ setActiveTab }) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme !== 'light';

  const { data: gymData, save: saveGym } = useTabData('gymSessions', {
    sessions: [],         // [{ id, finishedAt, title, focus, durationMin, exercises:[{name,muscle,sets,reps,weight}], source }]
    lastConfig: { focus: 'Push (Brust & Schultern)', level: 'intermediate', minutes: 45, equipment: 'Freie Gewichte' }
  });

  const sessions = gymData?.sessions ?? [];
  const lastConfig = gymData?.lastConfig ?? { focus: '', level: 'intermediate', minutes: 45, equipment: 'Freie Gewichte' };

  // ── Generator form ──
  const [focus, setFocus] = useState(lastConfig.focus || 'Push (Brust & Schultern)');
  const [level, setLevel] = useState(lastConfig.level || 'intermediate');
  const [minutes, setMinutes] = useState(lastConfig.minutes || 45);
  const [equipment, setEquipment] = useState(lastConfig.equipment || 'Freie Gewichte');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);

  // ── Active draft (the workout being performed / logged) ──
  const [draft, setDraft] = useState(null); // { title, focus, estMinutes, warmup, coachNote, exercises:[{name,muscle,note,sets,reps,weight}] }

  const generateWorkout = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch('/api/mistral', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate_workout', focus, level, minutes: Number(minutes), equipment })
      });
      if (!res.ok) throw new Error(`Server ${res.status}`);
      const wo = await res.json();
      setDraft({
        title: wo.title || focus,
        focus: wo.focus || focus,
        estMinutes: wo.estMinutes || Number(minutes),
        warmup: wo.warmup || '',
        coachNote: wo.coachNote || '',
        exercises: (wo.exercises || []).map((ex) => ({
          name: ex.name || 'Übung',
          muscle: ex.muscle || '',
          note: ex.note || '',
          sets: ex.sets || 3,
          reps: ex.reps || '8-12',
          weight: '' // actual weight, user fills in
        }))
      });
      // remember the config for next time
      saveGym((prev) => ({ ...prev, lastConfig: { focus, level, minutes: Number(minutes), equipment } }));
    } catch (e) {
      setError('Konnte keinen Plan generieren. Bitte erneut versuchen.');
    } finally {
      setGenerating(false);
    }
  };

  const startEmptyDraft = () => {
    setError(null);
    setDraft({
      title: 'Manuelle Session',
      focus: focus || 'Training',
      estMinutes: Number(minutes) || 45,
      warmup: '',
      coachNote: '',
      exercises: [{ name: '', muscle: '', note: '', sets: 3, reps: '8-12', weight: '' }]
    });
  };

  const updateExercise = (idx, field, value) => {
    setDraft((d) => {
      const exercises = d.exercises.map((ex, i) => (i === idx ? { ...ex, [field]: value } : ex));
      return { ...d, exercises };
    });
  };

  const addExerciseRow = () => {
    setDraft((d) => ({
      ...d,
      exercises: [...d.exercises, { name: '', muscle: '', note: '', sets: 3, reps: '8-12', weight: '' }]
    }));
  };

  const removeExerciseRow = (idx) => {
    setDraft((d) => ({ ...d, exercises: d.exercises.filter((_, i) => i !== idx) }));
  };

  const discardDraft = () => {
    setDraft(null);
    setError(null);
  };

  const saveSession = () => {
    if (!draft) return;
    const cleanExercises = draft.exercises
      .filter((ex) => (ex.name || '').trim().length > 0)
      .map((ex) => ({
        name: ex.name.trim(),
        muscle: ex.muscle || '',
        sets: Number(ex.sets) || 0,
        reps: String(ex.reps ?? ''),
        weight: Number(ex.weight) || 0
      }));
    if (cleanExercises.length === 0) {
      setError('Mindestens eine Übung mit Namen erforderlich, um die Session zu speichern.');
      return;
    }
    const session = {
      id: `g_${Date.now()}`,
      finishedAt: Date.now(),
      title: draft.title || draft.focus || 'Session',
      focus: draft.focus || '',
      durationMin: Number(draft.estMinutes) || 0,
      exercises: cleanExercises,
      source: draft.warmup || draft.coachNote ? 'ai' : 'manual'
    };
    saveGym((prev) => ({ ...prev, sessions: [session, ...(prev.sessions ?? [])].slice(0, 100) }));
    setDraft(null);
    setError(null);
  };

  const deleteSession = (id) => {
    saveGym((prev) => ({ ...prev, sessions: (prev.sessions ?? []).filter((s) => s.id !== id) }));
  };

  // ── Stats ──
  const now = Date.now();
  const weekAgo = now - 7 * 86400000;
  const sessionsThisWeek = sessions.filter((s) => s.finishedAt >= weekAgo);
  const weekVolume = sessionsThisWeek.reduce((sum, s) => sum + sessionVolume(s), 0);

  // Streak: consecutive days (ending today or yesterday) with ≥1 session
  const streak = (() => {
    const daysWithSession = new Set(
      sessions.map((s) => new Date(s.finishedAt).toISOString().slice(0, 10))
    );
    let count = 0;
    const d = new Date();
    const todayStr = d.toISOString().slice(0, 10);
    if (!daysWithSession.has(todayStr)) d.setDate(d.getDate() - 1);
    while (count < 365) {
      const key = d.toISOString().slice(0, 10);
      if (daysWithSession.has(key)) {
        count++;
        d.setDate(d.getDate() - 1);
      } else break;
    }
    return count;
  })();

  // Weekly volume bars (last 7 days, index 6 = today)
  const dailyVolume = Array(7).fill(0);
  sessions.forEach((s) => {
    const daysAgo = Math.floor((now - s.finishedAt) / 86400000);
    if (daysAgo >= 0 && daysAgo < 7) dailyVolume[6 - daysAgo] += sessionVolume(s);
  });
  const maxVol = Math.max(...dailyVolume, 1);
  const dayLabels = (() => {
    const out = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      out.push(d.toLocaleDateString('de-DE', { weekday: 'narrow' }));
    }
    return out;
  })();

  return (
    <div className={styles.container}>
      {/* Top action row */}
      <div className={styles.topActions}>
        <button className={styles.backBtn} onClick={() => setActiveTab('apps')}>
          <ArrowLeft size={16} /> Zurück zu Apps
        </button>
        <span className={`${styles.badge} ${draft ? styles.badgeActive : ''}`}>
          {draft ? 'Session aktiv' : `${sessions.length} Sessions geloggt`}
        </span>
      </div>

      {/* Left column — Generator + active draft */}
      <div className={styles.leftPanel}>
        {!draft && (
          <div className={styles.glassCard}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Workout-Generator</h2>
              <Sparkles size={18} className={styles.accentIcon} />
            </div>

            <div className={styles.formGrid}>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Fokus / Muskelgruppe</span>
                <input
                  className={styles.input}
                  value={focus}
                  onChange={(e) => setFocus(e.target.value)}
                  placeholder="z.B. Push, Rücken, Beine, Ganzkörper"
                />
              </label>

              <label className={styles.field}>
                <span className={styles.fieldLabel}>Equipment</span>
                <input
                  className={styles.input}
                  value={equipment}
                  onChange={(e) => setEquipment(e.target.value)}
                  placeholder="z.B. Freie Gewichte, Maschinen, Körpergewicht"
                />
              </label>

              <label className={styles.field}>
                <span className={styles.fieldLabel}>Dauer (Min)</span>
                <input
                  type="number"
                  min="10"
                  max="180"
                  className={styles.input}
                  value={minutes}
                  onChange={(e) => setMinutes(e.target.value)}
                />
              </label>

              <label className={styles.field}>
                <span className={styles.fieldLabel}>Level</span>
                <select className={styles.input} value={level} onChange={(e) => setLevel(e.target.value)}>
                  {LEVELS.map((l) => (
                    <option key={l.id} value={l.id}>{l.label}</option>
                  ))}
                </select>
              </label>
            </div>

            {error && <div className={styles.errorMsg}>{error}</div>}

            <div className={styles.genActions}>
              <button className={styles.btnPrimary} onClick={generateWorkout} disabled={generating}>
                {generating ? <Loader2 size={16} className={styles.spin} /> : <Sparkles size={16} />}
                {generating ? 'Generiere…' : 'Workout generieren'}
              </button>
              <button className={styles.btnSecondary} onClick={startEmptyDraft} disabled={generating}>
                <Plus size={16} /> Leere Session
              </button>
            </div>
          </div>
        )}

        {draft && (
          <div className={styles.glassCard}>
            <div className={styles.cardHeader}>
              <div>
                <h2 className={styles.cardTitle}>{draft.title}</h2>
                <div className={styles.draftMeta}>
                  {draft.focus} · ~{draft.estMinutes} Min
                </div>
              </div>
              <Dumbbell size={18} className={styles.accentIcon} />
            </div>

            {draft.warmup && (
              <div className={styles.coachNote}>
                <strong>Aufwärmen:</strong> {draft.warmup}
              </div>
            )}

            <div className={styles.exerciseList}>
              <div className={styles.exHeaderRow}>
                <span className={styles.exHName}>Übung</span>
                <span className={styles.exHNum}>Sätze</span>
                <span className={styles.exHNum}>Wdh.</span>
                <span className={styles.exHNum}>kg</span>
                <span className={styles.exHDel} />
              </div>

              {draft.exercises.map((ex, idx) => (
                <div className={styles.exRow} key={idx}>
                  <div className={styles.exNameCell}>
                    <input
                      className={styles.exNameInput}
                      value={ex.name}
                      onChange={(e) => updateExercise(idx, 'name', e.target.value)}
                      placeholder="Übungsname"
                    />
                    {(ex.muscle || ex.note) && (
                      <div className={styles.exHint}>
                        {ex.muscle}{ex.muscle && ex.note ? ' · ' : ''}{ex.note}
                      </div>
                    )}
                  </div>
                  <input
                    type="number"
                    min="0"
                    className={styles.exNumInput}
                    value={ex.sets}
                    onChange={(e) => updateExercise(idx, 'sets', e.target.value)}
                  />
                  <input
                    className={styles.exNumInput}
                    value={ex.reps}
                    onChange={(e) => updateExercise(idx, 'reps', e.target.value)}
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    className={styles.exNumInput}
                    value={ex.weight}
                    placeholder="0"
                    onChange={(e) => updateExercise(idx, 'weight', e.target.value)}
                  />
                  <button className={styles.exDelBtn} onClick={() => removeExerciseRow(idx)} title="Übung entfernen">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>

            <button className={styles.addRowBtn} onClick={addExerciseRow}>
              <Plus size={14} /> Übung hinzufügen
            </button>

            {draft.coachNote && (
              <div className={styles.coachNote}>
                <Activity size={13} /> {draft.coachNote}
              </div>
            )}

            {error && <div className={styles.errorMsg}>{error}</div>}

            <div className={styles.draftFooter}>
              <span className={styles.volumePreview}>
                Volumen: <strong>{sessionVolume({ exercises: draft.exercises }).toLocaleString('de-DE')} kg</strong>
              </span>
              <div className={styles.draftActions}>
                <button className={styles.btnSecondary} onClick={discardDraft}>
                  <X size={16} /> Verwerfen
                </button>
                <button className={styles.btnPrimary} onClick={saveSession}>
                  <Save size={16} /> Session speichern
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Right column — Stats + history */}
      <div className={styles.rightPanel}>
        <div className={styles.statsRow}>
          <div className={styles.statCard}>
            <Flame size={18} className={styles.accentIcon} />
            <div className={styles.statValue}>{streak}</div>
            <div className={styles.statLabel}>Tage-Streak</div>
          </div>
          <div className={styles.statCard}>
            <Dumbbell size={18} className={styles.accentIcon} />
            <div className={styles.statValue}>{sessionsThisWeek.length}</div>
            <div className={styles.statLabel}>Sessions / Woche</div>
          </div>
          <div className={styles.statCard}>
            <TrendingUp size={18} className={styles.accentIcon} />
            <div className={styles.statValue}>{Math.round(weekVolume / 1000)}<span className={styles.statUnit}>t</span></div>
            <div className={styles.statLabel}>Volumen / Woche</div>
          </div>
        </div>

        {/* Weekly volume chart */}
        <div className={styles.glassCard}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Wochen-Volumen</h2>
            <TrendingUp size={16} className={styles.accentIcon} />
          </div>
          <div className={styles.barChart}>
            {dailyVolume.map((vol, i) => (
              <div className={styles.barCol} key={i}>
                <div className={styles.barTrack}>
                  <div
                    className={styles.barFill}
                    style={{ height: `${Math.round((vol / maxVol) * 100)}%`, opacity: vol > 0 ? 1 : 0.25 }}
                    title={`${vol.toLocaleString('de-DE')} kg`}
                  />
                </div>
                <span className={styles.barLabel}>{dayLabels[i]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* History */}
        <div className={styles.glassCard}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Verlauf</h2>
            <span className={styles.countPill}>{sessions.length}</span>
          </div>
          {sessions.length === 0 ? (
            <div className={styles.emptyState}>
              Noch keine Sessions. Generiere ein Workout oder logge eine manuelle Session – die Daten fließen später in dein NorthStar-Tagebuch.
            </div>
          ) : (
            <div className={styles.historyList}>
              {sessions.slice(0, 12).map((s) => (
                <div className={styles.historyItem} key={s.id}>
                  <div className={styles.historyMain}>
                    <div className={styles.historyTitle}>
                      {s.title}
                      {s.source === 'ai' && <span className={styles.aiTag}>KI</span>}
                    </div>
                    <div className={styles.historyMeta}>
                      {new Date(s.finishedAt).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })}
                      {' · '}{(s.exercises || []).length} Übungen
                      {' · '}{sessionVolume(s).toLocaleString('de-DE')} kg
                    </div>
                  </div>
                  <button className={styles.exDelBtn} onClick={() => deleteSession(s.id)} title="Session löschen">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
