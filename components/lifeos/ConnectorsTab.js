'use client';

/*
 * Konnektoren tab — extracted from the life-os monolith.
 * Identical behaviour to the inline `case 'connectors'` block; all state, setters
 * and handlers are threaded as props. The active-flag consts stay local.
 */

import { useState } from 'react';
import styles from '@/app/life-os/page.module.css';

// Catalog of additional connectors offered in the Konnektoren-Store. Installing
// one persists a lightweight record to profile.connectors.installed (durable via
// saveProfile) and renders it as a generic connector card in the directory.
const CONNECTOR_CATALOG = [
  { id: 'spotify', name: 'Spotify', icon: 'music_note', desc: 'Fokus-Playlists direkt im Tab abspielen.', kind: 'spotify' },
  { id: 'github', name: 'GitHub', icon: 'code', desc: 'Öffentliche Commit-Aktivität als Disziplin-Signal.', kind: 'github' },
  { id: 'oura', name: 'Oura Ring', icon: 'spa', desc: 'Schlaf, HRV & Readiness.', kind: 'token', auth: 'bearer',
    tokenLabel: 'Personal Access Token', help: 'cloud.ouraring.com → Personal Access Tokens',
    testUrl: 'https://api.ouraring.com/v2/usercollection/personal_info' },
  { id: 'toggl', name: 'Toggl Track', icon: 'timer', desc: 'Zeiterfassung & Projekte.', kind: 'token', auth: 'basic',
    tokenLabel: 'API-Token', help: 'Toggl → Profile → API Token',
    testUrl: 'https://api.track.toggl.com/api/v9/me' },
  { id: 'strava', name: 'Strava', icon: 'directions_run', desc: 'Trainings & Aktivitäten.', kind: 'oauth',
    authBase: 'https://www.strava.com/oauth/authorize', scope: 'read,activity:read', help: 'strava.com/settings/api' },
  { id: 'gcal', name: 'Google Calendar', icon: 'calendar_month', desc: 'Termine & Zeitblöcke.', kind: 'oauth',
    authBase: 'https://accounts.google.com/o/oauth2/v2/auth', scope: 'https://www.googleapis.com/auth/calendar.readonly',
    help: 'console.cloud.google.com → OAuth-Client' },
  { id: 'googlefit', name: 'Google Fit', icon: 'fitness_center', desc: 'Schritte & Workouts.', kind: 'oauth',
    authBase: 'https://accounts.google.com/o/oauth2/v2/auth', scope: 'https://www.googleapis.com/auth/fitness.activity.read',
    help: 'console.cloud.google.com → OAuth-Client' },
  { id: 'applehealth', name: 'Apple Health', icon: 'health_and_safety', desc: 'Vitaldaten aus HealthKit.', kind: 'manual' },
];
const catalogById = (id) => CONNECTOR_CATALOG.find((c) => c.id === id);

// Parse a Spotify share link / URI → { type, id, url }. Returns null if unrecognised.
function parseSpotify(input) {
  if (!input) return null;
  const s = input.trim();
  let m = s.match(/open\.spotify\.com\/(?:intl-[a-z]+\/)?(playlist|track|album|episode|show|artist)\/([A-Za-z0-9]+)/i);
  if (!m) m = s.match(/^spotify:(playlist|track|album|episode|show|artist):([A-Za-z0-9]+)$/i);
  if (!m) return null;
  const type = m[1].toLowerCase();
  const id = m[2];
  return { type, id, url: `https://open.spotify.com/${type}/${id}` };
}
function spotifyEmbed(input) {
  const p = parseSpotify(input);
  return p ? `https://open.spotify.com/embed/${p.type}/${p.id}` : null;
}
const SPOTIFY_TYPE_LABEL = { playlist: 'Playlist', track: 'Track', album: 'Album', episode: 'Episode', show: 'Podcast', artist: 'Artist' };

// Curated focus/flow playlists (stable Spotify editorial IDs) — one-click add.
const SPOTIFY_PRESETS = [
  { name: 'Deep Focus', url: 'https://open.spotify.com/playlist/37i9dQZF1DWZeKCadgRdKQ' },
  { name: 'Lo-Fi Beats', url: 'https://open.spotify.com/playlist/0vvXsWCC9xrXsKd4FyS8kM' },
  { name: 'Brain Food', url: 'https://open.spotify.com/playlist/37i9dQZF1DWXLeA8Omikj7' },
  { name: 'Peaceful Piano', url: 'https://open.spotify.com/playlist/37i9dQZF1DX4sWSpwq3LiO' },
  { name: 'Instrumental Study', url: 'https://open.spotify.com/playlist/37i9dQZF1DX9sIqqvKsjG8' },
];

// Resolve a public title + thumbnail via Spotify's CORS-enabled oEmbed (no auth).
async function spotifyOEmbed(url) {
  try {
    const res = await fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`);
    if (!res.ok) return {};
    const d = await res.json();
    return { title: d.title || '', thumb: d.thumbnail_url || '' };
  } catch {
    return {};
  }
}

export default function ConnectorsTab({
  connectorPermissions,
  setConnectorPermissions,
  expandedConnectors,
  setExpandedConnectors,
  profile,
  saveProfile,
  terminalLogs = [],
  handleWhoopSync,
  isSyncingWhoop,
  handleNotionExport,
  isExportingNotion,
}) {
  const [storeOpen, setStoreOpen] = useState(false);

  const isWhoopActive = connectorPermissions.whoop.sleep || connectorPermissions.whoop.hrv || connectorPermissions.whoop.recovery;
  const isNotionActive = connectorPermissions.notion.read || connectorPermissions.notion.write;
  const isZapierActive = connectorPermissions.zapier.webhook;
  const paypalPerms = connectorPermissions.paypal || { payments: false, transactions: false };
  const isPaypalActive = paypalPerms.payments || paypalPerms.transactions;

  // Installed (store) connectors — persisted on the profile.
  const installed = Array.isArray(profile?.connectors?.installed) ? profile.connectors.installed : [];
  const isInstalled = (id) => installed.some((c) => c.id === id);

  const installConnector = (item) => {
    if (isInstalled(item.id)) return;
    const conn = { ...(profile?.connectors || {}) };
    conn.installed = [...installed, { id: item.id, name: item.name, icon: item.icon, desc: item.desc, active: true, addedAt: new Date().toISOString() }];
    saveProfile({ connectors: conn });
  };
  const removeConnector = (id) => {
    const conn = { ...(profile?.connectors || {}) };
    conn.installed = installed.filter((c) => c.id !== id);
    saveProfile({ connectors: conn });
  };
  const toggleInstalledActive = (id) => {
    const conn = { ...(profile?.connectors || {}) };
    conn.installed = installed.map((c) => (c.id === id ? { ...c, active: !c.active } : c));
    saveProfile({ connectors: conn });
  };

  const togglePaypal = (key) => {
    setConnectorPermissions((prev) => ({
      ...prev,
      paypal: { ...(prev.paypal || { payments: false, transactions: false }), [key]: !(prev.paypal || {})[key] },
    }));
  };

  // ── Per-connector functional config (persisted under profile.connectors.config) ──
  const [detailId, setDetailId] = useState(null);
  const [draftInput, setDraftInput] = useState('');     // generic text input (spotify url / github user / token / clientId)
  const [fetchState, setFetchState] = useState({ loading: false, result: null, error: null });

  const connConfig = profile?.connectors?.config || {};
  const getConfig = (id) => connConfig[id] || {};
  const saveConnConfig = (id, patch) => {
    const conn = { ...(profile?.connectors || {}) };
    conn.config = { ...(conn.config || {}), [id]: { ...(conn.config?.[id] || {}), ...patch } };
    saveProfile({ connectors: conn });
  };

  const openDetail = (id) => {
    const cfg = getConfig(id);
    const item = catalogById(id);
    // Pre-fill the draft with whatever single value this kind stores.
    setDraftInput(cfg.url || cfg.username || cfg.token || cfg.clientId || '');
    setFetchState({ loading: false, result: null, error: null });
    setDetailId(id);
  };
  const closeDetail = () => { setDetailId(null); setDraftInput(''); setFetchState({ loading: false, result: null, error: null }); };

  const loadGithub = async () => {
    const u = draftInput.trim().replace(/^@/, '');
    if (!u) return;
    saveConnConfig(detailId, { username: u });
    setFetchState({ loading: true, result: null, error: null });
    try {
      const res = await fetch(`https://api.github.com/users/${encodeURIComponent(u)}`);
      if (!res.ok) throw new Error(res.status === 404 ? 'Nutzer nicht gefunden.' : `GitHub ${res.status}`);
      const d = await res.json();
      setFetchState({ loading: false, error: null, result: {
        name: d.name || d.login,
        repos: d.public_repos,
        followers: d.followers,
        following: d.following,
        avatar: d.avatar_url,
        url: d.html_url,
      } });
    } catch (err) {
      setFetchState({ loading: false, result: null, error: err.message });
    }
  };

  const testToken = async (item) => {
    const token = draftInput.trim();
    if (!token) return;
    saveConnConfig(item.id, { token });
    setFetchState({ loading: true, result: null, error: null });
    try {
      const res = await fetch('/api/connectors/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: item.testUrl, token, auth: item.auth }),
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error || `Fehler ${res.status}`);
      setFetchState({ loading: false, error: null, result: json.data });
    } catch (err) {
      setFetchState({ loading: false, result: null, error: err.message });
    }
  };

  const startOAuth = (item) => {
    const clientId = draftInput.trim();
    if (!clientId) return;
    saveConnConfig(item.id, { clientId });
    const redirectUri = typeof window !== 'undefined' ? `${window.location.origin}/api/connectors/oauth/callback` : '';
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: item.scope || '',
    });
    if (typeof window !== 'undefined') window.open(`${item.authBase}?${params.toString()}`, '_blank', 'noopener');
  };

  // ── Spotify playlist library ──
  // Normalise config (migrate the legacy single `url` into the items list).
  const spotifyCfg = getConfig('spotify');
  const spotifyItems = Array.isArray(spotifyCfg.items)
    ? spotifyCfg.items
    : (spotifyCfg.url ? [{ url: spotifyCfg.url, type: parseSpotify(spotifyCfg.url)?.type || 'playlist' }] : []);
  const spotifyActive = spotifyCfg.activeUrl || spotifyItems[0]?.url || '';

  const addSpotify = async (rawUrl) => {
    const parsed = parseSpotify(rawUrl);
    if (!parsed) return false;
    if (spotifyItems.some((it) => it.url === parsed.url)) {
      saveConnConfig('spotify', { items: spotifyItems, activeUrl: parsed.url });
      return true;
    }
    const meta = await spotifyOEmbed(parsed.url);
    const item = { url: parsed.url, type: parsed.type, title: meta.title || '', thumb: meta.thumb || '' };
    saveConnConfig('spotify', { items: [...spotifyItems, item], activeUrl: parsed.url });
    return true;
  };
  const removeSpotify = (url) => {
    const items = spotifyItems.filter((it) => it.url !== url);
    saveConnConfig('spotify', { items, activeUrl: spotifyActive === url ? (items[0]?.url || '') : spotifyActive });
  };
  const setSpotifyActive = (url) => saveConnConfig('spotify', { items: spotifyItems, activeUrl: url });

  return (
    <div className={styles.tabContentGrid}>
      <div className={styles.tabContentMainCol}>
        <div className={styles.panelHeader} style={{ marginBottom: '1.5rem' }}>
          <h3 className={styles.panelTitle}>🔌 Konnektoren-Verzeichnis</h3>
        </div>
        <div className={styles.connectorsGrid}>
          {/* WHOOP Card */}
          <div className={`p-6 flex flex-col justify-between group transition-all duration-500 hover:bg-white/[0.06] rounded-2xl border bg-white/[0.03] backdrop-blur-md relative overflow-hidden ${isWhoopActive ? 'border-white/[0.08] shadow-[0_0_20px_rgba(16,185,129,0.1)]' : 'border-white/[0.08] shadow-[0_0_20px_rgba(245,158,11,0.1)]'}`}>
            <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none ${isWhoopActive ? 'bg-status-activeGlow' : 'bg-status-disconnectedGlow'}`}></div>
            <div>
              <div className="flex justify-between items-start mb-6 relative z-10">
                <div className="w-12 h-12 rounded-lg bg-black/40 flex items-center justify-center border border-white/5 shadow-inner">
                  <span className={`material-symbols-outlined text-2xl ${isWhoopActive ? 'text-status-active animate-pulse' : 'text-status-disconnected'}`}>favorite</span>
                </div>
                <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${isWhoopActive ? 'bg-status-active/10 border-status-active/20' : 'bg-status-disconnected/10 border-status-disconnected/20'}`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${isWhoopActive ? 'bg-status-active animate-pulse' : 'bg-status-disconnected'}`}></div>
                  <span className={`font-label text-[0.6rem] uppercase tracking-wider ${isWhoopActive ? 'text-status-active' : 'text-status-disconnected'}`}>
                    {isWhoopActive ? 'Active' : 'Disconnected'}
                  </span>
                </div>
              </div>
              <h3 className="font-headline text-xl text-text-primary mb-2">WHOOP</h3>
              <p className="font-body text-sm text-text-secondary opacity-70 leading-relaxed">Biometric data synchronization.</p>
            </div>
            <div className="mt-8 border-t border-white/5 pt-4">
              <button
                aria-expanded={expandedConnectors.whoop}
                className="flex items-center justify-between w-full text-left text-sm font-label tracking-wide text-[#1A6AFF] hover:text-white transition-colors duration-300"
                onClick={() => setExpandedConnectors(prev => ({ ...prev, whoop: !prev.whoop }))}
              >
                <span>PERMISSIONS</span>
                <span
                  className="material-symbols-outlined text-[18px] transform transition-transform duration-300"
                  style={{ transform: expandedConnectors.whoop ? 'rotate(180deg)' : 'rotate(0deg)' }}
                >
                  expand_more
                </span>
              </button>
              <div className={`${styles.connectorAccordionContent} ${expandedConnectors.whoop ? styles.connectorAccordionContentExpanded : ''}`}>
                <div className="space-y-4 pt-2">
                  {[
                    { key: 'sleep', label: 'Read Sleep Metrics' },
                    { key: 'hrv', label: 'Read HRV Trends' },
                    { key: 'recovery', label: 'Sync daily recovery score' }
                  ].map(perm => (
                    <div key={perm.key} className="flex items-center justify-between">
                      <span className="font-body text-xs text-text-secondary opacity-80">{perm.label}</span>
                      <label className={styles.customToggle}>
                        <input
                          type="checkbox"
                          className={styles.customToggleInput}
                          checked={connectorPermissions.whoop[perm.key]}
                          onChange={() => {
                            setConnectorPermissions(prev => ({
                              ...prev,
                              whoop: { ...prev.whoop, [perm.key]: !prev.whoop[perm.key] }
                            }));
                          }}
                        />
                        <span className={styles.customToggleSlider}></span>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Notion Card */}
          <div className={`p-6 flex flex-col justify-between group transition-all duration-500 hover:bg-white/[0.06] rounded-2xl border bg-white/[0.03] backdrop-blur-md relative overflow-hidden ${isNotionActive ? 'border-white/[0.08] shadow-[0_0_20px_rgba(16,185,129,0.1)]' : 'border-white/[0.08] shadow-[0_0_20px_rgba(245,158,11,0.1)]'}`}>
            <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none ${isNotionActive ? 'bg-status-activeGlow' : 'bg-status-disconnectedGlow'}`}></div>
            <div>
              <div className="flex justify-between items-start mb-6 relative z-10">
                <div className="w-12 h-12 rounded-lg bg-black/40 flex items-center justify-center border border-white/5 shadow-inner">
                  <span className={`material-symbols-outlined text-2xl ${isNotionActive ? 'text-status-active' : 'text-status-disconnected'}`}>book</span>
                </div>
                <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${isNotionActive ? 'bg-status-active/10 border-status-active/20' : 'bg-status-disconnected/10 border-status-disconnected/20'}`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${isNotionActive ? 'bg-status-active animate-pulse' : 'bg-status-disconnected'}`}></div>
                  <span className={`font-label text-[0.6rem] uppercase tracking-wider ${isNotionActive ? 'text-status-active' : 'text-status-disconnected'}`}>
                    {isNotionActive ? 'Active' : 'Disconnected'}
                  </span>
                </div>
              </div>
              <h3 className="font-headline text-xl text-text-primary mb-2">Notion</h3>
              <p className="font-body text-sm text-text-secondary opacity-70 leading-relaxed">Knowledge base and ritual logging.</p>
            </div>
            <div className="mt-8 border-t border-white/5 pt-4">
              <button
                aria-expanded={expandedConnectors.notion}
                className="flex items-center justify-between w-full text-left text-sm font-label tracking-wide text-[#1A6AFF] hover:text-white transition-colors duration-300"
                onClick={() => setExpandedConnectors(prev => ({ ...prev, notion: !prev.notion }))}
              >
                <span>PERMISSIONS</span>
                <span
                  className="material-symbols-outlined text-[18px] transform transition-transform duration-300"
                  style={{ transform: expandedConnectors.notion ? 'rotate(180deg)' : 'rotate(0deg)' }}
                >
                  expand_more
                </span>
              </button>
              <div className={`${styles.connectorAccordionContent} ${expandedConnectors.notion ? styles.connectorAccordionContentExpanded : ''}`}>
                <div className="space-y-4 pt-2">
                  {[
                    { key: 'read', label: 'Read Pages' },
                    { key: 'write', label: 'Write to Database' }
                  ].map(perm => (
                    <div key={perm.key} className="flex items-center justify-between">
                      <span className="font-body text-xs text-text-secondary opacity-80">{perm.label}</span>
                      <label className={styles.customToggle}>
                        <input
                          type="checkbox"
                          className={styles.customToggleInput}
                          checked={connectorPermissions.notion[perm.key]}
                          onChange={() => {
                            setConnectorPermissions(prev => ({
                              ...prev,
                              notion: { ...prev.notion, [perm.key]: !prev.notion[perm.key] }
                            }));
                          }}
                        />
                        <span className={styles.customToggleSlider}></span>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* PayPal Card */}
          <div className={`p-6 flex flex-col justify-between group transition-all duration-500 hover:bg-white/[0.06] rounded-2xl border bg-white/[0.03] backdrop-blur-md relative overflow-hidden ${isPaypalActive ? 'border-white/[0.08] shadow-[0_0_20px_rgba(16,185,129,0.1)]' : 'border-white/[0.08] shadow-[0_0_20px_rgba(245,158,11,0.1)]'}`}>
            <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none ${isPaypalActive ? 'bg-status-activeGlow' : 'bg-status-disconnectedGlow'}`}></div>
            <div>
              <div className="flex justify-between items-start mb-6 relative z-10">
                <div className="w-12 h-12 rounded-lg bg-black/40 flex items-center justify-center border border-white/5 shadow-inner">
                  <span className={`material-symbols-outlined text-2xl ${isPaypalActive ? 'text-status-active animate-pulse' : 'text-status-disconnected'}`}>payments</span>
                </div>
                <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${isPaypalActive ? 'bg-status-active/10 border-status-active/20' : 'bg-status-disconnected/10 border-status-disconnected/20'}`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${isPaypalActive ? 'bg-status-active animate-pulse' : 'bg-status-disconnected'}`}></div>
                  <span className={`font-label text-[0.6rem] uppercase tracking-wider ${isPaypalActive ? 'text-status-active' : 'text-status-disconnected'}`}>
                    {isPaypalActive ? 'Active' : 'Disconnected'}
                  </span>
                </div>
              </div>
              <h3 className="font-headline text-xl text-text-primary mb-2">PayPal</h3>
              <p className="font-body text-sm text-text-secondary opacity-70 leading-relaxed">Payment processing for Ecosystem.</p>
            </div>
            <div className="mt-8 border-t border-white/5 pt-4">
              <button
                aria-expanded={expandedConnectors.paypal}
                className="flex items-center justify-between w-full text-left text-sm font-label tracking-wide text-[#1A6AFF] hover:text-white transition-colors duration-300"
                onClick={() => setExpandedConnectors(prev => ({ ...prev, paypal: !prev.paypal }))}
              >
                <span>PERMISSIONS</span>
                <span
                  className="material-symbols-outlined text-[18px] transform transition-transform duration-300"
                  style={{ transform: expandedConnectors.paypal ? 'rotate(180deg)' : 'rotate(0deg)' }}
                >
                  expand_more
                </span>
              </button>
              <div className={`${styles.connectorAccordionContent} ${expandedConnectors.paypal ? styles.connectorAccordionContentExpanded : ''}`}>
                <div className="space-y-4 pt-2">
                  {[
                    { key: 'payments', label: 'Zahlungen für Ecosystem' },
                    { key: 'transactions', label: 'Read Transaction History' }
                  ].map(perm => (
                    <div key={perm.key} className="flex items-center justify-between">
                      <span className="font-body text-xs text-text-secondary opacity-80">{perm.label}</span>
                      <label className={styles.customToggle}>
                        <input
                          type="checkbox"
                          className={styles.customToggleInput}
                          checked={!!paypalPerms[perm.key]}
                          onChange={() => togglePaypal(perm.key)}
                        />
                        <span className={styles.customToggleSlider}></span>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Zapier Card */}
          <div className={`p-6 flex flex-col justify-between group transition-all duration-500 hover:bg-white/[0.06] rounded-2xl border bg-white/[0.03] backdrop-blur-md relative overflow-hidden ${isZapierActive ? 'border-white/[0.08] shadow-[0_0_20px_rgba(16,185,129,0.1)]' : 'border-white/[0.08] shadow-[0_0_20px_rgba(245,158,11,0.1)]'}`}>
            <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none ${isZapierActive ? 'bg-status-activeGlow' : 'bg-status-disconnectedGlow'}`}></div>
            <div>
              <div className="flex justify-between items-start mb-6 relative z-10">
                <div className="w-12 h-12 rounded-lg bg-black/40 flex items-center justify-center border border-white/5 shadow-inner">
                  <span className={`material-symbols-outlined text-2xl ${isZapierActive ? 'text-status-active' : 'text-status-disconnected'}`}>bolt</span>
                </div>
                <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${isZapierActive ? 'bg-status-active/10 border-status-active/20' : 'bg-status-disconnected/10 border-status-disconnected/20'}`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${isZapierActive ? 'bg-status-active animate-pulse' : 'bg-status-disconnected'}`}></div>
                  <span className={`font-label text-[0.6rem] uppercase tracking-wider ${isZapierActive ? 'text-status-active' : 'text-status-disconnected'}`}>
                    {isZapierActive ? 'Active' : 'Disconnected'}
                  </span>
                </div>
              </div>
              <h3 className="font-headline text-xl text-text-primary mb-2">Zapier</h3>
              <p className="font-body text-sm text-text-secondary opacity-70 leading-relaxed">Automated workflow orchestration.</p>
            </div>
            <div className="mt-8 border-t border-white/5 pt-4">
              <button
                aria-expanded={expandedConnectors.zapier}
                className="flex items-center justify-between w-full text-left text-sm font-label tracking-wide text-[#1A6AFF] hover:text-white transition-colors duration-300"
                onClick={() => setExpandedConnectors(prev => ({ ...prev, zapier: !prev.zapier }))}
              >
                <span>PERMISSIONS</span>
                <span
                  className="material-symbols-outlined text-[18px] transform transition-transform duration-300"
                  style={{ transform: expandedConnectors.zapier ? 'rotate(180deg)' : 'rotate(0deg)' }}
                >
                  expand_more
                </span>
              </button>
              <div className={`${styles.connectorAccordionContent} ${expandedConnectors.zapier ? styles.connectorAccordionContentExpanded : ''}`}>
                <div className="space-y-4 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="font-body text-xs text-text-secondary opacity-80">Trigger Webhooks</span>
                    <label className={styles.customToggle}>
                      <input
                        type="checkbox"
                        className={styles.customToggleInput}
                        checked={connectorPermissions.zapier.webhook}
                        onChange={() => {
                          setConnectorPermissions(prev => ({
                            ...prev,
                            zapier: { ...prev.zapier, webhook: !prev.zapier.webhook }
                          }));
                        }}
                      />
                      <span className={styles.customToggleSlider}></span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Installed (store) connectors */}
          {installed.map((c) => (
            <div key={c.id} className={`p-6 flex flex-col justify-between transition-all duration-500 hover:bg-white/[0.06] rounded-2xl border bg-white/[0.03] backdrop-blur-md relative overflow-hidden ${c.active ? 'border-white/[0.08] shadow-[0_0_20px_rgba(16,185,129,0.1)]' : 'border-white/[0.08] shadow-[0_0_20px_rgba(245,158,11,0.1)]'}`}>
              <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none ${c.active ? 'bg-status-activeGlow' : 'bg-status-disconnectedGlow'}`}></div>
              <div>
                <div className="flex justify-between items-start mb-6 relative z-10">
                  <div className="w-12 h-12 rounded-lg bg-black/40 flex items-center justify-center border border-white/5 shadow-inner">
                    <span className={`material-symbols-outlined text-2xl ${c.active ? 'text-status-active' : 'text-status-disconnected'}`}>{c.icon || 'extension'}</span>
                  </div>
                  <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${c.active ? 'bg-status-active/10 border-status-active/20' : 'bg-status-disconnected/10 border-status-disconnected/20'}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${c.active ? 'bg-status-active animate-pulse' : 'bg-status-disconnected'}`}></div>
                    <span className={`font-label text-[0.6rem] uppercase tracking-wider ${c.active ? 'text-status-active' : 'text-status-disconnected'}`}>
                      {c.active ? 'Active' : 'Paused'}
                    </span>
                  </div>
                </div>
                <h3 className="font-headline text-xl text-text-primary mb-2">{c.name}</h3>
                <p className="font-body text-sm text-text-secondary opacity-70 leading-relaxed">{c.desc}</p>
              </div>
              <div className="mt-8 border-t border-white/5 pt-4 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <label className={styles.customToggle}>
                    <input
                      type="checkbox"
                      className={styles.customToggleInput}
                      checked={!!c.active}
                      onChange={() => toggleInstalledActive(c.id)}
                    />
                    <span className={styles.customToggleSlider}></span>
                  </label>
                  <span className="font-body text-xs text-text-secondary opacity-70">{c.active ? 'Aktiv' : 'Pausiert'}</span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    className="text-xs font-label tracking-wide text-[#1A6AFF] hover:text-white transition-colors duration-300 flex items-center gap-1"
                    onClick={() => openDetail(c.id)}
                  >
                    <span className="material-symbols-outlined text-[16px]">tune</span> Öffnen
                  </button>
                  <button
                    type="button"
                    className="text-xs font-label tracking-wide text-text-secondary/60 hover:text-status-disconnected transition-colors duration-300 flex items-center gap-1"
                    onClick={() => removeConnector(c.id)}
                  >
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                  </button>
                </div>
              </div>
            </div>
          ))}

          {/* Add Connector Button → opens the Konnektoren-Store */}
          <div
            className="p-6 flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-white/[0.01] hover:bg-white/[0.03] hover:border-white/30 cursor-pointer min-h-[250px] transition-all duration-300"
            onClick={() => setStoreOpen(true)}
          >
            <div className="w-12 h-12 rounded-full bg-[#1A6AFF]/10 flex items-center justify-center text-[#1A6AFF] mb-4 hover:scale-110 transition-transform duration-300">
              <span className="material-symbols-outlined text-2xl">add</span>
            </div>
            <h3 className="font-headline text-lg text-text-primary mb-1">Konnektor hinzufügen</h3>
            <p className="font-body text-xs text-text-secondary opacity-50 text-center max-w-[200px]">Durchsuche das Verzeichnis nach neuen Datenquellen.</p>
          </div>
        </div>
      </div>

      <div className={styles.tabContentSideCol}>
        <div className={styles.panelHeader} style={{ marginBottom: '1.25rem' }}>
          <h3 className={styles.panelTitle}>⚙️ Konfigurationen</h3>
        </div>
        <div className={styles.panelBody} style={{ padding: 0 }}>
          <div className={styles.stackedForm}>
            <label className={styles.formLabel}>WHOOP Client-ID</label>
            <input
              type="text"
              className={styles.formInput}
              placeholder="whoop_client_xxxx"
              value={profile?.connectors?.whoopClientId || ''}
              onChange={e => {
                const conn = { ...(profile?.connectors || {}), whoopClientId: e.target.value };
                saveProfile({ connectors: conn });
              }}
            />
            <label className={styles.formLabel} style={{ marginTop: '1.25rem', display: 'block' }}>Notion-Integrations-Token</label>
            <input
              type="password"
              className={styles.formInput}
              placeholder="secret_notion_xxxx"
              value={profile?.connectors?.notionToken || ''}
              onChange={e => {
                const conn = { ...(profile?.connectors || {}), notionToken: e.target.value };
                saveProfile({ connectors: conn });
              }}
            />
            <label className={styles.formLabel} style={{ marginTop: '1.25rem', display: 'block' }}>Notion-Datenbank-ID (Ziel für Protokoll-Export)</label>
            <input
              type="text"
              className={styles.formInput}
              placeholder="z.B. 1a2b3c4d5e6f..."
              value={profile?.connectors?.notionDatabaseId || ''}
              onChange={e => {
                const conn = { ...(profile?.connectors || {}), notionDatabaseId: e.target.value };
                saveProfile({ connectors: conn });
              }}
            />
            <label className={styles.formLabel} style={{ marginTop: '1.25rem', display: 'block' }}>Zapier-Webhook-URL</label>
            <input
              type="text"
              className={styles.formInput}
              placeholder="https://hooks.zapier.com/hooks/catch/..."
              value={profile?.connectors?.zapierWebhookUrl || ''}
              onChange={e => {
                const conn = { ...(profile?.connectors || {}), zapierWebhookUrl: e.target.value };
                saveProfile({ connectors: conn });
              }}
            />
            <label className={styles.formLabel} style={{ marginTop: '1.25rem', display: 'block' }}>PayPal-Konto (E-Mail / Merchant-ID)</label>
            <input
              type="text"
              className={styles.formInput}
              placeholder="z.B. dein@paypal.com"
              value={profile?.connectors?.paypalAccount || ''}
              onChange={e => {
                const conn = { ...(profile?.connectors || {}), paypalAccount: e.target.value };
                saveProfile({ connectors: conn });
              }}
            />
          </div>
        </div>

        {/* Divider Line */}
        <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', margin: '1.5rem 0' }}></div>

        <div className={styles.panelHeader} style={{ marginBottom: '1.25rem' }}>
          <h3 className={styles.panelTitle}>📟 API-Terminal-Konsole</h3>
        </div>
        <div className={styles.panelBody} style={{ padding: 0 }}>
          <div className={styles.terminalCard}>
            {terminalLogs.map((log, i) => (
              <div key={i} className={styles.terminalRow}>{log}</div>
            ))}
          </div>
          <div className={styles.terminalActions}>
            <button
              type="button"
              className={`${styles.terminalBtn} ${styles.terminalBtnGreen}`}
              onClick={handleWhoopSync}
              disabled={isSyncingWhoop}
            >
              {isSyncingWhoop ? 'Synchronisiere...' : '🔄 WHOOP synchronisieren'}
            </button>
            <button
              type="button"
              className={styles.terminalBtn}
              onClick={handleNotionExport}
              disabled={isExportingNotion}
            >
              {isExportingNotion ? 'Exportiere...' : '📝 Notion exportieren'}
            </button>
          </div>
        </div>
      </div>

      {/* Konnektoren-Store modal */}
      {storeOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          style={{ background: 'rgba(3,4,8,0.72)', backdropFilter: 'blur(6px)' }}
          onClick={() => setStoreOpen(false)}
        >
          <div
            className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl border border-white/10 bg-[#0c0e16]/95 backdrop-blur-md p-7 shadow-[0_30px_80px_rgba(0,0,0,0.6)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-6">
              <div>
                <h3 className="font-headline text-2xl text-text-primary">Konnektoren-Store</h3>
                <p className="font-body text-sm text-text-secondary opacity-60 mt-1">Verbinde weitere Datenquellen mit deinem Life OS.</p>
              </div>
              <button
                type="button"
                className="w-9 h-9 rounded-full border border-white/10 flex items-center justify-center text-text-secondary hover:text-white hover:border-white/30 transition-colors"
                onClick={() => setStoreOpen(false)}
                aria-label="Schließen"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {CONNECTOR_CATALOG.map((item) => {
                const added = isInstalled(item.id);
                return (
                  <div key={item.id} className="flex items-center gap-3 p-4 rounded-xl border border-white/[0.06] bg-white/[0.02]">
                    <div className="w-10 h-10 rounded-lg bg-black/40 flex items-center justify-center border border-white/5 shrink-0">
                      <span className="material-symbols-outlined text-[20px] text-[#1A6AFF]">{item.icon}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-headline text-sm text-text-primary truncate">{item.name}</div>
                      <div className="font-body text-[0.7rem] text-text-secondary opacity-60 leading-snug">{item.desc}</div>
                    </div>
                    <button
                      type="button"
                      disabled={added}
                      onClick={() => installConnector(item)}
                      className="shrink-0 font-label text-[0.6rem] uppercase tracking-wider px-3 py-1.5 rounded-full border transition-colors duration-300"
                      style={added
                        ? { color: 'var(--green, #34d399)', borderColor: 'rgba(52,211,153,0.3)', background: 'rgba(52,211,153,0.08)', cursor: 'default' }
                        : { color: '#1A6AFF', borderColor: 'rgba(26,106,255,0.3)', background: 'rgba(26,106,255,0.08)' }}
                    >
                      {added ? '✓ Installiert' : '+ Hinzufügen'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Connector detail / configuration panel */}
      {detailId && (() => {
        const item = catalogById(detailId);
        if (!item) return null;
        const cfg = getConfig(detailId);
        const embed = item.kind === 'spotify' ? spotifyEmbed(spotifyActive) : null;
        return (
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center p-4"
            style={{ background: 'rgba(3,4,8,0.72)', backdropFilter: 'blur(6px)' }}
            onClick={closeDetail}
          >
            <div
              className="w-full max-w-xl max-h-[88vh] overflow-y-auto rounded-2xl border border-white/10 bg-[#0c0e16]/95 backdrop-blur-md p-7 shadow-[0_30px_80px_rgba(0,0,0,0.6)]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-black/40 flex items-center justify-center border border-white/5">
                    <span className="material-symbols-outlined text-[20px] text-[#1A6AFF]">{item.icon}</span>
                  </div>
                  <div>
                    <h3 className="font-headline text-xl text-text-primary">{item.name}</h3>
                    <p className="font-body text-xs text-text-secondary opacity-60">{item.desc}</p>
                  </div>
                </div>
                <button type="button" className="w-9 h-9 rounded-full border border-white/10 flex items-center justify-center text-text-secondary hover:text-white hover:border-white/30 transition-colors" onClick={closeDetail} aria-label="Schließen">
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>

              {/* SPOTIFY — playlist library + embedded player */}
              {item.kind === 'spotify' && (
                <div className="space-y-4">
                  {/* Player for the active item */}
                  {embed ? (
                    <iframe
                      title="Spotify"
                      src={embed}
                      width="100%"
                      height="352"
                      frameBorder="0"
                      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                      loading="lazy"
                      style={{ borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}
                    />
                  ) : (
                    <p className="font-body text-xs text-text-secondary opacity-60">Füge eine Playlist hinzu oder wähle ein Fokus-Preset, um den Player hier abzuspielen.</p>
                  )}

                  {/* Add a link */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      className={styles.formInput}
                      style={{ flex: 1 }}
                      placeholder="Spotify-Link einfügen (Playlist, Album, Track)…"
                      value={draftInput}
                      onChange={(e) => setDraftInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { addSpotify(draftInput); setDraftInput(''); } }}
                    />
                    <button type="button" className={`${styles.terminalBtn} ${styles.terminalBtnGreen}`} onClick={() => { addSpotify(draftInput); setDraftInput(''); }}>+ Hinzufügen</button>
                  </div>
                  {draftInput.trim() && !parseSpotify(draftInput) && (
                    <p className="font-body text-xs text-status-disconnected">Link nicht erkannt — nutze einen open.spotify.com-Link oder eine spotify:-URI.</p>
                  )}

                  {/* Saved library */}
                  {spotifyItems.length > 0 && (
                    <div className="space-y-2">
                      <div className="font-label text-[0.6rem] uppercase tracking-wider text-text-secondary opacity-50">Deine Bibliothek</div>
                      {spotifyItems.map((it) => {
                        const isActive = it.url === spotifyActive;
                        return (
                          <div key={it.url} className={`flex items-center gap-3 p-2.5 rounded-xl border transition-colors ${isActive ? 'border-[#1DB954]/40 bg-[#1DB954]/[0.06]' : 'border-white/[0.06] bg-white/[0.02]'}`}>
                            {it.thumb
                              ? <img src={it.thumb} alt="" className="w-9 h-9 rounded object-cover shrink-0" />
                              : <div className="w-9 h-9 rounded bg-black/40 flex items-center justify-center shrink-0"><span className="material-symbols-outlined text-[18px] text-[#1DB954]">music_note</span></div>}
                            <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setSpotifyActive(it.url)}>
                              <div className="font-body text-sm text-text-primary truncate">{it.title || `${SPOTIFY_TYPE_LABEL[it.type] || 'Spotify'}`}</div>
                              <div className="font-mono text-[0.6rem] text-text-secondary opacity-50">{SPOTIFY_TYPE_LABEL[it.type] || 'Spotify'}{isActive ? ' · spielt' : ''}</div>
                            </button>
                            <button type="button" className="shrink-0 text-text-secondary/50 hover:text-status-disconnected transition-colors" onClick={() => removeSpotify(it.url)} aria-label="Entfernen">
                              <span className="material-symbols-outlined text-[18px]">close</span>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Curated focus presets */}
                  <div className="space-y-2 pt-1">
                    <div className="font-label text-[0.6rem] uppercase tracking-wider text-text-secondary opacity-50">Fokus-Presets</div>
                    <div className="flex flex-wrap gap-2">
                      {SPOTIFY_PRESETS.map((p) => {
                        const added = spotifyItems.some((it) => it.url === p.url);
                        return (
                          <button
                            key={p.url}
                            type="button"
                            onClick={() => addSpotify(p.url)}
                            className="font-label text-[0.6rem] uppercase tracking-wider px-3 py-1.5 rounded-full border transition-colors"
                            style={added
                              ? { color: '#1DB954', borderColor: 'rgba(29,185,84,0.4)', background: 'rgba(29,185,84,0.08)' }
                              : { color: 'var(--text-secondary, #aeb6c2)', borderColor: 'rgba(255,255,255,0.12)' }}
                          >
                            {added ? '✓ ' : '+ '}{p.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* GITHUB — public API, no auth */}
              {item.kind === 'github' && (
                <div className="space-y-4">
                  <label className="font-label text-xs text-text-secondary block">GitHub-Username</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      className={styles.formInput}
                      style={{ flex: 1 }}
                      placeholder="z.B. torvalds"
                      value={draftInput}
                      onChange={(e) => setDraftInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') loadGithub(); }}
                    />
                    <button type="button" className={styles.terminalBtn} onClick={loadGithub} disabled={fetchState.loading}>
                      {fetchState.loading ? 'Lädt…' : 'Laden'}
                    </button>
                  </div>
                  {fetchState.error && <p className="font-body text-xs text-status-disconnected">{fetchState.error}</p>}
                  {fetchState.result && (
                    <div className="flex items-center gap-4 p-4 rounded-xl border border-white/[0.06] bg-white/[0.02]">
                      {fetchState.result.avatar && <img src={fetchState.result.avatar} alt="" className="w-12 h-12 rounded-full border border-white/10" />}
                      <div className="text-sm">
                        <div className="font-headline text-text-primary">{fetchState.result.name}</div>
                        <div className="font-mono text-xs text-text-secondary opacity-70 mt-1">
                          {fetchState.result.repos} Repos · {fetchState.result.followers} Follower · {fetchState.result.following} Following
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TOKEN — Oura / Toggl via server proxy */}
              {item.kind === 'token' && (
                <div className="space-y-4">
                  <label className="font-label text-xs text-text-secondary block">{item.tokenLabel}</label>
                  <input
                    type="password"
                    className={styles.formInput}
                    placeholder="Token einfügen…"
                    value={draftInput}
                    onChange={(e) => setDraftInput(e.target.value)}
                  />
                  <p className="font-body text-[0.7rem] text-text-secondary opacity-50">Token-Quelle: {item.help}. Dein Token wird in deinem Profil gespeichert und nur serverseitig zum Abruf verwendet.</p>
                  <button type="button" className={`${styles.terminalBtn} ${styles.terminalBtnGreen}`} onClick={() => testToken(item)} disabled={fetchState.loading}>
                    {fetchState.loading ? 'Verbinde…' : 'Verbinden & testen'}
                  </button>
                  {fetchState.error && <p className="font-body text-xs text-status-disconnected">Fehler: {fetchState.error}</p>}
                  {fetchState.result && (
                    <div className="p-4 rounded-xl border border-status-active/20 bg-status-active/5">
                      <p className="font-label text-xs text-status-active mb-2">✓ Verbunden — Live-Daten empfangen</p>
                      <pre className="font-mono text-[0.65rem] text-text-secondary opacity-70 overflow-x-auto max-h-32">{JSON.stringify(fetchState.result, null, 2).slice(0, 600)}</pre>
                    </div>
                  )}
                </div>
              )}

              {/* OAUTH — Strava / Google: user supplies their own client */}
              {item.kind === 'oauth' && (
                <div className="space-y-4">
                  <label className="font-label text-xs text-text-secondary block">OAuth Client-ID</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    placeholder="deine Client-ID…"
                    value={draftInput}
                    onChange={(e) => setDraftInput(e.target.value)}
                  />
                  <p className="font-body text-[0.7rem] text-text-secondary opacity-50">App registrieren: {item.help}. Als Redirect-URI eintragen:</p>
                  <code className="block font-mono text-[0.65rem] text-[#1A6AFF] bg-black/30 rounded-lg px-3 py-2 break-all">
                    {typeof window !== 'undefined' ? `${window.location.origin}/api/connectors/oauth/callback` : '/api/connectors/oauth/callback'}
                  </code>
                  <button type="button" className={styles.terminalBtn} onClick={() => startOAuth(item)}>Autorisieren →</button>
                  <p className="font-body text-[0.7rem] text-status-disconnected opacity-80">Hinweis: Der finale Token-Austausch (Callback-Route je Anbieter) ist noch einzurichten — die Autorisierung startet bereits mit deiner Client-ID.</p>
                </div>
              )}

              {/* MANUAL — Apple Health */}
              {item.kind === 'manual' && (
                <div className="space-y-3">
                  <p className="font-body text-sm text-text-secondary opacity-80">Apple Health bietet keine Web-API. Daten lassen sich nur direkt auf dem iPhone exportieren.</p>
                  <p className="font-body text-xs text-text-secondary opacity-50">Workaround: Health-App → Profil → „Alle Gesundheitsdaten exportieren" → die Werte manuell im Biometrie-Tab eintragen. Eine native iOS-Bridge wäre der nächste Schritt.</p>
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
