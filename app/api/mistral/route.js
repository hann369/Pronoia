import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

// ── Bestehender Endpoint (unveränder) ─────────────────────────
export async function POST(req) {
  try {
    const { prompt, systemPrompt, tools, tool_choice } = await req.json();

    const apiKey = process.env.MISTRAL_API_KEY;
    
    if (!apiKey || apiKey === 'REPLACE_ME') {
      return NextResponse.json({ 
        choices: [{ message: { content: "AI Sync eingeschränkt (API Key fehlt). Systemstatus stabil." } }] 
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
    if (!apiKey || apiKey === 'REPLACE_ME') {
      return NextResponse.json({ reply: "API Key fehlt.", error: true });
    }

    const telegramId = telegramUser?.id || null;
    const linkUrl = telegramId ? `https://pronoia-3g6y.vercel.app/life-os?tg_id=${telegramId}` : "https://pronoia-3g6y.vercel.app/life-os";

    // Retrieve Knowledge Vault Items (RAG Context)
    let vaultContext = "";
    if (db) {
      try {
        let userId = 'local';
        
        // 1. Resolve userId from telegramId if available
        const telegramId = telegramUser?.id || profile?.telegramId || null;
        if (telegramId) {
          try {
            const usersRef = collection(db, 'users');
            const idStr = String(telegramId);
            const idNum = Number(telegramId);

            let userQuery = query(usersRef, where('profile.telegramId', '==', idStr));
            let userSnap = await getDocs(userQuery);
            
            if (userSnap.empty && !isNaN(idNum)) {
              userQuery = query(usersRef, where('profile.telegramId', '==', idNum));
              userSnap = await getDocs(userQuery);
            }

            if (!userSnap.empty) {
              userId = userSnap.docs[0].id; // The document ID is the Firebase Auth uid
            } else {
              userId = profile?.uid || profile?.userId || profile?.id || 'local';
            }
          } catch (err) {
            console.warn("Failed to lookup user by telegramId in Firestore:", err);
            userId = profile?.uid || profile?.userId || profile?.id || 'local';
          }
        } else {
          userId = profile?.uid || profile?.userId || profile?.id || 'local';
        }

        const vaultRef = collection(db, 'vault_items');
        const q = query(vaultRef, where('user_id', '==', userId));
        const snap = await getDocs(q);
        let items = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Sort in memory by created_at desc to avoid requiring composite Firestore indexes
        items.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
        items = items.slice(0, 5); // get top 5 items

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
                    fileContent = fileContent.substring(0, 1500); // limit to 1500 chars to save token space
                  }
                } else if (isPdf) {
                  const fileRes = await fetch(item.content, { signal: AbortSignal.timeout(6000) }); // longer timeout for PDF
                  if (fileRes.ok) {
                    const arrayBuffer = await fileRes.arrayBuffer();
                    const buffer = Buffer.from(arrayBuffer);
                    const pdfParser = require('pdf-parse');
                    const pdfData = await pdfParser(buffer);
                    fileContent = pdfData.text;
                    fileContent = fileContent.replace(/\s+/g, ' ').substring(0, 1500); // limit to 1500 chars
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
Nutze diesen Kontext aus dem Knowledge Vault des Nutzers für personalisierte, kontextbasierte Antworten:
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
    const parsed = JSON.parse(data.choices?.[0]?.message?.content);

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
