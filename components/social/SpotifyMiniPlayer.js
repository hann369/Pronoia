'use client';

/*
 * SpotifyMiniPlayer — global, tab-persistent Spotify player.
 *
 * Mounted once at the Life-OS page level (next to FloatingChat), so the embedded
 * iframe is never unmounted on tab switches → playback continues app-wide. Sits
 * bottom-right, just left of the chat bubble. Three nested sizes:
 *   'icon'  → round music button (resting state)
 *   'mini'  → compact 80px player  (click the icon)
 *   'full'  → 352px player + library quick-switch (click the mini player)
 * The iframe stays mounted across all three (hidden but alive when iconised) so
 * audio never stops. × stops/hides it. Active playlist comes from
 * profile.connectors.config.spotify (set in the Konnektoren tab).
 */

import { useState } from 'react';

const GREEN = '#1DB954';

function parseSpotify(input) {
  if (!input) return null;
  const s = String(input).trim();
  let m = s.match(/open\.spotify\.com\/(?:intl-[a-z]+\/)?(playlist|track|album|episode|show|artist)\/([A-Za-z0-9]+)/i);
  if (!m) m = s.match(/^spotify:(playlist|track|album|episode|show|artist):([A-Za-z0-9]+)$/i);
  if (!m) return null;
  return { type: m[1].toLowerCase(), id: m[2] };
}
function embedFromUrl(url) {
  const p = parseSpotify(url);
  return p ? `https://open.spotify.com/embed/${p.type}/${p.id}?utm_source=pronoia` : null;
}

const MusicIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M9 18V5l12-2v13" />
    <circle cx="6" cy="18" r="3" />
    <circle cx="18" cy="16" r="3" />
  </svg>
);

export default function SpotifyMiniPlayer({ profile, saveProfile }) {
  const [view, setView] = useState('icon'); // 'icon' | 'mini' | 'full'
  const [started, setStarted] = useState(false); // has the player been opened (iframe alive)?

  const installed = Array.isArray(profile?.connectors?.installed) ? profile.connectors.installed : [];
  const spotifyInstalled = installed.some((c) => c.id === 'spotify');
  const cfg = profile?.connectors?.config?.spotify || {};
  const items = Array.isArray(cfg.items) ? cfg.items : [];
  const activeUrl = cfg.activeUrl || items[0]?.url || '';
  const embed = embedFromUrl(activeUrl);

  // Only fully hide when Spotify isn't set up — otherwise the round icon always stays.
  if (!spotifyInstalled || !embed) return null;

  const isIcon = view === 'icon';
  // Keep the iframe mounted while open, or when minimised-to-icon but still playing
  // (▾). A hard close (×) sets started=false → iframe unmounts → audio stops.
  const showWindow = !isIcon || started;
  const isFull = view === 'full';
  const activeItem = items.find((it) => it.url === activeUrl);
  const title = activeItem?.title || 'Spotify';

  const setActive = (url) => {
    const conn = { ...(profile?.connectors || {}) };
    conn.config = { ...(conn.config || {}), spotify: { ...(conn.config?.spotify || {}), items, activeUrl: url } };
    saveProfile({ connectors: conn });
  };

  return (
    <div style={{ position: 'fixed', bottom: 24, right: 96, zIndex: 9998 }}>
      {/* Resting state: round music icon */}
      {isIcon && (
        <button
          type="button"
          onClick={() => { setStarted(true); setView('mini'); }}
          aria-label="Spotify-Player öffnen"
          style={{
            width: 56, height: 56, borderRadius: '50%', cursor: 'pointer',
            background: GREEN, color: '#04130d', border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 8px 24px rgba(29,185,84,0.4)`,
          }}
        >
          <MusicIcon />
        </button>
      )}

      {/* Player window — mounted while open or minimised-to-icon-while-playing. */}
      {showWindow && (
      <div
        style={
          isIcon
            ? { position: 'absolute', right: 0, bottom: 0, width: 320, height: 0, overflow: 'hidden', opacity: 0, pointerEvents: 'none' }
            : {
                width: 320, maxWidth: 'calc(100vw - 120px)', borderRadius: 16, overflow: 'hidden',
                background: 'rgba(12,14,22,0.96)', border: '1px solid rgba(255,255,255,0.1)',
                boxShadow: '0 20px 50px rgba(0,0,0,0.55)', backdropFilter: 'blur(12px)',
                fontFamily: 'var(--font-body)',
              }
        }
      >
        {/* Header — click toggles mini ↔ full */}
        <div
          onClick={() => setView(isFull ? 'mini' : 'full')}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', cursor: 'pointer',
            borderBottom: isFull ? '1px solid rgba(255,255,255,0.06)' : 'none',
          }}
        >
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: GREEN, boxShadow: `0 0 8px ${GREEN}`, flexShrink: 0 }} />
          {activeItem?.thumb && (
            <img src={activeItem.thumb} alt="" style={{ width: 22, height: 22, borderRadius: 4, objectFit: 'cover', flexShrink: 0 }} />
          )}
          <span style={{ flex: 1, minWidth: 0, fontSize: 12, color: '#ECE8F2', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {title}
          </span>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setView('icon'); }}
            aria-label="Zum Icon verkleinern"
            style={{ background: 'none', border: 'none', color: 'rgba(236,232,242,0.6)', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: 2 }}
          >
            ▾
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setStarted(false); setView('icon'); }}
            aria-label="Schließen"
            style={{ background: 'none', border: 'none', color: 'rgba(236,232,242,0.5)', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: 2 }}
          >
            ×
          </button>
        </div>

        {/* Same iframe element across mini/full → only height changes, no reload. */}
        <iframe
          title="Spotify Mini Player"
          src={embed}
          width="100%"
          height={isFull ? 352 : 80}
          frameBorder="0"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
          style={{ display: 'block', border: 'none', transition: 'height 0.25s ease' }}
        />

        {/* Quick library switch (full only) */}
        {isFull && items.length > 1 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '8px 10px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            {items.map((it) => {
              const on = it.url === activeUrl;
              return (
                <button
                  key={it.url}
                  type="button"
                  onClick={() => setActive(it.url)}
                  style={{
                    fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.04em',
                    padding: '4px 8px', borderRadius: 999, cursor: 'pointer',
                    maxWidth: 130, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    color: on ? '#04130d' : 'rgba(236,232,242,0.7)',
                    background: on ? GREEN : 'rgba(255,255,255,0.05)',
                    border: on ? `1px solid ${GREEN}` : '1px solid rgba(255,255,255,0.1)',
                  }}
                >
                  {it.title || 'Spotify'}
                </button>
              );
            })}
          </div>
        )}
      </div>
      )}
    </div>
  );
}
