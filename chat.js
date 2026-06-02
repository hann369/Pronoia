// pages/api/chat.js
// → https://pronoia-3g6y.vercel.app/api/chat
// Empfängt Chat-Nachrichten aus der Telegram Web App, ruft Mistral auf

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { message, profile, history = [], telegramUser } = req.body;
  if (!message) return res.status(400).json({ error: "No message" });

  const systemPrompt = `Du bist der Pronoia Assistant — ein präziser, direkt-ehrlicher KI-Berater für Self-Optimization.

ÜBER PRONOIA:
- Performance-Brand für junge europäische Männer (17–28)
- Fünf Säulen: Health, Fitness, Supplementation, Social, Skills
- Erstes Produkt: PX-V1 (Nootropic-Stack, bald verfügbar)
- Philosophie: Primal/ancestral, anti-dogma, Maskulinität, Natur als optimal

TONALITÄT:
- Direkt, klar, ohne Bullshit
- Wissenschaftlich fundiert aber verständlich
- Kein motivational fluff
- Deutsch, Jugendsprache erlaubt

USER-PROFIL:
${JSON.stringify(profile, null, 2)}

ANTWORT-FORMAT (immer JSON):
{
  "reply": "Deine Antwort auf Deutsch",
  "stackUpdate": null,  // oder Array mit {name, dose, time} wenn Stack update empfohlen
  "score": null,        // oder Zahl 0-100 wenn Stack bewertet
  "intent": "chat | stack_question | px_v1_interest | lead | support",
  "tags": []
}`;

  const messages = [
    ...history.slice(-8).map(h => ({ role: h.role, content: h.content })),
    { role: "user", content: message }
  ];

  try {
    const mistralRes = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.MISTRAL_API_KEY}`
      },
      body: JSON.stringify({
        model: "mistral-large-latest",
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        temperature: 0.75,
        max_tokens: 600,
        response_format: { type: "json_object" }
      })
    });

    const mistralData = await mistralRes.json();
    const content = mistralData.choices?.[0]?.message?.content;
    const parsed = JSON.parse(content);

    // Side-effect: Daten loggen/speichern (optional Supabase)
    if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
      logConversation({ message, reply: parsed.reply, profile, telegramUser, intent: parsed.intent, tags: parsed.tags });
    }

    return res.status(200).json({
      reply: parsed.reply,
      stackUpdate: parsed.stackUpdate || null,
      score: parsed.score || null,
      intent: parsed.intent,
      tags: parsed.tags || []
    });

  } catch (err) {
    console.error("Mistral error:", err);
    return res.status(500).json({ reply: "Kurze Störung. Bitte nochmal versuchen.", error: true });
  }
}

// Optional: In Supabase loggen
async function logConversation(data) {
  try {
    await fetch(`${process.env.SUPABASE_URL}/rest/v1/pronoia_conversations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: process.env.SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}`
      },
      body: JSON.stringify({
        telegram_id: data.telegramUser?.id || null,
        telegram_username: data.telegramUser?.username || null,
        user_name: data.telegramUser?.first_name || data.profile?.name || null,
        message: data.message,
        reply: data.reply,
        intent: data.intent,
        tags: data.tags,
        profile: data.profile,
        created_at: new Date().toISOString()
      })
    });
  } catch (e) {
    console.warn("Supabase log failed:", e.message);
  }
}
