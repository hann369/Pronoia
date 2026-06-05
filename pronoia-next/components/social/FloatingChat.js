'use client';
// components/social/FloatingChat.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useChat } from '@/hooks/useChat';
import { useSocial } from '@/hooks/useSocial';
import ChatBubble from './ChatBubble';
import styles from './FloatingChat.module.css';

export default function FloatingChat() {
  const { user } = useAuth();
  
  // Return null if not logged in
  if (!user) return null;

  const {
    conversations,
    activeChatMessages,
    loadingChats,
    chatUnreadCount,
    createDirectChat,
    listenToMessages,
    sendMessage
  } = useChat();

  const {
    searchResults,
    searching,
    searchUsers
  } = useSocial();

  const [isOpen, setIsOpen] = useState(false);
  const [selectedChat, setSelectedChat] = useState(null);
  const [msgInput, setMsgInput] = useState('');
  const [searchVal, setSearchVal] = useState('');
  const messagesEndRef = useRef(null);

  // Auto-scroll active chat to bottom
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollTop = messagesEndRef.current.scrollHeight;
    }
  }, [activeChatMessages, isOpen, selectedChat]);

  // Listen to messages when a chat is opened
  useEffect(() => {
    if (selectedChat) {
      listenToMessages(selectedChat.id);
    }
  }, [selectedChat, listenToMessages]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchVal.trim()) {
      searchUsers(searchVal.trim());
    }
  };

  const handleClearSearch = () => {
    setSearchVal('');
  };

  const handleStartChat = async (targetUid) => {
    const chatId = await createDirectChat(targetUid);
    if (chatId) {
      const chat = conversations.find(c => c.id === chatId) || { id: chatId, title: 'Chat loading...' };
      setSelectedChat(chat);
      setSearchVal('');
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

  const formatTime = (isoString) => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return '';
    }
  };

  return (
    <div className={styles.floatingWrapper}>
      {/* Floating Chat Drawer */}
      <div className={`${styles.chatDrawer} ${isOpen ? styles.drawerOpen : ''}`}>
        
        {/* Header */}
        <div className={styles.drawerHeader}>
          <div className={styles.headerTitleBox}>
            {selectedChat && (
              <button 
                className={styles.backBtn} 
                onClick={() => setSelectedChat(null)}
                aria-label="Zurück zur Liste"
              >
                ←
              </button>
            )}
            <h3 className={styles.headerTitle}>
              {selectedChat ? selectedChat.title : 'Direct Messages'}
            </h3>
          </div>
          <button 
            className={styles.closeBtn} 
            onClick={() => setIsOpen(false)}
            aria-label="Minimieren"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className={styles.drawerBody}>
          {selectedChat ? (
            /* Active Chat Stream */
            <>
              <div className={styles.messageStream} ref={messagesEndRef}>
                {activeChatMessages.length === 0 ? (
                  <div className={styles.emptyLog}>
                    Keine Nachrichten. Beginne das E2E-Gespräch...
                  </div>
                ) : (
                  activeChatMessages.map((msg) => (
                    <ChatBubble 
                      key={msg.id}
                      message={msg}
                      isSelf={msg.senderUid === user.uid}
                      styles={styles}
                    />
                  ))
                )}
              </div>
              
              {/* Active Chat Input */}
              <form onSubmit={handleSendMsg} className={styles.inputForm}>
                <input 
                  type="text" 
                  className={styles.msgInput}
                  placeholder="Sichere Nachricht..." 
                  value={msgInput}
                  onChange={(e) => setMsgInput(e.target.value)}
                />
                <button type="submit" className={styles.sendBtn}>
                  Senden
                </button>
              </form>
            </>
          ) : (
            /* Chat List & Search */
            <>
              {/* User search bar */}
              <div className={styles.searchWrapper}>
                <form onSubmit={handleSearchSubmit} className={styles.searchForm}>
                  <input 
                    type="text" 
                    className={styles.searchInput}
                    placeholder="Suche Username / Telegram ID..." 
                    value={searchVal}
                    onChange={(e) => setSearchVal(e.target.value)}
                  />
                  {searchVal && (
                    <button 
                      type="button" 
                      onClick={handleClearSearch} 
                      className={styles.searchClearBtn}
                    >
                      X
                    </button>
                  )}
                </form>
              </div>

              {searchVal ? (
                /* Search Results */
                <div className={styles.searchResultsBox}>
                  {searching ? (
                    <div className={styles.loadingBox}>Suche läuft...</div>
                  ) : searchResults.length === 0 ? (
                    <div className={styles.emptyState}>Keine Benutzer gefunden.</div>
                  ) : (
                    searchResults.map((res) => (
                      <div 
                        key={res.uid} 
                        className={styles.searchResultCard}
                        onClick={() => handleStartChat(res.uid)}
                      >
                        <div className={styles.searchResultLeft}>
                          <img 
                            src={res.profile.avatar || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=200'} 
                            alt="Avatar" 
                            className={styles.searchResultAvatar}
                          />
                          <div className={styles.searchResultInfo}>
                            <span className={styles.searchResultName}>
                              {res.profile.username}
                            </span>
                            {res.profile.telegramId && (
                              <span className={styles.searchResultId}>
                                TG: {res.profile.telegramId}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                /* Active Conversations List */
                <div style={{ flex: 1, overflowY: 'auto' }}>
                  {loadingChats ? (
                    <div className={styles.loadingBox}>Lade Chats...</div>
                  ) : conversations.length === 0 ? (
                    <div className={styles.emptyState}>
                      Keine aktiven Chats. Verwende die Suche, um Kontakte zu finden!
                    </div>
                  ) : (
                    conversations.map((chat) => (
                      <div 
                        key={chat.id} 
                        className={styles.chatListItem}
                        onClick={() => setSelectedChat(chat)}
                      >
                        <img 
                          src={chat.avatar || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=200'} 
                          alt="Avatar" 
                          className={styles.avatar}
                        />
                        <div className={styles.chatInfo}>
                          <div className={styles.chatHeaderRow}>
                            <span className={styles.chatTitle}>{chat.title}</span>
                            <span className={styles.chatTime}>
                              {formatTime(chat.lastMessage?.timestamp)}
                            </span>
                          </div>
                          <div className={styles.chatPreviewRow}>
                            <span className={styles.chatPreview}>
                              {chat.lastMessage 
                                ? (chat.lastMessage.ciphertext ? '🔒 E2E verschlüsselt' : chat.lastMessage.text)
                                : 'Keine Nachrichten'
                              }
                            </span>
                            {chat.hasUnread && <div className={styles.unreadDot} />}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </div>

      </div>

      {/* Floating Trigger Button */}
      <button 
        className={styles.floatingButton} 
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Chat öffnen"
      >
        {/* Chat Bubble Icon */}
        <svg 
          width="24" 
          height="24" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>

        {/* Unread badge */}
        {!isOpen && chatUnreadCount > 0 && (
          <div className={styles.unreadBadge}>
            {chatUnreadCount}
          </div>
        )}
      </button>
    </div>
  );
}
