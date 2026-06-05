import React, { useState, useEffect } from 'react';
import styles from './OnboardingWizard.module.css';
import { generateCompleteWeekCalendar } from '@/lib/circadian_scheduler';

export default function OnboardingWizard({ profile, activateOptimalProtocol, setCalendar, saveProfile, onClose }) {
  const [step, setStep] = useState(1);
  const [onboardingMode, setOnboardingMode] = useState('circadian'); // 'circadian' | 'import'
  
  // Step 1: Chronotype & Times
  const [chronotype, setChronotype] = useState(profile?.optimalWeek?.chronotype || 'balanced');
  const [wakeTime, setWakeTime] = useState(profile?.optimalWeek?.wakeTime || '07:00');
  const [bedTime, setBedTime] = useState(profile?.optimalWeek?.bedTime || '23:00');
  const [showerPreference, setShowerPreference] = useState(profile?.optimalWeek?.showerPreference || 'morning');
  const [shoppingPreference, setShoppingPreference] = useState(profile?.optimalWeek?.shoppingPreference || 'weekly');
  
  // Step 2: Goals
  const [deepWorkHours, setDeepWorkHours] = useState(profile?.optimalWeek?.goals?.deepWorkHours || 15);
  const [sportSessions, setSportSessions] = useState(profile?.optimalWeek?.goals?.sportSessions || 3);
  const [recoverySessions, setRecoverySessions] = useState(profile?.optimalWeek?.goals?.recoverySessions || 3);
  
  // Step 3: Liabilities
  const [liabilities, setLiabilities] = useState(profile?.liabilities || []);
  const [nlpText, setNlpText] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  
  // Import Mode State
  const [importText, setImportText] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  
  // Manual Liability Form State
  const [manualTitle, setManualTitle] = useState('');
  const [manualDay, setManualDay] = useState('Montag');
  const [manualStart, setManualStart] = useState('09:00');
  const [manualEnd, setManualEnd] = useState('17:00');

  // Step 4: Preview State
  const [previewCalendar, setPreviewCalendar] = useState({});
  const [previewDayIdx, setPreviewDayIdx] = useState(0);

  useEffect(() => {
    if (step === 4 && onboardingMode === 'circadian') {
      const cal = generateCompleteWeekCalendar(
        chronotype, 
        wakeTime, 
        bedTime, 
        liabilities, 
        { deepWorkHours, sportSessions, recoverySessions },
        showerPreference,
        shoppingPreference
      );
      setPreviewCalendar(cal);
    }
  }, [step, onboardingMode, chronotype, wakeTime, bedTime, liabilities, deepWorkHours, sportSessions, recoverySessions, showerPreference, shoppingPreference]);

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

  const handleImportPlan = async () => {
    if (!importText.trim()) return;
    setIsImporting(true);
    try {
      const response = await fetch('/api/mistral', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `parse fertiger_wochenplan from user text: "${importText}"
          preferences:
          - showerPreference: ${showerPreference}
          - shoppingPreference: ${shoppingPreference}`,
          systemPrompt: `Du bist ein automatischer Wochenplan-Konverter für Pronoia Life OS.
          Lies den Wochenplan des Nutzers ein und konvertiere ihn in strukturierte Blöcke.
          Jeder Tag (Montag, Dienstag, Mittwoch, Donnerstag, Freitag, Samstag, Sonntag) muss ein Array von Blöcken sein.
          Jeder Block benötigt exakt:
          - title: Name des Blocks (z.B. "Fokus Arbeit", "Duschen & Morgenroutine", "Mittagessen")
          - startTime: "HH:MM"
          - duration: Dauer in Sekunden (z.B. 3600 für 1 Std)
          - pillar: "focus" | "health" | "skills" | "recovery" | "social"
          - type: "Focus" | "Health" | "Skills" | "Recovery" | "Social"
          
          WICHTIGE ANWEISUNG:
          Ergänze den Plan für jeden Tag automatisch mit wichtigen zirkadianen Routine-Blöcken in den Lücken oder passend platziert, falls der Nutzer sie nicht explizit genannt hat:
          1. 'Circadian Light Sync & Baseline Hydration' (Aufstehen, ca. 07:00 oder 30 Min vor dem ersten Block, 30 Min, pillar: recovery, type: Recovery)
          2. 'Mahlzeit I (Frühstück & Neuro-Fuel)' (ca. 08:00, 30 Min, pillar: health, type: Health)
          3. 'Mahlzeit II (Mittagessen & Zirkadianer Reset)' (ca. 13:00, 45 Min, pillar: health, type: Health)
          4. 'Mahlzeit III (Abendessen - Zirkadianer Abstand)' (ca. 19:00, 45 Min, pillar: health, type: Health)
          5. 'Circadian Wind-Down & Sleep Prep' (Schlafvorbereitung, ca. 22:00 oder am Ende des Tages, 60 Min, pillar: recovery, type: Recovery)
          
          Bezüglich Duschen und Einkaufen, richte dich nach folgenden Präferenzen des Nutzers:
          - Falls showerPreference = "morning": Füge 'Cold Shower & Morgen-Routine' (30 Min, pillar: recovery) direkt nach dem Aufstehen-Block hinzu.
          - Falls showerPreference = "evening": Füge 'Warm Shower & Abend-Routine' (30 Min, pillar: recovery) ca. 90-60 Min vor dem Wind-down-Block hinzu.
          - Falls showerPreference = "sport": Füge 'Shower & Post-Workout Recovery' (30 Min, pillar: recovery) direkt im Anschluss an sportliche Aktivitäten hinzu. Falls kein Sport, am Morgen einplanen.
          - Falls showerPreference = "none": Keinen Dusch-Block einplanen.
          
          - Falls shoppingPreference = "weekly": Füge an Dienstagen und Freitagen einen Block 'Einkaufen & Besorgungen / Haushalt' (45 Min, pillar: social) am Spätnachmittag (ca. 17:30) hinzu.
          - Falls shoppingPreference = "none": Keinen Einkaufs-Block einplanen.
          
          Achte darauf, dass diese Ergänzungen zeitlich nicht mit den vom Nutzer explizit genannten Arbeits-/Terminblöcken überlappen. Verschiebe sie leicht in freie Zeiten, sodass ein stimmiges, lückenloses Gesamtbild entsteht.
          Antworte AUSSCHLIESSLICH mit einem validen JSON-Objekt, das Wochentage als Keys auf Block-Arrays abbildet.`
        })
      });
      if (response.ok) {
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        if (content) {
          const parsed = JSON.parse(content);
          
          const today = new Date();
          const currentDayOfWeek = today.getDay();
          const mondayOffset = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;
          const startMonday = new Date(today);
          startMonday.setDate(today.getDate() + mondayOffset);

          const weekCalendar = {};
          daysList.forEach((dayName, idx) => {
            const targetDate = new Date(startMonday);
            targetDate.setDate(startMonday.getDate() + idx);
            const dateStr = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-${String(targetDate.getDate()).padStart(2, '0')}`;
            
            const dayBlocks = parsed[dayName] || [];
            weekCalendar[dateStr] = {
              blocks: dayBlocks.map(b => ({
                title: b.title || 'Plan Block',
                startTime: b.startTime || '09:00',
                duration: b.duration || 3600,
                pillar: b.pillar || 'focus',
                type: b.type || 'Focus'
              }))
            };
          });

          setPreviewCalendar(weekCalendar);
          alert("Wochenplan erfolgreich konvertiert! Fahre fort zur Vorschau.");
          setStep(4);
        }
      }
    } catch (err) {
      console.error("Import conversion failed:", err);
      alert("Fehler beim Konvertieren. Nutze die zirkadiane Generierung oder überprüfe die Formatierung.");
    } finally {
      setIsImporting(false);
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
    if (onboardingMode === 'circadian') {
      activateOptimalProtocol(
        chronotype, 
        wakeTime, 
        bedTime, 
        liabilities, 
        { deepWorkHours, sportSessions, recoverySessions },
        showerPreference,
        shoppingPreference
      );
    } else {
      setCalendar(previewCalendar);
      saveProfile({
        hasCompletedOnboarding: true,
        optimalWeek: {
          chronotype,
          wakeTime,
          bedTime,
          goals: { deepWorkHours, sportSessions, recoverySessions },
          showerPreference,
          shoppingPreference,
          mode: 'imported'
        },
        liabilities: []
      });
    }
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
            {step === 3 && (onboardingMode === 'circadian' ? "Wöchentliche Liabilities (Blockaden)" : "Bestehenden Plan importieren")}
            {step === 4 && "Vorschau des Optimalen Protokolls"}
          </h2>
          <p className={styles.desc}>
            {step === 1 && "Wähle deinen Chronotyp und passe deine Aufwach- und Schlafenszeiten an, um deine bio-kognitiven Peaks zu berechnen."}
            {step === 2 && "Definiere, wie viele Stunden Deep Work und Sessions für Fitness/Erholung du pro Woche anstrebst."}
            {step === 3 && (onboardingMode === 'circadian' 
              ? "Trage feste wöchentliche Termine (wie Arbeit oder Vorlesungen) ein. Die kognitiven Ziele werden um diese Sperrzeiten herum optimiert." 
              : "Füge deinen bestehenden Wochenplan ein, um ihn direkt in strukturierte Protokollblöcke zu konvertieren.")}
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

              <div className={styles.timeRow}>
                <div className={styles.timeField}>
                  <label className={styles.label}>Normalerweise duschen</label>
                  <select
                    className={styles.selectInput}
                    value={showerPreference}
                    onChange={e => setShowerPreference(e.target.value)}
                    style={{ background: 'rgba(255, 255, 255, 0.04)', height: '42px', border: '1px solid var(--border-s)', color: 'var(--text)' }}
                  >
                    <option value="morning">🌅 Morgens (nach Aufstehen)</option>
                    <option value="evening">🌌 Abends (vor Schlafen)</option>
                    <option value="sport">💪 Nach dem Sport / Training</option>
                    <option value="none">❌ Nicht automatisch einplanen</option>
                  </select>
                </div>
                <div className={styles.timeField}>
                  <label className={styles.label}>Einkaufen & Besorgungen</label>
                  <select
                    className={styles.selectInput}
                    value={shoppingPreference}
                    onChange={e => setShoppingPreference(e.target.value)}
                    style={{ background: 'rgba(255, 255, 255, 0.04)', height: '42px', border: '1px solid var(--border-s)', color: 'var(--text)' }}
                  >
                    <option value="weekly">🛒 Ja, wöchentlich (Spätnachmittag)</option>
                    <option value="none">❌ Nicht automatisch einplanen</option>
                  </select>
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
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                <button
                  type="button"
                  className={`${styles.backBtn} ${onboardingMode === 'circadian' ? styles.chronoActive : ''}`}
                  style={{ flex: 1, borderRadius: '12px', padding: '0.75rem', textTransform: 'none', fontSize: '0.75rem' }}
                  onClick={() => setOnboardingMode('circadian')}
                >
                  ⚙️ Zirkadianer Optimierer
                </button>
                <button
                  type="button"
                  className={`${styles.backBtn} ${onboardingMode === 'import' ? styles.chronoActive : ''}`}
                  style={{ flex: 1, borderRadius: '12px', padding: '0.75rem', textTransform: 'none', fontSize: '0.75rem' }}
                  onClick={() => setOnboardingMode('import')}
                >
                  📋 Fertigen Plan einlesen
                </button>
              </div>

              {onboardingMode === 'circadian' ? (
                <>
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
                </>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div className={styles.nlpSection}>
                    <label className={styles.label}>Bestehenden Wochenplan einlesen (NLP)</label>
                    <textarea
                      className={styles.nlpTextarea}
                      rows={8}
                      placeholder="Kopiere deinen fertigen Plan hier hinein. Beispiel:&#10;Montag:&#10;08:00 - 08:30 Aufstehen & Routine&#10;09:00 - 12:00 Deep Work&#10;17:00 - 18:30 Sport & Fitness&#10;..."
                      value={importText}
                      onChange={e => setImportText(e.target.value)}
                    />
                    <div className={styles.nlpBtnRow}>
                      <button
                        type="button"
                        className={`${styles.nextBtn} ${styles.primaryAction}`}
                        onClick={handleImportPlan}
                        disabled={isImporting || !importText.trim()}
                        style={{ padding: '0.65rem 2rem' }}
                      >
                        {isImporting ? 'Analysiere Plan...' : 'Plan konvertieren ✦'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 4 && (
            <div className={styles.singleDayPreviewContainer}>
              <div className={styles.previewDaySelector}>
                <button
                  type="button"
                  className={styles.dayNavBtn}
                  onClick={() => setPreviewDayIdx(prev => (prev > 0 ? prev - 1 : 6))}
                >
                  ◀
                </button>
                <span className={styles.previewDayName}>
                  {daysList[previewDayIdx]}
                </span>
                <button
                  type="button"
                  className={styles.dayNavBtn}
                  onClick={() => setPreviewDayIdx(prev => (prev < 6 ? prev + 1 : 0))}
                >
                  ▶
                </button>
              </div>

              <div className={styles.previewDayCard}>
                <div className={styles.previewBlocksListSingle}>
                  {(() => {
                    const dayName = daysList[previewDayIdx];
                    const calendarDateKey = Object.keys(previewCalendar).find(key => {
                      const date = new Date(key);
                      const formattedDay = date.toLocaleDateString('de-DE', { weekday: 'long' });
                      return formattedDay === dayName;
                    });
                    
                    const blocks = calendarDateKey ? previewCalendar[calendarDateKey].blocks : [];

                    if (blocks.length === 0) {
                      return <p className={styles.chronoDesc} style={{ textAlign: 'center', opacity: 0.6, margin: '2rem 0' }}>Keine Blöcke für diesen Tag geplant.</p>;
                    }

                    return blocks.map((b, i) => {
                      const isLiab = b.liability;
                      const borderColor = b.pillar === 'focus' ? 'var(--theme-accent, #1A6AFF)' : b.pillar === 'skills' ? 'var(--amber)' : b.pillar === 'recovery' ? 'var(--cobalt-bright)' : b.pillar === 'health' ? 'var(--green)' : 'rgba(255, 255, 255, 0.2)';
                      
                      return (
                        <div 
                          key={i} 
                          className={styles.previewBlockItemSingle}
                          style={{ 
                            borderLeftColor: borderColor,
                            background: isLiab ? 'rgba(255, 255, 255, 0.04)' : undefined,
                            borderStyle: isLiab ? 'dashed' : 'solid',
                            borderWidth: isLiab ? '1px 1px 1px 3px' : '0 0 0 2px',
                            opacity: isLiab ? 0.6 : 1
                          }}
                          title={`${b.title} (${b.startTime}) - ${b.insight}`}
                        >
                          <div className={styles.previewBlockTime}>{b.startTime || '--:--'}</div>
                          <div className={styles.previewBlockContent}>
                            <div className={styles.previewBlockTitleText}>
                              {isLiab ? '🔒 ' : ''}{b.title}
                            </div>
                            <div className={styles.previewBlockRec}>{b.rec}</div>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
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
                disabled={onboardingMode === 'import' && step === 3} /* Force conversion button first in Step 3 for import */
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
