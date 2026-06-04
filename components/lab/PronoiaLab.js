// components/lab/PronoiaLab.js
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { compounds, searchCompounds, getCompoundByCid, getInteraction, CATEGORIES } from '@/lib/compoundData';
import { useProtocol } from '@/hooks/useProtocol';
import { useChat } from '@/hooks/useChat';
import styles from './PronoiaLab.module.css';

export default function PronoiaLab({ setActiveTab }) {
  const { saveProfile, stack } = useProtocol();
  const { conversations, sendMessage } = useChat();

  const [labTab, setLabTab] = useState('library'); // 'library' | 'stack' | 'quiz'
  const [searchVal, setSearchVal] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedCompound, setSelectedCompound] = useState(null);
  
  // Share state
  const [showShareDropdown, setShowShareDropdown] = useState(false);

  // Stack builder state
  const [currentStack, setCurrentStack] = useState([]);

  // Quiz state
  const [quizStep, setQuizStep] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [generatedQuizStack, setGeneratedQuizStack] = useState(null);

  // Canvas ref for pharmacokinetic chart
  const canvasRef = useRef(null);

  // Filtered compounds
  const filteredCompounds = compounds.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(searchVal.toLowerCase()) ||
                        c.description.toLowerCase().includes(searchVal.toLowerCase()) ||
                        c.benefits.some(b => b.toLowerCase().includes(searchVal.toLowerCase()));
    const matchCat = selectedCategory === 'all' || c.category === selectedCategory;
    return matchSearch && matchCat;
  });

  // Render pharmacokinetic curve on canvas
  useEffect(() => {
    if (selectedCompound && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.strokeStyle = 'rgba(255,255,255,0.04)';
      ctx.lineWidth = 1;
      for (let i = 0; i <= 10; i++) {
        const x = (canvas.width / 10) * i;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();

        const y = (canvas.height / 5) * i;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      ctx.strokeStyle = 'var(--theme-accent, #1A6AFF)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, canvas.height - 20);

      const peakX = canvas.width * 0.25;
      const peakY = 30;
      const endX = canvas.width;
      const endY = canvas.height - 20;

      ctx.bezierCurveTo(
        canvas.width * 0.1, canvas.height * 0.2,
        canvas.width * 0.15, peakY,
        peakX, peakY
      );

      ctx.bezierCurveTo(
        canvas.width * 0.5, peakY,
        canvas.width * 0.75, canvas.height * 0.7,
        endX, endY
      );

      ctx.stroke();

      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, 'rgba(26, 106, 255, 0.18)');
      gradient.addColorStop(1, 'rgba(26, 106, 255, 0)');
      ctx.fillStyle = gradient;
      ctx.lineTo(canvas.width, canvas.height);
      ctx.lineTo(0, canvas.height);
      ctx.fill();

      ctx.fillStyle = 'var(--text3)';
      ctx.font = '9px monospace';
      ctx.fillText('Absorption', 10, 20);
      ctx.fillText(`Peak (${selectedCompound.onsetTime || '1h'})`, peakX - 25, peakY - 8);
      ctx.fillText(`Halbwertszeit (${selectedCompound.halfLife || '5h'})`, canvas.width * 0.6, canvas.height * 0.5);
    }
  }, [selectedCompound]);

  // Stack Safety Analysis
  const safetyResults = useMemo(() => {
    if (currentStack.length < 2) return [];

    const results = [];
    for (let i = 0; i < currentStack.length; i++) {
      for (let j = i + 1; j < currentStack.length; j++) {
        const itemA = currentStack[i];
        const itemB = currentStack[j];
        const inter = getInteraction(itemA.cid, itemB.cid);
        if (inter) {
          results.push(inter);
        }
      }
    }
    return results;
  }, [currentStack]);

  const handleAddToStack = (compound) => {
    if (currentStack.some(c => c.cid === compound.cid)) return;
    setCurrentStack(prev => [...prev, compound]);
    alert(`${compound.name} zum Stack-Builder hinzugefügt.`);
  };

  const handleRemoveFromStack = (cid) => {
    setCurrentStack(prev => prev.filter(c => c.cid !== cid));
  };

  // Sync builder stack to Life OS active Bio-Stack
  const handleSyncToBioStack = () => {
    if (currentStack.length === 0) return;

    const newStackItems = currentStack.map(c => ({
      name: c.name,
      dose: c.dosage?.split('\n')?.[0]?.replace('Standard: ', '') || '300mg',
      timing: 'morning',
      supply: 100
    }));

    saveProfile({ stack: [...(stack || []), ...newStackItems].slice(0, 8) });
    alert("Ausgewählte Verbindungen erfolgreich in den aktiven Life OS Bio-Stack übertragen!");
  };

  // Share compound to selected E2E chat
  const handleShareCompoundToChat = async (chatId) => {
    if (!selectedCompound) return;
    const payload = {
      name: selectedCompound.name,
      desc: selectedCompound.description,
      cid: selectedCompound.cid
    };
    const success = await sendMessage(chatId, JSON.stringify(payload), 'compound-share');
    if (success) {
      alert(`Wirkstoff ${selectedCompound.name} wurde erfolgreich im Chat geteilt!`);
      setShowShareDropdown(false);
    }
  };

  // Quiz questions
  const quizQuestions = [
    { key: 'goal', q: 'Was ist dein primäres Ziel?', options: ['Fokus & Konzentration', 'Gedächtnis & Lernen', 'Stressabbau & Ruhe', 'Energie & Vitalität'] },
    { key: 'exp', q: 'Wie viel Erfahrung hast du mit Nootropika?', options: ['Einsteiger (Keine)', 'Fortgeschritten (Einige Stacks)', 'Pro-Level (Erfahren)'] },
    { key: 'lifestyle', q: 'Wie stufst du deinen täglichen Stress ein?', options: ['Niedrig', 'Moderat', 'Sehr hoch'] },
    { key: 'caffeine', q: 'Wie stufst du deine Koffein-Toleranz ein?', options: ['Niedrig (Sensibel)', 'Moderat (1-2 Tassen)', 'Hoch (Viele Energydrinks/Kaffee)'] },
  ];

  const handleQuizAnswer = (key, val) => {
    setQuizAnswers(prev => ({ ...prev, [key]: val }));
    if (quizStep < quizQuestions.length - 1) {
      setQuizStep(p => p + 1);
    } else {
      const goal = quizAnswers.goal || val;
      let recStack = [];
      if (goal === 'Fokus & Konzentration') {
        recStack = [getCompoundByCid(2519), getCompoundByCid(228398), getCompoundByCid(71920)];
      } else if (goal === 'Stressabbau & Ruhe') {
        recStack = [getCompoundByCid(228398), getCompoundByCid(119032)];
      } else {
        recStack = [getCompoundByCid(4843), getCompoundByCid(71920)];
      }
      setGeneratedQuizStack(recStack.filter(Boolean));
      setQuizStep(p => p + 1);
    }
  };

  return (
    <div className={styles.labShell}>
      {/* Sidebar - Tab bar */}
      <div className={styles.labSidebar}>
        <div className={styles.tabBar}>
          <button className={`${styles.tabBtn} ${labTab === 'library' ? styles.tabBtnActive : ''}`} onClick={() => setLabTab('library')}>Library</button>
          <button className={`${styles.tabBtn} ${labTab === 'stack' ? styles.tabBtnActive : ''}`} onClick={() => setLabTab('stack')}>Stack Builder</button>
          <button className={`${styles.tabBtn} ${labTab === 'quiz' ? styles.tabBtnActive : ''}`} onClick={() => setLabTab('quiz')}>Quiz</button>
        </div>

        <div className={styles.sidebarContent}>
          {labTab === 'library' && (
            <div className={styles.filterPane}>
              <input
                type="text"
                className={styles.searchInput}
                placeholder="Compounds suchen..."
                value={searchVal}
                onChange={e => setSearchVal(e.target.value)}
              />
              <div className={styles.categoryList}>
                <button className={`${styles.catBtn} ${selectedCategory === 'all' ? styles.catBtnActive : ''}`} onClick={() => setSelectedCategory('all')}>Alle</button>
                {Object.keys(CATEGORIES).map(cat => (
                  <button
                    key={cat}
                    className={`${styles.catBtn} ${selectedCategory === cat ? styles.catBtnActive : ''}`}
                    onClick={() => setSelectedCategory(cat)}
                  >
                    {CATEGORIES[cat]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {labTab === 'stack' && (
            <div className={styles.stackPanel}>
              <div className={styles.stackHeader}>
                <h4>Pending Stack</h4>
                <button className="btn btn-ghost" style={{ fontSize: '0.62rem', padding: '0.2rem 0.5rem' }} onClick={() => setCurrentStack([])}>Clear</button>
              </div>
              <div className={styles.stackBuilderList}>
                {currentStack.map(c => (
                  <div key={c.cid} className={styles.stackBuilderItem}>
                    <span>{c.name}</span>
                    <button className={styles.removeItemBtn} onClick={() => handleRemoveFromStack(c.cid)}>✕</button>
                  </div>
                ))}
                {currentStack.length === 0 && <p className={styles.emptyState}>Bilde einen Stack aus der Library.</p>}
              </div>

              {currentStack.length > 0 && (
                <button className="btn btn-primary" style={{ width: '100%', marginTop: '1rem', fontSize: '0.72rem' }} onClick={handleSyncToBioStack}>
                  → In Bio-Stack einspeisen
                </button>
              )}
            </div>
          )}

          {labTab === 'quiz' && (
            <div className={styles.quizPanel}>
              <h4>Personalized Formulation</h4>
              <p style={{ fontSize: '0.72rem', color: 'var(--text3)', lineHeight: 1.4 }}>Beantworte 4 kurze Fragen, um deinen optimalen Nootropika-Einstieg zu finden.</p>
              {quizStep > 0 && (
                <button className="btn btn-ghost" style={{ fontSize: '0.65rem', marginTop: '0.5rem' }} onClick={() => { setQuizStep(0); setGeneratedQuizStack(null); }}>
                  Neustarten
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main content view */}
      <div className={styles.labMainContent}>
        {labTab === 'library' && (
          selectedCompound ? (
            <div className={styles.detailView}>
              <button className={styles.backBtn} onClick={() => { setSelectedCompound(null); setShowShareDropdown(false); }}>← Zurück zur Übersicht</button>
              
              <div className={styles.detailHeader}>
                <div className={styles.detailHeaderLeft}>
                  <h2>{selectedCompound.name}</h2>
                  <span className={styles.categoryBadge}>{selectedCompound.category}</span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', position: 'relative' }}>
                  <button className="btn btn-ghost" style={{ fontSize: '0.75rem' }} onClick={() => setShowShareDropdown(!showShareDropdown)}>
                    📤 Im Chat teilen
                  </button>
                  {showShareDropdown && (
                    <div className={styles.shareDropdownMenu}>
                      <div className={styles.shareDropdownHeader}>Chat wählen:</div>
                      {conversations.map(chat => (
                        <button
                          key={chat.id}
                          className={styles.shareDropdownItem}
                          onClick={() => handleShareCompoundToChat(chat.id)}
                        >
                          {chat.title}
                        </button>
                      ))}
                      {conversations.length === 0 && (
                        <div className={styles.shareDropdownEmpty}>Keine aktiven Chats</div>
                      )}
                    </div>
                  )}
                  <button className="btn btn-primary" style={{ fontSize: '0.75rem' }} onClick={() => handleAddToStack(selectedCompound)}>
                    ⊕ Stack hinzufügen
                  </button>
                </div>
              </div>

              <div className={styles.detailGrid}>
                <div className={styles.detailColLeft}>
                  <div className={styles.pharmacokineticsCard}>
                    <span className={styles.sectionLabel}>ELIMINATIONS-KINETIK (PHARMACOKINETICS)</span>
                    <canvas ref={canvasRef} width="350" height="150" className={styles.chronoChartCanvas} />
                  </div>

                  <div className={styles.infoGroup}>
                    <strong>Wirkungsweise (Mechanism of Action)</strong>
                    <p>{selectedCompound.mechanisms}</p>
                  </div>

                  <div className={styles.infoGroup}>
                    <strong>Typische Dosierung (Dosage)</strong>
                    <p style={{ whiteSpace: 'pre-line' }}>{selectedCompound.dosage}</p>
                  </div>
                </div>

                <div className={styles.detailColRight}>
                  <div className={styles.benefitsCard}>
                    <strong>Vorteile (Benefits)</strong>
                    <ul>
                      {selectedCompound.benefits.map((b, i) => <li key={i}>{b}</li>)}
                    </ul>
                  </div>

                  <div className={styles.warningsCard}>
                    <strong>Sicherheit & Warnungen</strong>
                    <div className={styles.warningsList}>
                      {selectedCompound.warnings?.map((w, i) => (
                        <div key={i} className={styles.warningItem}>{w}</div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className={styles.libraryGrid}>
              {filteredCompounds.map(c => (
                <div key={c.cid} className={styles.compoundCard} onClick={() => setSelectedCompound(c)}>
                  <div className={styles.compoundHeader}>
                    <div className={styles.compoundName}>{c.name}</div>
                    <span className={styles.compoundCat}>{c.category}</span>
                  </div>
                  <p className={styles.compoundDesc}>{c.description}</p>
                  <div className={styles.compoundBenefits}>
                    {c.benefits.slice(0, 3).map((b, i) => (
                      <span key={i} className={styles.benefitTag}>{b}</span>
                    ))}
                  </div>
                </div>
              ))}
              {filteredCompounds.length === 0 && (
                <p className={styles.emptyState}>Keine Compounds gefunden.</p>
              )}
            </div>
          )
        )}

        {labTab === 'stack' && (
          <div className={styles.stackBuilderView}>
            <h2>Stack Safety Analyzer</h2>
            <p>Füge Verbindungen in der linken Seitenleiste hinzu, um mögliche Wechselwirkungen in Echtzeit zu analysieren.</p>

            <div className={styles.safetyResultsRow} style={{ marginTop: '2rem' }}>
              <h3>Sicherheits- & Synergie-Bericht</h3>
              <div className={styles.safetyResultsList}>
                {safetyResults.map((res, idx) => (
                  <div key={idx} className={`${styles.safetyCard} ${styles[`safety_${res.safety}`]}`}>
                    <div className={styles.safetyCardHeader}>
                      <strong>{res.title}</strong>
                      <span className={styles.safetyBadge}>{res.safety.toUpperCase()}</span>
                    </div>
                    <p className={styles.safetyCardMsg}>{res.message}</p>
                  </div>
                ))}
                {safetyResults.length === 0 && currentStack.length >= 2 && (
                  <div className={`${styles.safetyCard} ${styles.safety_safe}`}>
                    <strong>Sicherheits-Index Nominal</strong>
                    <p>Keine bedenklichen Interaktionen für diese Kombination gefunden. Stacks sind im Allgemeinen gut verträglich.</p>
                  </div>
                )}
                {currentStack.length < 2 && (
                  <p className={styles.emptyState}>Füge mindestens 2 Verbindungen hinzu, um den Interaktions-Check zu starten.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {labTab === 'quiz' && (
          <div className={styles.quizView}>
            <h2>Personalized Assessment Form</h2>
            
            {generatedQuizStack ? (
              <div className={styles.quizResult}>
                <h3>Dein empfohlener Nootropika-Stack</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text2)', marginBottom: '1.5rem' }}>Basierend auf deinen Antworten empfehlen wir folgenden Einstieg:</p>
                <div className={styles.quizResultGrid}>
                  {generatedQuizStack.map(c => (
                    <div key={c.cid} className={styles.compoundCard} onClick={() => { setLabTab('library'); setSelectedCompound(c); }}>
                      <div className={styles.compoundHeader}>
                        <strong>{c.name}</strong>
                        <span>{c.category}</span>
                      </div>
                      <p>{c.description}</p>
                    </div>
                  ))}
                </div>
                <button className="btn btn-primary" style={{ marginTop: '2rem' }} onClick={() => { setCurrentStack(generatedQuizStack); setLabTab('stack'); }}>
                  In den Stack-Builder übernehmen
                </button>
              </div>
            ) : (
              <div className={styles.quizFlowCard}>
                <div className={styles.quizProgressRow}>
                  <span>Frage {quizStep + 1} von {quizQuestions.length}</span>
                  <div className={styles.quizProgressBar}>
                    <div className={styles.quizProgressFill} style={{ width: `${((quizStep + 1) / quizQuestions.length) * 100}%` }} />
                  </div>
                </div>

                <h3 className={styles.quizQuestionTitle}>{quizQuestions[quizStep].q}</h3>
                <div className={styles.quizOptionsGrid}>
                  {quizQuestions[quizStep].options.map(opt => (
                    <button
                      key={opt}
                      className={styles.quizOptionBtn}
                      onClick={() => handleQuizAnswer(quizQuestions[quizStep].key, opt)}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
