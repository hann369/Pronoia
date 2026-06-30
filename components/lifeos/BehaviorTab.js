'use client';

/*
 * BehaviorTab — "Verhaltens-Labor."
 *
 * A behavior-change workspace for three intents the user actually has:
 *   build  — Verhalten aufbauen   (etablieren / "haben wollen")
 *   quit   — Verhalten ablegen    (loswerden)
 *   change — Verhalten verändern  (durch ein besseres ersetzen)
 *
 * Grounded in behavior science: Applied Behavior Analysis (Kazdin — ABC-Analyse,
 * Verstärkung, Löschung + konkurrierendes Verhalten, Reizkontrolle, Selbst-
 * beobachtung), Kontrolltheorie der Selbstregulation (Carver & Scheier —
 * Feedbackschleifen gegen einen Standard), der Gewohnheits-Loop (Cue→Routine→
 * Reward), Umsetzungsintentionen (Gollwitzer) und Tiny Habits / B=MAP (Fogg).
 *
 * Layout mirrors the Google-Stitch "Behavior Lab" design (segmented composer,
 * serif stat bar, arrow-separated loop chips, two-column coaching panel with a
 * next-step footer). Persistence via useTabData (users/{uid}.tabs.behaviorLab +
 * localStorage). The AI plan comes from /api/mistral action 'behavior_coach'
 * (offline fallback). Signature accent: emerald #10B981 — within the shared
 * Life-OS design family (the 'quit' kind gets a rose semantic tint, like Stitch).
 */

import { useState } from 'react';
import { useTabData } from '@/hooks/useTabData';
import {
  ArrowLeft,
  ArrowRight,
  Plus,
  Trash2,
  Sparkles,
  Loader2,
  Check,
  CheckCircle2,
  Flame,
  ChevronRight,
  CircleSlash,
  Repeat,
  Target,
} from 'lucide-react';

const ACCENT = '#10B981';
const glass =
  'bg-white/70 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] backdrop-blur-md shadow-sm dark:shadow-none text-slate-800 dark:text-[#ECE8F2]';
const labelCls = 'font-mono text-[0.6rem] uppercase tracking-[0.18em]';

const KINDS = [
  { id: 'build', name: 'Aufbauen', icon: Target, hint: 'Neues erwünschtes Verhalten etablieren.', tone: 'emerald' },
  { id: 'quit', name: 'Ablegen', icon: CircleSlash, hint: 'Unerwünschtes Verhalten reduzieren / löschen.', tone: 'rose' },
  { id: 'change', name: 'Verändern', icon: Repeat, hint: 'Bestehendes Verhalten durch ein besseres ersetzen.', tone: 'emerald' },
];

const kindMeta = (id) => KINDS.find((k) => k.id === id) || KINDS[0];
const todayKey = () => new Date().toISOString().slice(0, 10);
const pad2 = (n) => String(n).padStart(2, '0');

// Badge / icon-chip tint per kind tone.
const toneBadge = (tone) =>
  tone === 'rose'
    ? 'bg-rose-500/10 text-rose-500 dark:text-rose-400'
    : 'bg-[#10B981]/10 text-[#10B981]';

// Consecutive-day streak from a { 'YYYY-MM-DD': true } check-in log,
// ending today or yesterday (self-monitoring feedback loop).
function checkinStreak(checkins) {
  const done = checkins || {};
  let count = 0;
  const d = new Date();
  if (!done[d.toISOString().slice(0, 10)]) d.setDate(d.getDate() - 1);
  while (count < 365) {
    const key = d.toISOString().slice(0, 10);
    if (done[key]) {
      count++;
      d.setDate(d.getDate() - 1);
    } else break;
  }
  return count;
}

export default function BehaviorTab({ setActiveTab }) {
  const { data: lab, save: saveLab } = useTabData('behaviorLab', {
    behaviors: [], // [{ id, kind, title, cue, reward, motivation, createdAt, checkins:{}, coachPlan }]
    lastForm: { kind: 'build', title: '' },
  });

  const behaviors = lab?.behaviors ?? [];

  // ── Composer ──
  const [kind, setKind] = useState(lab?.lastForm?.kind || 'build');
  const [title, setTitle] = useState('');
  const [cue, setCue] = useState('');
  const [reward, setReward] = useState('');
  const [motivation, setMotivation] = useState('');
  const [autoCoach, setAutoCoach] = useState(true);

  // ── Filter + per-card async state ──
  const [filter, setFilter] = useState('all'); // 'all' | kind id
  const [coaching, setCoaching] = useState({}); // { [id]: true }
  const [expanded, setExpanded] = useState({}); // { [id]: true }

  const addBehavior = async () => {
    const t = title.trim();
    if (!t) return;
    const id = `b_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const behavior = {
      id,
      kind,
      title: t,
      cue: cue.trim(),
      reward: reward.trim(),
      motivation: motivation.trim(),
      createdAt: Date.now(),
      checkins: {},
      coachPlan: null,
    };
    saveLab((prev) => ({
      ...prev,
      behaviors: [behavior, ...(prev.behaviors ?? [])],
      lastForm: { kind, title: '' },
    }));
    setTitle('');
    setCue('');
    setReward('');
    setMotivation('');
    setExpanded((e) => ({ ...e, [id]: true }));
    if (autoCoach) runCoach(behavior);
  };

  const deleteBehavior = (id) => {
    saveLab((prev) => ({ ...prev, behaviors: (prev.behaviors ?? []).filter((b) => b.id !== id) }));
  };

  const toggleCheckin = (id) => {
    const key = todayKey();
    saveLab((prev) => ({
      ...prev,
      behaviors: (prev.behaviors ?? []).map((b) => {
        if (b.id !== id) return b;
        const checkins = { ...(b.checkins || {}) };
        if (checkins[key]) delete checkins[key];
        else checkins[key] = true;
        return { ...b, checkins };
      }),
    }));
  };

  const runCoach = async (behavior) => {
    if (!behavior) return;
    setCoaching((c) => ({ ...c, [behavior.id]: true }));
    setExpanded((e) => ({ ...e, [behavior.id]: true }));
    try {
      const res = await fetch('/api/mistral', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'behavior_coach',
          kind: behavior.kind,
          title: behavior.title,
          cue: behavior.cue,
          reward: behavior.reward,
          motivation: behavior.motivation,
        }),
      });
      if (!res.ok) throw new Error(`Server ${res.status}`);
      const plan = await res.json();
      saveLab((prev) => ({
        ...prev,
        behaviors: (prev.behaviors ?? []).map((b) => (b.id === behavior.id ? { ...b, coachPlan: plan } : b)),
      }));
    } catch {
      // Soft-fail: the API itself already falls back offline, so a thrown error
      // here means a network problem — leave a minimal, retryable note.
      saveLab((prev) => ({
        ...prev,
        behaviors: (prev.behaviors ?? []).map((b) =>
          b.id === behavior.id
            ? { ...b, coachPlan: { kind: b.kind, summary: 'Coach-Plan konnte nicht geladen werden. Bitte erneut versuchen.', tips: [] } }
            : b
        ),
      }));
    } finally {
      setCoaching((c) => ({ ...c, [behavior.id]: false }));
    }
  };

  const visible = filter === 'all' ? behaviors : behaviors.filter((b) => b.kind === filter);

  // Aggregate self-monitoring stats.
  const checkedToday = behaviors.filter((b) => (b.checkins || {})[todayKey()]).length;
  const bestStreak = behaviors.reduce((m, b) => Math.max(m, checkinStreak(b.checkins)), 0);

  return (
    <div className="relative w-full text-slate-800 dark:text-[#ECE8F2] text-left pt-12 md:pt-20">
      {/* Ambient emerald orbs (scoped, no global bleed) */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-24 w-[40%] h-[40%] rounded-full" style={{ background: 'rgba(16,185,129,0.08)', filter: 'blur(120px)' }} />
        <div className="absolute -bottom-20 -left-20 w-[35%] h-[35%] rounded-full" style={{ background: 'rgba(16,185,129,0.05)', filter: 'blur(100px)' }} />
      </div>

      {/* Top action row */}
      <div className="flex justify-between items-center mb-8">
        <button
          type="button"
          onClick={() => setActiveTab && setActiveTab('apps')}
          className="flex items-center gap-2 text-xs font-mono tracking-widest uppercase text-slate-500 dark:text-white/50 hover:text-slate-800 dark:hover:text-white transition-colors"
        >
          <ArrowLeft size={16} /> Zurück zu Apps
        </button>
        <span className={`${labelCls} px-3 py-1 rounded-full border border-slate-200 dark:border-white/10`} style={{ color: ACCENT }}>
          {behaviors.length} Verhalten · {checkedToday} heute
        </span>
      </div>

      {/* Editorial hero */}
      <header className="max-w-3xl mb-14">
        <span className={`${labelCls} block mb-5`} style={{ color: ACCENT, letterSpacing: '0.35em' }}>
          Verhalten · Aufbauen, Ablegen &amp; Verändern
        </span>
        <h2 className="font-serif text-4xl md:text-5xl font-light tracking-tight mb-6 text-slate-900 dark:text-white">
          Dein Verhaltens-Labor.
        </h2>
        <p className="text-slate-600 dark:text-[rgba(236,232,242,0.6)] text-lg leading-relaxed font-light">
          Verhaltensänderung ist keine Frage der Willenskraft, sondern des Designs. Durch die präzise
          Justierung von Auslösern (Cues), Routinen und Belohnungen programmieren wir Gewohnheiten auf
          wissenschaftlicher Basis neu.
        </p>
      </header>

      <div className="grid grid-cols-12 gap-x-6 gap-y-8">
        {/* ── LEFT: Composer (4/12) ── */}
        <aside className="col-span-12 lg:col-span-4 self-start">
          <section className={`${glass} p-8 xl:p-10 rounded-xl space-y-8`}>
            <div className="flex justify-between items-center">
              <h3 className={`${labelCls} text-slate-500 dark:text-[rgba(236,232,242,0.6)]`}>Neues Verhalten</h3>
              <Sparkles size={16} style={{ color: ACCENT }} />
            </div>

            {/* Segmented kind control */}
            <div className="flex p-1 rounded-lg bg-slate-100/60 dark:bg-white/[0.03] gap-1">
              {KINDS.map((k) => {
                const Icon = k.icon;
                const on = kind === k.id;
                return (
                  <button
                    key={k.id}
                    type="button"
                    onClick={() => setKind(k.id)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-md transition-all duration-300 ${
                      on
                        ? 'bg-[#10B981]/12 text-[#10B981]'
                        : 'text-slate-500 dark:text-white/55 hover:bg-slate-200/40 dark:hover:bg-white/5'
                    }`}
                  >
                    <Icon size={15} />
                    <span className="font-mono text-[0.58rem] uppercase tracking-[0.1em]">{k.name}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-[0.7rem] text-slate-500 dark:text-[rgba(236,232,242,0.55)] -mt-4">{kindMeta(kind).hint}</p>

            {/* Fields */}
            <div className="space-y-6">
              <Field label="Verhalten" value={title} onChange={setTitle} placeholder="z.B. 10 Min. Dehnen" autoFocus onEnter={addBehavior} />
              <Field label="Auslöser / Cue (optional)" value={cue} onChange={setCue} placeholder="Nach dem Zähneputzen…" />
              <Field label="Belohnung (optional)" value={reward} onChange={setReward} placeholder="Eine Tasse Espresso" />
              <Field label="Motivation / Identität (optional)" value={motivation} onChange={setMotivation} placeholder="Ich bin jemand, der auf sich achtet." />
            </div>

            <label className="flex items-center gap-2.5 text-[0.7rem] text-slate-600 dark:text-white/60 cursor-pointer select-none">
              <input type="checkbox" checked={autoCoach} onChange={(e) => setAutoCoach(e.target.checked)} className="accent-[#10B981] w-4 h-4" />
              Coach-Plan direkt generieren
            </label>

            <button
              type="button"
              onClick={addBehavior}
              disabled={!title.trim()}
              className="w-full flex items-center justify-center gap-2 px-4 py-4 rounded-xl text-xs font-mono font-bold tracking-widest uppercase transition-all duration-300 bg-[#10B981] text-[#04130d] hover:shadow-[0_0_24px_rgba(16,185,129,0.4)] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none"
            >
              <Plus size={16} /> Hinzufügen
            </button>
          </section>
        </aside>

        {/* ── RIGHT: Dashboard (8/12) ── */}
        <section className="col-span-12 lg:col-span-8 flex flex-col gap-6">
          {/* Serif stats bar */}
          <div className={`${glass} p-6 rounded-xl flex items-center justify-around`}>
            <StatBig value={pad2(checkedToday)} label="Heute erledigt" accent />
            <span className="h-12 w-px bg-slate-200 dark:bg-white/5" />
            <StatBig value={pad2(bestStreak)} label="Bester Streak" />
            <span className="h-12 w-px bg-slate-200 dark:bg-white/5" />
            <StatBig value={pad2(behaviors.length)} label="Aktiv" />
          </div>

          {/* Filter pills */}
          <div className="flex flex-wrap gap-2.5">
            {[{ id: 'all', name: 'Alle' }, ...KINDS].map((f) => {
              const on = filter === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFilter(f.id)}
                  className={`px-5 py-2 rounded-full text-[0.6rem] font-mono uppercase tracking-[0.14em] border transition-all ${
                    on
                      ? 'border-[#10B981] bg-[#10B981] text-[#04130d]'
                      : 'border-slate-200 dark:border-white/10 text-slate-500 dark:text-white/55 hover:border-slate-300 dark:hover:border-white/30'
                  }`}
                >
                  {f.name}
                </button>
              );
            })}
          </div>

          {visible.length === 0 ? (
            <div className={`${glass} p-12 rounded-xl text-center`}>
              <Target size={28} className="mx-auto mb-4 opacity-40" style={{ color: ACCENT }} />
              <p className="text-slate-500 dark:text-[rgba(236,232,242,0.6)] font-light">
                {behaviors.length === 0
                  ? 'Noch kein Verhalten definiert. Beginne links mit dem ersten Loop.'
                  : 'Keine Einträge in diesem Filter.'}
              </p>
            </div>
          ) : (
            visible.map((b) => (
              <BehaviorCard
                key={b.id}
                behavior={b}
                coaching={!!coaching[b.id]}
                expanded={!!expanded[b.id]}
                onToggleExpand={() => setExpanded((e) => ({ ...e, [b.id]: !e[b.id] }))}
                onCheckin={() => toggleCheckin(b.id)}
                onCoach={() => runCoach(b)}
                onDelete={() => deleteBehavior(b.id)}
              />
            ))
          )}
        </section>
      </div>
    </div>
  );
}

// ── Small presentational helpers ──

function Field({ label, value, onChange, placeholder, autoFocus, onEnter }) {
  return (
    <label className="block space-y-2">
      <span className="font-mono text-[0.55rem] uppercase tracking-[0.15em] text-slate-500 dark:text-[rgba(236,232,242,0.6)] block">{label}</span>
      <input
        type="text"
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && onEnter) {
            e.preventDefault();
            onEnter();
          }
        }}
        placeholder={placeholder}
        className="w-full bg-transparent border-b border-slate-300 dark:border-white/20 focus:border-[#10B981] focus:shadow-[0_4px_12px_-4px_rgba(16,185,129,0.3)] transition-all text-base p-0 py-1.5 outline-none text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/25"
      />
    </label>
  );
}

function StatBig({ value, label, accent }) {
  return (
    <div className="text-center">
      <div className="font-serif text-3xl md:text-4xl font-light leading-none" style={accent ? { color: ACCENT } : undefined}>
        {value}
      </div>
      <div className="font-mono text-[0.5rem] uppercase tracking-[0.15em] text-slate-500 dark:text-[rgba(236,232,242,0.6)] mt-2">{label}</div>
    </div>
  );
}

function BehaviorCard({ behavior, coaching, expanded, onToggleExpand, onCheckin, onCoach, onDelete }) {
  const meta = kindMeta(behavior.kind);
  const streak = checkinStreak(behavior.checkins);
  const checkedToday = !!(behavior.checkins || {})[todayKey()];
  const plan = behavior.coachPlan;

  // Loop chips with arrow separators (only present steps).
  const loop = [
    behavior.cue && { k: 'Auslöser', v: behavior.cue },
    { k: 'Routine', v: behavior.title },
    behavior.reward && { k: 'Belohnung', v: behavior.reward },
  ].filter(Boolean);

  return (
    <div className={`${glass} rounded-xl overflow-hidden ${plan && expanded ? 'border-[#10B981]/30 shadow-[0_0_50px_rgba(16,185,129,0.08)]' : ''}`}>
      <div className="p-6 xl:p-8 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className={`${labelCls} px-2.5 py-1 rounded inline-block mb-2 ${toneBadge(meta.tone)}`}>{meta.name}</span>
            <h4 className="font-serif text-2xl text-slate-900 dark:text-white leading-tight">{behavior.title}</h4>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className={`flex items-center gap-1 font-serif text-lg ${streak > 0 ? '' : 'text-slate-400 dark:text-white/30'}`} style={streak > 0 ? { color: ACCENT } : undefined}>
              {streak}
              <Flame size={16} className={streak > 0 ? '' : 'opacity-40'} style={streak > 0 ? { color: ACCENT } : undefined} />
            </span>
            <button type="button" onClick={onDelete} aria-label="Verhalten löschen" className="text-slate-400 dark:text-white/30 hover:text-rose-500 transition-colors">
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        {/* Habit loop chips */}
        <div className="flex flex-wrap items-center gap-2 text-[0.7rem]">
          {loop.map((step, i) => (
            <span key={step.k} className="flex items-center gap-2">
              <span className="px-3 py-1.5 rounded-full bg-slate-100/60 dark:bg-white/5 text-slate-600 dark:text-white/70">
                <span className="text-slate-400 dark:text-white/40">{step.k}:</span> {step.v}
              </span>
              {i < loop.length - 1 && <ArrowRight size={13} className="text-slate-400 dark:text-white/40" />}
            </span>
          ))}
        </div>

        {/* Action row */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onCheckin}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-mono uppercase tracking-widest transition-all duration-300 border ${
              checkedToday
                ? 'border-[#10B981] bg-[#10B981] text-[#04130d] shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                : 'border-[#10B981]/40 text-[#10B981] hover:bg-[#10B981] hover:text-[#04130d]'
            }`}
          >
            <CheckCircle2 size={16} /> {checkedToday ? 'Heute erledigt' : 'Heute abhaken'}
          </button>
          <button
            type="button"
            onClick={plan ? onToggleExpand : onCoach}
            disabled={coaching}
            className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest transition-colors disabled:opacity-50"
            style={{ color: ACCENT }}
          >
            {coaching ? (
              <><Loader2 size={14} className="animate-spin" /> Analysiere…</>
            ) : plan ? (
              <><Sparkles size={14} /> {expanded ? 'Plan ausblenden' : 'Coach-Plan'}</>
            ) : (
              <><Sparkles size={14} /> Coach-Plan generieren</>
            )}
          </button>
        </div>
      </div>

      {/* Coach plan — two-column, with next-step footer (Stitch composition) */}
      {plan && expanded && (
        <>
          <div className="px-6 xl:px-8 pt-6 pb-8 border-t border-slate-200 dark:border-white/5 space-y-8">
            {plan.summary && (
              <p className="font-body text-slate-700 dark:text-[rgba(236,232,242,0.8)] italic leading-relaxed">{plan.summary}</p>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Left: the coaching plan, numbered */}
              <div>
                <h5 className={`${labelCls} mb-4`} style={{ color: ACCENT }}>Coaching-Plan</h5>
                <ul className="space-y-4">
                  <PlanStep n="01" title="Auslöser-Analyse" text={plan.cueAnalysis} />
                  <PlanStep n="02" title="Ersatz-/Mini-Verhalten" text={plan.replacementBehavior} />
                  <PlanStep n="03" title="Umsetzungsintention" text={plan.implementationIntention} highlight />
                </ul>
              </div>
              {/* Right: scientific levers */}
              <div>
                <h5 className={`${labelCls} mb-4 text-slate-500 dark:text-[rgba(236,232,242,0.6)]`}>Wissenschaftliche Hebel</h5>
                <div className="space-y-3">
                  <LeverCard label="Verstärkung" text={plan.reinforcement} />
                  {(plan.tips || []).map((tip, i) => (
                    <LeverCard key={i} label={tip.basis || 'Hebel'} text={tip.text} />
                  ))}
                </div>
              </div>
            </div>
          </div>
          {plan.firstTinyStep && (
            <div className="px-6 xl:px-8 py-4 bg-[#10B981]/10 flex flex-wrap justify-between items-center gap-2">
              <span className="font-mono text-[0.6rem] uppercase tracking-[0.14em]" style={{ color: ACCENT }}>
                Erster Schritt: {plan.firstTinyStep}
              </span>
              <button type="button" onClick={onToggleExpand} className="flex items-center gap-1 text-xs font-mono uppercase tracking-widest hover:underline" style={{ color: ACCENT }}>
                Ausblenden <ChevronRight size={15} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function PlanStep({ n, title, text, highlight }) {
  if (!text) return null;
  return (
    <li className="flex gap-3">
      <span className="font-mono text-[0.6rem] text-slate-400 dark:text-white/40 mt-1">{n}</span>
      <div className={highlight ? 'rounded-lg border border-[#10B981]/20 bg-[#10B981]/[0.06] p-3' : ''}>
        <p className="text-sm font-semibold text-slate-900 dark:text-white">{title}</p>
        <p className={`text-[0.8rem] leading-relaxed mt-1 ${highlight ? 'italic text-[#10B981]' : 'text-slate-600 dark:text-[rgba(236,232,242,0.7)]'}`}>{text}</p>
      </div>
    </li>
  );
}

function LeverCard({ label, text }) {
  if (!text) return null;
  return (
    <div className="p-4 rounded-xl border border-slate-200 dark:border-white/[0.06] bg-slate-100/30 dark:bg-white/5">
      <p className="font-mono text-[0.55rem] uppercase tracking-[0.12em] text-slate-500 dark:text-white/55 mb-1">{label}</p>
      <p className="text-[0.85rem] leading-relaxed text-slate-700 dark:text-[rgba(236,232,242,0.8)]">{text}</p>
    </div>
  );
}
