// Pronoia Safety - Popup JS

document.addEventListener("DOMContentLoaded", async () => {

  // Load settings
  const settings = await msg("PS_GET_SETTINGS");
  if (settings) {
    document.getElementById("t-enabled").checked = settings.enabled;
    document.getElementById("t-adult").checked = settings.blockAdultSites;
    document.getElementById("t-community").checked = settings.scanCommunities;
  }

  // Save settings on toggle change
  ["t-enabled", "t-adult", "t-community"].forEach(id => {
    document.getElementById(id).addEventListener("change", saveSettings);
  });

  // Scan current tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.url && tab.url.startsWith("http")) {
    const urlLabel = document.getElementById("current-url");
    try {
      urlLabel.textContent = new URL(tab.url).hostname;
    } catch {}

    const result = await msg("PS_SCAN_URL", { url: tab.url });
    if (result) updateScanUI(result);
  }

  // Manual scan button
  document.getElementById("scan-now").addEventListener("click", async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.url) return;
    const result = await msg("PS_SCAN_URL", { url: tab.url });
    updateScanUI(result);
    document.getElementById("scan-result").textContent =
      result.safe ? "✓ Keine Risiken erkannt" : "⚠ Problematischer Inhalt gefunden";
  });

  // Load log
  loadLog();
});

function updateScanUI(result) {
  setBadge("s-adult", result.adultDomain ? "gefunden" : "sauber", !result.adultDomain);
  setBadge("s-keyword", result.dangerKeyword ? "gefunden" : "sauber", !result.dangerKeyword);

  const communityRisk = result.discordFlag || result.redditFlag;
  setBadge("s-community", communityRisk ? "prüfen" : "niedrig", !communityRisk);
}

function setBadge(id, text, safe) {
  const el = document.getElementById(id);
  el.textContent = text;
  el.className = safe ? "badge-safe" : "badge-warn";
}

async function saveSettings() {
  await msg("PS_UPDATE_SETTINGS", {
    settings: {
      enabled: document.getElementById("t-enabled").checked,
      blockAdultSites: document.getElementById("t-adult").checked,
      scanCommunities: document.getElementById("t-community").checked
    }
  });
}

async function loadLog() {
  const log = await msg("PS_GET_LOG");
  const container = document.getElementById("log-entries");
  if (!log || log.length === 0) return;

  container.innerHTML = log.slice(0, 5).map(e => `
    <div class="log-item">
      <div class="log-type" style="color: ${e.type === 'BLOCKED' ? '#e24b4a' : '#ef9f27'}">
        ${e.type === 'BLOCKED' ? '✗ GEBLOCKT' : '⚠ WARNUNG'}
      </div>
      <div class="log-url">${escapeHtml(e.url)}</div>
    </div>
  `).join("");
}

function msg(type, extra = {}) {
  return new Promise(resolve => {
    chrome.runtime.sendMessage({ type, ...extra }, resolve);
  });
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}
