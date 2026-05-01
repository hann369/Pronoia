// Pronoia Safety - Popup v0.2 (no inline handlers)

let pinBuffer = "";
let pinRequired = false;

// ─── INIT ─────────────────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", async () => {
  bindPinScreen();
  bindMainScreen();
  bindSettingsScreen();

  const s = await msg("PS_GET_SETTINGS");
  pinRequired = s.passwordHash === "SET";

  if (!pinRequired) {
    showScreen("main-screen");
    initMain(s);
  }
  updatePinDots();
});

// ─── PIN SCREEN ───────────────────────────────────────────────────────────────

function bindPinScreen() {
  document.querySelectorAll(".numpad button").forEach(btn => {
    btn.addEventListener("click", () => pinKey(btn.dataset.key));
  });
  document.getElementById("skip-btn").addEventListener("click", () => {
    if (!pinRequired) {
      msg("PS_GET_SETTINGS").then(s => { showScreen("main-screen"); initMain(s); });
    }
  });
}

function pinKey(k) {
  document.getElementById("pin-error").textContent = "";
  if (k === "del") {
    pinBuffer = pinBuffer.slice(0, -1);
  } else if (k === "ok") {
    submitPin(); return;
  } else {
    if (pinBuffer.length >= 8) return;
    pinBuffer += k;
    if (pinBuffer.length === 4) { submitPin(); return; }
  }
  updatePinDots();
}

function updatePinDots() {
  for (let i = 0; i < 4; i++) {
    document.getElementById("d" + i).classList.toggle("filled", i < pinBuffer.length);
  }
}

async function submitPin() {
  if (pinBuffer.length < 4) return;
  const ok = await msg("PS_VERIFY_PIN", { pin: pinBuffer });
  if (ok) {
    const s = await msg("PS_GET_SETTINGS");
    showScreen("main-screen");
    initMain(s);
  } else {
    document.getElementById("pin-error").textContent = "Falscher PIN";
    pinBuffer = "";
    updatePinDots();
  }
}

// ─── MAIN SCREEN ──────────────────────────────────────────────────────────────

function bindMainScreen() {
  document.getElementById("settings-btn").addEventListener("click", () => {
    showScreen("settings-screen");
  });

  document.getElementById("dashboard-btn").addEventListener("click", () => {
    chrome.tabs.create({ url: chrome.runtime.getURL("dashboard/index.html") });
  });

  document.getElementById("scan-btn").addEventListener("click", async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.url) return;
    document.getElementById("scan-msg").textContent = "Scanne...";
    const r = await msg("PS_SCAN_URL", { url: tab.url });
    applyScanResult(r);
    document.getElementById("scan-msg").textContent =
      r.safe ? "✓ Keine Risiken gefunden" : "⚠ Risiko erkannt";
  });

  ["t-enabled","t-adult","t-sb","t-comm"].forEach(id => {
    document.getElementById(id).addEventListener("change", saveToggles);
  });
}

async function initMain(s) {
  document.getElementById("t-enabled").checked = s.enabled;
  document.getElementById("t-adult").checked = s.blockAdultSites;
  document.getElementById("t-sb").checked = s.useSafeBrowsing;
  document.getElementById("t-comm").checked = s.scanCommunities;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.url?.startsWith("http")) {
    try { document.getElementById("s-host").textContent = new URL(tab.url).hostname; } catch {}
    const r = await msg("PS_SCAN_URL", { url: tab.url });
    applyScanResult(r);
  }

  loadLog();
}

function applyScanResult(r) {
  setBadge("s-adult", r.adultDomain || r.dangerKeyword);
  setBadge("s-sb", !!r.safeBrowsing, r.safeBrowsing ? r.safeBrowsing.replace(/_/g," ").toLowerCase() : null);
  setBadge("s-comm", r.discordFlag || r.redditFlag);
}

function setBadge(id, bad, customText) {
  const el = document.getElementById(id);
  el.className = bad ? "badge-bad" : "badge-ok";
  el.textContent = bad ? (customText || "Risiko") : "sauber";
}

async function saveToggles() {
  await msg("PS_UPDATE_SETTINGS", { settings: {
    enabled:         document.getElementById("t-enabled").checked,
    blockAdultSites: document.getElementById("t-adult").checked,
    useSafeBrowsing: document.getElementById("t-sb").checked,
    scanCommunities: document.getElementById("t-comm").checked
  }});
}

async function loadLog() {
  const log = await msg("PS_GET_LOG");
  const el = document.getElementById("log-list");
  if (!log?.length) return;
  el.innerHTML = log.slice(0, 5).map(e => {
    const color = e.type === "BLOCKED" ? "#e24b4a" : "#ef9f27";
    const label = e.type === "BLOCKED" ? "GEBLOCKT" : "WARNUNG";
    return `<div class="log-item">
      <div class="log-t" style="color:${color}">${label}</div>
      <div class="log-u">${esc(e.url)}</div>
    </div>`;
  }).join("");
}

// ─── SETTINGS SCREEN ─────────────────────────────────────────────────────────

function bindSettingsScreen() {
  document.getElementById("back-btn").addEventListener("click", () => showScreen("main-screen"));
  document.getElementById("set-pin-btn").addEventListener("click", doSetPin);
  document.getElementById("del-pin-btn").addEventListener("click", doRemovePin);
  document.getElementById("save-email-btn").addEventListener("click", doSaveEmail);
  document.getElementById("clear-log-btn").addEventListener("click", doClearLog);
  document.getElementById("t-notify").addEventListener("change", () => {
    msg("PS_UPDATE_SETTINGS", { settings: { notifyParent: document.getElementById("t-notify").checked }});
  });
}

async function initSettings() {
  const s = await msg("PS_GET_SETTINGS");
  document.getElementById("pin-status").textContent =
    s.passwordHash === "SET" ? "✓ PIN ist aktiv" : "Kein PIN gesetzt";
  document.getElementById("remove-pin-row").style.display =
    s.passwordHash === "SET" ? "block" : "none";
  document.getElementById("t-notify").checked = s.notifyParent || false;
  document.getElementById("parent-email").value = s.parentEmail || "";
}

async function doSetPin() {
  const pin = document.getElementById("new-pin").value.trim();
  const r = await msg("PS_SET_PIN", { pin });
  const el = document.getElementById("pin-msg");
  el.className = "msg " + (r.ok ? "ok" : "err");
  el.textContent = r.ok ? "✓ PIN gesetzt" : r.error;
  if (r.ok) {
    document.getElementById("pin-status").textContent = "✓ PIN ist aktiv";
    document.getElementById("remove-pin-row").style.display = "block";
    document.getElementById("new-pin").value = "";
  }
}

async function doRemovePin() {
  const pin = document.getElementById("del-pin").value.trim();
  const r = await msg("PS_REMOVE_PIN", { pin });
  const el = document.getElementById("del-pin-msg");
  el.className = "msg " + (r.ok ? "ok" : "err");
  el.textContent = r.ok ? "✓ PIN entfernt" : r.error;
  if (r.ok) {
    document.getElementById("pin-status").textContent = "Kein PIN gesetzt";
    document.getElementById("remove-pin-row").style.display = "none";
    document.getElementById("del-pin").value = "";
  }
}

async function doSaveEmail() {
  const email = document.getElementById("parent-email").value.trim();
  await msg("PS_UPDATE_SETTINGS", { settings: { parentEmail: email }});
  const el = document.getElementById("email-msg");
  el.className = "msg ok";
  el.textContent = "✓ Gespeichert";
  setTimeout(() => el.textContent = "", 2000);
}

async function doClearLog() {
  await chrome.storage.local.set({ ps_log: [], ps_dash: [] });
  loadLog();
}

// ─── SCREEN ROUTER ────────────────────────────────────────────────────────────

function showScreen(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
  if (id === "settings-screen") initSettings();
}

// ─── UTILS ───────────────────────────────────────────────────────────────────

function msg(type, extra = {}) {
  return new Promise(r => chrome.runtime.sendMessage({ type, ...extra }, r));
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, c =>
    ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
}
