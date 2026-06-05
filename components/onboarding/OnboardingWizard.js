import React, { useState, useEffect } from 'react';
import styles from './OnboardingWizard.module.css';
import { generateCompleteWeekCalendar } from '@/lib/circadian_scheduler';

export default function OnboardingWizard({ profile, activateOptimalProtocol, onClose }) {
  const [step, setStep] = useState(1);
  
  // Step 1: Chronotype & Times
  const [chronotype, setChronotype] = useState(profile?.optimalWeek?.chronotype || 'balanced');
  const [wakeTime, setWakeTime] = useState(profile?.optimalWeek?.wakeTime || '07:00');
  const [bedTime, setBedTime] = useState(profile?.optimalWeek?.bedTime || '23:00');
  
  // Step 2: Goals
  const [deepWorkHours, setDeepWorkHours] = useState(profile?.optimalWeek?.goals?.deepWorkHours || 15);
  const [sportSessions, setSportSessions] = useState(profile?.optimalWeek?.goals?.sportSessions || 3);
  const [recoverySessions, setRecoverySessions] = useState(profile?.optimalWeek?.goals?.recoverySessions || 3);
  
  // Step 3: Liabilities
  const [liabilities, setLiabilities] = useState(profile?.liabilities || []);
  const [nlpText, setNlpText] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  
  // Manual Liability Form State
  const [manualTitle, setManualTitle] = useState('');
  const [manualDay, setManualDay] = useState('Montag');
  const [manualStart, setManualStart] = useState('09:00');
  const [manualEnd, setManualEnd] = useState('17:00');

  // Step 4: Preview State
  const [previewCalendar, setPreviewCalendar] = useState({});

  useEffect(() => {
    if (step === 4) {
      const cal = generateCompleteWeekCalendar(
        chronotype, 
        wakeTime, 
        bedTime, 
        liabilities, 
        { deepWorkHours, sportSessions, recoverySessions }
      );
      setPreviewCalendar(cal);
    }
  }, [step, chronotype, wakeTime, bedTime, liabilities, deepWorkHours, sportSessions, recoverySessions]);

  const handleNlpParse = async () => {
    if (!nlpText.trim()) return;
    setIsParsing(true);
    try {
      const response = await fetch('/api/mistral', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `parse blockaden/verbindlichkeiten from user text: "${nlpText}"`,
          systemPrompt: `Du bist ein präziser Liabilities-Parser für das Pronoia Life OS. 
          Extrahiere wöchentliche Blockaden und Verbindlichkeiten aus dem Benutzertext.
          Verwende für das Feld "day" exakt die deutschen Namen: Montag, Dienstag, Mittwoch, Donnerstag, Freitag, Samstag, Sonntag.
          Antworte AUSSCHLIESSLICH mit einem validen JSON-Array im Format:
          [{"id": "l1", "title": "Arbeit", "day": "Montag", "startTime": "09:00", "endTime": "17:00"}]`
        })
      });
      if (response.ok) {
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        if (content) {
          const parsed = JSON.parse(content);
          if (Array.isArray(parsed)) {
            setLiabilities(prev => {
              const updated = [...prev];
              parsed.forEach(item => {
                const uniqueId = item.id || `nlp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                // Avoid duplication
                if (!updated.some(existing => existing.day === item.day && existing.startTime === item.startTime && existing.endTime === item.endTime)) {
                  updated.push({
                    id: uniqueId,
                    title: item.title || 'Fester Termin',
                    day: item.day || 'Montag',
                    startTime: item.startTime || '09:00',
                    endTime: item.endTime || '17:00'
                  });
                }
              });
              return updated;
            });
            setNlpText('');
          }
        }
      }
    } catch (err) {
      console.error("NLP parsing error:", err);
      // Fallback keyword extract
      const lower = nlpText.toLowerCase();
      const fallbackLiabs = [];
      const daysMap = {
        'montag': 'Montag', 'dienstag': 'Dienstag', 'mittwoch': 'Mittwoch', 
        'donnerstag': 'Donnerstag', 'freitag': 'Freitag', 'samstag': 'Samstag', 'sonntag': 'Sonntag'
      };
      
      Object.keys(daysMap).forEach(key => {
        if (lower.includes(key)) {
          fallbackLiabs.push({
            id: `fallback_${Date.now()}_${key}`,
            title: lower.includes('sport') || lower.includes('gym') ? 'Sport' : 'Arbeit/Verpflichtung',
            day: daysMap[key],
            startTime: '09:00',
            endTime: '17:00'
          });
        }
      });

      if (fallbackLiabs.length > 0) {
        setLiabilities(prev => [...prev, ...fallbackLiabs]);
        setNlpText('');
      } else {
        alert("Eingabe konnte nicht automatisch interpretiert werden. Bitte nutze die manuelle Eingabe.");
      }
    } finally {
      setIsParsing(false);
    }
  };

  const handleAddManual = (e) => {
    e.preventDefault();
    if (!manualTitle.trim()) return;
    
    const newLiab = {
      id: `manual_${Date.now()}`,
      title: manualTitle,
      day: manualDay,
      startTime: manualStart,
      endTime: manualEnd
    };
    
    setLiabilities(prev => [...prev, newLiab]);
    setManualTitle('');
  };

  const handleDeleteLiability = (id) => {
    setLiabilities(prev => prev.filter(l => l.id !== id));
  };

  const handleActivate = () => {
    activateOptimalProtocol(
      chronotype, 
      wakeTime, 
      bedTime, 
      liabilities, 
      { deepWorkHours, sportSessions, recoverySessions }
    );
    if (onClose) onClose();
  };

  const daysList = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];

  return (
    <div className={styles.overlay}>
      <div className={styles.wizardCard}>
        <div className={styles.header}>
          <span className={styles.stepIndicator}>SCHRITT {step} von 4</span>
          <h2 className={styles.title}>
            {step === 1 && "Zirkadianer Schlaf-Planer"}
            {step === 2 && "Kognitive & Physische Ziele"}
            {step === 3 && "Wöchentliche Liabilities (Blockaden)"}
            {step === 4 && "Vorschau des Optimalen Protokolls"}
          </h2>
          <p className={styles.desc}>
            {step === 1 && "Wähle deinen Chronotyp und passe deine Aufwach- und Schlafenszeiten an, um deine bio-kognitiven Peaks zu berechnen."}
            {step === 2 && "Definiere, wie viele Stunden Deep Work und Sessions für Fitness/Erholung du pro Woche anstrebst."}
            {step === 3 && "Trage feste wöchentliche Termine (wie Arbeit oder Vorlesungen) ein. Die kognitiven Ziele werden um diese Sperrzeiten herum optimiert."}
            {step === 4 && "Überprüfe das vom System berechnete zirkadiane Wochenprotokoll basierend auf deinen Schlaf-Peaks und blockierten Liabilities."}
          </p>
        </div>

        <div className={styles.body}>
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              <div>
                <label className={styles.label}>Chronotyp-Klassifizierung</label>
                <div className={styles.chronotypeGrid}>
                  {[
                    { id: 'morning', icon: '🌅', name: 'Lerchen-Typ', desc: 'Mentaler Peak am Vormittag. Frühes Aufwachen.' },
                    { id: 'balanced', icon: '⚖️', name: 'Ausgeglichen', desc: 'Standardmäßige Leistungskurve. Moderates Aufwachen.' },
                    { id: 'evening', icon: '🌌', name: 'Eulen-Typ', desc: 'Kreativ-Peak am Spätabend. Spätes Aufwachen.' }
                  ].map(c => (
                    <button
                      key={c.id}
                      type="button"
                      className={`${styles.chronoBtn} ${chronotype === c.id ? styles.chronoActive : ''}`}
                      onClick={() => setChronotype(c.id)}
                    >
                      <span className={styles.chronoIcon}>{c.icon}</span>
                      <span className={styles.chronoTitle}>{c.name}</span>
                      <span className={styles.chronoDesc}>{c.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.timeRow}>
                <div className={styles.timeField}>
                  <label className={styles.label}>Aufwachzeit</label>
                  <input
                    type="time"
                    className={styles.timeInput}
                    value={wakeTime}
                    onChange={e => setWakeTime(e.target.value)}
                  />
                </div>
                <div className={styles.timeField}>
                  <label className={styles.label}>Schlafenszeit</label>
                  <input
                    type="time"
                    className={styles.timeInput}
                    value={bedTime}
                    onChange={e => setBedTime(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className={styles.goalsGrid}>
              <div className={styles.goalRow}>
                <div className={styles.goalLabelRow}>
                  <label className={styles.label}>Wöchentliche Deep-Work Stunden</label>
                  <span className={styles.goalVal}>{deepWorkHours} Std.</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="40"
                  step="1"
                  className={styles.slider}
                  value={deepWorkHours}
                  onChange={e => setDeepWorkHours(Number(e.target.value))}
                />
              </div>

              <div className={styles.goalRow}>
                <div className={styles.goalLabelRow}>
                  <label className={styles.label}>Wöchentliche Fitness-Sessions</label>
                  <span className={styles.goalVal}>{sportSessions}x</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="7"
                  step="1"
                  className={styles.slider}
                  value={sportSessions}
                  onChange={e => setSportSessions(Number(e.target.value))}
                />
              </div>

              <div className={styles.goalRow}>
                <div className={styles.goalLabelRow}>
                  <label className={styles.label}>Wöchentliche Recovery / NSDR-Sessions</label>
                  <span className={styles.goalVal}>{recoverySessions}x</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="7"
                  step="1"
                  className={styles.slider}
                  value={recoverySessions}
                  onChange={e => setRecoverySessions(Number(e.target.value))}
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className={styles.liabilitiesContainer}>
              {/* NLP Input */}
              <div className={styles.nlpSection}>
                <label className={styles.label}>KI-Freitext Analyse</label>
                <textarea
                  className={styles.nlpTextarea}
                  rows={2}
                  placeholder="z.B. 'Ich arbeite Montag bis Freitag von 9 bis 17 Uhr und habe Mittwoch um 18 Uhr Sport'..."
                  value={nlpText}
                  onChange={e => setNlpText(e.target.value)}
                />
                <div className={styles.nlpBtnRow}>
                  <button 
                    type="button" 
                    className={`${styles.nextBtn} ${styles.parseBtn}`}
                    onClick={handleNlpParse}
                    disabled={isParsing || !nlpText.trim()}
                  >
                    {isParsing ? 'Analysiere...' : 'Einlesen ✦'}
                  </button>
                </div>
              </div>

              {/* Manual Input Form */}
              <div>
                <label className={styles.label}>Manuelle Sperrzeit hinzufügen</label>
                <form onSubmit={handleAddManual} className={styles.manualForm}>
                  <input
                    type="text"
                    placeholder="Titel (z.B. Arbeit)"
                    className={styles.textInput}
                    value={manualTitle}
                    onChange={e => setManualTitle(e.target.value)}
                    required
                  />
                  <select
                    className={styles.selectInput}
                    value={manualDay}
                    onChange={e => setManualDay(e.target.value)}
                  >
                    {daysList.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                  <input
                    type="time"
                    className={styles.textInput}
                    value={manualStart}
                    onChange={e => setManualStart(e.target.value)}
                    required
                  />
                  <input
                    type="time"
                    className={styles.textInput}
                    value={manualEnd}
                    onChange={e => setManualEnd(e.target.value)}
                    required
                  />
                  <button type="submit" className={styles.addBtn}>+</button>
                </form>
              </div>

              {/* List of current blockages */}
              <div className={styles.liabilitiesList}>
                {liabilities.map(l => (
                  <div key={l.id} className={styles.liabilityRow}>
                    <div className={styles.liabInfo}>
                      <span className={styles.liabDay}>{l.day}</span>
                      <span className={styles.liabTitle}>{l.title}</span>
                      <span className={styles.liabTime}>({l.startTime} – {l.endTime})</span>
                    </div>
                    <button 
                      type="button" 
                      className={styles.liabDelete}
                      onClick={() => handleDeleteLiability(l.id)}
                    >
                      ✕
                    </button>
                  </div>
                ))}
                {liabilities.length === 0 && (
                  <p className={styles.chronoDesc} style={{ padding: '1rem', margin: 0, textAlign: 'center', opacity: 0.6 }}>
                    Keine wöchentlichen Liabilities eingetragen. Dein Kalender wird rein zirkadian optimiert.
                  </p>
                )}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className={styles.previewGrid}>
              {daysList.map(dayName => {
                // Find matching date in previewCalendar
                const calendarDateKey = Object.keys(previewCalendar).find(key => {
                  // The week calendar keys are dates 'YYYY-MM-DD'
                  // We can match them by looking at the generated day calendar's weekday
                  const date = new Date(key);
                  const formattedDay = date.toLocaleDateString('de-DE', { weekday: 'long' });
                  return formattedDay === dayName;
                });
                
                const blocks = calendarDateKey ? previewCalendar[calendarDateKey].blocks : [];

                return (
                  <div key={dayName} className={styles.previewCol}>
                    <span className={styles.previewColTitle}>{dayName.substr(0, 2)}</span>
                    <div className={styles.previewBlocksList}>
                      {blocks.map((b, i) => {
                        const isLiab = b.liability;
                        const borderColor = b.pillar === 'focus' ? 'var(--theme-accent, #1A6AFF)' : b.pillar === 'skills' ? 'var(--amber)' : b.pillar === 'recovery' ? 'var(--cobalt-bright)' : b.pillar === 'health' ? 'var(--green)' : 'rgba(255, 255, 255, 0.2)';
                        
                        return (
                          <div 
                            key={i} 
                            className={styles.previewBlockItem}
                            style={{ 
                              borderLeftColor: borderColor,
                              background: isLiab ? 'rgba(255, 255, 255, 0.04)' : undefined,
                              borderStyle: isLiab ? 'dashed' : 'solid',
                              borderWidth: isLiab ? '1px 1px 1px 3px' : '0 0 0 2px',
                              opacity: isLiab ? 0.6 : 1
                            }}
                            title={`${b.title} (${b.startTime}) - ${b.insight}`}
                          >
                            {isLiab ? '🔒 ' : ''}{b.title}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className={styles.footer}>
          {profile?.hasCompletedOnboarding ? (
            <button type="button" className={styles.cancelBtn} onClick={onClose}>
              Abbrechen
            </button>
          ) : (
            <div style={{ width: '1px' }} />
          )}

          <div className={styles.btnGroup}>
            {step > 1 && (
              <button 
                type="button" 
                className={styles.backBtn}
                onClick={() => setStep(prev => prev - 1)}
              >
                Zurück
              </button>
            )}
            
            {step < 4 ? (
              <button 
                type="button" 
                className={`${styles.nextBtn} ${styles.primaryAction}`}
                onClick={() => setStep(prev => prev + 1)}
              >
                Weiter
              </button>
            ) : (
              <button 
                type="button" 
                className={`${styles.nextBtn} ${styles.primaryAction}`}
                onClick={handleActivate}
              >
                Protokoll Aktivieren ✦
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
