'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import styles from './page.module.css';
import Link from 'next/link';

const PILLARS = [
  { num: '01', title: 'Dermal', icon: '◎', desc: 'Aleppo soap. Chemical exposure reduced to an absolute minimum. Pure biology, maximum absorption.' },
  { num: '02', title: 'Textile', icon: '◈', desc: 'Organic fibers. Elimination of synthetic polymers to optimize skin microclimate and endocrine function.' },
  { num: '03', title: 'Lumen', icon: '◐', desc: 'Circadian synchronization. Strategic light exposure to regulate cortisol, melatonin, and alertness cycles.' },
  { num: '04', title: 'Thermal', icon: '◑', desc: 'Cold and heat exposure protocols calibrated to your HRV baseline. Hormetic stress for adaptive resilience.' },
  { num: '05', title: 'Chemical', icon: '○', desc: 'Audit and elimination of endocrine disruptors in food packaging, cleaning products, and personal care.' },
  { num: '06', title: 'Acoustic', icon: '◔', desc: 'Noise environment management. Strategic silence and frequency protocols for deep work states.' },
];

const BIOMARKERS = [
  { id: 'hrv', label: 'HRV', unit: 'ms', placeholder: '65', description: 'Heart Rate Variability — recovery indicator' },
  { id: 'sleep', label: 'Sleep', unit: 'h', placeholder: '7.5', description: 'Total sleep duration' },
  { id: 'rhr', label: 'RHR', unit: 'bpm', placeholder: '52', description: 'Resting heart rate' },
  { id: 'readiness', label: 'Readiness', unit: '%', placeholder: '84', description: 'Overall readiness score' },
];

export default function HealthPage() {
  const { user } = useAuth();
  const [values, setValues] = useState({
    hrv: '',
    sleep: '',
    rhr: '',
    readiness: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);

  // Load from Firestore
  useEffect(() => {
    async function loadData() {
      if (user) {
        try {
          const docRef = doc(db, 'users', user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.profile?.metrics) {
              setValues({
                hrv: data.profile.metrics.hrv || '',
                sleep: data.profile.metrics.sleep || '',
                rhr: data.profile.metrics.rhr || '',
                readiness: data.profile.metrics.readiness || ''
              });
            }
          }
        } catch (err) {
          console.error("Error loading health data:", err);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    }
    loadData();
  }, [user]);

  const handleSave = async () => {
    if (!user) {
      setSaveStatus('Bitte erst einloggen.');
      return;
    }
    setSaving(true);
    setSaveStatus('Speichere...');
    try {
      await setDoc(doc(db, 'users', user.uid), {
        profile: {
          metrics: {
            hrv: parseInt(values.hrv) || 0,
            sleep: parseFloat(values.sleep) || 0,
            rhr: parseInt(values.rhr) || 0,
            readiness: parseInt(values.readiness) || 0,
            lastUpdate: new Date().toISOString()
          }
        }
      }, { merge: true });
      setSaveStatus('Daten erfolgreich synchronisiert.');
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (err) {
      setSaveStatus('Fehler beim Speichern.');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (id, val) => {
    setValues(prev => ({ ...prev, [id]: val }));
  };

  return (
    <>
      {/* ═══ HERO ══════════════════════════════════════════════ */}
      <section className={styles.hero}>
        <div className={styles.heroBg} aria-hidden="true">
          <div className={styles.heroGlow} />
        </div>
        <div className="container">
          <div className={styles.heroInner}>
            <span className="badge badge-tan" style={{ marginBottom: '2rem' }}>Biological Integrity</span>
            <h1 className={styles.heroTitle}>
              Environment<br />over<br /><em>Willpower.</em>
            </h1>
            <p className={styles.heroSub}>
              No kognitiver Peak auf einem toxischen Fundament. Pronoia Health entfernt
              den unsichtbaren Widerstand — chemisch, textil, zirkadian und akustisch —,
              der dein Leistungspotenzial lautlos begrenzt.
            </p>
            <div className={styles.heroCtas}>
              <a href="#pillars" className="btn btn-primary btn-lg">See The Framework →</a>
              <a href="#biomarkers" className="btn btn-ghost btn-lg">Track Biomarkers</a>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ PHILOSOPHY ════════════════════════════════════════ */}
      <section className="section-sm">
        <div className="container">
          <div className={styles.philosophyGrid}>
            <div className={styles.philosophyLeft}>
              <span className="label-mono" style={{ color: 'var(--tan)', marginBottom: '1rem', display: 'block' }}>The Premise</span>
              <h2 className={styles.philosophyTitle}>Most people fail at talent. Not at effort.</h2>
            </div>
            <div className={styles.philosophyRight}>
              <p className={styles.philosophyText}>
                Toxine, endokrine Disruptoren und zirkadianer Stress sind unsichtbare Bremsen in deinem System.
                Du kannst deine Morgenroutine, deine Supplements und deine Deep-Work-Blöcke optimieren — und dennoch
                unterperformen, weil dein biologisches Substrat kompromittiert ist.
              </p>
              <p className={styles.philosophyText}>
                Pronoia Health identifiziert und eliminiert diese Barrieren. Eine nach der anderen.
                Systematisch. Permanent.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ PILLARS ═══════════════════════════════════════════ */}
      <section id="pillars" className={`section ${styles.pillarsSection}`}>
        <div className="container">
          <div className={styles.pillarsHeader}>
            <h2 className={styles.pillarsTitle}>Six Domains of Biological Integrity</h2>
            <Link href="/store" className="btn btn-ghost" style={{ fontSize: '0.7rem' }}>
              Get the PDF Guide →
            </Link>
          </div>
          <div className={styles.pillarsGrid}>
            {PILLARS.map(p => (
              <div key={p.num} className={`card ${styles.pillarCard}`}>
                <div className={styles.pillarTop}>
                  <span className={styles.pillarIcon}>{p.icon}</span>
                  <span className={styles.pillarNum}>{p.num}</span>
                </div>
                <h3 className={styles.pillarTitle}>{p.title}</h3>
                <p className={styles.pillarDesc}>{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ BIOMARKER TRACKER ═════════════════════════════════ */}
      <section id="biomarkers" className={styles.bioSection}>
        <div className="container">
          <div className={styles.bioInner}>
            <div className={styles.bioLeft}>
              <span className="label-mono" style={{ color: 'var(--cobalt-bright)', marginBottom: '1rem', display: 'block' }}>Live Tracking</span>
              <h2 className={styles.bioTitle}>Biomarker Dashboard</h2>
              <p className={styles.bioSub}>
                Deine heutigen Inputs formen das Protokoll von morgen. Logge deine Biomarker
                und lass den Pronoia Agent deine Blöcke adaptiv anpassen.
              </p>
              <Link href="/protocol" className="btn btn-primary" style={{ marginTop: '1.5rem', display: 'inline-flex' }}>
                Open Protocol Agent →
              </Link>
            </div>
            <div className={styles.bioRight}>
              <div className={styles.bioWidget}>
                {BIOMARKERS.map(m => (
                  <div key={m.id} className={styles.bioRow}>
                    <div className={styles.bioLabel}>
                      <span className={styles.bioName}>{m.label}</span>
                      <span className={styles.bioDesc}>{m.description}</span>
                    </div>
                    <div className={styles.bioInputWrap}>
                      <input
                        type="number"
                        className={styles.bioInput}
                        placeholder={m.placeholder}
                        value={values[m.id]}
                        onChange={(e) => handleChange(m.id, e.target.value)}
                        disabled={loading}
                      />
                      <span className={styles.bioUnit}>{m.unit}</span>
                    </div>
                  </div>
                ))}
                <button
                  className={`btn btn-primary ${styles.bioSaveBtn} ${saving ? styles.saving : ''}`}
                  onClick={handleSave}
                  disabled={saving || loading}
                >
                  {saving ? 'Syncing...' : 'Save to Protocol →'}
                </button>
                {saveStatus && <p className={styles.saveStatus}>{saveStatus}</p>}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ QUOTE ═════════════════════════════════════════════ */}
      <section className={styles.quoteSection}>
        <div className="container">
          <blockquote className={styles.quote}>
            "Wir bauen keine Produkte. Wir bauen das System, das Widerstände entfernt,
            damit dein Fokus auf keine Barrieren trifft."
          </blockquote>
        </div>
      </section>
    </>
  );
}
