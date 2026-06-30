'use client';

/*
 * Profile / Settings tab — extracted from the life-os monolith.
 * Identical behaviour to the inline `case 'profile'` block; profile state,
 * auth helpers, E2E key handlers and navigation setters are threaded as props.
 */

import styles from '@/app/life-os/page.module.css';

export default function ProfileTab({
  profile,
  saveProfile,
  profileToast,
  setProfileToast,
  avatarPresets = [],
  getStandingRank,
  setTutorialStep,
  user,
  resetPassword,
  logout,
  exportE2EPrivateKey,
  importE2EPrivateKey,
  resetE2EKeys,
  setActiveTab,
  calendar,
  stack,
}) {
  return (
    <div className={styles.profileSettingsContainer}>
      {/* Success/Error Toast notification */}
      {profileToast && (
        <div
          className="mb-6 p-4 rounded-xl border flex items-center justify-between"
          style={{ color: 'var(--green)', borderColor: 'rgba(0,196,140,0.2)', backgroundColor: 'rgba(0,196,140,0.08)', fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.05em' }}
        >
          <span>{profileToast}</span>
          <button className="text-xs font-bold hover:text-white" onClick={() => setProfileToast('')}>✕</button>
        </div>
      )}

      {/* Page Header */}
      <header className="mb-12 flex flex-col md:flex-row items-center md:items-start gap-8 border-b border-white/5 pb-8">
        <div className="relative w-28 h-28 rounded-full overflow-hidden border border-white/10 shadow-[0_0_30px_rgba(26,106,255,0.15)]">
          <img
            src={profile?.avatar || avatarPresets[0]?.url}
            alt="Profile Avatar"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex-1 flex flex-col justify-center text-center md:text-left">
          <h1 className="font-display text-4xl text-text mb-2 font-light">{profile?.username || 'BioHacker_Alpha'}</h1>
          <p className="font-body text-text2 text-sm mb-4 italic">"{profile?.bio || 'Architect of the Future Self'}"</p>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1A6AFF]/10 border border-[#1A6AFF]/20 w-fit mx-auto md:mx-0">
            <span className="w-2 h-2 rounded-full bg-[#1A6AFF] shadow-[0_0_8px_#1A6AFF]"></span>
            <span className="font-mono text-[10px] tracking-widest uppercase text-[#1A6AFF] font-bold">
              {getStandingRank(profile?.skillLevel || 1)}
            </span>
          </div>
        </div>
      </header>

      {/* Settings Groups */}
      <div className="space-y-8">
        {/* Group 1: Profile & Identity */}
        <section className={styles.settingsSection}>
          <h2 className={styles.settingsSectionTitle}>Identität & Bio-Daten</h2>
          <div className={styles.glassPanel}>
            {/* Identity Edit Section */}
            <div className="p-5 border-b border-white/5">
              <div className={styles.stackedForm}>
                <label className={styles.formLabel}>Identitätsname</label>
                <input
                  type="text"
                  className={styles.formInput}
                  value={profile?.username || ''}
                  onChange={e => saveProfile({ username: e.target.value })}
                />
                <label className={styles.formLabel} style={{ marginTop: '1rem', display: 'block' }}>Bio-Leitmotiv</label>
                <textarea
                  className={styles.formInput}
                  rows={2}
                  style={{ resize: 'none' }}
                  value={profile?.bio || ''}
                  onChange={e => saveProfile({ bio: e.target.value })}
                />
                <label className={styles.formLabel} style={{ marginTop: '1rem', display: 'block' }}>Fokus-Systemklasse</label>
                <select
                  className={styles.formInput}
                  value={profile?.class || 'Flow Architect'}
                  onChange={e => saveProfile({ class: e.target.value })}
                >
                  <option>Flow Architect</option>
                  <option>Fuel Scheduler</option>
                  <option>Light & Temperature</option>
                  <option>Load Balancer</option>
                  <option>Habit Enforcer</option>
                  <option>Meta-Agent Orchestrator</option>
                </select>
              </div>
            </div>

            {/* Avatar selection presets */}
            <div className="p-5">
              <label className={styles.formLabel} style={{ marginBottom: '0.75rem', display: 'block' }}>Avatar-Preset wählen</label>
              <div className={styles.avatarGrid}>
                {avatarPresets.map((p, i) => (
                  <button
                    key={i}
                    className={`${styles.avatarBtn} ${profile?.avatar === p.url ? styles.avatarBtnActive : ''}`}
                    onClick={() => {
                      saveProfile({ avatar: p.url });
                      setProfileToast('Avatar Preset aktualisiert!');
                    }}
                  >
                    <img src={p.url} alt={p.name} />
                  </button>
                ))}
              </div>
              <label className={styles.formLabel} style={{ marginTop: '1.25rem', display: 'block' }}>Eigene Avatar-URL</label>
              <input
                type="text"
                className={styles.formInput}
                placeholder="https://…"
                value={profile?.avatar || ''}
                onChange={e => saveProfile({ avatar: e.target.value })}
              />
            </div>
          </div>
        </section>

        {/* Group 2: Interface Customization */}
        <section className={styles.settingsSection}>
          <h2 className={styles.settingsSectionTitle}>System-Customizer</h2>
          <div className={styles.glassPanel} style={{ padding: '1.5rem' }}>
            {/* Accent selection */}
            <label className={styles.formLabel}>Akzentfarbe</label>
            <div className={styles.accentPickerGrid} style={{ marginTop: '0.5rem', marginBottom: '1.5rem' }}>
              {['blue', 'green', 'tan', 'amber', 'red', 'pink'].map(acc => (
                <button
                  key={acc}
                  type="button"
                  className={`${styles.accentPickBtn} ${profile?.customization?.accent === acc ? styles.accentPickActive : ''}`}
                  onClick={() => {
                    const newCust = { ...(profile?.customization || {}), accent: acc };
                    saveProfile({ customization: newCust });
                    setProfileToast(`Accent Farbe auf ${acc} gesetzt.`);
                  }}
                  style={{ '--accent-color': acc === 'blue' ? '#1A6AFF' : acc === 'green' ? '#00C48C' : acc === 'tan' ? '#d5b893' : acc === 'amber' ? '#F5A623' : acc === 'red' ? '#FF4D4D' : '#FF33A8' }}
                >
                  <span className={styles.accentColorDot} style={{ '--accent-color': acc === 'blue' ? '#1A6AFF' : acc === 'green' ? '#00C48C' : acc === 'tan' ? '#d5b893' : acc === 'amber' ? '#F5A623' : acc === 'red' ? '#FF4D4D' : '#FF33A8' }} />
                  <span style={{ textTransform: 'capitalize' }}>{acc}</span>
                </button>
              ))}
            </div>

            {/* Mode selection */}
            <label className={styles.formLabel}>Interface-Theme</label>
            <div className={styles.modePickerGrid} style={{ marginTop: '0.5rem', marginBottom: '1.5rem' }}>
              {[
                { id: 'os', label: 'Calm OS' },
                { id: 'noir', label: 'Noir' },
                { id: 'serious', label: 'Matte Dark' },
                { id: 'cyber', label: 'Cyber Glow' },
                { id: 'mono', label: 'Clinical Slate' },
                { id: 'glass', label: 'Glassmorphism' }
              ].map(mode => (
                <button
                  key={mode.id}
                  type="button"
                  className={`${styles.modePickBtn} ${profile?.customization?.mode === mode.id ? styles.modePickActive : ''}`}
                  onClick={() => {
                    const newCust = { ...(profile?.customization || {}), mode: mode.id };
                    saveProfile({ customization: newCust });
                    setProfileToast(`Theme auf ${mode.label} aktualisiert.`);
                  }}
                >
                  {mode.label}
                </button>
              ))}
            </div>

            {/* Widget layout selection */}
            <label className={styles.formLabel}>Modulare Widgets</label>
            <div className={styles.layoutPickerList} style={{ marginTop: '0.5rem', marginBottom: '1.5rem' }}>
              {[
                { key: 'telemetry', label: 'Telemetry Visualizer' },
                { key: 'directives', label: 'System Directives' },
                { key: 'friction', label: 'Friction Logger' }
              ].map(lay => {
                const isVisible = profile?.customization?.layout?.[lay.key] ?? true;
                return (
                  <div key={lay.key} className={styles.layoutToggleRow}>
                    <span>{lay.label}</span>
                    <button
                      type="button"
                      className={`${styles.toggleSwitchBtn} ${isVisible ? styles.toggleActive : ''}`}
                      onClick={() => {
                        const newLayout = { ...(profile?.customization?.layout || { telemetry: true, directives: true, friction: true }), [lay.key]: !isVisible };
                        const newCust = { ...(profile?.customization || {}), layout: newLayout };
                        saveProfile({ customization: newCust });
                      }}
                    >
                      {isVisible ? 'ON' : 'OFF'}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Tour Start and setup */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button
                className={styles.formBtn}
                style={{ background: 'rgba(26,106,255,0.06)', borderColor: 'var(--theme-accent)', color: 'var(--theme-accent)' }}
                onClick={() => { setTutorialStep(1); }}
              >
                🎓 Tour starten
              </button>
              <button
                className={styles.formBtn}
                style={{ background: 'rgba(255,255,255,0.03)', color: '#fff', border: '1px solid rgba(255,255,255,0.08)' }}
                onClick={() => saveProfile({ hasCompletedOnboarding: false })}
              >
                🔄 Setup zurücksetzen
              </button>
            </div>
          </div>
        </section>

        {/* Group 3: Account Security */}
        <section className={styles.settingsSection}>
          <h2 className={styles.settingsSectionTitle}>Kontosicherheit</h2>
          <div className={styles.glassPanel}>
            {/* Reset Password */}
            <button
              className={styles.settingsRow}
              onClick={async () => {
                if (!user?.email) {
                  alert("Keine E-Mail-Adresse für diesen Benutzer gefunden.");
                  return;
                }
                try {
                  await resetPassword(user.email);
                  setProfileToast(`Reset-Email an ${user.email} gesendet!`);
                } catch (err) {
                  alert(`Fehler: ${err.message}`);
                }
              }}
            >
              <div className={styles.settingsRowLeft}>
                <div className={styles.settingsRowIcon}>
                  <span className="material-symbols-outlined text-[20px]">lock</span>
                </div>
                <span>Passwort ändern</span>
              </div>
              <span className={`material-symbols-outlined ${styles.settingsChevron}`}>chevron_right</span>
            </button>

            {/* E2E Section */}
            <div className={styles.securitySubPanel}>
              <div className={styles.securitySubPanelHeader}>
                <span className="material-symbols-outlined text-accent text-[18px]">enhanced_encryption</span>
                <h3 className={styles.securitySubPanelTitle}>Ende-zu-Ende-Schlüsselverwaltung</h3>
              </div>
              <div className={styles.securitySubPanelButtons}>
                {/* Export Key */}
                <button
                  className={styles.securitySubPanelBtn}
                  onClick={async () => {
                    try {
                      const keyStr = await exportE2EPrivateKey();
                      if (!keyStr) {
                        alert("Kein privater E2E-Key gefunden.");
                        return;
                      }
                      const blob = new Blob([keyStr], { type: 'text/plain;charset=utf-8' });
                      const url = URL.createObjectURL(blob);
                      const link = document.createElement('a');
                      link.href = url;
                      link.download = `pronoia_e2e_private_key_${profile?.username || 'user'}.txt`;
                      link.click();
                      URL.revokeObjectURL(url);
                      setProfileToast("E2E Private Key erfolgreich exportiert!");
                    } catch (e) {
                      alert(`Fehler beim Exportieren: ${e.message}`);
                    }
                  }}
                >
                  <span>Private Key exportieren</span>
                  <span className="material-symbols-outlined text-[18px]">download</span>
                </button>

                {/* Import Key */}
                <button
                  className={styles.securitySubPanelBtn}
                  onClick={async () => {
                    const keyStr = prompt("Bitte füge deinen E2E Private Key (base64 JWK) ein:");
                    if (!keyStr) return;
                    try {
                      await importE2EPrivateKey(keyStr);
                      setProfileToast("E2E Private Key erfolgreich importiert!");
                    } catch (e) {
                      alert(`Fehler beim Importieren: ${e.message}`);
                    }
                  }}
                >
                  <span>Private Key importieren</span>
                  <span className="material-symbols-outlined text-[18px]">upload</span>
                </button>

                {/* Reset Keys */}
                <button
                  className={`${styles.securitySubPanelBtn} ${styles.securitySubPanelBtnDanger}`}
                  onClick={async () => {
                    if (confirm("Möchtest du deine E2E Keys wirklich zurücksetzen? Bisherige verschlüsselte Chats können ohne Backup nicht mehr gelesen werden!")) {
                      try {
                        await resetE2EKeys();
                        setProfileToast("E2E Keys erfolgreich zurückgesetzt!");
                      } catch (e) {
                        alert(`Fehler beim Zurücksetzen: ${e.message}`);
                      }
                    }
                  }}
                >
                  <span>E2E Keys zurücksetzen</span>
                  <span className="material-symbols-outlined text-[18px]">warning</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Group 4: Subscription (Stripe) */}
        <section className={styles.settingsSection}>
          <h2 className={styles.settingsSectionTitle}>Abonnement (Stripe)</h2>
          <div className={styles.glassPanel}>
            <div className="p-5 border-b border-white/5 flex items-center justify-between">
              <div>
                <div className="font-semibold text-text mb-1" style={{ textTransform: 'capitalize' }}>
                  {profile?.subscriptionTier || 'Free'} Tier
                </div>
                <div className="text-text3 text-sm">
                  {profile?.subscriptionTier === 'max' ? '99,00 €' : profile?.subscriptionTier === 'premium' ? '59,00 €' : '0,00 €'} / Monat
                </div>
              </div>
              {(!profile?.subscriptionTier || profile?.subscriptionTier === 'free') ? (
                <div className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-text3 font-mono text-[10px] tracking-widest uppercase">
                  Kostenlos
                </div>
              ) : profile?.subscriptionPaused ? (
                <div className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 font-mono text-[10px] tracking-widest uppercase font-semibold">
                  Pausiert
                </div>
              ) : (
                <div className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-[10px] tracking-widest uppercase font-semibold">
                  Aktiv
                </div>
              )}
            </div>

            {(!profile?.subscriptionTier || profile?.subscriptionTier === 'free') ? (
              <div className="p-6 flex flex-col items-center text-center">
                <p className="font-body text-text2 text-sm mb-4 max-w-md leading-relaxed">
                  Du nutzt aktuell die kostenfreie Version von Pronoia OS. Upgrade jetzt auf Premium oder Max, um automatische Refills, fortlaufende KI-Direktiven und unbegrenzte Konnektoren freizuschalten.
                </p>
                <button
                  className={styles.formBtn}
                  style={{ maxWidth: '280px', width: '100%', background: 'var(--theme-accent)', color: '#fff' }}
                  onClick={() => setActiveTab('store')}
                >
                  🚀 Auf Premium upgraden
                </button>
              </div>
            ) : (
              <div className="flex flex-col">
                <button
                  className={styles.settingsRow}
                  onClick={() => {
                    const paused = !profile?.subscriptionPaused;
                    saveProfile({ subscriptionPaused: paused });
                    setProfileToast(paused ? "Abrechnung pausiert." : "Abrechnung reaktiviert.");
                  }}
                >
                  <div className={styles.settingsRowLeft}>
                    <div className={styles.settingsRowIcon}>
                      <span className="material-symbols-outlined text-[20px]">
                        {profile?.subscriptionPaused ? 'play_circle' : 'pause_circle'}
                      </span>
                    </div>
                    <span>{profile?.subscriptionPaused ? 'Abrechnung fortsetzen' : 'Abrechnung pausieren'}</span>
                  </div>
                  <span className={`material-symbols-outlined ${styles.settingsChevron}`}>chevron_right</span>
                </button>
                <button
                  className={styles.settingsRow}
                  onClick={() => {
                    alert("Nächste Lieferung erfolgreich übersprungen.");
                  }}
                >
                  <div className={styles.settingsRowLeft}>
                    <div className={styles.settingsRowIcon}>
                      <span className="material-symbols-outlined text-[20px]">skip_next</span>
                    </div>
                    <span>Nächste Lieferung überspringen</span>
                  </div>
                  <span className={`material-symbols-outlined ${styles.settingsChevron}`}>chevron_right</span>
                </button>
                <button
                  className={`${styles.settingsRow} ${styles.settingsRowDanger}`}
                  onClick={() => {
                    if (confirm("Möchtest du dein Premium-Abonnement kündigen? Du verlierst den automatisierten Refill-Sync.")) {
                      saveProfile({ subscriptionTier: 'free' });
                      setProfileToast("Abonnement gekündigt. Downgrade auf Free Tier.");
                    }
                  }}
                >
                  <div className={styles.settingsRowLeft}>
                    <div className={styles.settingsRowIcon}>
                      <span className="material-symbols-outlined text-[20px]">cancel</span>
                    </div>
                    <span>Abonnement kündigen</span>
                  </div>
                  <span className={`material-symbols-outlined ${styles.settingsChevron}`}>chevron_right</span>
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Group 5: Data & Privacy (GDPR) */}
        <section className={styles.settingsSection}>
          <h2 className={styles.settingsSectionTitle}>Daten & Datenschutz (DSGVO)</h2>
          <div className={styles.glassPanel}>
            {/* Export GDPR */}
            <button
              className={styles.settingsRow}
              onClick={() => {
                try {
                  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ profile, calendar, stack }, null, 2));
                  const dlAnchorElem = document.createElement('a');
                  dlAnchorElem.setAttribute("href",     dataStr);
                  dlAnchorElem.setAttribute("download", `pronoia_gdpr_export_${profile?.username || 'user'}.json`);
                  dlAnchorElem.click();
                  setProfileToast("GDPR-Daten-Download gestartet.");
                } catch (e) {
                  alert(`Fehler beim Datenexport: ${e.message}`);
                }
              }}
            >
              <div className={styles.settingsRowLeft}>
                <div className={styles.settingsRowIcon}>
                  <span className="material-symbols-outlined text-[20px]">badge</span>
                </div>
                <span>Persönliche Daten exportieren</span>
              </div>
              <span className="material-symbols-outlined text-[20px] text-text3">download</span>
            </button>

            {/* Delete Account */}
            <button
              className={`${styles.settingsRow} ${styles.settingsRowDanger}`}
              onClick={async () => {
                if (confirm("WARNUNG: Account unwiderruflich löschen? Alle Daten in der Cloud werden unwiderruflich gelöscht!")) {
                  alert("Account-Löschung wurde gestartet. Auf Wiedersehen.");
                  await logout();
                  window.location.href = '/';
                }
              }}
            >
              <div className={styles.settingsRowLeft}>
                <div className={styles.settingsRowIcon}>
                  <span className="material-symbols-outlined text-[20px]">delete_forever</span>
                </div>
                <span>Account löschen</span>
              </div>
              <span className={`material-symbols-outlined ${styles.settingsChevron}`}>chevron_right</span>
            </button>
          </div>
          <p className="mt-4 px-4 font-body text-xs text-text3 text-center md:text-left leading-relaxed">
            Das Löschen deines Accounts ist dauerhaft und kann nicht rückgängig gemacht werden. Alle Daten werden unwiderruflich entfernt.
          </p>
        </section>
      </div>

      <footer className="mt-16 text-center">
        <p className="font-mono text-[10px] tracking-[0.2em] text-text3 uppercase">Pronoia OS Version 1.0.4</p>
      </footer>
    </div>
  );
}
