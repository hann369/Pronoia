'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useForceDarkTheme } from '@/hooks/useForceDarkTheme';

const COMPOUNDS_BASE = [
  { id: 'C01', name: 'Creatin Monohydrat', doseBase: 3.0, maxDose: 6.0, unit: 'g', desc: 'Zelluläre ATP-Regeneration. Erhöht den zellulären Energie-Output während tiefen Fokus-Blöcken.' },
  { id: 'C02', name: 'Taurin', doseBase: 1.0, maxDose: 3.0, unit: 'g', desc: 'ZNS-Beruhigung. Moduliert GABA-Rezeptoren und verhindert Überreizung durch Koffein/Stimulation.' },
  { id: 'C03', name: 'Bromantane', doseBase: 25, maxDose: 75, unit: 'mg', desc: 'Dopamin-Synthese-Upregulation. Steigert die intrinsische Motivation und Ausdauer ohne adrenergen Crash.' },
  { id: 'C04', name: 'Magnesiumglycinat', doseBase: 200, maxDose: 500, unit: 'mg', desc: 'Senkung des Cortisolspiegels, Regulation der neuralen Erregung und Unterstützung der muskulären Entspannung.' }
];

const BATCHES = {
  '#001': { batchId: '#001', purity: '99.82%', spectrometry: 'COMPLETE', heavyMetals: 'UNDETECTED', status: 'VERIFIED', date: 'April 2026' },
  '#002': { batchId: '#002', purity: '99.78%', spectrometry: 'COMPLETE', heavyMetals: 'UNDETECTED', status: 'VERIFIED', date: 'Mai 2026' },
  '#003': { batchId: '#003', purity: '99.91%', spectrometry: 'COMPLETE', heavyMetals: 'UNDETECTED', status: 'VERIFIED', date: 'Juni 2026' }
};

export default function LabsPage() {
  useForceDarkTheme();
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [expandedRow, setExpandedRow] = useState(null);

  // Synergy Calculator States
  const [cognitiveLoad, setCognitiveLoad] = useState(50);
  const [physicalStress, setPhysicalStress] = useState(30);
  const [sleepDeficit, setSleepDeficit] = useState(20);

  // Batch Check States
  const [batchSearch, setBatchSearch] = useState('#003');
  const [activeBatch, setActiveBatch] = useState(BATCHES['#003']);
  const [batchError, setBatchError] = useState('');

  useEffect(() => {
    const handleMouseMove = (e) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 30;
      const y = (e.clientY / window.innerHeight - 0.5) * 30;
      setMousePos({ x, y });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const toggleRow = (id) => {
    setExpandedRow(prev => prev === id ? null : id);
  };

  // Calculate synergy dosages dynamically based on user parameters
  const calculatedDoses = useMemo(() => {
    const cogFactor = cognitiveLoad / 100;
    const physFactor = physicalStress / 100;
    const sleepFactor = sleepDeficit / 100;

    return {
      C01: (3.0 + cogFactor * 1.5 + physFactor * 1.5).toFixed(2), // Creatine (max 6.0g)
      C02: (1.0 + cogFactor * 1.5 + sleepFactor * 0.5).toFixed(2), // Taurine (max 3.0g)
      C03: Math.round(25 + cogFactor * 30 + physFactor * 20),      // Bromantane (max 75mg)
      C04: Math.round(200 + physFactor * 150 + sleepFactor * 150)  // Magnesium (max 500mg)
    };
  }, [cognitiveLoad, physicalStress, sleepDeficit]);

  const handleBatchSearch = (e) => {
    e.preventDefault();
    const query = batchSearch.trim();
    const formatted = query.startsWith('#') ? query : `#${query}`;

    if (BATCHES[formatted]) {
      setActiveBatch(BATCHES[formatted]);
      setBatchError('');
    } else {
      setBatchError(`Batch ${query} nicht im Verzeichnis gefunden.`);
    }
  };

  return (
    <div className="bg-[#060509] text-[#F9F9F9] min-h-screen selection:bg-purple-600/30 selection:text-white overflow-x-hidden font-sans relative">
      
      {/* Background Glows */}
      <div
        className="indigo-glow absolute -top-[20%] -right-[10%] pointer-events-none z-0 w-[60vw] h-[60vw] rounded-full transition-transform duration-300 ease-out"
        style={{
          background: 'radial-gradient(circle, rgba(139, 92, 246, 0.12) 0%, rgba(139, 92, 246, 0) 70%)',
          transform: `translate(${mousePos.x}px, ${mousePos.y}px)`
        }}
      />
      <div
        className="indigo-glow absolute bottom-[0%] -left-[10%] pointer-events-none z-0 w-[60vw] h-[60vw] rounded-full transition-transform duration-300 ease-out"
        style={{
          background: 'radial-gradient(circle, rgba(139, 92, 246, 0.12) 0%, rgba(139, 92, 246, 0) 70%)',
          transform: `translate(${-mousePos.x}px, ${-mousePos.y}px)`
        }}
      />

      <main className="relative z-10 pt-32 pb-24 px-8 max-w-screen-2xl mx-auto">
        
        {/* Hero Section */}
        <section className="mb-24 text-center md:text-left max-w-4xl">
          <span className="font-mono text-xs tracking-[0.24em] uppercase text-[#8B5CF6] mb-6 block opacity-80">
            PRONOIA LABS · MOLECULAR ARCHITECTURE &amp; NOOTROPICS
          </span>
          <h1 className="font-serif text-6xl md:text-8xl font-light leading-tight text-[#F9F9F9] mb-8">
            Evidenzbasierte <br /><span className="italic text-[#8B5CF6]/80">Neuro-Chemie.</span>
          </h1>
          <p className="text-xl md:text-2xl text-[#F9F9F9]/60 font-light leading-relaxed max-w-2xl mb-12">
            Wir bieten reine, von Drittanbietern getestete Wirkstoffe zur Optimierung der kognitiven Kapazität – ohne Crash oder Abhängigkeit.
          </p>
          <div className="flex flex-wrap gap-6 justify-center md:justify-start">
            <a href="#matrix" className="px-8 py-4 bg-[#8B5CF6] text-white font-mono text-sm tracking-[0.14em] uppercase transition-all hover:shadow-[0_0_30px_rgba(139,92,246,0.3)] decoration-none">
              Synergy Matrix
            </a>
            <a href="#checker" className="px-8 py-4 border border-white/10 hover:bg-white/5 transition-all text-[#F9F9F9] font-mono text-sm tracking-[0.14em] uppercase decoration-none">
              Batch Verification
            </a>
          </div>
        </section>

        {/* Content Grid (Bento) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 mb-20">
          
          {/* Product Showcase for PX-V1 */}
          <div className="md:col-span-7 bg-white/[0.03] border border-white/10 rounded-xl p-8 overflow-hidden relative group hover:border-purple-500/40 hover:bg-purple-900/[0.02] transition-all duration-500">
            <div className="flex flex-col md:flex-row gap-12 items-center">
              <div className="w-full md:w-1/2 relative">
                <div className="absolute -inset-4 bg-purple-500/20 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>
                {/* Product visual — on-brand placeholder (mockup CDN bottle was ephemeral) */}
                <div className="relative z-10 aspect-[3/4] w-full rounded-2xl border border-white/10 bg-gradient-to-b from-[#8B5CF6]/15 via-white/[0.03] to-transparent flex flex-col items-center justify-center gap-4 drop-shadow-2xl transition-transform duration-500 group-hover:scale-105 overflow-hidden">
                  <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(circle at 50% 35%, rgba(139,92,246,0.35) 0%, transparent 60%)' }} />
                  <span className="material-symbols-outlined text-[#8B5CF6] relative z-10" style={{ fontSize: '4rem' }}>science</span>
                  <span className="font-mono text-[10px] tracking-[0.3em] uppercase text-white/50 relative z-10">PX-V1</span>
                </div>
              </div>
              <div className="w-full md:w-1/2">
                <span className="font-mono text-[10px] tracking-[0.2em] text-[#8B5CF6]/60 uppercase mb-2 block">Premium Matrix</span>
                <h2 className="font-serif text-4xl mb-6">PX-V1 Compound</h2>
                
                {/* Dynamically synchronized ingredients */}
                <div className="space-y-4 mb-10">
                  <div className="flex justify-between items-center border-b border-white/5 pb-2">
                    <span className="font-mono text-xs uppercase text-[#F9F9F9]/40">Creatine</span>
                    <span className="font-mono text-xs text-white font-bold">{calculatedDoses.C01}g</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-white/5 pb-2">
                    <span className="font-mono text-xs uppercase text-[#F9F9F9]/40">Taurine</span>
                    <span className="font-mono text-xs text-white font-bold">{calculatedDoses.C02}g</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-white/5 pb-2">
                    <span className="font-mono text-xs uppercase text-[#F9F9F9]/40">Bromantane</span>
                    <span className="font-mono text-xs text-[#8B5CF6] font-bold">{calculatedDoses.C03}mg</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-white/5 pb-2">
                    <span className="font-mono text-xs uppercase text-[#F9F9F9]/40">Magnesium Glycinate</span>
                    <span className="font-mono text-xs text-white font-bold">{calculatedDoses.C04}mg</span>
                  </div>
                </div>
                
                <Link
                  href="/store"
                  className="w-full py-4 border border-purple-500/40 hover:bg-[#8B5CF6]/10 transition-all text-[#8B5CF6] font-mono text-xs tracking-[0.2em] uppercase text-center block decoration-none"
                >
                  Im Abonnement sichern
                </Link>
              </div>
            </div>
          </div>

          {/* Pharmacokinetic Curve */}
          <div className="md:col-span-5 bg-white/[0.03] border border-white/10 rounded-xl p-8 relative flex flex-col hover:border-purple-500/40 hover:bg-purple-900/[0.02] transition-all duration-500">
            <div className="mb-8">
              <span className="font-mono text-[10px] tracking-[0.2em] text-[#8B5CF6]/60 uppercase mb-2 block">Kinetics &amp; Bioavailability</span>
              <h3 className="font-serif text-2xl">Plasma Concentration</h3>
            </div>
            
            {/* SVG Plot */}
            <div
              className="flex-grow relative rounded-lg border border-white/5 overflow-hidden min-h-[200px]"
              style={{
                backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px)',
                backgroundSize: '40px 40px'
              }}
            >
              <svg className="absolute inset-0 w-full h-full p-4 overflow-visible" viewBox="0 0 400 200">
                <path
                  className="drop-shadow-[0_0_10px_rgba(139,92,246,0.6)]"
                  d="M 0 180 C 40 180, 60 20, 100 20 C 180 20, 220 120, 400 120"
                  fill="none"
                  stroke="#8B5CF6"
                  strokeLinecap="round"
                  strokeWidth="3"
                >
                  <animate attributeName="stroke-dasharray" dur="2.5s" fill="freeze" from="0,1000" to="1000,0"></animate>
                </path>
                <circle className="animate-pulse" cx="100" cy="20" fill="#8B5CF6" r="4"></circle>
              </svg>
              <div className="absolute bottom-4 left-4 font-mono text-[9px] text-white/30">0H</div>
              <div className="absolute bottom-4 left-1/4 font-mono text-[9px] text-white/30">2H</div>
              <div className="absolute bottom-4 left-1/2 font-mono text-[9px] text-white/30">6H</div>
              <div className="absolute bottom-4 right-4 font-mono text-[9px] text-white/30">12H</div>
            </div>
            <p className="mt-6 text-sm text-[#F9F9F9]/40 font-light leading-relaxed">
              Visualisierung der kognitiven und motivationalen Modulation durch synaptische Upregulation über einen Zeitraum von 12 Stunden.
            </p>
          </div>
          
        </div>

        {/* Synergy Matrix & Sliders */}
        <section id="matrix" className="mb-20 pt-10 border-t border-white/5">
          <div className="text-center mb-12">
            <span className="font-mono text-xs text-[#8B5CF6] tracking-[0.2em] uppercase">Adaptive Formulation Lab</span>
            <h2 className="font-serif text-4xl mt-2 font-light">Synergistischer Verhältnis-Rechner</h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Sliders Input */}
            <div className="lg:col-span-6 bg-white/[0.02] border border-white/5 rounded-2xl p-8 space-y-8">
              <h3 className="font-serif italic text-xl">System-Parameter kalibrieren</h3>
              
              <div className="space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between font-mono text-xs uppercase text-white/60">
                    <span>Kognitive Belastung</span>
                    <span className="text-[#8B5CF6] font-bold">{cognitiveLoad}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={cognitiveLoad}
                    onChange={e => setCognitiveLoad(parseInt(e.target.value))}
                    className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#8B5CF6]"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between font-mono text-xs uppercase text-white/60">
                    <span>Physischer Stress</span>
                    <span className="text-[#8B5CF6] font-bold">{physicalStress}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={physicalStress}
                    onChange={e => setPhysicalStress(parseInt(e.target.value))}
                    className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#8B5CF6]"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between font-mono text-xs uppercase text-white/60">
                    <span>Schlafdefizit</span>
                    <span className="text-[#8B5CF6] font-bold">{sleepDeficit}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={sleepDeficit}
                    onChange={e => setSleepDeficit(parseInt(e.target.value))}
                    className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#8B5CF6]"
                  />
                </div>
              </div>
            </div>

            {/* Live Output */}
            <div className="lg:col-span-6 bg-white/[0.02] border border-white/5 rounded-2xl p-8">
              <h3 className="font-serif italic text-xl mb-6">Optimiertes Bio-Stack Verhältnis</h3>
              <div className="space-y-6">
                {COMPOUNDS_BASE.map(comp => {
                  const dose = calculatedDoses[comp.id] || comp.doseBase;
                  const ratio = Math.min(100, (dose / comp.maxDose) * 100);
                  return (
                    <div key={comp.id} className="space-y-2">
                      <div className="flex justify-between font-mono text-xs">
                        <span className="text-white/80">{comp.name}</span>
                        <span className="text-[#8B5CF6] font-bold">{dose}{comp.unit}</span>
                      </div>
                      <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#8B5CF6] transition-all duration-300 shadow-[0_0_10px_#8B5CF6]"
                          style={{ width: `${ratio}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </section>

        {/* Molecular Matrix Table */}
        <section className="mb-20">
          <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-8">
            <h2 className="font-serif text-3xl font-light">Molecular Matrix</h2>
            <span className="font-mono text-xs text-white/30">PX-V1_COMPOUND_LIST.JSON</span>
          </div>

          <div className="space-y-3">
            {COMPOUNDS_BASE.map(comp => (
              <div
                key={comp.id}
                className="bg-white/[0.02] border border-white/5 rounded-xl transition-all duration-300 cursor-pointer overflow-hidden"
                style={{
                  borderColor: expandedRow === comp.id ? 'rgba(139, 92, 246, 0.4)' : 'rgba(255, 255, 255, 0.05)',
                  background: expandedRow === comp.id ? 'rgba(139, 92, 246, 0.02)' : 'rgba(255, 255, 255, 0.02)'
                }}
                onClick={() => toggleRow(comp.id)}
              >
                <div className="p-5 flex justify-between items-center select-none">
                  <div className="flex items-center gap-4">
                    <span className="font-mono text-sm text-[#8B5CF6] font-bold">{comp.id}</span>
                    <span className="font-serif text-lg text-white/95">{comp.name}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-mono text-xs text-white/40">{comp.maxDose}{comp.unit} Max</span>
                    <span className="material-symbols-outlined text-white/40 transition-transform duration-300" style={{ transform: expandedRow === comp.id ? 'rotate(180deg)' : 'none' }}>
                      expand_more
                    </span>
                  </div>
                </div>
                {expandedRow === comp.id && (
                  <div className="px-5 pb-5 pt-1 text-sm text-white/60 leading-relaxed font-light border-t border-white/5">
                    {comp.desc}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Batch Spectrometry Checker */}
        <section id="checker" className="mb-20 pt-10 border-t border-white/5">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            <div className="lg:col-span-5 space-y-6">
              <span className="font-mono text-xs text-[#8B5CF6] tracking-[0.2em] uppercase block">Purity &amp; Quality</span>
              <h2 className="font-serif text-4xl font-light leading-tight">Zertifikat-Verifikation</h2>
              <p className="text-white/60 leading-relaxed font-light">
                Gib deine Chargennummer ein, um die Laborergebnisse einzusehen. Wir validieren jede Charge durch GC-MS &amp; ICP-MS Analysen von unabhängigen Drittlaboren.
              </p>
              
              <form onSubmit={handleBatchSearch} className="flex gap-2 bg-white/5 border border-white/10 p-1.5 rounded-lg focus-within:border-[#8B5CF6] transition-colors">
                <input
                  type="text"
                  placeholder="Chargennummer (z.B. #003)"
                  value={batchSearch}
                  onChange={e => setBatchSearch(e.target.value)}
                  className="bg-transparent border-none focus:ring-0 text-sm font-mono flex-1 outline-none px-2"
                />
                <button type="submit" className="bg-[#8B5CF6] text-white px-5 py-2 rounded-md font-mono text-xs uppercase tracking-wider hover:bg-[#8B5CF6]/90 transition-all">
                  Prüfen
                </button>
              </form>
            </div>

            <div className="lg:col-span-7">
              {batchError ? (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-8 rounded-xl font-mono text-sm">
                  ⚠️ {batchError}
                </div>
              ) : (
                <div className="bg-white/[0.02] border border-white/10 rounded-xl p-8 relative overflow-hidden flex flex-col md:flex-row justify-between items-center gap-8">
                  <div className="space-y-4 flex-1 w-full">
                    <div className="flex justify-between items-center border-b border-white/5 pb-2">
                      <span className="text-white/40 text-xs font-mono">Batch ID</span>
                      <span className="text-[#8B5CF6] font-mono font-bold">{activeBatch.batchId}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-white/5 pb-2">
                      <span className="text-white/40 text-xs font-mono">Synthese-Datum</span>
                      <span className="text-white/80 text-xs font-mono">{activeBatch.date}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-white/5 pb-2">
                      <span className="text-white/40 text-xs font-mono">Spectrometry Check</span>
                      <span className="text-green-400 text-xs font-mono font-bold">{activeBatch.spectrometry}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-white/5 pb-2">
                      <span className="text-white/40 text-xs font-mono">Heavy Metals Check</span>
                      <span className="text-green-400 text-xs font-mono font-bold">{activeBatch.heavyMetals}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-white/5 pb-2">
                      <span className="text-white/40 text-xs font-mono">Purity Index</span>
                      <span className="text-[#8B5CF6] font-mono font-bold">{activeBatch.purity}</span>
                    </div>
                    <div className="text-center pt-2">
                      <span className="bg-green-500/10 border border-green-500/20 text-green-400 px-3 py-1 rounded font-mono text-xs uppercase tracking-wider">
                        STATUS: {activeBatch.status}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col items-center gap-4 bg-white/[0.02] p-6 rounded-xl border border-white/5">
                    <div className="w-24 h-24 bg-white/5 rounded-lg flex items-center justify-center relative p-2 overflow-hidden">
                      <div className="w-full h-full opacity-20" style={{ backgroundImage: 'radial-gradient(#F9F9F9 1px, transparent 1px)', backgroundSize: '8px 8px;' }}></div>
                      <span className="material-symbols-outlined absolute text-[#8B5CF6] text-3xl">qr_code_2</span>
                    </div>
                    <p className="font-mono text-[9px] text-center text-[#F9F9F9]/40 uppercase tracking-[0.2em] leading-normal">
                      Scan for Instant <br />Lab Results
                    </p>
                  </div>
                </div>
              )}
            </div>

          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="bg-[#060509] w-full py-16 px-8 border-t border-white/5">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 max-w-screen-2xl mx-auto">
          <div className="space-y-6">
            <div className="font-serif text-xl font-light tracking-widest text-[#F9F9F9]">PRONOIA LABS</div>
            <p className="font-mono text-xs tracking-[0.2em] uppercase text-[#F9F9F9]/40 leading-loose">
              © 2024 PRONOIA LABS. <br />BIOTECHNOLOGICAL OPTIMIZATION.
            </p>
          </div>
          <div>
            <h4 className="font-mono text-xs tracking-[0.2em] uppercase text-[#8B5CF6] mb-8">Navigation</h4>
            <ul className="space-y-4 list-none p-0">
              <li><a className="font-mono text-xs tracking-[0.2em] uppercase text-[#F9F9F9]/40 hover:text-[#F9F9F9] transition-colors duration-300 inline-block decoration-none" href="#">Quality Standards</a></li>
              <li><a className="font-mono text-xs tracking-[0.2em] uppercase text-[#F9F9F9]/40 hover:text-[#F9F9F9] transition-colors duration-300 inline-block decoration-none" href="#">Certificates</a></li>
              <li><a className="font-mono text-xs tracking-[0.2em] uppercase text-[#F9F9F9]/40 hover:text-[#F9F9F9] transition-colors duration-300 inline-block decoration-none" href="#">Research Papers</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-mono text-xs tracking-[0.2em] uppercase text-[#8B5CF6] mb-8">Legal</h4>
            <ul className="space-y-4 list-none p-0">
              <li><a className="font-mono text-xs tracking-[0.2em] uppercase text-[#F9F9F9]/40 hover:text-[#F9F9F9] transition-colors duration-300 inline-block decoration-none" href="#">Privacy Policy</a></li>
              <li><a className="font-mono text-xs tracking-[0.2em] uppercase text-[#F9F9F9]/40 hover:text-[#F9F9F9] transition-colors duration-300 inline-block decoration-none" href="#">Terms of Service</a></li>
            </ul>
          </div>
          <div className="space-y-6">
            <h4 className="font-mono text-xs tracking-[0.2em] uppercase text-[#8B5CF6] mb-8">Newsletter</h4>
            <div className="flex border-b border-white/10 pb-2">
              <input className="bg-transparent border-none focus:ring-0 text-sm font-light w-full placeholder:text-white/20 outline-none" placeholder="Email Adresse" type="email" />
              <button className="text-[#8B5CF6] hover:text-white transition-colors bg-transparent border-none cursor-pointer">
                <span className="material-symbols-outlined">arrow_forward</span>
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
