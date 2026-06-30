// app/api/cron/automate/route.js
//
// Vercel Cron-compatible GET endpoint.
// Runs once per day at 08:00 (configure in vercel.json). Vercel's Hobby plan
// only permits daily crons; the task-due logic fires in the 08:00–10:00 window,
// so a single daily run covers the daily/weekly automations.
// For each user that has registered automations, checks whether
// any task is due, executes it, and notifies the user via Telegram.
//
// Currently supported task types (detected from the task string):
//  - "health news"  → fetches Google News RSS for longevity/health, summarises, pushes plan update
//  - generic text   → uses Mistral to generate a plan based on the task description

import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}`;

// ── Schedule parsing ────────────────────────────────────────────
// Returns true if a task with this schedule string is due right now.
function isDue(automation) {
  const schedule = (automation.schedule || "").toLowerCase();
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon … 6=Sat
  const hour = now.getHours();
  const dayNames = {
    montag: 1, dienstag: 2, mittwoch: 3, donnerstag: 4,
    freitag: 5, samstag: 6, sonntag: 0,
    monday: 1, tuesday: 2, wednesday: 3, thursday: 4,
    friday: 5, saturday: 6, sunday: 0
  };

  // "every friday" / "jeden freitag" → fire on fridays between 08:00-09:00 (morning window)
  for (const [name, dayNum] of Object.entries(dayNames)) {
    if (schedule.includes(name)) {
      if (dayOfWeek === dayNum && hour >= 8 && hour < 10) {
        const lastRun = automation.lastRun ? new Date(automation.lastRun) : null;
        if (lastRun) {
          const diffHours = (now - lastRun) / (1000 * 60 * 60);
          return diffHours > 23;
        }
        return true;
      }
    }
  }

  // "täglich" / "daily" / "every day" → fire every day between 08:00-09:00
  if (/täglich|daily|every day|jeden tag/.test(schedule)) {
    if (hour >= 8 && hour < 10) {
      const lastRun = automation.lastRun ? new Date(automation.lastRun) : null;
      if (lastRun) {
        const diffHours = (now - lastRun) / (1000 * 60 * 60);
        return diffHours > 23;
      }
      return true;
    }
  }

  // Fallback: if nextRun is set and has passed
  if (automation.nextRun) {
    const nextRun = new Date(automation.nextRun);
    if (now >= nextRun) return true;
  }

  return false;
}

// ── Health / longevity RSS fetcher ──────────────────────────────
async function fetchHealthNews() {
  const urls = [
    "https://news.google.com/rss/search?q=longevity+health+biohacking&hl=de&gl=DE&ceid=DE:de",
    "https://news.google.com/rss/search?q=sleep+hrv+performance+science&hl=de&gl=DE&ceid=DE:de"
  ];

  const items = [];
  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "Pronoia-Bot/1.0" },
        signal: AbortSignal.timeout(8000)
      });
      if (!res.ok) continue;
      const text = await res.text();
      // Parse RSS titles from XML
      const titleMatches = [...text.matchAll(/<title><!\[CDATA\[(.*?)\]\]><\/title>/g)];
      const linkMatches = [...text.matchAll(/<link>(https?:\/\/[^<]+)<\/link>/g)];
      titleMatches.slice(1, 6).forEach((m, i) => {
        items.push({ title: m[1], link: linkMatches[i + 1]?.[1] || "" });
      });
    } catch (e) {
      console.warn("[Cron Automate] RSS fetch failed:", e.message);
    }
  }
  return items.slice(0, 5);
}

// ── Mistral summariser ──────────────────────────────────────────
async function summariseAndPlan(task, newsItems, userProfile) {
  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey || apiKey === "REPLACE_ME") {
    return `📋 *Automation: ${task}*\n\n_LLM nicht konfiguriert. Hier sind die rohen News:_\n${newsItems.map((n, i) => `${i + 1}. ${n.title}`).join("\n")}`;
  }

  const newsText = newsItems.length > 0
    ? newsItems.map((n, i) => `${i + 1}. ${n.title}`).join("\n")
    : "Keine aktuellen Meldungen gefunden.";

  const systemPrompt = `Du bist der Pronoia Bio-Strategist. Aufgabe: ${task}

Nutzer-Profil:
- HRV: ${userProfile?.metrics?.hrv || 72}ms
- Schlaf: ${userProfile?.metrics?.sleep || 84}%
- Ziele: ${userProfile?.goals || "Performance"}

Aktuelle Health-News:
${newsText}

Erstelle eine klare, kurze Empfehlung (max. 5 Punkte) für den Nutzer auf Basis der News und seines Profils. Schreibe kompakt für Telegram (nutze Markdown, Aufzählungszeichen, keine langen Texte). Schreibe auf Deutsch.`;

  try {
    const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "mistral-large-latest",
        messages: [{ role: "user", content: systemPrompt }],
        temperature: 0.65,
        max_tokens: 600
      }),
      signal: AbortSignal.timeout(25000)
    });

    if (res.ok) {
      const data = await res.json();
      return data.choices?.[0]?.message?.content?.trim() || "Keine Empfehlung generiert.";
    }
  } catch (e) {
    console.error("[Cron Automate] Mistral call failed:", e.message);
  }

  return `📋 *Automation: ${task}*\n\n${newsText}`;
}

// ── Telegram sender ─────────────────────────────────────────────
async function sendTelegramMessage(chatId, text) {
  if (!process.env.TELEGRAM_TOKEN) return;
  try {
    await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "Markdown"
      }),
      signal: AbortSignal.timeout(10000)
    });
  } catch (e) {
    console.warn("[Cron Automate] Telegram send failed:", e.message);
  }
}

// ── Main cron handler ───────────────────────────────────────────
export async function GET(request) {
  if (!adminDb) {
    return NextResponse.json({ error: "Firestore Admin SDK not configured" }, { status: 503 });
  }

  // Cron auth
  const authHeader = request.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let processed = 0;
  let skipped = 0;
  const now = new Date().toISOString();

  try {
    // Fetch all users — Firestore != queries require a composite index that
    // may not exist yet, so we scan and filter in-memory instead.
    const snap = await adminDb.collection("users").get();

    for (const doc of snap.docs) {
      const data = doc.data();
      const automations = data.automations || [];
      if (!automations.length) continue;

      const telegramId = data.profile?.telegramId || data.telegramId;
      if (!telegramId) { skipped++; continue; }

      const updatedAutomations = [];

      for (const auto of automations) {
        if (!isDue(auto)) {
          updatedAutomations.push(auto);
          continue;
        }

        processed++;
        const taskLower = (auto.task || "").toLowerCase();
        let message = "";

        try {
          // Health news task
          if (taskLower.includes("health") || taskLower.includes("news") || taskLower.includes("longevity")) {
            const newsItems = await fetchHealthNews();
            const summary = await summariseAndPlan(auto.task, newsItems, data.profile);
            message = `🤖 *Pronoia Automation — ${auto.schedule}*\n\n${summary}`;
          } else {
            // Generic task: ask Mistral to fulfil it
            const summary = await summariseAndPlan(auto.task, [], data.profile);
            message = `🤖 *Pronoia Automation — ${auto.schedule}*\n\n${summary}`;
          }

          await sendTelegramMessage(telegramId, message);
        } catch (taskErr) {
          console.error("[Cron Automate] Task execution failed:", taskErr.message);
        }

        // Calculate next run (same schedule, next week/day)
        const nextRun = new Date();
        if (/woche|weekly|freitag|montag|dienstag|mittwoch|donnerstag|samstag|sonntag|friday|monday|tuesday|wednesday|thursday|saturday|sunday/.test(taskLower + auto.schedule.toLowerCase())) {
          nextRun.setDate(nextRun.getDate() + 7);
        } else {
          nextRun.setDate(nextRun.getDate() + 1);
        }

        updatedAutomations.push({
          ...auto,
          lastRun: now,
          nextRun: nextRun.toISOString()
        });
      }

      // Persist updated automation timestamps
      await doc.ref.update({ automations: updatedAutomations });
    }

    return NextResponse.json({
      ok: true,
      timestamp: now,
      processed,
      skipped
    });
  } catch (error) {
    console.error("[Cron Automate] Fatal error:", error);
    return NextResponse.json({ error: error.message, processed, skipped }, { status: 500 });
  }
}
