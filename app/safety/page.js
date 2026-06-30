'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useForceDarkTheme } from '@/hooks/useForceDarkTheme';

export default function SafetyPage() {
  useForceDarkTheme();
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [inhaltsblocker, setInhaltsblocker] = useState(true);
  const [communityScanner, setCommunityScanner] = useState(true);
  const [distractionFilter, setDistractionFilter] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 20;
      const y = (e.clientY / window.innerHeight - 0.5) * 20;
      setMousePos({ x, y });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className="bg-[#060509] text-[#f8fafc] min-h-screen selection:bg-cyan-500/30 selection:text-cyan-200 overflow-x-hidden font-sans">
      <main className="relative pt-32 pb-24">
        {/* Hero Ambient Glows */}
        <div
          className="absolute top-0 left-1/2 w-[800px] h-[600px] pointer-events-none -z-10 transition-transform duration-300 ease-out"
          style={{
            background: 'radial-gradient(circle at 50% 50%, rgba(34, 211, 238, 0.08) 0%, transparent 70%)',
            transform: `translate(calc(-50% + ${mousePos.x}px), ${mousePos.y}px)`
          }}
        />

        {/* Hero Section */}
        <section className="max-w-5xl mx-auto px-6 text-center mb-24">
          <span className="font-mono uppercase tracking-[0.2em] text-xs text-cyan-400 block mb-6">
            PRONOIA SAFETY · COGNITIVE SHIELD &amp; EXTENSION
          </span>
          <h1 className="font-serif text-5xl md:text-7xl font-light tracking-tight mb-8 leading-tight">
            Dein digitaler <span className="italic">Schutzschild.</span>
          </h1>
          <p className="max-w-2xl mx-auto text-lg text-white/60 leading-relaxed font-light mb-12">
            Eine erstklassige Browser-Erweiterung, die explizite Inhalte blockiert, Communitys auf Plattformen wie Reddit und Discord scannt und deine Willenskraft vor digitaler Reibung schützt.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="/pronoia-safety.zip"
              download
              className="w-full sm:w-auto bg-cyan-400 text-[#060509] px-8 py-4 rounded-xl font-semibold hover:bg-cyan-300 transition-all duration-300 shadow-lg shadow-cyan-500/20 active:scale-95 text-center decoration-none"
            >
              📥 Pronoia Safety (.zip) laden
            </a>
          </div>
          <span className="block text-white/40 font-mono text-[10px] uppercase tracking-widest mt-4">
            ZIP-Format — Ca. 24 KB — Local database rules v0.2.0
          </span>
        </section>

        {/* Extension Preview */}
        <section className="max-w-6xl mx-auto px-6 mb-32 relative">
          <div
            className="absolute -bottom-20 left-1/2 w-[1000px] h-[400px] pointer-events-none -z-10 transition-transform duration-300 ease-out"
            style={{
              background: 'radial-gradient(circle at 50% 50%, rgba(34, 211, 238, 0.08) 0%, transparent 70%)',
              transform: `translate(calc(-50% + ${mousePos.x * 0.8}px), ${mousePos.y * 0.8}px)`
            }}
          />
          <div
            className="bg-white/[0.03] backdrop-blur-[20px] p-1 rounded-[2rem] relative overflow-hidden"
            style={{
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 0 40px -10px rgba(34, 211, 238, 0.3)'
            }}
          >
            <div className="bg-[#060509]/40 rounded-[1.8rem] p-8 md:p-12 flex flex-col md:flex-row gap-12 items-center">
              {/* Left: Extension Mockup UI */}
              <div className="w-full md:w-1/2">
                <div className="bg-[#080a0f] border border-white/10 rounded-2xl p-6 shadow-2xl relative">
                  {/* Extension Header */}
                  <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/5">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-cyan-500 rounded-lg flex items-center justify-center">
                        <span className="material-symbols-outlined text-[#060509] text-lg font-bold">shield</span>
                      </div>
                      <span className="font-mono text-xs uppercase tracking-widest text-white/80">Pronoia v2.4</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
                      <span className="font-mono text-[10px] text-cyan-400 uppercase">Aktiv</span>
                    </div>
                  </div>
                  {/* Main Status */}
                  <div className="text-center mb-10">
                    <div className="text-4xl font-serif italic mb-2">Scan läuft...</div>
                    <div className="text-white/40 text-xs font-mono tracking-tighter">KEINE BEDROHUNGEN GEFUNDEN</div>
                  </div>
                  {/* Toggles Stack */}
                  <div className="space-y-3">
                    <div
                      onClick={() => setInhaltsblocker(!inhaltsblocker)}
                      className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 cursor-pointer hover:bg-white/10 transition-colors"
                    >
                      <span className="text-sm font-medium">Inhaltsblocker</span>
                      <div className={`w-10 h-5 rounded-full relative transition-colors ${inhaltsblocker ? 'bg-cyan-500' : 'bg-white/20'}`}>
                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${inhaltsblocker ? 'right-1' : 'left-1'}`} />
                      </div>
                    </div>
                    <div
                      onClick={() => setCommunityScanner(!communityScanner)}
                      className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 cursor-pointer hover:bg-white/10 transition-colors"
                    >
                      <span className="text-sm font-medium">Community Scanner</span>
                      <div className={`w-10 h-5 rounded-full relative transition-colors ${communityScanner ? 'bg-cyan-500' : 'bg-white/20'}`}>
                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${communityScanner ? 'right-1' : 'left-1'}`} />
                      </div>
                    </div>
                    <div
                      onClick={() => setDistractionFilter(!distractionFilter)}
                      className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 cursor-pointer hover:bg-white/10 transition-colors"
                    >
                      <span className="text-sm font-medium">Ablenkungs-Filter</span>
                      <div className={`w-10 h-5 rounded-full relative transition-colors ${distractionFilter ? 'bg-cyan-500' : 'bg-white/20'}`}>
                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${distractionFilter ? 'right-1' : 'left-1'}`} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {/* Right: Quick Metrics */}
              <div className="w-full md:w-1/2 space-y-8">
                <div>
                  <h3 className="font-serif text-3xl mb-4 italic">Volle Kontrolle.</h3>
                  <p className="text-white/50 font-light leading-relaxed">
                    Überwache deinen Schutzstatus in Echtzeit. Unsere KI-gestützte Scan-Engine arbeitet im Hintergrund, ohne die Performance deines Browsers zu beeinträchtigen.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-6 rounded-2xl bg-cyan-400/5 border border-cyan-400/20">
                    <div className="text-cyan-400 font-mono text-xs uppercase mb-2">Blockiert</div>
                    <div className="text-3xl font-serif font-light">124</div>
                    <div className="text-white/30 text-[10px] uppercase tracking-widest mt-1">Gefahren</div>
                  </div>
                  <div className="p-6 rounded-2xl bg-cyan-400/5 border border-cyan-400/20">
                    <div className="text-cyan-400 font-mono text-xs uppercase mb-2">Fokus-Zeit</div>
                    <div className="text-3xl font-serif font-light">+4h</div>
                    <div className="text-white/30 text-[10px] uppercase tracking-widest mt-1">Gewonnen</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Matrix */}
        <section className="max-w-7xl mx-auto px-6 mb-32">
          <div className="text-center mb-16">
            <span className="font-mono text-xs text-cyan-400 uppercase tracking-[0.3em]">System-Spezifikationen</span>
            <h2 className="font-serif text-4xl mt-4 font-light">Präzision in jedem Detail.</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Card 1 */}
            <div className="bg-white/[0.03] border border-white/10 p-8 rounded-2xl hover:bg-white/[0.06] transition-all duration-500 group">
              <div className="w-12 h-12 bg-cyan-500/10 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-cyan-400">dns</span>
              </div>
              <h4 className="font-serif text-xl mb-4 italic">Domain-Blocklist</h4>
              <p className="text-sm text-white/50 leading-relaxed">
                Blockiert Adult-Inhalte auf DNS-Ebene, bevor sie geladen werden. Ein unsichtbarer Wall gegen digitale Versuchungen.
              </p>
            </div>
            {/* Card 2 */}
            <div className="bg-white/[0.03] border border-white/10 p-8 rounded-2xl hover:bg-white/[0.06] transition-all duration-500 group">
              <div className="w-12 h-12 bg-cyan-500/10 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-cyan-400">terminal</span>
              </div>
              <h4 className="font-serif text-xl mb-4 italic">Keyword-Scanner</h4>
              <p className="text-sm text-white/50 leading-relaxed">
                Echtzeit-Analyse von URLs und Seiteninhalten auf kritische Begriffe. Dynamische Filterung für maximale Sicherheit.
              </p>
            </div>
            {/* Card 3 */}
            <div className="bg-white/[0.03] border border-white/10 p-8 rounded-2xl hover:bg-white/[0.06] transition-all duration-500 group">
              <div className="w-12 h-12 bg-cyan-500/10 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-cyan-400">groups</span>
              </div>
              <h4 className="font-serif text-xl mb-4 italic">Community Filter</h4>
              <p className="text-sm text-white/50 leading-relaxed">
                Automatisierte Erkennung und Warnung vor riskanten Reddit-Subreddits und Discord-Servern. Schütze dein Umfeld.
              </p>
            </div>
            {/* Card 4 */}
            <div className="bg-white/[0.03] border border-white/10 p-8 rounded-2xl hover:bg-white/[0.06] transition-all duration-500 group">
              <div className="w-12 h-12 bg-cyan-500/10 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-cyan-400">admin_panel_settings</span>
              </div>
              <h4 className="font-serif text-xl mb-4 italic">Parental Dashboard</h4>
              <p className="text-sm text-white/50 leading-relaxed">
                Passwortschutz, E-Mail-Warnungen und volle administrative Kontrolle über alle Sicherheitseinstellungen.
              </p>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="max-w-5xl mx-auto px-6 mb-20 text-center relative">
          <div className="bg-white/[0.03] border border-white/10 p-16 rounded-[3rem] overflow-hidden relative">
            <div className="absolute inset-0 radial-gradient-bg opacity-30 -z-10"></div>
            <h2 className="font-serif text-4xl md:text-5xl mb-8 font-light">Bereit für ein reineres Web?</h2>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
              <a
                href="/pronoia-safety.zip"
                download
                className="bg-cyan-400 text-[#060509] px-10 py-5 rounded-full font-bold hover:bg-cyan-300 transition-all duration-300 decoration-none"
              >
                Jetzt kostenlos installieren
              </a>
              <Link
                href="/"
                className="text-cyan-400 font-mono text-xs uppercase tracking-widest border-b border-cyan-400/30 hover:border-cyan-400 transition-all pb-1 decoration-none"
              >
                Zurück zur Hauptseite
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full py-12 px-6 bg-[#060509] border-t border-white/5">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8 max-w-7xl mx-auto text-center md:text-left">
          <div className="space-y-4">
            <div className="font-serif text-lg text-white">PRONOIA SAFETY</div>
            <div className="font-mono uppercase text-[10px] tracking-widest text-white/40">
              © 2024 PRONOIA SAFETY. THE VAULT AWAITS.
            </div>
          </div>
          <nav className="flex flex-wrap justify-center gap-8">
            <a className="font-mono uppercase text-[10px] tracking-widest text-white/40 hover:text-cyan-400 transition-colors" href="#">Privacy Policy</a>
            <a className="font-mono uppercase text-[10px] tracking-widest text-white/40 hover:text-cyan-400 transition-colors" href="#">Terms of Service</a>
            <a className="font-mono uppercase text-[10px] tracking-widest text-white/40 hover:text-cyan-400 transition-colors" href="#">Security Audit</a>
            <a className="font-mono uppercase text-[10px] tracking-widest text-white/40 hover:text-cyan-400 transition-colors" href="#">Contact Support</a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
