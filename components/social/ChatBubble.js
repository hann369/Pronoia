// components/social/ChatBubble.js
import React from 'react';

export default function ChatBubble({ message, isSelf, styles }) {
  const timestamp = message.timestamp 
    ? new Date(message.timestamp).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
    : '';

  const isE2EError = message.text && message.text.includes('E2E-Schlüssel');
  // Messages without any cipher were delivered rules-protected but not E2E.
  const isPlainDelivery = !message.ciphertext && !message.enc && !isE2EError;

  const renderMessageContent = () => {
    if (message.type === 'stack-share') {
      try {
        const stackData = JSON.parse(message.text);
        return (
          <div className={styles.shareCard}>
            <div className={styles.shareCardHeader}>🧬 Geteilter Bio-Stack</div>
            <div className={styles.shareCardBody}>
              {stackData.map((item, idx) => (
                <div key={idx} className={styles.shareCardItem}>
                  <strong>{item.name}</strong> - {item.dose} ({item.timing})
                </div>
              ))}
            </div>
          </div>
        );
      } catch (e) {
        return <p className={styles.bubbleText}>{message.text}</p>;
      }
    }

    if (message.type === 'compound-share') {
      try {
        const compound = JSON.parse(message.text);
        return (
          <div className={styles.shareCard}>
            <div className={styles.shareCardHeader}>🧪 Geteiltes Nootropikum</div>
            <div className={styles.shareCardBody}>
              <strong>{compound.name}</strong>
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.72rem', opacity: 0.85 }}>{compound.desc}</p>
            </div>
          </div>
        );
      } catch (e) {
        return <p className={styles.bubbleText}>{message.text}</p>;
      }
    }

    if (message.type === 'chess-invite') {
      try {
        const invite = JSON.parse(message.text);
        return (
          <div className={styles.shareCard} style={{
            background: 'rgba(124, 58, 237, 0.08)',
            border: '1px solid rgba(124, 58, 237, 0.3)',
            borderRadius: '8px',
            padding: '0.85rem 1rem'
          }}>
            <div className={styles.shareCardHeader} style={{ color: '#8B5CF6', marginBottom: '0.4rem' }}>
              ♟ Schach-Herausforderung
            </div>
            <div className={styles.shareCardBody}>
              <strong style={{ fontSize: '0.85rem' }}>{invite.title || 'Schach-Match'}</strong>
              <p style={{ margin: '0.3rem 0 0', fontSize: '0.72rem', opacity: 0.8, lineHeight: '1.4' }}>
                {invite.desc || 'Du wurdest zu einer Partie Schach herausgefordert.'}
              </p>
              <div style={{
                marginTop: '0.6rem',
                fontFamily: 'monospace',
                fontSize: '0.6rem',
                opacity: 0.45,
                letterSpacing: '0.04em'
              }}>
                Match ID: {invite.gameId}
              </div>
            </div>
          </div>
        );
      } catch (e) {
        return <p className={styles.bubbleText}>{message.text}</p>;
      }
    }

    if (isE2EError) {
      return (
        <p className={styles.bubbleText} style={{ color: 'var(--red, #ff4d4d)', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <span>⚠️</span>
          <span>{message.text}</span>
        </p>
      );
    }

    return <p className={styles.bubbleText}>{message.text}</p>;
  };

  return (
    <div className={`${styles.bubbleWrapper} ${isSelf ? styles.bubbleSelf : styles.bubbleOther}`}>
      <div className={styles.bubble} style={isE2EError ? { border: '1px dashed rgba(255, 77, 77, 0.4)', background: 'rgba(255, 77, 77, 0.05)' } : {}}>
        {!isSelf && <div className={styles.bubbleSender}>{message.senderName || 'Hacker'}</div>}
        
        {renderMessageContent()}
        
        <div className={styles.bubbleMeta}>
          <span className={styles.bubbleTime}>{timestamp}</span>
          <span
            className={styles.bubbleLock}
            title={isE2EError
              ? 'Entschlüsselung fehlgeschlagen'
              : isPlainDelivery
                ? 'Zugriffsgeschützt übertragen (nur Chat-Teilnehmer) — nicht Ende-zu-Ende verschlüsselt'
                : 'Ende-zu-Ende verschlüsselt'}
            style={isE2EError ? { color: 'var(--red, #ff4d4d)' } : {}}
          >
            {isE2EError ? '⚠️' : isPlainDelivery ? '🔓' : '🔒'}
          </span>
        </div>
      </div>
    </div>
  );
}
