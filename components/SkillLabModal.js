'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useProtocol } from '../hooks/useProtocol';
import { DOMAIN_WHITELIST, detectDomain } from '@/lib/skillLabWhitelist';
import LearnYourWay from './LearnYourWay';
import styles from './SkillLabModal.module.css';

function getLocalFallbackCurriculum(skill, domain) {
  const title = `Meisterschaftspfad: ${skill}`;
  const skillSummary = `Nach Abschluss dieses Curriculums wirst du in der Lage sein, ${skill} zielgerichtet anzuwenden.`;
  
  const modules = [
    {
      id: "mod-01",
      title: `${skill} - Fundamente & Kernprinzipien`,
      objective: `Die grundlegenden Konzepte und Begrifflichkeiten von ${skill} verstehen und einordnen.`,
      estimatedMinutes: 30,
      theory: {
        content: `Willkommen beim Meisterschaftspfad für ${skill}.\n\nDer erste Schritt zur Meisterschaft besteht darin, die Grundlagen fehlerfrei zu verinnerlichen. Konzentriere dich auf die Isolation einzelner Segmente der Performance. Vermeide Ablenkungen und arbeite in kurzen, fokussierten Deep-Work-Einheiten.\n\nRegeln für den Einstieg:\n1. Schaffe eine ablenkungsfreie Umgebung.\n2. Zerlege komplexe Aufgaben in handhabbare Teilbereiche (Chunking).\n3. Dokumentiere deine Fortschritte und Fehler im Notiz-Bereich.`,
        sourceHint: "Referenzdokumente und offizielle Leitfäden."
      },
      practice: {
        task: `Schreibe ein kurzes Protokoll der 3 wichtigsten Konzepte von ${skill} auf, die du heute gelernt hast, und halte sie in den Notizen fest.`,
        youtubeQuery: `${skill} beginner tutorial absolute basics`
      },
      recall: [
        { question: `Was ist das wichtigste Grundkonzept beim Erlernen von ${skill}?`, answer: "Das Zerlegen von komplexen Aufgaben in isolierte Teilbereiche (Chunking), um kognitive Überlastung zu vermeiden." },
        { question: `Warum ist Deliberate Practice (gezielt üben) bei ${skill} wichtig?`, answer: "Weil unbewusste Fehler nur durch fokussiertes Feedback und bewusste Korrekturen aufgedeckt werden." },
        { question: "Wie oft sollte man am Anfang Pausen einlegen?", answer: "Alle 30-45 Minuten für 5-10 Minuten, um die kognitive Belastung zu senken und die Regeneration zu fördern." }
      ]
    },
    {
      id: "mod-02",
      title: `${skill} - Fortgeschrittene Integration`,
      objective: `Anwendung fortgeschrittener Konzepte und Muster unter kontrollierten Bedingungen.`,
      estimatedMinutes: 45,
      theory: {
        content: `Nun bauen wir auf den Fundamenten auf.\n\nHierbei konzentrieren wir uns auf Mustererkennung (Pattern Recognition). Wenn du die grundlegenden Schemata erkennst, verringert sich deine kognitive Belastung (Cognitive Load). Dadurch wird Arbeitsgedächtnis für komplexere Problemlösungen frei.\n\nBest Practices:\n- Analysiere Best Practices von Experten der Domäne.\n- Versuche, die zugrunde liegenden Prinzipien und Regeln zu verstehen, statt nur stumpf auswendig zu lernen.\n- Nutze Fehler als direkte Feedback-Schleife.`,
        sourceHint: "Fachartikel, Experteninterviews und fortgeschrittene Fallstudien."
      },
      practice: {
        task: `Löse ein mittelschweres Problem oder erstelle ein erstes kleines Projekt zu ${skill}. Zeitaufwand: 30 Minuten.`,
        youtubeQuery: `${skill} advanced techniques masterclass`
      },
      recall: [
        { question: "Was beschreibt Cognitive Load?", answer: "Die Belastung des Arbeitsgedächtnisses während einer kognitiven Aufgabe." },
        { question: "Wie reduziert man kognitive Belastung beim Lernen?", answer: "Durch das Etablieren von automatisierten Mustern und mentalen Repräsentationen." },
        { question: "Was ist der Unterschied zwischen Taktik und Strategie?", answer: "Taktik ist die kurzfristige Berechnung einzelner Schritte, Strategie die langfristige Ausrichtung." }
      ]
    },
    {
      id: "mod-03",
      title: `${skill} - Deep Mastery Challenge`,
      objective: `Echte Anwendungskompetenz erlangen und das Gelernte unter Beweis stellen.`,
      estimatedMinutes: 60,
      theory: {
        content: `Im letzten Modul konsolidieren wir dein Wissen über ${skill}.\n\nWahres Meisterschaftsniveau wird erreicht, wenn du das Wissen in unvorhergesehenen Szenarien anwenden kannst. Hierbei ist aktiver Abruf (Active Recall) und zeitlich versetzte Wiederholung (Spaced Repetition) entscheidend, um die Informationen langfristig in der Großhirnrinde zu verankern.\n\nTipps für langfristigen Erfolg:\n- Lehre das Gelernte jemand anderem (Feynman-Methode).\n- Suche kontinuierlich nach anspruchsvolleren Challenges, um Plateaus zu durchbrechen.\n- Halte eine feste Routine ein.`,
        sourceHint: "Wissenschaftliche Mastery-Konzepte und Lerntheorien."
      },
      practice: {
        task: `Führe eine freie Übung durch, bei der du das Gelernte ohne Hilfsmittel auf ein neues, komplexes Problem anwendest. Dokumentiere deine Schritte.`,
        youtubeQuery: `${skill} real world project practice`
      },
      recall: [
        { question: "Was bewirkt Active Recall?", answer: "Durch das aktive Abrufen von Informationen werden die synaptischen Verbindungen im Gehirn gestärkt." },
        { question: "Warum ist Spaced Repetition wichtig?", answer: "Es verhindert das Vergessen, indem es Informationen genau vor dem Vergessenszeitpunkt wiederholt." },
        { question: "Wie festigt sich das Langzeitgedächtnis am besten?", answer: "Durch ausreichenden Schlaf und Phasen der mentalen Ruhe (NSDR) nach intensiven Lerneinheiten." }
      ]
    }
  ];

  return { title, skillSummary, modules };
}

export default function SkillLabModal({ isOpen, onClose }) {
  const { profile, saveProfile } = useProtocol();
  const [inputSkill, setInputSkill] = useState('');
  const [disambigOptions, setDisambigOptions] = useState([]);
  const [isDisambiguating, setIsDisambiguating] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [debounceTimer, setDebounceTimer] = useState(null);

  // Recall Phase – Free Text States
  const [currentRecallIndex, setCurrentRecallIndex] = useState(0);
  const [recallUserAnswer, setRecallUserAnswer] = useState('');
  const [isEvaluatingRecall, setIsEvaluatingRecall] = useState(false);
  const [recallResult, setRecallResult] = useState(null); // { isCorrect, semanticScore, feedback }
  const [recallAttempts, setRecallAttempts] = useState(0); // Track failure count for bypass
  const [recallBypassUsed, setRecallBypassUsed] = useState(false);
  const [sessionSuccess, setSessionSuccess] = useState(false);

  // Spaced Repetition Active Review Mode
  const [srReviewMode, setSrReviewMode] = useState(false);
  const [srIndex, setSrIndex] = useState(0);
  const [srShowAnswer, setSrShowAnswer] = useState(false);


  // State mapping to Profile (with on-the-fly normalization to prevent TypeErrors)
  const state = useMemo(() => {
    const raw = profile?.skillLabState || {
      phase: 'onboarding',
      skill: '',
      intent: '',
      domain: '',
      goal: '',
      hoursPerWeek: 2,
      curriculum: null,
      currentModuleIndex: 0,
      currentPhase: 'theory',
      spacedRepetitionQueue: [],
      completedSteps: {},
      watchedVideos: {},
      skillNotes: {},
      videoUrl: null,
      cachedTextbooks: {}
    };

    // Ensure cachedTextbooks is always an object
    if (!raw.cachedTextbooks || typeof raw.cachedTextbooks !== 'object') {
      raw.cachedTextbooks = {};
    }

    if (raw.curriculum && Array.isArray(raw.curriculum.modules)) {
      raw.curriculum.modules = raw.curriculum.modules.map((m, i) => {
        const theory = {
          content: m.theory?.content || m.theory?.text || m.theoryContent || m.theory || "Standard-Theorieinhalt für dieses Modul.",
          sourceHint: m.theory?.sourceHint || m.sourceHint || "Relevante Online-Quellen."
        };
        const practice = {
          task: m.practice?.task || m.practice?.exercise || m.practiceTask || m.practice || "Führe eine praktische Übung zum Thema durch.",
          youtubeQuery: m.practice?.youtubeQuery || m.youtubeQuery || m.practice?.query || "beginner tutorial"
        };
        const recall = Array.isArray(m.recall) ? m.recall : 
                       Array.isArray(m.questions) ? m.questions : [
                         { question: "Was ist das Kernprinzip dieses Moduls?", answer: "Das Verständnis der gelernten Grundlagen." }
                       ];
        return {
          ...m,
          id: m.id || `mod-${i+1}`,
          title: m.title || `Modul ${i+1}`,
          objective: m.objective || "Lernziel dieses Moduls.",
          estimatedMinutes: m.estimatedMinutes || 30,
          theory,
          practice,
          recall
        };
      });
    }

    return raw;
  }, [profile?.skillLabState]);


  const updateState = (updates) => {
    saveProfile({
      skillLabState: {
        ...state,
        ...updates
      }
    });
  };

  // Close handler
  const handleClose = () => {
    setSrReviewMode(false);
    onClose();
  };

  // Onboarding pill selector
  const handlePillClick = (skillName) => {
    setInputSkill(skillName);
    handleSkillInput(skillName);
  };

  // Handle skill typing
  const handleSkillInput = (val) => {
    if (debounceTimer) clearTimeout(debounceTimer);

    if (val.trim().length < 2) {
      setDisambigOptions([]);
      setIsDisambiguating(false);
      updateState({ skill: val, intent: '', domain: '' });
      return;
    }

    const domainKey = detectDomain(val);
    if (domainKey) {
      setDisambigOptions([]);
      setIsDisambiguating(false);
      updateState({ skill: val, domain: domainKey, intent: '' });
    } else {
      // Vague input: trigger debounced AI disambiguation
      updateState({ skill: val });
      const timer = setTimeout(() => {
        runDisambiguation(val);
      }, 600);
      setDebounceTimer(timer);
    }
  };

  // Run LLM Disambiguation
  const runDisambiguation = async (skillName) => {
    setIsDisambiguating(true);
    setDisambigOptions([]);
    setError(null);

    const domainList = Object.entries(DOMAIN_WHITELIST)
      .map(([k, v]) => `${k}: ${v.label}`)
      .join('\n');

    const prompt = `User hat eingegeben: "${skillName}"
Verfügbare Domains:
${domainList}

Generiere GENAU 4 Sub-Intents für diesen Input.
JSON Format: [{"id":"x","label":"...","icon":"material_symbol_name","domain":"DOMAIN_KEY"}]`;

    try {
      const res = await fetch('/api/mistral', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          systemPrompt: `Du bist ein Lernpfad-Assistent. Der User hat einen Skill eingegeben, der unklar ist.
Generiere GENAU 4 konkrete Sub-Intents als JSON-Array.
Jeder Sub-Intent hat: { "id": string, "label": string (max 7 Wörter), "icon": string (Material Symbol name), "domain": string (aus der Domain-Liste) }.
Antworte NUR mit validem JSON, kein Markdown.`
        })
      });

      if (!res.ok) throw new Error("Disambiguation request failed");
      const data = await res.json();
      const content = data.choices[0].message.content.replace(/```json|```/g, '').trim();
      const options = JSON.parse(content);
      setDisambigOptions(options);
    } catch (e) {
      console.warn("[SkillLab Disambig] Error:", e);
      // Fallback options
      setDisambigOptions([
        { id: "sub_1", label: `${skillName} Grundlagen`, icon: "school", domain: "PROGRAMMING" },
        { id: "sub_2", label: `${skillName} Vertiefung`, icon: "trending_up", domain: "PROGRAMMING" },
        { id: "sub_3", label: `${skillName} Praxis`, icon: "build", domain: "PROGRAMMING" },
        { id: "sub_4", label: `${skillName} Analyse`, icon: "analytics", domain: "PROGRAMMING" }
      ]);
    } finally {
      setIsDisambiguating(false);
    }
  };

  // Generate Curriculum
  const handleGenerateCurriculum = async () => {
    setIsGenerating(true);
    setError(null);
    updateState({ phase: 'generating' });

    const domainData = DOMAIN_WHITELIST[state.domain] || {};
    const sources = (domainData.sources || []).join(', ') || 'relevante Online-Quellen';
    const sessionsPerWeek = Math.max(1, Math.floor(state.hoursPerWeek / 1.5));
    const totalModules = Math.min(12, Math.max(6, sessionsPerWeek * 3));

    const prompt = `Erstelle ein Lern-Curriculum für:
Skill: "${state.skill}"
${state.intent ? `Spezifisches Ziel: "${state.intent}"` : ''}
${state.goal ? `Nutzer-Ziel: "${state.goal}"` : ''}
Zeit/Woche: ${state.hoursPerWeek}h → ${sessionsPerWeek} Sessions/Woche
Anzahl Module: ${totalModules}
Verfügbare Quellen: ${sources}

JSON Struktur (NUR JSON zurückgeben):
{
  "title": "Curriculum-Titel",
  "skillSummary": "Ein Satz: Was kann der Nutzer nach Abschluss?",
  "modules": [
    {
      "id": "mod-01",
      "title": "Modulname",
      "objective": "Lernziel (1 Satz, konkret)",
      "estimatedMinutes": 30,
      "theory": {
        "content": "Destillierter Theorie-Text (200-350 Wörter). Präzise, kein Filler.",
        "sourceHint": "Relevante Quelle aus: ${sources}"
      },
      "practice": {
        "task": "Konkrete, ausführbare Übungsaufgabe (1 Aufgabe, spezifisch mit Zeitangabe)",
        "youtubeQuery": "Optimale YouTube-Suchanfrage um ein Demo-Video zu finden"
      },
      "recall": [
        {"question": "Frage 1?", "answer": "Antwort 1"},
        {"question": "Frage 2?", "answer": "Antwort 2"},
        {"question": "Frage 3?", "answer": "Antwort 3"}
      ]
    }
  ]
}`;

    try {
      const res = await fetch('/api/mistral', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          systemPrompt: `Du bist ein Lern-Curriculum-Designer. Erstelle ein strukturiertes, sequenzielles Curriculum.
Antworte NUR mit validem JSON, kein Markdown, keine Erklärungen davor oder danach.`
        })
      });

      if (!res.ok) throw new Error("Curriculum generation failed");
      const data = await res.json();
      const content = data.choices[0].message.content.replace(/```json|```/g, '').trim();
      
      let curriculum = null;
      try {
        curriculum = JSON.parse(content);
      } catch (parseError) {
        console.warn("[SkillLab] JSON parse failed, extracting curriculum objects:", parseError);
      }

      // Robust check & normalization
      if (curriculum && typeof curriculum === 'object') {
        if (!curriculum.modules && curriculum.curriculum) {
          curriculum = curriculum.curriculum;
        }
        if (!curriculum.modules && curriculum.data) {
          curriculum = curriculum.data;
        }
        if (!curriculum.modules) {
          const arrayKey = Object.keys(curriculum).find(k => Array.isArray(curriculum[k]));
          if (arrayKey) {
            curriculum.modules = curriculum[arrayKey];
          }
        }
      }

      // If still missing or invalid, generate fallback curriculum
      if (!curriculum || !Array.isArray(curriculum.modules) || curriculum.modules.length === 0) {
        console.warn("[SkillLab] Invalid curriculum from API, utilizing local fallback");
        curriculum = getLocalFallbackCurriculum(state.skill, state.domain);
      }

      // Map status and normalize modules to prevent runtime TypeErrors
      curriculum.modules = curriculum.modules.map((m, i) => {
        const theory = {
          content: m.theory?.content || m.theory?.text || m.theoryContent || m.theory || "Standard-Theorieinhalt für dieses Modul.",
          sourceHint: m.theory?.sourceHint || m.sourceHint || "Relevante Online-Quellen."
        };
        
        const practice = {
          task: m.practice?.task || m.practice?.exercise || m.practiceTask || m.practice || "Führe eine praktische Übung zum Thema durch.",
          youtubeQuery: m.practice?.youtubeQuery || m.youtubeQuery || m.practice?.query || "beginner tutorial"
        };
        
        const recall = Array.isArray(m.recall) ? m.recall : 
                       Array.isArray(m.questions) ? m.questions : [
                         { question: "Was ist das Kernprinzip dieses Moduls?", answer: "Das Verständnis der gelernten Grundlagen." }
                       ];

        return {
          ...m,
          id: m.id || `mod-${i+1}`,
          title: m.title || `Modul ${i+1}`,
          objective: m.objective || "Lernziel dieses Moduls.",
          estimatedMinutes: m.estimatedMinutes || 30,
          theory,
          practice,
          recall,
          status: i === 0 ? 'active' : 'locked',
          completedAt: null
        };
      });

      updateState({
        curriculum,
        currentModuleIndex: 0,
        phase: 'curriculum'
      });
    } catch (e) {
      console.warn("[SkillLab Curriculum] Error:", e);
      // Fallback to local fallback if any error occurs (network issue, API error etc.)
      console.warn("[SkillLab] API failed completely, utilizing local fallback");
      const fallbackCurriculum = getLocalFallbackCurriculum(state.skill || inputSkill, state.domain || 'PROGRAMMING');
      fallbackCurriculum.modules = fallbackCurriculum.modules.map((m, i) => {
        const theory = {
          content: m.theory?.content || "Standard-Theorieinhalt für dieses Modul.",
          sourceHint: m.theory?.sourceHint || "Relevante Online-Quellen."
        };
        const practice = {
          task: m.practice?.task || "Führe eine praktische Übung zum Thema durch.",
          youtubeQuery: m.practice?.youtubeQuery || "beginner tutorial"
        };
        const recall = Array.isArray(m.recall) ? m.recall : [
          { question: "Was ist das Kernprinzip dieses Moduls?", answer: "Das Verständnis der gelernten Grundlagen." }
        ];

        return {
          ...m,
          theory,
          practice,
          recall,
          status: i === 0 ? 'active' : 'locked',
          completedAt: null
        };
      });
      updateState({
        curriculum: fallbackCurriculum,
        currentModuleIndex: 0,
        phase: 'curriculum'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Start active module session
  const startModuleSession = async (idx) => {
    const activeModule = state.curriculum.modules[idx];
    updateState({
      phase: 'session',
      currentModuleIndex: idx,
      currentPhase: 'theory',
      videoUrl: null
    });
    setCurrentRecallIndex(0);
    setRecallUserAnswer('');
    setRecallResult(null);
    setRecallAttempts(0);
    setRecallBypassUsed(false);
    setSessionSuccess(false);


    // Search YouTube Video async
    try {
      const query = `${state.skill} ${activeModule.practice.youtubeQuery}`;
      const searchRes = await fetch(`/api/youtube-search?q=${encodeURIComponent(query)}`);
      if (searchRes.ok) {
        const searchData = await searchRes.json();
        if (searchData.videoUrl) {
          updateState({ videoUrl: searchData.videoUrl });
        }
      }
    } catch (e) {
      console.warn("[SkillLab YouTube Search] Failed to fetch video:", e);
    }
  };

  // Mark theory phase as completed
  const handleCompleteTheory = () => {
    const activeModule = state.curriculum.modules[state.currentModuleIndex];
    updateState({
      watchedVideos: {
        ...state.watchedVideos,
        [activeModule.id]: true
      },
      currentPhase: 'practice'
    });
  };

  // Mark practice phase as completed
  const handleCompletePractice = () => {
    updateState({
      currentPhase: 'recall'
    });
  };

  // Evaluate Recall Answer semantically via AI
  const handleEvaluateRecall = async () => {
    const activeModule = state.curriculum.modules[state.currentModuleIndex];
    const currentQuestion = activeModule.recall[currentRecallIndex];

    if (!recallUserAnswer.trim()) return; // Don't submit empty

    setIsEvaluatingRecall(true);
    setRecallResult(null);

    try {
      const res = await fetch('/api/mistral', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'evaluate_recall_answer',
          question: currentQuestion.question,
          referenceAnswer: currentQuestion.answer,
          userAnswer: recallUserAnswer.trim()
        })
      });

      if (!res.ok) throw new Error(`API ${res.status}`);
      const result = await res.json();

      // Ensure result has all required fields (defensive)
      const safeResult = {
        isCorrect: result.isCorrect === true,
        semanticScore: typeof result.semanticScore === 'number' ? Math.min(100, Math.max(0, result.semanticScore)) : 50,
        feedback: typeof result.feedback === 'string' ? result.feedback : 'Glows: Antwort wurde geprüft. Grows: Überarbeite deine Formulierung.'
      };

      setRecallResult(safeResult);

      if (!safeResult.isCorrect) {
        const newAttempts = recallAttempts + 1;
        setRecallAttempts(newAttempts);

        // Add wrong questions to Spaced Repetition Queue
        if (newAttempts === 1) {
          const nextDue = Date.now() + 3 * 24 * 60 * 60 * 1000;
          const srCard = {
            question: currentQuestion.question,
            answer: currentQuestion.answer,
            moduleTitle: activeModule.title,
            dueAt: nextDue
          };
          updateState({
            spacedRepetitionQueue: [...state.spacedRepetitionQueue, srCard]
          });
        }
      }
    } catch (err) {
      console.warn('[SkillLab Recall] Evaluation failed, using keyword fallback:', err.message);
      // Client-side keyword fallback
      const userWords = new Set(recallUserAnswer.toLowerCase().split(/\s+/).filter(w => w.length > 3));
      const refWords = currentQuestion.answer.toLowerCase().split(/\s+/).filter(w => w.length > 3);
      const matches = refWords.filter(w => userWords.has(w)).length;
      const score = refWords.length > 0 ? Math.round((matches / refWords.length) * 100) : 50;
      const isCorrect = score >= 60;
      const fallbackResult = {
        isCorrect,
        semanticScore: score,
        feedback: isCorrect 
          ? 'Glows: Deine Antwort enthält die wesentlichen Schlüsselbegriffe. Grows: Mit einer vollständigeren Formulierung wäre deine Antwort noch präziser.'
          : `Glows: Guter Versuch. Grows: Die korrekte Antwort lautet: "${currentQuestion.answer}"`
      };
      setRecallResult(fallbackResult);
      if (!isCorrect) {
        setRecallAttempts(prev => prev + 1);
      }
    } finally {
      setIsEvaluatingRecall(false);
    }
  };

  // Advance to next recall question (called after a correct evaluation or bypass)
  const advanceRecall = (forcedCorrect = false) => {
    const activeModule = state.curriculum.modules[state.currentModuleIndex];
    const currentQuestion = activeModule.recall[currentRecallIndex];

    // Reset per-question state
    setRecallUserAnswer('');
    setRecallResult(null);
    setRecallAttempts(0);
    setRecallBypassUsed(false);

    if (currentRecallIndex + 1 < activeModule.recall.length) {
      setCurrentRecallIndex(prev => prev + 1);
    } else {
      completeSession();
    }
  };

  // Bypass: reveal answer and move on (available after 2 failed attempts)
  const handleRecallBypass = () => {
    const activeModule = state.curriculum.modules[state.currentModuleIndex];
    const currentQuestion = activeModule.recall[currentRecallIndex];
    setRecallBypassUsed(true);
    setRecallResult({
      isCorrect: false,
      semanticScore: 0,
      feedback: `Musterlösung: "${currentQuestion.answer}" – Nutze Spaced Repetition, um diese Frage langfristig zu verinnerlichen.`
    });
    // Add to SR queue so it comes back
    const nextDue = Date.now() + 1 * 24 * 60 * 60 * 1000; // 1 day (sooner since bypass)
    updateState({
      spacedRepetitionQueue: [
        ...state.spacedRepetitionQueue,
        {
          question: currentQuestion.question,
          answer: currentQuestion.answer,
          moduleTitle: activeModule.title,
          dueAt: nextDue
        }
      ]
    });
  };

  // Legacy handleRecallAnswer kept for backward-compat (SR review still uses self-assessment)
  const handleRecallAnswer = (isCorrect) => {
    const activeModule = state.curriculum.modules[state.currentModuleIndex];
    const currentQuestion = activeModule.recall[currentRecallIndex];

    if (!isCorrect) {
      const nextDue = Date.now() + 3 * 24 * 60 * 60 * 1000;
      const srCard = {
        question: currentQuestion.question,
        answer: currentQuestion.answer,
        moduleTitle: activeModule.title,
        dueAt: nextDue
      };
      updateState({
        spacedRepetitionQueue: [...state.spacedRepetitionQueue, srCard]
      });
    }

    setRecallUserAnswer('');
    setRecallResult(null);
    setRecallAttempts(0);
    if (currentRecallIndex + 1 < activeModule.recall.length) {
      setCurrentRecallIndex(prev => prev + 1);
    } else {
      completeSession();
    }
  };


  // Finalize Module Completion
  const completeSession = () => {
    const updatedModules = state.curriculum.modules.map((m, i) => {
      if (i === state.currentModuleIndex) {
        return { ...m, status: 'completed', completedAt: new Date().toISOString() };
      }
      if (i === state.currentModuleIndex + 1) {
        return { ...m, status: 'active' };
      }
      return m;
    });

    updateState({
      curriculum: {
        ...state.curriculum,
        modules: updatedModules
      }
    });
    setSessionSuccess(true);
  };

  // Spaced Repetition handlers
  const handleSrAnswer = (isCorrect) => {
    const updatedQueue = [...state.spacedRepetitionQueue];
    if (isCorrect) {
      // Remove from queue
      updatedQueue.splice(srIndex, 1);
    } else {
      // Push back due date
      updatedQueue[srIndex].dueAt = Date.now() + 3 * 24 * 60 * 60 * 1000;
    }

    setSrShowAnswer(false);
    updateState({ spacedRepetitionQueue: updatedQueue });

    if (srIndex < updatedQueue.length) {
      // Still items left (index doesn't change since we removed the current item,
      // or if wrong, it got updated, but let's reset to 0 or check bounds)
      if (updatedQueue.length === 0) {
        setSrReviewMode(false);
      } else {
        setSrIndex(prev => (prev >= updatedQueue.length ? 0 : prev));
      }
    } else {
      setSrReviewMode(false);
    }
  };

  // Handler for LearnYourWay to save generated textbooks to profile cache
  const handleSaveTextbookToCache = (cacheKey, textbookData) => {
    const currentCache = state.cachedTextbooks || {};
    updateState({
      cachedTextbooks: {
        ...currentCache,
        [cacheKey]: textbookData
      }
    });
  };

  // Reset curriculum confirmation
  const handleResetCurriculum = () => {
    if (window.confirm("Möchtest du dein aktuelles Curriculum wirklich zurücksetzen und einen neuen Skill starten?")) {
      setInputSkill('');
      setDisambigOptions([]);
      setRecallUserAnswer('');
      setRecallResult(null);
      setRecallAttempts(0);
      setRecallBypassUsed(false);
      updateState({
        phase: 'onboarding',
        skill: '',
        intent: '',
        domain: '',
        goal: '',
        hoursPerWeek: 2,
        curriculum: null,
        currentModuleIndex: 0,
        currentPhase: 'theory',
        spacedRepetitionQueue: [],
        completedSteps: {},
        watchedVideos: {},
        skillNotes: {},
        videoUrl: null,
        cachedTextbooks: {} // Clear cache on full reset
      });
    }
  };


  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(6,5,9,0.82)', backdropFilter: 'blur(16px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100000
    }}>
      {/* Global keyframes for inline-style spinners */}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

      {/* Backdrop Close Click */}
      <div style={{ position: 'absolute', inset: 0 }} onClick={handleClose} />


      {/* Modal card */}
      <div style={{
        position: 'relative', 
        width: state.phase === 'session' ? '96%' : '92%', 
        maxWidth: state.phase === 'session' ? '1320px' : '640px', 
        maxHeight: '92vh',
        overflowY: 'auto', 
        background: 'rgba(10,14,23,0.96)', 
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: '20px', 
        boxShadow: '0 0 80px rgba(251,113,133,0.08), 0 32px 64px rgba(0,0,0,0.6)',
        color: '#fff'
      }}>
        {/* Close Button */}
        <button onClick={handleClose} style={{
          position: 'absolute', top: '1.2rem', right: '1.2rem',
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'rgba(255,255,255,0.3)', fontSize: '1.5rem', lineHeight: 1,
          zIndex: 10, outline: 'none'
        }}>&times;</button>

        {/* ── PHASE 1: ONBOARDING ── */}
        {state.phase === 'onboarding' && (
          <div className={styles.slModalInner}>
            <header className={styles.slHeader}>
              <span className={styles.slEyebrow}>SKILL_LAB / INIT</span>
              <h2 className={styles.slTitle}>Was willst du meistern?</h2>
              <p className={styles.slSubtitle}>Wähle einen Bereich oder gib deinen Wunsch-Skill ein. Wir bauen deinen Pfad.</p>
            </header>

            <div className={styles.slInputZone}>
              <div className={styles.slInputWrap}>
                <input
                  className={styles.slInput}
                  type="text"
                  placeholder="z.B. Zeichnen, Memecoins, Gitarre, Python..."
                  value={inputSkill}
                  onChange={(e) => {
                    setInputSkill(e.target.value);
                    handleSkillInput(e.target.value);
                  }}
                  autoComplete="off"
                />
                <span className={styles.slInputHint}>Lern-Coach</span>
              </div>

              {/* Quick Picks */}
              <div className={styles.slPills}>
                <button className={styles.slPill} onClick={() => handlePillClick("Zeichnen")}>🎨 Zeichnen</button>
                <button className={styles.slPill} onClick={() => handlePillClick("Crypto Trading")}>₿ Crypto</button>
                <button className={styles.slPill} onClick={() => handlePillClick("Python")}>💻 Programmieren</button>
                <button className={styles.slPill} onClick={() => handlePillClick("Musik Produktion")}>🎵 Musik</button>
                <button className={styles.slPill} onClick={() => handlePillClick("Spanisch")}>🌐 Sprachen</button>
                <button className={styles.slPill} onClick={() => handlePillClick("Krafttraining")}>💪 Fitness</button>
              </div>
            </div>

            {/* AI Disambiguation Grid */}
            {isDisambiguating && (
              <div className={styles.slLoadingMini}>
                <div className={styles.slSpinnerSm} />
                <span className={styles.slLabel}>Analysiere "{inputSkill}"...</span>
              </div>
            )}

            {!isDisambiguating && disambigOptions.length > 0 && (
              <div className={styles.slDisambigZone}>
                <div className={styles.slDivider}><span>Was genau willst du damit erreichen?</span></div>
                <div className={styles.slDisambigGrid}>
                  {disambigOptions.map(opt => (
                    <button
                      key={opt.id}
                      className={`${styles.slDisambigCard} ${state.intent === opt.label ? styles.selected : ''}`}
                      onClick={() => updateState({ intent: opt.label, domain: opt.domain })}
                    >
                      <span className={styles.slDisambigLabel}>{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Goal and Time selection (Shown only when domain is detected or intent selected) */}
            {state.domain && (
              <div className={styles.slGoalZone}>
                <div className={styles.slDivider}><span>Präzisiere dein Ziel &amp; Zeit</span></div>
                <textarea
                  className={styles.slTextarea}
                  placeholder="Was willst du damit können? z.B. 'Ich will in 3 Monaten eigene Smart Contracts schreiben.'"
                  rows="2"
                  value={state.goal}
                  onChange={(e) => updateState({ goal: e.target.value })}
                />
                
                <div className={styles.slTimeRow}>
                  <span className={styles.slLabel}>Zeit pro Woche</span>
                  <div className={styles.slTimePills}>
                    {[2, 5, 8, 12].map(hours => (
                      <button
                        key={hours}
                        className={`${styles.slTimePill} ${state.hoursPerWeek === hours ? styles.active : ''}`}
                        onClick={() => updateState({ hoursPerWeek: hours })}
                      >
                        {hours === 2 ? '1-2h' : hours === 5 ? '3-5h' : hours === 8 ? '6-10h' : '10h+'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className={styles.slCtaZone}>
                  <button className={styles.slCtaBtn} onClick={handleGenerateCurriculum}>
                    Curriculum generieren <span className={styles.slArrow}>→</span>
                  </button>
                </div>
              </div>
            )}

            {error && <div className={styles.slError}>{error}</div>}
          </div>
        )}

        {/* ── PHASE 2: GENERATING ── */}
        {state.phase === 'generating' && (
          <div className={styles.slLoadingState}>
            <div className={styles.slSpinner} />
            <p className={styles.slLoadingTitle}>Baue deinen Meisterschaftspfad</p>
            <p className={styles.slLoadingSub}>{state.skill}{state.intent ? ` → ${state.intent}` : ''}</p>
            <p className={`${styles.slLoadingHint} ${styles.slLabel}`}>CURRICULUM_GENERATING...</p>
          </div>
        )}

        {/* ── PHASE 3: CURRICULUM OVERVIEW ── */}
        {state.phase === 'curriculum' && !srReviewMode && (
          <div className={styles.slCurriculumView}>
            <div className={styles.slCurriculumHeader}>
              <div>
                <span className={styles.slEyebrow}>AKTIVES CURRICULUM</span>
                <h2 className={styles.slTitle} style={{ fontSize: '1.5rem' }}>{state.curriculum?.title}</h2>
                <p className={styles.slSubtitle}>{state.curriculum?.skillSummary}</p>
              </div>
              <button className={styles.slResetBtn} title="Neuen Skill starten" onClick={handleResetCurriculum}>↺</button>
            </div>

            {/* Progress bar */}
            {state.curriculum && (
              <div className={styles.slProgressBarWrap}>
                <div className={styles.slProgressBarTrack}>
                  <div
                    className={styles.slProgressBarFill}
                    style={{
                      width: `${Math.round((state.curriculum.modules.filter(m => m.status === 'completed').length / state.curriculum.modules.length) * 100)}%`
                    }}
                  />
                </div>
                <span className={`${styles.slLabel} ${styles.slProgressLabel}`}>
                  Modul {state.curriculum.modules.filter(m => m.status === 'completed').length} / {state.curriculum.modules.length}
                </span>
              </div>
            )}

            {/* Spaced Repetition Notification */}
            {state.spacedRepetitionQueue && state.spacedRepetitionQueue.length > 0 && (
              <div className={styles.slSrSection}>
                <span className={styles.slLabel} style={{ color: '#f5a623' }}>Kognitives Review Ausstehend</span>
                <p className={styles.slSubtitle} style={{ fontSize: '0.8rem', margin: 0 }}>
                  Du hast {state.spacedRepetitionQueue.length} ungelöste Fragen in deiner Spaced Repetition Queue. Festige sie jetzt.
                </p>
                <button className={styles.slSrBtn} onClick={() => { setSrReviewMode(true); setSrIndex(0); setSrShowAnswer(false); }}>
                  Review starten →
                </button>
              </div>
            )}

            {/* Module list */}
            <div className={styles.slModuleList}>
              {state.curriculum?.modules?.map((mod, idx) => {
                const isActive = mod.status === 'active';
                const isCompleted = mod.status === 'completed';
                const isLocked = mod.status === 'locked' || (!isActive && !isCompleted);

                return (
                  <div
                    key={mod.id || idx}
                    className={`${styles.slModuleRow} ${isActive ? styles.slModuleActive : isCompleted ? styles.slModuleCompleted : styles.slModuleLocked}`}
                  >
                    <div className={styles.slModuleStatusIcon}>
                      {isCompleted ? '✓' : isActive ? '▶' : '🔒'}
                    </div>
                    <div className={styles.slModuleInfo}>
                      <h3 className={styles.slModuleTitle}>{mod.title}</h3>
                      <p className={styles.slModuleObjective}>{mod.objective}</p>
                    </div>
                    <div className={styles.slModuleMeta}>
                      <span className={styles.slLabel}>{mod.estimatedMinutes} MIN</span>
                      {isActive && (
                        <button className={styles.slStartBtn} onClick={() => startModuleSession(idx)}>
                          STARTEN
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── SPACED REPETITION REVIEW MODE ── */}
        {srReviewMode && state.spacedRepetitionQueue && state.spacedRepetitionQueue.length > 0 && (
          <div className={styles.slSessionView}>
            <header className={styles.slSessionHeader}>
              <button className={styles.slBackBtn} onClick={() => setSrReviewMode(false)}>← Zurück zum Curriculum</button>
              <span className={styles.slEyebrow}>SPACED_REPETITION_REVIEW</span>
            </header>

            {state.spacedRepetitionQueue[srIndex] && (
              <div className={styles.slQuestionBlock}>
                <span className={styles.slLabel}>{state.spacedRepetitionQueue[srIndex].moduleTitle}</span>
                <h3 className={styles.slQuestion}>{state.spacedRepetitionQueue[srIndex].question}</h3>

                {!srShowAnswer ? (
                  <button className={styles.slShowAnswerBtn} onClick={() => setSrShowAnswer(true)}>
                    Antwort aufdecken
                  </button>
                ) : (
                  <div className={styles.slAnswerWrap}>
                    <div className={styles.slAnswerReveal}>
                      {state.spacedRepetitionQueue[srIndex].answer}
                    </div>
                    <div className={styles.slRecallActions}>
                      <button className={`${styles.slRecallBtn} ${styles.slRecallWrong}`} onClick={() => handleSrAnswer(false)}>
                        Nochmal ansehen ✗
                      </button>
                      <button className={`${styles.slRecallBtn} ${styles.slRecallCorrect}`} onClick={() => handleSrAnswer(true)}>
                        Gewusst ✓
                      </button>
                    </div>
                  </div>
                )}
                <div className={styles.slRecallProgress}>
                  Karte {srIndex + 1} von {state.spacedRepetitionQueue.length}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── PHASE 4: ACTIVE SESSION FLOW ── */}
        {state.phase === 'session' && !srReviewMode && (
          <div className={styles.slSessionView}>
            {/* Header */}
            <header className={styles.slSessionHeader}>
              <button className={styles.slBackBtn} onClick={() => updateState({ phase: 'curriculum' })}>
                ← Abbrechen
              </button>
              <div className={styles.slSessionProgress}>
                <span className={`${styles.slPhasePip} ${state.currentPhase === 'theory' ? styles.slPhasePipActive : styles.slPhasePipDone}`} />
                <span className={`${styles.slPhasePip} ${state.currentPhase === 'practice' ? styles.slPhasePipActive : state.currentPhase === 'recall' ? styles.slPhasePipDone : ''}`} />
                <span className={`${styles.slPhasePip} ${state.currentPhase === 'recall' ? styles.slPhasePipActive : ''}`} />
              </div>
            </header>

            {!sessionSuccess ? (
              <>
                {/* Active module details */}
                {state.curriculum && state.curriculum.modules?.[state.currentModuleIndex] && (
                  <div>
                    <span className={styles.slEyebrow}>MODUL {state.currentModuleIndex + 1} / {state.curriculum.modules.length}</span>
                    <h2 className={styles.slSessionTitle}>{state.curriculum.modules?.[state.currentModuleIndex]?.title}</h2>
                    <p className={styles.slSessionObjective}>{state.curriculum.modules?.[state.currentModuleIndex]?.objective}</p>
                  </div>
                )}

                {/* Phase 1: Theory */}
                {state.currentPhase === 'theory' && state.curriculum && (() => {
                  const mod = state.curriculum.modules[state.currentModuleIndex];
                  const cacheKey = `${mod?.id || state.currentModuleIndex}_${/* interest from profile or default */ 'gaming'}_grade5`;
                  // Look up from all possible cached keys (interest/grade variants)
                  const cachedTextbook = state.cachedTextbooks 
                    ? Object.entries(state.cachedTextbooks).find(([k]) => k.startsWith(mod?.id || String(state.currentModuleIndex)))?.[1] || null
                    : null;
                  return (
                    <LearnYourWay 
                      activeModule={mod}
                      skillName={state.skill}
                      onCompleteTheory={handleCompleteTheory}
                      cachedTextbook={cachedTextbook}
                      onSaveToCache={handleSaveTextbookToCache}
                      moduleId={mod?.id || String(state.currentModuleIndex)}
                    />
                  );
                })()}


                {/* Phase 2: Practice */}
                {state.currentPhase === 'practice' && state.curriculum && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                    <div className={styles.slPracticeTask}>
                      <span style={{ fontSize: '1.2rem' }}>⌘</span>
                      <div>
                        <strong style={{ display: 'block', marginBottom: '0.4rem', color: '#fff' }}>Deine Aufgabe:</strong>
                        {state.curriculum?.modules?.[state.currentModuleIndex]?.practice?.task}
                      </div>
                    </div>

                    <div className={styles.slYtSearch}>
                      <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)' }}>Hilfe-Suche: </span>
                      <a
                        className={styles.slYtLink}
                        href={`https://www.youtube.com/results?search_query=${encodeURIComponent(state.skill + ' ' + (state.curriculum?.modules?.[state.currentModuleIndex]?.practice?.youtubeQuery || ''))}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        🔎 "{state.curriculum?.modules?.[state.currentModuleIndex]?.practice?.youtubeQuery}" auf YouTube suchen
                      </a>
                    </div>

                    <div className={styles.slProofZone}>
                      <span className={styles.slLabel}>Erkenntnis-Log &amp; Notizen</span>
                      <textarea
                        className={styles.slTextarea}
                        placeholder="Notiere hier Fehler, Aha-Momente oder Heuristiken..."
                        rows="3"
                        value={state.skillNotes[state.curriculum?.modules?.[state.currentModuleIndex]?.id || ''] || ''}
                        onChange={(e) => updateState({
                          skillNotes: {
                            ...state.skillNotes,
                            [state.curriculum?.modules?.[state.currentModuleIndex]?.id || '']: e.target.value
                          }
                        })}
                      />
                    </div>

                    <button className={styles.slCtaBtn} onClick={handleCompletePractice}>
                      Praxis beendet. Weiter zum Recall →
                    </button>
                  </div>
                )}

                {/* Phase 3: Recall – AI-Powered Free Text Evaluation */}
                {state.currentPhase === 'recall' && state.curriculum && (() => {
                  const mod = state.curriculum.modules[state.currentModuleIndex];
                  const recallList = mod?.recall || [];
                  const currentQ = recallList[currentRecallIndex];
                  if (!currentQ) return null;

                  const scoreColor = !recallResult ? '#67E8F9'
                    : recallResult.semanticScore >= 80 ? '#4ade80'
                    : recallResult.semanticScore >= 60 ? '#facc15'
                    : '#f87171';

                  return (
                    <div className={styles.slQuestionBlock}>
                      {/* Progress */}
                      <span className={styles.slLabel} style={{ color: 'rgba(255,255,255,0.4)' }}>
                        RECALL / FRAGE {currentRecallIndex + 1} VON {recallList.length}
                      </span>

                      {/* Question */}
                      <h3 className={styles.slQuestion} style={{ marginTop: '0.6rem' }}>
                        {currentQ.question}
                      </h3>

                      {/* User Answer Input – only show if no result yet or was wrong with retries left */}
                      {(!recallResult || (!recallResult.isCorrect && !recallBypassUsed && recallAttempts < 2)) && (
                        <div style={{ marginTop: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                          <textarea
                            value={recallUserAnswer}
                            onChange={(e) => setRecallUserAnswer(e.target.value)}
                            placeholder="Formuliere deine Antwort in eigenen Worten..."
                            rows={3}
                            disabled={isEvaluatingRecall}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && e.ctrlKey) handleEvaluateRecall();
                            }}
                            style={{
                              width: '100%', padding: '0.9rem 1rem',
                              background: 'rgba(255,255,255,0.04)',
                              border: '1px solid rgba(255,255,255,0.12)',
                              borderRadius: '10px', color: '#fff', resize: 'vertical',
                              fontFamily: 'inherit', fontSize: '0.88rem', lineHeight: 1.6,
                              outline: 'none', transition: 'border-color 0.2s',
                              opacity: isEvaluatingRecall ? 0.6 : 1
                            }}
                          />
                          <div style={{ display: 'flex', gap: '0.7rem', alignItems: 'center' }}>
                            <button
                              onClick={handleEvaluateRecall}
                              disabled={!recallUserAnswer.trim() || isEvaluatingRecall}
                              style={{
                                flex: 1, padding: '0.7rem 1rem',
                                background: isEvaluatingRecall || !recallUserAnswer.trim() 
                                  ? 'rgba(251,113,133,0.3)' : 'rgba(251,113,133,0.85)',
                                border: 'none', borderRadius: '8px', color: '#fff',
                                fontWeight: 600, fontSize: '0.85rem', cursor: isEvaluatingRecall || !recallUserAnswer.trim() ? 'not-allowed' : 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                                transition: 'all 0.2s'
                              }}
                            >
                              {isEvaluatingRecall ? (
                                <>
                                  <span style={{
                                    width: 14, height: 14, borderRadius: '50%',
                                    border: '2px solid rgba(255,255,255,0.3)',
                                    borderTopColor: '#fff',
                                    animation: 'spin 0.8s linear infinite',
                                    display: 'inline-block', flexShrink: 0
                                  }} />
                                  KI bewertet...
                                </>
                              ) : 'Antwort einreichen →'}
                            </button>
                            <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)' }}>
                              Ctrl+Enter
                            </span>
                          </div>

                          {/* Bypass button – appears after 2 failed attempts */}
                          {recallAttempts >= 2 && !recallBypassUsed && (
                            <button
                              onClick={handleRecallBypass}
                              style={{
                                padding: '0.55rem 1rem',
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '8px', color: 'rgba(255,255,255,0.5)',
                                fontSize: '0.78rem', cursor: 'pointer'
                              }}
                            >
                              Antwort aufdecken (Spaced Repetition wird aktiviert)
                            </button>
                          )}
                        </div>
                      )}

                      {/* AI Evaluation Result */}
                      {recallResult && (
                        <div style={{
                          marginTop: '1.2rem',
                          background: recallResult.isCorrect 
                            ? 'rgba(74,222,128,0.06)' 
                            : recallBypassUsed ? 'rgba(255,255,255,0.04)' : 'rgba(248,113,113,0.06)',
                          border: `1px solid ${recallResult.isCorrect ? 'rgba(74,222,128,0.2)' : recallBypassUsed ? 'rgba(255,255,255,0.08)' : 'rgba(248,113,113,0.2)'}`,
                          borderRadius: '12px', padding: '1.1rem 1.2rem',
                          display: 'flex', flexDirection: 'column', gap: '0.7rem'
                        }}>
                          {/* Score Header */}
                          {!recallBypassUsed && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                              <span style={{ fontSize: '1.2rem' }}>
                                {recallResult.isCorrect ? '✅' : '❌'}
                              </span>
                              <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                                  <span style={{ fontSize: '0.72rem', color: scoreColor, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                                    {recallResult.isCorrect ? 'Korrekt' : 'Nicht ganz'}
                                  </span>
                                  <span style={{ fontSize: '0.72rem', color: scoreColor, fontWeight: 700 }}>
                                    {recallResult.semanticScore}%
                                  </span>
                                </div>
                                <div style={{ height: '4px', background: 'rgba(255,255,255,0.08)', borderRadius: '2px', overflow: 'hidden' }}>
                                  <div style={{
                                    height: '100%', width: `${recallResult.semanticScore}%`,
                                    background: scoreColor, borderRadius: '2px',
                                    transition: 'width 0.6s ease'
                                  }} />
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Glows & Grows Feedback */}
                          <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.65 }}>
                            {recallResult.feedback.split('Grows:').map((part, i) => (
                              <p key={i} style={{ margin: i > 0 ? '0.4rem 0 0' : '0' }}>
                                {i === 0 
                                  ? <><span style={{ color: '#4ade80', fontWeight: 600 }}>Glows:</span>{part.replace('Glows:', '')}</>
                                  : <><span style={{ color: '#facc15', fontWeight: 600 }}>Grows:</span>{part}</>
                                }
                              </p>
                            ))}
                          </div>

                          {/* Action Buttons */}
                          <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.3rem' }}>
                            {recallResult.isCorrect || recallBypassUsed ? (
                              // Advance to next question
                              <button
                                onClick={() => advanceRecall()}
                                style={{
                                  flex: 1, padding: '0.65rem 1rem',
                                  background: 'rgba(74,222,128,0.15)',
                                  border: '1px solid rgba(74,222,128,0.3)',
                                  borderRadius: '8px', color: '#4ade80',
                                  fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer'
                                }}
                              >
                                {currentRecallIndex + 1 < recallList.length ? 'Weiter →' : 'Modul abschließen ✓'}
                              </button>
                            ) : (
                              // Retry
                              <button
                                onClick={() => {
                                  setRecallResult(null);
                                  setRecallUserAnswer('');
                                }}
                                style={{
                                  flex: 1, padding: '0.65rem 1rem',
                                  background: 'rgba(255,255,255,0.06)',
                                  border: '1px solid rgba(255,255,255,0.12)',
                                  borderRadius: '8px', color: 'rgba(255,255,255,0.7)',
                                  fontSize: '0.85rem', cursor: 'pointer'
                                }}
                              >
                                Nochmal versuchen ({2 - recallAttempts} Versuch{2 - recallAttempts === 1 ? '' : 'e'} übrig)
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

              </>
            ) : (
              /* Session Success State */
              <div className={styles.slCompleteState}>
                <span style={{ fontSize: '2.5rem', color: '#FB7185' }}>✨</span>
                <h2 className={styles.slTitle} style={{ fontSize: '1.4rem', marginTop: '0.8rem' }}>Modul abgeschlossen!</h2>
                <p className={styles.slSubtitle} style={{ maxWidth: '400px', margin: '0.5rem auto 1.5rem auto' }}>
                  Hervorragende deliberate Practice. Die neuronalen Verknüpfungen wurden konsolidiert.
                </p>
                <div className={styles.slCompleteActions}>
                  <button className={styles.slCtaBtn} onClick={() => updateState({ phase: 'curriculum' })}>
                    Zurück zum Curriculum
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
