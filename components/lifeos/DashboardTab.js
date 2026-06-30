'use client';

/*
 * Dashboard (cognitive chronometer + protocol queue) tab — extracted from the
 * life-os monolith. The default tab and the most prop-heavy: state, derived
 * geometry (radius/circumference/strokeDashoffset), refs, formatters and all
 * handlers are threaded as props so behaviour is identical to the inline
 * `case 'dashboard'` block.
 */

import TelemetryVisualizer from '@/components/TelemetryVisualizer';
import DashboardTodos from '@/components/lifeos/DashboardTodos';
import styles from '@/app/life-os/page.module.css';

export default function DashboardTab({
  // state / derived values
  circadianMode,
  setCircadianMode,
  currentBlock = {},
  blocks = [],
  blockIdx = 0,
  timeLeft = 0,
  totalTime = 0,
  isRunning,
  manualPeekIdx,
  setManualPeekIdx,
  dragStartX,
  dragCurrentX,
  radius,
  circumference,
  strokeDashoffset,
  showTimeEdit,
  setShowTimeEdit,
  editTimeMinutes,
  setEditTimeMinutes,
  profile,
  ltpPotential,
  plasticity,
  messages = [],
  isTyping,
  chatEndRef,
  chatInput,
  setChatInput,
  pendingQueueOverride,
  setPendingQueueOverride,
  hasTodayCalBlocks,
  customTitle,
  setCustomTitle,
  customDuration,
  setCustomDuration,
  // formatters
  formatTime,
  formatMinToTime,
  // handlers
  prevBlock,
  skipBlock,
  toggleTimer,
  handleDragStart,
  handleDragMove,
  handleDragEnd,
  handleTimeEditSubmit,
  logFriction,
  handleSendChat,
  confirmQueueOverride,
  restoreCalendarBlocks,
  loadProtocolQueue,
  handleLiabilityClick,
  handleAddBlock,
  uploadDataSource,
  setActiveTab,
  saveProfile,
  addCalendarBlock,
}) {
  return (
    <div className={styles.tabContentGrid}>
      <div className={styles.tabContentMainCol}>
        {/* Block label under status bar */}
        <div className={styles.blockLabel}>
          <span className={styles.mainHeaderBadge}>
            {circadianMode && currentBlock.calculatedStartMin !== undefined && currentBlock.calculatedEndMin !== undefined ? (
              `${formatMinToTime(currentBlock.calculatedStartMin)} – ${formatMinToTime(currentBlock.calculatedEndMin)} · ${currentBlock.type}`
            ) : (
              currentBlock.type
            )}
          </span>
          <h1 className={styles.mainHeaderTitle}>{currentBlock.title}</h1>
        </div>

        {/* CHRONOMETER */}
        <div className={styles.chronoSection}>
          <div className={styles.chronoControlLayout} style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', justifyContent: 'center', width: '100%', touchAction: 'none' }}>
            <button
              className={styles.chronoArrowBtn}
              onClick={prevBlock}
              title="Vorheriger Block"
              style={{
                background: 'none',
                border: '1px solid var(--border-s)',
                borderRadius: '50%',
                color: 'var(--text2)',
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: '1.2rem',
                transition: 'all 0.3s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--cobalt-bright)'; e.currentTarget.style.color = 'var(--text)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-s)'; e.currentTarget.style.color = 'var(--text2)'; }}
            >
              ←
            </button>

            <div
              className={styles.chronoWrapper}
              onMouseDown={(e) => handleDragStart(e.clientX, e)}
              onTouchStart={(e) => handleDragStart(e.touches[0].clientX)}
              onTouchMove={(e) => handleDragMove(e.touches[0].clientX)}
              onTouchEnd={handleDragEnd}
              style={{
                cursor: 'grab',
                userSelect: 'none',
                transform: `translateX(${dragStartX !== null ? (dragCurrentX - dragStartX) * 0.35 : 0}px)`,
                transition: dragStartX !== null ? 'none' : 'transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)'
              }}
            >
              <svg width="240" height="240" className={styles.chronoSvg}>
                <defs>
                  <linearGradient id="progGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="var(--theme-accent, #1A6AFF)" />
                    <stop offset="100%" stopColor="var(--tan, #d5b893)" />
                  </linearGradient>
                </defs>
                <circle cx="120" cy="120" r="115" className={styles.chronoOuter} />
                <circle cx="120" cy="120" r={radius} className={styles.chronoTrack} />
                <circle
                  cx="120" cy="120" r={radius}
                  className={styles.chronoProgress}
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                />
              </svg>
              <div className={styles.chronoCenter}>
                {showTimeEdit ? (
                  <form
                    onSubmit={handleTimeEditSubmit}
                    onClick={e => e.stopPropagation()}
                    onMouseDown={e => e.stopPropagation()}
                    onTouchStart={e => e.stopPropagation()}
                    style={{ display: 'flex', gap: '0.25rem', justifyContent: 'center', alignItems: 'center' }}
                  >
                    <input
                      type="number"
                      min="1"
                      max="480"
                      className={styles.chronoTimeInput}
                      value={editTimeMinutes}
                      onChange={e => setEditTimeMinutes(e.target.value)}
                      autoFocus
                      style={{
                        width: '70px',
                        background: 'var(--bg3)',
                        border: '1px solid var(--border-s)',
                        color: 'var(--text)',
                        fontSize: '1.4rem',
                        textAlign: 'center',
                        borderRadius: '6px',
                        outline: 'none'
                      }}
                    />
                    <button type="submit" className="btn btn-primary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.85rem' }}>✓</button>
                  </form>
                ) : (
                  <div
                    className={styles.chronoTime}
                    onClick={() => { setEditTimeMinutes(Math.round(timeLeft / 60).toString()); setShowTimeEdit(true); }}
                    title="Dauer manuell anpassen"
                    style={{ cursor: 'pointer', transition: 'color 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--cobalt-bright)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'var(--text)'}
                  >
                    {formatTime(timeLeft)}
                  </div>
                )}
                <div className={styles.chronoStatus}>
                  {circadianMode ? (manualPeekIdx !== null ? 'PEEK (TEMP)' : 'ZIRKADIAN') : isRunning ? 'AKTIV' : 'PAUSIERT'}
                </div>
                {circadianMode && manualPeekIdx !== null && (
                  <button
                    style={{
                      background: 'rgba(26, 106, 255, 0.15)',
                      color: 'var(--cobalt-bright)',
                      border: '1px solid var(--cobalt-bright)',
                      borderRadius: '12px',
                      padding: '2px 8px',
                      fontSize: '0.65rem',
                      marginTop: '4px',
                      cursor: 'pointer',
                      fontFamily: 'var(--font-mono)',
                      letterSpacing: '0.05em'
                    }}
                    onClick={() => setManualPeekIdx(null)}
                  >
                    ↩ LIVE BLOCK
                  </button>
                )}
                {!circadianMode && (
                  <button
                    className={`${styles.chronoBtn} ${isRunning ? styles.chronoBtnPause : styles.chronoBtnStart}`}
                    onClick={toggleTimer}
                  >
                    {isRunning ? 'PAUSE' : 'START'}
                  </button>
                )}
              </div>
            </div>

            <button
              className={styles.chronoArrowBtn}
              onClick={skipBlock}
              title="Nächster Block"
              style={{
                background: 'none',
                border: '1px solid var(--border-s)',
                borderRadius: '50%',
                color: 'var(--text2)',
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: '1.2rem',
                transition: 'all 0.3s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--cobalt-bright)'; e.currentTarget.style.color = 'var(--text)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-s)'; e.currentTarget.style.color = 'var(--text2)'; }}
            >
              →
            </button>
          </div>

          {/* Zirkadian Mode Toggle Control */}
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1.5rem', marginBottom: '0.5rem' }}>
            <button
              onClick={() => setCircadianMode(!circadianMode)}
              style={{
                background: circadianMode ? 'rgba(26, 106, 255, 0.08)' : 'none',
                border: '1px solid',
                borderColor: circadianMode ? 'var(--cobalt-bright)' : 'var(--border-s)',
                borderRadius: '20px',
                color: circadianMode ? 'var(--cobalt-bright)' : 'var(--text3)',
                padding: '0.4rem 1rem',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.7rem',
                letterSpacing: '0.05em',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'all 0.3s ease',
                boxShadow: circadianMode ? '0 0 12px rgba(26,106,255,0.15)' : 'none'
              }}
            >
              <span style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: circadianMode ? 'var(--cobalt-bright)' : 'var(--text3)',
                display: 'inline-block'
              }} />
              ZIRKADIANER SYNC: {circadianMode ? 'AKTIV (ECHTZEIT)' : 'MANUELL'}
            </button>
          </div>

          {/* Progress markers */}
          <div className={styles.chronoMeta}>
            <div className={styles.chronoMetaItem}>
              <span className={styles.chronoMetaLabel}>BLOCK</span>
              <span className={styles.chronoMetaValue}>{blockIdx + 1} / {blocks.length || 1}</span>
            </div>
            <div className={styles.chronoMetaItem}>
              <span className={styles.chronoMetaLabel}>PROTOKOLL</span>
              <span className={styles.chronoMetaValue}>{currentBlock.pillar?.toUpperCase() || 'FOCUS'}</span>
            </div>
            <div className={styles.chronoMetaItem}>
              <span className={styles.chronoMetaLabel}>HRV</span>
              <span className={styles.chronoMetaValue}>{profile?.metrics?.hrv || 72}ms</span>
            </div>
            <div className={styles.chronoMetaItem}>
              <span className={styles.chronoMetaLabel}>SCHLAF</span>
              <span className={styles.chronoMetaValue}>{profile?.metrics?.sleep || 84}%</span>
            </div>
          </div>
        </div>

        {/* Live Telemetry Card */}
        {(!profile?.customization || profile.customization.layout?.telemetry !== false) && (
          <div className={styles.insightCard} style={{ marginTop: '0', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'stretch' }}>
            <span className={styles.insightLabel}>BIO-KOGNITIVE TELEMETRIE</span>
            <TelemetryVisualizer timeLeft={timeLeft} totalTime={totalTime} pillar={currentBlock.pillar} />
          </div>
        )}

        {/* CURRENT BLOCK INSIGHT */}
        {(!profile?.customization || profile.customization.layout?.directives !== false) && (
          <div className={styles.insightCard}>
            <div className={styles.insightLeft}>
              <span className={styles.insightLabel}>SYSTEM-DIREKTIVE</span>
              <p className={styles.insightText}>{currentBlock.rec || currentBlock.insight || 'Starte das Protokoll, um Empfehlungen zu erhalten.'}</p>
            </div>
            <div className={styles.insightRight}>
              <div className={styles.neuroStat}>
                <span className={styles.neuroStatVal}>{ltpPotential}%</span>
                <span className={styles.neuroStatLabel}>LTP</span>
              </div>
              <div className={styles.neuroStat}>
                <span className={styles.neuroStatVal}>{plasticity}%</span>
                <span className={styles.neuroStatLabel}>Plastizität</span>
              </div>
            </div>
          </div>
        )}

        {/* FRICTION LOGGER */}
        {(!profile?.customization || profile.customization.layout?.friction !== false) && (
          <div className={styles.frictionRow}>
            <span className={styles.frictionLabel}>Fokus-Status</span>
            <div className={styles.frictionBtns}>
              <button className={`${styles.frictionBtn} ${styles.fbOk}`} onClick={() => logFriction('ok')}>🟢 Stabil</button>
              <button className={`${styles.frictionBtn} ${styles.fbWarn}`} onClick={() => logFriction('warn')}>🟡 Ablenkung</button>
              <button className={`${styles.frictionBtn} ${styles.fbMiss}`} onClick={() => logFriction('miss')}>🔴 Blockade</button>
            </div>
          </div>
        )}

        {/* AI COMMAND CHAT */}
        <div className={styles.chatBox}>
          <div className={styles.chatMessages} ref={chatEndRef}>
            {messages.map((msg, i) => (
              <div key={i} className={`${styles.chatMsg} ${msg.role === 'agent' ? styles.chatMsgAgent : styles.chatMsgUser}`}>
                {msg.text}
              </div>
            ))}
            {isTyping && <div className={`${styles.chatMsg} ${styles.chatMsgAgent} ${styles.chatMsgTyping}`}>System analysiert…</div>}
          </div>
          <form className={styles.chatForm} onSubmit={handleSendChat}>
            <input
              type="text"
              className={styles.chatInput}
              placeholder="Systembefehl… (z.B. 'starte block 2', 'ersetze durch Meditation 15')"
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              disabled={isTyping}
            />
            <button type="submit" className={styles.chatSend} disabled={isTyping}>SEND</button>
          </form>
        </div>
      </div>

      <div className={styles.tabContentSideCol}>
        {/* Ablauf-Queue panel */}
        <div className={styles.panelHeader}>
          <h3 className={styles.panelTitle}>⏳ Ablauf-Queue</h3>
        </div>
        <div className={styles.panelBody}>
          {pendingQueueOverride && (
            <div className={styles.alertCard} style={{ borderColor: 'var(--amber)', background: 'rgba(245, 166, 35, 0.05)', marginBottom: '1rem' }}>
              <strong>⚠️ Kalender-Blöcke vorhanden</strong>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0.25rem 0' }}>Für heute sind bereits Kalender-Blöcke geplant. Möchtest du sie wirklich mit dem Protokoll &quot;{pendingQueueOverride}&quot; überschreiben?</p>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button className={styles.alertBtn} onClick={confirmQueueOverride} style={{ background: 'var(--cobalt-bright)', color: 'white', padding: '0.4rem 0.8rem', borderRadius: '4px', fontSize: '0.75rem', cursor: 'pointer', border: 'none' }}>Ja</button>
                <button className={styles.alertBtn} onClick={() => setPendingQueueOverride(null)} style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-s)', color: 'var(--text2)', padding: '0.4rem 0.8rem', borderRadius: '4px', fontSize: '0.75rem', cursor: 'pointer' }}>Nein</button>
              </div>
            </div>
          )}

          {hasTodayCalBlocks && (
            <div style={{ marginBottom: '1rem' }}>
              <button
                className={styles.alertBtn}
                onClick={restoreCalendarBlocks}
                style={{
                  width: '100%',
                  background: 'rgba(0, 196, 140, 0.1)',
                  borderColor: 'var(--green)',
                  color: 'var(--green)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  padding: '0.6rem',
                  fontSize: '0.75rem',
                  fontWeight: 'bold',
                  letterSpacing: '0.05em',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  border: '1px solid var(--green)'
                }}
              >
                📅 HEUTIGEN KALENDER WIEDERHERSTELLEN
              </button>
            </div>
          )}

          {/* Protocol presets */}
          <div className={styles.panelGroup}>
            <div className={styles.panelGroupLabel}>Protokoll laden</div>
            <div className={styles.presetGrid}>
              {[
                { id: 'focus_optimization', icon: '🧠', label: 'Focus Opt.' },
                { id: 'high_performance',   icon: '⚡', label: 'High Perf.' },
                { id: 'metabolic_rest',      icon: '💤', label: 'Metabolic' },
                { id: 'emergency_recovery',  icon: '🛡️', label: 'Recovery' },
                { id: 'physical_training',   icon: '🏋️', label: 'Physical' },
              ].map(p => (
                <button key={p.id} className={styles.presetBtn} onClick={() => loadProtocolQueue(p.id)}>
                  {p.icon} {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Quick todos — rough thoughts, optionally synced to the queue */}
          <DashboardTodos profile={profile} saveProfile={saveProfile} addCalendarBlock={addCalendarBlock} />

          {/* HRV nudge */}
          {profile?.metrics?.hrv < 60 && (
            <div className={styles.alertCard}>
              <strong>⚡ Workflow-Optimierung</strong>
              <p>HRV: {profile.metrics.hrv}ms — Recovery-Workflow empfohlen.</p>
              <button className={styles.alertBtn} onClick={() => loadProtocolQueue('emergency_recovery')}>
                RECOVERY LADEN
              </button>
            </div>
          )}

          {/* Block list */}
          <div className={styles.panelGroup}>
            <div className={styles.panelGroupLabel}>Aktive Queue ({blocks.length} Blöcke)</div>
            <div className={styles.queueList}>
              {blocks.map((block, idx) => {
                const isLiab = block.liability;
                return (
                  <div
                    key={idx}
                    className={`${styles.queueItem} ${idx === blockIdx ? styles.queueItemActive : ''}`}
                    style={isLiab ? {
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px dashed rgba(255, 255, 255, 0.15)',
                      color: 'rgba(255, 255, 255, 0.55)',
                      cursor: 'pointer'
                    } : undefined}
                    onClick={isLiab ? () => handleLiabilityClick(block) : undefined}
                  >
                    <span className={styles.queueNum}>{isLiab ? '🔒' : idx + 1}</span>
                    <div className={styles.queueInfo}>
                      <div className={styles.queueTitle}>{block.title}</div>
                      <div className={styles.queueMeta}>
                        {circadianMode && block.calculatedStartMin !== undefined && block.calculatedEndMin !== undefined ? (
                          `${formatMinToTime(block.calculatedStartMin)} – ${formatMinToTime(block.calculatedEndMin)} (${Math.round((block.virtualDuration || block.duration) / 60)} Min) · ${block.type}`
                        ) : (
                          `${Math.round(block.duration / 60)} Min · ${block.type}`
                        )}
                      </div>
                    </div>
                    {idx === blockIdx && <span className={styles.queueActiveDot} />}
                  </div>
                );
              })}
              {blocks.length === 0 && <p className={styles.emptyState}>Keine Blöcke aktiv.</p>}
            </div>
          </div>

          {/* Add custom block */}
          <div className={styles.panelGroup}>
            <div className={styles.panelGroupLabel}>Custom Block anlegen</div>
            <form onSubmit={handleAddBlock} className={styles.stackedForm}>
              <input type="text" placeholder="Block Title…" className={styles.formInput} value={customTitle} onChange={e => setCustomTitle(e.target.value)} required />
              <input type="number" placeholder="Dauer in Minuten…" className={styles.formInput} value={customDuration} onChange={e => setCustomDuration(e.target.value)} required />
              <button type="submit" className={styles.formBtn}>BLOCK ANLEGEN</button>
            </form>
          </div>

          {/* Knowledge Vault trigger */}
          <div className={styles.panelGroup}>
            <div className={styles.panelGroupLabel}>Kognitiver Kontext</div>
            <button className={styles.vaultTrigger} onClick={() => { setActiveTab('vault'); }}>
              ✦ Knowledge Vault öffnen
            </button>
            <div className={styles.fileUpload}>
              <span>CSV / JSON einlesen</span>
              <input type="file" accept=".csv,.json" onChange={e => e.target.files[0] && uploadDataSource(e.target.files[0])} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
