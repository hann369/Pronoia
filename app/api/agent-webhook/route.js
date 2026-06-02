// app/api/agent-webhook/route.js
// NEU ANLEGEN: app/api/agent-webhook/route.js

import { NextResponse } from "next/server";

export async function POST(req) {
  const secret = req.headers.get("x-bot-secret");
  if (secret !== process.env.WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await req.json();
  const { event, source, telegramUser, profile, stack, chatSummary } = payload;

  console.log(`[Pronoia Webhook] ${source} → ${event}`, {
    user: telegramUser?.username || telegramUser?.id
  });

  if (event === "onboarding_complete") {
    await saveUser({ telegramUser, profile });
  }

  if (event === "stack_sync") {
    await saveStack({ telegramUser, stack, profile, chatSummary });
  }

  if (event === "telegram_message") {
    const { ai_analysis } = payload;
    if (ai_analysis?.intent === "px_v1_interest" || ai_analysis?.priority === "high") {
      console.log("🔥 HIGH INTENT LEAD:", telegramUser?.first_name, ai_analysis);
      // Hier später: Slack/Email notification
    }
  }

  return NextResponse.json({ ok: true, event, timestamp: new Date().toISOString() });
}

async function saveUser({ telegramUser, profile }) {
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
      name: telegramUser?.first_name || null,
      goals: profile?.goals || [],
      experience: profile?.experience || null,
      age: profile?.age || null,
      challenge: profile?.challenge || null,
      source: "telegram_webapp",
      created_at: new Date().toISOString()
    })
  });
}

async function saveStack({ telegramUser, stack, profile, chatSummary }) {
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
