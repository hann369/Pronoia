import { NextResponse } from 'next/server';

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

TONALITÄT: Direkt, klar, kein Bullshit, wissenschaftlich fundiert, Deutsch.

USER-PROFIL: ${JSON.stringify(profile || {})}

ANTWORT NUR ALS JSON:
{
  "reply": "Antwort auf Deutsch. Falls der Nutzer einen Befehl wünscht (z.B. HRV loggen oder Timer umschalten), erkläre ihm kurz, dass er auch /hrv [Wert] oder /focus nutzen kann.",
  "stackUpdate": null,
  "score": null,
  "intent": "chat | stack_question | px_v1_interest | biometrics_update | block_control | calendar_query | lead | support",
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

    return NextResponse.json({
      reply: parsed.reply,
      stackUpdate: parsed.stackUpdate || null,
      score: parsed.score || null,
      intent: parsed.intent,
      tags: parsed.tags || []
    });

  } catch (error) {
    console.error("Telegram chat error:", error);
    return NextResponse.json({ reply: "Kurze Störung. Nochmal versuchen.", error: true }, { status: 500 });
  }
}
