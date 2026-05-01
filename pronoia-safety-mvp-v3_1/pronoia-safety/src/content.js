// Pronoia Safety - Content Script v0.1
// Injected into every page — shows warning overlays, scans visible text

(function () {
  "use strict";

  let warned = false;

  // ─── LISTEN FOR BACKGROUND MESSAGES ────────────────────────────────────────

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "PS_WARNING" && !warned) {
      warned = true;
      showWarningOverlay(msg.reason);
    }
  });

  // ─── TEXT SCANNER (scans page text after load) ─────────────────────────────

  const SOFT_FLAGS = [
    "nsfw", "18+", "adults only", "explicit content",
    "pornographic", "sexually explicit", "nude", "naked"
  ];

  window.addEventListener("DOMContentLoaded", () => {
    // Check page title and meta description
    const title = document.title.toLowerCase();
    const meta = document.querySelector('meta[name="description"]');
    const desc = meta ? meta.content.toLowerCase() : "";

    const combined = title + " " + desc;
    const flagged = SOFT_FLAGS.some(kw => combined.includes(kw));

    if (flagged && !warned) {
      warned = true;
      chrome.runtime.sendMessage({
        type: "PS_SCAN_URL",
        url: window.location.href
      }, (result) => {
        if (result && !result.safe) {
          showWarningOverlay("Seite enthält möglicherweise unsichere Inhalte");
        }
      });
    }

    // Check for pending warning from background
    chrome.storage.session.get(`pending_warn_${chrome.runtime.id}`, (res) => {
      // session keying by tab is handled in background; this is a fallback
    });
  });

  // ─── WARNING OVERLAY ────────────────────────────────────────────────────────

  function showWarningOverlay(reason) {
    const overlay = document.createElement("div");
    overlay.id = "pronoia-safety-overlay";
    overlay.innerHTML = `
      <div style="
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(10,12,15,0.92);
        z-index: 2147483647;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      ">
        <div style="
          background: #111417;
          border: 1px solid rgba(239,159,39,0.4);
          border-radius: 16px;
          padding: 2.5rem;
          max-width: 420px;
          width: 90%;
          text-align: center;
        ">
          <div style="font-size: 48px; margin-bottom: 1rem;">⚠️</div>
          <h2 style="
            color: #ef9f27;
            font-size: 18px;
            font-weight: 600;
            margin: 0 0 0.75rem;
          ">Pronoia Safety — Warnung</h2>
          <p style="
            color: rgba(240,240,238,0.65);
            font-size: 13px;
            line-height: 1.6;
            margin: 0 0 1.75rem;
          ">${escapeHtml(reason)}</p>
          <div style="display: flex; gap: 10px; justify-content: center;">
            <button id="ps-go-back" style="
              background: #2db87a;
              color: #081a11;
              border: none;
              padding: 0.65rem 1.4rem;
              border-radius: 8px;
              font-size: 13px;
              font-weight: 600;
              cursor: pointer;
            ">← Zurück</button>
            <button id="ps-proceed" style="
              background: transparent;
              color: rgba(240,240,238,0.4);
              border: 0.5px solid rgba(240,240,238,0.15);
              padding: 0.65rem 1.4rem;
              border-radius: 8px;
              font-size: 13px;
              cursor: pointer;
            ">Trotzdem fortfahren</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    document.getElementById("ps-go-back").addEventListener("click", () => {
      history.back();
    });

    document.getElementById("ps-proceed").addEventListener("click", () => {
      overlay.remove();
      warned = false;
    });
  }

  function escapeHtml(str) {
    return str.replace(/[&<>"']/g, c => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
  }
})();
