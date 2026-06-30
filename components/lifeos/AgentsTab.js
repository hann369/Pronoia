'use client';

/*
 * Agents (Consensus Hub) tab.
 *
 * The 6-agent consensus is produced by /api/consensus (Mistral + local fallback),
 * auto-triggered by useProtocol on HRV/sleep/friction/active-block changes. This
 * tab is the interactive control surface for it:
 *   - manual re-evaluation ("Konsens neu berechnen") + last-updated time
 *   - quick friction logging (feeds the consensus)
 *   - acknowledge / dismiss directives (persisted via the protocol state sync)
 * Stays in the cobalt "system surface" design family (no signature accent).
 */

import { RefreshCw, Check, X } from 'lucide-react';
import styles from '@/app/life-os/page.module.css';

const FRICTION = {
  ok: { label: 'Reibungslos', color: 'var(--green)', btn: 'frictionBtnOk' },
  warn: { label: 'Warnung', color: 'var(--amber)', btn: 'frictionBtnWarn' },
  miss: { label: 'Verpasst', color: 'var(--red)', btn: 'frictionBtnMiss' },
};

export default function AgentsTab({
  consensusData,
  currentBlock = {},
  agents = [],
  getAgentStatus,
  directives = [],
  refreshConsensus,
  consensusLoading = false,
  lastConsensusAt,
  acknowledgeDirective,
  dismissDirective,
  logFriction,
  frictionLogs = [],
}) {
  const hasAlert = Object.values(consensusData?.agentStatuses || {}).some(
    (s) => s.status === 'ALERT'
  );
  const lastEvalLabel = lastConsensusAt
    ? new Date(lastConsensusAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
    : '—';
  const recentFriction = (frictionLogs || []).slice(0, 3);

  return (
    <div className={styles.tabContentGrid}>
      <div className={styles.tabContentMainCol}>
        <div className={styles.panelHeader}>
          <h3 className={styles.panelTitle}>🤖 Consensus Hub</h3>
        </div>
        <div className={styles.panelBody}>
          <div className={styles.consensusBox}>
            <div
              className={styles.consensusBadge}
              style={{
                borderColor: hasAlert ? 'var(--red)' : 'var(--green)',
                color: hasAlert ? 'var(--red)' : 'var(--green)',
              }}
            >
              <span
                className={styles.consensusDot}
                style={{ background: hasAlert ? 'var(--red)' : 'var(--green)' }}
              />
              Consensus: {hasAlert ? 'Erhöhter Stress / Reibung' : '6/6 Freigaben'}
            </div>
            <p className={styles.consensusSummary} style={{ marginTop: '1rem', fontSize: '0.85rem' }}>
              <strong>{consensusData?.leader || 'A.06 Orchestrator'}:</strong>{' '}
              {consensusData?.directive || currentBlock.insight || 'Alle Subsysteme synchronisiert.'}
            </p>

            <div className={styles.consensusActions}>
              <button
                type="button"
                className={styles.refreshBtn}
                onClick={() => refreshConsensus && refreshConsensus()}
                disabled={consensusLoading || !refreshConsensus}
              >
                <RefreshCw size={12} className={consensusLoading ? 'animate-spin' : undefined} />
                {consensusLoading ? 'Berechne…' : 'Konsens neu berechnen'}
              </button>
              <span className={styles.lastEval}>
                Block: {currentBlock?.title || 'Freier Block'} · Zuletzt {lastEvalLabel}
              </span>
            </div>

            {/* Quick friction logging — feeds the consensus engine */}
            <div className={styles.frictionRow}>
              <span className={styles.frictionRowLabel}>Reibung melden</span>
              {Object.entries(FRICTION).map(([key, f]) => (
                <button
                  key={key}
                  type="button"
                  className={`${styles.frictionBtn} ${styles[f.btn]}`}
                  onClick={() => logFriction && logFriction(key)}
                  disabled={!logFriction}
                >
                  {f.label}
                </button>
              ))}
            </div>
            {recentFriction.length > 0 && (
              <div className={styles.frictionList}>
                {recentFriction.map((log, idx) => {
                  const f = FRICTION[log.status] || FRICTION.ok;
                  return (
                    <span key={idx} className={styles.frictionChip}>
                      <span className={styles.frictionChipDot} style={{ background: f.color }} />
                      {f.label} · {log.blockTitle} · {log.ts}
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          <div className={styles.agentsListGrid} style={{ marginTop: '2rem' }}>
            {agents.map((agent) => {
              const info = getAgentStatus(agent.id);
              const statusColor =
                info.status === 'LEADING'
                  ? 'var(--green)'
                  : info.status === 'ACTIVE'
                  ? 'var(--cobalt-bright)'
                  : info.status === 'ALERT'
                  ? 'var(--red)'
                  : 'var(--text3)';
              return (
                <div key={agent.id} className={styles.agentCard}>
                  <div className={styles.agentCardTop}>
                    <div>
                      <span className={styles.agentId}>{agent.id}</span>
                      <span className={styles.agentName}>{agent.name}</span>
                    </div>
                    <span
                      className={styles.agentBadge}
                      style={{ color: statusColor, borderColor: statusColor }}
                    >
                      {info.status}
                    </span>
                  </div>
                  <div className={styles.agentRole}>{agent.role}</div>
                  <p className={styles.agentText}>{info.text}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className={styles.tabContentSideCol}>
        <div className={styles.panelHeader}>
          <h3 className={styles.panelTitle}>📜 System-Directives</h3>
        </div>
        <div className={styles.panelBody}>
          {directives.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {directives.map((dir, idx) => (
                <div
                  key={idx}
                  className={`${styles.directiveCard} ${dir.acked ? styles.directiveCardAcked : ''}`}
                  style={{ margin: 0 }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: '0.4rem',
                      fontSize: '0.65rem',
                      color: 'var(--text3)',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    <span>DIREKTIVE #{directives.length - idx}</span>
                    <span>{dir.timestamp ? new Date(dir.timestamp).toLocaleTimeString('de-DE') : ''}</span>
                  </div>
                  <div><strong>Anweisung:</strong> {dir.text}</div>

                  <div className={styles.directiveActions}>
                    {dir.acked ? (
                      <span className={styles.directiveAckTag}>
                        <Check size={11} /> Erledigt
                        {dir.ackedAt ? ` · ${new Date(dir.ackedAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}` : ''}
                      </span>
                    ) : (
                      <button
                        type="button"
                        className={`${styles.directiveBtn} ${styles.directiveBtnAck}`}
                        onClick={() => acknowledgeDirective && acknowledgeDirective(idx)}
                        disabled={!acknowledgeDirective}
                      >
                        <Check size={11} /> Erledigt
                      </button>
                    )}
                    <button
                      type="button"
                      className={`${styles.directiveBtn} ${styles.directiveBtnDismiss}`}
                      onClick={() => dismissDirective && dismissDirective(idx)}
                      disabled={!dismissDirective}
                    >
                      <X size={11} /> Verwerfen
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className={styles.emptyState}>Keine Direktiven protokolliert.</p>
          )}
        </div>
      </div>
    </div>
  );
}
