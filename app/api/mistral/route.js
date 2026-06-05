import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

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
export async function POST(req) {
  try {
    const { prompt, systemPrompt, tools, tool_choice } = await req.json();

    const apiKey = process.env.MISTRAL_API_KEY;
    
    if (!apiKey || apiKey === 'REPLACE_ME') {
      const lowerPrompt = prompt.toLowerCase();
      
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

      // 2. Skill Lab Adaptive materials generation (generateSkillMaterials)
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

    // Retrieve Knowledge Vault Items (RAG Context)
    let vaultContext = "";
    try {
      let userId = 'local';
      
      // 1. Resolve userId from telegramId if available via Firestore REST runQuery (bypasses SDK rules)
      const telegramId = telegramUser?.id || profile?.telegramId || null;
      if (telegramId) {
        try {
          const matchingUsers = await runRestQuery("users", "profile.telegramId", telegramId);
          if (matchingUsers.length > 0) {
            userId = matchingUsers[0].id; // The document ID is the Firebase Auth uid
          } else {
            userId = profile?.uid || profile?.userId || profile?.id || 'local';
          }
        } catch (err) {
          console.warn("Failed to lookup user by telegramId in Firestore REST:", err);
          userId = profile?.uid || profile?.userId || profile?.id || 'local';
        }
      } else {
        userId = profile?.uid || profile?.userId || profile?.id || 'local';
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

USER-PROFIL: ${JSON.stringify(profile || {})}

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
        try {
          const webhookRes = await fetch(`${siteUrl}/app/api/agent-webhook` || `${siteUrl}/api/agent-webhook`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Bot-Secret": process.env.WEBHOOK_SECRET || "DEIN_WEBHOOK_SECRET_HIER"
            },
            body: JSON.stringify({
              source: "telegram_webapp_chat",
              telegramUser,
              event,
              ...actionParams
            })
          });
          
          // Fallback if local/relative path differs or deployment hasn't finished, try relative path local fetch if on the same host
          let finalRes = webhookRes;
          if (!webhookRes.ok) {
            // Try fetching absolute path to route API
            const fallbackUrl = `${req.nextUrl.origin}/api/agent-webhook`;
            finalRes = await fetch(fallbackUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "X-Bot-Secret": process.env.WEBHOOK_SECRET || "DEIN_WEBHOOK_SECRET_HIER"
              },
              body: JSON.stringify({
                source: "telegram_webapp_chat",
                telegramUser,
                event,
                ...actionParams
              })
            });
          }

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

// ── Firestore REST API Helpers ─────────────────────────────────

async function runRestQuery(collectionId, fieldPath, value) {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!projectId || !apiKey) return [];

  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery?key=${apiKey}`;
  
  const payload = {
    structuredQuery: {
      from: [{ collectionId }],
      where: {
        fieldFilter: {
          field: { fieldPath },
          op: "EQUAL",
          value: { stringValue: String(value) }
        }
      }
    }
  };

  // Handle special case for lookup by telegramId where type can be number or string
  if (collectionId === "users" && fieldPath === "profile.telegramId" && !isNaN(Number(value))) {
    payload.structuredQuery.where.fieldFilter.op = "IN";
    payload.structuredQuery.where.fieldFilter.value = {
      arrayValue: {
        values: [
          { integerValue: String(value) },
          { stringValue: String(value) }
        ]
      }
    };
  }

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    console.error(`Firestore REST query failed for ${collectionId}: ${res.status}`);
    return [];
  }

  const results = await res.json();
  if (!Array.isArray(results)) return [];

  return results
    .filter(r => r.document)
    .map(r => {
      const doc = r.document;
      const parts = doc.name.split("/");
      const docId = parts[parts.length - 1];
      const data = parseFirestoreFields(doc.fields || {});
      return { id: docId, ...data };
    });
}

function parseFirestoreFields(fields) {
  const result = {};
  for (const [key, value] of Object.entries(fields)) {
    if ('stringValue' in value) result[key] = value.stringValue;
    else if ('integerValue' in value) result[key] = parseInt(value.integerValue);
    else if ('doubleValue' in value) result[key] = parseFloat(value.doubleValue);
    else if ('booleanValue' in value) result[key] = value.booleanValue;
    else if ('mapValue' in value) result[key] = parseFirestoreFields(value.mapValue.fields || {});
    else if ('arrayValue' in value) {
      result[key] = (value.arrayValue.values || []).map(v => {
        if ('stringValue' in v) return v.stringValue;
        if ('integerValue' in v) return parseInt(v.integerValue);
        if ('mapValue' in v) return parseFirestoreFields(v.mapValue.fields || {});
        return null;
      });
    }
  }
  return result;
}
