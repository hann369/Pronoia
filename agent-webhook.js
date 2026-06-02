// pages/api/agent-webhook.js
// → https://pronoia-3g6y.vercel.app/api/agent-webhook
// Empfängt Daten aus der Telegram Web App UND vom Bot-Server

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  // Secret prüfen
  const secret = req.headers["x-bot-secret"];
  if (secret !== process.env.WEBHOOK_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const payload = req.body;
  const { event, source, telegramUser, profile, stack, chatSummary } = payload;

  console.log(`[Pronoia Webhook] ${source} → ${event}`, {
    user: telegramUser?.username || telegramUser?.id,
    event
  });

  // ── Event Routing ──────────────────────────────────────────

  if (event === "onboarding_complete") {
    // Neuer User hat Onboarding abgeschlossen
    await saveUserProfile({ telegramUser, profile });
    // Hier: Email-Notification, Slack-Alert, etc.
  }

  if (event === "stack_sync") {
    // User hat Stack gesynct
    await saveStack({ telegramUser, profile, stack, chatSummary });
  }

  if (event === "telegram_message") {
    // Normaler Bot-Chat (vom Bot-Server)
    const { ai_analysis } = payload;
    if (ai_analysis?.intent === "px_v1_interest" || ai_analysis?.priority === "high") {
      // High-value Lead — hier notification triggern
      console.log("🔥 HIGH INTENT LEAD:", telegramUser?.first_name, ai_analysis?.extracted);
    }
  }

  return res.status(200).json({ ok: true, event, timestamp: new Date().toISOString() });
}

// ── Supabase Helpers ───────────────────────────────────────────

async function saveUserProfile({ telegramUser, profile }) {
  if (!process.env.SUPABASE_URL) return;
  await fetch(`${process.env.SUPABASE_URL}/rest/v1/pronoia_users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: process.env.SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
      Prefer: "resolution=merge-duplicates"
    },
    body: JSON.stringify({
      telegram_id: telegramUser?.id,
      username: telegramUser?.username || null,
      name: telegramUser?.first_name || profile?.name || null,
      goals: profile?.goals || [],
      experience: profile?.experience || null,
      age: profile?.age || null,
      challenge: profile?.challenge || null,
      source: "telegram_webapp",
      created_at: new Date().toISOString()
    })
  });
}

async function saveStack({ telegramUser, profile, stack, chatSummary }) {
  if (!process.env.SUPABASE_URL) return;
  await fetch(`${process.env.SUPABASE_URL}/rest/v1/pronoia_stacks`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: process.env.SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}`
    },
    body: JSON.stringify({
      telegram_id: telegramUser?.id,
      username: telegramUser?.username || null,
      stack,
      profile,
      chat_summary: chatSummary || [],
      synced_at: new Date().toISOString()
    })
  });
}
