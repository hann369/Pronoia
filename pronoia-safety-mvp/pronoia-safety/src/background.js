// Pronoia Safety - Background Service Worker v0.1
// Handles URL blocking, community scanning, and parent alerts

// ─── BLOCKED URL PATTERNS ───────────────────────────────────────────────────

const ADULT_DOMAINS = [
  "pornhub.com", "xvideos.com", "xnxx.com", "xhamster.com",
  "redtube.com", "youporn.com", "tube8.com", "spankbang.com",
  "eporner.com", "4tube.com", "beeg.com", "brazzers.com",
  "onlyfans.com", "fansly.com", "manyvids.com", "chaturbate.com",
  "livejasmin.com", "stripchat.com", "bongacams.com", "cam4.com",
  "rule34.xxx", "e621.net", "gelbooru.com", "nhentai.net",
  "hentai2read.com", "hentaifox.com"
];

// Keywords flagged in URLs and page titles
const DANGER_KEYWORDS = [
  "porn", "xxx", "nude", "naked", "hentai", "nsfw", "adult-only",
  "18plus", "18+", "erotic", "sex-video", "leaks", "onlyfans-leak",
  "gore", "beheading", "self-harm", "suicide-method", "drug-buy",
  "cp", "childporn", "pedo", "loli-sex"
];

// Discord invite patterns known for problematic content (MVP: small list)
const FLAGGED_DISCORD_KEYWORDS = [
  "nsfw", "18+", "adults-only", "gore", "hentai", "drug",
  "cp", "pedo", "grooming", "self-harm", "suicide"
];

const FLAGGED_REDDIT_SUBS = [
  "gonewild", "nsfw", "pornfree", "watchpeopledie", "jailbait",
  "teenagers_nsfw", "creepshots"
];

// ─── STATE ───────────────────────────────────────────────────────────────────

let settings = {
  enabled: true,
  blockAdultSites: true,
  scanCommunities: true,
  notifyParent: false,
  parentEmail: ""
};

// Load persisted settings on startup
chrome.storage.local.get("ps_settings", (res) => {
  if (res.ps_settings) settings = { ...settings, ...res.ps_settings };
});

// ─── URL BLOCKING (Dynamic Rules via Tabs) ───────────────────────────────────

chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
  if (!settings.enabled || details.frameId !== 0) return;

  const url = new URL(details.url);
  const hostname = url.hostname.replace("www.", "");
  const fullUrl = details.url.toLowerCase();

  // 1. Check adult domain list
  if (settings.blockAdultSites && ADULT_DOMAINS.some(d => hostname.includes(d))) {
    await blockTab(details.tabId, details.url, "Geblockte Domain");
    return;
  }

  // 2. Check URL for danger keywords
  if (settings.blockAdultSites && DANGER_KEYWORDS.some(kw => fullUrl.includes(kw))) {
    await blockTab(details.tabId, details.url, "Gefährliches URL-Muster");
    return;
  }

  // 3. Platform-specific community scans
  if (settings.scanCommunities) {
    if (hostname.includes("discord.com")) {
      await scanDiscord(details.tabId, fullUrl);
    } else if (hostname.includes("reddit.com")) {
      await scanReddit(details.tabId, fullUrl);
    }
  }
});

// ─── BLOCK TAB ───────────────────────────────────────────────────────────────

async function blockTab(tabId, blockedUrl, reason) {
  const blockPage = chrome.runtime.getURL("blocked.html")
    + "?reason=" + encodeURIComponent(reason)
    + "&url=" + encodeURIComponent(blockedUrl);

  try {
    await chrome.tabs.update(tabId, { url: blockPage });
  } catch (e) {
    console.warn("[PronoiaSafety] Could not redirect tab:", e);
  }

  logEvent({ type: "BLOCKED", url: blockedUrl, reason, timestamp: Date.now() });
  sendNotification("Inhalt geblockt", `${reason}: ${new URL(blockedUrl).hostname}`);
}

// ─── DISCORD SCANNER ─────────────────────────────────────────────────────────

async function scanDiscord(tabId, url) {
  // Check invite URLs and channel names in URL path
  const flagged = FLAGGED_DISCORD_KEYWORDS.some(kw => url.includes(kw));
  if (flagged) {
    await warnTab(tabId, url, "Discord-Kanal könnte unsichere Inhalte enthalten");
  }
}

// ─── REDDIT SCANNER ──────────────────────────────────────────────────────────

async function scanReddit(tabId, url) {
  // Extract subreddit from URL: /r/SUBREDDIT
  const match = url.match(/reddit\.com\/r\/([a-zA-Z0-9_]+)/);
  if (!match) return;

  const sub = match[1].toLowerCase();
  const flagged = FLAGGED_REDDIT_SUBS.some(s => sub.includes(s));

  if (flagged) {
    await blockTab(tabId, url, `Gesperrtes Subreddit: r/${match[1]}`);
  }
}

// ─── WARN (soft — shows overlay, doesn't block) ───────────────────────────────

async function warnTab(tabId, url, reason) {
  // Send message to content script to show warning overlay
  try {
    await chrome.tabs.sendMessage(tabId, {
      type: "PS_WARNING",
      reason,
      url
    });
  } catch (e) {
    // Content script might not be ready yet, store warning for tab
    chrome.storage.session.set({ [`pending_warn_${tabId}`]: { reason, url } });
  }

  logEvent({ type: "WARNING", url, reason, timestamp: Date.now() });
}

// ─── NOTIFICATIONS ───────────────────────────────────────────────────────────

function sendNotification(title, message) {
  chrome.notifications.create({
    type: "basic",
    iconUrl: "icons/icon48.png",
    title: `🛡️ Pronoia Safety — ${title}`,
    message,
    priority: 2
  });
}

// ─── EVENT LOG ───────────────────────────────────────────────────────────────

async function logEvent(event) {
  const res = await chrome.storage.local.get("ps_log");
  const log = res.ps_log || [];
  log.unshift(event);
  // Keep last 200 entries
  await chrome.storage.local.set({ ps_log: log.slice(0, 200) });
}

// ─── MESSAGE HANDLER (from popup/content) ────────────────────────────────────

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "PS_GET_SETTINGS") {
    sendResponse(settings);
  }

  if (msg.type === "PS_UPDATE_SETTINGS") {
    settings = { ...settings, ...msg.settings };
    chrome.storage.local.set({ ps_settings: settings });
    sendResponse({ ok: true });
  }

  if (msg.type === "PS_GET_LOG") {
    chrome.storage.local.get("ps_log", (res) => {
      sendResponse(res.ps_log || []);
    });
    return true; // async
  }

  if (msg.type === "PS_SCAN_URL") {
    const url = msg.url.toLowerCase();
    const hostname = new URL(msg.url).hostname.replace("www.", "");
    const result = {
      adultDomain: ADULT_DOMAINS.some(d => hostname.includes(d)),
      dangerKeyword: DANGER_KEYWORDS.some(kw => url.includes(kw)),
      discordFlag: url.includes("discord.com") && FLAGGED_DISCORD_KEYWORDS.some(kw => url.includes(kw)),
      redditFlag: (() => {
        const m = url.match(/reddit\.com\/r\/([a-zA-Z0-9_]+)/);
        return m ? FLAGGED_REDDIT_SUBS.some(s => m[1].toLowerCase().includes(s)) : false;
      })()
    };
    result.safe = !result.adultDomain && !result.dangerKeyword && !result.discordFlag && !result.redditFlag;
    sendResponse(result);
  }

  return true;
});
