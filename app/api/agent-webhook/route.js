// app/api/agent-webhook/route.js
//
// Central webhook hub for the Telegram bot, the Hermes agent daemon, and
// browser-initiated agent actions.
//
// Auth: a request is accepted when EITHER
//   - it carries the shared WEBHOOK_SECRET in `x-bot-secret` (trusted servers:
//     Telegram bot, Hermes daemon), OR
//   - it carries a valid Firebase ID token in `Authorization: Bearer <token>`
//     (the browser, acting as the signed-in user).
// There is NO hardcoded secret fallback.
//
// All Firestore access uses the Admin SDK (lib/firebaseAdmin), which bypasses
// security rules — so the old `tempSecret` write-backdoor is gone.

import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { checkWebhookSecret, verifyIdToken, verifyTelegramInitData } from "@/lib/serverAuth";
import { importPrivateKey, importPublicKey, eciesEncryptText, eciesDecryptText } from "@/lib/cryptoServer";

export async function POST(req) {
  const payload = await req.json();

  // --- Authentication ---
  // Accept any one of: trusted shared secret (Telegram bot / Hermes daemon),
  // a Firebase ID token (browser), or signed Telegram Mini App initData.
  const secret = req.headers.get("x-bot-secret");
  const authedViaSecret = checkWebhookSecret(secret);

  let authedUser = null;
  let telegramAuth = null;
  if (!authedViaSecret) {
    authedUser = await verifyIdToken(req.headers.get("authorization"));
    if (!authedUser) {
      telegramAuth = verifyTelegramInitData(req.headers.get("x-telegram-init-data"));
    }
  }

  if (!authedViaSecret && !authedUser && !telegramAuth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // When authenticated via Telegram initData, trust the verified user identity
  // from the signature — never the client-supplied telegramUser in the body.
  if (telegramAuth?.user) {
    payload.telegramUser = telegramAuth.user;
  }

  if (!adminDb) {
    return NextResponse.json(
      { error: "Server Firestore (Admin SDK) is not configured" },
      { status: 503 }
    );
  }

  const { event, source, telegramUser, profile, stack, chatSummary } = payload;
  const telegramId = telegramUser?.id;

  console.log(`[Pronoia Webhook] ${source} → ${event}`, {
    user: telegramUser?.username || telegramId,
    via: authedViaSecret ? "secret" : authedUser ? `idToken:${authedUser.uid}` : "telegram-initData",
  });

  try {
    // --- Lead / onboarding events ---
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

    // --- WebApp + Bot companion events ---
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

    // --- Hermes agent bridge ---
    if (event === "hermes_trigger") {
      // Enrich with the participants' public keys so the bridge can encrypt
      // its reply per recipient (same model as the web client).
      const uids = payload.participants || [];
      const participantKeys = {};
      try {
        for (const uid of uids) {
          const snap = await adminDb.collection("users").doc(uid).get();
          const jwk = snap.exists ? snap.data().publicKey?.jwk : null;
          if (jwk && jwk.x && jwk.y) participantKeys[uid] = jwk;
        }
        payload.participantKeys = participantKeys;
      } catch (keyErr) {
        console.warn("[Pronoia Webhook] participantKeys enrichment failed:", keyErr.message);
      }

      // Check if serverless execution is enabled via HERMES_PRIVATE_KEY
      const hermesPrvKeyJwkStr = process.env.HERMES_PRIVATE_KEY;
      if (hermesPrvKeyJwkStr) {
        console.log("[Pronoia Webhook] Running Hermes Agent locally (serverless)...");
        try {
          const chatId = payload.chatId;
          const message = payload.message || {};
          const senderUid = message.senderUid;

          // 1. Decrypt incoming message
          let plaintext = null;
          try {
            const encMap = message.enc || {};
            const myCipher = encMap["hermes_agent_node"];
            if (myCipher) {
              const prvKeyJwk = JSON.parse(hermesPrvKeyJwkStr);
              const prvKey = await importPrivateKey(prvKeyJwk);
              plaintext = await eciesDecryptText(myCipher, prvKey);
            } else if (message.text) {
              plaintext = message.text;
            }
          } catch (decErr) {
            console.error("[Pronoia Webhook] Serverless E2E decryption failed:", decErr.message);
          }

          if (plaintext === null) {
            console.warn("[Pronoia Webhook] No readable E2E message for serverless agent.");
            return NextResponse.json({ ok: false, error: "no_readable_message" }, { status: 202 });
          }

          console.log(`[Pronoia Webhook] Decrypted message: "${plaintext}"`);

          // 2. Fetch context (calendar & suggestions) directly from Firestore
          const context = { calendar: {}, suggestions: [] };
          if (senderUid) {
            try {
              const userSnap = await adminDb.collection("users").doc(senderUid).get();
              if (userSnap.exists) {
                context.calendar = userSnap.data().calendar || {};
              }
              const sugSnap = await adminDb.collection("users").doc(senderUid).collection("suggestions").get();
              context.suggestions = sugSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            } catch (ctxErr) {
              console.warn("[Pronoia Webhook] Failed to retrieve context for user:", ctxErr.message);
            }
          }

          // 3. Invoke Mistral API
          const SYSTEM_PROMPT = (
            "Du bist Hermes, der KI-Begleiter im Pronoia Life OS. Antworte direkt, " +
            "präzise, wissenschaftlich fundiert und auf Deutsch. Du hilfst bei Fokus, " +
            "Schlaf, Supplementation und Tagesstruktur. Halte dich kurz."
          );

          let ctxNote = "";
          if (context.calendar && Object.keys(context.calendar).length > 0) {
            ctxNote += `\n[Kalender-Kontext vorhanden: ${Object.keys(context.calendar).length} Tage]`;
          }
          if (context.suggestions && context.suggestions.length > 0) {
            ctxNote += `\n[${context.suggestions.length} offene Vorschläge]`;
          }

          let replyText = "";
          const mistralApiKey = process.env.MISTRAL_API_KEY;
          if (mistralApiKey && mistralApiKey !== 'REPLACE_ME') {
            try {
              const messages = [
                { role: "system", content: SYSTEM_PROMPT + ctxNote },
                { role: "user", content: plaintext }
              ];
              let mistralRes = null;
              let attempts = 3;
              for (let i = 0; i < attempts; i++) {
                try {
                  mistralRes = await fetch("https://api.mistral.ai/v1/chat/completions", {
                    method: "POST",
                    headers: {
                      "Authorization": `Bearer ${mistralApiKey}`,
                      "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                      model: "mistral-large-latest",
                      messages,
                      temperature: 0.7,
                      max_tokens: 500
                    })
                  });
                  if (mistralRes.ok) break;
                  
                  if (mistralRes.status === 429 || mistralRes.status >= 500) {
                    const delay = (i + 1) * 1000;
                    console.warn(`[Pronoia Webhook] Mistral API returned status ${mistralRes.status}. Retrying in ${delay}ms... (Attempt ${i + 1}/${attempts})`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                  } else {
                    break;
                  }
                } catch (fetchErr) {
                  if (i === attempts - 1) throw fetchErr;
                  const delay = (i + 1) * 1000;
                  console.warn(`[Pronoia Webhook] Mistral fetch failed: ${fetchErr.message}. Retrying in ${delay}ms... (Attempt ${i + 1}/${attempts})`);
                  await new Promise(resolve => setTimeout(resolve, delay));
                }
              }
              
              if (mistralRes && mistralRes.ok) {
                const mistralData = await mistralRes.json();
                replyText = mistralData.choices?.[0]?.message?.content?.trim() || "";
              } else {
                const status = mistralRes ? mistralRes.status : "unknown";
                let errBody = "";
                if (mistralRes) {
                  try { errBody = await mistralRes.text(); } catch (_) {}
                }
                console.error(`[Pronoia Webhook] Mistral API failed after ${attempts} attempts. Final Status: ${status}, Body: ${errBody}`);
                replyText = "Hermes: Kurze Störung im Reasoning-Kern. Bitte erneut versuchen.";
              }
            } catch (mistralErr) {
              console.error("[Pronoia Webhook] Mistral API call failed with exception:", mistralErr.message);
              replyText = "Hermes: Verbindung zum Reasoning-Netzwerk gestört.";
            }
          } else {
            replyText = `Hermes (offline): Verstanden — „${plaintext.substring(0, 140)}“. Konfiguriere MISTRAL_API_KEY für volle Antworten.`;
          }

          // 4. Encrypt reply for all participants
          const encReplies = {};
          for (const [uid, jwk] of Object.entries(participantKeys)) {
            try {
              const pubKey = await importPublicKey(jwk);
              encReplies[uid] = await eciesEncryptText(replyText, pubKey);
            } catch (encErr) {
              console.error(`[Pronoia Webhook] Failed to encrypt reply for user ${uid}:`, encErr.message);
            }
          }

          // 5. Write reply back to Firestore
          const timestamp = new Date().toISOString();
          const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
          const readBy = ["hermes_agent_node"];

          const msgBody = Object.keys(encReplies).length > 0 ? { enc: encReplies } : { text: replyText };
          const lastBody = Object.keys(encReplies).length > 0
            ? { enc: true }
            : { text: replyText.substring(0, 60) };

          await adminDb.collection("chats").doc(chatId).collection("messages").add({
            senderUid: "hermes_agent_node",
            senderName: "Hermes AI Agent",
            timestamp,
            expiresAt,
            type: "text",
            ...msgBody,
            readBy,
          });

          await adminDb.collection("chats").doc(chatId).set(
            {
              lastMessage: { ...lastBody, senderUid: "hermes_agent_node", timestamp, readBy },
            },
            { merge: true }
          );

          return NextResponse.json({ ok: true, serverless: true, encrypted: Object.keys(encReplies).length > 0 });
        } catch (serverlessErr) {
          console.error("[Pronoia Webhook] Critical serverless Hermes run failure:", serverlessErr);
          return NextResponse.json({ ok: false, error: serverlessErr.message }, { status: 500 });
        }
      }

      // FALLBACK: forward to local Hermes bridge daemon
      const hermesAgentUrl = process.env.HERMES_AGENT_URL || "http://localhost:8080/pronoia-webhook";
      const forwardSecret = process.env.WEBHOOK_SECRET;
      if (!forwardSecret) {
        return NextResponse.json(
          { ok: false, error: "WEBHOOK_SECRET not configured; cannot reach Hermes daemon" },
          { status: 503 }
        );
      }
      try {
        console.log(`[Pronoia Webhook] Forwarding hermes_trigger to ${hermesAgentUrl}`);
        const fResponse = await fetch(hermesAgentUrl, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json", 
            "x-bot-secret": forwardSecret,
            "ngrok-skip-browser-warning": "true"
          },
          body: JSON.stringify(payload),
        });
        return NextResponse.json({ ok: fResponse.ok, status: fResponse.status });
      } catch (err) {
        console.error("[Agent Webhook] Failed to forward to Hermes Agent daemon:", err.message);
        return NextResponse.json({ ok: false, error: err.message }, { status: 502 });
      }
    }

    if (event === "hermes_accept_friendship") {
      // Hermes is an AI companion without an auth session, so it cannot click
      // "accept" itself — the server accepts on its behalf. Only friendships
      // that actually involve hermes_agent_node are eligible, and a browser
      // caller (ID token) must be the other participant.
      const { friendshipId } = payload;
      if (!friendshipId) {
        return NextResponse.json({ ok: false, error: "friendshipId missing" }, { status: 400 });
      }
      const ref = adminDb.collection("friendships").doc(friendshipId);
      const snap = await ref.get();
      if (!snap.exists) {
        return NextResponse.json({ ok: false, error: "Friendship not found" }, { status: 404 });
      }
      const users = snap.data().users || [];
      if (!users.includes("hermes_agent_node")) {
        return NextResponse.json({ ok: false, error: "Not a hermes friendship" }, { status: 403 });
      }
      if (authedUser && !users.includes(authedUser.uid)) {
        return NextResponse.json({ ok: false, error: "Not a participant" }, { status: 403 });
      }
      await ref.set(
        { status: "accepted", updatedAt: new Date().toISOString() },
        { merge: true }
      );
      return NextResponse.json({ ok: true, status: "accepted" });
    }

    if (event === "hermes_accept_friendship") {
      // Hermes is an AI companion without an auth session, so it cannot click
      // "accept" itself — the server accepts on its behalf. Only friendships
      // that actually involve hermes_agent_node are eligible, and a browser
      // caller (ID token) must be the other participant.
      const { friendshipId } = payload;
      if (!friendshipId) {
        return NextResponse.json({ ok: false, error: "friendshipId missing" }, { status: 400 });
      }
      const ref = adminDb.collection("friendships").doc(friendshipId);
      const snap = await ref.get();
      if (!snap.exists) {
        return NextResponse.json({ ok: false, error: "Friendship not found" }, { status: 404 });
      }
      const users = snap.data().users || [];
      if (!users.includes("hermes_agent_node")) {
        return NextResponse.json({ ok: false, error: "Not a hermes friendship" }, { status: 403 });
      }
      if (authedUser && !users.includes(authedUser.uid)) {
        return NextResponse.json({ ok: false, error: "Not a participant" }, { status: 403 });
      }
      await ref.set(
        { status: "accepted", updatedAt: new Date().toISOString() },
        { merge: true }
      );
      return NextResponse.json({ ok: true, status: "accepted" });
    }

    if (event === "hermes_register") {
      const { publicKey } = payload;
      await adminDb.collection("users").doc("hermes_agent_node").set(
        {
          profile: {
            username: "hermes_agent_node",
            displayName: "Hermes AI Agent",
            avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=hermes",
            role: "companion",
            telegramId: "hermes_agent_node",
          },
          publicKey: publicKey || null,
          role: "companion",
        },
        { merge: true }
      );
      return NextResponse.json({ ok: true });
    }

    if (event === "hermes_reply") {
      // Accepts (in order of preference):
      //   enc        — per-recipient cipher map { uid: {ct, iv, ephemPub} } (current model)
      //   ciphertext+iv — legacy shared-group-key cipher
      //   text       — plaintext (rules-protected) when no keys are available
      const { chatId, enc, ciphertext, iv, text } = payload;
      if (!chatId || (!enc && !text && !(ciphertext && iv))) {
        return NextResponse.json({ ok: false, error: "chatId and enc, text or ciphertext+iv required" }, { status: 400 });
      }
      const timestamp = new Date().toISOString();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const readBy = ["hermes_agent_node"];

      const msgBody = enc ? { enc } : ciphertext && iv ? { ciphertext, iv } : { text };
      const lastBody = enc
        ? { enc: true }
        : ciphertext && iv
          ? { ciphertext, iv }
          : { text: String(text).substring(0, 60) };

      await adminDb.collection("chats").doc(chatId).collection("messages").add({
        senderUid: "hermes_agent_node",
        senderName: "Hermes AI Agent",
        timestamp,
        expiresAt,
        type: "text",
        ...msgBody,
        readBy,
      });

      await adminDb.collection("chats").doc(chatId).set(
        {
          lastMessage: { ...lastBody, senderUid: "hermes_agent_node", timestamp, readBy },
        },
        { merge: true }
      );

      return NextResponse.json({ ok: true });
    }

    if (event === "hermes_get_calendar") {
      const { uid } = payload;
      const snap = await adminDb.collection("users").doc(uid).get();
      if (!snap.exists) {
        return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });
      }
      return NextResponse.json({ ok: true, calendar: snap.data().calendar || {} });
    }

    if (event === "hermes_update_calendar") {
      const { uid, calendar } = payload;
      await adminDb.collection("users").doc(uid).set({ calendar }, { merge: true });
      return NextResponse.json({ ok: true });
    }

    if (event === "hermes_get_suggestions") {
      const { uid } = payload;
      const snap = await adminDb.collection("users").doc(uid).collection("suggestions").get();
      const suggestions = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      return NextResponse.json({ ok: true, suggestions });
    }

    if (event === "hermes_update_suggestion") {
      const { uid, suggestionId, suggestion } = payload;
      await adminDb
        .collection("users")
        .doc(uid)
        .collection("suggestions")
        .doc(suggestionId)
        .set(suggestion, { merge: true });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: true, event, timestamp: new Date().toISOString() });
  } catch (err) {
    console.error(`[Pronoia Webhook] Handler error for "${event}":`, err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Firestore (Admin SDK) helpers
// ─────────────────────────────────────────────────────────────────────────────

// Resolve a user document by Telegram ID. telegramId may be stored as a number
// or a string, so we try both. Returns { docId, data, ref } or null.
async function getTelegramUser(telegramId) {
  if (!adminDb || telegramId === undefined || telegramId === null) return null;
  const usersRef = adminDb.collection("users");
  const idNum = Number(telegramId);

  let snap = await usersRef
    .where("profile.telegramId", "==", Number.isNaN(idNum) ? String(telegramId) : idNum)
    .limit(1)
    .get();

  if (snap.empty && !Number.isNaN(idNum)) {
    snap = await usersRef.where("profile.telegramId", "==", String(telegramId)).limit(1).get();
  }

  if (snap.empty) return null;
  const doc = snap.docs[0];
  return { docId: doc.id, data: doc.data(), ref: doc.ref };
}

// ─────────────────────────────────────────────────────────────────────────────
// User profile & stack persistence (Firestore Admin + optional Supabase mirror)
// ─────────────────────────────────────────────────────────────────────────────
async function saveUser({ telegramUser, profile }) {
  try {
    if (telegramUser?.id) {
      const userDoc = await getTelegramUser(telegramUser.id);
      if (userDoc) {
        await userDoc.ref.set(
          {
            profile: {
              goals: profile?.goals || [],
              experience: profile?.experience || "intermediate",
              age: profile?.age ?? null,
              challenge: profile?.challenge || "",
            },
          },
          { merge: true }
        );
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
        Prefer: "resolution=merge-duplicates",
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
        created_at: new Date().toISOString(),
      }),
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
      const userDoc = await getTelegramUser(telegramUser.id);
      if (userDoc) {
        const mappedStack = (stack || []).map((s) => ({
          name: s.name,
          dose: s.dose,
          timing: s.time === "am" ? "morning" : "evening",
          supply: 100,
        }));
        await userDoc.ref.set({ stack: mappedStack }, { merge: true });
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
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
      },
      body: JSON.stringify({
        telegram_id: telegramUser?.id,
        username: telegramUser?.username || null,
        stack,
        profile,
        chat_summary: chatSummary || [],
        synced_at: new Date().toISOString(),
      }),
    });
    if (!res.ok) {
      console.error(`[Pronoia Webhook] saveStack Supabase error: ${res.status} ${res.statusText}`);
    }
  } catch (error) {
    console.error("[Pronoia Webhook] saveStack network/fetch error:", error);
  }
}

const DEFAULT_STACK = [
  { name: "Creatin Monohydrat", dose: "5g täglich", time: "am", supply: 100 },
  { name: "Taurin", dose: "2g täglich", time: "am", supply: 100 },
  { name: "Bromantane", dose: "50mg 5on/2off", time: "am", supply: 100 },
  { name: "Magnesium Glycinat", dose: "400mg", time: "pm", supply: 100 },
  { name: "D3 + K2", dose: "5000IU + 200mcg", time: "am", supply: 100 },
];

function defaultStatus() {
  return {
    activeBlock: { title: "Fokus Arbeit", duration: 5400, pillar: "focus" },
    blockIdx: 0,
    isRunning: false,
    circadianMode: true,
    hrv: 72,
    sleep: 84,
    stack: DEFAULT_STACK,
    calendar: {},
  };
}

async function updateBiometrics({ telegramId, hrv, sleep }) {
  if (!telegramId) return;
  try {
    const userDoc = await getTelegramUser(telegramId);
    if (userDoc) {
      await userDoc.ref.update({
        "profile.metrics.hrv": parseInt(hrv) || 72,
        "profile.metrics.sleep": parseInt(sleep) || 84,
      });
    }
  } catch (e) {
    console.error("[Pronoia Webhook] updateBiometrics Firestore error:", e);
  }

  try {
    if (process.env.SUPABASE_URL) {
      await fetch(`${process.env.SUPABASE_URL}/rest/v1/pronoia_users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: process.env.SUPABASE_SERVICE_KEY,
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
          Prefer: "resolution=merge-duplicates",
        },
        body: JSON.stringify({
          telegram_id: telegramId,
          hrv: parseInt(hrv) || 72,
          sleep: parseInt(sleep) || 84,
          updated_at: new Date().toISOString(),
        }),
      });
    }
  } catch (e) {
    console.error("[Pronoia Webhook] updateBiometrics Supabase error:", e);
  }
}

async function handleBlockControl({ telegramId, action }) {
  let updatedState = null;
  if (!telegramId) return updatedState;

  try {
    const userDoc = await getTelegramUser(telegramId);
    if (userDoc) {
      const data = userDoc.data;
      let newIdx = data.blockIdx !== undefined ? data.blockIdx : 0;
      let newRunning = data.isRunning !== undefined ? data.isRunning : false;
      const blocks = data.blocks || [
        { title: "Fokus Arbeit", duration: 5400, pillar: "focus" },
        { title: "Skill Erwerb", duration: 2700, pillar: "skills" },
        { title: "Sunset Regeneration", duration: 1500, pillar: "recovery" },
      ];

      if (action === "next") {
        if (newIdx < blocks.length - 1) newIdx++;
      } else if (action === "prev") {
        if (newIdx > 0) newIdx--;
      } else if (action === "toggle") {
        newRunning = !newRunning;
      }

      await userDoc.ref.update({ blockIdx: newIdx, isRunning: newRunning });

      updatedState = {
        activeBlock: blocks[newIdx] || null,
        blockIdx: newIdx,
        isRunning: newRunning,
        circadianMode: data.circadianMode !== undefined ? !!data.circadianMode : true,
      };
    }
  } catch (e) {
    console.error("[Pronoia Webhook] handleBlockControl Firestore error:", e);
  }

  try {
    if (process.env.SUPABASE_URL) {
      const res = await fetch(
        `${process.env.SUPABASE_URL}/rest/v1/pronoia_users?telegram_id=eq.${telegramId}`,
        {
          headers: {
            apikey: process.env.SUPABASE_SERVICE_KEY,
            Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
          },
        }
      );
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
            { title: "Sunset NSDR Recovery", duration: 1500, pillar: "recovery" },
          ];

          if (action === "next") {
            if (blockIdx < blocks.length - 1) blockIdx++;
          } else if (action === "prev") {
            if (blockIdx > 0) blockIdx--;
          } else if (action === "toggle") {
            isRunning = !isRunning;
          }

          await fetch(`${process.env.SUPABASE_URL}/rest/v1/pronoia_users`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: process.env.SUPABASE_SERVICE_KEY,
              Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
              Prefer: "resolution=merge-duplicates",
            },
            body: JSON.stringify({
              telegram_id: telegramId,
              block_idx: blockIdx,
              is_running: isRunning,
              current_block: blocks[blockIdx] || null,
              updated_at: new Date().toISOString(),
            }),
          });

          if (!updatedState) {
            updatedState = {
              activeBlock: blocks[blockIdx] || null,
              blockIdx,
              isRunning,
              circadianMode: user.circadian_mode !== undefined ? !!user.circadian_mode : true,
            };
          }
        }
      }
    }
  } catch (e) {
    console.error("[Pronoia Webhook] handleBlockControl Supabase error:", e);
  }

  if (!updatedState) {
    updatedState = {
      activeBlock: { title: "Fokus Arbeit", duration: 5400, pillar: "focus" },
      blockIdx: 0,
      isRunning: action === "toggle",
      circadianMode: action === "next" || action === "prev" ? false : true,
    };
  }

  return updatedState;
}

async function handleCalendarAdd({ telegramId, block }) {
  if (!telegramId || !block) return;
  const { date, title, startTime, duration, pillar } = block;
  const newBlock = {
    title: title || "Neuer Block",
    startTime: startTime || "12:00",
    duration: parseInt(duration) || 3600,
    pillar: pillar || "focus",
    rec: "Über Telegram Bot hinzugefügt.",
    insight: "Aktive Lebensplanung reduziert kognitive Reibungspunkte.",
  };

  try {
    const userDoc = await getTelegramUser(telegramId);
    if (userDoc) {
      const calendar = userDoc.data.calendar || {};
      const dayData = calendar[date] || { blocks: [] };
      const updatedBlocks = [...(dayData.blocks || []), newBlock].sort((a, b) =>
        (a.startTime || "").localeCompare(b.startTime || "")
      );
      calendar[date] = { ...dayData, blocks: updatedBlocks };
      await userDoc.ref.set({ calendar }, { merge: true });
    }
  } catch (e) {
    console.error("[Pronoia Webhook] handleCalendarAdd Firestore error:", e);
  }

  try {
    if (process.env.SUPABASE_URL) {
      const res = await fetch(
        `${process.env.SUPABASE_URL}/rest/v1/pronoia_users?telegram_id=eq.${telegramId}`,
        {
          headers: {
            apikey: process.env.SUPABASE_SERVICE_KEY,
            Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
          },
        }
      );
      if (res.ok) {
        const users = await res.json();
        if (users && users.length > 0) {
          const user = users[0];
          const calendar = user.calendar || {};
          const dayData = calendar[date] || { blocks: [] };
          const updatedBlocks = [...(dayData.blocks || []), newBlock].sort((a, b) =>
            (a.startTime || "").localeCompare(b.startTime || "")
          );
          calendar[date] = { ...dayData, blocks: updatedBlocks };

          await fetch(`${process.env.SUPABASE_URL}/rest/v1/pronoia_users`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: process.env.SUPABASE_SERVICE_KEY,
              Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
              Prefer: "resolution=merge-duplicates",
            },
            body: JSON.stringify({
              telegram_id: telegramId,
              calendar,
              updated_at: new Date().toISOString(),
            }),
          });
        }
      }
    }
  } catch (e) {
    console.error("[Pronoia Webhook] handleCalendarAdd Supabase error:", e);
  }
}

async function getUserStatusWithDebug(telegramId) {
  let status = defaultStatus();
  let debug = {
    dbInitialized: !!adminDb,
    telegramId,
    telegramIdType: typeof telegramId,
    matchedDocs: 0,
    error: null,
  };

  if (!telegramId) {
    debug.error = "No Telegram ID provided";
    return { status, debug };
  }

  try {
    const userDoc = await getTelegramUser(telegramId);
    if (userDoc) {
      debug.matchedDocs = 1;
      const data = userDoc.data;
      const activeBlock = data.blocks?.[data.blockIdx] || null;
      const mappedStack = (data.stack || []).map((s) => ({
        name: s.name,
        dose: s.dose,
        time: s.timing === "evening" ? "pm" : "am",
        supply: s.supply !== undefined ? s.supply : 100,
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
        customization: data.profile?.customization || { accent: "blue", mode: "serious" },
        directives: data.directives || [],
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

  try {
    const userDoc = await getTelegramUser(telegramId);
    if (userDoc) {
      const data = userDoc.data;
      const blocks = data.blocks || [];
      const isRunning = !!data.isRunning;

      await userDoc.ref.update({ circadianMode: mode });

      updatedState = {
        activeBlock: blocks[data.blockIdx || 0] || null,
        blockIdx: data.blockIdx || 0,
        isRunning,
        circadianMode: mode,
      };
    }
  } catch (e) {
    console.error("[Pronoia Webhook] handleCircadianToggle Firestore error:", e);
  }

  try {
    if (process.env.SUPABASE_URL) {
      await fetch(`${process.env.SUPABASE_URL}/rest/v1/pronoia_users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: process.env.SUPABASE_SERVICE_KEY,
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
          Prefer: "resolution=merge-duplicates",
        },
        body: JSON.stringify({
          telegram_id: telegramId,
          circadian_mode: mode,
          updated_at: new Date().toISOString(),
        }),
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

  try {
    const userDoc = await getTelegramUser(telegramId);
    if (userDoc) {
      const data = userDoc.data;
      const currentBlock = data.blocks?.[data.blockIdx || 0];
      const newLog = {
        ts: new Date().toLocaleTimeString(),
        status, // 'ok', 'warn', 'miss'
        blockTitle: currentBlock ? currentBlock.title : "Freier Block",
      };

      const frictionLogs = data.frictionLogs || [];
      const updatedLogs = [newLog, ...frictionLogs].slice(0, 15);

      await userDoc.ref.update({ frictionLogs: updatedLogs });

      updatedState = {
        activeBlock: currentBlock || null,
        blockIdx: data.blockIdx || 0,
        isRunning: !!data.isRunning,
        frictionLogs: updatedLogs,
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

  try {
    const userDoc = await getTelegramUser(telegramId);
    if (userDoc) {
      const data = userDoc.data;
      const stack = data.stack || [];
      if (stack[idx]) {
        const item = stack[idx];
        const newSupply = Math.max(0, (item.supply !== undefined ? item.supply : 100) - 5);
        stack[idx] = { ...item, supply: newSupply };
        await userDoc.ref.update({ stack });
      }

      const mappedStack = stack.map((s) => ({
        name: s.name,
        dose: s.dose,
        time: s.timing === "evening" ? "pm" : "am",
        supply: s.supply !== undefined ? s.supply : 100,
      }));

      updatedState = {
        activeBlock: data.blocks?.[data.blockIdx || 0] || null,
        blockIdx: data.blockIdx || 0,
        isRunning: !!data.isRunning,
        stack: mappedStack,
      };
    }
  } catch (e) {
    console.error("[Pronoia Webhook] handleStackConsume Firestore error:", e);
  }

  return updatedState;
}
