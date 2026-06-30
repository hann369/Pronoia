'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { TEXTBOOKS } from '@/lib/learnYourWayData';
import styles from './LearnYourWay.module.css';

// Rotating tips shown during AI textbook generation
const GENERATION_TIPS = [
  "💡 Spaced Repetition: Informationen kurz vor dem Vergessen zu wiederholen festigt sie dauerhaft im Langzeitgedächtnis.",
  "🧠 Active Recall: Das aktive Abrufen von Wissen ist 3x effektiver als passives Wiederholungslesen.",
  "⏱️ NSDR nach dem Lernen: 20 Minuten Non-Sleep Deep Rest nach einer Lerneinheit beschleunigt die Konsolidierung messbar.",
  "🎯 Deliberate Practice: Fokussiertes Üben an den schwächsten Punkten – nicht das Wiederholen von Stärken – erzeugt echten Fortschritt.",
  "💊 Koffein-Timing: Nimm Koffein erst 90-120 min nach dem Aufwachen, um den Nachmittags-Crash zu verhindern.",
  "🌊 Ultradian Rhythms: Das Gehirn hat natürliche 90-Minuten-Hochleistungszyklen. Plane deine Deep-Work-Blöcke danach.",
  "📚 Feynman-Methode: Erkläre das Gelernte jemandem in einfachen Worten – das deckt alle Wissenslücken sofort auf.",
  "🔗 Chunking: Das Zusammenfassen kleiner Informationseinheiten zu Chunks reduziert Cognitive Load erheblich.",
];

// Helper to adapt a standard Skill Lab module to the rich Learn Your Way textbook schema
function adaptModuleToLearnYourWay(mod, skill) {
  // Check if this module matches our handcrafted high-fidelity textbooks
  const bookId = mod.bookId || (
    skill.toLowerCase().includes('newton') || skill.toLowerCase().includes('physik') ? 'newton-motion' : 
    skill.toLowerCase().includes('immun') || skill.toLowerCase().includes('biolog') ? 'immune-disruption' : null
  );
  
  if (bookId) {
    const preAuth = TEXTBOOKS.find(b => b.id === bookId);
    if (preAuth) return preAuth;
  }

  // Fallback: Dynamically generate textbook structure from the module's theory content.
  // theory.content can arrive as a non-string (e.g. an object) from odd LLM output;
  // coerce defensively so `.split` never throws and crashes the whole modal.
  const theoryContent = typeof mod.theory?.content === 'string'
    ? mod.theory.content
    : (typeof mod.theory === 'string' ? mod.theory : '');
  const paragraphs = theoryContent
    ? theoryContent.split('\n\n').filter(p => p.trim().length > 0)
    : ["Willkommen bei der Lerneinheit.", "Hier lernst du die wichtigsten Kernprinzipien.", "Nutze die verschiedenen Tabs, um das Thema optimal zu durchdringen."];
  
  const sections = paragraphs.map((p, idx) => ({
    id: `sec-${idx}`,
    title: `${idx + 1}. ${idx === 0 ? 'Fundamente' : idx === 1 ? 'Muster & Integration' : 'Praktische Anwendung'}`,
    paragraphIdx: idx,
    questionId: `q-embed-${idx}`
  }));

  // Build embedded questions from the recall questions (if available) or generate default ones
  const recallList = mod.recall && mod.recall.length > 0 ? mod.recall : [
    { question: `Was ist das Kernprinzip von ${skill}?`, answer: `Das Verständnis der zugrunde liegenden Abläufe und Strukturen.` },
    { question: `Warum ist Deliberate Practice für ${skill} wichtig?`, answer: `Weil es dir hilft, kognitive Blockaden gezielt abzubauen.` },
    { question: "Wie verankert man das Gelernte langfristig?", answer: "Durch Spaced Repetition und zeitversetzten Abruf." }
  ];

  const embeddedQuestions = recallList.map((r, idx) => {
    const opts = [
      r.answer,
      `Eine unvollständige Teilantwort zu: ${r.answer.slice(0, Math.min(30, r.answer.length))}...`,
      "Ein häufiges Missverständnis bei diesem Thema.",
      "Keine der genannten Definitionen trifft vollständig zu."
    ];
    
    // Shuffle options using simple deterministic algorithm or Math.random (fine for useMemo)
    const shuffledOpts = [...opts].sort(() => Math.random() - 0.5);
    const correctIdx = shuffledOpts.indexOf(r.answer);

    return {
      id: `q-embed-${idx}`,
      question: r.question,
      options: shuffledOpts,
      answerIdx: correctIdx !== -1 ? correctIdx : 0,
      explanation: `Richtig ist: "${r.answer}". Das aktive Abrufen stärkt deine neuronalen Verbindungen.`
    };
  });

  // Slides from paragraphs
  const slides = paragraphs.map((p, idx) => {
    const sentences = p.split('. ').filter(s => s.trim().length > 0);
    return {
      title: `${idx + 1}. Kernkonzept: ${idx === 0 ? 'Grundlagen' : idx === 1 ? 'Anwendung' : 'Meisterschaft'}`,
      bullets: sentences.slice(0, 3).map(s => s.endsWith('.') ? s : s + '.'),
      narration: `Konzentrieren wir uns auf diesen Punkt. Wichtig zu verstehen ist: ${sentences[0] || 'Die Grundlagen dieses Abschnitts.'}`
    };
  });

  // Audio dialogue
  const audioLesson = [
    { speaker: "Lehrer", text: `Hallo! Heute besprechen wir das Thema ${skill}. Was verbindest du damit?` },
    { speaker: "Schüler", text: `Ich kenne ein paar Begriffe, aber mir fehlt der rote Faden für die Praxis.` },
    { speaker: "Lehrer", text: `Genau dafür sind wir hier. Lass uns mit den Fundamenten anfangen: ${paragraphs[0]?.slice(0, 150) || 'Die Kernaspekte'}...` },
    { speaker: "Schüler", text: `Das macht Sinn. Das reduziert die gefühlte Komplexität enorm.` },
    { speaker: "Lehrer", text: `Exakt. Der nächste wichtige Schritt baut darauf auf: ${paragraphs[1]?.slice(0, 150) || 'Der vertiefte Kontext'}.` },
    { speaker: "Schüler", text: `Verstehe. Also geht es darum, die Muster aktiv zu üben.` }
  ];

  // Mindmap structure
  const mindmap = {
    name: skill,
    children: sections.map(s => ({
      name: s.title,
      children: [
        { name: "Kernbegriffe" },
        { name: "Verständnisprüfung" }
      ]
    }))
  };

  // Illustrations
  const illustrations = {
    gaming: {
      title: "Kognitive Repräsentation (Gaming)",
      description: "Visualisierung der System-Mechanik als Skill-Tree und Levelaufstieg.",
      url: "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=400"
    },
    soccer: {
      title: "Bewegungsablauf & Taktik (Sport)",
      description: "Zerlegung komplexer Spielzüge in isolierte Trainingssegmente.",
      url: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&q=80&w=400"
    },
    art: {
      title: "Struktureller Aufbau (Kunst)",
      description: "Das Zusammenspiel von Raster, Konturen und Schattierung.",
      url: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&q=80&w=400"
    }
  };

  // Quiz
  const quiz = recallList.map((r, idx) => {
    const opts = [
      r.answer,
      `Abweichende Erklärung A für ${skill}`,
      `Abweichende Erklärung B für ${skill}`,
      `Gegenteilige Aussage zu ${skill}`
    ];
    const shuffled = [...opts].sort(() => Math.random() - 0.5);
    const correctIdx = shuffled.indexOf(r.answer);

    return {
      question: r.question,
      options: shuffled,
      answerIdx: correctIdx !== -1 ? correctIdx : 0,
      explanation: `Die korrekte Antwort lautet: "${r.answer}".`
    };
  });

  return {
    id: mod.id || 'dynamic-module',
    title: mod.title || skill,
    category: skill,
    sections,
    originalText: paragraphs.join('\n\n'),
    timeline: {
      title: "Empfohlener Lern-Ablauf",
      steps: sections.map((s, idx) => ({ id: `step-${idx}`, label: s.title, order: idx + 1 }))
    },
    memoryAid: {
      title: "Gedächtnisstütze",
      mnemonic: skill.slice(0, Math.min(4, skill.length)).toUpperCase(),
      meaning: `Mnemonic-Anker für deine Deliberate Practice in ${skill}.`
    },
    illustrations,
    personalizations: {
      gaming: {
        grade5: `Gaming-Analogie (Einfach): Denk bei ${skill} an das Erlernen der Grundsteuerung in einem Tutorial-Level. Ohne das Bewegen mit WASD kannst du später keine komplizierten Bosskämpfe meistern.`,
        grade11: `Gaming-Analogie (Fortgeschritten): In Spiele-Engines entspricht ${skill} dem Kern-Thread. Ein Fehler in dieser Logic führt zu unvorhersehbarem Verhalten im gesamten Game-Loop und zerstört die Performance.`
      },
      soccer: {
        grade5: `Sport-Analogie (Einfach): Bei ${skill} verhält es sich wie mit dem Dribbeln. Du musst erst lernen, den Ball flach am Fuß zu führen, bevor du im echten Spiel einen Übersteiger machst.`,
        grade11: `Sport-Analogie (Fortgeschritten): Die biomechanische Leistungsoptimierung erfordert für ${skill} eine präzise Segmentierung der Bewegung. Jedes Teilsystem muss unter kontrollierten Bedingungen maximiert werden.`
      },
      art: {
        grade5: `Kunst-Analogie (Einfach): Denk bei ${skill} an das Grundgerüst einer Skizze. Erst zeichnest du ein einfaches Kreisraster, bevor du die feinen Details des Gesichts ausarbeitest.`,
        grade11: `Kunst-Analogie (Fortgeschritten): Das Beherrschen von ${skill} entspricht der Beherrschung der Perspektiven-Lehre. Erst das mathematisch korrekte Setzen von Fluchtpunkten erlaubt eine glaubhafte räumliche Tiefe.`
      }
    },
    slides,
    audioLesson,
    mindmap,
    embeddedQuestions,
    quiz
  };
}

// Collapsible Mindmap Node component
function MindmapNode({ node }) {
  const [isOpen, setIsOpen] = useState(true);
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div className={styles.lywMindmapNode}>
      <div 
        className={styles.lywMindmapHeader} 
        onClick={() => hasChildren && setIsOpen(!isOpen)}
        style={{ cursor: hasChildren ? 'pointer' : 'default' }}
      >
        {hasChildren && (
          <span className={styles.lywMindmapToggle}>
            {isOpen ? '▼' : '▶'}
          </span>
        )}
        <span className={styles.lywMindmapName}>{node.name}</span>
      </div>

      {hasChildren && isOpen && (
        <div className={styles.lywMindmapChildren}>
          {node.children.map((child, idx) => (
            <MindmapNode key={idx} node={child} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function LearnYourWay({ 
  activeModule = null, 
  skillName = '', 
  onCompleteTheory = null,
  cachedTextbook = null,       // Pre-generated textbook from parent cache
  onSaveToCache = null,        // (cacheKey, textbookData) => void – called after successful generation
  moduleId = null              // Used as part of the cache key
}) {
  // State variables
  const [selectedBookId, setSelectedBookId] = useState(TEXTBOOKS[0].id);
  const [grade, setGrade] = useState('grade5'); // grade5 | grade11
  const [interest, setInterest] = useState('gaming'); // gaming | soccer | art
  const [modality, setModality] = useState('immersive'); // source | immersive | slides | audio | mindmap

  // Async generation state
  const [generatedBook, setGeneratedBook] = useState(cachedTextbook || null);
  const [isGeneratingBook, setIsGeneratingBook] = useState(false);
  const [generationTipIndex, setGenerationTipIndex] = useState(0);
  const generationTipTimer = useRef(null);
  // Track last generation params to avoid re-triggering
  const lastGenerationKey = useRef(null);

  // Cache key for this specific module + interest + grade combo
  const cacheKey = activeModule ? `${moduleId || activeModule?.id || 'mod'}_${interest}_${grade}` : null;

  // ── Async textbook generation from API ──────────────────────────────────────
  const generateTextbook = useCallback(async (topic, interestVal, gradeVal, moduleIdVal) => {
    const key = `${moduleIdVal || 'mod'}_${interestVal}_${gradeVal}`;
    if (lastGenerationKey.current === key) return; // Already generated or in progress
    lastGenerationKey.current = key;
    setIsGeneratingBook(true);
    setGenerationTipIndex(0);

    // Rotate tips every 2.5 seconds
    generationTipTimer.current = setInterval(() => {
      setGenerationTipIndex(prev => (prev + 1) % GENERATION_TIPS.length);
    }, 2500);

    try {
      const res = await fetch('/api/mistral', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate_augmented_textbook',
          topic,
          interest: interestVal,
          grade: gradeVal
        })
      });

      if (!res.ok) throw new Error(`API returned ${res.status}`);
      const data = await res.json();

      // Validate the response has minimum required fields
      if (!data.sections || !data.originalText) {
        throw new Error('Invalid textbook structure from API');
      }

      setGeneratedBook(data);
      // Persist to parent cache
      if (onSaveToCache) {
        onSaveToCache(key, data);
      }
    } catch (err) {
      console.warn('[LearnYourWay] Textbook generation failed, using adapted module fallback:', err.message);
      // Fall back to the existing adaptModuleToLearnYourWay function
      if (activeModule) {
        setGeneratedBook(adaptModuleToLearnYourWay(activeModule, skillName));
      }
    } finally {
      clearInterval(generationTipTimer.current);
      setIsGeneratingBook(false);
    }
  }, [activeModule, skillName, onSaveToCache]);

  // Trigger generation when module/interest/grade changes (and we're inside Skill Lab)
  useEffect(() => {
    if (!activeModule) return; // Only auto-generate when inside Skill Lab

    const key = `${moduleId || activeModule?.id || 'mod'}_${interest}_${grade}`;
    
    // Check if we already have a valid cached book for this key
    if (cachedTextbook && lastGenerationKey.current !== key) {
      // Parent passed a fresh cache hit
      setGeneratedBook(cachedTextbook);
      lastGenerationKey.current = key;
      return;
    }

    // Only re-generate if the key changed (different interest/grade/module)
    if (lastGenerationKey.current === key && generatedBook) return;

    const topic = activeModule.title || skillName || 'Lernthema';
    generateTextbook(topic, interest, grade, moduleId || activeModule?.id);
  }, [activeModule, interest, grade, moduleId, cachedTextbook]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (generationTipTimer.current) clearInterval(generationTipTimer.current);
    };
  }, []);

  // Active book data – use generated book when in Skill Lab mode, otherwise static TEXTBOOKS
  const book = useMemo(() => {
    if (activeModule) {
      // Use generated book if available, otherwise use adaptModuleToLearnYourWay as fallback
      return generatedBook || adaptModuleToLearnYourWay(activeModule, skillName);
    }
    return TEXTBOOKS.find(b => b.id === selectedBookId) || TEXTBOOKS[0];
  }, [activeModule, selectedBookId, skillName, generatedBook]);

  // Section Tracking / Reading progress
  const [completedSections, setCompletedSections] = useState({});
  const [activeSectionId, setActiveSectionId] = useState('');

  // Update active section when textbook changes
  useEffect(() => {
    if (book && book.sections && book.sections.length > 0) {
      setActiveSectionId(book.sections[0].id);
    }
  }, [book]);

  // Embedded Question State (Right Panel)
  const [showEmbeddedPanel, setShowEmbeddedPanel] = useState(false);
  const [activeQuestion, setActiveQuestion] = useState(null);
  const [selectedEmbeddedAnswer, setSelectedEmbeddedAnswer] = useState(null);
  const [showEmbeddedExplanation, setShowEmbeddedExplanation] = useState(false);
  const [answeredQuestions, setAnsweredQuestions] = useState({}); // track correct embeds

  // Timeline reorder game
  const [timelineItems, setTimelineItems] = useState([]);
  const [isTimelineCorrect, setIsTimelineCorrect] = useState(false);

  // Practice Quiz State
  const [showQuizMode, setShowQuizMode] = useState(false);
  const [quizIndex, setQuizIndex] = useState(0);
  const [selectedQuizAnswer, setSelectedQuizAnswer] = useState(null);
  const [quizScore, setQuizScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);

  // Slides State
  const [slideIndex, setSlideIndex] = useState(0);
  const [isNarrating, setIsNarrating] = useState(false);

  // Audio Lesson State
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioStep, setAudioStep] = useState(1);
  const dialogueEndRef = useRef(null);

  // Scroll Ref for main text container
  const textContainerRef = useRef(null);

  // Auto scroll to bottom of dialogue list in Audio Lesson
  useEffect(() => {
    if (dialogueEndRef.current) {
      dialogueEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [audioStep, modality]);

  // Initialize textbook/chapter specific variables
  useEffect(() => {
    if (book && book.timeline) {
      const shuffled = [...book.timeline.steps].sort(() => Math.random() - 0.5);
      setTimelineItems(shuffled);
      setIsTimelineCorrect(false);
    }
    // Reset reading states
    setCompletedSections({});
    setAnsweredQuestions({});

    // Close right panel and quiz modes
    setShowEmbeddedPanel(false);
    setActiveQuestion(null);
    setSelectedEmbeddedAnswer(null);
    setShowEmbeddedExplanation(false);
    setShowQuizMode(false);
    setQuizFinished(false);
    setQuizIndex(0);
    setSlideIndex(0);
    setIsNarrating(false);
    setIsPlayingAudio(false);
    setAudioStep(1);
  }, [book]);

  // Check timeline correctness
  const checkTimelineOrder = (items) => {
    const isCorrect = items.every((item, idx) => item.order === idx + 1);
    setIsTimelineCorrect(isCorrect);
  };

  // Reorder Timeline items
  const moveTimelineItem = (idx, direction) => {
    if (isTimelineCorrect) return;
    const newItems = [...timelineItems];
    if (direction === 'up' && idx > 0) {
      const temp = newItems[idx];
      newItems[idx] = newItems[idx - 1];
      newItems[idx - 1] = temp;
    } else if (direction === 'down' && idx < newItems.length - 1) {
      const temp = newItems[idx];
      newItems[idx] = newItems[idx + 1];
      newItems[idx + 1] = temp;
    }
    setTimelineItems(newItems);
    checkTimelineOrder(newItems);
  };

  // Click section in left sidebar
  const handleSectionClick = (secId) => {
    setActiveSectionId(secId);
    if (modality !== 'immersive' && modality !== 'source') {
      setModality('immersive');
    }
    setTimeout(() => {
      const el = document.getElementById(`section-${secId}`);
      if (el && textContainerRef.current) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  // Inline Question Click
  const handleInlineQuestionClick = (qId, sectionId) => {
    const q = book.embeddedQuestions.find(eq => eq.id === qId);
    if (!q) return;
    setActiveQuestion({ ...q, sectionId });
    setSelectedEmbeddedAnswer(null);
    setShowEmbeddedExplanation(false);
    setShowEmbeddedPanel(true);
  };

  // Submit Embedded Answer
  const handleEmbeddedAnswer = (idx) => {
    if (selectedEmbeddedAnswer !== null) return;
    setSelectedEmbeddedAnswer(idx);
    setShowEmbeddedExplanation(true);
    
    if (idx === activeQuestion.answerIdx) {
      // Mark question as correct
      setAnsweredQuestions(prev => ({ ...prev, [activeQuestion.id]: true }));
      // Complete section
      setCompletedSections(prev => ({ ...prev, [activeQuestion.sectionId]: true }));
    }
  };

  // Quiz Option Click
  const handleQuizOptionClick = (optIdx) => {
    if (selectedQuizAnswer !== null) return;
    setSelectedQuizAnswer(optIdx);
    if (optIdx === book.quiz[quizIndex].answerIdx) {
      setQuizScore(prev => prev + 1);
    }
  };

  const handleNextQuizQuestion = () => {
    setSelectedQuizAnswer(null);
    if (quizIndex + 1 < book.quiz.length) {
      setQuizIndex(prev => prev + 1);
    } else {
      setQuizFinished(true);
    }
  };

  // Simulation effect for audio narration
  useEffect(() => {
    let timer;
    if (isNarrating) {
      timer = setTimeout(() => {
        setIsNarrating(false);
      }, 7000);
    }
    return () => clearTimeout(timer);
  }, [isNarrating, slideIndex]);

  // Simulation effect for Audio Lesson dialog steps
  useEffect(() => {
    let timer;
    if (isPlayingAudio && audioStep < book.audioLesson.length) {
      timer = setInterval(() => {
        setAudioStep(prev => {
          if (prev >= book.audioLesson.length) {
            setIsPlayingAudio(false);
            clearInterval(timer);
            return prev;
          }
          return prev + 1;
        });
      }, 3000);
    }
    return () => clearInterval(timer);
  }, [isPlayingAudio, audioStep, book]);

  // Generate Glows & Grows dynamic feedback
  const getGlowsAndGrows = () => {
    const total = book.quiz.length;
    const scorePct = (quizScore / total) * 100;
    
    if (scorePct === 100) {
      return {
        glow: "Perfekte Auswertung! Du hast alle Kausalzusammenhänge dieses Kapitels lückenlos verstanden und optimal verinnerlicht.",
        grow: "Niveau steigern: Probiere aus, diese Konzepte auf komplexere Systeme anzuwenden oder den Text auf 11. Klasse-Niveau zu rekapitulieren."
      };
    } else if (scorePct >= 50) {
      return {
        glow: "Gutes Verständnis der Kernaussagen. Du hast die grundlegenden Konzepte sicher erfasst.",
        grow: "Theorie schärfen: Nutze die Mnemonics und den Originaltext (Source-Tab), um Detailfragen zu Aktion/Reaktion oder Immunzellen präziser zu klären."
      };
    } else {
      return {
        glow: "Du hast dich aktiv mit dem Lernstoff auseinandergesetzt. Ein erster wichtiger Schritt!",
        grow: "Basis festigen: Wir empfehlen, das Kapitel noch einmal im personalisierten Modus zu lesen und die Verständnisfragen (❓) an den Absätzen auszufüllen."
      };
    }
  };

  return (
    <div className={styles.lywShell}>
      {/* ─── AI GENERATION LOADING SCREEN ─── */}
      {isGeneratingBook && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 50,
          background: 'rgba(10,14,23,0.97)',
          backdropFilter: 'blur(12px)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          gap: '1.5rem', padding: '2rem',
          borderRadius: 'inherit'
        }}>
          {/* Animated spinner */}
          <div style={{
            width: '60px', height: '60px',
            borderRadius: '50%',
            border: '3px solid rgba(251,113,133,0.15)',
            borderTopColor: '#FB7185',
            borderRightColor: '#67E8F9',
            animation: 'spin 1s linear infinite'
          }} />
          <div style={{ textAlign: 'center', maxWidth: '460px' }}>
            <p style={{ 
              fontSize: '0.65rem', letterSpacing: '0.12em', 
              color: '#FB7185', textTransform: 'uppercase', marginBottom: '0.5rem' 
            }}>KI generiert dein personalisiertes Textbook</p>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 600, color: '#fff', margin: '0 0 0.4rem' }}>
              {activeModule?.title || skillName || 'Lerninhalt'}
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', margin: 0 }}>
              Slides · Audio · Mindmap · Quiz werden generiert...
            </p>
          </div>

          {/* Rotating science tip */}
          <div style={{
            background: 'rgba(103,232,249,0.06)',
            border: '1px solid rgba(103,232,249,0.15)',
            borderRadius: '12px',
            padding: '1rem 1.4rem',
            maxWidth: '420px',
            transition: 'opacity 0.4s ease'
          }}>
            <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.6)', margin: 0, lineHeight: 1.6 }}>
              {GENERATION_TIPS[generationTipIndex]}
            </p>
          </div>
        </div>
      )}

      {/* ─── HEADER TOOLBAR ─── */}
      <header className={styles.lywHeader}>

        <div className={styles.lywTitleBar}>
          <div className={styles.lywBrand}>
            <span className={styles.lywEyebrow}>Google LearnLM / AI-Augmented Textbook</span>
            <h1 className={styles.lywTitle}>Learn Your Way</h1>
          </div>

          <div className={styles.lywSelectors}>
            {/* Textbook Select - Hide if we are locked into a Skill Lab module */}
            {!activeModule && (
              <div className={styles.lywSelectorGroup}>
                <span className={styles.lywSelectLabel}>Kapitel</span>
                <select 
                  className={styles.lywSelect}
                  value={selectedBookId}
                  onChange={e => setSelectedBookId(e.target.value)}
                >
                  {TEXTBOOKS.map(t => (
                    <option key={t.id} value={t.id}>{t.title} ({t.category})</option>
                  ))}
                </select>
              </div>
            )}

            {/* Interest Select */}
            <div className={styles.lywSelectorGroup}>
              <span className={styles.lywSelectLabel}>Persönliches Interesse</span>
              <div className={styles.lywPills}>
                <button 
                  className={`${styles.lywPill} ${interest === 'gaming' ? styles.lywPillActive : ''}`}
                  onClick={() => setInterest('gaming')}
                >
                  🎮 Gaming
                </button>
                <button 
                  className={`${styles.lywPill} ${interest === 'soccer' ? styles.lywPillActive : ''}`}
                  onClick={() => setInterest('soccer')}
                >
                  ⚽ Sport
                </button>
                <button 
                  className={`${styles.lywPill} ${interest === 'art' ? styles.lywPillActive : ''}`}
                  onClick={() => setInterest('art')}
                >
                  🎨 Kunst
                </button>
              </div>
            </div>

            {/* Grade Level Select */}
            <div className={styles.lywSelectorGroup}>
              <span className={styles.lywSelectLabel}>Klassenstufe</span>
              <div className={styles.lywPills}>
                <button 
                  className={`${styles.lywPill} ${grade === 'grade5' ? styles.lywPillActive : ''}`}
                  onClick={() => setGrade('grade5')}
                >
                  5. Klasse
                </button>
                <button 
                  className={`${styles.lywPill} ${grade === 'grade11' ? styles.lywPillActive : ''}`}
                  onClick={() => setGrade('grade11')}
                >
                  11. Klasse
                </button>
              </div>
            </div>

            {/* Quick exit to next phase when inside Skill Lab */}
            {onCompleteTheory && (
              <div className={styles.lywSelectorGroup} style={{ marginLeft: 'auto' }}>
                <button 
                  className={styles.lywCtaBtn}
                  onClick={onCompleteTheory}
                  style={{ background: '#FB7185', color: '#fff', boxShadow: '0 4px 15px rgba(251, 113, 133, 0.2)' }}
                >
                  Weiter zur Übung →
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Modality View Selector */}
        <nav className={styles.lywModalityTabs}>
          <button 
            className={`${styles.lywTabBtn} ${modality === 'source' ? styles.lywTabBtnActive : ''}`}
            onClick={() => setModality('source')}
          >
            Source (Original)
          </button>
          <button 
            className={`${styles.lywTabBtn} ${modality === 'immersive' ? styles.lywTabBtnActive : ''}`}
            onClick={() => setModality('immersive')}
          >
            Immersive Text
          </button>
          <button 
            className={`${styles.lywTabBtn} ${modality === 'slides' ? styles.lywTabBtnActive : ''}`}
            onClick={() => setModality('slides')}
          >
            Slides &amp; Narration
          </button>
          <button 
            className={`${styles.lywTabBtn} ${modality === 'audio' ? styles.lywTabBtnActive : ''}`}
            onClick={() => setModality('audio')}
          >
            Audio Lesson
          </button>
          <button 
            className={`${styles.lywTabBtn} ${modality === 'mindmap' ? styles.lywTabBtnActive : ''}`}
            onClick={() => setModality('mindmap')}
          >
            Mindmap
          </button>
        </nav>
      </header>

      {/* ─── MAIN 3-COLUMN WORKSPACE ─── */}
      <div className={styles.lywWorkspace}>
        
        {/* COLUMN 1: LEFT SIDEBAR TABLE OF CONTENTS */}
        <aside className={styles.lywTocSidebar}>
          <span className={styles.lywTocTitle}>KAPITEL-ÜBERSICHT</span>
          <div className={styles.lywTocList}>
            {book && book.sections && book.sections.map((sec, idx) => {
              const isCompleted = completedSections[sec.id];
              const isActive = activeSectionId === sec.id;
              
              return (
                <button 
                  key={sec.id}
                  className={`${styles.lywTocItem} ${isActive ? styles.lywTocItemActive : ''}`}
                  onClick={() => handleSectionClick(sec.id)}
                >
                  <span className={styles.lywTocStatus}>
                    {isCompleted ? '✓' : '○'}
                  </span>
                  <span className={styles.lywTocName}>{sec.title}</span>
                </button>
              );
            })}
            <button 
              className={`${styles.lywTocItem} ${showQuizMode ? styles.lywTocItemActive : ''}`}
              onClick={() => {
                setModality('immersive');
                setShowQuizMode(true);
              }}
            >
              <span className={styles.lywTocStatus}>❓</span>
              <span className={styles.lywTocName}>Kapitel-Quiz</span>
            </button>
          </div>
        </aside>

        {/* COLUMN 2: CENTER PRESENTATION AREA */}
        <main className={styles.lywContentArea} ref={textContainerRef}>

          {/* MODE A: Source (Plain Unmodified Textbook) */}
          {modality === 'source' && book && (
            <div className={styles.lywSourceView}>
              <div className={styles.lywSourceBanner}>
                📖 Du liest den unveränderten, originalen Lehrbuchtext. Wechsel zum "Immersive Text"-Tab für personalisierte Erläuterungen und Medien.
              </div>
              <h2 className={styles.lywChapterTitle}>{book.title}</h2>
              {book.sections.map((sec) => (
                <div 
                  key={sec.id} 
                  id={`section-${sec.id}`}
                  className={`${styles.lywParagraph} ${activeSectionId === sec.id ? styles.lywParagraphHighlighted : ''}`}
                  onClick={() => setActiveSectionId(sec.id)}
                >
                  <h3 className={styles.lywSectionHeading}>{sec.title}</h3>
                  <p>{book.originalText.split('\n\n')[sec.paragraphIdx]}</p>
                </div>
              ))}
            </div>
          )}

          {/* MODE B: Immersive Text */}
          {modality === 'immersive' && book && (
            <div>
              {!showQuizMode ? (
                <>
                  <h2 className={styles.lywChapterTitle}>{book.title}</h2>
                  
                  {book.sections.map((sec) => {
                    const originalParagraph = book.originalText.split('\n\n')[sec.paragraphIdx];
                    const isCompleted = completedSections[sec.id];
                    const hasCorrectEmbed = answeredQuestions[sec.questionId];

                    return (
                      <div 
                        key={sec.id}
                        id={`section-${sec.id}`}
                        className={`${styles.lywSectionBlock} ${activeSectionId === sec.id ? styles.lywSectionActive : ''}`}
                        onClick={() => setActiveSectionId(sec.id)}
                      >
                        <div className={styles.lywSectionHeader}>
                          <h3 className={styles.lywSectionHeading}>{sec.title}</h3>
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            {isCompleted && <span className={styles.lywSectionCheck}>✓ Gelesen</span>}
                            <button 
                              className={`${styles.lywInlineQuestionBtn} ${hasCorrectEmbed ? styles.lywInlineQuestionBtnDone : ''}`}
                              onClick={() => handleInlineQuestionClick(sec.questionId, sec.id)}
                              title="Verständnisfrage öffnen"
                            >
                              ❓
                            </button>
                          </div>
                        </div>

                        {/* Plain Original Paragraph */}
                        <div className={styles.lywParagraph}>
                          {originalParagraph}
                        </div>

                        {/* Augmented Personalized Example – only show on first section to avoid repetition */}
                        {sec.paragraphIdx === 0 && book.personalizations && (() => {
                          // Support both new API format ({ text: "..." }) and old static format ({ interest: { grade: "..." } })
                          const personText = book.personalizations.text 
                            || book.personalizations[interest]?.[grade]
                            || book.personalizations[interest]?.grade5
                            || null;
                          if (!personText) return null;
                          return (
                            <div className={`${styles.lywParagraph} ${styles.lywPersonalized}`}>
                              <div className={styles.lywPersoBadge}>
                                <span>{interest === 'gaming' ? '🎮' : interest === 'soccer' ? '⚽' : '🎨'}</span>
                                <span>Erklärung für {interest === 'gaming' ? 'Gamer' : interest === 'soccer' ? 'Sportler' : 'Künstler'} ({grade === 'grade5' ? '5. Klasse' : '11. Klasse'})</span>
                              </div>
                              <p>{personText}</p>
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })}

                  {/* Visual Illustration Widget */}
                  {book.illustrations && book.illustrations[interest] && (
                    <section className={styles.lywWidgetCard}>
                      <div className={styles.lywWidgetHead}>
                        <span className={styles.lywWidgetIcon}>🖼️</span>
                        <h4 className={styles.lywWidgetTitle}>Illustriertes Kernkonzept (Personalisiert)</h4>
                      </div>
                      <div className={styles.lywIllustrationCard}>
                        <img 
                          className={styles.lywIllustrationImg} 
                          src={book.illustrations[interest].url} 
                          alt={book.illustrations[interest].title} 
                        />
                        <p className={styles.lywIllustrationText}>
                          <strong>{book.illustrations[interest].title}:</strong> {book.illustrations[interest].description}
                        </p>
                      </div>
                    </section>
                  )}

                  {/* Timeline Widget */}
                  {book.timeline && (
                    <section className={styles.lywWidgetCard}>
                      <div className={styles.lywWidgetHead}>
                        <span className={styles.lywWidgetIcon}>⏳</span>
                        <h4 className={styles.lywWidgetTitle}>{book.timeline.title}</h4>
                        <span className={styles.lywSelectLabel} style={{ marginLeft: 'auto' }}>Reihenfolge sortieren</span>
                      </div>
                      
                      <div className={styles.lywTimelineList}>
                        {timelineItems.map((item, idx) => (
                          <div key={item.id} className={`${styles.lywTimelineItem} ${isTimelineCorrect ? styles.lywTimelineItemCorrect : ''}`}>
                            <span className={styles.lywTimelineIndex}>{idx + 1}</span>
                            <span className={styles.lywTimelineLabel}>{item.label}</span>
                            
                            <div className={styles.lywTimelineReorder}>
                              <button 
                                className={styles.lywReorderBtn} 
                                onClick={() => moveTimelineItem(idx, 'up')}
                                disabled={idx === 0 || isTimelineCorrect}
                              >
                                ▲
                              </button>
                              <button 
                                className={styles.lywReorderBtn} 
                                onClick={() => moveTimelineItem(idx, 'down')}
                                disabled={idx === timelineItems.length - 1 || isTimelineCorrect}
                              >
                                ▼
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {isTimelineCorrect && (
                        <div className={styles.lywSuccessAlert}>
                          🎉 Korrekt! Die Abfolge wurde vollständig richtig sortiert.
                        </div>
                      )}
                    </section>
                  )}

                  {/* Memory Aid Widget */}
                  {book.memoryAid && (
                    <section className={styles.lywWidgetCard}>
                      <div className={styles.lywWidgetHead}>
                        <span className={styles.lywWidgetIcon}>🧠</span>
                        <h4 className={styles.lywWidgetTitle}>Mnemonic Gedächtnishilfe</h4>
                      </div>
                      <div className={styles.lywMnemonicBox}>
                        <span className={styles.lywMnemonicWord}>{book.memoryAid.mnemonic}</span>
                        <span className={styles.lywMnemonicMeaning}>{book.memoryAid.meaning}</span>
                      </div>
                    </section>
                  )}

                  {/* Practice Quiz Trigger */}
                  <div className={styles.lywQuizSection}>
                    <h3 className={styles.lywQuizSecTitle}>Lernzielkontrolle</h3>
                    <p className={styles.lywQuizSecText}>Teste dein Wissen und schließe das Kapitel ab. Erhalte personalisiertes Feedback.</p>
                    <button 
                      className={styles.lywCtaBtn}
                      onClick={() => {
                        setShowQuizMode(true);
                        setQuizIndex(0);
                        setQuizScore(0);
                        setQuizFinished(false);
                        setSelectedQuizAnswer(null);
                      }}
                    >
                      Quiz starten
                    </button>
                  </div>
                </>
              ) : (
                /* QUIZ ACTIVE VIEW */
                <div className={styles.lywQuizBlock}>
                  <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.75rem' }}>
                    <span className={styles.lywEyebrow}>KAPITEL-QUIZ</span>
                    <button 
                      className={styles.lywCloseQuizBtn}
                      onClick={() => setShowQuizMode(false)}
                    >
                      Beenden
                    </button>
                  </header>

                  {!quizFinished ? (
                    <>
                      <div className={styles.lywQuestionText} style={{ fontSize: '1.05rem', fontWeight: 400, margin: '1.5rem 0' }}>
                        Frage {quizIndex + 1} von {book.quiz.length}:<br />
                        <span className={styles.lywQuizQuestionSpan}>{book.quiz[quizIndex].question}</span>
                      </div>

                      <div className={styles.lywOptionsList}>
                        {book.quiz[quizIndex].options.map((opt, oIdx) => {
                          const isSelected = selectedQuizAnswer === oIdx;
                          const isCorrect = oIdx === book.quiz[quizIndex].answerIdx;
                          const showCorrect = selectedQuizAnswer !== null && isCorrect;
                          const showWrong = isSelected && !isCorrect;

                          return (
                            <button
                              key={oIdx}
                              className={`${styles.lywOptionBtn} ${
                                isSelected ? styles.lywOptionSelected : ''
                              } ${showCorrect ? styles.lywOptionCorrect : ''} ${
                                showWrong ? styles.lywOptionWrong : ''
                              }`}
                              onClick={() => handleQuizOptionClick(oIdx)}
                            >
                              {opt}
                            </button>
                          );
                        })}
                      </div>

                      {selectedQuizAnswer !== null && (
                        <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                          <div className={styles.lywExplanation}>
                            <strong>Erklärung:</strong> {book.quiz[quizIndex].explanation}
                          </div>
                          <button className={styles.lywCtaBtn} style={{ alignSelf: 'flex-end' }} onClick={handleNextQuizQuestion}>
                            {quizIndex + 1 < book.quiz.length ? 'Nächste Frage' : 'Auswertung sehen'}
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    /* QUIZ RESULTS with Score Wheel & Glows & Grows */
                    <div className={styles.lywResultsCard}>
                      <div className={styles.lywResultScoreWrapper}>
                        <svg className={styles.lywScoreWheel} viewBox="0 0 36 36">
                          <path
                            className={styles.lywScoreWheelBg}
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          />
                          <path
                            className={styles.lywScoreWheelColor}
                            strokeDasharray={`${(quizScore / book.quiz.length) * 100}, 100`}
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          />
                          <text x="18" y="20.35" className={styles.lywScoreText}>
                            {quizScore}/{book.quiz.length}
                          </text>
                        </svg>
                        <span className={styles.lywScoreLabel}>KOGNITIVE LEISTUNG</span>
                      </div>

                      <div className={styles.lywGlowsGrows}>
                        <div className={styles.lywGlowCard}>
                          <div className={styles.lywFeedbackTitle} style={{ color: '#00c48c' }}>🌟 GLOW (Stärken)</div>
                          <p className={styles.lywFeedbackText}>{getGlowsAndGrows().glow}</p>
                        </div>
                        <div className={styles.lywGrowCard}>
                          <div className={styles.lywFeedbackTitle} style={{ color: '#f5a623' }}>🌱 GROW (Potenziale)</div>
                          <p className={styles.lywFeedbackText}>{getGlowsAndGrows().grow}</p>
                        </div>
                      </div>

                      <button 
                        className={styles.lywCtaBtn} 
                        style={{ alignSelf: 'center', marginTop: '1rem' }} 
                        onClick={() => {
                          if (onCompleteTheory) {
                            onCompleteTheory();
                          } else {
                            setShowQuizMode(false);
                          }
                        }}
                      >
                        {onCompleteTheory ? 'Weiter zur Übung →' : 'Kapitel abschließen'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* MODE C: Slides & Narration */}
          {modality === 'slides' && book && (
            <div className={styles.lywSlideContainer}>
              <div className={styles.lywSlideDeck}>
                <h3 className={styles.lywSlideTitle}>{book.slides[slideIndex]?.title}</h3>
                
                <div className={styles.lywSlideBullets}>
                  {book.slides[slideIndex]?.bullets.map((b, idx) => (
                    <div key={idx} className={styles.lywSlideBullet}>
                      <span className={styles.lywBulletPoint}>✦</span>
                      <span>{b}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className={styles.lywSlideNav}>
                <button 
                  className={styles.lywPill}
                  onClick={() => setSlideIndex(prev => Math.max(0, prev - 1))}
                  disabled={slideIndex === 0}
                  style={{ opacity: slideIndex === 0 ? 0.3 : 1 }}
                >
                  ◀ Zurück
                </button>
                <span className={styles.lywSlideIndex}>Slide {slideIndex + 1} von {book.slides.length}</span>
                <button 
                  className={styles.lywPill}
                  onClick={() => setSlideIndex(prev => Math.min(book.slides.length - 1, prev + 1))}
                  disabled={slideIndex === book.slides.length - 1}
                  style={{ opacity: slideIndex === book.slides.length - 1 ? 0.3 : 1 }}
                >
                  Weiter ▶
                </button>
              </div>

              {/* Narrator Text-to-Speech simulation */}
              <div className={styles.lywNarrationPanel}>
                <div className={styles.lywNarrationHead}>
                  <span className={styles.lywSelectLabel}>Audio-Begleittext (Personalisiert)</span>
                  <button 
                    className={`${styles.lywAudioBtn} ${isNarrating ? styles.lywAudioBtnActive : ''}`}
                    onClick={() => setIsNarrating(!isNarrating)}
                  >
                    {isNarrating ? 'Pause ⏸' : 'Sprachausgabe abspielen 🔊'}
                  </button>
                </div>

                {isNarrating && (
                  <div className={styles.lywAudioEqualizer}>
                    <div className={styles.lywEqualizerBar} />
                    <div className={styles.lywEqualizerBar} />
                    <div className={styles.lywEqualizerBar} />
                    <div className={styles.lywEqualizerBar} />
                    <div className={styles.lywEqualizerBar} />
                  </div>
                )}

                <p className={styles.lywNarrationParagraph}>
                  "{book.slides[slideIndex]?.narration}"
                </p>
              </div>
            </div>
          )}

          {/* MODE D: Audio Lesson (Dialogue simulation) */}
          {modality === 'audio' && book && (
            <div className={styles.lywAudioLesson}>
              <div className={styles.lywAudioPlayerSimulator}>
                <button 
                  className={`${styles.lywPlayCircle} ${isPlayingAudio ? styles.lywPlayCircleActive : ''}`} 
                  onClick={() => setIsPlayingAudio(!isPlayingAudio)}
                >
                  {isPlayingAudio ? '⏸' : '▶'}
                </button>
                <div className={styles.lywPodcastInfo}>
                  <span className={styles.lywPodcastTitle}>Audio-Graphic Lesson: {book.title}</span>
                  <span className={styles.lywPodcastSub}>
                    {isPlayingAudio ? 'Gespannte Diskussion läuft...' : 'Diskussion pausiert. Zum Starten klicken.'}
                  </span>
                </div>
                {isPlayingAudio && (
                  <div className={styles.lywAudioEqualizer}>
                    <div className={styles.lywEqualizerBar} />
                    <div className={styles.lywEqualizerBar} />
                    <div className={styles.lywEqualizerBar} />
                  </div>
                )}
              </div>

              <div className={styles.lywDialogueList}>
                {book.audioLesson.slice(0, audioStep).map((msg, idx) => (
                  <div 
                    key={idx} 
                    className={`${styles.lywBubble} ${
                      msg.speaker === 'Lehrer' ? styles.lywTeacherBubble : styles.lywStudentBubble
                    }`}
                  >
                    <div className={styles.lywBubbleSpeaker}>{msg.speaker}</div>
                    <div className={styles.lywBubbleText}>{msg.text}</div>
                  </div>
                ))}
                <div ref={dialogueEndRef} />
              </div>

              {audioStep < book.audioLesson.length && (
                <button 
                  className={styles.lywPill} 
                  style={{ alignSelf: 'center', marginTop: '1rem' }}
                  onClick={() => setAudioStep(prev => prev + 1)}
                >
                  Nächsten Diskussionsbeitrag laden 💬
                </button>
              )}
            </div>
          )}

          {/* MODE E: Mindmap */}
          {modality === 'mindmap' && book && (
            <div className={styles.lywMindmap}>
              <header className={styles.lywMindmapSubheader}>
                <span className={styles.lywSelectLabel}>Interaktive Wissens-Hierarchie</span>
                <p className={styles.lywIllustrationText} style={{ margin: 0 }}>
                  Klicke auf die Pfeile, um Themenäste zu expandieren oder kollabieren.
                </p>
              </header>
              <div className={styles.lywMindmapWrapper}>
                <MindmapNode node={book.mindmap} />
              </div>
            </div>
          )}

        </main>

        {/* COLUMN 3: RIGHT PANEL FOR EMBEDDED UNDERSTANDING QUESTIONS */}
        <aside className={`${styles.lywRightPanel} ${showEmbeddedPanel ? styles.lywRightPanelOpen : ''}`}>
          {showEmbeddedPanel && activeQuestion ? (
            <div className={styles.lywQuizBlock}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className={styles.lywSidePanelTitle}>VERSTÄNDNIS-CHECK</span>
                <button 
                  className={styles.lywSidePanelCloseBtn}
                  onClick={() => setShowEmbeddedPanel(false)}
                >
                  ✕
                </button>
              </div>

              <p className={styles.lywQuestionText} style={{ fontWeight: 400, color: '#fff', fontSize: '0.9rem' }}>
                {activeQuestion.question}
              </p>
              
              <div className={styles.lywOptionsList} style={{ marginTop: '0.5rem' }}>
                {activeQuestion.options.map((opt, idx) => {
                  const isSelected = selectedEmbeddedAnswer === idx;
                  const isCorrect = idx === activeQuestion.answerIdx;
                  const showCorrect = selectedEmbeddedAnswer !== null && isCorrect;
                  const showWrong = isSelected && !isCorrect;

                  return (
                    <button
                      key={idx}
                      className={`${styles.lywOptionBtn} ${
                        isSelected ? styles.lywOptionSelected : ''
                      } ${showCorrect ? styles.lywOptionCorrect : ''} ${
                        showWrong ? styles.lywOptionWrong : ''
                      }`}
                      onClick={() => handleEmbeddedAnswer(idx)}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>

              {showEmbeddedExplanation && (
                <div className={styles.lywExplanation} style={{ marginTop: '0.5rem' }}>
                  <strong>{selectedEmbeddedAnswer === activeQuestion.answerIdx ? '🎉 Richtig!' : '❌ Leider falsch.'}</strong><br />
                  {activeQuestion.explanation}
                </div>
              )}

              {selectedEmbeddedAnswer === activeQuestion.answerIdx && (
                <div className={styles.lywSectionCheck} style={{ alignSelf: 'center', marginTop: '0.5rem' }}>
                  Abschnitt als gelesen markiert!
                </div>
              )}
            </div>
          ) : (
            <div className={styles.lywSidePanelPlaceholder}>
              <span className={styles.lywSidePanelPlaceholderIcon}>💡</span>
              <span className={styles.lywSelectLabel} style={{ fontSize: '0.65rem' }}>Verständnis-Checks</span>
              <p className={styles.lywIllustrationText} style={{ marginTop: '0.5rem', textAlign: 'center' }}>
                Klicke auf das ❓-Symbol neben den Absatzüberschriften im immersiven Text, um Verständnisfragen für diesen Abschnitt freizuschalten.
              </p>
            </div>
          )}
        </aside>

      </div>
    </div>
  );
}
