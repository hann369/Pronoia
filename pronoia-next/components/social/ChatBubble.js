// components/social/ChatBubble.js
import React from 'react';

export default function ChatBubble({ message, isSelf, styles }) {
  const timestamp = message.timestamp 
    ? new Date(message.timestamp).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
    : '';

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

    return <p className={styles.bubbleText}>{message.text}</p>;
  };

  return (
    <div className={`${styles.bubbleWrapper} ${isSelf ? styles.bubbleSelf : styles.bubbleOther}`}>
      <div className={styles.bubble}>
        {!isSelf && <div className={styles.bubbleSender}>{message.senderName || 'Hacker'}</div>}
        
        {renderMessageContent()}
        
        <div className={styles.bubbleMeta}>
          <span className={styles.bubbleTime}>{timestamp}</span>
          <span className={styles.bubbleLock} title="Ende-zu-Ende verschlüsselt">🔒</span>
        </div>
      </div>
    </div>
  );
}
