import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

const PRONOIA_TIPS = [
  "Trinke morgens 500ml Wasser mit einer Prise Salz und Zitrone vor deinem ersten Kaffee. Das rehydriert deine Zellen und verhindert Nebennieren-Stress.",
  "Nutze die 90-Minuten Ultra-Rhythmen für Deep Work. Mach danach 15 Minuten Pause mit geschlossenen Augen (NSDR) zur schnellen Dopamin-Synthese.",
  "Nimm dein Koffein erst 90–120 Minuten nach dem Aufwachen. Das verhindert den Nachmittags-Crash, da das Adenosin sich natürlich abbauen kann.",
  "Bio-Stacking-Tipp: Kombiniere L-Theanin mit Koffein im Verhältnis 2:1 für sauberen Fokus ohne Zittrigkeit.",
  "Reguliere dein biologisches System: Erhalte in den ersten 30 Minuten nach dem Aufstehen 10 Minuten direktes Sonnenlicht.",
  "Reduziere Blaulicht ab 20:00 Uhr radikal. Benutze Rotlicht oder eine Blaulichtfilter-Brille, um die Melatoninsynthese nicht zu blockieren.",
  "Kalt duschen am Morgen erhöht das zirkulierende Dopamin um bis zu 250% für mehrere Stunden ohne den typischen Stimulanzien-Crash."
];

function getLocalChatFallback(prompt) {
  const p = prompt.toLowerCase();
  if (/status|bereit|active|nominal/.test(p)) {
    return "Status: Nominal. Alle kognitiven Subsysteme synchronisiert.";
  }
  if (/focus|arbeit|deep|concentration/.test(p)) {
    return "A.01 Flow Architect: Kognitiver Fokus bei 94% Effizienz. Deep Work aktiv.";
  }
  if (/stack|supplement|px|pill|dosis/.test(p)) {
    return "A.02 Fuel Scheduler: Bio-Stack Peak-Absorption nominal. Hydration prüfen.";
  }
  if (/schlaf|sleep|sommeil/.test(p)) {
    return "A.03 Circadian Guardian: Melatonin-Synthese geschützt. Licht im Rotbereich.";
  }
  if (/hrv|recovery|regeneration/.test(p)) {
    return "A.04 Load Balancer: PNS-Aktivierung aktiv. HRV nominal.";
  }
  return "Systemstatus nominal. Offline-Modus aktiv.";
}

// ── Bestehender Endpoint (unverändert) ─────────────────────────
// ── Helper: Generate offline fallback textbook from topic ─────────────────────
function generateOfflineTextbook(topic, interest, grade) {
  const t = topic || 'Lernthema';
  const gradeLabel = grade === 'grade11' ? '(Fortgeschritten, 11. Klasse)' : '(Einfach, 5. Klasse)';
  const interestEmoji = interest === 'gaming' ? '🎮' : interest === 'soccer' ? '⚽' : '🎨';
  const interestLabel = interest === 'gaming' ? 'Gaming' : interest === 'soccer' ? 'Sport' : 'Kunst';

  const paragraph0 = `${t} ist ein fundamentales Konzept, das die Grundlage für weiterführendes Verständnis bildet. Um ${t} zu meistern, ist es entscheidend, die Kernprinzipien systematisch zu durchdringen. Der erste Schritt ist immer das Verständnis der zugrunde liegenden Mechanismen – bevor man zu komplexeren Anwendungen übergeht.`;
  const paragraph1 = `Im zweiten Schritt betrachten wir, wie ${t} in der Praxis angewendet wird. Muster und Zusammenhänge werden sichtbar, wenn man reale Beispiele analysiert. Durch gezieltes Üben (Deliberate Practice) werden diese Muster automatisiert und das Arbeitsgedächtnis für höhere kognitive Leistungen freigesetzt.`;
  const paragraph2 = `Auf dem fortgeschrittenen Niveau lernen wir, ${t} in unvorhergesehenen Kontexten flexibel einzusetzen. Active Recall und Spaced Repetition sind dabei unverzichtbare Methoden. Wahre Meisterschaft zeigt sich, wenn das Gelernte mühelos auf neue, unbekannte Situationen übertragen werden kann.`;

  const interestPersonalization = grade === 'grade5'
    ? `${interestEmoji} ${interestLabel}-Analogie: ${t} ist wie das Erlernen eines neuen Moves in deinem Lieblingsspiel. Zuerst klappt es nicht, aber durch Wiederholung wird es zur zweiten Natur.`
    : `${interestEmoji} ${interestLabel}-Analogie ${gradeLabel}: ${t} verhält sich wie ein komplexes Spielmechanik-System – tiefes Verständnis der Mechaniken erlaubt es dir, Strategien zu entwickeln, die weit über einfaches Ausführen hinausgehen.`;

  return {
    sections: [
      { id: 'sec-0', title: `1. Kernprinzipien von ${t}`, paragraphIdx: 0, questionId: 'q-embed-0' },
      { id: 'sec-1', title: `2. Anwendung & Muster`, paragraphIdx: 1, questionId: 'q-embed-1' },
      { id: 'sec-2', title: `3. Fortgeschrittene Meisterschaft`, paragraphIdx: 2, questionId: 'q-embed-2' }
    ],
    originalText: `${paragraph0}\n\n${paragraph1}\n\n${paragraph2}`,
    personalizations: {
      text: interestPersonalization
    },
    timeline: {
      title: `Lernpfad: ${t} Schritt für Schritt`,
      steps: [
        { id: 'step-1', label: `Grundbegriffe von ${t} verstehen`, order: 1 },
        { id: 'step-2', label: `Erste Beispiele analysieren`, order: 2 },
        { id: 'step-3', label: `Eigene Übungsaufgaben lösen`, order: 3 },
        { id: 'step-4', label: `Komplexere Anwendung meistern`, order: 4 }
      ]
    },
    memoryAid: {
      title: `Mnemonic für ${t}`,
      mnemonic: t.slice(0, 4).toUpperCase(),
      meaning: `Ein Gedächtnis-Anker, der die Kernessenz von ${t} repräsentiert.`
    },
    slides: [
      {
        title: `1. Was ist ${t}?`,
        bullets: ['Kernprinzip verstehen', 'Komplexe Probleme zerlegen', 'Fundament vor Vertiefung'],
        narration: `Willkommen. Heute tauchen wir in das Thema ${t} ein. Das Wichtigste ist: Verstehe das Grundprinzip zuerst, bevor du zu den Details gehst.`
      },
      {
        title: `2. ${t} in der Praxis`,
        bullets: ['Muster erkennen', 'Deliberate Practice anwenden', 'Fehler als Feedback nutzen'],
        narration: `Im zweiten Teil sehen wir, wie ${t} praktisch funktioniert. Muster erkennen und gezielt üben – das ist der Schlüssel zum Fortschritt.`
      },
      {
        title: `3. Meisterschaft in ${t}`,
        bullets: ['Active Recall einsetzen', 'Spaced Repetition planen', 'Transfer auf neue Probleme'],
        narration: `Im dritten Teil geht es um echte Meisterschaft. Active Recall und Spaced Repetition sind wissenschaftlich bewiesene Methoden, um Gelerntes dauerhaft zu verankern.`
      }
    ],
    audioLesson: [
      { speaker: 'Lehrer', text: `Hallo! Heute besprechen wir ${t}. Was weißt du schon darüber?` },
      { speaker: 'Schüler', text: `Ich habe ein paar Grundkenntnisse, aber der tiefere Zusammenhang fehlt mir noch.` },
      { speaker: 'Lehrer', text: `Perfekt. Lass uns beim Fundament anfangen: ${paragraph0.slice(0, 150)}...` },
      { speaker: 'Schüler', text: `Ah, das macht Sinn! Dann ist die Basis wirklich entscheidend.` },
      { speaker: 'Lehrer', text: `Genau. Und wenn die Basis sitzt, passiert das hier: ${paragraph1.slice(0, 150)}...` },
      { speaker: 'Schüler', text: `Ich verstehe, also müssen wir Muster automatisieren, um freie Kapazität zu schaffen.` }
    ],
    mindmap: {
      name: t,
      children: [
        { name: 'Grundlagen', children: [{ name: 'Kernprinzipien' }, { name: 'Definitionen' }] },
        { name: 'Anwendung', children: [{ name: 'Beispiele' }, { name: 'Muster' }] },
        { name: 'Meisterschaft', children: [{ name: 'Active Recall' }, { name: 'Spaced Repetition' }] }
      ]
    },
    embeddedQuestions: [
      {
        id: 'q-embed-0',
        question: `Was ist der wichtigste erste Schritt beim Erlernen von ${t}?`,
        options: [
          'Das Fundament und die Kernprinzipien systematisch verstehen.',
          'Sofort mit komplexen Projekten beginnen.',
          'Möglichst viele Informationen gleichzeitig aufnehmen.',
          'Das Thema überspringen und zu Fortgeschrittenem springen.'
        ],
        answerIdx: 0,
        explanation: `Korrekt! Beim Lernen von ${t} ist es entscheidend, erst das Fundament zu festigen, bevor man zu komplexeren Inhalten übergeht.`
      },
      {
        id: 'q-embed-1',
        question: `Was ist Deliberate Practice im Kontext von ${t}?`,
        options: [
          'Zufälliges Üben ohne spezifisches Ziel.',
          'Gezielte, fokussierte Übung mit Feedback an den schwierigsten Aspekten.',
          'Passives Lesen von Texten über das Thema.',
          'Das Memorieren von auswendig gelernten Fakten.'
        ],
        answerIdx: 1,
        explanation: `Deliberate Practice bedeutet gezieltes, fokussiertes Üben mit ständigem Feedback – der wissenschaftlich effektivste Weg zur Meisterschaft.`
      },
      {
        id: 'q-embed-2',
        question: `Welche Technik verankert Gelerntes am nachhaltigsten im Langzeitgedächtnis?`,
        options: [
          'Marathon-Lernsessions ohne Pause.',
          'Das Ignorieren von Fehlern.',
          'Active Recall kombiniert mit Spaced Repetition.',
          'Einmaliges Durchlesen kurz vor dem Test.'
        ],
        answerIdx: 2,
        explanation: `Active Recall und Spaced Repetition sind wissenschaftlich bewiesen die effektivsten Methoden zur langfristigen Wissenskonsolidierung.`
      }
    ],
    quiz: [
      {
        question: `In welcher Reihenfolge sollte man ${t} erlernen?`,
        options: [
          'Fortgeschritten → Grundlagen → Anwendung',
          'Grundlagen → Muster erkennen → Flexible Anwendung',
          'Direkt mit Praxisprojekten beginnen → dann Theorie',
          'Alle Bereiche gleichzeitig und unsystematisch angehen'
        ],
        answerIdx: 1,
        explanation: `Die optimale Lernreihenfolge ist: Fundament (Grundlagen) → Muster erkennen (Anwendung) → Transfer auf neue Situationen (Meisterschaft).`
      },
      {
        question: `Was beschreibt "Cognitive Load" beim Lernen von ${t}?`,
        options: [
          'Die Menge an Büchern, die man zu einem Thema liest.',
          'Die Belastung des Arbeitsgedächtnisses durch kognitive Aufgaben.',
          'Die physische Ermüdung beim Lernen.',
          'Die Anzahl der Prüfungen, die man ablegen muss.'
        ],
        answerIdx: 1,
        explanation: `Cognitive Load beschreibt die Belastung des Arbeitsgedächtnisses. Automatisierte Muster reduzieren diese Last und ermöglichen tieferes Denken.`
      }
    ]
  };
}

// ── Helper: Offline keyword-based semantic scoring ────────────────────────────
function offlineEvaluateAnswer(question, referenceAnswer, userAnswer) {
  if (!userAnswer || userAnswer.trim().length < 5) {
    return {
      isCorrect: false,
      semanticScore: 0,
      feedback: 'Glows: Du hast versucht zu antworten. Grows: Deine Antwort ist zu kurz – versuche, die Kernaussage in einem vollständigen Satz zu formulieren.'
    };
  }

  const normalize = (str) => str.toLowerCase()
    .replace(/[äöüß]/g, c => ({ 'ä': 'ae', 'ö': 'oe', 'ü': 'ue', 'ß': 'ss' }[c] || c))
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 3); // ignore short words

  const stopwords = new Set(['dass', 'dies', 'eine', 'einen', 'einem', 'einer', 'oder', 'aber', 'auch', 'noch', 'wird', 'werden', 'durch', 'beim', 'nach', 'über', 'unter', 'sind', 'werden', 'kann', 'wenn', 'damit', 'from', 'that', 'with', 'this', 'what', 'have', 'they', 'will', 'more', 'about']);

  const refWords = normalize(referenceAnswer).filter(w => !stopwords.has(w));
  const userWords = new Set(normalize(userAnswer).filter(w => !stopwords.has(w)));

  if (refWords.length === 0) {
    return { isCorrect: true, semanticScore: 100, feedback: 'Glows: Antwort akzeptiert. Grows: Versuche, deine Antwort noch präziser zu formulieren.' };
  }

  // Count matching keywords (with partial match bonus)
  let exactMatches = 0;
  let partialMatches = 0;
  for (const refWord of refWords) {
    if (userWords.has(refWord)) {
      exactMatches++;
    } else {
      // Check if any user word contains or is contained in refWord (partial match)
      for (const userWord of userWords) {
        if (refWord.includes(userWord) || userWord.includes(refWord)) {
          partialMatches++;
          break;
        }
      }
    }
  }

  const score = Math.round(((exactMatches + partialMatches * 0.5) / refWords.length) * 100);
  const clampedScore = Math.min(100, Math.max(0, score));
  const isCorrect = clampedScore >= 60; // slightly lower threshold for keyword matching

  let feedback;
  if (clampedScore >= 80) {
    feedback = `Glows: Ausgezeichnet! Du hast die Kernaussage klar und präzise formuliert. Grows: Für noch mehr Tiefe könntest du ergänzen: "${referenceAnswer.slice(0, 80)}..."`;
  } else if (clampedScore >= 60) {
    feedback = `Glows: Du hast die wichtigsten Begriffe erfasst und die Richtung stimmt. Grows: Präzisiere deine Antwort – die Musterlösung lautet: "${referenceAnswer.slice(0, 100)}..."`;
  } else if (clampedScore >= 30) {
    feedback = `Glows: Guter Versuch – du hast zumindest angefangen, das Thema anzugehen. Grows: Deine Antwort weicht noch deutlich ab. Die korrekte Kernaussage ist: "${referenceAnswer.slice(0, 100)}..."`;
  } else {
    feedback = `Glows: Du hast dich mit der Frage auseinandergesetzt. Grows: Leider trifft deine Antwort nicht den Kern. Lies die Theorie nochmal durch. Richtig ist: "${referenceAnswer}"`;
  }

  return { isCorrect, semanticScore: clampedScore, feedback };
}

// ── Helper: Generate offline fallback workout from config ─────────────────────
function generateOfflineWorkout(focus, level, minutes, equipment) {
  const f = (focus || 'Ganzkörper').trim();
  const lvl = level === 'advanced' ? 'Fortgeschritten' : level === 'beginner' ? 'Einsteiger' : 'Mittel';
  const mins = Number(minutes) > 0 ? Number(minutes) : 45;
  const eq = equipment || 'Freie Gewichte';

  // Movement pools.
  const PUSH = [
    { name: 'Bankdrücken', muscle: 'Brust', note: 'Schulterblätter zurückziehen, kontrollierte Negativbewegung.' },
    { name: 'Schrägbankdrücken Kurzhantel', muscle: 'Obere Brust', note: 'Ellbogen leicht eingedreht, voller Bewegungsradius.' },
    { name: 'Schulterdrücken stehend', muscle: 'Schultern', note: 'Core anspannen, kein Hohlkreuz.' },
    { name: 'Seitheben', muscle: 'Seitliche Schulter', note: 'Leichtes Gewicht, sauber bis Schulterhöhe.' },
    { name: 'Trizeps-Drücken am Kabel', muscle: 'Trizeps', note: 'Ellbogen fixiert, oben kurz halten.' }
  ];
  const PULL = [
    { name: 'Klimmzüge', muscle: 'Latissimus', note: 'Voller Hang unten, Brust zur Stange.' },
    { name: 'Langhantelrudern', muscle: 'Oberer Rücken', note: 'Rücken gerade, zum Bauchnabel ziehen.' },
    { name: 'Latzug eng', muscle: 'Latissimus', note: 'Schulterblätter zuerst, dann Arme.' },
    { name: 'Face Pulls', muscle: 'Hintere Schulter', note: 'Hohe Wiederholungen, Haltung im Fokus.' },
    { name: 'Bizeps-Curls Kurzhantel', muscle: 'Bizeps', note: 'Keine Schwungbewegung, oben anspannen.' }
  ];
  const LEGS = [
    { name: 'Kniebeugen', muscle: 'Quadrizeps', note: 'Tief bis parallel, Knie folgen den Zehen.' },
    { name: 'Rumänisches Kreuzheben', muscle: 'Beinbeuger', note: 'Hüfte zurück, Stange nah am Körper.' },
    { name: 'Beinpresse', muscle: 'Quadrizeps', note: 'Knie nicht durchstrecken.' },
    { name: 'Ausfallschritte', muscle: 'Gesäß', note: 'Langer Schritt, Oberkörper aufrecht.' },
    { name: 'Wadenheben', muscle: 'Waden', note: 'Volle Dehnung unten, oben kurz halten.' }
  ];
  const CORE = [
    { name: 'Plank', muscle: 'Core', note: 'Gerade Linie von Kopf bis Ferse, Bauch fest.' },
    { name: 'Hängendes Beinheben', muscle: 'Unterer Bauch', note: 'Kontrolliert, kein Schwung.' },
    { name: 'Russian Twists', muscle: 'Schräge Bauchmuskeln', note: 'Brust raus, langsam rotieren.' },
    { name: 'Crunches am Kabel', muscle: 'Gerader Bauch', note: 'Mit dem Bauch einrollen, nicht mit der Hüfte.' }
  ];

  // Pick a movement pool based on the focus keyword (most specific first).
  const fl = f.toLowerCase();
  let pool;
  if (/upper|oberkör|oberkoer|ober body/.test(fl)) {
    // Mixed upper body — push + pull + arms
    pool = [PUSH[0], PULL[1], PUSH[2], PULL[0], PUSH[4], PULL[4]];
  } else if (/lower|unterkör|unterkoer/.test(fl)) {
    pool = LEGS;
  } else if (/push|brust|chest|drück|druck|press/.test(fl)) {
    pool = PUSH;
  } else if (/pull|rücken|ruecken|back|zug|bizeps|lat\b|klimm/.test(fl)) {
    pool = PULL;
  } else if (/bein|legs|squat|kniebeug|glute|gesäß|gesaess|wade|quad|po\b/.test(fl)) {
    pool = LEGS;
  } else if (/core|bauch|abs|rumpf|plank/.test(fl)) {
    pool = CORE;
  } else {
    // Ganzkörper / unbekannt → ausgewogener Full-Body-Plan
    pool = [LEGS[0], PUSH[0], PULL[1], PUSH[2], LEGS[1], CORE[0]];
  }

  // Volume scales with level + time budget.
  const sets = level === 'advanced' ? 4 : level === 'beginner' ? 3 : 4;
  const reps = level === 'advanced' ? '6-8' : level === 'beginner' ? '12-15' : '8-12';
  const restSec = level === 'advanced' ? 120 : level === 'beginner' ? 60 : 90;
  const count = Math.max(3, Math.min(pool.length, Math.round(mins / 10)));

  return {
    title: `${f} – ${lvl}`,
    focus: f,
    estMinutes: mins,
    equipment: eq,
    warmup: '5–8 Min lockeres Cardio + dynamisches Mobilisieren der beteiligten Gelenke.',
    exercises: pool.slice(0, count).map((ex) => ({
      name: ex.name,
      sets,
      reps,
      restSec,
      muscle: ex.muscle,
      note: ex.note
    })),
    coachNote: `${lvl}-Plan über ${mins} Min mit ${eq}. Letzte Wiederholung jeder Übung nahe am Muskelversagen, Technik vor Gewicht.`
  };
}

// ── Helper: offline fallback behavior-change plan ──────────────────────────────
// Grounded in Applied Behavior Analysis (Kazdin: ABC-Analyse, Verstärkung,
// Löschung + konkurrierendes Verhalten, Reizkontrolle, Selbstbeobachtung),
// Kontrolltheorie der Selbstregulation (Carver & Scheier: Feedbackschleifen),
// dem Gewohnheits-Loop (Cue→Routine→Reward) und Umsetzungsintentionen
// (Gollwitzer: "Wenn X, dann Y"). Used when no MISTRAL_API_KEY / API fails.
function generateOfflineBehaviorPlan(kind, title, cue, reward) {
  const t = (title || 'dieses Verhalten').trim();
  const c = (cue || '').trim();
  const r = (reward || '').trim();
  const cuePart = c || 'der typische Auslöser (Ort, Uhrzeit, Gefühl oder vorausgehende Handlung)';

  if (kind === 'quit') {
    return {
      kind,
      summary: `Unerwünschtes Verhalten werden selten durch reine Willenskraft gelöscht, sondern indem der Auslöser entschärft und durch ein konkurrierendes Verhalten ersetzt wird.`,
      cueAnalysis: `Identifiziere den Auslöser von „${t}“: ${cuePart}. Mache den Auslöser sichtbar und erhöhe die Reibung (Reizkontrolle) – entferne Hinweisreize aus deiner Umgebung.`,
      replacementBehavior: `Lege ein konkurrierendes Verhalten fest, das denselben Bedarf deckt${r ? ` wie „${r}“` : ''} – z. B. kurz aufstehen und Wasser trinken, sobald der Drang auftritt.`,
      implementationIntention: `Wenn ${c || '[Auslöser]'} auftritt, dann mache ich stattdessen [Ersatzverhalten].`,
      reinforcement: `Mache die alte Belohnung schwerer erreichbar und belohne jeden ausgelassenen Durchgang sofort (Häkchen, kurze Selbst-Anerkennung). Löschung wirkt, wenn das alte Verhalten konsequent unbelohnt bleibt.`,
      firstTinyStep: `Heute nur den nächsten einzelnen Auslöser bemerken und notieren – noch nichts erzwingen. Selbstbeobachtung ist der erste Hebel der Veränderung.`,
      tips: [
        { text: 'Entferne einen einzigen Hinweisreiz aus deiner Umgebung.', basis: 'Reizkontrolle (ABA, Kazdin)' },
        { text: 'Tracke jeden Tag mit/ohne das Verhalten – die Kurve selbst motiviert.', basis: 'Selbstregulation durch Feedback (Carver & Scheier)' },
        { text: 'Plane das Ersatzverhalten als „Wenn-Dann“ vorab.', basis: 'Umsetzungsintention (Gollwitzer)' }
      ]
    };
  }

  if (kind === 'change') {
    return {
      kind,
      summary: `Verhalten zu verändern heißt: denselben Auslöser behalten, aber die Routine durch eine bessere ersetzen, die eine vergleichbare Belohnung liefert.`,
      cueAnalysis: `Behalte den bestehenden Auslöser von „${t}“: ${cuePart}. Du musst den Cue nicht abschaffen – du leitest ihn auf eine neue Routine um.`,
      replacementBehavior: `Definiere die neue, bessere Routine möglichst konkret und winzig, sodass sie bei wenig Motivation noch gelingt (Fogg: Verhalten verkleinern).`,
      implementationIntention: `Wenn ${c || '[Auslöser]'}, dann führe ich [neue Routine] aus.`,
      reinforcement: `Sichere dir unmittelbar nach der neuen Routine eine kleine Belohnung${r ? ` (z. B. „${r}“)` : ''} und feiere den Vollzug bewusst – sofortige Verstärkung verankert die neue Schleife.`,
      firstTinyStep: `Führe die neue Routine heute ein einziges Mal in Mini-Form aus, direkt nach dem Auslöser.`,
      tips: [
        { text: 'Halte den Auslöser konstant, tausche nur die Routine.', basis: 'Gewohnheits-Loop (Cue→Routine→Reward)' },
        { text: 'Verkleinere das Verhalten, bis es fast nicht scheitern kann.', basis: 'Tiny Habits / B=MAP (Fogg)' },
        { text: 'Beobachte den Fortschritt gegen einen klaren Standard.', basis: 'Kontrolltheorie (Carver & Scheier)' }
      ]
    };
  }

  // default: 'build'
  return {
    kind: 'build',
    summary: `Ein neues Verhalten wächst, wenn es an einen bestehenden Anker gekoppelt, klein gehalten und sofort verstärkt wird.`,
    cueAnalysis: `Wähle einen verlässlichen Auslöser für „${t}“: ${cuePart}. Am stabilsten ist ein bestehender Tagesanker (nach dem Zähneputzen, nach dem ersten Kaffee).`,
    replacementBehavior: `Starte mit einer Mini-Version von „${t}“, die in unter zwei Minuten erledigt ist – die Hürde sinkt, die Wiederholung steigt.`,
    implementationIntention: `Wenn ${c || '[Anker/Auslöser]'}, dann tue ich ${t} (in Mini-Form).`,
    reinforcement: `Belohne dich sofort nach Ausführung${r ? ` mit „${r}“` : ' – und sei es nur ein bewusstes „gut gemacht“'}. Unmittelbare Verstärkung erhöht die Wiederholwahrscheinlichkeit.`,
    firstTinyStep: `Heute die kleinstmögliche Version genau einmal ausführen, direkt nach deinem Anker.`,
    tips: [
      { text: 'Koppele das neue Verhalten an eine bestehende Gewohnheit.', basis: 'Habit Stacking / Anker (Fogg)' },
      { text: 'Mach den Auslöser offensichtlich und das Verhalten leicht.', basis: 'Reizkontrolle & Vereinfachung (ABA)' },
      { text: 'Tägliches Abhaken sichtbar machen – Streaks geben Feedback.', basis: 'Selbstbeobachtung & Feedback (Carver & Scheier)' }
    ]
  };
}

// ── Helper: offline fallback diary entry composed from the day's data ──────────
function generateOfflineDiaryEntry(data) {
  const { dateLabel, gymSummary, biometrics, focusMinutes, plannedBlocks, futureSelf } = data || {};
  const hrv = biometrics?.hrv;
  const sleep = biometrics?.sleep;
  const focus = biometrics?.focus;
  const identity = futureSelf?.identity;
  const values = Array.isArray(futureSelf?.values) ? futureSelf.values : [];

  const body = [];
  body.push(`${dateLabel || 'Heute'} — ein weiterer Tag auf dem Weg zu der Person, die ich werde.`);

  const did = [];
  if (focusMinutes > 0) did.push(`${focusMinutes} Minuten in fokussierter Tiefe gearbeitet`);
  if (Array.isArray(plannedBlocks) && plannedBlocks.length) {
    did.push(`den Tag um ${plannedBlocks.slice(0, 3).join(', ')} herum strukturiert`);
  }
  if (gymSummary) did.push(gymSummary);
  if (did.length) {
    body.push(`Was ich getan habe: ${did.join('; ')}.`);
  }

  const bio = [];
  if (hrv) bio.push(`HRV ${hrv} ms`);
  if (sleep) bio.push(`Schlaf ${sleep}%`);
  if (focus) bio.push(`Fokus ${focus}%`);
  if (bio.length) {
    body.push(`Mein Körper meldete heute ${bio.join(', ')} — ein ehrlicher Spiegel meiner Regeneration und meiner Energie.`);
  }

  body.push(
    values.length
      ? `Ich erinnere mich an das, was mich trägt: ${values.slice(0, 3).join(', ')}. Genau hier, in den kleinen Entscheidungen des Tages, entsteht die Version von mir, die ich anstrebe.`
      : 'In den kleinen Entscheidungen des Tages entsteht die Version von mir, die ich anstrebe.'
  );

  const tags = ['TAGEBUCH'];
  if (gymSummary) tags.push('TRAINING');
  if (focusMinutes > 0) tags.push('DEEP WORK');

  const hint = identity
    ? `Du bist heute einen Schritt näher an „${identity}" gekommen. Bleib standhaft — die Wiederholung formt dich.`
    : 'Du warst heute standhafter, als du denkst. Die kleinen Gewohnheiten beginnen, dich zu formen.';

  return {
    title: focusMinutes > 0 || gymSummary ? 'Ein Tag der Substanz.' : 'Ein ruhiger Tag des Werdens.',
    content: body.join('\n\n'),
    tags,
    future_self_hint: hint
  };
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { prompt, systemPrompt, tools, tool_choice, action } = body;


    const apiKey = process.env.MISTRAL_API_KEY;
    const hasApiKey = apiKey && apiKey !== 'REPLACE_ME';

    // ── NEW ACTIONS: generate_augmented_textbook & evaluate_recall_answer ──────
    if (action === 'generate_augmented_textbook') {
      const { topic, interest, grade } = body;
      const interestLabel = interest === 'gaming' ? 'Gaming/Videospiele' : interest === 'soccer' ? 'Fußball/Sport' : 'Kunst/Kreativität';
      const gradeLabel = grade === 'grade11' ? '11. Klasse (gymnasiales Niveau, analytisch, mit Fachbegriffen)' : '5. Klasse (einfache Sprache, anschauliche Beispiele)';

      if (!hasApiKey) {
        // Rich offline fallback
        return NextResponse.json(generateOfflineTextbook(topic, interest, grade));
      }

      // Live Mistral call – structured JSON output
      const tbSystemPrompt = `Du bist ein erstklassiger Lerninhalt-Architekt. Erstelle ein vollständiges, didaktisch hochwertiges Lernmodul im JSON-Format.
WICHTIG: Antworte AUSSCHLIESSLICH mit validem JSON. Kein Markdown, kein Erklärungs-Text davor oder danach.`;

      const tbPrompt = `Erstelle ein vollständiges Lernmodul für das Thema: "${topic}"
Personalisierung für: ${interestLabel}
Klassenstufe: ${gradeLabel}

Pflicht-JSON-Struktur (EXAKT so zurückgeben):
{
  "sections": [
    {"id": "sec-0", "title": "1. [Abschnittstitel]", "paragraphIdx": 0, "questionId": "q-embed-0"},
    {"id": "sec-1", "title": "2. [Abschnittstitel]", "paragraphIdx": 1, "questionId": "q-embed-1"},
    {"id": "sec-2", "title": "3. [Abschnittstitel]", "paragraphIdx": 2, "questionId": "q-embed-2"}
  ],
  "originalText": "[Paragraph 0: 120-180 Wörter, sachlich, ohne Personalisierung]\\n\\n[Paragraph 1: 120-180 Wörter, Anwendung und Muster]\\n\\n[Paragraph 2: 120-180 Wörter, fortgeschrittenes Niveau, Transfer]",
  "personalizations": {
    "text": "[Eine zusammenhängende Analogie zum Thema, angepasst für ${interestLabel} auf ${gradeLabel}-Niveau. 80-120 Wörter.]"
  },
  "timeline": {
    "title": "[Passender Timeline-Titel]",
    "steps": [
      {"id": "step-1", "label": "[Schritt 1]", "order": 1},
      {"id": "step-2", "label": "[Schritt 2]", "order": 2},
      {"id": "step-3", "label": "[Schritt 3]", "order": 3},
      {"id": "step-4", "label": "[Schritt 4]", "order": 4}
    ]
  },
  "memoryAid": {
    "title": "[Mnemonic-Titel]",
    "mnemonic": "[3-5 Buchstaben Akronym]",
    "meaning": "[Erklärung des Akronyms, was jeder Buchstabe bedeutet]"
  },
  "slides": [
    {"title": "[Folientitel 1]", "bullets": ["[Bullet A]", "[Bullet B]", "[Bullet C]"], "narration": "[40-60 Wörter Sprechtext]"},
    {"title": "[Folientitel 2]", "bullets": ["[Bullet A]", "[Bullet B]", "[Bullet C]"], "narration": "[40-60 Wörter Sprechtext]"},
    {"title": "[Folientitel 3]", "bullets": ["[Bullet A]", "[Bullet B]", "[Bullet C]"], "narration": "[40-60 Wörter Sprechtext]"}
  ],
  "audioLesson": [
    {"speaker": "Lehrer", "text": "[Einstiegs-Frage zum Thema]"},
    {"speaker": "Schüler", "text": "[Typische Anfänger-Antwort]"},
    {"speaker": "Lehrer", "text": "[Kern-Erklärung des Fundaments, 2-3 Sätze]"},
    {"speaker": "Schüler", "text": "[Verständnis-Reaktion mit Nachfrage]"},
    {"speaker": "Lehrer", "text": "[Vertiefung mit Anwendungsbeispiel, 2-3 Sätze]"},
    {"speaker": "Schüler", "text": "[Abschluss-Reflektion, zeigt Lernfortschritt]"}
  ],
  "mindmap": {
    "name": "${topic}",
    "children": [
      {"name": "[Hauptkategorie 1]", "children": [{"name": "[Unterpunkt A]"}, {"name": "[Unterpunkt B]"}]},
      {"name": "[Hauptkategorie 2]", "children": [{"name": "[Unterpunkt A]"}, {"name": "[Unterpunkt B]"}]},
      {"name": "[Hauptkategorie 3]", "children": [{"name": "[Unterpunkt A]"}, {"name": "[Unterpunkt B]"}]}
    ]
  },
  "embeddedQuestions": [
    {
      "id": "q-embed-0",
      "question": "[Frage zu Abschnitt 1]",
      "options": ["[Richtige Antwort]", "[Plausibler Distraktor 1]", "[Plausibler Distraktor 2]", "[Plausibler Distraktor 3]"],
      "answerIdx": 0,
      "explanation": "[Erklärung warum die richtige Antwort korrekt ist, 1-2 Sätze]"
    },
    {
      "id": "q-embed-1",
      "question": "[Frage zu Abschnitt 2]",
      "options": ["[Plausibler Distraktor 1]", "[Richtige Antwort]", "[Plausibler Distraktor 2]", "[Plausibler Distraktor 3]"],
      "answerIdx": 1,
      "explanation": "[Erklärung, 1-2 Sätze]"
    },
    {
      "id": "q-embed-2",
      "question": "[Frage zu Abschnitt 3]",
      "options": ["[Plausibler Distraktor 1]", "[Plausibler Distraktor 2]", "[Richtige Antwort]", "[Plausibler Distraktor 3]"],
      "answerIdx": 2,
      "explanation": "[Erklärung, 1-2 Sätze]"
    }
  ],
  "quiz": [
    {
      "question": "[Übergreifende Quiz-Frage 1]",
      "options": ["[Richtige Antwort]", "[Distraktor 1]", "[Distraktor 2]", "[Distraktor 3]"],
      "answerIdx": 0,
      "explanation": "[Erklärung]"
    },
    {
      "question": "[Übergreifende Quiz-Frage 2]",
      "options": ["[Distraktor 1]", "[Richtige Antwort]", "[Distraktor 2]", "[Distraktor 3]"],
      "answerIdx": 1,
      "explanation": "[Erklärung]"
    }
  ]
}`;

      try {
        const tbRes = await fetch('https://api.mistral.ai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'mistral-large-latest',
            messages: [
              { role: 'system', content: tbSystemPrompt },
              { role: 'user', content: tbPrompt }
            ],
            temperature: 0.7,
            max_tokens: 4000
          })
        });

        if (!tbRes.ok) {
          console.warn('[generate_augmented_textbook] Mistral API error, using offline fallback:', tbRes.status);
          return NextResponse.json(generateOfflineTextbook(topic, interest, grade));
        }

        const tbData = await tbRes.json();
        const rawContent = tbData.choices?.[0]?.message?.content || '';
        
        // Robust JSON extraction - strip markdown code fences if present
        const cleaned = rawContent.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
        
        let textbook;
        try {
          textbook = JSON.parse(cleaned);
        } catch (parseErr) {
          // Try to extract JSON from within the response
          const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            try {
              textbook = JSON.parse(jsonMatch[0]);
            } catch {
              console.warn('[generate_augmented_textbook] JSON parse failed, using offline fallback');
              return NextResponse.json(generateOfflineTextbook(topic, interest, grade));
            }
          } else {
            console.warn('[generate_augmented_textbook] No JSON found in response, using offline fallback');
            return NextResponse.json(generateOfflineTextbook(topic, interest, grade));
          }
        }

        // Validate essential fields and heal if missing
        if (!textbook.sections || !Array.isArray(textbook.sections) || textbook.sections.length === 0) {
          textbook.sections = generateOfflineTextbook(topic, interest, grade).sections;
        }
        if (!textbook.originalText || typeof textbook.originalText !== 'string') {
          textbook.originalText = generateOfflineTextbook(topic, interest, grade).originalText;
        }
        if (!textbook.embeddedQuestions || !Array.isArray(textbook.embeddedQuestions)) {
          textbook.embeddedQuestions = generateOfflineTextbook(topic, interest, grade).embeddedQuestions;
        }
        if (!textbook.quiz || !Array.isArray(textbook.quiz)) {
          textbook.quiz = generateOfflineTextbook(topic, interest, grade).quiz;
        }
        if (!textbook.slides || !Array.isArray(textbook.slides)) {
          textbook.slides = generateOfflineTextbook(topic, interest, grade).slides;
        }
        if (!textbook.audioLesson || !Array.isArray(textbook.audioLesson)) {
          textbook.audioLesson = generateOfflineTextbook(topic, interest, grade).audioLesson;
        }
        if (!textbook.mindmap) {
          textbook.mindmap = generateOfflineTextbook(topic, interest, grade).mindmap;
        }
        if (!textbook.timeline) {
          textbook.timeline = generateOfflineTextbook(topic, interest, grade).timeline;
        }
        if (!textbook.memoryAid) {
          textbook.memoryAid = generateOfflineTextbook(topic, interest, grade).memoryAid;
        }
        if (!textbook.personalizations) {
          textbook.personalizations = generateOfflineTextbook(topic, interest, grade).personalizations;
        }

        return NextResponse.json(textbook);

      } catch (tbErr) {
        console.warn('[generate_augmented_textbook] Fetch error, using offline fallback:', tbErr.message);
        return NextResponse.json(generateOfflineTextbook(topic, interest, grade));
      }
    }

    if (action === 'evaluate_recall_answer') {
      const { question, referenceAnswer, userAnswer } = body;

      if (!hasApiKey) {
        return NextResponse.json(offlineEvaluateAnswer(question, referenceAnswer, userAnswer));
      }

      const evalSystemPrompt = `Du bist ein präziser Lern-Evaluator. Bewerte die Antwort des Schülers semantisch.
WICHTIG: Antworte AUSSCHLIESSLICH mit validem JSON. Kein Text davor oder danach.
JSON-Format: { "isCorrect": boolean, "semanticScore": number (0-100), "feedback": string }`;

      const evalPrompt = `Frage: "${question}"
Musterlösung: "${referenceAnswer}"
Schüler-Antwort: "${userAnswer}"

Bewertungsregeln:
- semanticScore 0-100 basierend auf semantischer Übereinstimmung (NICHT exakter Wortlaut)
- isCorrect = true wenn semanticScore >= 70
- feedback: Beginne mit "Glows:" (Was war gut) dann "Grows:" (Was hat gefehlt/verbessert werden kann)
- Sei konstruktiv und motivierend, nicht demotivierend
- Wenn die Antwort komplett unsinnig oder off-topic ist: score 0-15
- Wenn die Kernaussage stimmt aber unvollständig: score 55-75
- Wenn die Antwort präzise und vollständig ist: score 80-100

Antworte NUR mit diesem JSON:
{"isCorrect": [true/false], "semanticScore": [0-100], "feedback": "[Glows: ... Grows: ...]"}`;

      try {
        const evalRes = await fetch('https://api.mistral.ai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'mistral-small-latest', // Faster for evaluation
            messages: [
              { role: 'system', content: evalSystemPrompt },
              { role: 'user', content: evalPrompt }
            ],
            temperature: 0.2, // Low temperature for consistent evaluation
            max_tokens: 400
          })
        });

        if (!evalRes.ok) {
          console.warn('[evaluate_recall_answer] Mistral API error, using keyword fallback:', evalRes.status);
          return NextResponse.json(offlineEvaluateAnswer(question, referenceAnswer, userAnswer));
        }

        const evalData = await evalRes.json();
        const rawEval = evalData.choices?.[0]?.message?.content || '';
        const cleanedEval = rawEval.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();

        try {
          const evalResult = JSON.parse(cleanedEval);
          // Validate and sanitize
          const score = typeof evalResult.semanticScore === 'number' ? Math.min(100, Math.max(0, evalResult.semanticScore)) : 50;
          return NextResponse.json({
            isCorrect: score >= 70,
            semanticScore: score,
            feedback: typeof evalResult.feedback === 'string' ? evalResult.feedback : 'Glows: Antwort erhalten. Grows: Überarbeite deine Formulierung für mehr Präzision.'
          });
        } catch {
          console.warn('[evaluate_recall_answer] JSON parse failed, using keyword fallback');
          return NextResponse.json(offlineEvaluateAnswer(question, referenceAnswer, userAnswer));
        }

      } catch (evalErr) {
        console.warn('[evaluate_recall_answer] Fetch error, using keyword fallback:', evalErr.message);
        return NextResponse.json(offlineEvaluateAnswer(question, referenceAnswer, userAnswer));
      }
    }

    // ── NEW ACTION: generate_workout ─────────────────────────────────────────
    if (action === 'generate_workout') {
      const { focus, level, minutes, equipment } = body;

      if (!hasApiKey) {
        return NextResponse.json(generateOfflineWorkout(focus, level, minutes, equipment));
      }

      const levelLabel = level === 'advanced' ? 'Fortgeschritten (hohe Intensität, niedrige Wiederholungen)' : level === 'beginner' ? 'Einsteiger (Technikfokus, höhere Wiederholungen)' : 'Mittel (Hypertrophie-Bereich)';
      const woSystemPrompt = `Du bist ein erfahrener Kraft- und Fitnesstrainer. Erstelle einen konkreten, sicheren Trainingsplan.
WICHTIG: Antworte AUSSCHLIESSLICH mit validem JSON. Kein Markdown, kein Text davor oder danach.`;
      const woPrompt = `Erstelle einen Trainingsplan.
Fokus / Muskelgruppe: "${focus || 'Ganzkörper'}"
Level: ${levelLabel}
Zeitbudget: ${Number(minutes) > 0 ? Number(minutes) : 45} Minuten
Verfügbares Equipment: "${equipment || 'Freie Gewichte'}"

Pflicht-JSON-Struktur (EXAKT so, alle Texte auf Deutsch):
{
  "title": "[kurzer Plan-Titel]",
  "focus": "${focus || 'Ganzkörper'}",
  "estMinutes": ${Number(minutes) > 0 ? Number(minutes) : 45},
  "equipment": "${equipment || 'Freie Gewichte'}",
  "warmup": "[1-2 Sätze Aufwärm-Empfehlung]",
  "exercises": [
    {"name": "[Übungsname]", "sets": [Zahl], "reps": "[z.B. 8-12]", "restSec": [Pause in Sekunden], "muscle": "[Zielmuskel]", "note": "[kurzer Technik-Hinweis]"}
  ],
  "coachNote": "[1-2 Sätze motivierender Coaching-Hinweis]"
}
Wähle 3-7 Übungen passend zum Zeitbudget. Gib NUR das JSON zurück.`;

      try {
        const woRes = await fetch('https://api.mistral.ai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'mistral-large-latest',
            messages: [
              { role: 'system', content: woSystemPrompt },
              { role: 'user', content: woPrompt }
            ],
            temperature: 0.6,
            max_tokens: 1500
          })
        });

        if (!woRes.ok) {
          console.warn('[generate_workout] Mistral API error, using offline fallback:', woRes.status);
          return NextResponse.json(generateOfflineWorkout(focus, level, minutes, equipment));
        }

        const woData = await woRes.json();
        const rawWo = woData.choices?.[0]?.message?.content || '';
        const cleanedWo = rawWo.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();

        let workout;
        try {
          workout = JSON.parse(cleanedWo);
        } catch {
          const jsonMatch = cleanedWo.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            try { workout = JSON.parse(jsonMatch[0]); }
            catch { return NextResponse.json(generateOfflineWorkout(focus, level, minutes, equipment)); }
          } else {
            return NextResponse.json(generateOfflineWorkout(focus, level, minutes, equipment));
          }
        }

        // Heal essential fields
        const fallback = generateOfflineWorkout(focus, level, minutes, equipment);
        if (!Array.isArray(workout.exercises) || workout.exercises.length === 0) {
          workout.exercises = fallback.exercises;
        }
        // Sanitize each exercise so the client always gets numbers/strings it expects
        workout.exercises = workout.exercises.map((ex) => ({
          name: typeof ex?.name === 'string' && ex.name ? ex.name : 'Übung',
          sets: Number(ex?.sets) > 0 ? Number(ex.sets) : 3,
          reps: ex?.reps != null ? String(ex.reps) : '8-12',
          restSec: Number(ex?.restSec) > 0 ? Number(ex.restSec) : 90,
          muscle: typeof ex?.muscle === 'string' ? ex.muscle : '',
          note: typeof ex?.note === 'string' ? ex.note : ''
        }));
        if (!workout.title) workout.title = fallback.title;
        if (!workout.focus) workout.focus = fallback.focus;
        if (!workout.estMinutes) workout.estMinutes = fallback.estMinutes;
        if (!workout.warmup) workout.warmup = fallback.warmup;
        if (!workout.coachNote) workout.coachNote = fallback.coachNote;

        return NextResponse.json(workout);
      } catch (woErr) {
        console.warn('[generate_workout] Fetch error, using offline fallback:', woErr.message);
        return NextResponse.json(generateOfflineWorkout(focus, level, minutes, equipment));
      }
    }

    // ── NEW ACTION: behavior_coach ───────────────────────────────────────────
    // Turns a stated behavior (build / quit / change) into a structured, science-
    // grounded change plan. Frameworks: ABA (Kazdin), control-theory self-
    // regulation (Carver & Scheier), habit loop, implementation intentions.
    if (action === 'behavior_coach') {
      const { kind, title, cue, reward, motivation } = body;
      const safeKind = ['build', 'quit', 'change'].includes(kind) ? kind : 'build';

      if (!hasApiKey) {
        return NextResponse.json(generateOfflineBehaviorPlan(safeKind, title, cue, reward));
      }

      const kindLabel = safeKind === 'quit'
        ? 'ABLEGEN (unerwünschtes Verhalten reduzieren/löschen)'
        : safeKind === 'change'
          ? 'VERÄNDERN (bestehendes Verhalten durch ein besseres ersetzen)'
          : 'AUFBAUEN (neues erwünschtes Verhalten etablieren)';

      const bcSystemPrompt = `Du bist ein Verhaltenscoach mit fundiertem Wissen in Verhaltenswissenschaft.
Stütze dich auf: Angewandte Verhaltensanalyse (Kazdin – ABC-Analyse, Verstärkung, Löschung + konkurrierendes Verhalten, Reizkontrolle, Selbstbeobachtung), Kontrolltheorie der Selbstregulation (Carver & Scheier – Feedbackschleifen, Selbstbeobachtung gegen einen Standard), den Gewohnheits-Loop (Cue→Routine→Reward), Umsetzungsintentionen (Gollwitzer: "Wenn X, dann Y") und Tiny Habits / B=MAP (Fogg).
WICHTIG: Antworte AUSSCHLIESSLICH mit validem JSON. Kein Markdown, kein Text davor oder danach. Alle Texte auf Deutsch, konkret und umsetzbar.`;

      const bcPrompt = `Erstelle einen Verhaltensänderungs-Plan.
Ziel-Typ: ${kindLabel}
Verhalten: "${title || 'unbenanntes Verhalten'}"
Bekannter Auslöser/Cue: "${cue || 'unbekannt'}"
Gewünschte/aktuelle Belohnung: "${reward || 'unbekannt'}"
Motivation/Identität: "${motivation || 'nicht angegeben'}"

Pflicht-JSON-Struktur (EXAKT diese Schlüssel, alle Texte Deutsch):
{
  "kind": "${safeKind}",
  "summary": "[1-2 Sätze: das Kernprinzip für diesen Typ]",
  "cueAnalysis": "[Analyse des Auslösers + Reizkontrolle-Empfehlung]",
  "replacementBehavior": "[konkretes Ersatz-/Mini-Verhalten]",
  "implementationIntention": "[Wenn ..., dann ...-Satz]",
  "reinforcement": "[Verstärkungs-/Belohnungsplan]",
  "firstTinyStep": "[der kleinste erste Schritt für heute]",
  "tips": [ {"text": "[Tipp]", "basis": "[zugrundeliegendes Prinzip/Quelle]"} ]
}
Gib 2-3 Tipps. Gib NUR das JSON zurück.`;

      try {
        const bcRes = await fetch('https://api.mistral.ai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'mistral-large-latest',
            messages: [
              { role: 'system', content: bcSystemPrompt },
              { role: 'user', content: bcPrompt }
            ],
            temperature: 0.5,
            max_tokens: 1200
          })
        });

        if (!bcRes.ok) {
          console.warn('[behavior_coach] Mistral API error, using offline fallback:', bcRes.status);
          return NextResponse.json(generateOfflineBehaviorPlan(safeKind, title, cue, reward));
        }

        const bcData = await bcRes.json();
        const rawBc = bcData.choices?.[0]?.message?.content || '';
        const cleanedBc = rawBc.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();

        let plan;
        try {
          plan = JSON.parse(cleanedBc);
        } catch {
          const jsonMatch = cleanedBc.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            try { plan = JSON.parse(jsonMatch[0]); }
            catch { return NextResponse.json(generateOfflineBehaviorPlan(safeKind, title, cue, reward)); }
          } else {
            return NextResponse.json(generateOfflineBehaviorPlan(safeKind, title, cue, reward));
          }
        }

        // Heal essential fields against the offline plan.
        const fb = generateOfflineBehaviorPlan(safeKind, title, cue, reward);
        plan.kind = safeKind;
        if (!plan.summary) plan.summary = fb.summary;
        if (!plan.cueAnalysis) plan.cueAnalysis = fb.cueAnalysis;
        if (!plan.replacementBehavior) plan.replacementBehavior = fb.replacementBehavior;
        if (!plan.implementationIntention) plan.implementationIntention = fb.implementationIntention;
        if (!plan.reinforcement) plan.reinforcement = fb.reinforcement;
        if (!plan.firstTinyStep) plan.firstTinyStep = fb.firstTinyStep;
        if (!Array.isArray(plan.tips) || plan.tips.length === 0) {
          plan.tips = fb.tips;
        } else {
          plan.tips = plan.tips.slice(0, 4).map((tip) => ({
            text: typeof tip?.text === 'string' ? tip.text : String(tip || ''),
            basis: typeof tip?.basis === 'string' ? tip.basis : ''
          }));
        }

        return NextResponse.json(plan);
      } catch (bcErr) {
        console.warn('[behavior_coach] Fetch error, using offline fallback:', bcErr.message);
        return NextResponse.json(generateOfflineBehaviorPlan(safeKind, title, cue, reward));
      }
    }

    // ── NEW ACTION: compose_diary_entry ──────────────────────────────────────
    // Composes a reflective first-person NorthStar diary entry from the day's
    // aggregated OS data (gym, biometrics, focus, plan, future self).
    // Used by the manual "compose today" trigger AND the end-of-day cron.
    if (action === 'compose_diary_entry') {
      const day = body.day || {};

      if (!hasApiKey) {
        return NextResponse.json(generateOfflineDiaryEntry(day));
      }

      const diarySystem = `Du bist das "zukünftige Ich" (Future Self) des Nutzers in der App Pronoia — eine ruhige, weise, ermutigende Stimme. Du schreibst rückblickend den Tagebucheintrag des heutigen Tages, in der ICH-Perspektive des Nutzers, auf Deutsch. Warm, reflektiert, editorial — nie kitschig, nie Bullet-Points.
WICHTIG: Antworte AUSSCHLIESSLICH mit validem JSON. Kein Markdown, kein Text davor/danach.`;

      const diaryUser = `Komponiere den Tagebucheintrag für: ${day.dateLabel || 'heute'}.
Daten des Tages:
- Future Self / Identität: ${day.futureSelf?.identity || '—'}${day.futureSelf?.archetypeName ? ` (Archetyp: ${day.futureSelf.archetypeName})` : ''}
- Werte: ${(day.futureSelf?.values || []).join(', ') || '—'}
- Fokus-Minuten (Deep Work): ${day.focusMinutes || 0}
- Gym: ${day.gymSummary || 'kein Training'}
- Biometrie: HRV ${day.biometrics?.hrv ?? '—'} ms, Schlaf ${day.biometrics?.sleep ?? '—'}%, Fokus ${day.biometrics?.focus ?? '—'}%
- Geplante Blöcke: ${(day.plannedBlocks || []).join(', ') || '—'}

Schreibe 2–4 kurze Absätze (durch \\n\\n getrennt), die diese Daten zu einer ehrlichen, reflektierenden Tagesnotiz verweben — als würde mein zukünftiges Ich auf diesen Tag zurückblicken.

Antworte NUR mit diesem JSON:
{"title": "[poetischer, kurzer Titel]", "content": "[Absatz 1]\\n\\n[Absatz 2]...", "tags": ["MAX 3 KURZE UPPERCASE TAGS"], "future_self_hint": "[1 ermutigender Satz vom zukünftigen Ich an mich]"}`;

      try {
        const dRes = await fetch('https://api.mistral.ai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'mistral-large-latest',
            messages: [
              { role: 'system', content: diarySystem },
              { role: 'user', content: diaryUser }
            ],
            temperature: 0.75,
            max_tokens: 900
          })
        });

        if (!dRes.ok) {
          console.warn('[compose_diary_entry] Mistral API error, using offline fallback:', dRes.status);
          return NextResponse.json(generateOfflineDiaryEntry(day));
        }

        const dData = await dRes.json();
        const rawD = dData.choices?.[0]?.message?.content || '';
        const cleanedD = rawD.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();

        let entry;
        try {
          entry = JSON.parse(cleanedD);
        } catch {
          const m = cleanedD.match(/\{[\s\S]*\}/);
          entry = m ? JSON.parse(m[0]) : null;
        }

        if (!entry || !entry.content) {
          return NextResponse.json(generateOfflineDiaryEntry(day));
        }
        // Sanitize/heal
        const fallback = generateOfflineDiaryEntry(day);
        return NextResponse.json({
          title: typeof entry.title === 'string' && entry.title ? entry.title : fallback.title,
          content: String(entry.content),
          tags: Array.isArray(entry.tags) ? entry.tags.slice(0, 3).map(String) : fallback.tags,
          future_self_hint: typeof entry.future_self_hint === 'string' ? entry.future_self_hint : fallback.future_self_hint
        });
      } catch (dErr) {
        console.warn('[compose_diary_entry] Fetch error, using offline fallback:', dErr.message);
        return NextResponse.json(generateOfflineDiaryEntry(day));
      }
    }

    // ── EXISTING OFFLINE FALLBACK BLOCK ──────────────────────────────────────
    if (!hasApiKey) {
      const lowerPrompt = (prompt || '').toLowerCase();

      
      // 0. Parse finished plan fallback
      if (lowerPrompt.includes('fertiger_wochenplan') || lowerPrompt.includes('fertigen plan')) {
        let showerPref = 'morning';
        let shoppingPref = 'weekly';
        const showerMatch = prompt.match(/showerPreference:\s*(\w+)/);
        if (showerMatch) showerPref = showerMatch[1];
        const shoppingMatch = prompt.match(/shoppingPreference:\s*(\w+)/);
        if (shoppingMatch) shoppingPref = shoppingMatch[1];

        const customBlocksByDay = {
          "Montag": [], "Dienstag": [], "Mittwoch": [], "Donnerstag": [], "Freitag": [], "Samstag": [], "Sonntag": []
        };

        // Parse custom times from text
        const lines = prompt.split('\n');
        lines.forEach(line => {
          const match = line.match(/(montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag)s?\s*(?:ab|um)?\s*(\d{1,2}:\d{2})\s*(?:bis\s*(\d{1,2}:\d{2}))?\s+(.+)/i);
          if (match) {
            const dayName = match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
            const start = match[2];
            const end = match[3] || "10:00";
            const title = match[4].trim();
            const [sH, sM] = start.split(':').map(Number);
            const [eH, eM] = end.split(':').map(Number);
            const duration = Math.max(1800, ((eH * 60 + eM) - (sH * 60 + sM)) * 60);

            if (customBlocksByDay[dayName]) {
              customBlocksByDay[dayName].push({
                title,
                startTime: start,
                duration,
                pillar: title.toLowerCase().includes('sport') || title.toLowerCase().includes('gym') ? 'health' : 'focus',
                type: title.toLowerCase().includes('sport') || title.toLowerCase().includes('gym') ? 'Health' : 'Focus',
                rec: 'Vom importierten Plan übernommen.',
                insight: 'Individuelle Terminplanung.'
              });
            }
          }
        });

        const parseTimeToMin = (t) => {
          if (!t || typeof t !== 'string') return 480;
          const [h, m] = t.split(':').map(Number);
          return (h * 60 + m) || 480;
        };

        const formatMinToTime = (min) => {
          const h = Math.floor((min % 1440) / 60);
          const m = Math.floor(min % 60);
          return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        };

        const fullWeekPlan = {};
        const days = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];

        days.forEach(dayName => {
          const customBlocks = customBlocksByDay[dayName] || [];
          const merged = [...customBlocks];
          
          // Routine blocks to inject around custom blocks
          const candidates = [
            { title: "Aufstehen & Hydration", targetTime: "07:00", duration: 1800, pillar: "recovery", type: "Recovery", rec: "10 Min direktes Sonnenlicht + 500ml salzhaltiges Wasser.", insight: "Melatonin-Stopp." }
          ];

          const hasSport = customBlocks.some(b => b.title.toLowerCase().includes('sport') || b.title.toLowerCase().includes('gym') || b.title.toLowerCase().includes('training') || b.title.toLowerCase().includes('kraft'));
          
          if (showerPref === 'morning' || (showerPref === 'sport' && !hasSport)) {
            candidates.push({ title: "Cold Shower & Morgen-Routine", targetTime: "07:30", duration: 1800, pillar: "recovery", type: "Recovery", rec: "Kalt duschen (2-3 Min).", insight: "Dopamin-Maximierung." });
          }

          candidates.push({ title: "Mahlzeit I (Frühstück & Neuro-Fuel)", targetTime: "08:00", duration: 1800, pillar: "health", type: "Health", rec: "Proteinhaltiges Frühstück mit Omega-3.", insight: "Organgraduierte Uhren synchronisieren." });
          candidates.push({ title: "Mahlzeit II (Mittagessen & Zirkadianer Reset)", targetTime: "13:00", duration: 2700, pillar: "health", type: "Health", rec: "Leichtes Mittagessen zur Erhalt der Energie.", insight: "Stabilisierung Blutzuckerspiegel." });

          if (showerPref === 'sport' && hasSport) {
            const sportBlock = customBlocks.find(b => b.title.toLowerCase().includes('sport') || b.title.toLowerCase().includes('gym') || b.title.toLowerCase().includes('training') || b.title.toLowerCase().includes('kraft'));
            if (sportBlock) {
              const sportEnd = parseTimeToMin(sportBlock.startTime) + (sportBlock.duration / 60);
              candidates.push({ title: "Shower & Post-Workout Recovery", targetTime: formatMinToTime(sportEnd), duration: 1800, pillar: "recovery", type: "Recovery", rec: "Dusch- & Hygienephase nach Training.", insight: "Zentralnervensystem-Beruhigung." });
            }
          }

          if (shoppingPref === 'weekly' && ['Dienstag', 'Freitag'].includes(dayName)) {
            candidates.push({ title: "Einkaufen & Besorgungen / Haushalt", targetTime: "17:30", duration: 2700, pillar: "social", type: "Social", rec: "Besorgungen oder leichte Arbeiten im Haushalt.", insight: "Spätnachmittagsbewegung." });
          }

          candidates.push({ title: "Mahlzeit III (Abendessen - Zirkadianer Abstand)", targetTime: "19:00", duration: 3600, pillar: "health", type: "Health", rec: "Letzte Mahlzeit mit 3 Std Abstand zum Schlafen.", insight: "HRV-Schutz." });

          if (showerPref === 'evening') {
            candidates.push({ title: "Focus II (Planung & Review)", targetTime: "21:00", duration: 1800, pillar: "skills", type: "Skills", rec: "Reflexion des Tages und Vorbereitung auf Morgen.", insight: "Lernkonsolidierung." });
            candidates.push({ title: "Warm Shower & Abend-Routine", targetTime: "21:30", duration: 1800, pillar: "recovery", type: "Recovery", rec: "Warmes Bad/Dusche.", insight: "Temperaturabsenkung für Schlafbereitschaft." });
          } else {
            candidates.push({ title: "Focus II (Planung & Review)", targetTime: "21:00", duration: 3600, pillar: "skills", type: "Skills", rec: "Reflexion des Tages und Vorbereitung auf Morgen.", insight: "Lernkonsolidierung." });
          }

          candidates.push({ title: "Circadian Wind-Down & Sleep Prep", targetTime: "22:00", duration: 3600, pillar: "recovery", type: "Recovery", rec: "Blaufilter aktivieren, entspannender Stack.", insight: "Melatoninausschüttung anregen." });

          candidates.forEach(cand => {
            const startMin = parseTimeToMin(cand.targetTime);
            const durationMin = cand.duration / 60;
            
            let fits = false;
            // Shift forward in 15 minute increments up to 3 hours
            for (let shift = 0; shift <= 180; shift += 15) {
              const currentStart = startMin + shift;
              const currentEnd = currentStart + durationMin;
              
              const overlaps = merged.some(b => {
                const bStart = parseTimeToMin(b.startTime);
                const bEnd = bStart + (b.duration / 60);
                return (currentStart < bEnd && currentEnd > bStart);
              });
              
              if (!overlaps) {
                cand.startTime = formatMinToTime(currentStart);
                merged.push(cand);
                fits = true;
                break;
              }
            }
          });

          // Sort final list chronologically
          merged.sort((a, b) => parseTimeToMin(a.startTime) - parseTimeToMin(b.startTime));
          fullWeekPlan[dayName] = merged;
        });

        return NextResponse.json({
          choices: [{ message: { content: JSON.stringify(fullWeekPlan) } }]
        });
      }

      // 1. Parse liabilities fallback
      if (lowerPrompt.includes('blockaden') || lowerPrompt.includes('verbindlichkeiten') || lowerPrompt.includes('parse')) {
        let liabilities = [];
        if (lowerPrompt.includes('montag') || lowerPrompt.includes('mo')) {
          liabilities.push({ id: 'l1', title: 'Arbeit', day: 'Montag', startTime: '09:00', endTime: '17:00' });
        }
        if (lowerPrompt.includes('dienstag') || lowerPrompt.includes('di')) {
          liabilities.push({ id: 'l2', title: 'Arbeit', day: 'Dienstag', startTime: '09:00', endTime: '17:00' });
        }
        if (lowerPrompt.includes('mittwoch') || lowerPrompt.includes('mi')) {
          liabilities.push({ id: 'l3', title: 'Arbeit', day: 'Mittwoch', startTime: '09:00', endTime: '17:00' });
          if (lowerPrompt.includes('sport') || lowerPrompt.includes('gym')) {
            liabilities.push({ id: 'l3_sport', title: 'Sport', day: 'Mittwoch', startTime: '18:00', endTime: '19:30' });
          }
        }
        if (lowerPrompt.includes('donnerstag') || lowerPrompt.includes('do')) {
          liabilities.push({ id: 'l4', title: 'Arbeit', day: 'Donnerstag', startTime: '09:00', endTime: '17:00' });
        }
        if (lowerPrompt.includes('freitag') || lowerPrompt.includes('fr')) {
          liabilities.push({ id: 'l5', title: 'Arbeit', day: 'Freitag', startTime: '09:00', endTime: '17:00' });
        }
        
        // General fallback if no match
        if (liabilities.length === 0) {
          liabilities.push({ id: 'lf1', title: 'Fester Termin', day: 'Montag', startTime: '10:00', endTime: '12:00' });
        }
        
        return NextResponse.json({
          choices: [{ message: { content: JSON.stringify(liabilities) } }]
        });
      }
      
      // 1. Calendar/Day protocol sync (chatWithDayAI)
      if (lowerPrompt.includes('blocks') || lowerPrompt.includes('tagesplan') || lowerPrompt.includes('json')) {
        let currentPlanBlocks = [];
        try {
          const planMatch = prompt.match(/Current Plan:\s*(\[.*?\])/);
          if (planMatch) {
            currentPlanBlocks = JSON.parse(planMatch[1]);
          }
        } catch (e) {
          console.warn("Failed to parse current plan from prompt:", e);
        }

        if (currentPlanBlocks.length === 0) {
          currentPlanBlocks = [
            { title: 'Morning Stack', startTime: '08:00', duration: 900, pillar: 'health', rec: 'Hydrierung.', insight: 'Morgen-Baseline.' },
            { title: 'Fokus Arbeit', startTime: '09:00', duration: 5400, pillar: 'focus', rec: 'Deep Work.', insight: 'Maximale Last.' },
            { title: 'Skill Erwerb', startTime: '11:00', duration: 2700, pillar: 'skills', rec: 'Lernen.', insight: 'Neuronale Plastizität.' },
            { title: 'Erholungsphase', startTime: '15:00', duration: 1800, pillar: 'recovery', rec: 'NSDR.', insight: 'PNS Trigger.' }
          ];
        }

        let instruction = "";
        const instMatch = prompt.match(/User Instruction:\s*"(.*?)"/i) || prompt.match(/Instructions:\s*"(.*?)"/i);
        if (instMatch) {
          instruction = instMatch[1];
        }

        if (instruction) {
          const instLower = instruction.toLowerCase();
          let matchedTime = instLower.match(/(\d{1,2})(?::(\d{2}))?\s*-\s*(\d{1,2})(?::(\d{2}))?/);
          let timeStr = "12:00";
          let duration = 3600;
          if (matchedTime) {
            const startH = matchedTime[1].padStart(2, '0');
            const startM = (matchedTime[2] || '00').padStart(2, '0');
            timeStr = `${startH}:${startM}`;
            const endH = parseInt(matchedTime[3]);
            const startHInt = parseInt(matchedTime[1]);
            duration = Math.max(1, endH - startHInt) * 3600;
          }

          const cleanTitle = instruction.replace(/füge hinzu|plane|erstelle|add|schedule|appointment|termin/gi, '').trim();
          const title = cleanTitle ? (cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1)) : "Anpassung";

          currentPlanBlocks.push({
            title,
            startTime: timeStr,
            duration,
            pillar: instLower.includes('arzt') || instLower.includes('health') || instLower.includes('arzttermin') ? 'health' : 'focus',
            rec: 'Per AI-Zuschnitt angepasst (Offline-Modus).',
            insight: 'Tagesstruktur gewahrt.'
          });

          currentPlanBlocks.sort((a, b) => {
            const [aH, aM] = (a.startTime || "00:00").split(':').map(Number);
            const [bH, bM] = (b.startTime || "00:00").split(':').map(Number);
            return (aH * 60 + aM) - (bH * 60 + bM);
          });
        }

        const replyContent = JSON.stringify({ blocks: currentPlanBlocks });
        return NextResponse.json({
          choices: [{ message: { content: replyContent } }]
        });
      }

      // 2. Skill Lab - Disambiguation & Curriculum generation fallbacks (for offline/mock mode)
      if (lowerPrompt.includes('sub-intents') || lowerPrompt.includes('disambiguation') || (systemPrompt && systemPrompt.includes('Sub-Intents'))) {
        const skillMatch = prompt.match(/eingegeben:\s*"(.*?)"/i);
        const skill = skillMatch ? skillMatch[1] : "Skill";
        const replyContent = JSON.stringify([
          { "id": "sub_1", "label": `${skill} Grundlagen & Konzepte`, "icon": "school", "domain": "PROGRAMMING" },
          { "id": "sub_2", "label": `${skill} Fortgeschrittenes Level`, "icon": "trending_up", "domain": "PROGRAMMING" },
          { "id": "sub_3", "label": `${skill} Praktische Anwendung`, "icon": "build", "domain": "PROGRAMMING" },
          { "id": "sub_4", "label": `${skill} Analyse & Strategie`, "icon": "analytics", "domain": "PROGRAMMING" }
        ]);
        return NextResponse.json({
          choices: [{ message: { content: replyContent } }]
        });
      }

      if (lowerPrompt.includes('lern-curriculum') || lowerPrompt.includes('curriculum')) {
        const skillMatch = prompt.match(/Skill:\s*"(.*?)"/i);
        const skill = skillMatch ? skillMatch[1] : "Programmieren";
        const replyContent = JSON.stringify({
          title: `Meisterschaftspfad: ${skill}`,
          skillSummary: `Nach Abschluss dieses Curriculums wirst du in der Lage sein, ${skill} zielgerichtet anzuwenden.`,
          modules: [
            {
              id: "mod-01",
              title: `${skill} - Fundamente`,
              objective: "Die Kernprinzipien verstehen.",
              estimatedMinutes: 30,
              theory: {
                content: `Willkommen beim Meisterschaftspfad für ${skill}.\n\nDer erste Schritt zur Meisterschaft besteht darin, die Grundlagen absolut fehlerfrei zu verinnerlichen. Konzentriere dich auf die Isolation einzelner kognitiver Segmente. Vermeide Ablenkungen und arbeite in kurzen, fokussierten Einheiten.`,
                sourceHint: "Referenzdokumente und offizielle Dokumentation."
              },
              practice: {
                task: `Schreibe ein kurzes Protokoll oder erstelle eine Skizze der 3 wichtigsten Konzepte von ${skill}. Zeitaufwand: 15 Minuten.`,
                youtubeQuery: `${skill} beginner tutorial basics`
              },
              recall: [
                { question: `Was ist das wichtigste Grundkonzept von ${skill}?`, answer: "Das Grundkonzept besteht darin, komplexe Probleme in isolierte Teilbereiche zu zerlegen." },
                { question: `Warum ist deliberate practice bei ${skill} essenziell?`, answer: "Weil unbewusste Inkompetenz nur durch ständiges, fokussiertes Feedback und bewusste Korrekturen aufgedeckt und behoben werden kann." },
                { question: `Wie oft sollte man am Anfang Pausen machen?`, answer: "Alle 30-45 Minuten für 5-10 Minuten, um die kognitive Belastung zu senken." }
              ]
            },
            {
              id: "mod-02",
              title: `${skill} - Fortgeschrittene Integration`,
              objective: "Anwendung fortgeschrittener Konzepte unter kontrollierten Bedingungen.",
              estimatedMinutes: 45,
              theory: {
                content: `Nun bauen wir auf den Fundamenten von ${skill} auf.\n\nHierbei konzentrieren wir uns auf Mustererkennung (Pattern Recognition). Wenn du die grundlegenden Schemata erkennst, verringert sich deine kognitive Belastung (Cognitive Load). Dadurch wird Arbeitsgedächtnis für komplexere Problemlösungen frei.`,
                sourceHint: "Fortgeschrittene Fallstudien."
              },
              practice: {
                task: `Implementiere ein einfaches Projekt oder löse eine fortgeschrittene Fallstudie zu ${skill}. Zeitaufwand: 30 Minuten.`,
                youtubeQuery: `${skill} advanced techniques masterclass`
              },
              recall: [
                { question: "Was beschreibt Cognitive Load?", answer: "Die Belastung des Arbeitsgedächtnisses während einer kognitiven Aufgabe." },
                { question: "Wie reduziert man Cognitive Load?", answer: "Durch das Etablieren von automatisierten Mustern und Schemata." },
                { question: "Was ist der Unterschied zwischen Taktik und Strategie?", answer: "Taktik ist die kurzfristige Berechnung einzelner Schritte, Strategie die langfristige Ausrichtung." }
              ]
            },
            {
              id: "mod-03",
              title: `${skill} - Deep Mastery`,
              objective: "Echte Anwendungskompetenz erlangen.",
              estimatedMinutes: 60,
              theory: {
                content: `Im letzten Modul konsolidieren wir dein Wissen über ${skill}.\n\nWahres Meisterschaftsniveau wird erreicht, wenn du das Wissen in unvorhergesehenen Szenarien anwenden kannst. Hierbei ist aktiver Abruf (Active Recall) und zeitlich versetzte Wiederholung (Spaced Repetition) entscheidend, um die Informationen langfristig in der Großhirnrinde zu verankern.`,
                sourceHint: "Wissenschaftliche Mastery-Konzepte."
              },
              practice: {
                task: `Führe eine freie Übung durch, bei der du das Gelernte ohne Hilfsmittel auf ein neues Problem anwendest. Zeitaufwand: 40 Minuten.`,
                youtubeQuery: `${skill} real world project practice`
              },
              recall: [
                { question: "Was bewirkt Active Recall?", answer: "Durch das aktive Abrufen von Informationen werden die synaptischen Verbindungen im Gehirn gestärkt." },
                { question: "Warum ist Spaced Repetition wichtig?", answer: "Es verhindert das Vergessen, indem es Informationen genau vor dem Vergessenszeitpunkt auffrischt." },
                { question: "Wie festigt sich das Langzeitgedächtnis am besten?", answer: "Durch Schlaf und Phasen der mentalen Ruhe (NSDR) nach intensiven Lerneinheiten." }
              ]
            }
          ]
        });
        return NextResponse.json({
          choices: [{ message: { content: replyContent } }]
        });
      }

      if (lowerPrompt.includes('lernmodule') || lowerPrompt.includes('theory') || lowerPrompt.includes('practice')) {
        const skillMatch = prompt.match(/Skill Focus:\s*"(.*?)"/i);
        const skill = skillMatch ? skillMatch[1] : "Programmieren";
        const replyContent = JSON.stringify({
          modules: [
            {
              id: 'm1',
              type: 'video',
              title: `${skill} Grundlagen & Best Practices`,
              content: `Dieses Video führt dich in die fortgeschrittenen Prinzipien von ${skill} ein. Konzentriere dich auf die Isolation von Fehlerquellen und Deliberate Practice.`,
              videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ'
            },
            {
              id: 'm2',
              type: 'theory',
              title: `Tiefen-Theorie: ${skill} Meisterschaft`,
              content: `Um ${skill} wirklich zu beherrschen, musst du die unbewusste Inkompetenz überwinden. Deliberate Practice erfordert ständige Konzentration auf die schwierigsten Teilaufgaben. Schreibe Notizen und halte dich an deinen Lernplan.`,
              notes: 'Notizen für Theorie-Einheit.'
            },
            {
              id: 'm3',
              type: 'practice',
              title: `Praxis Challenge: Deliberate Practice`,
              content: `Setze das Gelernte in einer 20-minütigen High-Intensity-Session um.`,
              steps: [
                'Definiere das genaue Übungsziel.',
                'Führe die Übung mit vollem Fokus aus.',
                'Analysiere deine Fehler und korrigiere sie sofort.'
              ]
            }
          ]
        });
        return NextResponse.json({
          choices: [{ message: { content: replyContent } }]
        });
      }

      // 3. Standard chat response fallback
      const reply = getLocalChatFallback(prompt);
      return NextResponse.json({
        choices: [{ message: { content: reply } }]
      });
    }

    const payload = {
      model: 'mistral-large-latest',
      messages: [
        { role: 'system', content: systemPrompt || "You are the Pronoia Agent. Precise, imperative, proactive." },
        { role: 'user', content: prompt }
      ]
    };

    if (tools) {
      payload.tools = tools;
      payload.tool_choice = tool_choice || 'auto';
    }

    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Mistral API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// ── Telegram Web App Chat Handler ─────────────────────────────
// Aufruf: PUT /api/mistral
export async function PUT(req) {
  try {
    const { message, profile, history = [], telegramUser } = await req.json();
    if (!message) return NextResponse.json({ error: "No message" }, { status: 400 });

    const apiKey = process.env.MISTRAL_API_KEY;

    const telegramId = telegramUser?.id || null;
    const linkUrl = telegramId ? `https://pronoia-3g6y.vercel.app/life-os?tg_id=${telegramId}` : "https://pronoia-3g6y.vercel.app/life-os";

    let mergedProfile = { ...(profile || {}) };
    let userId = 'local';
    let userDocRef = null;
    let userDocData = null;

    // Retrieve Knowledge Vault Items (RAG Context)
    let vaultContext = "";
    try {
      // 1. Resolve userId from telegramId if available via Firestore
      if (telegramId && adminDb) {
        try {
          const matchedUid = await lookupUidByTelegramId(telegramId);
          if (matchedUid) {
            userId = matchedUid;
            userDocRef = adminDb.collection("users").doc(userId);
            const docSnap = await userDocRef.get();
            if (docSnap.exists) {
              userDocData = docSnap.data();
            }
          }
        } catch (err) {
          console.warn("Failed to lookup user by telegramId via Admin SDK:", err);
        }
      }

      if (!userDocData && userId === 'local' && (profile?.uid || profile?.userId || profile?.id)) {
        userId = profile?.uid || profile?.userId || profile?.id;
        if (adminDb && userId) {
          userDocRef = adminDb.collection("users").doc(userId);
          const docSnap = await userDocRef.get();
          if (docSnap.exists) {
            userDocData = docSnap.data();
          }
        }
      }

      // 1b. Fetch true profile data from Firestore to feed the system prompt
      if (userDocData) {
        const dbProfile = userDocData.profile || {};
        let activeBlockInfo = "Kein aktiver Block";
        if (userDocData.blocks && userDocData.blockIdx !== undefined) {
          const activeBlock = userDocData.blocks[userDocData.blockIdx];
          if (activeBlock) {
            activeBlockInfo = `${activeBlock.title} (${Math.round(activeBlock.duration / 60)} Min., Säule: ${activeBlock.pillar}, Zustand: ${userDocData.isRunning ? 'AKTIV' : 'PAUSIERT'})`;
          }
        }
        mergedProfile = {
          ...mergedProfile,
          ...dbProfile,
          activeBlockInfo,
          email: userDocData.profile?.email || userDocData.email || mergedProfile.email || null,
          metrics: {
            hrv: userDocData.profile?.metrics?.hrv || dbProfile.metrics?.hrv || mergedProfile.metrics?.hrv || 72,
            sleep: userDocData.profile?.metrics?.sleep || dbProfile.metrics?.sleep || mergedProfile.metrics?.sleep || 84
          }
        };
      }

      // 1c. INTERCEPT COMMANDS AND ACTIVE AGENT SESSIONS
      const trimmedMessage = message.trim();
      const commandMatch = trimmedMessage.match(/^\/(\w+)(?:\s+(.*))?$/s);

      if (commandMatch) {
        const command = commandMatch[1].toLowerCase();
        const payloadText = (commandMatch[2] || "").trim();

        if (command === "exit" || command === "quit" || command === "pronoia") {
          if (userDocRef) {
            await userDocRef.update({ activeAgent: null });
          }
          return NextResponse.json({
            reply: "Session zurückgesetzt. Du sprichst nun wieder mit dem Pronoia Assistant.",
            intent: "chat",
            tags: ["session_reset"]
          });
        }

        if (command === "hermes" || command === "northstar" || command === "consensus") {
          if (payloadText.toLowerCase() === "reset" || payloadText.toLowerCase() === "clear" || payloadText.toLowerCase() === "new") {
            if (userDocRef) {
              await userDocRef.update({
                [`agentHistories.${command}`]: []
              });
            }
            let agentName = command === "hermes" ? "Hermes" : command === "northstar" ? "NorthStar" : "Consensus";
            return NextResponse.json({
              reply: `Chat-Verlauf für *${agentName}* erfolgreich zurückgesetzt.`,
              intent: "chat",
              tags: ["agent_reset"]
            });
          }

          if (payloadText.length > 0) {
            const agentReply = await routeToAgent(command, payloadText, userDocData, userDocRef, userId, telegramId, telegramUser, req);
            return NextResponse.json(agentReply);
          } else {
            if (userDocRef) {
              await userDocRef.update({ activeAgent: command });
            }
            let agentDesc = "";
            if (command === "hermes") {
              agentDesc = "*Hermes* gewechselt (Bio-kognitiver Begleiter)";
            } else if (command === "northstar") {
              agentDesc = "*NorthStar* gewechselt (Dein Zukünftiges Ich)";
            } else if (command === "consensus") {
              agentDesc = "*Consensus* gewechselt (A.06 Orchestrator)";
            }
            return NextResponse.json({
              reply: `Session zu ${agentDesc}. Du schreibst nun direkt mit diesem Agenten. Schreibe /exit oder /pronoia, um zurückzukehren.`,
              intent: "chat",
              tags: ["session_switch"]
            });
          }
        }

        if (command === "automate") {
          if (!payloadText.includes(":")) {
            return NextResponse.json({
              reply: "Bitte verwende das Format: `/automate [Intervall]: [Aufgabe]`. Beispiel: `/automate Jeden Freitag: Health News lesen`",
              intent: "chat",
              tags: ["automate_error"]
            });
          }
          const colonIdx = payloadText.indexOf(":");
          const schedule = payloadText.substring(0, colonIdx).trim();
          const task = payloadText.substring(colonIdx + 1).trim();

          if (userDocRef) {
            const automations = userDocData?.automations || [];
            const newAutomation = {
              id: `auto_${Date.now()}`,
              schedule,
              task,
              created_at: new Date().toISOString(),
              lastRun: null,
              nextRun: new Date(Date.now() + 10 * 1000).toISOString() // trigger soon
            };
            await userDocRef.update({
              automations: [...automations, newAutomation]
            });
          }

          return NextResponse.json({
            reply: `✓ Automation erfolgreich registriert:\n• *Intervall:* ${schedule}\n• *Aufgabe:* ${task}\n\nDer Cron-Job wird diese Aufgabe periodisch ausführen und dich hier benachrichtigen.`,
            intent: "chat",
            tags: ["automate_register"]
          });
        }
      }

      const activeAgent = userDocData?.activeAgent || null;
      if (activeAgent && ["hermes", "northstar", "consensus"].includes(activeAgent)) {
        const agentReply = await routeToAgent(activeAgent, trimmedMessage, userDocData, userDocRef, userId, telegramId, telegramUser, req);
        return NextResponse.json(agentReply);
      }

      // 2. Query vault items for this user via Supabase REST API
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      let items = [];

      if (supabaseUrl && supabaseAnonKey) {
        try {
          const res = await fetch(`${supabaseUrl}/rest/v1/vault_items?user_id=eq.${userId}&order=created_at.desc&limit=5`, {
            method: 'GET',
            headers: {
              'apikey': supabaseAnonKey,
              'Authorization': `Bearer ${supabaseAnonKey}`
            }
          });
          if (res.ok) {
            items = await res.json();
          } else {
            console.warn(`Supabase REST query failed for RAG: ${res.status}`);
          }
        } catch (err) {
          console.warn("Failed to query vault items from Supabase for RAG:", err);
        }
      }

      if (items.length > 0) {
          // Fetch text content for RAG if file type is text/md/json/csv/pdf
          const processedItems = await Promise.all(items.map(async (item) => {
            let fileContent = "";
            if (item.type === 'file' && item.content && item.content.startsWith('http')) {
              try {
                const urlLower = item.content.toLowerCase();
                const isText = urlLower.endsWith('.txt') || urlLower.endsWith('.md') || 
                               urlLower.endsWith('.json') || urlLower.endsWith('.csv') || 
                               urlLower.endsWith('.html');
                const isPdf = urlLower.endsWith('.pdf');
                
                if (isText) {
                  const fileRes = await fetch(item.content, { signal: AbortSignal.timeout(3000) });
                  if (fileRes.ok) {
                    fileContent = await fileRes.text();
                    fileContent = fileContent.substring(0, 20000); // limit to 20000 chars to cover full text files
                  }
                } else if (isPdf) {
                  const fileRes = await fetch(item.content, { signal: AbortSignal.timeout(6000) }); // longer timeout for PDF
                  if (fileRes.ok) {
                    const arrayBuffer = await fileRes.arrayBuffer();
                    const buffer = Buffer.from(arrayBuffer);
                    const { PDFParse } = require('pdf-parse');
                    const parser = new PDFParse({ data: buffer });
                    await parser.load();
                    const parsedData = await parser.getText();
                    fileContent = parsedData.text;
                    fileContent = fileContent.replace(/\s+/g, ' ').substring(0, 50000); // limit to 50000 chars to cover full PDF documents
                  }
                }
              } catch (e) {
                console.warn(`Failed to retrieve file contents for RAG item ${item.title}:`, e);
              }
            }
            return `- [${item.type.toUpperCase()}] ${item.title}: ${item.content} ${fileContent ? `(Inhalt der Datei: "${fileContent}")` : ''} (Tags: ${(item.tags || []).join(', ')})`;
          }));
          
          vaultContext = processedItems.join('\n');
        }
      } catch (err) {
        console.warn("Error retrieving vault items for RAG:", err);
      }

    const systemPrompt = `Du bist der Pronoia Assistant — direkter KI-Berater für Self-Optimization.

ÜBER PRONOIA:
- Performance-Brand für junge europäische Männer (17–28)
- Säulen: Health, Fitness, Supplementation, Social, Skills
- Erstes Produkt: PX-V1 (Nootropic-Stack, bald verfügbar)
- Philosophie: Primal/ancestral, anti-dogma, Maskulinität, Natur als optimal
- Life OS: Ermöglicht die Steuerung von Zeit-Blöcken (Fokus, Erholung, Skill, Health, Social) und Bio-Tracking (HRV, Schlaf).

VERKNÜPFUNGS-INFO:
- Der aktuelle Telegram-User hat die Telegram-ID: ${telegramId || 'Unbekannt'}.
- Der Verknüpfungs-Link für diesen Nutzer lautet: ${linkUrl}.
- Wenn der Nutzer nach einer Verknüpfung fragt (z.B. "Konto verbinden", "wie verbinde ich", "/link"), gib ihm genau diesen Link.

${vaultContext ? `KNOWLEDGE VAULT (RAG CONTEXT - BENUTZER-EINTRÄGE):
Nutze diesen Kontext aus dem Knowledge Vault des Nutzers für personalisierte, kontextbasierte Antworten.
WICHTIG: Antworte STRENG faktenbasiert auf Grundlage des bereitgestellten Vault-Kontexts. Denke dir niemals Details, Phasen, Ratschläge oder Lernpläne aus, die nicht explizit in den Vault-Dateien oder Texten stehen. Wenn der bereitgestellte Kontext die Antwort nicht enthält, antworte stattdessen, dass diese Information nicht in deinen hochgeladenen Dokumenten zu finden ist.
${vaultContext}
` : ''}

HANDLUNGEN AUSFÜHREN:
Du kannst Aktionen direkt im System ausführen lassen, indem du das "action"-Objekt befüllst:
- Wenn der Nutzer seine HRV oder seinen Schlaf loggen möchte (z. B. "logge meine HRV auf 78", "HRV 72 setzen", "Schlaf 85% eintragen"), befüllst du "action" mit: {"type": "biometrics_update", "hrv": [Zahl], "sleep": [Zahl]}. Nimm Standardwerte (HRV: 72, Schlaf: 84) falls ein Wert fehlt.
- Wenn der Nutzer den Fokus-Timer umschalten oder den Block steuern möchte (z. B. "Fokus starten", "Timer stoppen", "Nächster Block", "Pause"), befüllst du "action" mit: {"type": "block_control", "action": "toggle" | "next" | "prev"}.

TONALITÄT: Direkt, klar, kein Bullshit, wissenschaftlich fundiert, Deutsch.

USER-PROFIL: ${JSON.stringify(mergedProfile || {})}

ANTWORT NUR ALS JSON:
{
  "reply": "Antwort auf Deutsch. Bestätige kurz, dass die Aktion ausgeführt wurde, wenn du ein action-Objekt befüllst.",
  "intent": "chat | stack_question | px_v1_interest | biometrics_update | block_control | calendar_query | lead | support",
  "action": null | { "type": "biometrics_update", "hrv": 72, "sleep": 84 } | { "type": "block_control", "action": "toggle" | "next" | "prev" },
  "stackUpdate": null,
  "score": null,
  "tags": []
}`;

    let parsed = null;

    if (!apiKey || apiKey === 'REPLACE_ME') {
      const cmd = message.toLowerCase().trim();
      let reply = "Systemstatus stabil. Alle Parameter nominal.";
      let action = null;
      let intent = "chat";
      let tags = ["local_fallback"];

      // 1. Check for biometrics update
      const hrvMatch = cmd.match(/(?:hrv|puls|herzfrequenz)\s*(?:auf|zu|setze|logge|log)?\s*(\d+)/i) || cmd.match(/(\d+)\s*(?:ms|hrv)/i);
      const sleepMatch = cmd.match(/(?:schlaf|sleep|sommeil|somme)\s*(?:auf|zu|setze|logge|log)?\s*(\d+)/i) || cmd.match(/(\d+)\s*(?:%|schlaf|sleep)/i);

      if (hrvMatch || sleepMatch) {
        intent = "biometrics_update";
        let hrv = hrvMatch ? parseInt(hrvMatch[1]) : (profile?.metrics?.hrv || 72);
        let sleep = sleepMatch ? parseInt(sleepMatch[1]) : (profile?.metrics?.sleep || 84);
        action = { type: "biometrics_update", hrv, sleep };
        reply = `Biometrie-Update: HRV auf ${hrv}ms ${sleepMatch ? `und Schlaf auf ${sleep}%` : ''} eingetragen. System kalibriert.`;
      } 
      // 2. Check for block/timer control
      else if (/pause|stop|pausiere|stoppe|halt/.test(cmd)) {
        intent = "block_control";
        action = { type: "block_control", action: "toggle" };
        reply = "Timer angehalten. Erholungsmodus aktiv.";
      } else if (/weiter|resume|start|starte/.test(cmd)) {
        intent = "block_control";
        action = { type: "block_control", action: "toggle" };
        reply = "Fokus-Timer fortgesetzt. ZNS-Kanal offen.";
      } else if (/nächster|nächste|next|skip|überspringe/.test(cmd)) {
        intent = "block_control";
        action = { type: "block_control", action: "next" };
        reply = "Block übersprungen. Nächste Phase eingeleitet.";
      } else if (/zurück|vorheriger|prev/.test(cmd)) {
        intent = "block_control";
        action = { type: "block_control", action: "prev" };
        reply = "Zurück zum vorherigen Block.";
      }
      // 3. Status queries
      else if (/status|befinden|system|nominal/.test(cmd)) {
        intent = "chat";
        reply = `Status: Nominal. HRV: ${profile?.metrics?.hrv || 72}ms. Schlaf: ${profile?.metrics?.sleep || 84}%. Alle Teilsysteme synchronisiert.`;
      }
      // 4. Bio-stack queries
      else if (/stack|supplement|ergänzung|kapsel|dosis/.test(cmd)) {
        intent = "stack_question";
        reply = "Bio-Stack aktiv. Nootropika-Zufuhr laut Zeitplan empfohlen. Hydration prüfen.";
      }
      // 5. Account linking
      else if (/link|verbinden|konto|account/.test(cmd)) {
        intent = "support";
        reply = `Verwende diesen Link, um dein Konto zu verknüpfen: ${linkUrl}`;
      }
      // 6. Generic tips
      else if (/tipp|ratschlag|hilfe|was\s+tun/.test(cmd)) {
        intent = "chat";
        const randomTip = PRONOIA_TIPS[Math.floor(Math.random() * PRONOIA_TIPS.length)] || "Trinke morgens 500ml Wasser mit Salz.";
        reply = `Tipp: ${randomTip}`;
      }

      parsed = {
        reply,
        intent,
        action,
        stackUpdate: null,
        score: null,
        tags
      };
    } else {
      const messages = [
        { role: "system", content: systemPrompt },
        ...history.slice(-8).map(h => ({ role: h.role, content: h.content })),
        { role: "user", content: message }
      ];

      const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "mistral-large-latest",
          messages,
          temperature: 0.75,
          max_tokens: 600,
          response_format: { type: "json_object" }
        })
      });

      const data = await response.json();
      parsed = JSON.parse(data.choices?.[0]?.message?.content);
    }

    let status = null;
    let debug = null;

    if (parsed.action && telegramId) {
      const siteUrl = process.env.PRONOIA_URL || "https://pronoia-3g6y.vercel.app";
      let event = "";
      let actionParams = {};
      if (parsed.action.type === "biometrics_update") {
        event = "biometrics_update";
        actionParams = { 
          hrv: parsed.action.hrv || (profile?.metrics?.hrv || 72), 
          sleep: parsed.action.sleep || (profile?.metrics?.sleep || 84) 
        };
      } else if (parsed.action.type === "block_control") {
        event = "block_control";
        actionParams = { action: parsed.action.action };
      }

      if (event) {
        const webhookSecret = process.env.WEBHOOK_SECRET;
        if (!webhookSecret) {
          console.warn("WEBHOOK_SECRET not set; skipping agent-webhook action forward.");
        } else {
          try {
            const webhookUrl = `${req.nextUrl.origin}/api/agent-webhook`;
            const finalRes = await fetch(webhookUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "X-Bot-Secret": webhookSecret
              },
              body: JSON.stringify({
                source: "telegram_webapp_chat",
                telegramUser,
                event,
                ...actionParams
              })
            });

            if (finalRes.ok) {
              const webhookData = await finalRes.json();
              status = webhookData.status;
              debug = webhookData.debug;
            }
          } catch (webhookErr) {
            console.error("Failed to forward action to agent-webhook:", webhookErr);
          }
        }
      }
    }

    return NextResponse.json({
      reply: parsed.reply,
      stackUpdate: parsed.stackUpdate || null,
      score: parsed.score || null,
      intent: parsed.intent,
      tags: parsed.tags || [],
      status,
      debug
    });

  } catch (error) {
    console.error("Telegram chat error:", error);
    return NextResponse.json({ reply: "Kurze Störung. Nochmal versuchen.", error: true }, { status: 500 });
  }
}

// ── Firestore Admin SDK Helper ─────────────────────────────────

// Resolve a Firebase Auth uid (the users/ doc id) from a Telegram ID.
// telegramId may be stored as a number or a string, so we try both.
async function lookupUidByTelegramId(telegramId) {
  if (!adminDb || telegramId === undefined || telegramId === null) return null;
  const usersRef = adminDb.collection("users");
  const idNum = Number(telegramId);

  let snap = await usersRef
    .where("profile.telegramId", "==", Number.isNaN(idNum) ? String(telegramId) : idNum)
    .limit(1)
    .get();

  if (snap.empty && !Number.isNaN(idNum)) {
    snap = await usersRef.where("profile.telegramId", "==", String(telegramId)).limit(1).get();
  }

  return snap.empty ? null : snap.docs[0].id;
}

// ── Agent Router ───────────────────────────────────────────────
//
// Routes a plaintext user message to the correct specialized agent
// (hermes | northstar | consensus) and returns a unified { reply, intent, tags } object.
// Rolling conversation history is persisted in Firestore under agentHistories[agentName].
async function routeToAgent(agentName, userMessage, userDocData, userDocRef, userId, telegramId, telegramUser, req) {
  const apiKey = process.env.MISTRAL_API_KEY;
  const siteOrigin = process.env.PRONOIA_URL || "https://pronoia-3g6y.vercel.app";
  const webhookSecret = process.env.WEBHOOK_SECRET;

  // Load rolling agent history from Firestore
  const agentHistories = userDocData?.agentHistories || {};
  const agentHistory = (agentHistories[agentName] || []).slice(-8);

  let reply = "Agenten-Verbindung temporär unterbrochen. Bitte erneut versuchen.";

  try {
    if (agentName === "hermes") {
      // Route via /api/agent-webhook hermes_trigger (serverless Hermes runner)
      if (!webhookSecret) {
        reply = "Hermes: WEBHOOK_SECRET nicht konfiguriert.";
      } else {
        // Build a fake chatId and message structure for the serverless Hermes runner
        const hermesRes = await fetch(`${siteOrigin}/api/agent-webhook`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Bot-Secret": webhookSecret
          },
          body: JSON.stringify({
            source: "telegram_bot_direct",
            event: "hermes_trigger",
            telegramUser,
            chatId: `telegram_direct_${telegramId || "unknown"}`,
            participants: userId && userId !== "local" ? [userId] : [],
            message: {
              text: userMessage,
              senderUid: userId && userId !== "local" ? userId : null
            }
          })
        });

        if (hermesRes.ok) {
          const hermesData = await hermesRes.json();
          if (hermesData.reply) {
            reply = hermesData.reply;
          } else {
            reply = "Hermes: Antwort verarbeitet. Prüfe den Chat in der App für die vollständige Nachricht.";
          }
        } else {
          reply = "Hermes: Serverless-Ausführung fehlgeschlagen. Prüfe MISTRAL_API_KEY.";
        }
      }
    } else if (agentName === "northstar") {
      const profile = userDocData?.profile || {};
      const futureSelf = profile.futureSelf || {};
      const context = {
        goals: profile.goals || "",
        metrics: {
          hrv: profile.metrics?.hrv || 72,
          sleep: profile.metrics?.sleep || 84
        },
        todayBlocks: []
      };

      const nsRes = await fetch(`${siteOrigin}/api/northstar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          futureSelf,
          context,
          mode: "mentor",
          userInput: userMessage,
          history: agentHistory
        })
      });

      if (nsRes.ok) {
        const nsData = await nsRes.json();
        reply = nsData.message || "NorthStar: Keine Antwort erhalten.";
      } else {
        reply = "NorthStar: Verbindung fehlgeschlagen.";
      }
    } else if (agentName === "consensus") {
      const profile = userDocData?.profile || {};
      const hrv = profile.metrics?.hrv || 72;
      const sleep = profile.metrics?.sleep || 84;
      const frictionLogs = userDocData?.frictionLogs || [];

      const csRes = await fetch(`${siteOrigin}/api/consensus`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hrv, sleep, frictionLogs, activeBlock: "Focus" })
      });

      if (csRes.ok) {
        const csData = await csRes.json();
        const { leader, directive, agentStatuses } = csData;
        const statusLines = agentStatuses
          ? Object.entries(agentStatuses)
              .map(([id, s]) => `• *${id}* [${s.status}]: ${s.text}`)
              .join("\n")
          : "";

        // If user asked a free-form question, run Mistral with consensus context
        if (userMessage.length > 10 && apiKey && apiKey !== "REPLACE_ME") {
          const csSystemPrompt = `Du bist A.06 Orchestrator (Consensus-Agent) im Pronoia Life OS.
Aktuelle Agent-Lage: Anführer: ${leader}, Direktive: ${directive}
${statusLines}
Beantworte die Frage des Nutzers präzise und kurz auf Basis dieser Agenten-Lage.`;
          const csQRes = await fetch("https://api.mistral.ai/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              model: "mistral-large-latest",
              messages: [
                { role: "system", content: csSystemPrompt },
                ...agentHistory,
                { role: "user", content: userMessage }
              ],
              temperature: 0.6,
              max_tokens: 400
            })
          });
          if (csQRes.ok) {
            const csQData = await csQRes.json();
            reply = csQData.choices?.[0]?.message?.content?.trim() || directive;
          } else {
            reply = `*Consensus Status*\n\n${statusLines}\n\n*Direktive:* ${directive}`;
          }
        } else {
          reply = `*Consensus Status — A.06 Orchestrator*\n\n${statusLines}\n\n*Direktive:* ${directive}`;
        }
      } else {
        reply = "Consensus: Verbindung zum Orchestrator fehlgeschlagen.";
      }
    }
  } catch (err) {
    console.error(`[routeToAgent] Error routing to ${agentName}:`, err.message);
    reply = `${agentName.charAt(0).toUpperCase() + agentName.slice(1)}: Temporäre Störung. Bitte erneut versuchen.`;
  }

  // Persist rolling history in Firestore
  if (userDocRef) {
    try {
      const newHistory = [
        ...agentHistory,
        { role: "user", content: userMessage },
        { role: "assistant", content: reply }
      ].slice(-10);
      await userDocRef.update({
        [`agentHistories.${agentName}`]: newHistory
      });
    } catch (histErr) {
      console.warn("[routeToAgent] Failed to persist agent history:", histErr.message);
    }
  }

  return {
    reply,
    intent: "agent_chat",
    tags: [agentName]
  };
}
