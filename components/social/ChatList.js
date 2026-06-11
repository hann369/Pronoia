// components/social/ChatList.js
import React from 'react';

const HERMES_UID = 'hermes_agent_node';
const HERMES_AVATAR = 'https://api.dicebear.com/7.x/bottts/svg?seed=hermes';

function isHermesChat(chat) {
  return chat.type === 'direct' && (chat.participants || []).includes(HERMES_UID);
}

export default function ChatList({ conversations, onSelectChat, activeChatId, currentUserUid, onDeleteChat, styles }) {
  const avatarPreset = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=200';

  // Pin the Hermes companion chat to the top; keep time-sorted order otherwise.
  const sortedConversations = [...conversations].sort(
    (a, b) => (isHermesChat(b) ? 1 : 0) - (isHermesChat(a) ? 1 : 0)
  );

  const formatLastMsgTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const today = new Date();
    if (date.toDateString() === today.toDateString()) {
      return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
  };

  return (
    <div className={styles.chatList}>
      {sortedConversations.map(chat => {
        const isActive = chat.id === activeChatId;
        const isCompanion = isHermesChat(chat);
        const timeStr = chat.lastMessage ? formatLastMsgTime(chat.lastMessage.timestamp) : '';
        const isSelf = chat.lastMessage && chat.lastMessage.senderUid === currentUserUid;
        const previewText = chat.lastMessage
          ? (isSelf ? 'Du: ' : '') + ((chat.lastMessage.ciphertext || chat.lastMessage.enc) ? '🔒 Verschlüsselt' : (chat.lastMessage.text || ''))
          : (isCompanion ? 'Dein KI-Begleiter. Frag mich etwas.' : 'Keine Nachrichten');

        return (
          <div
            key={chat.id}
            className={`${styles.chatListItem} ${isActive ? styles.chatListItemActive : ''} ${chat.hasUnread ? styles.chatListItemUnread : ''}`}
            onClick={() => onSelectChat(chat)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flex: 1, minWidth: 0 }}>
              <img
                src={chat.avatar || (isCompanion ? HERMES_AVATAR : avatarPreset)}
                alt={chat.title}
                className={styles.chatListAvatar}
              />
              <div className={styles.chatListInfo}>
                <div className={styles.chatListHeaderRow}>
                  <span className={styles.chatListTitle}>
                    {isCompanion ? 'Hermes' : chat.title}
                    {isCompanion && (
                      <span style={{
                        marginLeft: '0.5rem',
                        fontSize: '0.55rem',
                        fontFamily: 'var(--font-mono)',
                        letterSpacing: '0.1em',
                        color: 'var(--theme-accent, #1A6AFF)',
                        border: '1px solid var(--theme-accent-dim, rgba(26,106,255,0.25))',
                        borderRadius: '100px',
                        padding: '0.1rem 0.45rem',
                        verticalAlign: 'middle'
                      }}>
                        COMPANION
                      </span>
                    )}
                  </span>
                  <span className={styles.chatListTime}>{timeStr}</span>
                </div>
                <div className={styles.chatListPreviewRow}>
                  <span className={styles.chatListPreview}>{previewText}</span>
                  {chat.hasUnread && <span className={styles.unreadBadge}>⊕</span>}
                </div>
              </div>
            </div>

            {onDeleteChat && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm("Möchtest du diesen Chat wirklich unwiderruflich löschen? (Admin-Recht)")) {
                    onDeleteChat(chat.id);
                  }
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--red, #ff4d4d)',
                  cursor: 'pointer',
                  padding: '0.5rem',
                  fontSize: '0.85rem',
                  opacity: 0.6,
                  transition: 'opacity 0.2s',
                  marginLeft: '0.5rem'
                }}
                onMouseEnter={(e) => e.target.style.opacity = 1}
                onMouseLeave={(e) => e.target.style.opacity = 0.6}
                title="Chat löschen (Admin)"
              >
                ✕
              </button>
            )}
          </div>
        );
      })}
      {conversations.length === 0 && (
        <div className={styles.emptyState} style={{ textAlign: 'center', padding: '1.5rem 1rem' }}>
          <p style={{ margin: 0 }}>Keine Konversationen aktiv.</p>
          <p style={{ margin: '0.5rem 0 0', opacity: 0.7, fontSize: '0.8em' }}>
            Suche im Tab „Suchen&quot; nach Freunden (Username oder Telegram-ID) — oder adde
            <strong> hermes_agent_node</strong>, deinen KI-Begleiter.
          </p>
        </div>
      )}
    </div>
  );
}
