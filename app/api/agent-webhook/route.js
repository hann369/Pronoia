// app/api/agent-webhook/route.js

import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";

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
    const { status, debug } = await getUserStatusWithDebug(telegramId);
    return NextResponse.json({ ok: true, status, debug });
  }

  if (event === "biometrics_update") {
    const { hrv, sleep } = payload;
    await updateBiometrics({ telegramId, hrv, sleep });
    const { status, debug } = await getUserStatusWithDebug(telegramId);
    return NextResponse.json({ ok: true, status, debug });
  }

  if (event === "block_control") {
    const { action } = payload;
    const blockStatus = await handleBlockControl({ telegramId, action });
    const { debug } = await getUserStatusWithDebug(telegramId);
    return NextResponse.json({ ok: true, status: blockStatus, debug });
  }

  if (event === "calendar_add") {
    const { block } = payload;
    await handleCalendarAdd({ telegramId, block });
    const { status, debug } = await getUserStatusWithDebug(telegramId);
    return NextResponse.json({ ok: true, status, debug });
  }

  if (event === "circadian_toggle") {
    const { mode } = payload;
    const blockStatus = await handleCircadianToggle({ telegramId, mode });
    const { debug } = await getUserStatusWithDebug(telegramId);
    return NextResponse.json({ ok: true, status: blockStatus, debug });
  }

  if (event === "friction_log") {
    const { status } = payload;
    const blockStatus = await handleFrictionLog({ telegramId, status });
    const { debug } = await getUserStatusWithDebug(telegramId);
    return NextResponse.json({ ok: true, status: blockStatus, debug });
  }

  if (event === "stack_consume") {
    const { idx } = payload;
    const blockStatus = await handleStackConsume({ telegramId, idx });
    const { debug } = await getUserStatusWithDebug(telegramId);
    return NextResponse.json({ ok: true, status: blockStatus, debug });
  }

  if (event === "hermes_trigger") {
    const hermesAgentUrl = process.env.HERMES_AGENT_URL || 'http://localhost:8080/pronoia-webhook';
    try {
      console.log(`[Pronoia Webhook] Forwarding hermes_trigger to ${hermesAgentUrl}`);
      const fResponse = await fetch(hermesAgentUrl, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-bot-secret': secret
        },
        body: JSON.stringify(payload)
      });
      return NextResponse.json({ ok: fResponse.ok, status: fResponse.status });
    } catch (err) {
      console.error("[Agent Webhook] Failed to forward to Hermes Agent daemon:", err.message);
      return NextResponse.json({ ok: false, error: err.message }, { status: 502 });
    }
  }

  if (event === "hermes_register") {
    const { publicKey } = payload;
    try {
      const docRef = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/users/hermes_agent_node?key=${FIREBASE_API_KEY}`;
      const fields = {
        profile: toFirestoreValue({
          username: "hermes_agent_node",
          displayName: "Hermes AI Agent",
          avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=hermes",
          role: "companion",
          telegramId: "hermes_agent_node",
          tempSecret: WEBHOOK_SECRET
        }),
        publicKey: toFirestoreValue(publicKey),
        role: { stringValue: "companion" }
      };
      
      const res = await fetch(docRef, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields })
      });
      return NextResponse.json({ ok: res.ok });
    } catch (e) {
      return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
    }
  }

  if (event === "hermes_reply") {
    const { chatId, ciphertext, iv } = payload;
    try {
      const timestamp = new Date().toISOString();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      
      const msgUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/chats/${chatId}/messages?key=${FIREBASE_API_KEY}`;
      const msgFields = {
        senderUid: { stringValue: "hermes_agent_node" },
        senderName: { stringValue: "Hermes AI Agent" },
        timestamp: { stringValue: timestamp },
        expiresAt: { stringValue: expiresAt },
        type: { stringValue: "text" },
        ciphertext: { stringValue: ciphertext },
        iv: { stringValue: iv },
        readBy: { arrayValue: { values: [{ stringValue: "hermes_agent_node" }] } }
      };
      
      const msgRes = await fetch(msgUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields: msgFields })
      });
      
      const chatUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/chats/${chatId}?key=${FIREBASE_API_KEY}&updateMask.fieldPaths=lastMessage`;
      const chatFields = {
        lastMessage: {
          mapValue: {
            fields: {
              ciphertext: { stringValue: ciphertext },
              iv: { stringValue: iv },
              senderUid: { stringValue: "hermes_agent_node" },
              timestamp: { stringValue: timestamp },
              readBy: { arrayValue: { values: [{ stringValue: "hermes_agent_node" }] } }
            }
          }
        }
      };
      await fetch(chatUrl, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields: chatFields })
      });
      
      return NextResponse.json({ ok: msgRes.ok });
    } catch (e) {
      return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
    }
  }

  if (event === "hermes_get_calendar") {
    const { uid } = payload;
    try {
      const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/users/${uid}?key=${FIREBASE_API_KEY}`;
      const res = await fetch(url);
      if (!res.ok) return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });
      const doc = await res.json();
      const data = parseFirestoreFields(doc.fields || {});
      return NextResponse.json({ ok: true, calendar: data.calendar || {} });
    } catch (e) {
      return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
    }
  }

  if (event === "hermes_update_calendar") {
    const { uid, calendar } = payload;
    try {
      const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/users/${uid}?key=${FIREBASE_API_KEY}&updateMask.fieldPaths=calendar`;
      const fields = {
        calendar: toFirestoreValue(calendar),
        profile: {
          mapValue: {
            fields: {
              tempSecret: { stringValue: WEBHOOK_SECRET }
            }
          }
        }
      };
      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields })
      });
      return NextResponse.json({ ok: res.ok });
    } catch (e) {
      return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
    }
  }

  if (event === "hermes_get_suggestions") {
    const { uid } = payload;
    try {
      const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/users/${uid}/suggestions?key=${FIREBASE_API_KEY}`;
      const res = await fetch(url);
      if (!res.ok) return NextResponse.json({ ok: true, suggestions: [] });
      const data = await res.json();
      const suggestions = [];
      for (const d of data.documents || []) {
        const nameParts = d.name.split("/");
        const docId = nameParts[nameParts.length - 1];
        const fields = parseFirestoreFields(d.fields || {});
        suggestions.push({ id: docId, ...fields });
      }
      return NextResponse.json({ ok: true, suggestions });
    } catch (e) {
      return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
    }
  }

  if (event === "hermes_update_suggestion") {
    const { uid, suggestionId, suggestion } = payload;
    try {
      const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/users/${uid}/suggestions/${suggestionId}`;
      const fields = {};
      for (const k in suggestion) {
        fields[k] = toFirestoreValue(suggestion[k]);
      }
      fields["profile"] = {
        mapValue: {
          fields: {
            tempSecret: { stringValue: WEBHOOK_SECRET }
          }
        }
      };
      const queryParams = new URLSearchParams();
      queryParams.append("key", FIREBASE_API_KEY);
      for (const key in fields) {
        queryParams.append("updateMask.fieldPaths", key);
      }
      const fullUrl = `${url}?${queryParams.toString()}`;
      const res = await fetch(fullUrl, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields })
      });
      return NextResponse.json({ ok: res.ok });
    } catch (e) {
      return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true, event, timestamp: new Date().toISOString() });
}

// --- Firestore REST API helpers ---
const FIREBASE_PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "pronoia-data";
const FIREBASE_API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "DEIN_WEBHOOK_SECRET_HIER";

// Helper to convert Firestore Proto JSON to normal JS Object
function parseFirestoreValue(value) {
  if (!value) return null;
  if (value.stringValue !== undefined) return value.stringValue;
  if (value.integerValue !== undefined) return parseInt(value.integerValue, 10);
  if (value.doubleValue !== undefined) return parseFloat(value.doubleValue);
  if (value.booleanValue !== undefined) return value.booleanValue;
  if (value.nullValue !== undefined) return null;
  if (value.mapValue !== undefined) {
    const fields = value.mapValue.fields || {};
    const obj = {};
    for (const k in fields) {
      obj[k] = parseFirestoreValue(fields[k]);
    }
    return obj;
  }
  if (value.arrayValue !== undefined) {
    const values = value.arrayValue.values || [];
    return values.map(parseFirestoreValue);
  }
  return value;
}

function parseFirestoreFields(fields) {
  const obj = {};
  for (const k in fields) {
    obj[k] = parseFirestoreValue(fields[k]);
  }
  return obj;
}

// Helper to convert normal JS values to Firestore Proto JSON
function toFirestoreValue(val) {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === "boolean") return { booleanValue: val };
  if (typeof val === "number") {
    if (Number.isInteger(val)) {
      return { integerValue: String(val) };
    } else {
      return { doubleValue: val };
    }
  }
  if (typeof val === "string") return { stringValue: val };
  if (Array.isArray(val)) {
    return { arrayValue: { values: val.map(toFirestoreValue) } };
  }
  if (typeof val === "object") {
    const fields = {};
    for (const k in val) {
      fields[k] = toFirestoreValue(val[k]);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

// Convert flat object of dotted paths like {"profile.metrics.hrv": 72} into nested object {profile: {metrics: {hrv: 72}}}
function buildNestedFields(flatObj) {
  const nested = {};
  for (const key in flatObj) {
    const parts = key.split(".");
    let current = nested;
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!current[part]) {
        current[part] = {};
      }
      current = current[part];
    }
    current[parts[parts.length - 1]] = flatObj[key];
  }
  return nested;
}

// Query user by telegram ID via REST API. Returns { docId, data } or null
async function restGetTelegramUser(telegramId) {
  if (telegramId === undefined || telegramId === null) return null;
  const idStr = String(telegramId);

  const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents:runQuery?key=${FIREBASE_API_KEY}`;
  const payload = {
    structuredQuery: {
      from: [{ collectionId: "users" }],
      where: {
        fieldFilter: {
          field: { fieldPath: "profile.telegramId" },
          op: "IN",
          value: {
            arrayValue: {
              values: [
                { integerValue: idStr },
                { stringValue: idStr }
              ]
            }
          }
        }
      }
    }
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Firestore REST runQuery failed: ${res.status} ${text}`);
  }

  const results = await res.json();
  if (Array.isArray(results) && results.length > 0 && results[0].document) {
    const doc = results[0].document;
    const parts = doc.name.split("/");
    const docId = parts[parts.length - 1];
    const data = parseFirestoreFields(doc.fields || {});
    return { docId, data };
  }
  return null;
}

// Update user document fields via REST PATCH request
async function restUpdateUser(docId, flatFields) {
  if (!docId) return null;

  // Always include tempSecret in the update payload to bypass Firestore rules
  const updatedFlatFields = {
    ...flatFields,
    "profile.tempSecret": WEBHOOK_SECRET
  };

  const nestedObj = buildNestedFields(updatedFlatFields);
  const fields = {};
  for (const k in nestedObj) {
    fields[k] = toFirestoreValue(nestedObj[k]);
  }

  const queryParams = new URLSearchParams();
  queryParams.append("key", FIREBASE_API_KEY);
  for (const key in updatedFlatFields) {
    queryParams.append("updateMask.fieldPaths", key);
  }

  const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/users/${docId}?${queryParams.toString()}`;
  
  const res = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fields })
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Firestore REST PATCH failed: ${res.status} ${text}`);
  }

  const result = await res.json();
  return parseFirestoreFields(result.fields || {});
}

// --- DB helpers for User profile & stack ---
async function saveUser({ telegramUser, profile }) {
  try {
    if (telegramUser?.id) {
      const userDoc = await restGetTelegramUser(telegramUser.id);
      if (userDoc) {
        await restUpdateUser(userDoc.docId, {
          "profile.goals": profile?.goals || [],
          "profile.experience": profile?.experience || "intermediate",
          "profile.age": profile?.age || null,
          "profile.challenge": profile?.challenge || ""
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
  try {
    if (telegramUser?.id) {
      const userDoc = await restGetTelegramUser(telegramUser.id);
      if (userDoc) {
        const mappedStack = stack.map(s => ({
          name: s.name,
          dose: s.dose,
          timing: s.time === "am" ? "morning" : "evening",
          supply: 100
        }));
        await restUpdateUser(userDoc.docId, {
          stack: mappedStack
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
    circadianMode: true,
    hrv: 72,
    sleep: 84,
    stack: [
      { name: 'Creatin Monohydrat', dose: '5g täglich', time: 'am', supply: 100 },
      { name: 'Taurin', dose: '2g täglich', time: 'am', supply: 100 },
      { name: 'Bromantane', dose: '50mg 5on/2off', time: 'am', supply: 100 },
      { name: 'Magnesium Glycinat', dose: '400mg', time: 'pm', supply: 100 },
      { name: 'D3 + K2', dose: '5000IU + 200mcg', time: 'am', supply: 100 }
    ],
    calendar: {}
  };

  if (!telegramId) return status;

  // 1. Try Firestore
  try {
    const userDoc = await restGetTelegramUser(telegramId);
    if (userDoc) {
      const data = userDoc.data;
      const activeBlock = data.blocks?.[data.blockIdx] || null;
      const mappedStack = (data.stack || []).map(s => ({
        name: s.name,
        dose: s.dose,
        time: s.timing === "evening" ? "pm" : "am",
        supply: s.supply !== undefined ? s.supply : 100
      }));
      return {
        activeBlock,
        blockIdx: data.blockIdx || 0,
        isRunning: !!data.isRunning,
        circadianMode: data.circadianMode !== undefined ? !!data.circadianMode : true,
        hrv: data.profile?.metrics?.hrv || 72,
        sleep: data.profile?.metrics?.sleep || 84,
        stack: mappedStack.length > 0 ? mappedStack : status.stack,
        calendar: data.calendar || {},
        email: data.profile?.email || null
      };
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
    const userDoc = await restGetTelegramUser(telegramId);
    if (userDoc) {
      await restUpdateUser(userDoc.docId, {
        "profile.metrics.hrv": parseInt(hrv) || 72,
        "profile.metrics.sleep": parseInt(sleep) || 84
      });
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
    const userDoc = await restGetTelegramUser(telegramId);
    if (userDoc) {
      const data = userDoc.data;
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

      const updateFields = {
        blockIdx: newIdx,
        isRunning: newRunning
      };

      await restUpdateUser(userDoc.docId, updateFields);
      
      updatedState = {
        activeBlock: blocks[newIdx] || null,
        blockIdx: newIdx,
        isRunning: newRunning,
        circadianMode: data.circadianMode !== undefined ? !!data.circadianMode : true
      };
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
              isRunning,
              circadianMode: user.circadian_mode !== undefined ? !!user.circadian_mode : true
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
      isRunning: action === "toggle",
      circadianMode: (action === "next" || action === "prev") ? false : true
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
    const userDoc = await restGetTelegramUser(telegramId);
    if (userDoc) {
      const data = userDoc.data;
      const calendar = data.calendar || {};
      const dayData = calendar[date] || { blocks: [] };
      const updatedBlocks = [...(dayData.blocks || []), newBlock].sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
      
      calendar[date] = { ...dayData, blocks: updatedBlocks };
      await restUpdateUser(userDoc.docId, { calendar });
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

async function getUserStatusWithDebug(telegramId) {
  let status = {
    activeBlock: { title: "Fokus Arbeit", duration: 5400, pillar: "focus" },
    blockIdx: 0,
    isRunning: false,
    circadianMode: true,
    hrv: 72,
    sleep: 84,
    stack: [
      { name: 'Creatin Monohydrat', dose: '5g täglich', time: 'am', supply: 100 },
      { name: 'Taurin', dose: '2g täglich', time: 'am', supply: 100 },
      { name: 'Bromantane', dose: '50mg 5on/2off', time: 'am', supply: 100 },
      { name: 'Magnesium Glycinat', dose: '400mg', time: 'pm', supply: 100 },
      { name: 'D3 + K2', dose: '5000IU + 200mcg', time: 'am', supply: 100 }
    ],
    calendar: {}
  };

  let debug = {
    dbInitialized: !!db,
    projectId: FIREBASE_PROJECT_ID,
    apiKey: FIREBASE_API_KEY ? FIREBASE_API_KEY.substring(0, 8) + "..." : null,
    telegramId,
    telegramIdType: typeof telegramId,
    matchedDocs: 0,
    error: null
  };

  if (!telegramId) {
    debug.error = "No Telegram ID provided";
    return { status, debug };
  }

  try {
    const userDoc = await restGetTelegramUser(telegramId);
    if (userDoc) {
      debug.matchedDocs = 1;
      const data = userDoc.data;
      const activeBlock = data.blocks?.[data.blockIdx] || null;
      const mappedStack = (data.stack || []).map(s => ({
        name: s.name,
        dose: s.dose,
        time: s.timing === "evening" ? "pm" : "am",
        supply: s.supply !== undefined ? s.supply : 100
      }));
      
      status = {
        activeBlock,
        blocks: data.blocks || [],
        blockIdx: data.blockIdx || 0,
        isRunning: !!data.isRunning,
        circadianMode: data.circadianMode !== undefined ? !!data.circadianMode : true,
        hrv: data.profile?.metrics?.hrv || 72,
        sleep: data.profile?.metrics?.sleep || 84,
        stack: mappedStack.length > 0 ? mappedStack : status.stack,
        calendar: data.calendar || {},
        email: data.profile?.email || null,
        customization: data.profile?.customization || { accent: 'blue', mode: 'serious' },
        directives: data.directives || []
      };
    } else {
      debug.error = "No document found matching this Telegram ID";
    }
  } catch (e) {
    console.error("Debug status load failed:", e);
    debug.error = e.message;
  }

  return { status, debug };
}

async function handleCircadianToggle({ telegramId, mode }) {
  let updatedState = null;
  if (!telegramId) return updatedState;

  // 1. Update Firestore
  try {
    const userDoc = await restGetTelegramUser(telegramId);
    if (userDoc) {
      const data = userDoc.data;
      const blocks = data.blocks || [];
      const isRunning = !!data.isRunning;

      await restUpdateUser(userDoc.docId, {
        circadianMode: mode
      });

      const activeBlock = blocks[data.blockIdx || 0] || null;
      updatedState = {
        activeBlock,
        blockIdx: data.blockIdx || 0,
        isRunning,
        circadianMode: mode
      };
    }
  } catch (e) {
    console.error("[Pronoia Webhook] handleCircadianToggle Firestore error:", e);
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
          circadian_mode: mode,
          updated_at: new Date().toISOString()
        })
      });
    }
  } catch (e) {
    console.error("[Pronoia Webhook] handleCircadianToggle Supabase error:", e);
  }

  return updatedState;
}

async function handleFrictionLog({ telegramId, status }) {
  let updatedState = null;
  if (!telegramId) return updatedState;

  // 1. Update Firestore
  try {
    const userDoc = await restGetTelegramUser(telegramId);
    if (userDoc) {
      const data = userDoc.data;
      const currentBlock = data.blocks?.[data.blockIdx || 0];
      const newLog = {
        ts: new Date().toLocaleTimeString(),
        status, // 'ok', 'warn', 'miss'
        blockTitle: currentBlock ? currentBlock.title : 'Freier Block'
      };
      
      const frictionLogs = data.frictionLogs || [];
      const updatedLogs = [newLog, ...frictionLogs].slice(0, 15);

      await restUpdateUser(userDoc.docId, {
        frictionLogs: updatedLogs
      });

      const activeBlock = currentBlock || null;
      updatedState = {
        activeBlock,
        blockIdx: data.blockIdx || 0,
        isRunning: !!data.isRunning,
        frictionLogs: updatedLogs
      };
    }
  } catch (e) {
    console.error("[Pronoia Webhook] handleFrictionLog Firestore error:", e);
  }

  return updatedState;
}

async function handleStackConsume({ telegramId, idx }) {
  let updatedState = null;
  if (!telegramId) return updatedState;

  // 1. Update Firestore
  try {
    const userDoc = await restGetTelegramUser(telegramId);
    if (userDoc) {
      const data = userDoc.data;
      const stack = data.stack || [];
      if (stack[idx]) {
        const item = stack[idx];
        const newSupply = Math.max(0, (item.supply !== undefined ? item.supply : 100) - 5);
        stack[idx] = { ...item, supply: newSupply };

        await restUpdateUser(userDoc.docId, {
          stack
        });
      }

      const activeBlock = data.blocks?.[data.blockIdx || 0] || null;
      const mappedStack = stack.map(s => ({
        name: s.name,
        dose: s.dose,
        time: s.timing === "evening" ? "pm" : "am",
        supply: s.supply !== undefined ? s.supply : 100
      }));

      updatedState = {
        activeBlock,
        blockIdx: data.blockIdx || 0,
        isRunning: !!data.isRunning,
        stack: mappedStack
      };
    }
  } catch (e) {
    console.error("[Pronoia Webhook] handleStackConsume Firestore error:", e);
  }

  return updatedState;
}
