# Pronoia Safety — Browser Extension MVP v0.1

Child Safety Browser Extension — blockt explizite Inhalte und scannt Communities.

## Struktur

```
pronoia-safety/
├── manifest.json          # Chrome Extension Manifest V3
├── popup.html             # Extension-Popup UI
├── popup.js               # Popup-Logik
├── blocked.html           # Seite die beim Blocken angezeigt wird
├── rules/
│   └── blocklist.json     # declarativeNetRequest-Regeln (schnelles Blocken)
├── src/
│   ├── background.js      # Service Worker — Kern-Logik
│   └── content.js         # Content Script — Warning-Overlay
└── icons/
    └── (icon16/48/128.png — selbst erstellen oder aus assets)
```

## Installation (Dev-Modus)

1. `chrome://extensions/` öffnen
2. "Entwicklermodus" oben rechts aktivieren
3. "Entpackte Erweiterung laden" klicken
4. Diesen Ordner auswählen

## Features MVP

- **Domain-Blocklist**: 26+ bekannte Adult-Sites werden per declarativeNetRequest geblockt (vor dem Laden)
- **Keyword-Scanner**: URLs werden auf Danger-Keywords geprüft
- **Subreddit-Filter**: Bekannte NSFW-Subreddits werden erkannt und geblockt
- **Discord-Scanner**: Kanal-URLs werden auf Risiko-Keywords gecheckt
- **Warning-Overlay**: Soft-Warnungen als Overlay (ohne harten Block)
- **Popup-Dashboard**: Live-Scan der aktuellen Seite + Toggle-Einstellungen + Log

## Roadmap

- [ ] KI-basierte Bild-Klassifizierung (Google Safe Search API)
- [ ] Eltern-Dashboard (Web-App)
- [ ] E-Mail-Alerts für Eltern
- [ ] Discord Bot-Integration (echtes Server-Scanning)
- [ ] Reddit API-Scanning (PRAW)
- [ ] Passwortschutz für Einstellungen
- [ ] Firefox-Port

## Tech Stack

- Manifest V3 (Chrome)
- Service Worker (background.js)
- declarativeNetRequest (performantes Blocken ohne JS)
- chrome.storage.local (persistente Einstellungen + Log)
- chrome.notifications (Push-Warnungen)
