'use client';

import { useState, useEffect } from 'react';
import styles from './NorthStarTab.module.css';
import shared from '@/app/life-os/page.module.css';
import { useTabData } from '@/hooks/useTabData';
import { auth } from '@/lib/firebase';

// Canonical user id — matches Firestore users/{uid} (what the diary cron writes under),
// so client-composed and cron-composed entries land in the same Supabase bucket.
const currentUid = () => auth?.currentUser?.uid || null;

// Build a short German gym summary from today's logged sessions.
function buildGymSummary(gymSessions) {
  const todayStart = new Date().setHours(0, 0, 0, 0);
  const today = (gymSessions || []).filter((s) => s.finishedAt >= todayStart);
  if (today.length === 0) return '';
  const volume = today.reduce(
    (sum, s) => sum + (s.exercises || []).reduce((v, ex) => {
      const reps = parseInt(String(ex.reps).match(/\d+/)?.[0] || '0', 10);
      return v + (Number(ex.sets) || 0) * reps * (Number(ex.weight) || 0);
    }, 0),
    0
  );
  const focusList = today.map((s) => s.focus).filter(Boolean);
  const focusStr = focusList.length ? focusList.join(' & ') : 'Training';
  return volume > 0
    ? `Im Gym: ${focusStr} — ${volume.toLocaleString('de-DE')} kg über ${today.length} Session(s) bewegt`
    : `Im Gym: ${focusStr} (${today.length} Session)`;
}

const PILLARS = [
  { key: 'focus', label: 'Focus' },
  { key: 'health', label: 'Health' },
  { key: 'skills', label: 'Skills' },
  { key: 'social', label: 'Social' },
  { key: 'recovery', label: 'Recovery' },
];

const HORIZONS = [['y1', 'In einem Jahr'], ['y3', 'In drei Jahren'], ['y5', 'In fünf Jahren']];

function StarGlyph({ className }) {
  return (
    <svg className={className} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="12 2 14.4 9.2 22 9.6 16 14.2 18 21.4 12 17.2 6 21.4 8 14.2 2 9.6 9.6 9.2" />
    </svg>
  );
}

export default function NorthStarTab({
  nsDraft,
  setNsDraft,
  nsEditedRef,
  profile,
  nsReexplore,
  setNsReexplore,
  nsNudge,
  nsMessage,
  nsBusy,
  nsRecalMsg,
  nsRecalInput,
  setNsRecalInput,
  nsRecalBusy,
  saveFutureSelf,
  askNorthStar,
  recalibrate,
}) {
  const [activeSubTab, setActiveSubTab] = useState('journal'); // 'journal' or 'vision'
  const [entries, setEntries] = useState([]);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [isWritingEntry, setIsWritingEntry] = useState(false);
  const [newEntryTitle, setNewEntryTitle] = useState('');
  const [newEntryContent, setNewEntryContent] = useState('');
  const [isSavingEntry, setIsSavingEntry] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isComposing, setIsComposing] = useState(false);
  const [composeError, setComposeError] = useState(null);

  // Gym sessions feed the auto-composed diary entry.
  const { data: gymData } = useTabData('gymSessions', { sessions: [] });

  // Future Self draft state
  const fs = nsDraft || { 
    identity: '', 
    visions: {}, 
    values: [], 
    pillarTargets: {},
    archetypeName: '',
    shadowWork: { recognizedShadow: '', hiddenPower: '', integration: '' }
  };
  const setFs = (patch) => { nsEditedRef.current = true; setNsDraft((prev) => ({ ...(prev || fs), ...patch })); };

  // Fetch entries from Supabase
  useEffect(() => {
    const fetchEntries = async () => {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseAnonKey) {
        setIsLoading(false);
        return;
      }

      try {
        const userId = currentUid() || profile?.uid || 'anonymous';
        const res = await fetch(`${supabaseUrl}/rest/v1/northstar_entries?user_id=eq.${userId}&order=created_at.desc`, {
          headers: {
            'apikey': supabaseAnonKey,
            'Authorization': `Bearer ${supabaseAnonKey}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          setEntries(data);
        }
      } catch (err) {
        console.error('Error fetching NorthStar entries:', err);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchEntries();
  }, [profile]);

  const handleSaveEntry = async () => {
    if (!newEntryTitle.trim() || !newEntryContent.trim()) return;
    
    setIsSavingEntry(true);
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    const wordCount = newEntryContent.trim().split(/\s+/).length;
    const readingTimeMins = Math.max(1, Math.ceil(wordCount / 200));

    const payload = {
      user_id: currentUid() || profile?.uid || 'anonymous',
      title: newEntryTitle.trim(),
      content: newEntryContent.trim(),
      reading_time_mins: readingTimeMins,
      tags: ['JOURNAL'],
      biometrics_hrv: profile?.metrics?.hrv || null,
      biometrics_focus: null,
      future_self_hint: nsNudge || null
    };

    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/northstar_entries`, {
        method: 'POST',
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        const savedData = await res.json();
        if (savedData && savedData.length > 0) {
          // Remove dummy if it exists
          setEntries(prev => {
            const clean = prev.filter(e => e.id !== 'dummy');
            return [savedData[0], ...clean];
          });
        }
        setIsWritingEntry(false);
        setNewEntryTitle('');
        setNewEntryContent('');
      }
    } catch (err) {
      console.error('Failed to save entry:', err);
    } finally {
      setIsSavingEntry(false);
    }
  };

  // Auto-compose today's entry from the day's OS data (gym, biometrics, future self).
  // Shares the /api/mistral compose_diary_entry action with the end-of-day cron.
  const handleComposeToday = async () => {
    setIsComposing(true);
    setComposeError(null);
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    try {
      const dateLabel = new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });
      const day = {
        dateLabel,
        gymSummary: buildGymSummary(gymData?.sessions),
        biometrics: { hrv: profile?.metrics?.hrv || null, sleep: profile?.metrics?.sleep || null, focus: null },
        focusMinutes: 0,
        plannedBlocks: [],
        futureSelf: {
          identity: profile?.futureSelf?.identity || '',
          archetypeName: profile?.futureSelf?.archetypeName || '',
          values: profile?.futureSelf?.values || []
        }
      };
      const res = await fetch('/api/mistral', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'compose_diary_entry', day })
      });
      if (!res.ok) throw new Error(`compose ${res.status}`);
      const composed = await res.json();

      if (!supabaseUrl || !supabaseAnonKey) {
        // No backend configured — show the composed entry locally at least
        setEntries((prev) => [{
          id: `local_${Date.now()}`,
          created_at: new Date().toISOString(),
          title: composed.title,
          content: composed.content,
          tags: composed.tags,
          biometrics_hrv: profile?.metrics?.hrv || null,
          future_self_hint: composed.future_self_hint,
          is_auto_composed: true
        }, ...prev]);
        return;
      }

      const wordCount = (composed.content || '').trim().split(/\s+/).length;
      const payload = {
        user_id: currentUid() || profile?.uid || 'anonymous',
        title: composed.title,
        content: composed.content,
        reading_time_mins: Math.max(1, Math.ceil(wordCount / 200)),
        tags: composed.tags || ['TAGEBUCH'],
        biometrics_hrv: profile?.metrics?.hrv || null,
        biometrics_focus: null,
        biometrics_sleep: profile?.metrics?.sleep || null,
        future_self_hint: composed.future_self_hint || null,
        is_auto_composed: true
      };
      const saveRes = await fetch(`${supabaseUrl}/rest/v1/northstar_entries`, {
        method: 'POST',
        headers: {
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation'
        },
        body: JSON.stringify(payload)
      });
      if (!saveRes.ok) throw new Error(`save ${saveRes.status}`);
      const saved = await saveRes.json();
      if (saved?.length) setEntries((prev) => [saved[0], ...prev]);
    } catch (err) {
      console.error('Compose failed:', err);
      setComposeError('Konnte den Eintrag nicht komponieren. Bitte erneut versuchen.');
    } finally {
      setIsComposing(false);
    }
  };

  // ── Real "Diese Woche" stats from saved entries ──
  const entryStreak = (() => {
    const days = new Set(entries.map((e) => new Date(e.created_at).toISOString().slice(0, 10)));
    let count = 0;
    const d = new Date();
    if (!days.has(d.toISOString().slice(0, 10))) d.setDate(d.getDate() - 1);
    while (count < 365) {
      if (days.has(d.toISOString().slice(0, 10))) { count++; d.setDate(d.getDate() - 1); } else break;
    }
    return count;
  })();
  const focusVals = entries.map((e) => e.biometrics_focus).filter((v) => typeof v === 'number');
  const avgFocus = focusVals.length ? Math.round(focusVals.reduce((a, b) => a + b, 0) / focusVals.length) : null;
  const weekCount = entries.filter((e) => Date.now() - new Date(e.created_at).getTime() < 7 * 86400000).length;

  const hasVision = !!(profile?.futureSelf && (
    profile.futureSelf.identity ||
    Object.values(profile.futureSelf.visions || {}).some(Boolean) ||
    (profile.futureSelf.values || []).length
  ));
  
  // If no vision is established, force them to vision onboarding
  const showJournal = !hasVision || nsReexplore;

  // Render Vision Setup (Immersive Onboarding)
  const renderVisionSetup = () => (
    <div className={styles.nsImmersive}>
      <div className={styles.nsGlowTop} aria-hidden="true" />
      <div className={styles.nsGlowBottom} aria-hidden="true" />

      <header className={styles.nsOpen}>
        <div className={styles.nsKicker}>NorthStar · Dein zukünftiges Ich</div>
        <h1 className={styles.nsBigTitle}>Erinnere dich,<br />wer du wirst.</h1>
        <p className={styles.nsLede}>
          Ein ruhiger Raum, um deine Vision zu klären — und heute einen Schritt darauf zuzugehen.
        </p>
      </header>

      {nsNudge && (
        <section className={styles.nsAffirm}>
          <p className={styles.nsAffirmText}>{nsNudge}</p>
          <div className={styles.nsAffirmBy}>— dein zukünftiges Ich</div>
        </section>
      )}

      <section className={styles.nsSection}>
        <div className={styles.nsSectionLabel}>Dein Future Self</div>
        <input
          className={styles.nsJournalLine}
          value={fs.archetypeName || ''}
          onChange={(e) => setFs({ archetypeName: e.target.value })}
          placeholder=""
        />
        <p className={styles.nsSub} style={{ marginTop: '0.5rem', fontStyle: 'italic', opacity: 0.7 }}>
          Wie nennst du diese zukünftige Version von dir? (z.B. "Der Architekt", "Sovereign")
        </p>
      </section>

      <section className={styles.nsSection}>
        <div className={styles.nsSectionLabel}>Wer ich werde</div>
        <textarea
          className={styles.nsJournal}
          rows={2}
          value={fs.identity}
          onChange={(e) => setFs({ identity: e.target.value })}
          placeholder="Ich bin jemand, der…"
        />
      </section>

      <section className={styles.nsSection}>
        <div className={styles.nsSectionLabel}>Wohin ich gehe</div>
        {HORIZONS.map(([key, prompt]) => (
          <div key={key} className={styles.nsHorizon}>
            <span className={styles.nsHorizonTag}>{prompt}</span>
            <input
              className={styles.nsJournalLine}
              value={fs.visions?.[key] || ''}
              onChange={(e) => setFs({ visions: { ...fs.visions, [key]: e.target.value } })}
              placeholder="…lebe ich"
            />
          </div>
        ))}
      </section>

      <section className={styles.nsSection}>
        <div className={styles.nsSectionLabel}>Was mich trägt</div>
        <input
          className={styles.nsJournalLine}
          value={(fs.values || []).join(', ')}
          onChange={(e) => setFs({ values: e.target.value.split(',').map((v) => v.trim()).filter(Boolean) })}
          placeholder="Disziplin, Neugier, Gelassenheit"
        />
        {(fs.values || []).length > 0 && (
          <div className={styles.nsChips}>
            {fs.values.map((v) => <span key={v} className={styles.nsChip}>{v}</span>)}
          </div>
        )}
      </section>

      <section className={styles.nsSection}>
        <div className={styles.nsSectionLabel}>Schattenarbeit (C.G. Jung)</div>
        
        <div className={styles.nsHorizon} style={{ marginBottom: '1.5rem' }}>
          <span className={styles.nsHorizonTag}>1. Schatten erkennen: Was lehne ich an mir ab oder projiziere es auf andere?</span>
          <textarea
            className={styles.nsJournal}
            style={{ fontSize: '1.2rem' }}
            rows={2}
            value={fs.shadowWork?.recognizedShadow || ''}
            onChange={(e) => setFs({ shadowWork: { ...fs.shadowWork, recognizedShadow: e.target.value } })}
            placeholder="z.B. Aggression, Egoismus, Schwäche..."
          />
        </div>

        <div className={styles.nsHorizon} style={{ marginBottom: '1.5rem' }}>
          <span className={styles.nsHorizonTag}>2. Gold im Schatten: Welche verborgene Energie steckt darin?</span>
          <textarea
            className={styles.nsJournal}
            style={{ fontSize: '1.2rem' }}
            rows={2}
            value={fs.shadowWork?.hiddenPower || ''}
            onChange={(e) => setFs({ shadowWork: { ...fs.shadowWork, hiddenPower: e.target.value } })}
            placeholder="z.B. pure Durchsetzungskraft, tiefe Empathie..."
          />
        </div>

        <div className={styles.nsHorizon}>
          <span className={styles.nsHorizonTag}>3. Integration: Wie nutzt mein Future Self diese Kraft bewusst?</span>
          <textarea
            className={styles.nsJournal}
            style={{ fontSize: '1.2rem' }}
            rows={2}
            value={fs.shadowWork?.integration || ''}
            onChange={(e) => setFs({ shadowWork: { ...fs.shadowWork, integration: e.target.value } })}
            placeholder="Ich erlaube mir..."
          />
        </div>
      </section>

      <section className={styles.nsSection}>
        <div className={styles.nsSectionLabel}>Mein Gleichgewicht</div>
        <div className={styles.nsBalance}>
          {PILLARS.map((p) => {
            const val = fs.pillarTargets?.[p.key] ?? 3;
            return (
              <div key={p.key} className={styles.nsBalanceRow}>
                <span className={styles.nsBalanceLabel}>{p.label}</span>
                <div className={styles.nsDots}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      className={`${styles.nsDot} ${val >= n ? styles.nsDotOn : ''}`}
                      onClick={() => setFs({ pillarTargets: { ...fs.pillarTargets, [p.key]: n } })}
                      aria-label={`${p.label} ${n} von 5`}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        <div className={styles.nsSaveRow}>
          <button className={styles.nsWarmBtn} onClick={saveFutureSelf}>Vision bewahren</button>
          {hasVision && nsReexplore && (
            <button type="button" className={styles.nsBackLink} onClick={() => setNsReexplore(false)}>
              Zurück zum Workspace
            </button>
          )}
        </div>
      </section>
    </div>
  );

  // Render Pinboard (Journal Grid)
  const renderPinboard = () => (
    <div className={styles.pbContainer}>
      <div className={styles.pbAmbientAura}></div>
      <div className={styles.pbLayout}>
        <div className={styles.pbMainCol}>
          <header className={styles.pbHeader}>
            <span className={styles.pbKicker}>NORTHSTAR · DEIN TAGEBUCH</span>
            <h2 className={styles.pbTitle}>
              Dein zukünftiges Ich liest mit.
              <span className={styles.pbStarIcon}><span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>star_rate</span></span>
            </h2>
            <p className={styles.pbLede}>
              Jeder Tag schreibt sich selbst — deine Vision liest und antwortet.
            </p>
          </header>

          {!isLoading && entries.length === 0 && (
            <div style={{ marginTop: '2rem', maxWidth: '420px', color: 'var(--ns-text2, #B0A28D)', fontSize: '0.95rem', lineHeight: 1.7 }}>
              Noch keine Einträge. Lass dein zukünftiges Ich den heutigen Tag aus deinen Daten
              (Gym, Biometrie, Vision) komponieren — oder schreibe selbst.
            </div>
          )}

          <div className={styles.pbGrid}>
            {entries.map((entry, idx) => {
              const rotations = ['-1.5deg', '2.1deg', '-2.8deg', '1.5deg'];
              const rotate = rotations[idx % rotations.length];
              
              const dateObj = new Date(entry.created_at);
              const dateStr = dateObj.toLocaleDateString('de-DE', { day: 'numeric', month: 'short' }).toUpperCase();
              
              return (
                <div 
                  key={entry.id} 
                  className={styles.pbCardWrapper} 
                  style={{ transform: `rotate(${rotate})`, marginTop: idx === 1 ? '3rem' : idx === 2 ? '-2rem' : '1rem' }}
                  onClick={() => setSelectedEntry(entry)}
                >
                  <div className={styles.pbPin}></div>
                  <div className={styles.pbCard}>
                    <div className={styles.pbCardTop}>
                      <span className={styles.pbDate}>{dateStr}</span>
                      {entry.is_auto_composed && <span className={styles.pbAutoBadge}>auto-komponiert</span>}
                    </div>
                    <h3 className={styles.pbCardTitle}>{entry.title}</h3>
                    <p className={styles.pbCardSnippet}>
                      {entry.content.substring(0, 120)}...
                    </p>
                    <div className={styles.pbTagsRow}>
                      {entry.tags?.map(t => <span key={t} className={styles.pbTag}>{t}</span>)}
                      {entry.biometrics_focus && <span className={styles.pbTag}>Focus {entry.biometrics_focus}%</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <aside className={styles.pbSideCol}>
          <div className={styles.pbSticky}>
            <div className={styles.pbAgentCard}>
              <div className={styles.pbAgentAura}></div>
              <div className={styles.pbAgentHead}>
                <span className="material-symbols-outlined" style={{ color: '#ffc58f', fontVariationSettings: "'FILL' 1" }}>star</span>
                <span className={styles.pbAgentLabel}>{profile?.futureSelf?.archetypeName || 'NorthStar / Future Self'}</span>
              </div>
              <blockquote className={styles.pbAgentQuote}>
                {nsNudge ? `"${nsNudge}"` : '"Du warst diese Woche standhafter, als du denkst. Der Fokus auf die kleinen Gewohnheiten beginnt Früchte zu tragen..."'}
              </blockquote>
              <button
                className={styles.pbAgentBtn}
                onClick={handleComposeToday}
                disabled={isComposing}
                style={{ marginBottom: '0.6rem' }}
              >
                {isComposing ? 'Komponiere…' : '✦ Heutigen Eintrag komponieren'}
              </button>
              <button
                className={styles.pbAgentBtn}
                onClick={() => setIsWritingEntry(true)}
                style={{ background: 'transparent', border: '1px solid var(--ns-amber-soft, rgba(227,169,114,0.3))', color: 'var(--ns-amber, #E3A972)' }}
              >
                Selbst verfassen
              </button>
              {composeError && (
                <p style={{ marginTop: '0.6rem', fontSize: '0.78rem', color: '#f8a3a3' }}>{composeError}</p>
              )}
            </div>

            <div className={styles.pbStats}>
              <span className={styles.pbStatsKicker}>Diese Woche</span>
              <div className={styles.pbStatRow}>
                <div className={styles.pbStatHeader}>
                  <span className={styles.pbStatLabel}>ENTRY STREAK</span>
                  <span className={styles.pbStatVal}>{entryStreak} {entryStreak === 1 ? 'Tag' : 'Tage'}</span>
                </div>
                <div className={styles.pbBarBg}><div className={styles.pbBarFill} style={{ width: `${Math.min(100, Math.round((entryStreak / 14) * 100))}%` }}></div></div>
              </div>
              <div className={styles.pbStatRow}>
                <div className={styles.pbStatHeader}>
                  <span className={styles.pbStatLabel}>EINTRÄGE (7 TAGE)</span>
                  <span className={styles.pbStatVal}>{weekCount}</span>
                </div>
                <div className={styles.pbBarBg}><div className={styles.pbBarFill} style={{ width: `${Math.min(100, Math.round((weekCount / 7) * 100))}%` }}></div></div>
              </div>
              {avgFocus !== null && (
                <div className={styles.pbStatRow}>
                  <div className={styles.pbStatHeader}>
                    <span className={styles.pbStatLabel}>AVG. FOKUS</span>
                    <span className={styles.pbStatVal}>{avgFocus}%</span>
                  </div>
                  <div className={styles.pbBarBg}><div className={styles.pbBarFill} style={{ width: `${avgFocus}%` }}></div></div>
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );

  // Render Full Entry Modal
  const renderEntryModal = () => {
    if (!selectedEntry) return null;
    
    const dateObj = new Date(selectedEntry.created_at);
    const dateStr = dateObj.toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase();
    
    return (
      <div className={styles.nsModalOverlay} onClick={() => setSelectedEntry(null)}>
        <div className={styles.nsModalContent} onClick={e => e.stopPropagation()}>
          <button className={styles.nsModalClose} onClick={() => setSelectedEntry(null)}>
            <span className="material-symbols-outlined">close</span>
          </button>
          
          <div className={styles.nsModalDateRow}>
            <span className={styles.nsModalDate}>{dateStr}</span>
            <span className={styles.nsModalLine}></span>
          </div>
          
          <h2 className={styles.nsModalTitle}>{selectedEntry.title}</h2>
          
          <div className={styles.nsModalGrid}>
            <div className={styles.nsModalMain}>
              <div className={styles.nsModalImageWrap}>
                <div className={styles.nsModalImageFallback}></div>
                <span className={styles.nsModalImageTag}>MENTAL ANCHOR</span>
              </div>
              <div className={styles.nsModalBody}>
                {selectedEntry.content.split('\n\n').map((para, i) => (
                  <p key={i} className={i === 0 ? styles.nsModalFirstPara : styles.nsModalPara}>{para}</p>
                ))}
              </div>
            </div>
            <div className={styles.nsModalSide}>
              <div className={styles.nsModalSideSect}>
                <h4 className={styles.nsModalSideHeader}>Biometrie</h4>
                <div className={styles.nsModalBioRow}>
                  <span className={styles.nsModalBioLabel}>HRV</span>
                  <strong className={styles.nsModalBioVal}>{selectedEntry.biometrics_hrv || '--'} ms</strong>
                </div>
                <div className={styles.nsModalBioRow}>
                  <span className={styles.nsModalBioLabel}>Fokus</span>
                  <strong className={styles.nsModalBioVal}>{selectedEntry.biometrics_focus || '--'}%</strong>
                </div>
              </div>
              {selectedEntry.future_self_hint && (
                <div className={styles.nsModalHintBox}>
                  <p className={styles.nsModalHintLabel}>Future Self Hint</p>
                  <p className={styles.nsModalHintText}>"{selectedEntry.future_self_hint}"</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render Compose Modal
  const renderComposeModal = () => {
    if (!isWritingEntry) return null;
    
    const dateStr = new Date().toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase();
    
    return (
      <div className={styles.nsModalOverlay} onClick={() => setIsWritingEntry(false)}>
        <div className={styles.nsModalContent} onClick={e => e.stopPropagation()}>
          <button className={styles.nsModalClose} onClick={() => setIsWritingEntry(false)}>
            <span className="material-symbols-outlined">close</span>
          </button>
          
          <div className={styles.nsModalDateRow}>
            <span className={styles.nsModalDate}>{dateStr}</span>
            <span className={styles.nsModalLine}></span>
          </div>
          
          <input 
            type="text" 
            className={styles.nsJournalLine}
            style={{ fontSize: '3rem', fontFamily: 'var(--font-display)', color: '#ebe0da', marginBottom: '2.5rem', width: '100%', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255, 197, 143, 0.2)', paddingBottom: '0.5rem', outline: 'none' }}
            placeholder="Titel des Eintrags..."
            value={newEntryTitle}
            onChange={e => setNewEntryTitle(e.target.value)}
            disabled={isSavingEntry}
          />
          
          <div className={styles.nsModalGrid}>
            <div className={styles.nsModalMain}>
              <textarea
                className={styles.nsJournal}
                style={{ fontSize: '1.125rem', minHeight: '300px', lineHeight: 1.8, color: 'rgba(213, 195, 182, 0.9)' }}
                placeholder="Was beschäftigt dich heute? Worauf fokussierst du dich?"
                value={newEntryContent}
                onChange={e => setNewEntryContent(e.target.value)}
                disabled={isSavingEntry}
              />
            </div>
            <div className={styles.nsModalSide}>
              <div className={styles.nsModalSideSect}>
                <h4 className={styles.nsModalSideHeader}>Biometrie (Auto)</h4>
                <div className={styles.nsModalBioRow}>
                  <span className={styles.nsModalBioLabel}>Aktuelle HRV</span>
                  <strong className={styles.nsModalBioVal}>{profile?.metrics?.hrv || '--'} ms</strong>
                </div>
              </div>
              <button 
                className={styles.nsWarmBtn} 
                style={{ width: '100%', padding: '1rem', marginTop: '1rem' }}
                onClick={handleSaveEntry}
                disabled={isSavingEntry || !newEntryTitle.trim() || !newEntryContent.trim()}
              >
                {isSavingEntry ? 'Speichere...' : 'Eintrag im Journal verewigen'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const heroQuote = fs.identity ? fs.identity : 'Die Zukunft gehört denen, die ihre Klarheit heute formen.';

  // Render Vision Workspace
  const renderVisionWorkspace = () => (
    <div className={styles.nsWorkspace}>
      <div className={styles.nsWsGlow} aria-hidden="true" />
      
      <header className={styles.nsWsHero}>
        <div className={styles.nsWsHeroHead}>
          <div className={styles.nsKicker}>NorthStar · Dein zukünftiges Ich</div>
          <StarGlyph className={styles.nsWsStar} />
        </div>
        <h1 className={styles.nsWsTitle}>Erinnere dich,<br />wer du wirst.</h1>
        <p className={styles.nsWsLede}>
          Deine Vision ist gesetzt. Richte den heutigen Tag daran aus.
        </p>
        <blockquote className={styles.nsWsQuote}>
          <span className={styles.nsWsQuoteMark} aria-hidden="true">“</span>
          {heroQuote}
        </blockquote>
      </header>

      <div className={styles.nsWsGrid}>
        <div className={styles.nsWsMain}>
          <section className={`${styles.nsWsCard} ${shared.glassPanel}`} style={{ padding: '2rem' }}>
            <div className={styles.nsWsCardHead} style={{ borderBottom: 'none', padding: 0, marginBottom: '1.25rem' }}>
              <span className={styles.nsWsCardIndex}>01</span>
              Identität
            </div>
            <div className={styles.nsWsCardBody} style={{ padding: 0 }}>
              <textarea
                className={`${styles.nsWsIdentity} ${styles.editableSerif}`}
                rows={2}
                value={fs.identity}
                onChange={(e) => setFs({ identity: e.target.value })}
                placeholder="Ich bin jemand, der…"
              />
            </div>
          </section>

          <section className={`${styles.nsWsCard} ${shared.glassPanel}`} style={{ padding: '2rem' }}>
            <div className={styles.nsWsCardHead} style={{ borderBottom: 'none', padding: 0, marginBottom: '1.5rem' }}>
              <span className={styles.nsWsCardIndex}>02</span>
              Vision
            </div>
            <div className={styles.nsWsCardBody} style={{ padding: 0 }}>
              <div className={styles.nsWsTimeline} style={{ borderLeft: 'none', paddingLeft: 0 }}>
                {HORIZONS.map(([key, prompt]) => (
                  <div key={key} className={styles.nsWsTimelineRow} style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '1.1rem', marginBottom: '1rem' }}>
                    <span className={styles.nsWsTag} style={{ fontFamily: 'var(--font-mono)', minWidth: '40px', color: 'var(--ns-amber)', fontSize: '0.8rem', fontWeight: 500 }}>
                      {key === 'y1' ? '1J' : key === 'y3' ? '3J' : '5J'}
                    </span>
                    <input
                      className={styles.nsJournalLine}
                      style={{ background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', color: 'var(--ns-cream)', width: '100%', paddingBottom: '0.4rem', outline: 'none', fontSize: '0.95rem' }}
                      value={fs.visions?.[key] || ''}
                      onChange={(e) => setFs({ visions: { ...fs.visions, [key]: e.target.value } })}
                      placeholder="…lebe ich"
                    />
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className={`${styles.nsWsCard} ${shared.glassPanel}`} style={{ padding: '2rem' }}>
            <div className={styles.nsWsCardHead} style={{ borderBottom: 'none', padding: 0, marginBottom: '1.5rem' }}>
              <span className={styles.nsWsCardIndex}>03</span>
              Werte
            </div>
            <div className={styles.nsWsCardBody} style={{ padding: 0 }}>
              <input
                className={styles.nsJournalLine}
                style={{ background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', color: 'var(--ns-cream)', width: '100%', paddingBottom: '0.4rem', outline: 'none', fontSize: '0.95rem', marginBottom: '1.25rem' }}
                value={(fs.values || []).join(', ')}
                onChange={(e) => setFs({ values: e.target.value.split(',').map((v) => v.trim()).filter(Boolean) })}
                placeholder="Disziplin, Neugier, Gelassenheit"
              />
              {(fs.values || []).length > 0 && (
                <div className={styles.nsChips} style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {fs.values.map((v) => (
                    <span key={v} className={styles.nsChip} style={{ padding: '0.35rem 0.85rem', borderRadius: '100px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)', fontSize: '0.75rem', fontWeight: 300, color: 'var(--ns-cream)', cursor: 'pointer' }}>
                      {v}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className={`${styles.nsWsCard} ${shared.glassPanel}`} style={{ padding: '2rem' }}>
            <div className={styles.nsWsCardHead} style={{ borderBottom: 'none', padding: 0, marginBottom: '1.5rem' }}>
              <span className={styles.nsWsCardIndex}>04</span>
              Säulen
            </div>
            <div className={styles.nsWsCardBody} style={{ padding: 0 }}>
              <div className={styles.nsBalance} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {PILLARS.map((p) => {
                  const val = fs.pillarTargets?.[p.key] ?? 5.0;
                  return (
                    <div key={p.key} className={styles.nsBalanceRow} style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 300, color: 'rgba(255,255,255,0.8)' }}>{p.label}</span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--ns-amber)', fontWeight: 500 }}>{Number(val).toFixed(1)}</span>
                      </div>
                      <input
                        className={styles.customSlider}
                        type="range"
                        min="0"
                        max="10"
                        step="0.1"
                        value={val}
                        onChange={(e) => setFs({ pillarTargets: { ...fs.pillarTargets, [p.key]: Number(e.target.value) } })}
                      />
                    </div>
                  );
                })}
              </div>
              <div className={styles.nsWsCardActions} style={{ marginTop: '2.25rem' }}>
                <button className={styles.nsWarmBtn} onClick={saveFutureSelf}>Vision bewahren</button>
                <button type="button" className={styles.nsBackLink} onClick={() => { nsEditedRef.current = false; setNsReexplore(true); }}>
                  Vision neu erkunden
                </button>
              </div>
            </div>
          </section>
        </div>

        <aside className={styles.nsWsSide}>
          <div className={`${styles.nsWsPanel} ${shared.glassPanel}`} style={{ position: 'sticky', top: '1.5rem' }}>
            <div className={styles.nsWsPanelAura} style={{ background: 'radial-gradient(circle at top right, var(--ns-glow) 0%, transparent 60%)' }} />
            <div className={styles.nsWsPanelHead}>
              <StarGlyph className={styles.nsWsPanelStar} />
              <div>
                <div className={styles.nsWsPanelName}>{profile?.futureSelf?.archetypeName || 'NorthStar'}</div>
                <div className={styles.nsWsPanelRole}>Future Self Agent</div>
              </div>
            </div>

            <p className={styles.nsWsMessage}>
              {nsMessage ? `“${nsMessage}”` : 'Bitte um Führung für heute — oder stell die Frage, die dich gerade bewegt.'}
            </p>
            <button className={styles.nsWsPrimaryBtn} onClick={askNorthStar} disabled={nsBusy}>
              {nsBusy ? 'NorthStar denkt…' : 'Botschaft empfangen'}
            </button>

            {nsNudge && (
              <div className={styles.nsWsNudge}>
                <span className={styles.nsWsNudgeLabel}>Täglicher Impuls</span>
                {nsNudge}
              </div>
            )}

            <div className={styles.nsWsRecal}>
              <div className={styles.nsWsRecalTitle}>Aus der Bahn geworfen?</div>
              {nsRecalMsg && <p className={styles.nsWsRecalEcho} style={{ fontStyle: 'italic', fontFamily: 'var(--font-display)', color: 'var(--ns-cream)', opacity: 0.9 }}>{nsRecalMsg}</p>}
              <textarea
                className={styles.nsWsRecalInput}
                rows={2}
                value={nsRecalInput}
                onChange={(e) => setNsRecalInput(e.target.value)}
                placeholder="Was beschäftigt dich gerade?"
              />
              <button className={styles.nsGhostBtn} onClick={recalibrate} disabled={nsRecalBusy || !nsRecalInput.trim()}>
                {nsRecalBusy ? 'Rekalibriere…' : 'Rekalibrieren'}
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );

  // Main Return
  if (showJournal) {
    return renderVisionSetup();
  }

  return (
    <div className={styles.nsContainer}>
      <div className={styles.nsNav}>
        <button 
          className={`${styles.nsNavBtn} ${activeSubTab === 'journal' ? styles.nsNavBtnActive : ''}`}
          onClick={() => setActiveSubTab('journal')}
        >
          Journal
        </button>
        <button 
          className={`${styles.nsNavBtn} ${activeSubTab === 'vision' ? styles.nsNavBtnActive : ''}`}
          onClick={() => setActiveSubTab('vision')}
        >
          Vision
        </button>
      </div>

      {activeSubTab === 'journal' && renderPinboard()}
      {activeSubTab === 'vision' && renderVisionWorkspace()}

      {selectedEntry && renderEntryModal()}
      {isWritingEntry && renderComposeModal()}
    </div>
  );
}
