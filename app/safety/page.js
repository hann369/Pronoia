'use client';
import Link from 'next/link';
import styles from './page.module.css';

export default function SafetyPage() {
  return (
    <div className={styles.container}>
      {/* Ambient background decoration */}
      <div className={styles.ambientOrb} aria-hidden="true" />
      
      {/* Hero Header */}
      <header className={styles.hero}>
        <span className={styles.kicker}>SECURE YOUR FOCUS</span>
        <h1 className={styles.title}>PRONOIA SAFETY</h1>
        <p className={styles.subtitle}>
          Echtzeit-Schutz vor expliziten Inhalten und ablenkenden Communities. 
          Eine hochgradig optimierte Chrome-Extension zur Bewahrung deiner bio-kognitiven Integrität.
        </p>
      </header>

      {/* Main Grid: Info + Download */}
      <div className={styles.mainGrid}>
        
        {/* Left Side: Product Details */}
        <section className={styles.detailsCol}>
          <div className={styles.panelCard}>
            <h2 className={styles.panelTitle}>🛡️ Schutzmechanismen</h2>
            <div className={styles.featureList}>
              <div className={styles.featureItem}>
                <div className={styles.featureIcon}>🚫</div>
                <div className={styles.featureText}>
                  <h4>Echtzeit-Porn-Blocker</h4>
                  <p>Injektions-Scripte scannen URLs und Dokumentstrukturen auf Muster expliziter Anbieter.</p>
                </div>
              </div>
              <div className={styles.featureItem}>
                <div className={styles.featureIcon}>⚡</div>
                <div className={styles.featureText}>
                  <h4>Systemische Umlenkung</h4>
                  <p>Erkennt blockierte Adressen im DNS-Scope und fängt sie sofort ab, um dich auf ein neutrales Dashboard umzuleiten.</p>
                </div>
              </div>
              <div className={styles.featureItem}>
                <div className={styles.featureIcon}>🔌</div>
                <div className={styles.featureText}>
                  <h4>Host-Schutzschilde</h4>
                  <p>Spezifische Filterregeln regulieren den unkontrollierten Feed-Zugriff auf Plattformen wie Discord, Reddit und Telegram.</p>
                </div>
              </div>
              <div className={styles.featureItem}>
                <div className={styles.featureIcon}>🔒</div>
                <div className={styles.featureText}>
                  <h4>Manifest V3 & Local-First</h4>
                  <p>Keine Übermittlung von Nutzerdaten. Der Abgleich erfolgt vollständig offline im Browser mit null Latenz.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Right Side: Download & Setup */}
        <section className={styles.downloadCol}>
          <div className={`${styles.panelCard} ${styles.downloadCard}`}>
            <span className={styles.versionBadge}>v0.2.0 Stable (Beta)</span>
            <h3 className={styles.downloadCardTitle}>Extension herunterladen</h3>
            <p className={styles.downloadCardDesc}>
              Installiere Pronoia Safety manuell in deinem Chromium-Browser (Chrome, Brave, Edge).
            </p>
            
            <a href="/pronoia-safety.zip" download className={styles.downloadBtn}>
              📥 Pronoia Safety (.zip)
            </a>
            <span className={styles.downloadMeta}>ZIP-Format — Ca. 24 KB — Local database rules v0.2.0</span>

            <div className={styles.divider} />

            <h4 className={styles.setupTitle}>🔧 Installationsanleitung:</h4>
            <ol className={styles.setupSteps}>
              <li>Lade die <code>pronoia-safety.zip</code> Datei herunter.</li>
              <li>Entpacke das Archiv in einen Ordner deiner Wahl.</li>
              <li>Öffne Chrome und navigiere zu <code>chrome://extensions/</code>.</li>
              <li>Aktiviere den <strong>Entwicklermodus</strong> (oben rechts).</li>
              <li>Klicke auf <strong>Entpackte Erweiterung laden</strong> (oben links).</li>
              <li>Wähle den entpackten Ordner aus. Die Extension ist sofort aktiv!</li>
            </ol>
          </div>
        </section>

      </div>
    </div>
  );
}
