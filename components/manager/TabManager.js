import React, { useState } from 'react';
import styles from './TabManager.module.css';

export default function TabManager({ profile, saveProfile, blocks, blockIdx, managerHistory, setManagerHistory, setAgentMsg }) {
  const [pattern, setPattern] = useState('');
  const [url, setUrl] = useState('');

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
