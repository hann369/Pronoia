import React, { useState } from 'react';
import styles from './TabManager.module.css';

export default function TabManager({ profile, saveProfile, blocks, blockIdx, managerHistory, setManagerHistory, setAgentMsg }) {
  const [pattern, setPattern] = useState('');
  const [url, setUrl] = useState('');
  const [researchQuery, setResearchQuery] = useState('');
  const [researchLoading, setResearchLoading] = useState(false);
  const [researchCards, setResearchCards] = useState([]);

  const config = profile?.managerConfig || { autoOpenEnabled: true, mappings: [] };
  const mappings = config.mappings || [];
  const autoOpenEnabled = config.autoOpenEnabled ?? true;

  const handleToggleAutoOpen = () => {
    const updated = {
      ...config,
      autoOpenEnabled: !autoOpenEnabled
    };
    saveProfile({ managerConfig: updated });
    setAgentMsg(`Automatisches Öffnen von Tabs ${!autoOpenEnabled ? 'aktiviert' : 'deaktiviert'}.`);
  };

  const handleAddMapping = (e) => {
    e.preventDefault();
    if (!pattern.trim() || !url.trim()) return;

    // Validate URL
    let formattedUrl = url.trim();
    if (!/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = 'https://' + formattedUrl;
    }

    const newMapping = {
      id: `map_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      pattern: pattern.trim(),
      url: formattedUrl
    };

    const updated = {
      ...config,
      mappings: [...mappings, newMapping]
    };

    saveProfile({ managerConfig: updated });
    setPattern('');
    setUrl('');
    setAgentMsg(`Link-Zuordnung für "${pattern.trim()}" hinzugefügt.`);
  };

  const handleDeleteMapping = (id) => {
    const updated = {
      ...config,
      mappings: mappings.filter(m => m.id !== id)
    };
    saveProfile({ managerConfig: updated });
    setAgentMsg("Link-Zuordnung entfernt.");
  };

  const handleTestMapping = (mapping) => {
    try {
      window.open(mapping.url, '_blank');
      setAgentMsg(`Test-Öffnen von ${mapping.url} initiiert.`);
    } catch (e) {
      setAgentMsg(`Browser blockiert Popup: ${e.message}`);
    }
  };

  // ----- Outlier Research: lightweight YouTube discovery + heuristics -----
  const computeOutlierScore = (title = '', author = '') => {
    // Heuristic score: presence of rare keywords, numbers, and concise titles
    let score = 50;
    const keywords = ['viral','best','top','how to','tutorial','review','analysis','case study'];
    const t = title.toLowerCase();
    const hasKeyword = keywords.some(k => t.includes(k));
    if (hasKeyword) score += 10;
    const words = title.split(/\s+/).filter(Boolean).length;
    if (words <= 5) score += 8; // punchy titles often perform
    if (/[0-9]{1,3}/.test(title)) score += 6; // lists / numbers
    if (author && author.length < 10) score += 4; // short brand names
    // normalize
    return Math.min(100, Math.round(score));
  };

  const handleResearchSubmit = async (e) => {
    e?.preventDefault();
    if (!researchQuery.trim()) return;
    setResearchLoading(true);
    try {
      const resp = await fetch(`/api/youtube-search?q=${encodeURIComponent(researchQuery.trim())}`);
      const data = await resp.json();
      // If API returned channel mode with a list of videos, prefer channel-only results
      if (data && data.mode === 'channel' && Array.isArray(data.videos) && data.videos.length > 0) {
        // fetch oEmbed metadata for each video in parallel
        const metas = await Promise.all(data.videos.map(async (v) => {
          try {
            const url = v.watchUrl || `https://www.youtube.com/watch?v=${v.videoId}`;
            const oembed = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
            const r = await fetch(oembed);
            return r.ok ? await r.json() : null;
          } catch (e) {
            return null;
          }
        }));

        const cards = data.videos.map((v, idx) => {
          const meta = metas[idx] || {};
          const vid = v.videoId || (v.videoUrl && v.videoUrl.split('v=')[1]) || null;
          return {
            id: `r_${Date.now()}_${idx}`,
            videoId: vid,
            videoUrl: v.watchUrl || `https://www.youtube.com/watch?v=${vid}`,
            embedUrl: v.embedUrl || `https://www.youtube.com/embed/${vid}`,
            title: meta?.title || v.title || `Video ${vid}`,
            author: meta?.author_name || data.channelUrl || 'Channel',
            thumbnail: meta?.thumbnail_url || `https://img.youtube.com/vi/${vid}/hqdefault.jpg`,
            outlierScore: computeOutlierScore(meta?.title || v.title || '', meta?.author_name || ''),
            tags: (meta?.title || v.title || '').split(/\s+/).filter(w => w.length > 4).slice(0,6)
          };
        });

        setResearchCards(prev => [...cards, ...prev]);
        setAgentMsg(`Channel-Ergebnisse für "${researchQuery.trim()}" geladen.`);
        setResearchQuery('');
      } else {
        const videoId = data.videoId;
        if (!videoId) throw new Error('Kein Video gefunden');

        // Fetch public oEmbed metadata for rich card info
        const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
        const metaRes = await fetch(oembedUrl);
        const meta = metaRes.ok ? await metaRes.json() : null;

        const card = {
          id: `r_${Date.now()}`,
          videoId,
          videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
          embedUrl: data.videoUrl || `https://www.youtube.com/embed/${videoId}`,
          title: meta?.title || `Video ${videoId}`,
          author: meta?.author_name || 'Unknown',
          thumbnail: meta?.thumbnail_url || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
          outlierScore: computeOutlierScore(meta?.title || '', meta?.author_name || ''),
          tags: (meta?.title || '').split(/\s+/).filter(w => w.length > 4).slice(0,6)
        };

        setResearchCards(prev => [card, ...prev]);
        setAgentMsg(`Research Ergebnis für "${researchQuery.trim()}" geladen.`);
        setResearchQuery('');
      }
    } catch (err) {
      console.error('Research error:', err);
      setAgentMsg(`Research fehlgeschlagen: ${err.message}`);
    } finally {
      setResearchLoading(false);
    }
  };

  const handleResearchOpen = (card) => {
    try {
      window.open(card.videoUrl, '_blank');
      setAgentMsg(`Öffne Video ${card.title}`);
      // append to manager history for easy reference
      const entry = {
        id: `hist_${Date.now()}`,
        time: new Date().toLocaleTimeString(),
        blockTitle: 'Research',
        url: card.videoUrl
      };
      setManagerHistory && setManagerHistory(prev => [entry, ...(prev || [])].slice(0, 200));
    } catch (e) {
      setAgentMsg(`Popup blockiert: ${e.message}`);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.meta}>SYSTEM APP // TAB MANAGER NODE</div>
        <h2 className={styles.title}>Block Link Manager</h2>
        <p className={styles.desc}>
          Konfiguriere Webseiten, die sich automatisch in deinem Browser öffnen sollen, sobald ein passender Protokollblock aktiv wird.
        </p>
      </div>

      <div className={styles.contentGrid}>
        {/* Left column: Configuration */}
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>⚙️ Einstellungen</h3>
          
          <div className={styles.controlRow}>
            <div className={styles.controlInfo}>
              <span className={styles.controlLabel}>Auto-Open aktivieren</span>
              <span className={styles.controlDesc}>Tabs automatisch im Hintergrund öffnen, wenn der Block startet</span>
            </div>
            <button
              type="button"
              className={`${styles.toggleBtn} ${autoOpenEnabled ? styles.toggleActive : ''}`}
              onClick={handleToggleAutoOpen}
            >
              {autoOpenEnabled ? 'AN' : 'AUS'}
            </button>
          </div>

          <form onSubmit={handleAddMapping} className={styles.mappingForm}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Wenn Blocktext enthält (z.B. "Französisch")</label>
              <input
                type="text"
                placeholder="z.B. Französisch Lernen"
                className={styles.input}
                value={pattern}
                onChange={e => setPattern(e.target.value)}
                required
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Folgenden Link öffnen</label>
              <input
                type="text"
                placeholder="z.B. https://duolingo.com"
                className={styles.input}
                value={url}
                onChange={e => setUrl(e.target.value)}
                required
              />
            </div>
            <button type="submit" className={styles.submitBtn}>
              Zuordnung Hinzufügen ✦
            </button>
          </form>

          <div className={styles.infoAlert}>
            <span className={styles.alertIcon}>⚠️</span>
            <div className={styles.alertContent}>
              <strong>Browser-Popups erlauben:</strong> Da Browser automatische Popups standardmäßig blockieren, musst du Popups für diese Seite (localhost oder deine Domain) explizit erlauben. Achte auf das Symbol in der Adressleiste deines Browsers.
            </div>
          </div>
        </div>

        {/* Right column: Mappings List & History */}
        <div className={styles.rightColumn}>
          {/* Mappings List */}
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>🔗 Aktive Zuordnungen ({mappings.length})</h3>
            <div className={styles.mappingsList}>
              {mappings.map(m => (
                <div key={m.id} className={styles.mappingRow}>
                  <div className={styles.mappingInfo}>
                    <span className={styles.mappingPattern}>{m.pattern}</span>
                    <span className={styles.mappingUrl} title={m.url}>{m.url}</span>
                  </div>
                  <div className={styles.mappingActions}>
                    <button 
                      type="button" 
                      className={styles.testBtn} 
                      onClick={() => handleTestMapping(m)}
                      title="Link testen"
                    >
                      ↗
                    </button>
                    <button 
                      type="button" 
                      className={styles.deleteBtn} 
                      onClick={() => handleDeleteMapping(m.id)}
                      title="Löschen"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
              {mappings.length === 0 && (
                <p className={styles.emptyText}>Keine Zuordnungen hinterlegt. Lege links eine neue Zuordnung an.</p>
              )}
            </div>
          </div>

            {/* Research / Outlier Analysis */}
            <div className={styles.card} style={{ flex: 1 }}>
              <h3 className={styles.cardTitle}>🔬 Outlier Research — YouTube & Skills</h3>
              <div className={styles.researchLayout}>
                <form className={styles.researchTopBar} onSubmit={handleResearchSubmit}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>YouTuber / Suchbegriff</label>
                    <input
                      type="text"
                      placeholder="z.B. Kanalname oder Thema (z.B. 'deliberate practice Pomodoro')"
                      className={styles.input}
                      value={researchQuery}
                      onChange={e => setResearchQuery(e.target.value)}
                    />
                  </div>
                  <button type="submit" className={styles.submitBtn} disabled={researchLoading}>
                    {researchLoading ? 'Suchen…' : 'Research'}
                  </button>
                </form>

                <div className={styles.researchGrid}>
                  {researchCards.map(c => (
                    <div key={c.id} className={styles.researchCard}>
                      <div className={styles.researchCardHeader}>
                        <div>
                          <div className={styles.researchCardTitle}>{c.title}</div>
                          <div className={styles.researchCardCategory}>{c.author}</div>
                        </div>
                        <img src={c.thumbnail} alt="thumb" style={{ width: 86, height: 54, borderRadius: 6, objectFit: 'cover' }} />
                      </div>
                      <div className={styles.researchCardBody}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                          <div style={{ fontSize: 12, color: 'var(--text3)' }}>Outlier Score:</div>
                          <div style={{ fontWeight: 700, color: 'var(--theme-accent, #1a6aff)' }}>{c.outlierScore}</div>
                        </div>
                        <div className={styles.researchCardTags}>
                          {c.tags.map(t => <div key={t} className={styles.researchTag}>{t}</div>)}
                        </div>
                      </div>
                      <div className={styles.researchCardFooter}>
                        <div className={styles.researchDate}>{new Date().toLocaleDateString()}</div>
                        <div className={styles.researchCardActions}>
                          <button className={styles.researchActionBtn} onClick={() => handleResearchOpen(c)}>Open</button>
                          <a className={styles.researchActionBtn} href={c.embedUrl} target="_blank" rel="noreferrer">Embed</a>
                        </div>
                      </div>
                    </div>
                  ))}
                  {researchCards.length === 0 && (
                    <div className={styles.emptyState} style={{ padding: '1rem' }}>
                      <div className={styles.emptyIcon}>🔎</div>
                      <div className={styles.emptyText}>Gib einen Kanalnamen oder ein Thema ein und klicke auf "Research", um relevante Videos und Schlagworte zu finden.</div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Session History */}
            <div className={styles.card} style={{ flex: 1 }}>
            <h3 className={styles.cardTitle}>📜 Verlauf (Aktuelle Session)</h3>
            <div className={styles.historyList}>
              {managerHistory.map(h => (
                <div key={h.id} className={styles.historyRow}>
                  <span className={styles.historyTime}>{h.time}</span>
                  <div className={styles.historyContent}>
                    <span>Block <strong>{h.blockTitle}</strong> aktiv</span>
                    <a href={h.url} target="_blank" rel="noopener noreferrer" className={styles.historyUrl}>
                      Geöffnet: {h.url}
                    </a>
                  </div>
                </div>
              ))}
              {managerHistory.length === 0 && (
                <p className={styles.emptyText}>Noch keine Tabs automatisch geöffnet.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
