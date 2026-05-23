'use client';

import { useState } from 'react';
import Link from 'next/link';
import SkillLabModal from '@/components/SkillLabModal';

const COMPOUNDS = [
  { id: 'C01', name: 'Creatin Monohydrat', dose: '5.00g', desc: 'Zelluläre ATP-Regeneration. Erhöht den zellulären Energie-Output während tiefen Fokus-Blöcken.' },
  { id: 'C02', name: 'Taurin', dose: '2.00g', desc: 'ZNS-Beruhigung. Moduliert GABA-Rezeptoren und verhindert Überreizung durch Stimulation.' },
  { id: 'C03', name: 'Bromantane', dose: '50mg', desc: 'Dopamin-Synthese-Upregulation. Steigert die intrinsische Motivation ohne adrenergen Crash.' },
  { id: 'C04', name: 'Magnesiumglycinat', dose: '400mg', desc: 'Regulation des Cortisolspiegels und Unterstützung der muskulären Relaxation.' }
];

export default function LabsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expandedRow, setExpandedRow] = useState(null);

  const toggleRow = (id) => {
    if (expandedRow === id) setExpandedRow(null);
    else setExpandedRow(id);
  };

  return (
    <>
      <div className="sky-background" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: -2, overflow: 'hidden', pointerEvents: 'none' }}>
        <div className="orb orb-1" style={{ position: 'absolute', width: '60vw', height: '60vw', borderRadius: '50%', filter: 'blur(120px)', opacity: 0.15, background: 'var(--tan)', top: '-10%', right: '-10%', animation: 'orb-float 20s infinite alternate' }}></div>
        <div className="orb orb-2" style={{ position: 'absolute', width: '60vw', height: '60vw', borderRadius: '50%', filter: 'blur(120px)', opacity: 0.15, background: 'var(--cobalt)', bottom: '-10%', left: '-10%', animation: 'orb-float 20s infinite alternate', animationDelay: '-5s' }}></div>
      </div>

      <section style={{ minHeight: '90vh', display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', alignItems: 'center', padding: '10vh 10%', borderBottom: '1px solid var(--border)' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-mono)', fontSize: 'clamp(3rem, 7vw, 5.5rem)', letterSpacing: '-0.05em', lineHeight: 0.9, marginBottom: '2rem' }}>PX-V1<br/>ARCHITECTURE</h1>
          <p style={{ fontSize: '1.2rem', color: 'var(--text2)', maxWidth: '600px', marginBottom: '3rem' }}>
            Synergetische Matrix aus Bromantane, Creatin, Taurin und Magnesiumglycinat. Ein biologisches Upgrade, keine Krücke.
          </p>
          <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
            <button onClick={() => setIsModalOpen(true)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', color: 'var(--accent)', fontWeight: 700, letterSpacing: '0.1em', padding: 0 }}>
              INITIATE SKILL LAB _
            </button>
            <Link href="/protocol" style={{ fontFamily: 'var(--font-mono)', textDecoration: 'none', color: 'var(--text)', opacity: 0.6, fontWeight: 700, letterSpacing: '0.1em' }}>
              PROTOCOL
            </Link>
          </div>
        </div>
        <div style={{ transform: 'scale(1.2)' }}>
          {/* Using next/img would be better, but standard img matches 1:1 */}
          <img src="/graphic assets/px-v1.png" alt="Molecular Architecture" style={{ width: '100%', objectFit: 'contain' }} />
        </div>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', borderBottom: '1px solid var(--border)' }}>
        {[
          { label: 'Batch ID', value: '#001' },
          { label: 'Purity Index', value: '99.8%' },
          { label: 'Neuro-Latency', value: '-2.8ms' },
          { label: 'Stock Status', value: 'ACTIVE' }
        ].map(stat => (
          <div key={stat.label} style={{ padding: '3rem', borderRight: '1px solid var(--border)' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text2)', marginBottom: '1rem' }}>{stat.label}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '2.2rem', fontWeight: 700, color: 'var(--accent)' }}>{stat.value}</div>
          </div>
        ))}
      </section>

      <section style={{ padding: '10vh 10%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '5vh', borderBottom: '1px solid var(--border)', paddingBottom: '2rem' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '3rem', margin: 0 }}>Molecular Matrix</h2>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', opacity: 0.4 }}>PX-V1_COMPOUND_LIST.PDF</span>
        </div>
        
        <div style={{ width: '100%' }}>
          {COMPOUNDS.map(comp => (
            <div key={comp.id} onClick={() => toggleRow(comp.id)} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.3s', cursor: 'pointer', background: expandedRow === comp.id ? 'var(--bg2)' : 'transparent' }}>
              <div style={{ padding: '2.5rem 1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text2)', width: '10%' }}>{comp.id}</span>
                  <span style={{ fontSize: '1.4rem', fontWeight: 600, flex: 1 }}>{comp.name}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)', fontWeight: 700 }}>{comp.dose}</span>
                </div>
                <div style={{ 
                  maxHeight: expandedRow === comp.id ? '100px' : '0', 
                  overflow: 'hidden', 
                  transition: 'all 0.5s ease', 
                  fontSize: '0.95rem', 
                  color: 'var(--text2)',
                  paddingTop: expandedRow === comp.id ? '1rem' : '0',
                  opacity: expandedRow === comp.id ? 1 : 0
                }}>
                  {comp.desc}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ background: 'var(--text)', color: 'var(--bg)', padding: '10vh 10%', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '5vw', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '3.5rem', lineHeight: 1, marginBottom: '2rem' }}>The grey market doesn't have to be grey.</h2>
          <p style={{ opacity: 0.6, marginBottom: '2rem', fontSize: '1.1rem' }}>
            Wir veröffentlichen das Certificate of Analysis für jede Charge. Wenn es nicht getestet ist, ist es nicht in unserem System.
          </p>
          <button style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', padding: '0.5rem 1.2rem', borderRadius: '100px', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            View Certificates
          </button>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '3rem', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', lineHeight: 1.8 }}>
          <span style={{ color: 'var(--accent)' }}>&gt; REPORT: 2026-B001</span><br />
          &gt; SPECTROMETRY: COMPLETE<br />
          &gt; HEAVY METALS: UNDETECTED<br />
          &gt; PURITY: 99.82%<br /><br />
          <span style={{ background: 'var(--accent)', color: '#fff', padding: '0.2rem 0.5rem' }}>STATUS: VERIFIED</span>
        </div>
      </section>

      <SkillLabModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
}
