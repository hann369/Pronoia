// components/social/ChatList.js
import React from 'react';

export default function ChatList({ conversations, onSelectChat, activeChatId, currentUserUid, onDeleteChat, styles }) {
  const avatarPreset = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=200';

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
      {conversations.map(chat => {
        const isActive = chat.id === activeChatId;
        const timeStr = chat.lastMessage ? formatLastMsgTime(chat.lastMessage.timestamp) : '';
        const isSelf = chat.lastMessage && chat.lastMessage.senderUid === currentUserUid;
        const previewText = chat.lastMessage 
          ? (isSelf ? 'Du: ' : '') + (chat.lastMessage.ciphertext ? '🔒 Verschlüsselt' : (chat.lastMessage.text || ''))
          : 'Keine Nachrichten';

        return (
          <div
            key={chat.id}
            className={`${styles.chatListItem} ${isActive ? styles.chatListItemActive : ''} ${chat.hasUnread ? styles.chatListItemUnread : ''}`}
            onClick={() => onSelectChat(chat)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flex: 1, minWidth: 0 }}>
              <img
                src={chat.avatar || avatarPreset}
                alt={chat.title}
                className={styles.chatListAvatar}
              />
              <div className={styles.chatListInfo}>
                <div className={styles.chatListHeaderRow}>
                  <span className={styles.chatListTitle}>{chat.title}</span>
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
        <p className={styles.emptyState}>Keine Konversationen aktiv. Nutze die Suche, um Chats zu starten.</p>
      )}
    </div>
  );
}
