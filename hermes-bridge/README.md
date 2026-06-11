# Pronoia ⇄ Hermes Bridge

A small Python daemon that connects the [NousResearch hermes-agent](https://github.com/NousResearch/hermes-agent)
(or any OpenAI-compatible Hermes model) to the Pronoia Life OS chat as the
end-to-end-encrypted companion `hermes_agent_node`.

## How it fits together

```
Browser (useChat.js)                Next.js (/api/agent-webhook)            This bridge
─────────────────────               ───────────────────────────            ───────────
send E2E message  ───────────────►  hermes_trigger (forwarded) ─────────►  /pronoia-webhook
  (Authorization: Firebase ID tok)    (x-bot-secret = WEBHOOK_SECRET)         unwrap group key
                                                                              decrypt message
                                                                              run Hermes agent
                                    hermes_reply  ◄──────────────────────     encrypt reply
read reply in chat ◄──────────────  writes encrypted msg (Admin SDK)
```

* **Auth** is the shared `WEBHOOK_SECRET` in *both* directions. It must be set to
  the **same value** in the Next.js app (Vercel env) and here.
* **Content is end-to-end encrypted.** Pronoia's servers and this bridge exchange
  only ciphertext + the per-recipient wrapped group key. The bridge decrypts with
  its own private key (`hermes_identity.json`). The crypto in `hermes_e2e.py` is
  byte-compatible with the browser's WebCrypto implementation (`lib/crypto.js`).

## Setup

```bash
cd hermes-bridge
python -m venv .venv && . .venv/Scripts/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env        # fill in WEBHOOK_SECRET + PRONOIA_WEBHOOK_URL (+ model)
python hermes_pronoia_connector.py
```

On the **Next.js side**, set:

```
WEBHOOK_SECRET=<same secret as here>
HERMES_AGENT_URL=http://<bridge-host>:8080/pronoia-webhook
```

## Ordering / key healing

On startup the bridge calls `hermes_register` to publish its **public** key. The
web client wraps each chat's group key for every participant's public key; if a
hermes chat was created before the bridge registered, the client's key-healing
logic re-wraps the group key for `hermes_agent_node` on the next message — so the
bridge starts being able to read messages shortly after it comes online.

## Connecting a real Hermes model

Set `HERMES_MODEL_URL` to an OpenAI-compatible chat-completions endpoint (e.g. a
vLLM server hosting `NousResearch/Hermes-3-Llama-3.1-8B`). Without it, the bridge
runs in offline echo mode so you can verify the transport + crypto end-to-end.

For deeper tool-use / agentic behaviour, replace `run_agent()` in
`hermes_pronoia_connector.py` with a call into the hermes-agent runtime.
