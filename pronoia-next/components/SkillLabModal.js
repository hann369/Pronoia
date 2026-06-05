'use client';

import { useState } from 'react';
import { useProtocol } from '../hooks/useProtocol';

export default function SkillLabModal({ isOpen, onClose }) {
  const { profile, setAgentMsg } = useProtocol();
  const [isGenerating, setIsGenerating] = useState(false);
  const [contentHtml, setContentHtml] = useState(null);
  const [error, setError] = useState(null);

  const skill = profile?.skill || 'Allgemeine Produktivität';
  const level = profile?.skillLevel || 1;

  const generateMaterials = async () => {
    setIsGenerating(true);
    setError(null);
    setContentHtml(null);

    const prompt = `User lernt "${skill}" auf Level ${level}/10. 
    Erstelle 3 personalisierte Lernmaterialien für eine Deliberate Practice Session:
    1. Ein Theorie-Modul (Arbeitsblatt/Konzept)
    2. Ein Video-Link (Platzhalter YouTube)
    3. Eine spezifische praktische Übung, die den aktuellen Schwierigkeitsgrad herausfordert.
    
    Antworte in einem strukturierten HTML Format mit Icons. Sei motivierend und präzise. 
    WICHTIG: Nutze inline styles statt CSS Klassen für das Styling, damit es React-kompatibel ist. Keine Markdown-Formatierung wie \`\`\`html.`;

    try {
      const res = await fetch('/api/mistral', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          systemPrompt: "Du bist der Skill Lab Coach. Antworte in klarem, motivierendem Deutsch. Gib nur valides HTML zurück."
        })
      });

      const data = await res.json();
      if (!data.choices || !data.choices[0]) {
        throw new Error("Invalid response from Mistral");
      }

      let html = data.choices[0].message.content;
      html = html.replace(/```html/g, '').replace(/```/g, '').trim();
      
      setContentHtml(html);
    } catch (err) {
      console.error("[SkillLab] Error:", err);
      setError("Materialien konnten nicht generiert werden. Bitte Internetverbindung prüfen.");
    } finally {
      setIsGenerating(false);
    }
  };

  const completeSession = () => {
    // Basic XP award
    const xp = 150;
    setAgentMsg && setAgentMsg(`Skill Lab abgeschlossen. +${xp} XP.`);
    // In a full implementation we would call awardXP(150) here
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100000
    }}>
      <div style={{
        background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '12px',
        width: '90%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem',
        color: 'var(--text)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h2 style={{ fontFamily: 'var(--font-display)', margin: 0 }}>{skill} Lab</h2>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--accent)' }}>Lvl {level}</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text)', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
        </div>

        {!contentHtml && !isGenerating && !error && (
          <div style={{ textAlign: 'center', padding: '3rem 0' }}>
            <p style={{ marginBottom: '2rem', opacity: 0.8 }}>Bereit für die nächste Deliberate Practice Session?</p>
            <button onClick={generateMaterials} className="btn-10x btn-10x-solid" style={{ padding: '1rem 2rem', background: 'var(--accent, #d5b893)', color: '#000', border: 'none', borderRadius: '4px', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontWeight: 'bold' }}>
              GENERATE_NEURAL_PATHWAYS
            </button>
          </div>
        )}

        {isGenerating && (
          <div style={{ textAlign: 'center', padding: '4rem 0', fontFamily: 'var(--font-mono)' }}>
            <div className="agent-thinking-spinner" style={{ margin: '0 auto 1rem auto' }}></div>
            <p>GENERATING_NEURAL_PATHWAYS...</p>
            <p style={{ opacity: 0.5, fontSize: '0.8rem' }}>Analysiere Skill: {skill} (Lvl {level})</p>
          </div>
        )}

        {error && (
          <div style={{ border: '1px solid var(--red, #ff4d4d)', color: 'var(--red, #ff4d4d)', padding: '2rem', textAlign: 'center', borderRadius: '8px' }}>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⚠️</div>
            <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Sync Error</div>
            <div style={{ fontSize: '0.8rem', opacity: 0.8, marginBottom: '1.5rem' }}>{error}</div>
            <button onClick={generateMaterials} style={{ padding: '0.5rem 1rem', background: 'transparent', border: '1px solid var(--red, #ff4d4d)', color: 'var(--red, #ff4d4d)', borderRadius: '4px', cursor: 'pointer' }}>
              Erneut versuchen
            </button>
          </div>
        )}

        {contentHtml && (
          <div>
            <div dangerouslySetInnerHTML={{ __html: contentHtml }} style={{ lineHeight: 1.6, opacity: 0.9 }} />
            <button onClick={completeSession} style={{ marginTop: '3rem', width: '100%', padding: '1rem', background: 'var(--accent, #d5b893)', color: '#000', border: 'none', borderRadius: '4px', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontWeight: 'bold' }}>
              SESSION ABSCHLIESSEN (+150 XP)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
