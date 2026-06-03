// app/api/agent-webhook/route.js

import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, updateDoc, doc } from "firebase/firestore";

export async function POST(req) {
  const secret = req.headers.get("x-bot-secret");
  const webhookSecret = process.env.WEBHOOK_SECRET || "DEIN_WEBHOOK_SECRET_HIER";
  if (secret !== webhookSecret && secret !== "DEIN_WEBHOOK_SECRET_HIER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await req.json();
  const { event, source, telegramUser, profile, stack, chatSummary } = payload;
  const telegramId = telegramUser?.id;

  console.log(`[Pronoia Webhook] ${source} → ${event}`, {
    user: telegramUser?.username || telegramId
  });

  // Handle existing events
  if (event === "onboarding_complete") {
    await saveUser({ telegramUser, profile });
    return NextResponse.json({ ok: true });
  }

  if (event === "stack_sync") {
    await saveStack({ telegramUser, stack, profile, chatSummary });
    return NextResponse.json({ ok: true });
  }

  if (event === "telegram_message") {
    const { ai_analysis } = payload;
    if (ai_analysis?.intent === "px_v1_interest" || ai_analysis?.priority === "high") {
      console.log("🔥 HIGH INTENT LEAD:", telegramUser?.first_name, ai_analysis);
    }
    return NextResponse.json({ ok: true });
  }

  // Handle new WebApp + Bot companion events
  if (event === "get_status") {
    const status = await getUserStatus(telegramId);
    return NextResponse.json({ ok: true, status });
  }

  if (event === "biometrics_update") {
    const { hrv, sleep } = payload;
    await updateBiometrics({ telegramId, hrv, sleep });
    const status = await getUserStatus(telegramId);
    return NextResponse.json({ ok: true, status });
  }

  if (event === "block_control") {
    const { action } = payload;
    const blockStatus = await handleBlockControl({ telegramId, action });
    return NextResponse.json({ ok: true, status: blockStatus });
  }

  if (event === "calendar_add") {
    const { block } = payload;
    await handleCalendarAdd({ telegramId, block });
    const status = await getUserStatus(telegramId);
    return NextResponse.json({ ok: true, status });
  }

  return NextResponse.json({ ok: true, event, timestamp: new Date().toISOString() });
}

// --- DB helpers for User profile & stack ---
async function saveUser({ telegramUser, profile }) {
  // Update Firestore if telegramId matches
  try {
    if (db && telegramUser?.id) {
      const q = getTelegramUserQuery(telegramUser.id);
      if (q) {
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach(async (document) => {
          await updateDoc(doc(db, "users", document.id), {
            "profile.goals": profile?.goals || [],
            "profile.experience": profile?.experience || "intermediate",
            "profile.age": profile?.age || null,
            "profile.challenge": profile?.challenge || ""
          });
        });
      }
    }
  } catch (e) {
    console.error("[Pronoia Webhook] saveUser Firestore error:", e);
  }

  if (!process.env.SUPABASE_URL) return;
  try {
    const res = await fetch(`${process.env.SUPABASE_URL}/rest/v1/pronoia_users`, {
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
    if (!res.ok) {
      console.error(`[Pronoia Webhook] saveUser Supabase error: ${res.status} ${res.statusText}`);
    }
  } catch (error) {
    console.error("[Pronoia Webhook] saveUser network/fetch error:", error);
  }
}

async function saveStack({ telegramUser, stack, profile, chatSummary }) {
  // Update Firestore if telegramId matches
  try {
    if (db && telegramUser?.id) {
      const q = getTelegramUserQuery(telegramUser.id);
      if (q) {
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach(async (document) => {
          // Map WebApp stack structure to Firestore stack structure if needed
          const mappedStack = stack.map(s => ({
            name: s.name,
            dose: s.dose,
            timing: s.time === "am" ? "morning" : "evening",
            supply: 100
          }));
          await updateDoc(doc(db, "users", document.id), {
            stack: mappedStack
          });
        });
      }
    }
  } catch (e) {
    console.error("[Pronoia Webhook] saveStack Firestore error:", e);
  }

  if (!process.env.SUPABASE_URL) return;
  try {
    const res = await fetch(`${process.env.SUPABASE_URL}/rest/v1/pronoia_stacks`, {
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
    if (!res.ok) {
      console.error(`[Pronoia Webhook] saveStack Supabase error: ${res.status} ${res.statusText}`);
    }
  } catch (error) {
    console.error("[Pronoia Webhook] saveStack network/fetch error:", error);
  }
}

// --- Companion specific status/biometrics/control DB handlers ---
async function getUserStatus(telegramId) {
  let status = {
    activeBlock: { title: "Fokus Arbeit", duration: 5400, pillar: "focus" },
    blockIdx: 0,
    isRunning: false,
    hrv: 72,
    sleep: 84,
    stack: [
      { name: 'Creatin Monohydrat', dose: '5g täglich', time: 'am' },
      { name: 'Taurin', dose: '2g täglich', time: 'am' },
      { name: 'Bromantane', dose: '50mg 5on/2off', time: 'am' },
      { name: 'Magnesium Glycinat', dose: '400mg', time: 'pm' },
      { name: 'D3 + K2', dose: '5000IU + 200mcg', time: 'am' }
    ],
    calendar: {}
  };

  if (!telegramId) return status;

  // 1. Try Firestore
  try {
    if (db) {
      const q = getTelegramUserQuery(telegramId);
      if (q) {
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const docSnap = querySnapshot.docs[0];
          const data = docSnap.data();
          const activeBlock = data.blocks?.[data.blockIdx] || null;
          // Map Firestore stack format back to webapp format
          const mappedStack = (data.stack || []).map(s => ({
            name: s.name,
            dose: s.dose,
            time: s.timing === "evening" ? "pm" : "am"
          }));
          return {
            activeBlock,
            blockIdx: data.blockIdx || 0,
            isRunning: !!data.isRunning,
            hrv: data.profile?.metrics?.hrv || 72,
            sleep: data.profile?.metrics?.sleep || 84,
            stack: mappedStack.length > 0 ? mappedStack : status.stack,
            calendar: data.calendar || {},
            email: data.profile?.email || null
          };
        }
      }
    }
  } catch (e) {
    console.error("[Pronoia Webhook] getUserStatus Firestore error:", e);
  }

  // 2. Try Supabase
  try {
    if (process.env.SUPABASE_URL) {
      const res = await fetch(`${process.env.SUPABASE_URL}/rest/v1/pronoia_users?telegram_id=eq.${telegramId}`, {
        headers: {
          apikey: process.env.SUPABASE_SERVICE_KEY,
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}`
        }
      });
      if (res.ok) {
        const users = await res.json();
        if (users && users.length > 0) {
          const user = users[0];
          
          // Try to fetch latest stack
          const stackRes = await fetch(`${process.env.SUPABASE_URL}/rest/v1/pronoia_stacks?telegram_id=eq.${telegramId}&order=synced_at.desc&limit=1`, {
            headers: {
              apikey: process.env.SUPABASE_SERVICE_KEY,
              Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}`
            }
          });
          let stack = status.stack;
          if (stackRes.ok) {
            const stacks = await stackRes.json();
            if (stacks && stacks.length > 0) {
              stack = stacks[0].stack || status.stack;
            }
          }

          return {
            activeBlock: user.current_block || status.activeBlock,
            blockIdx: user.block_idx || 0,
            isRunning: !!user.is_running,
            hrv: user.hrv || user.profile?.metrics?.hrv || 72,
            sleep: user.sleep || user.profile?.metrics?.sleep || 84,
            stack,
            calendar: user.calendar || {}
          };
        }
      }
    }
  } catch (e) {
    console.error("[Pronoia Webhook] getUserStatus Supabase error:", e);
  }

  return status;
}

async function updateBiometrics({ telegramId, hrv, sleep }) {
  if (!telegramId) return;

  // 1. Update Firestore
  try {
    if (db) {
      const q = getTelegramUserQuery(telegramId);
      if (q) {
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach(async (document) => {
          await updateDoc(doc(db, "users", document.id), {
            "profile.metrics.hrv": parseInt(hrv) || 72,
            "profile.metrics.sleep": parseInt(sleep) || 84
          });
        });
      }
    }
  } catch (e) {
    console.error("[Pronoia Webhook] updateBiometrics Firestore error:", e);
  }

  // 2. Update Supabase
  try {
    if (process.env.SUPABASE_URL) {
      await fetch(`${process.env.SUPABASE_URL}/rest/v1/pronoia_users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: process.env.SUPABASE_SERVICE_KEY,
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
          Prefer: "resolution=merge-duplicates"
        },
        body: JSON.stringify({
          telegram_id: telegramId,
          hrv: parseInt(hrv) || 72,
          sleep: parseInt(sleep) || 84,
          updated_at: new Date().toISOString()
        })
      });
    }
  } catch (e) {
    console.error("[Pronoia Webhook] updateBiometrics Supabase error:", e);
  }
}

async function handleBlockControl({ telegramId, action }) {
  let updatedState = null;

  if (!telegramId) return updatedState;

  // 1. Update Firestore
  try {
    if (db) {
      const q = getTelegramUserQuery(telegramId);
      if (q) {
        const querySnapshot = await getDocs(q);
        for (const document of querySnapshot.docs) {
          const data = document.data();
          let newIdx = data.blockIdx !== undefined ? data.blockIdx : 0;
          let newRunning = data.isRunning !== undefined ? data.isRunning : false;
          const blocks = data.blocks || [
            { title: "Fokus Arbeit", duration: 5400, pillar: "focus" },
            { title: "Skill Erwerb", duration: 2700, pillar: "skills" },
            { title: "Sunset Regeneration", duration: 1500, pillar: "recovery" }
          ];

          if (action === "next") {
            if (newIdx < blocks.length - 1) newIdx++;
          } else if (action === "prev") {
            if (newIdx > 0) newIdx--;
          } else if (action === "toggle") {
            newRunning = !newRunning;
          }

          await updateDoc(doc(db, "users", document.id), {
            blockIdx: newIdx,
            isRunning: newRunning
          });
          
          updatedState = {
            activeBlock: blocks[newIdx] || null,
            blockIdx: newIdx,
            isRunning: newRunning
          };
        }
      }
    }
  } catch (e) {
    console.error("[Pronoia Webhook] handleBlockControl Firestore error:", e);
  }

  // 2. Update Supabase
  try {
    if (process.env.SUPABASE_URL) {
      const res = await fetch(`${process.env.SUPABASE_URL}/rest/v1/pronoia_users?telegram_id=eq.${telegramId}`, {
        headers: {
          apikey: process.env.SUPABASE_SERVICE_KEY,
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}`
        }
      });
      if (res.ok) {
        const users = await res.json();
        if (users && users.length > 0) {
          const user = users[0];
          let blockIdx = user.block_idx || 0;
          let isRunning = !!user.is_running;
          const blocks = user.blocks || [
            { title: "Morning Hydration & Stack", duration: 900, pillar: "health" },
            { title: "Deep Work Block I", duration: 5400, pillar: "focus" },
            { title: "Deliberate Skill Practice", duration: 2700, pillar: "skills" },
            { title: "Zirkadianer Lunch Walk", duration: 1800, pillar: "health" },
            { title: "Deep Work Block II", duration: 3600, pillar: "focus" },
            { title: "Sunset NSDR Recovery", duration: 1500, pillar: "recovery" }
          ];

          if (action === "next") {
            if (blockIdx < blocks.length - 1) blockIdx++;
          } else if (action === "prev") {
            if (blockIdx > 0) blockIdx--;
          } else if (action === "toggle") {
            isRunning = !isRunning;
          }

          const updateBody = {
            telegram_id: telegramId,
            block_idx: blockIdx,
            is_running: isRunning,
            current_block: blocks[blockIdx] || null,
            updated_at: new Date().toISOString()
          };

          await fetch(`${process.env.SUPABASE_URL}/rest/v1/pronoia_users`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: process.env.SUPABASE_SERVICE_KEY,
              Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
              Prefer: "resolution=merge-duplicates"
            },
            body: JSON.stringify(updateBody)
          });

          if (!updatedState) {
            updatedState = {
              activeBlock: blocks[blockIdx] || null,
              blockIdx,
              isRunning
            };
          }
        }
      }
    }
  } catch (e) {
    console.error("[Pronoia Webhook] handleBlockControl Supabase error:", e);
  }

  // Fallback
  if (!updatedState) {
    updatedState = {
      activeBlock: { title: "Fokus Arbeit", duration: 5400, pillar: "focus" },
      blockIdx: 0,
      isRunning: action === "toggle"
    };
  }

  return updatedState;
}

async function handleCalendarAdd({ telegramId, block }) {
  if (!telegramId || !block) return;
  const { date, title, startTime, duration, pillar } = block;
  const newBlock = {
    title: title || 'Neuer Block',
    startTime: startTime || '12:00',
    duration: parseInt(duration) || 3600,
    pillar: pillar || 'focus',
    rec: 'Über Telegram Bot hinzugefügt.',
    insight: 'Aktive Lebensplanung reduziert kognitive Reibungspunkte.'
  };

  // 1. Update Firestore
  try {
    if (db) {
      const q = getTelegramUserQuery(telegramId);
      if (q) {
        const querySnapshot = await getDocs(q);
        for (const document of querySnapshot.docs) {
          const data = document.data();
          const calendar = data.calendar || {};
          const dayData = calendar[date] || { blocks: [] };
          const updatedBlocks = [...(dayData.blocks || []), newBlock].sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
          
          calendar[date] = { ...dayData, blocks: updatedBlocks };
          await updateDoc(doc(db, "users", document.id), { calendar });
        }
      }
    }
  } catch (e) {
    console.error("[Pronoia Webhook] handleCalendarAdd Firestore error:", e);
  }

  // 2. Update Supabase
  try {
    if (process.env.SUPABASE_URL) {
      const res = await fetch(`${process.env.SUPABASE_URL}/rest/v1/pronoia_users?telegram_id=eq.${telegramId}`, {
        headers: {
          apikey: process.env.SUPABASE_SERVICE_KEY,
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}`
        }
      });
      if (res.ok) {
        const users = await res.json();
        if (users && users.length > 0) {
          const user = users[0];
          const calendar = user.calendar || {};
          const dayData = calendar[date] || { blocks: [] };
          const updatedBlocks = [...(dayData.blocks || []), newBlock].sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
          calendar[date] = { ...dayData, blocks: updatedBlocks };

          await fetch(`${process.env.SUPABASE_URL}/rest/v1/pronoia_users`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: process.env.SUPABASE_SERVICE_KEY,
              Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
              Prefer: "resolution=merge-duplicates"
            },
            body: JSON.stringify({
              telegram_id: telegramId,
              calendar: calendar,
              updated_at: new Date().toISOString()
            })
          });
        }
      }
    }
  } catch (e) {
    console.error("[Pronoia Webhook] handleCalendarAdd Supabase error:", e);
  }
}

function getTelegramUserQuery(telegramId) {
  if (telegramId === undefined || telegramId === null) return null;
  const idArray = [String(telegramId)];
  const parsed = parseInt(telegramId);
  if (!isNaN(parsed) && !idArray.includes(parsed)) {
    idArray.push(parsed);
  }
  return query(collection(db, "users"), where("profile.telegramId", "in", idArray));
}
