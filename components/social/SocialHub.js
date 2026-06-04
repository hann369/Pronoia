// components/social/SocialHub.js
import React, { useState, useEffect, useRef } from 'react';
import { useSocial } from '@/hooks/useSocial';
import { useChat } from '@/hooks/useChat';
import { useAuth } from '@/context/AuthContext';
import ChatList from './ChatList';
import ChatBubble from './ChatBubble';
import UserCard from './UserCard';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import styles from './SocialHub.module.css';

export default function SocialHub({ setActiveTab }) {
  const { user } = useAuth();
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
    sendMessage
  } = useChat();

  const [socialTab, setSocialTab] = useState('chats'); // 'chats' | 'friends' | 'requests' | 'search'
  const [selectedChat, setSelectedChat] = useState(null);
  const [msgInput, setMsgInput] = useState('');
  const [searchVal, setSearchVal] = useState('');
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedGroupMembers, setSelectedGroupMembers] = useState([]);
  
  const chatMessagesEndRef = useRef(null);

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

  // Direct Message action from search/friend list
  const handleStartChat = async (uid) => {
    const chatId = await createDirectChat(uid);
    if (chatId) {
      const chat = conversations.find(c => c.id === chatId) || { id: chatId, title: 'Chat loading...' };
      setSelectedChat(chat);
      setSocialTab('chats');
    }
  };

  const handleSendMsg = async (e) => {
    e.preventDefault();
    if (!msgInput.trim() || !selectedChat) return;
    const success = await sendMessage(selectedChat.id, msgInput.trim(), 'text');
    if (success) {
      setMsgInput('');
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
    // Load local storage stack or default mock stack to share
    const localData = localStorage.getItem('pronoia_protocol_state');
    let stackToShare = [
      { name: 'Bromantane', dose: '50mg', timing: 'morning' },
      { name: 'Alpha-GPC', dose: '300mg', timing: 'focus' }
    ];
    if (localData) {
      try {
        const parsed = JSON.parse(localData);
        if (parsed.stack) stackToShare = parsed.stack;
      } catch (e) {
        console.error(e);
      }
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
                  styles={styles}
                />
              )}
            </>
          )}

          {socialTab === 'friends' && (
            <div className={styles.friendsList}>
              {friends.map(f => (
                <div key={f.id} className={styles.friendRow}>
                  <div className={styles.friendInfo}>
                    <span className={styles.onlineDot} />
                    <span className={styles.friendName}>{f.profile?.username}</span>
                  </div>
                  <button className="btn btn-ghost" style={{ padding: '0.3rem 0.75rem', fontSize: '0.65rem' }} onClick={() => handleStartChat(f.friendUid)}>
                    💬 Chat
                  </button>
                </div>
              ))}
              {friends.length === 0 && <p className={styles.emptyState}>Noch keine Freunde hinzugefügt.</p>}
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
                      <UserCard
                        key={res.uid}
                        user={res}
                        onAddFriend={() => sendFriendRequest(res.uid)}
                        onMessage={() => handleStartChat(res.uid)}
                        friendshipStatus={status}
                        styles={styles}
                      />
                    );
                  })
                )}
                {!searching && searchResults.length === 0 && searchVal && (
                  <p className={styles.emptyState}>Keine Nutzer gefunden.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Display Pane */}
      <div className={styles.socialMainContent}>
        {selectedChat ? (
          <div className={styles.chatWindow}>
            {/* Header */}
            <div className={styles.chatHeader}>
              <div className={styles.chatHeaderLeft}>
                <div className={styles.chatHeaderTitle}>{selectedChat.title}</div>
                <div className={styles.chatHeaderStatus}>
                  <span className={styles.secureBadge}>🔒 E2E verschlüsselt</span>
                  <span className={styles.expiryBadge}>⏱️ 7 Tage Speicher</span>
                </div>
              </div>
              <div className={styles.chatHeaderRight}>
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
                  <p>Keine Nachrichten vorhanden. Die Nachrichten werden nach 7 Tagen automatisch gelöscht.</p>
                </div>
              )}
            </div>

            {/* Input Form */}
            <form onSubmit={handleSendMsg} className={styles.chatInputForm}>
              <input
                type="text"
                className={styles.chatMsgInput}
                placeholder="Sichere Nachricht verfassen..."
                value={msgInput}
                onChange={e => setMsgInput(e.target.value)}
              />
              <button type="submit" className={styles.chatSendBtn}>SENDEN</button>
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
