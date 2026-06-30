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
  
  // Intro splash animation states
  const [showIntro, setShowIntro] = useState(true);
  const [introFadeOut, setIntroFadeOut] = useState(false);

  useEffect(() => {
    // Start splitting panels at 1200ms
    const openTimer = setTimeout(() => {
      setIntroFadeOut(true);
    }, 1200);

    // Unmount overlay at 2200ms
    const closeTimer = setTimeout(() => {
      setShowIntro(false);
    }, 2200);

    return () => {
      clearTimeout(openTimer);
      clearTimeout(closeTimer);
    };
  }, []);
  
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

      ctx.strokeStyle = '#8B5CF6';
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
      gradient.addColorStop(0, 'rgba(139, 92, 246, 0.18)');
      gradient.addColorStop(1, 'rgba(139, 92, 246, 0)');
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
      {/* Intro Startup Splash Animation */}
      {showIntro && (
        <div className={`${styles.introOverlay} ${introFadeOut ? styles.introOpen : ''}`}>
          <div className={styles.introTop} />
          <div className={styles.introBottom} />
          <div className={styles.introWordmark}>
            <div className={styles.introPip} />PRONOIA LABS
          </div>
        </div>
      )}

      {/* Floating exit */}
      <button className={styles.labExit} onClick={() => setActiveTab('apps')}>
        <span>←</span> EXIT LAB
      </button>

      {/* Single editorial canvas */}
      <main className={styles.labCanvas}>
        <div className={styles.glowBg} aria-hidden="true" />

        {/* Hero */}
        <section className={styles.labHero}>
          <div className={styles.monoEyebrow}>Pronoia Lab · Compound Research</div>
          <h1 className={styles.labHeroTitle}>Das Labor deiner<br />Selbstoptimierung.</h1>
          <p className={styles.labHeroSub}>Ein kuratierter Raum für molekulare Präzision und bio-chemische Harmonie.</p>
        </section>

        {/* Segmented toggle */}
        <nav className={styles.segToggle}>
          <button className={`${styles.segBtn} ${labTab === 'library' ? styles.segBtnActive : ''}`} onClick={() => setLabTab('library')}>Bibliothek</button>
          <button className={`${styles.segBtn} ${labTab === 'stack' ? styles.segBtnActive : ''}`} onClick={() => setLabTab('stack')}>Stack</button>
          <button className={`${styles.segBtn} ${labTab === 'quiz' ? styles.segBtnActive : ''}`} onClick={() => setLabTab('quiz')}>Quiz</button>
        </nav>

        {labTab === 'library' && (
          <div className={styles.libLayout}>
            <div className={styles.libMain}>
              <div className={styles.libControls}>
                <div className={styles.searchWrap}>
                  <span className={styles.searchIcon} aria-hidden="true">⌕</span>
                  <input
                    type="text"
                    className={styles.searchField}
                    placeholder="Wirkstoff suchen…"
                    value={searchVal}
                    onChange={e => setSearchVal(e.target.value)}
                  />
                </div>
                <div className={styles.catChips}>
                  <button className={`${styles.catChip} ${selectedCategory === 'all' ? styles.catChipActive : ''}`} onClick={() => setSelectedCategory('all')}>Alle</button>
                  {Object.keys(CATEGORIES).map(cat => (
                    <button
                      key={cat}
                      className={`${styles.catChip} ${selectedCategory === cat ? styles.catChipActive : ''}`}
                      onClick={() => setSelectedCategory(cat)}
                    >
                      {CATEGORIES[cat]}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.compoundGrid}>
                {filteredCompounds.map(c => (
                  <div
                    key={c.cid}
                    className={`${styles.cCard} ${selectedCompound?.cid === c.cid ? styles.cCardActive : ''}`}
                    onClick={() => setSelectedCompound(c)}
                  >
                    <div className={styles.cCardTop}>
                      <span className={styles.cidBadge}>CID-{c.cid}</span>
                      <span className={styles.cCardAdd}>+</span>
                    </div>
                    <h3 className={styles.cCardName}>{c.name}</h3>
                    <p className={styles.cCardDesc}>{c.description}</p>
                  </div>
                ))}
                {filteredCompounds.length === 0 && (
                  <p className={styles.emptyState}>Keine Compounds gefunden.</p>
                )}
              </div>
            </div>

            {selectedCompound && (
              <aside className={styles.detailPanel}>
                <div className={styles.detailPanelGlow} aria-hidden="true" />
                <div className={styles.detailScroll}>
                  <div className={styles.detailTop}>
                    <span className={styles.detailCat}>{selectedCompound.category}</span>
                    <button className={styles.detailClose} onClick={() => { setSelectedCompound(null); setShowShareDropdown(false); }} aria-label="Schließen">✕</button>
                  </div>
                  <h2 className={styles.detailName}>{selectedCompound.name}</h2>
                  <div className={styles.detailMeta}>
                    <span><i className={styles.metaDot} /> CID: {selectedCompound.cid}</span>
                  </div>

                  <div className={styles.detailSection}>
                    <div className={styles.detailSectionLabel}>
                      <span>Pharmakokinetik</span>
                      <span>[C] / t</span>
                    </div>
                    <div className={styles.chartFrame}>
                      <canvas ref={canvasRef} width="350" height="150" className={styles.chartCanvas} />
                    </div>
                  </div>

                  <div className={styles.detailBlock}>
                    <h4 className={styles.detailBlockLabel}>Wirkungsweise</h4>
                    <p className={styles.detailBlockText}>{selectedCompound.mechanisms}</p>
                  </div>
                  <div className={styles.detailBlock}>
                    <h4 className={styles.detailBlockLabel}>Dosierung</h4>
                    <p className={styles.detailBlockText} style={{ whiteSpace: 'pre-line' }}>{selectedCompound.dosage}</p>
                  </div>
                  <div className={styles.detailBlock}>
                    <h4 className={styles.detailBlockLabel}>Vorteile</h4>
                    <ul className={styles.detailList}>
                      {selectedCompound.benefits.map((b, i) => <li key={i}>{b}</li>)}
                    </ul>
                  </div>
                  {selectedCompound.warnings?.length > 0 && (
                    <div className={styles.detailBlock}>
                      <h4 className={styles.detailBlockLabel}>Sicherheit &amp; Warnungen</h4>
                      <div className={styles.warnList}>
                        {selectedCompound.warnings.map((w, i) => (
                          <div key={i} className={styles.warnItem}>{w}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className={styles.detailFooter}>
                  <div className={styles.shareWrap}>
                    <button className={styles.shareBtn} onClick={() => setShowShareDropdown(!showShareDropdown)}>📤 Teilen</button>
                    {showShareDropdown && (
                      <div className={styles.shareDropdownMenu}>
                        <div className={styles.shareDropdownHeader}>Chat wählen:</div>
                        {conversations.map(chat => (
                          <button key={chat.id} className={styles.shareDropdownItem} onClick={() => handleShareCompoundToChat(chat.id)}>
                            {chat.title}
                          </button>
                        ))}
                        {conversations.length === 0 && (
                          <div className={styles.shareDropdownEmpty}>Keine aktiven Chats</div>
                        )}
                      </div>
                    )}
                  </div>
                  <button className={styles.ctaBtn} onClick={() => handleAddToStack(selectedCompound)}>Zum Stack hinzufügen →</button>
                </div>
              </aside>
            )}
          </div>
        )}

        {labTab === 'stack' && (
          <div className={styles.stackLayout}>
            <div className={styles.stackCol}>
              <div className={styles.stackColHead}>
                <h3 className={styles.stackColTitle}>Aktueller Stack</h3>
                {currentStack.length > 0 && (
                  <button className={styles.stackClear} onClick={() => setCurrentStack([])}>Leeren</button>
                )}
              </div>
              <div className={styles.stackList}>
                {currentStack.map(c => (
                  <div key={c.cid} className={styles.stackItem}>
                    <span>{c.name}</span>
                    <button className={styles.stackRemove} onClick={() => handleRemoveFromStack(c.cid)}>✕</button>
                  </div>
                ))}
                {currentStack.length === 0 && (
                  <p className={styles.emptyState}>Bilde einen Stack aus der Bibliothek.</p>
                )}
              </div>
              {currentStack.length > 0 && (
                <button className={styles.ctaBtn} style={{ width: '100%', marginTop: '1.25rem' }} onClick={handleSyncToBioStack}>
                  → In Bio-Stack einspeisen
                </button>
              )}
            </div>

            <div className={styles.stackCol}>
              <h3 className={styles.stackColTitle}>Sicherheit &amp; Synergie</h3>
              <div className={styles.safetyResultsList} style={{ marginTop: '1rem' }}>
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
                    <p>Keine bedenklichen Interaktionen für diese Kombination gefunden.</p>
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
            {generatedQuizStack ? (
              <div className={styles.quizResult}>
                <h3 className={styles.quizResultTitle}>Dein empfohlener Nootropika-Stack</h3>
                <p className={styles.quizResultSub}>Basierend auf deinen Antworten empfehlen wir folgenden Einstieg:</p>
                <div className={styles.compoundGrid}>
                  {generatedQuizStack.map(c => (
                    <div key={c.cid} className={styles.cCard} onClick={() => { setLabTab('library'); setSelectedCompound(c); }}>
                      <div className={styles.cCardTop}>
                        <span className={styles.cidBadge}>CID-{c.cid}</span>
                      </div>
                      <h3 className={styles.cCardName}>{c.name}</h3>
                      <p className={styles.cCardDesc}>{c.description}</p>
                    </div>
                  ))}
                </div>
                <div className={styles.quizResultActions}>
                  <button className={styles.ctaBtn} onClick={() => { setCurrentStack(generatedQuizStack); setLabTab('stack'); }}>
                    In den Stack-Builder übernehmen
                  </button>
                  <button className={styles.segBtn} onClick={() => { setQuizStep(0); setGeneratedQuizStack(null); }}>
                    Neustarten
                  </button>
                </div>
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
      </main>
    </div>
  );
}
