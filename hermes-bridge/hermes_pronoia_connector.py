"""
hermes_pronoia_connector.py — Pronoia ⇄ Hermes agent bridge daemon.

Flow
----
1. On startup, load/create a persistent P-256 identity and register the bridge's
   PUBLIC key with Pronoia (`hermes_register`) so the web client can E2E-wrap the
   per-chat group key for `hermes_agent_node`.
2. The Next.js webhook forwards `hermes_trigger` events here (authenticated with
   WEBHOOK_SECRET). We:
     - unwrap the chat group key with our PRIVATE key,
     - decrypt the incoming message,
     - optionally pull calendar/suggestions context back from Pronoia,
     - run the Hermes agent to produce a reply,
     - encrypt the reply with the group key and post it back (`hermes_reply`).

This replaces the previous ad-hoc integration with a documented, secure contract:
auth is the shared WEBHOOK_SECRET in BOTH directions, and message content is
end-to-end encrypted — Pronoia's servers never see plaintext.

Run:  python hermes_pronoia_connector.py
Env:  see .env.example
Hermes agent: https://github.com/NousResearch/hermes-agent
"""

import os
import json

from dotenv import load_dotenv
load_dotenv()

import requests
from flask import Flask, request, jsonify

import hermes_e2e as e2e

# ── Configuration ────────────────────────────────────────────────────────────
WEBHOOK_SECRET = os.environ.get("WEBHOOK_SECRET")
PRONOIA_WEBHOOK_URL = os.environ.get(
    "PRONOIA_WEBHOOK_URL", "http://localhost:3000/api/agent-webhook"
)
LISTEN_HOST = os.environ.get("HERMES_BRIDGE_HOST", "0.0.0.0")
LISTEN_PORT = int(os.environ.get("HERMES_BRIDGE_PORT", "8080"))
IDENTITY_PATH = os.environ.get("HERMES_IDENTITY_PATH", "hermes_identity.json")
HERMES_AGENT_ID = "hermes_agent_node"

# Hermes model endpoint (OpenAI-compatible; e.g. a vLLM server hosting a
# NousResearch Hermes model, or the hermes-agent runtime).
HERMES_MODEL_URL = os.environ.get("HERMES_MODEL_URL")  # e.g. http://localhost:8000/v1/chat/completions
HERMES_MODEL_NAME = os.environ.get("HERMES_MODEL_NAME", "NousResearch/Hermes-3-Llama-3.1-8B")
HERMES_API_KEY = os.environ.get("HERMES_API_KEY", "")

app = Flask(__name__)
IDENTITY = e2e.load_or_create_identity(IDENTITY_PATH)


# ── Pronoia callbacks ────────────────────────────────────────────────────────
def call_pronoia(payload: dict) -> dict:
    if not WEBHOOK_SECRET:
        raise RuntimeError("WEBHOOK_SECRET is not set; cannot talk to Pronoia.")
    res = requests.post(
        PRONOIA_WEBHOOK_URL,
        headers={"Content-Type": "application/json", "x-bot-secret": WEBHOOK_SECRET},
        data=json.dumps(payload),
        timeout=20,
    )
    res.raise_for_status()
    try:
        return res.json()
    except ValueError:
        return {}


def register_identity():
    """Publish our public key so clients wrap the group key for us."""
    try:
        call_pronoia(
            {
                "event": "hermes_register",
                "source": "hermes_bridge",
                "publicKey": {"jwk": e2e.public_jwk(IDENTITY)},
            }
        )
        print(f"[Hermes Bridge] Registered public key for {HERMES_AGENT_ID}.")
    except Exception as exc:  # noqa: BLE001
        print(f"[Hermes Bridge] Registration failed (will retry on next trigger): {exc}")


def fetch_context(uid: str) -> dict:
    """Best-effort: pull calendar + suggestions for richer agent grounding."""
    context = {}
    if not uid:
        return context
    try:
        cal = call_pronoia({"event": "hermes_get_calendar", "source": "hermes_bridge", "uid": uid})
        context["calendar"] = cal.get("calendar", {})
    except Exception:  # noqa: BLE001
        pass
    try:
        sug = call_pronoia({"event": "hermes_get_suggestions", "source": "hermes_bridge", "uid": uid})
        context["suggestions"] = sug.get("suggestions", [])
    except Exception:  # noqa: BLE001
        pass
    return context


# ── Hermes agent ─────────────────────────────────────────────────────────────
SYSTEM_PROMPT = (
    "Du bist Hermes, der KI-Begleiter im Pronoia Life OS. Antworte direkt, "
    "präzise, wissenschaftlich fundiert und auf Deutsch. Du hilfst bei Fokus, "
    "Schlaf, Supplementation und Tagesstruktur. Halte dich kurz."
)


def run_agent(message: str, context: dict) -> str:
    """
    Pluggable Hermes call. Wire this to the NousResearch hermes-agent runtime or
    any OpenAI-compatible Hermes model. Falls back to a simple acknowledgement.
    """
    if not HERMES_MODEL_URL:
        return f"Hermes (offline): Verstanden — „{message[:140]}“. Konfiguriere HERMES_MODEL_URL für volle Antworten."

    ctx_note = ""
    if context.get("calendar"):
        ctx_note += f"\n[Kalender-Kontext vorhanden: {len(context['calendar'])} Tage]"
    if context.get("suggestions"):
        ctx_note += f"\n[{len(context['suggestions'])} offene Vorschläge]"

    try:
        res = requests.post(
            HERMES_MODEL_URL,
            headers={
                "Content-Type": "application/json",
                **({"Authorization": f"Bearer {HERMES_API_KEY}"} if HERMES_API_KEY else {}),
            },
            data=json.dumps(
                {
                    "model": HERMES_MODEL_NAME,
                    "messages": [
                        {"role": "system", "content": SYSTEM_PROMPT + ctx_note},
                        {"role": "user", "content": message},
                    ],
                    "temperature": 0.7,
                    "max_tokens": 500,
                }
            ),
            timeout=60,
        )
        res.raise_for_status()
        data = res.json()
        return data["choices"][0]["message"]["content"].strip()
    except Exception as exc:  # noqa: BLE001
        print(f"[Hermes Bridge] Agent call failed: {exc}")
        return "Hermes: Kurze Störung im Reasoning-Kern. Bitte erneut versuchen."


# ── Webhook endpoint ─────────────────────────────────────────────────────────
@app.post("/pronoia-webhook")
def pronoia_webhook():
    # Auth: same shared secret the Next.js webhook uses to reach us.
    if not WEBHOOK_SECRET or request.headers.get("x-bot-secret") != WEBHOOK_SECRET:
        return jsonify({"ok": False, "error": "Unauthorized"}), 401

    payload = request.get_json(silent=True) or {}
    event = payload.get("event")

    if event != "hermes_trigger":
        return jsonify({"ok": True, "ignored": event})

    chat_id = payload.get("chatId")
    message = payload.get("message", {}) or {}
    group_key_map = payload.get("groupKey") or {}
    sender_uid = message.get("senderUid")

    # 1. Resolve plaintext of the incoming message.
    plaintext = None
    group_key = None
    wrapped = group_key_map.get(HERMES_AGENT_ID)
    try:
        if wrapped and wrapped.get("ephemPub"):
            group_key = e2e.unwrap_group_key(wrapped, IDENTITY)
        if message.get("ciphertext") and message.get("iv") and group_key:
            plaintext = e2e.decrypt_message(group_key, message["ciphertext"], message["iv"])
        elif message.get("text"):
            plaintext = message["text"]
    except Exception as exc:  # noqa: BLE001
        print(f"[Hermes Bridge] Decryption failed: {exc}")

    if plaintext is None:
        # Likely our key isn't wrapped yet — (re)register and ask the client to heal.
        register_identity()
        return jsonify({"ok": False, "error": "no_readable_message"}), 202

    # 2. Build context + run the agent.
    context = fetch_context(sender_uid)
    reply_text = run_agent(plaintext, context)

    # 3. Encrypt + post the reply back into the chat.
    if not group_key:
        return jsonify({"ok": False, "error": "no_group_key"}), 202

    enc = e2e.encrypt_message(group_key, reply_text)
    try:
        call_pronoia(
            {
                "event": "hermes_reply",
                "source": "hermes_bridge",
                "chatId": chat_id,
                "ciphertext": enc["ciphertext"],
                "iv": enc["iv"],
            }
        )
    except Exception as exc:  # noqa: BLE001
        print(f"[Hermes Bridge] Failed to post reply: {exc}")
        return jsonify({"ok": False, "error": str(exc)}), 502

    return jsonify({"ok": True})


@app.get("/health")
def health():
    return jsonify({"ok": True, "agent": HERMES_AGENT_ID, "model_configured": bool(HERMES_MODEL_URL)})


if __name__ == "__main__":
    if not WEBHOOK_SECRET:
        print("[WARNING] WEBHOOK_SECRET is not set -- the bridge will reject all requests.")
    register_identity()
    print(f"[Hermes Bridge] Listening on http://{LISTEN_HOST}:{LISTEN_PORT}/pronoia-webhook")
    app.run(host=LISTEN_HOST, port=LISTEN_PORT)
