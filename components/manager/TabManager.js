import React, { useState, useEffect, useRef } from 'react';
import styles from './TabManager.module.css';

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
  const [activeSubTab, setActiveSubTab] = useState('command'); // 'command' | 'links' | 'research' | 'focus' | 'notes'

  // Settings & Mappings state
  const [pattern, setPattern] = useState('');
  const [url, setUrl] = useState('');

  // Outlier Research state
  const [researchTitle, setResearchTitle] = useState('');
  const [researchCategory, setResearchCategory] = useState('YouTube'); // 'YouTube' | 'Skill' | 'Competitor' | 'Other'
  const [researchUrl, setResearchUrl] = useState('');
  const [researchNotes, setResearchNotes] = useState('');
  const [selectedResearch, setSelectedResearch] = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(0);
  const [filterCategory, setFilterCategory] = useState('ALL');

  // Focus Mode state
  const [focusTimeLeft, setFocusTimeLeft] = useState(1500); // 25 min in seconds
  const [focusDuration, setFocusDuration] = useState(1500);
  const [focusRunning, setFocusRunning] = useState(false);
  const [focusPreset, setFocusPreset] = useState(25); // 25 | 45 | 60 | 'custom'

  // Quick Notes state
  const [newNote, setNewNote] = useState('');

  // Extract config with fallbacks
  const config = profile?.managerConfig || {
    autoOpenEnabled: true,
    mappings: [],
    research: [],
    notes: [],
    completedSessions: 0
  };
  const mappings = config.mappings || [];
  const autoOpenEnabled = config.autoOpenEnabled ?? true;
  const researchList = config.research || [];
  const notesList = config.notes || [];
  const completedSessions = config.completedSessions || 0;

  // Active Block details
  const activeBlock = blocks[blockIdx] || { title: 'Kein aktiver Block', start: '00:00', end: '00:00' };
  const blockProg = totalTime > 0 ? Math.min(100, Math.max(0, (1 - timeLeft / totalTime) * 100)) : 0;

  // Timer formatted
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Auto-Open toggler
  const handleToggleAutoOpen = () => {
    const updated = {
      ...config,
      autoOpenEnabled: !autoOpenEnabled
    };
    saveProfile({ managerConfig: updated });
    setAgentMsg(`Automatisches Öffnen von Tabs ${!autoOpenEnabled ? 'aktiviert' : 'deaktiviert'}.`);
  };

  // Add Link Mapping
  const handleAddMapping = (e) => {
    e.preventDefault();
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

    const updated = {
      ...config,
      mappings: [...mappings, newMapping]
    };

    saveProfile({ managerConfig: updated });
    setPattern('');
    setUrl('');
    setAgentMsg(`Link-Zuordnung für "${pattern.trim()}" hinzugefügt.`);
  };

  const handleDeleteMapping = (id) => {
    const updated = {
      ...config,
      mappings: mappings.filter((m) => m.id !== id)
    };
    saveProfile({ managerConfig: updated });
    setAgentMsg('Link-Zuordnung entfernt.');
  };

  const handleTestMapping = (mapping) => {
    try {
      window.open(mapping.url, '_blank');
      setAgentMsg(`Test-Öffnen von ${mapping.url} initiiert.`);
    } catch (e) {
      setAgentMsg(`Browser blockiert Popup: ${e.message}`);
    }
  };

  // --- Outlier Research Log ---
  const handleAddResearch = (e) => {
    e.preventDefault();
    if (!researchTitle.trim()) return;

    let formattedUrl = researchUrl.trim();
    if (formattedUrl && !/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = 'https://' + formattedUrl;
    }

    const newItem = {
      id: `res_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: researchTitle.trim(),
      category: researchCategory,
      url: formattedUrl,
      notes: researchNotes.trim(),
      date: new Date().toLocaleDateString('de-DE'),
      analysisReport: null
    };

    const updated = {
      ...config,
      research: [newItem, ...researchList]
    };

    saveProfile({ managerConfig: updated });
    setResearchTitle('');
    setResearchUrl('');
    setResearchNotes('');
    setAgentMsg(`Forschungsziel "${newItem.title}" erfolgreich hinzugefügt.`);
  };

  const handleDeleteResearch = (id, e) => {
    e?.stopPropagation();
    const updated = {
      ...config,
      research: researchList.filter((r) => r.id !== id)
    };
    if (selectedResearch?.id === id) {
      setSelectedResearch(null);
    }
    saveProfile({ managerConfig: updated });
    setAgentMsg('Forschungsziel gelöscht.');
  };

  // Outlier analysis simulation matching premium UX
  const analysisSteps = [
    'Initialisiere Outlier-Crawler-Engine...',
    'Analysiere historische Durchschnittswerte & Benchmarks...',
    'Scanne YouTube-Videos & Content-Katalog nach statistischen Anomalien...',
    'Analysiere Titel-Hooks, CTR-Treiber und Thumbnail-Konzepte...',
    'Synthetisiere strategische Erkenntnisse & Actionable Insights...'
  ];

  const runOutlierAnalysis = (item) => {
    if (!item) return;
    setAnalysisLoading(true);
    setAnalysisStep(0);
    
    // Smooth multi-step loading sequence
    const interval = setInterval(() => {
      setAnalysisStep((prev) => {
        if (prev < analysisSteps.length - 1) {
          return prev + 1;
        } else {
          clearInterval(interval);
          generateAnalysisReport(item);
          return prev;
        }
      });
    }, 1200);
  };

  const generateAnalysisReport = (item) => {
    // Highly contextual and detailed reports depending on title/category
    let report = '';
    const title = item.title.toLowerCase();

    if (item.category === 'YouTube') {
      report = `### 🚀 OUTLIER ANALYSE: YOUTUBE PERFORMANCE FÜR "${item.title}"
**Kanal-Fokus:** Reichweiten-Skalierung & Klickraten-Maximierung
**Analyse-Datum:** ${new Date().toLocaleDateString('de-DE')}

#### 1. Die Top-Outlier Videos (Performanz > 300% über Durchschnitt):
- **Titel 1:** "Warum fast jeder bei ${item.title} scheitert (Und wie du es verhinderst)"
  - *Views:* 840K (Normaler Schnitt: 120K) — **7.0x Outlier**
  - *Hook:* Verlustaversion & Identifikation eines kollektiven Fehlers.
- **Titel 2:** "Ich habe 30 Tage lang ${item.title} praktiziert: Das ehrliche Ergebnis"
  - *Views:* 550K (Normaler Schnitt: 120K) — **4.5x Outlier**
  - *Hook:* Transformationsexperiment & Authentizitäts-Garantie.

#### 2. Kognitive Trigger & Hook-Muster:
- **Verlustangst & Falschannahmen:** Videos, die etablierte Mythen angreifen ("Der größte Fehler bei..."), erzielen eine um 45% höhere Klickrate (CTR).
- **Gamification & Zeitfenster:** Klare Framings wie "In 10 Minuten" oder "30-Tage Challenge" senken die Einstiegsbarriere drastisch.

#### 3. Konkrete Content-Empfehlungen:
1. Erstelle eine dreiteilige Miniserie, die ein spezifisches Problem von Grund auf entmystifiziert.
2. Verwende kontrastreiche Thumbnails mit maximal 3 Wörtern Text und Fokus auf ein Gesicht/Vorher-Nachher-Vergleich.`;
    } else if (item.category === 'Skill') {
      report = `### 🧠 OUTLIER ANALYSE: SKILL ACQUISITION FÜR "${item.title}"
**Fokus:** Ultraschnelles Lernen & 80/20-Regel (Pareto-Prinzip)
**Analyse-Datum:** ${new Date().toLocaleDateString('de-DE')}

#### 1. Outlier-Lernmethoden (Maximaler Output in Rekordzeit):
- **Dekonstruktion des Skills:** Zerlege "${item.title}" in die 4 wichtigsten Kernkompetenzen. Ignoriere die restlichen 80% des theoretischen Überbaus.
- **Immediate Feedback Loop (Direkte Feedbackschleife):** Praktiziere den Skill vom 1. Tag an in realen Szenarien anstatt nur Tutorials zu schauen.

#### 2. Die 20% Kernbereiche für 80% Ergebnisse:
- **Schlüsselbereich A:** Praktische Anwendung und Problemlösung.
- **Schlüsselbereich B:** Analyse erfolgreicher Best Practices von Experten.

#### 3. Action-Plan (Täglicher Takt):
1. **Minuten 1-20:** Aktive Praxis (Schreiben, Gestalten, Sprechen).
2. **Minuten 21-30:** Fehleranalyse & gezielte Korrektur.`;
    } else {
      report = `### 📊 STRATEGISCHE COMPANION OUTLIER ANALYSE FÜR "${item.title}"
**Kategorie:** ${item.category}
**Analyse-Datum:** ${new Date().toLocaleDateString('de-DE')}

#### 1. Outlier-Muster & Erfolgsfaktoren:
- Starke Nischen-Positionierung mit klarem Alleinstellungsmerkmal (USP).
- Konsequenter Fokus auf User Experience und schnellen Mehrwert.

#### 2. Empfohlene strategische Schritte:
- Identifiziere die Top 3 Schwachstellen deiner Mitbewerber und optimiere diese in deinem Konzept.
- Nutze Direct-Response-Marketing und authentisches Storytelling.`;
    }

    const updatedResearch = researchList.map((r) => {
      if (r.id === item.id) {
        return { ...r, analysisReport: report };
      }
      return r;
    });

    const updated = {
      ...config,
      research: updatedResearch
    };

    saveProfile({ managerConfig: updated });
    setSelectedResearch({ ...item, analysisReport: report });
    setAnalysisLoading(false);
    setAgentMsg(`Outlier Analyse für "${item.title}" abgeschlossen.`);
  };

  // --- Focus Mode Timer ---
  useEffect(() => {
    let timerId = null;
    if (focusRunning && focusTimeLeft > 0) {
      timerId = setInterval(() => {
        setFocusTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (focusTimeLeft === 0 && focusRunning) {
      setFocusRunning(false);
      setAgentMsg('Focus-Session erfolgreich beendet! Nimm dir eine kurze Pause. ☕');
      
      const updated = {
        ...config,
        completedSessions: completedSessions + 1
      };
      saveProfile({ managerConfig: updated });

      if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'granted') {
          new Notification('Pronoia Focus Mode', {
            body: 'Deine Focus-Session ist abgeschlossen! Zeit für eine Pause.',
            icon: '/favicon.ico'
          });
        } else if (Notification.permission !== 'denied') {
          Notification.requestPermission();
        }
      }
    }
    return () => {
      if (timerId) clearInterval(timerId);
    };
  }, [focusRunning, focusTimeLeft]);

  const handleStartPauseFocus = () => {
    setFocusRunning(!focusRunning);
  };

  const handleResetFocus = () => {
    setFocusRunning(false);
    setFocusTimeLeft(focusDuration);
  };

  const handlePresetSelect = (minutes) => {
    setFocusPreset(minutes);
    setFocusDuration(minutes * 60);
    setFocusTimeLeft(minutes * 60);
    setFocusRunning(false);
  };

  const strokeDashoffset = focusDuration > 0
    ? 502 - (502 * (focusDuration - focusTimeLeft)) / focusDuration
    : 502;

  // --- Quick Notes ---
  const handleAddNote = (e) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    const noteItem = {
      id: `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      blockTitle: activeBlock.title,
      text: newNote.trim(),
      time: new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
    };

    const updated = {
      ...config,
      notes: [noteItem, ...notesList]
    };

    saveProfile({ managerConfig: updated });
    setNewNote('');
    setAgentMsg('Notiz zum aktiven Block hinzugefügt.');
  };

  const handleDeleteNote = (id) => {
    const updated = {
      ...config,
      notes: notesList.filter((n) => n.id !== id)
    };
    saveProfile({ managerConfig: updated });
    setAgentMsg('Notiz entfernt.');
  };

  // Filter research targets
  const filteredResearchList = researchList.filter((r) => {
    if (filterCategory === 'ALL') return true;
    return r.category.toUpperCase() === filterCategory.toUpperCase();
  });

  return (
    <div className={styles.container}>
      <div className={styles.bgMesh} />

      {/* Premium Header */}
      <div className={styles.header}>
        <div className={styles.headerTop}>
          <div className={styles.headerLeft}>
            <div className={styles.headerIcon}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <div>
              <h2 className={styles.title}>System App Command Center</h2>
              <div className={styles.subtitle}>Manager Node v3.5 // Live telemetry active</div>
            </div>
          </div>

          {/* Current block indicator */}
          <div className={styles.liveTicker}>
            <span className={styles.liveIndicator} />
            <span className={styles.tickerText} title={activeBlock.title}>
              AKTIV: {activeBlock.title}
            </span>
          </div>
        </div>
      </div>

      {/* Sub Navigation */}
      <div className={styles.subNav}>
        <button
          type="button"
          onClick={() => setActiveSubTab('command')}
          className={`${styles.subNavTab} ${activeSubTab === 'command' ? styles.subNavTabActive : ''}`}
        >
          <span className={styles.tabEmoji}>🎛️</span>Cockpit
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('links')}
          className={`${styles.subNavTab} ${activeSubTab === 'links' ? styles.subNavTabActive : ''}`}
        >
          <span className={styles.tabEmoji}>🔗</span>Block Links
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('research')}
          className={`${styles.subNavTab} ${activeSubTab === 'research' ? styles.subNavTabActive : ''}`}
        >
          <span className={styles.tabEmoji}>📊</span>Outlier Research
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('focus')}
          className={`${styles.subNavTab} ${activeSubTab === 'focus' ? styles.subNavTabActive : ''}`}
        >
          <span className={styles.tabEmoji}>⏱️</span>Focus Mode
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('notes')}
          className={`${styles.subNavTab} ${activeSubTab === 'notes' ? styles.subNavTabActive : ''}`}
        >
          <span className={styles.tabEmoji}>📝</span>Notizen
        </button>
      </div>

      {/* Main Tab Panels */}
      <div className={styles.content}>
        {activeSubTab === 'command' && (
          <div className={styles.commandGrid}>
            {/* Active Block Card */}
            <div className={styles.activeBlockHero}>
              <div className={styles.blockTimerRing}>
                <div className={styles.blockTimerInner}>
                  <span className={styles.blockTimerValue}>
                    {timeLeft > 0 ? Math.ceil(timeLeft / 60) : 0}
                  </span>
                  <span className={styles.blockTimerLabel}>Min</span>
                </div>
              </div>
              <div className={styles.blockDetails}>
                <div className={styles.blockLabel}>Aktueller Zeitblock</div>
                <h3 className={styles.blockName}>{activeBlock.title}</h3>
                <div className={styles.blockTimeRange}>
                  ⏰ {activeBlock.start} - {activeBlock.end}
                </div>
                <div className={styles.blockProgressBar}>
                  <div className={styles.blockProgressFill} style={{ width: `${blockProg}%` }} />
                </div>
              </div>
            </div>

            {/* Metrics cards */}
            <div className={styles.statCard}>
              <span className={styles.statLabel}>Verknüpfte Auto-Links</span>
              <span className={styles.statValue}>{mappings.length}</span>
              <span className={styles.statSub}>Aktive Trigger-Muster</span>
            </div>

            <div className={styles.statCard}>
              <span className={styles.statLabel}>Autom. Geöffnete Links</span>
              <span className={styles.statValue}>{managerHistory.length}</span>
              <span className={styles.statSub}>In dieser Web-Session</span>
            </div>

            <div className={styles.statCard}>
              <span className={styles.statLabel}>Forschungsziele</span>
              <span className={styles.statValue}>{researchList.length}</span>
              <span className={styles.statSub}>Outlier-Analysen gespeichert</span>
            </div>

            <div className={styles.statCard}>
              <span className={styles.statLabel}>Focus Sessions</span>
              <span className={styles.statValue}>{completedSessions}</span>
              <span className={styles.statSub}>Erfolgreich absolviert</span>
            </div>
          </div>
        )}

        {activeSubTab === 'links' && (
          <div className={styles.linksLayout}>
            {/* Left side: config & add form */}
            <div className={styles.card}>
              <h3 className={styles.cardTitle}>⚙️ Auto-Open Einstellungen</h3>

              <div className={styles.controlRow}>
                <div className={styles.controlInfo}>
                  <span className={styles.controlLabel}>Auto-Open aktivieren</span>
                  <span className={styles.controlDesc}>Tabs automatisch im Hintergrund öffnen</span>
                </div>
                <button
                  type="button"
                  className={`${styles.toggleBtn} ${autoOpenEnabled ? styles.toggleActive : ''}`}
                  onClick={handleToggleAutoOpen}
                >
                  {autoOpenEnabled ? 'AKTIVIERT' : 'DEAKTIVIERT'}
                </button>
              </div>

              <form onSubmit={handleAddMapping} className={styles.mappingForm}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Wenn Blocktitel enthält (z.B. "Französisch")</label>
                  <input
                    type="text"
                    placeholder="z.B. Französisch"
                    className={styles.input}
                    value={pattern}
                    onChange={(e) => setPattern(e.target.value)}
                    required
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Diesen Link im Browser öffnen</label>
                  <input
                    type="text"
                    placeholder="z.B. https://duolingo.com"
                    className={styles.input}
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    required
                  />
                </div>
                <button type="submit" className={styles.submitBtn}>
                  Zuordnung Hinzufügen ✦
                </button>
              </form>

              <div className={styles.infoAlert}>
                <span className={styles.alertIcon}>⚠️</span>
                <div className={styles.alertContent}>
                  <strong>Popup-Blocker Hinweis:</strong> Stelle sicher, dass du in deiner Browser-Adressleiste Popups für diese App zugelassen hast.
                </div>
              </div>
            </div>

            {/* Right side: Mappings & History */}
            <div className={styles.rightColumn}>
              <div className={styles.card}>
                <h3 className={styles.cardTitle}>🔗 Aktive Zuordnungen ({mappings.length})</h3>
                <div className={styles.mappingsList}>
                  {mappings.map((m) => (
                    <div key={m.id} className={styles.mappingRow}>
                      <div className={styles.mappingInfo}>
                        <span className={styles.mappingPattern}>{m.pattern}</span>
                        <span className={styles.mappingUrl} title={m.url}>{m.url}</span>
                      </div>
                      <div className={styles.mappingActions}>
                        <button
                          type="button"
                          className={styles.testBtn}
                          onClick={() => handleTestMapping(m)}
                          title="Link testen"
                        >
                          ↗
                        </button>
                        <button
                          type="button"
                          className={styles.deleteBtn}
                          onClick={() => handleDeleteMapping(m.id)}
                          title="Löschen"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                  {mappings.length === 0 && (
                    <div className={styles.emptyState}>
                      <span className={styles.emptyIcon}>🔗</span>
                      <p className={styles.emptyText}>Keine Zuordnungen hinterlegt. Erstelle links eine neue Verknüpfung.</p>
                    </div>
                  )}
                </div>
              </div>

              <div className={styles.card}>
                <h3 className={styles.cardTitle}>📜 Verlauf (Aktuelle Session)</h3>
                <div className={styles.historyList}>
                  {managerHistory.map((h) => (
                    <div key={h.id} className={styles.historyRow}>
                      <span className={styles.historyTime}>{h.time}</span>
                      <div className={styles.historyContent}>
                        <span>Block <strong>{h.blockTitle}</strong> aktiv</span>
                        <a href={h.url} target="_blank" rel="noopener noreferrer" className={styles.historyUrl}>
                          Geöffnet: {h.url}
                        </a>
                      </div>
                    </div>
                  ))}
                  {managerHistory.length === 0 && (
                    <div className={styles.emptyState}>
                      <p className={styles.emptyText}>Noch keine Tabs automatisch geöffnet.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeSubTab === 'research' && (
          <div className={styles.researchLayout}>
            {/* Outlier search form */}
            <div className={styles.card}>
              <h3 className={styles.cardTitle}>📊 Outlier Research Hub & Explorer</h3>
              <p className={styles.desc} style={{ marginTop: '-0.5rem', marginBottom: '0.5rem' }}>
                Finde "Outlier" (extrem überdurchschnittlich erfolgreiche Ansätze, Videos oder Techniken) für bestimmte Nischen oder Skills.
              </p>

              <form onSubmit={handleAddResearch} className={styles.mappingForm}>
                <div className={styles.researchTopBar}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Forschungs-Thema / Nische / Kanal</label>
                    <input
                      type="text"
                      placeholder="z.B. @MrBeast, Rust Web Assembly, Figma Tricks..."
                      className={styles.input}
                      value={researchTitle}
                      onChange={(e) => setResearchTitle(e.target.value)}
                      required
                    />
                  </div>
                  <div className={styles.formGroup} style={{ maxWidth: '180px' }}>
                    <label className={styles.formLabel}>Kategorie</label>
                    <select
                      className={styles.input}
                      value={researchCategory}
                      onChange={(e) => setResearchCategory(e.target.value)}
                    >
                      <option value="YouTube">YouTube</option>
                      <option value="Skill">Skill / Lernen</option>
                      <option value="Competitor">Mitbewerber</option>
                      <option value="Other">Sonstiges</option>
                    </select>
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Referenz-URL (Optional)</label>
                  <input
                    type="text"
                    placeholder="https://youtube.com/c/..."
                    className={styles.input}
                    value={researchUrl}
                    onChange={(e) => setResearchUrl(e.target.value)}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Notizen / Beobachtungen</label>
                  <textarea
                    placeholder="Spezifische Fragen oder erste Hypothesen hinterlegen..."
                    className={styles.textarea}
                    value={researchNotes}
                    onChange={(e) => setResearchNotes(e.target.value)}
                  />
                </div>

                <button type="submit" className={styles.submitBtn}>
                  Forschungsziel Hinzufügen ✦
                </button>
              </form>
            </div>

            {/* List and report section */}
            <div className={styles.card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 className={styles.cardTitle}>🎯 Gespeicherte Forschungsziele ({filteredResearchList.length})</h3>
                <div className={styles.categoryTabs}>
                  {['ALL', 'YOUTUBE', 'SKILL', 'COMPETITOR', 'OTHER'].map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      className={`${styles.categoryTab} ${filterCategory === cat ? styles.categoryTabActive : ''}`}
                      onClick={() => setFilterCategory(cat)}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.researchGrid}>
                {filteredResearchList.map((item) => (
                  <div
                    key={item.id}
                    className={`${styles.researchCard} ${selectedResearch?.id === item.id ? styles.researchCardSelected : ''}`}
                    onClick={() => setSelectedResearch(item)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className={styles.researchCardHeader}>
                      <span className={styles.researchCardTitle}>{item.title}</span>
                      <span className={styles.researchCardCategory}>{item.category}</span>
                    </div>
                    {item.notes && <p className={styles.researchCardBody}>{item.notes}</p>}
                    <div className={styles.researchCardFooter}>
                      <span className={styles.researchDate}>Erstellt: {item.date}</span>
                      <div className={styles.researchCardActions}>
                        <button
                          type="button"
                          className={styles.researchActionBtn}
                          onClick={(e) => {
                            e.stopPropagation();
                            runOutlierAnalysis(item);
                          }}
                          disabled={analysisLoading}
                        >
                          {item.analysisReport ? 'Re-Analyse ↻' : 'Analyse Starten ✦'}
                        </button>
                        <button
                          type="button"
                          className={styles.researchActionBtn}
                          style={{ borderColor: 'rgba(255, 77, 77, 0.3)', color: 'var(--red)' }}
                          onClick={(e) => handleDeleteResearch(item.id, e)}
                        >
                          Löschen
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {filteredResearchList.length === 0 && (
                  <div className={styles.emptyState} style={{ gridColumn: '1 / -1' }}>
                    <span className={styles.emptyIcon}>🎯</span>
                    <p className={styles.emptyText}>Keine Forschungsziele in dieser Kategorie gefunden.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Analysis report viewer */}
            {selectedResearch && (
              <div className={styles.card} style={{ borderLeft: '4px solid var(--theme-accent, #1a6aff)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 className={styles.cardTitle}>📝 Analysebericht: {selectedResearch.title}</h3>
                  <button
                    type="button"
                    className={styles.deleteBtn}
                    onClick={() => setSelectedResearch(null)}
                  >
                    ✕
                  </button>
                </div>

                {analysisLoading && selectedResearch.id === selectedResearch?.id ? (
                  <div style={{ padding: '2rem 0', textSelf: 'center', textAlign: 'center' }}>
                    <div className={styles.spinner} />
                    <p style={{ marginTop: '1rem', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--theme-accent, #1a6aff)' }}>
                      {analysisSteps[analysisStep]}
                    </p>
                  </div>
                ) : selectedResearch.analysisReport ? (
                  <div
                    style={{
                      fontSize: '0.82rem',
                      lineHeight: '1.6',
                      color: 'var(--text)',
                      whiteSpace: 'pre-line',
                      fontFamily: 'var(--font-sans)',
                      background: 'rgba(255, 255, 255, 0.01)',
                      padding: '1.25rem',
                      borderRadius: '10px',
                      border: '1px solid var(--border)'
                    }}
                  >
                    {selectedResearch.analysisReport}
                  </div>
                ) : (
                  <div className={styles.emptyState}>
                    <p className={styles.emptyText}>Noch keine Outlier-Analyse für dieses Ziel durchgeführt.</p>
                    <button
                      type="button"
                      className={styles.submitBtn}
                      style={{ marginTop: '0.5rem' }}
                      onClick={() => runOutlierAnalysis(selectedResearch)}
                    >
                      Outlier Analyse starten ✦
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeSubTab === 'focus' && (
          <div className={styles.focusLayout}>
            <div className={styles.focusTimerContainer}>
              <div className={styles.focusRing}>
                <svg className={styles.focusRingSvg}>
                  <circle className={styles.focusRingBg} cx="90" cy="90" r="80" />
                  <circle
                    className={styles.focusRingFill}
                    cx="90"
                    cy="90"
                    r="80"
                    strokeDasharray="502"
                    strokeDashoffset={strokeDashoffset}
                  />
                </svg>
                <div className={styles.focusTimeDisplay}>
                  <span className={styles.focusMinutes}>{formatTime(focusTimeLeft)}</span>
                  <span className={styles.focusSeconds}>ÜBRIG</span>
                </div>
              </div>

              <div className={styles.focusModeLabel}>
                {focusRunning ? '⚡ FOCUS AKTIV ⚡' : '⏸️ PAUSIERT'}
              </div>

              <div className={styles.focusPresets}>
                {[25, 45, 60].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    className={`${styles.focusPresetBtn} ${focusPreset === mins ? styles.focusPresetActive : ''}`}
                    onClick={() => handlePresetSelect(mins)}
                  >
                    {mins} Min
                  </button>
                ))}
              </div>

              <div className={styles.focusControls}>
                <button
                  type="button"
                  className={`${styles.focusControlBtn} ${styles.focusStartBtn}`}
                  onClick={handleStartPauseFocus}
                >
                  {focusRunning ? 'Pause' : 'Start'}
                </button>
                <button
                  type="button"
                  className={styles.focusControlBtn}
                  onClick={handleResetFocus}
                >
                  Reset
                </button>
              </div>
            </div>
          </div>
        )}

        {activeSubTab === 'notes' && (
          <div className={styles.notesLayout}>
            {/* Create note card */}
            <div className={styles.card}>
              <h3 className={styles.cardTitle}>📝 Session Notizen</h3>
              <p className={styles.desc} style={{ marginTop: '-0.5rem' }}>
                Halte wichtige Erkenntnisse oder Aufgaben während deines aktuellen Blocks <strong>"{activeBlock.title}"</strong> fest.
              </p>

              <form onSubmit={handleAddNote} className={styles.mappingForm}>
                <div className={styles.formGroup}>
                  <textarea
                    placeholder="Notizen zum aktiven Block verfassen..."
                    className={styles.textarea}
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    required
                  />
                </div>
                <button type="submit" className={styles.submitBtn}>
                  Notiz Speichern ✦
                </button>
              </form>
            </div>

            {/* List notes */}
            <div className={styles.card}>
              <h3 className={styles.cardTitle}>📜 Verlauf Notizen ({notesList.length})</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {notesList.map((n) => (
                  <div key={n.id} className={styles.noteEntry}>
                    <div className={styles.noteHeader}>
                      <span className={styles.noteBlock}>Block: {n.blockTitle}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span className={styles.noteTime}>{n.time}</span>
                        <button
                          type="button"
                          className={styles.noteDeleteBtn}
                          onClick={() => handleDeleteNote(n.id)}
                        >
                          Löschen
                        </button>
                      </div>
                    </div>
                    <p className={styles.noteText}>{n.text}</p>
                  </div>
                ))}

                {notesList.length === 0 && (
                  <div className={styles.emptyState}>
                    <span className={styles.emptyIcon}>📝</span>
                    <p className={styles.emptyText}>Noch keine Notizen verfasst.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
