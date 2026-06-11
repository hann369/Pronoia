// components/social/SocialHub.js
import React, { useState, useEffect, useRef } from 'react';
import { useSocial } from '@/hooks/useSocial';
import { useChat } from '@/hooks/useChat';
import { useAuth } from '@/context/AuthContext';
import ChatList from './ChatList';
import ChatBubble from './ChatBubble';
import UserCard from './UserCard';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import styles from './SocialHub.module.css';

export default function SocialHub({ setActiveTab, stack }) {
  const { user, role } = useAuth();
  const {
    friends,
    pendingRequests,
    sentRequests,
    searchResults,
    searching,
    searchUsers,
    sendFriendRequest,
    acceptFriendRequest,
    declineFriendRequest
  } = useSocial();

  const {
    conversations,
    activeChatMessages,
    loadingChats,
    createDirectChat,
    createGroupChat,
    listenToMessages,
    sendMessage,
    resetE2EKeys,
    exportE2EPrivateKey,
    importE2EPrivateKey
  } = useChat();

  const [socialTab, setSocialTab] = useState('chats'); // 'chats' | 'friends' | 'requests' | 'search' | 'e2e'
  const [selectedChat, setSelectedChat] = useState(null);
  const [msgInput, setMsgInput] = useState('');
  const [searchVal, setSearchVal] = useState('');
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedGroupMembers, setSelectedGroupMembers] = useState([]);

  // E2E Key Management States
  const [myPublicKeyJwk, setMyPublicKeyJwk] = useState(null);
  const [exportedKey, setExportedKey] = useState('');
  const [importKeyInput, setImportKeyInput] = useState('');
  const [keyStatusMsg, setKeyStatusMsg] = useState('');

  // Fetch own public key from Firestore to display its fingerprint
  useEffect(() => {
    async function fetchMyPublicKey() {
      if (!user || !db) return;
      try {
        const uDoc = await getDoc(doc(db, 'users', user.uid));
        if (uDoc.exists()) {
          setMyPublicKeyJwk(uDoc.data().publicKey?.jwk || null);
        }
      } catch (err) {
        console.error("Error fetching own public key:", err);
      }
    }
    if (user && (socialTab === 'e2e' || socialTab === 'chats')) {
      fetchMyPublicKey();
    }
  }, [user, socialTab]);

  const handleExportKeys = async () => {
    try {
      const keyStr = await exportE2EPrivateKey();
      if (keyStr) {
        setExportedKey(keyStr);
        setKeyStatusMsg('🔑 Private Key erfolgreich exportiert! Kopiere den Text unten.');
      } else {
        setKeyStatusMsg('❌ Export fehlgeschlagen. Kein privater Schlüssel vorhanden.');
      }
    } catch (err) {
      console.error(err);
      setKeyStatusMsg('❌ Export fehlgeschlagen: ' + err.message);
    }
  };

  const handleImportKeys = async (e) => {
    e.preventDefault();
    if (!importKeyInput.trim()) {
      alert("Bitte gib einen gültigen exportierten Schlüssel ein.");
      return;
    }
    try {
      const success = await importE2EPrivateKey(importKeyInput.trim());
      if (success) {
        setKeyStatusMsg('✅ Private Key erfolgreich importiert und synchronisiert!');
        setImportKeyInput('');
        // Refresh public key display
        const uDoc = await getDoc(doc(db, 'users', user.uid));
        if (uDoc.exists()) {
          setMyPublicKeyJwk(uDoc.data().publicKey?.jwk || null);
        }
      } else {
        setKeyStatusMsg('❌ Import fehlgeschlagen. Ungültiges Schlüsselformat.');
      }
    } catch (err) {
      console.error(err);
      setKeyStatusMsg('❌ Import fehlgeschlagen: ' + err.message);
    }
  };

  const handleResetKeys = async () => {
    if (!confirm("Möchtest du deine E2E-Schlüssel wirklich zurücksetzen? Alte Nachrichten können danach nicht mehr entschlüsselt werden. Ein neuer öffentlicher Schlüssel wird generiert und in Firestore hinterlegt.")) return;
    try {
      const success = await resetE2EKeys();
      if (success) {
        setKeyStatusMsg('✅ E2E-Schlüssel erfolgreich neu generiert!');
        // Refresh public key display
        const uDoc = await getDoc(doc(db, 'users', user.uid));
        if (uDoc.exists()) {
          setMyPublicKeyJwk(uDoc.data().publicKey?.jwk || null);
        }
      } else {
        setKeyStatusMsg('❌ Fehler beim Zurücksetzen der Schlüssel.');
      }
    } catch (err) {
      console.error(err);
      setKeyStatusMsg('❌ Fehler beim Zurücksetzen: ' + err.message);
    }
  };

  const chatMessagesEndRef = useRef(null);

  const handleToggleRole = async (targetUid, currentRole) => {
    if (role !== 'admin') return;
    try {
      const newRole = currentRole === 'admin' ? 'user' : 'admin';
      await setDoc(doc(db, 'users', targetUid), { role: newRole }, { merge: true });
      alert(`Rolle erfolgreich auf '${newRole}' aktualisiert! Bitte Suche erneut ausführen, um den Status anzuzeigen.`);
    } catch (e) {
      console.error(e);
      alert("Fehler beim Aktualisieren der Rolle: " + e.message);
    }
  };

  const handleDeleteChat = async (chatId) => {
    if (role !== 'admin') return;
    try {
      await deleteDoc(doc(db, 'chats', chatId));
      if (selectedChat?.id === chatId) {
        setSelectedChat(null);
      }
      alert("Chat erfolgreich gelöscht.");
    } catch (e) {
      console.error(e);
      alert("Fehler beim Löschen des Chats: " + e.message);
    }
  };

  const handleClearChat = async (chatId) => {
    if (!confirm("Möchtest du den gesamten Chat-Verlauf für diesen Chat unwiderruflich leeren?")) return;
    try {
      const msgsRef = collection(db, 'chats', chatId, 'messages');
      const snap = await getDocs(msgsRef);
      const deletePromises = snap.docs.map(d => deleteDoc(doc(db, 'chats', chatId, 'messages', d.id)));
      await Promise.all(deletePromises);
      alert("Chat-Verlauf erfolgreich geleert!");
    } catch (e) {
      console.error("Failed to clear chat:", e);
      alert("Fehler beim Leeren des Chats: " + e.message);
    }
  };

  // Auto-scroll chat messages to bottom
  useEffect(() => {
    if (chatMessagesEndRef.current) {
      chatMessagesEndRef.current.scrollTop = chatMessagesEndRef.current.scrollHeight;
    }
  }, [activeChatMessages]);

  // Load chat messages when a chat is selected
  useEffect(() => {
    if (selectedChat) {
      listenToMessages(selectedChat.id);
    }
  }, [selectedChat, listenToMessages]);

  // Search trigger
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    searchUsers(searchVal);
  };

  // Live search with 300ms debounce (avoids one Firestore query burst per keystroke)
  useEffect(() => {
    if (!searchVal.trim()) return;
    const timer = setTimeout(() => searchUsers(searchVal), 300);
    return () => clearTimeout(timer);
  }, [searchVal, searchUsers]);

  // Direct Message action from search/friend list
  const [startChatError, setStartChatError] = useState('');
  const handleStartChat = async (uid) => {
    setStartChatError('');
    const chatId = await createDirectChat(uid);
    if (chatId) {
      const isHermes = uid === 'hermes_agent_node';
      const chat = conversations.find(c => c.id === chatId) || {
        id: chatId,
        title: isHermes ? 'Hermes' : 'Chat wird geladen…',
        type: 'direct',
        participants: [user?.uid, uid]
      };
      setSelectedChat(chat);
      setSocialTab('chats');
    } else {
      setStartChatError('Chat konnte nicht erstellt werden. Prüfe deine Verbindung und versuche es erneut.');
    }
  };

  const [sendingMsg, setSendingMsg] = useState(false);
  const [sendError, setSendError] = useState('');
  const handleSendMsg = async (e) => {
    e.preventDefault();
    if (!msgInput.trim() || !selectedChat || sendingMsg) return;
    setSendingMsg(true);
    setSendError('');
    const success = await sendMessage(selectedChat.id, msgInput.trim(), 'text');
    setSendingMsg(false);
    if (success) {
      setMsgInput('');
    } else {
      // Keep the input so nothing the user typed is lost.
      setSendError('Senden fehlgeschlagen — Nachricht nicht verloren. Erneut versuchen.');
    }
  };

  // Create Group Chat action
  const handleCreateGroupSubmit = async (e) => {
    e.preventDefault();
    if (!groupName.trim() || selectedGroupMembers.length === 0) return;
    const chatId = await createGroupChat(groupName.trim(), selectedGroupMembers);
    if (chatId) {
      setGroupName('');
      setSelectedGroupMembers([]);
      setShowCreateGroup(false);
      const chat = conversations.find(c => c.id === chatId) || { id: chatId, title: groupName };
      setSelectedChat(chat);
    }
  };

  const toggleGroupMember = (uid) => {
    setSelectedGroupMembers(prev => 
      prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
    );
  };

  // Quick shares
  const handleShareStack = async () => {
    if (!selectedChat) return;
    
    let stackToShare = stack;

    if (!stackToShare || stackToShare.length === 0) {
      // Load local storage stack or default mock stack to share
      const localData = localStorage.getItem('pronoia_protocol_state');
      if (localData) {
        try {
          const parsed = JSON.parse(localData);
          if (parsed.stack) stackToShare = parsed.stack;
        } catch (e) {
          console.error(e);
        }
      }
    }

    if (!stackToShare || stackToShare.length === 0) {
      stackToShare = [
        { name: 'Bromantane', dose: '50mg', timing: 'morning' },
        { name: 'Alpha-GPC', dose: '300mg', timing: 'focus' }
      ];
    }
    
    const success = await sendMessage(selectedChat.id, JSON.stringify(stackToShare), 'stack-share');
    if (success) {
      alert("Stack erfolgreich im Chat geteilt!");
    }
  };

  return (
    <div className={styles.socialShell}>
      {/* Sidebar - Tab bar and lists */}
      <div className={styles.socialSidebar}>
        <div className={styles.tabBar}>
          <button className={`${styles.tabBtn} ${socialTab === 'chats' ? styles.tabBtnActive : ''}`} onClick={() => setSocialTab('chats')}>Chats</button>
          <button className={`${styles.tabBtn} ${socialTab === 'friends' ? styles.tabBtnActive : ''}`} onClick={() => setSocialTab('friends')}>Freunde</button>
          <button className={`${styles.tabBtn} ${socialTab === 'requests' ? styles.tabBtnActive : ''}`} onClick={() => setSocialTab('requests')}>Anfragen</button>
          <button className={`${styles.tabBtn} ${socialTab === 'search' ? styles.tabBtnActive : ''}`} onClick={() => setSocialTab('search')}>Suche</button>
          <button className={`${styles.tabBtn} ${socialTab === 'e2e' ? styles.tabBtnActive : ''}`} onClick={() => setSocialTab('e2e')}>🔑 E2E</button>
        </div>

        <div className={styles.sidebarContent}>
          {socialTab === 'chats' && (
            <>
              <div className={styles.groupCreateRow}>
                <button className="btn btn-ghost" style={{ width: '100%', fontSize: '0.72rem' }} onClick={() => setShowCreateGroup(!showCreateGroup)}>
                  {showCreateGroup ? 'Abbrechen' : '⊕ Gruppenchat erstellen'}
                </button>
              </div>

              {showCreateGroup ? (
                <form onSubmit={handleCreateGroupSubmit} className={styles.groupForm}>
                  <input
                    type="text"
                    className={styles.groupInput}
                    placeholder="Gruppenname..."
                    value={groupName}
                    onChange={e => setGroupName(e.target.value)}
                    required
                  />
                  <div className={styles.groupMemberListLabel}>Mitglieder wählen:</div>
                  <div className={styles.groupMemberList}>
                    {friends.map(f => (
                      <label key={f.friendUid} className={styles.groupMemberLabel}>
                        <input
                          type="checkbox"
                          checked={selectedGroupMembers.includes(f.friendUid)}
                          onChange={() => toggleGroupMember(f.friendUid)}
                        />
                        <span>{f.profile?.username}</span>
                      </label>
                    ))}
                    {friends.length === 0 && <p className={styles.emptyState}>Keine Freunde verfügbar.</p>}
                  </div>
                  <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem', fontSize: '0.7rem' }}>
                    Gruppe anlegen
                  </button>
                </form>
              ) : (
                <ChatList
                  conversations={conversations}
                  onSelectChat={setSelectedChat}
                  activeChatId={selectedChat?.id}
                  currentUserUid={user?.uid}
                  onDeleteChat={role === 'admin' ? handleDeleteChat : null}
                  styles={styles}
                />
              )}
            </>
          )}

          {startChatError && (
            <div style={{
              margin: '0.5rem',
              padding: '0.5rem 0.75rem',
              fontSize: '0.68rem',
              fontFamily: 'var(--font-mono)',
              color: 'var(--red, #ff4d4d)',
              background: 'rgba(255,77,77,0.06)',
              border: '1px solid rgba(255,77,77,0.2)',
              borderRadius: '8px'
            }}>
              ⚠️ {startChatError}
            </div>
          )}

          {socialTab === 'friends' && (
            <div className={styles.friendsList}>
              {[...friends]
                .sort((a, b) =>
                  (b.friendUid === 'hermes_agent_node' ? 1 : 0) - (a.friendUid === 'hermes_agent_node' ? 1 : 0)
                )
                .map(f => {
                  const isCompanion = f.friendUid === 'hermes_agent_node';
                  return (
                    <div key={f.id} className={styles.friendRow}>
                      <div className={styles.friendInfo}>
                        <span className={styles.onlineDot} />
                        <span className={styles.friendName}>{isCompanion ? 'Hermes' : f.profile?.username}</span>
                        {isCompanion && (
                          <span style={{
                            fontSize: '0.55rem',
                            fontFamily: 'var(--font-mono)',
                            letterSpacing: '0.1em',
                            color: 'var(--theme-accent, #1A6AFF)',
                            border: '1px solid var(--theme-accent-dim, rgba(26,106,255,0.25))',
                            borderRadius: '100px',
                            padding: '0.1rem 0.45rem',
                            marginLeft: '0.4rem'
                          }}>
                            COMPANION
                          </span>
                        )}
                      </div>
                      <button className="btn btn-ghost" style={{ padding: '0.3rem 0.75rem', fontSize: '0.65rem' }} onClick={() => handleStartChat(f.friendUid)}>
                        💬 Chat
                      </button>
                    </div>
                  );
                })}
              {friends.length === 0 && (
                <div className={styles.emptyState} style={{ textAlign: 'center', padding: '1.5rem 1rem' }}>
                  <p style={{ margin: 0 }}>Noch keine Freunde hinzugefügt.</p>
                  <p style={{ margin: '0.5rem 0 0', opacity: 0.7, fontSize: '0.8em' }}>
                    Wechsle zu „Suchen&quot; und finde Nutzer per Username oder Telegram-ID.
                  </p>
                </div>
              )}
            </div>
          )}

          {socialTab === 'requests' && (
            <div className={styles.requestsList}>
              <div className={styles.requestsSectionLabel}>Eingehend ({pendingRequests.length})</div>
              {pendingRequests.map(r => (
                <div key={r.id} className={styles.requestRow}>
                  <span className={styles.requestName}>{r.profile?.username}</span>
                  <div className={styles.requestActions}>
                    <button className={styles.reqAcceptBtn} onClick={() => acceptFriendRequest(r.id)}>✓</button>
                    <button className={styles.reqDeclineBtn} onClick={() => declineFriendRequest(r.id)}>✕</button>
                  </div>
                </div>
              ))}

              <div className={styles.requestsSectionLabel} style={{ marginTop: '1.5rem' }}>Ausgehend ({sentRequests.length})</div>
              {sentRequests.map(r => (
                <div key={r.id} className={styles.requestRow}>
                  <span className={styles.requestName}>{r.profile?.username}</span>
                  <span className={styles.reqPendingTag}>Wartend</span>
                </div>
              ))}
            </div>
          )}

          {socialTab === 'search' && (
            <div className={styles.searchPane}>
              <form onSubmit={handleSearchSubmit} className={styles.searchForm}>
                <input
                  type="text"
                  className={styles.searchInput}
                  placeholder="Username suchen..."
                  value={searchVal}
                  onChange={e => setSearchVal(e.target.value)}
                />
                <button type="submit" className={styles.searchBtn}>SUCHEN</button>
              </form>

              <div className={styles.searchResults}>
                {searching ? (
                  <p className={styles.loadingText}>Suche läuft...</p>
                ) : (
                  searchResults.map(res => {
                    const existingFriend = friends.find(f => f.friendUid === res.uid);
                    const isPending = pendingRequests.find(r => r.friendUid === res.uid) || sentRequests.find(r => r.friendUid === res.uid);
                    const status = existingFriend ? 'accepted' : isPending ? 'pending' : 'none';

                    return (
                      <div key={res.uid} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', background: 'var(--bg3)', borderRadius: '12px', border: '1px solid var(--border-s)', padding: '0.25rem', marginBottom: '0.5rem' }}>
                        <UserCard
                          user={res}
                          onAddFriend={() => sendFriendRequest(res.uid)}
                          onMessage={() => handleStartChat(res.uid)}
                          friendshipStatus={status}
                          styles={{ ...styles, userCard: '' }}
                        />
                        {role === 'admin' && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                            <span style={{ fontSize: '0.62rem', fontFamily: 'var(--font-mono)', color: 'var(--text3)' }}>
                              Rolle: <strong style={{ color: res.role === 'admin' ? 'var(--tan)' : 'var(--text2)' }}>{res.role || 'user'}</strong>
                            </span>
                            <button
                              onClick={() => handleToggleRole(res.uid, res.role)}
                              className="btn btn-ghost"
                              style={{ padding: '0.25rem 0.5rem', fontSize: '0.6rem', fontFamily: 'var(--font-mono)' }}
                            >
                              {res.role === 'admin' ? 'Demote' : 'Promote to Admin'}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
                {!searching && searchResults.length === 0 && searchVal && (
                  <div className={styles.emptyState} style={{ textAlign: 'center' }}>
                    <p style={{ margin: 0 }}>Keine Nutzer gefunden.</p>
                    <p style={{ margin: '0.5rem 0 0', opacity: 0.7, fontSize: '0.8em' }}>
                      Die Suche matcht den Anfang des Usernames (Groß-/Kleinschreibung zählt)
                      oder eine exakte Telegram-ID.
                    </p>
                  </div>
                )}
                {!searching && !searchVal && searchResults.length === 0 && (
                  <div className={styles.emptyState} style={{ textAlign: 'center' }}>
                    <p style={{ margin: 0 }}>Suche nach Username oder Telegram-ID.</p>
                    <p style={{ margin: '0.5rem 0 0', opacity: 0.7, fontSize: '0.8em' }}>
                      Tipp: <strong>hermes_agent_node</strong> ist dein KI-Begleiter — adden und sofort chatten.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {socialTab === 'e2e' && (
            <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ fontSize: '0.62rem', fontFamily: 'var(--font-mono)', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                E2E Security Status
              </div>
              <div className={styles.e2eStatusBadge + ' ' + styles.e2eStatusActive}>
                🟢 BEREIT
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text2)' }}>
                Deine E2E Cryptographic Identity ist auf diesem Gerät aktiv.
              </div>
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1rem', marginTop: '0.5rem' }}>
                <p style={{ fontSize: '0.68rem', color: 'var(--text3)' }}>
                  Solltest du Decryption-Fehler auf anderen Geräten haben, exportiere deinen Schlüssel und importiere ihn dort.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Display Pane */}
      <div className={styles.socialMainContent}>
        {socialTab === 'e2e' ? (
          <div className={styles.e2eContainer}>
            <div className={styles.e2eHeader}>
              <h1 className={styles.e2eTitle}>E2E-Schlüsselverwaltung</h1>
              <p className={styles.e2eSubtitle}>Verwalte deine Ende-zu-Ende Verschlüsselung und synchronisiere deine Geräte.</p>
            </div>

            {keyStatusMsg && (
              <div className={styles.e2eStatusMsg}>
                {keyStatusMsg}
              </div>
            )}

            <div className={styles.e2eGrid}>
              {/* Card 1: Status & Info */}
              <div className={styles.e2eCard}>
                <h3 className={styles.e2eCardTitle}>
                  🔑 Deine Identität (Public Key)
                </h3>
                <p className={styles.e2eCardText}>
                  Dies ist dein kryptografischer Fingerabdruck. Andere Teilnehmer nutzen diesen öffentlichen Schlüssel, um Nachrichten für dich zu verschlüsseln.
                </p>
                {myPublicKeyJwk?.x ? (
                  <div className={styles.e2eFingerprint} title="Klicken zum Kopieren" onClick={() => {
                    navigator.clipboard.writeText(myPublicKeyJwk.x);
                    alert("Public Key Fingerprint kopiert!");
                  }}>
                    Fingerprint: {myPublicKeyJwk.x.substring(0, 24)}...
                  </div>
                ) : (
                  <div style={{ fontSize: '0.72rem', color: 'var(--red, #ff4d4d)' }}>
                    Fingerprint nicht verfügbar. Bitte generiere neue Schlüssel.
                  </div>
                )}
                <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <button className={`${styles.e2eBtn} ${styles.e2eBtnDanger}`} onClick={handleResetKeys}>
                    Schlüssel zurücksetzen
                  </button>
                  <p style={{ fontSize: '0.62rem', color: 'var(--text3)' }}>
                    ⚠️ Achtung: Bereits empfangene Nachrichten können nach dem Zurücksetzen nicht mehr entschlüsselt werden.
                  </p>
                </div>
              </div>

              {/* Card 2: Export / Backup */}
              <div className={styles.e2eCard}>
                <h3 className={styles.e2eCardTitle}>
                  📤 E2E-Schlüssel Backup (Export)
                </h3>
                <p className={styles.e2eCardText}>
                  Exportiere deinen privaten Schlüssel, um deine Chat-Historie auf einem anderen Browser, Gerät oder in der Telegram-WebApp zu entschlüsseln.
                </p>
                {exportedKey ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <textarea 
                      className={styles.e2eTextarea} 
                      readOnly 
                      value={exportedKey}
                      onClick={(e) => e.target.select()}
                    />
                    <button className={`${styles.e2eBtn} ${styles.e2eBtnSecondary}`} onClick={() => {
                      navigator.clipboard.writeText(exportedKey);
                      alert("Schlüssel kopiert!");
                    }}>
                      In Zwischenablage kopieren
                    </button>
                  </div>
                ) : (
                  <button className={`${styles.e2eBtn} ${styles.e2eBtnPrimary}`} onClick={handleExportKeys}>
                    Privaten Schlüssel exportieren
                  </button>
                )}
              </div>

              {/* Card 3: Import */}
              <div className={styles.e2eCard} style={{ gridColumn: 'span 2' }}>
                <h3 className={styles.e2eCardTitle}>
                  📥 E2E-Schlüssel wiederherstellen (Import)
                </h3>
                <p className={styles.e2eCardText}>
                  Füge hier einen zuvor exportierten privaten E2E-Schlüssel ein, um deine Identität und deine Nachrichten-Historie auf diesem Gerät wiederherzustellen.
                </p>
                <form onSubmit={handleImportKeys} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  <textarea 
                    className={styles.e2eTextarea}
                    placeholder="Füge hier deinen exportierten Base64-Schlüssel ein..."
                    value={importKeyInput}
                    onChange={(e) => setImportKeyInput(e.target.value)}
                    required
                  />
                  <button type="submit" className={`${styles.e2eBtn} ${styles.e2eBtnPrimary}`} style={{ alignSelf: 'flex-start' }}>
                    Schlüssel importieren
                  </button>
                </form>
              </div>
            </div>
          </div>
        ) : selectedChat ? (
          <div className={styles.chatWindow}>
            {/* Header */}
            <div className={styles.chatHeader}>
              <div className={styles.chatHeaderLeft}>
                <div className={styles.chatHeaderTitle}>
                  {(selectedChat.participants || []).includes('hermes_agent_node') ? 'Hermes' : selectedChat.title}
                  {(selectedChat.participants || []).includes('hermes_agent_node') && (
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
                </div>
                <div className={styles.chatHeaderStatus}>
                  <span className={styles.secureBadge}>🔒 E2E verschlüsselt</span>
                  <span className={styles.expiryBadge}>⏱️ 7 Tage Speicher</span>
                </div>
              </div>
              <div className={styles.chatHeaderRight} style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-ghost" style={{ fontSize: '0.65rem', color: 'var(--red, #ff4d4d)' }} onClick={() => handleClearChat(selectedChat.id)}>
                  🗑️ Verlauf leeren
                </button>
                <button className="btn btn-ghost" style={{ fontSize: '0.65rem' }} onClick={handleShareStack}>
                  🧬 Stack teilen
                </button>
              </div>
            </div>

            {/* Message Area */}
            <div className={styles.chatMessagesArea} ref={chatMessagesEndRef}>
              {activeChatMessages.map(msg => (
                <ChatBubble
                  key={msg.id}
                  message={msg}
                  isSelf={msg.senderUid === user?.uid}
                  styles={styles}
                />
              ))}
              {activeChatMessages.length === 0 && (
                <div className={styles.chatEmptyState}>
                  {(selectedChat.participants || []).includes('hermes_agent_node') ? (
                    <p>
                      Das ist dein Kanal zu Hermes, deinem KI-Begleiter. Frag z.&nbsp;B.:
                      „Wie optimiere ich meinen heutigen Fokus-Block?&quot; — Antworten kommen,
                      sobald der Hermes-Agent online ist.
                    </p>
                  ) : (
                    <p>Keine Nachrichten vorhanden. Die Nachrichten werden nach 7 Tagen automatisch gelöscht.</p>
                  )}
                </div>
              )}
            </div>

            {/* Input Form */}
            {sendError && (
              <div style={{
                padding: '0.4rem 1rem',
                fontSize: '0.68rem',
                fontFamily: 'var(--font-mono)',
                color: 'var(--red, #ff4d4d)',
                background: 'rgba(255,77,77,0.06)',
                borderTop: '1px solid rgba(255,77,77,0.2)'
              }}>
                ⚠️ {sendError}
              </div>
            )}
            <form onSubmit={handleSendMsg} className={styles.chatInputForm}>
              <input
                type="text"
                className={styles.chatMsgInput}
                placeholder="Sichere Nachricht verfassen..."
                value={msgInput}
                onChange={e => setMsgInput(e.target.value)}
                disabled={sendingMsg}
              />
              <button type="submit" className={styles.chatSendBtn} disabled={sendingMsg || !msgInput.trim()} style={sendingMsg ? { opacity: 0.6 } : {}}>
                {sendingMsg ? 'SENDET…' : 'SENDEN'}
              </button>
            </form>
          </div>
        ) : (
          <div className={styles.noChatSelected}>
            <div className={styles.socialHeroSymbol}>💬</div>
            <h2>Secure Social Node</h2>
            <p>Wähle einen Chat aus der Liste oder suche nach Bio-Hackern im Netzwerk.</p>
          </div>
        )}
      </div>
    </div>
  );
}
