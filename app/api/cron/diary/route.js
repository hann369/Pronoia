// app/api/cron/diary/route.js
//
// Vercel Cron-compatible GET endpoint — the NorthStar "self-writing diary".
// Runs once at the end of each day (configure in vercel.json). For every user
// who has set a Future-Self vision, it aggregates the day's OS data from
// Firestore (gym sessions, biometrics, daily plan, focus minutes), asks the
// shared /api/mistral `compose_diary_entry` action to weave it into a
// reflective first-person entry, and inserts it into the Supabase
// `northstar_entries` table flagged `is_auto_composed`. Idempotent per day.

import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Short German gym summary from sessions finished today (server day).
function buildGymSummary(gymSessions, startOfDay) {
  const today = (gymSessions || []).filter((s) => s.finishedAt >= startOfDay);
  if (today.length === 0) return "";
  const volume = today.reduce(
    (sum, s) => sum + (s.exercises || []).reduce((v, ex) => {
      const reps = parseInt(String(ex.reps).match(/\d+/)?.[0] || "0", 10);
      return v + (Number(ex.sets) || 0) * reps * (Number(ex.weight) || 0);
    }, 0),
    0
  );
  const focusList = today.map((s) => s.focus).filter(Boolean);
  const focusStr = focusList.length ? focusList.join(" & ") : "Training";
  return volume > 0
    ? `Im Gym: ${focusStr} — ${volume.toLocaleString("de-DE")} kg über ${today.length} Session(s) bewegt`
    : `Im Gym: ${focusStr} (${today.length} Session)`;
}

export async function GET(request) {
  if (!adminDb) {
    return NextResponse.json({ error: "Firestore Admin SDK not configured" }, { status: 503 });
  }
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  // Cron auth (same pattern as /api/cron/automate)
  const authHeader = request.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfDayIso = new Date(startOfDay).toISOString();
  const dateLabel = now.toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" });
  const composeUrl = new URL("/api/mistral", request.url).toString();
  const supaHeaders = {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    "Content-Type": "application/json"
  };

  let composed = 0;
  let skipped = 0;
  let failed = 0;

  try {
    const snap = await adminDb.collection("users").get();

    for (const doc of snap.docs) {
      const data = doc.data();
      const uid = doc.id;
      const futureSelf = data.profile?.futureSelf;

      // Only for users who have actually set up a vision.
      const hasVision = !!(futureSelf && (
        futureSelf.identity ||
        Object.values(futureSelf.visions || {}).some(Boolean) ||
        (futureSelf.values || []).length
      ));
      if (!hasVision) { skipped++; continue; }

      try {
        // Idempotency: skip if an auto entry already exists for today.
        const checkRes = await fetch(
          `${SUPABASE_URL}/rest/v1/northstar_entries?user_id=eq.${encodeURIComponent(uid)}&is_auto_composed=eq.true&created_at=gte.${encodeURIComponent(startOfDayIso)}&select=id&limit=1`,
          { headers: supaHeaders }
        );
        if (checkRes.ok) {
          const existing = await checkRes.json();
          if (Array.isArray(existing) && existing.length > 0) { skipped++; continue; }
        }

        // Aggregate the day's data from Firestore.
        const gymSessions = data.tabs?.gymSessions?.sessions || [];
        const focusSessions = data.tabs?.managerFocus?.sessions || [];
        const focusMinutes = Math.round(
          focusSessions
            .filter((s) => (s.finishedAt || s.endsAt || 0) >= startOfDay)
            .reduce((sum, s) => sum + (s.durationSec || s.lengthSec || 0), 0) / 60
        );
        const day = {
          dateLabel,
          gymSummary: buildGymSummary(gymSessions, startOfDay),
          biometrics: {
            hrv: data.profile?.metrics?.hrv || null,
            sleep: data.profile?.metrics?.sleep || null,
            focus: null
          },
          focusMinutes,
          plannedBlocks: (data.blocks || []).slice(0, 5).map((b) => b.title).filter(Boolean),
          futureSelf: {
            identity: futureSelf.identity || "",
            archetypeName: futureSelf.archetypeName || "",
            values: futureSelf.values || []
          }
        };

        // Compose via the shared Mistral action.
        const cRes = await fetch(composeUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "compose_diary_entry", day })
        });
        if (!cRes.ok) { failed++; continue; }
        const entry = await cRes.json();

        const wordCount = (entry.content || "").trim().split(/\s+/).length;
        const payload = {
          user_id: uid,
          title: entry.title,
          content: entry.content,
          reading_time_mins: Math.max(1, Math.ceil(wordCount / 200)),
          tags: entry.tags || ["TAGEBUCH"],
          biometrics_hrv: data.profile?.metrics?.hrv || null,
          biometrics_focus: null,
          biometrics_sleep: data.profile?.metrics?.sleep || null,
          future_self_hint: entry.future_self_hint || null,
          is_auto_composed: true
        };

        const insRes = await fetch(`${SUPABASE_URL}/rest/v1/northstar_entries`, {
          method: "POST",
          headers: { ...supaHeaders, Prefer: "return=minimal" },
          body: JSON.stringify(payload)
        });
        if (insRes.ok) composed++; else failed++;
      } catch (userErr) {
        console.error("[Cron Diary] User compose failed:", uid, userErr.message);
        failed++;
      }
    }

    return NextResponse.json({ ok: true, timestamp: now.toISOString(), composed, skipped, failed });
  } catch (error) {
    console.error("[Cron Diary] Fatal error:", error);
    return NextResponse.json({ error: error.message, composed, skipped, failed }, { status: 500 });
  }
}
