'use client';

import { Component } from 'react';

/*
 * Error boundary for the Skill Lab modal. A render throw inside the modal (e.g.
 * malformed curriculum/textbook data) would otherwise crash the whole React
 * tree — and because the broken state is persisted to profile.skillLabState,
 * reopening the modal would re-crash it. This boundary contains the failure and
 * offers a reset that clears the persisted Skill Lab state back to onboarding.
 */
export default class SkillLabErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, message: error?.message || 'Unbekannter Fehler' };
  }

  componentDidCatch(error, info) {
    console.error('[SkillLab] Render error caught by boundary:', error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, message: '' });
    this.props.onReset?.();
  };

  handleClose = () => {
    this.setState({ hasError: false, message: '' });
    this.props.onClose?.();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div
        style={{
          position: 'fixed', inset: 0, zIndex: 100000,
          background: 'rgba(6,5,9,0.85)', backdropFilter: 'blur(14px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem',
        }}
        onClick={this.handleClose}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            width: '100%', maxWidth: '440px', background: 'rgba(12,14,22,0.97)',
            border: '1px solid rgba(251,113,133,0.25)', borderRadius: '18px',
            padding: '2rem', color: '#fff', textAlign: 'center',
            boxShadow: '0 32px 64px rgba(0,0,0,0.6)',
          }}
        >
          <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>⚠️</div>
          <h2 style={{ fontSize: '1.2rem', margin: '0 0 0.5rem', fontWeight: 700 }}>
            Skill Lab konnte nicht geladen werden
          </h2>
          <p style={{ fontSize: '0.88rem', lineHeight: 1.6, color: 'rgba(255,255,255,0.6)', margin: '0 0 1.5rem' }}>
            Deine aktuelle Lab-Session enthält beschädigte Daten. Setze sie zurück, um neu zu starten —
            dein Profil und andere Daten bleiben erhalten.
          </p>
          <div style={{ display: 'flex', gap: '0.6rem' }}>
            <button
              onClick={this.handleClose}
              style={{
                flex: 1, padding: '0.7rem 1rem', background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px',
                color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', cursor: 'pointer',
              }}
            >
              Schließen
            </button>
            <button
              onClick={this.handleReset}
              style={{
                flex: 2, padding: '0.7rem 1rem', background: 'rgba(251,113,133,0.85)',
                border: 'none', borderRadius: '10px', color: '#fff', fontWeight: 600,
                fontSize: '0.85rem', cursor: 'pointer',
              }}
            >
              Skill Lab zurücksetzen
            </button>
          </div>
        </div>
      </div>
    );
  }
}
