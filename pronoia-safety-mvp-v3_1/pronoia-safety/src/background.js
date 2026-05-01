// Pronoia Safety - Background Service Worker v0.2

const SAFE_BROWSING_API_KEY = "AIzaSyD7gVWlEJDdBPNTA9Gl3Zgl0iTkvCUTGT4";
const SAFE_BROWSING_URL = `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${SAFE_BROWSING_API_KEY}`;

const ADULT_DOMAINS = [
  "pornhub.com","xvideos.com","xnxx.com","xhamster.com","redtube.com",
  "youporn.com","tube8.com","spankbang.com","eporner.com","chaturbate.com",
  "livejasmin.com","stripchat.com","onlyfans.com","fansly.com","nhentai.net",
  "rule34.xxx","e621.net","gelbooru.com","beeg.com","cam4.com","bongacams.com"
];

const DANGER_KEYWORDS = [
  "porn","xxx","nude","naked","hentai","nsfw","adult-only","18plus","erotic","sex-video","hannahjo","whoahannahjo","horny","tits","big boobs",
];

const FLAGGED_DISCORD_KEYWORDS = ["nsfw","18+","adults-only","gore","hentai","grooming"];
const FLAGGED_REDDIT_SUBS = ["gonewild","nsfw","watchpeopledie","jailbait","creepshots"];

let settings = {
  enabled: true,
  blockAdultSites: true,
  scanCommunities: true,
  useSafeBrowsing: true,
  parentEmail: "",
  passwordHash: null
};

const sbCache = new Map();

chrome.storage.local.get("ps_settings", (res) => {
  if (res.ps_settings) settings = { ...settings, ...res.ps_settings };
});

// ─── NAV LISTENER ─────────────────────────────────────────────────────────────

chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
  if (!settings.enabled || details.frameId !== 0) return;
  const url = details.url;
  if (!url.startsWith("http")) return;
  let hostname;
  try { hostname = new URL(url).hostname.replace("www.",""); } catch { return; }
  const urlLower = url.toLowerCase();

  if (settings.blockAdultSites && ADULT_DOMAINS.some(d => hostname.includes(d))) {
    return blockTab(details.tabId, url, "Geblockte Domain");
  }
  if (settings.blockAdultSites && DANGER_KEYWORDS.some(kw => urlLower.includes(kw))) {
    return blockTab(details.tabId, url, "Gefährliches URL-Muster");
  }
  if (settings.useSafeBrowsing) {
    const threat = await checkSafeBrowsing(url);
    if (threat) return blockTab(details.tabId, url, `Google Safe Browsing: ${threat}`);
  }
  if (settings.scanCommunities) {
    if (hostname.includes("discord.com")) scanDiscord(details.tabId, urlLower);
    else if (hostname.includes("reddit.com")) scanReddit(details.tabId, urlLower);
  }
});

// ─── SAFE BROWSING ────────────────────────────────────────────────────────────

async function checkSafeBrowsing(url) {
  const cached = sbCache.get(url);
  if (cached && Date.now() - cached.ts < 1800000) return cached.threat;
  try {
    const res = await fetch(SAFE_BROWSING_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client: { clientId: "pronoia-safety", clientVersion: "0.2.0" },
        threatInfo: {
          threatTypes: ["MALWARE","SOCIAL_ENGINEERING","UNWANTED_SOFTWARE","POTENTIALLY_HARMFUL_APPLICATION"],
          platformTypes: ["ANY_PLATFORM"],
          threatEntryTypes: ["URL"],
          threatEntries: [{ url }]
        }
      })
    });
    if (!res.ok) return null;
    const data = await res.json();
    const threat = data.matches?.[0]?.threatType || null;
    sbCache.set(url, { threat, ts: Date.now() });
    if (sbCache.size > 500) sbCache.delete(sbCache.keys().next().value);
    return threat;
  } catch { return null; }
}

// ─── COMMUNITY SCANNERS ───────────────────────────────────────────────────────

async function scanDiscord(tabId, url) {
  if (FLAGGED_DISCORD_KEYWORDS.some(kw => url.includes(kw)))
    warnTab(tabId, url, "Discord-Kanal könnte unsichere Inhalte enthalten");
}

async function scanReddit(tabId, url) {
  const m = url.match(/reddit\.com\/r\/([a-z0-9_]+)/);
  if (m && FLAGGED_REDDIT_SUBS.some(s => m[1].includes(s)))
    blockTab(tabId, url, `Gesperrtes Subreddit: r/${m[1]}`);
}

// ─── BLOCK / WARN ─────────────────────────────────────────────────────────────

async function blockTab(tabId, url, reason) {
  const page = chrome.runtime.getURL("blocked.html")
    + "?reason=" + encodeURIComponent(reason)
    + "&url=" + encodeURIComponent(url);
  try { await chrome.tabs.update(tabId, { url: page }); } catch {}
  const event = { type: "BLOCKED", url, reason, timestamp: Date.now() };
  logEvent(event);
  pushDashboardEvent(event);
  chrome.notifications.create({
    type:"basic", iconUrl:"icons/icon48.png",
    title:"🛡️ Pronoia Safety — Geblockt",
    message: `${reason}: ${new URL(url).hostname}`, priority:2
  });
}

async function warnTab(tabId, url, reason) {
  try { await chrome.tabs.sendMessage(tabId, { type:"PS_WARNING", reason, url }); } catch {}
  const event = { type:"WARNING", url, reason, timestamp: Date.now() };
  logEvent(event);
  pushDashboardEvent(event);
}

// ─── STORAGE HELPERS ──────────────────────────────────────────────────────────

async function logEvent(event) {
  const res = await chrome.storage.local.get("ps_log");
  const log = res.ps_log || [];
  await chrome.storage.local.set({ ps_log: [event, ...log].slice(0, 200) });
}

async function pushDashboardEvent(event) {
  const res = await chrome.storage.local.get("ps_dash");
  const events = res.ps_dash || [];
  await chrome.storage.local.set({ ps_dash: [event, ...events].slice(0, 500) });
}

// ─── PIN / PASSWORD ───────────────────────────────────────────────────────────

async function hashPin(pin) {
  const buf = await crypto.subtle.digest("SHA-256",
    new TextEncoder().encode(pin + "pronoia_salt_v2"));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,"0")).join("");
}

async function verifyPin(pin) {
  if (!settings.passwordHash) return true;
  return await hashPin(pin) === settings.passwordHash;
}

// ─── MESSAGE HANDLER ─────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
  if (msg.type === "PS_GET_SETTINGS") {
    reply({ ...settings, passwordHash: settings.passwordHash ? "SET" : null });
  }
  if (msg.type === "PS_UPDATE_SETTINGS") {
    settings = { ...settings, ...msg.settings };
    chrome.storage.local.set({ ps_settings: settings });
    reply({ ok: true });
  }
  if (msg.type === "PS_GET_LOG") {
    chrome.storage.local.get("ps_log", r => reply(r.ps_log || []));
    return true;
  }
  if (msg.type === "PS_GET_DASH") {
    chrome.storage.local.get("ps_dash", r => reply(r.ps_dash || []));
    return true;
  }
  if (msg.type === "PS_VERIFY_PIN") {
    verifyPin(msg.pin).then(reply); return true;
  }
  if (msg.type === "PS_SET_PIN") {
    if (!msg.pin || msg.pin.length < 4) { reply({ ok:false, error:"Min. 4 Zeichen" }); return; }
    hashPin(msg.pin).then(h => {
      settings.passwordHash = h;
      chrome.storage.local.set({ ps_settings: settings });
      reply({ ok: true });
    }); return true;
  }
  if (msg.type === "PS_REMOVE_PIN") {
    verifyPin(msg.pin).then(ok => {
      if (ok) { settings.passwordHash = null; chrome.storage.local.set({ ps_settings: settings }); reply({ ok:true }); }
      else reply({ ok:false, error:"Falscher PIN" });
    }); return true;
  }
  if (msg.type === "PS_SCAN_URL") {
    const u = msg.url.toLowerCase();
    let hn = ""; try { hn = new URL(msg.url).hostname.replace("www.",""); } catch {}
    const result = {
      adultDomain: ADULT_DOMAINS.some(d => hn.includes(d)),
      dangerKeyword: DANGER_KEYWORDS.some(kw => u.includes(kw)),
      discordFlag: hn.includes("discord.com") && FLAGGED_DISCORD_KEYWORDS.some(kw => u.includes(kw)),
      redditFlag: (() => { const m = u.match(/reddit\.com\/r\/([a-z0-9_]+)/); return m ? FLAGGED_REDDIT_SUBS.some(s => m[1].includes(s)) : false; })()
    };
    if (settings.useSafeBrowsing) {
      checkSafeBrowsing(msg.url).then(threat => {
        result.safeBrowsing = threat || null;
        result.safe = !result.adultDomain && !result.dangerKeyword && !result.discordFlag && !result.redditFlag && !threat;
        reply(result);
      }); return true;
    }
    result.safe = !result.adultDomain && !result.dangerKeyword && !result.discordFlag && !result.redditFlag;
    reply(result);
  }
  return true;
});
