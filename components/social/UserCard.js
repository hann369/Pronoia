// components/social/UserCard.js
import React from 'react';

export default function UserCard({ user, onAddFriend, onMessage, friendshipStatus, styles }) {
  const avatarPreset = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=200';
  const username = user?.profile?.username || 'BioHacker_Adekt';
  const avatar = user?.profile?.avatar || avatarPreset;
  const userClass = user?.profile?.class || 'Bio-Cognitive Adept';
  const hrv = user?.profile?.metrics?.hrv || 70;

  return (
    <div className={styles.userCard}>
      <div className={styles.userCardLeft}>
        <img src={avatar} alt={username} className={styles.userCardAvatar} />
        <div className={styles.userCardInfo}>
          <div className={styles.userCardName}>{username}</div>
          <div className={styles.userCardClass}>{userClass}</div>
          <div className={styles.userCardHrv}>HRV: {hrv}ms</div>
        </div>
      </div>
      <div className={styles.userCardActions}>
        {friendshipStatus === 'accepted' ? (
          <button className="btn btn-primary" onClick={onMessage} style={{ padding: '0.4rem 1rem', fontSize: '0.7rem' }}>
            💬 Chat
          </button>
        ) : friendshipStatus === 'pending' ? (
          <button className="btn btn-ghost" disabled style={{ padding: '0.4rem 1rem', fontSize: '0.7rem', opacity: 0.6 }}>
            ⌛ Wartend
          </button>
        ) : (
          <button className="btn btn-ghost" onClick={onAddFriend} style={{ padding: '0.4rem 1rem', fontSize: '0.7rem' }}>
            ⊕ Add
          </button>
        )}
      </div>
    </div>
  );
}
