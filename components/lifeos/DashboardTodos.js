'use client';

/*
 * DashboardTodos — a lightweight "rough thoughts" capture list for the Dashboard.
 *
 * Intentionally NOT a protocol block: items live in `profile.dashboardTodos`
 * (persisted exactly like `weeklyGoals` via saveProfile → Firestore or
 * localStorage) so the user can jot down anything and check it off without it
 * entering the timer/queue system. If an item has a concrete time, the user can
 * optionally "sync" it, which pushes it into today's calendar/queue via
 * addCalendarBlock.
 */

import { useState } from 'react';
import styles from '@/app/life-os/page.module.css';

export default function DashboardTodos({ profile, saveProfile, addCalendarBlock }) {
  const todos = profile?.dashboardTodos || [];
  const [input, setInput] = useState('');
  const [syncFor, setSyncFor] = useState(null); // todo id currently picking a time
  const [syncTime, setSyncTime] = useState('12:00');

  const persist = (next) => saveProfile({ dashboardTodos: next });

  const addTodo = (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    persist([...todos, { id: Date.now(), text, done: false, synced: false }]);
    setInput('');
  };

  const toggleTodo = (id) =>
    persist(todos.map(t => (t.id === id ? { ...t, done: !t.done } : t)));

  const deleteTodo = (id) =>
    persist(todos.filter(t => t.id !== id));

  const confirmSync = (todo) => {
    addCalendarBlock?.(todo.text, syncTime);
    persist(todos.map(t => (t.id === todo.id ? { ...t, synced: true } : t)));
    setSyncFor(null);
    setSyncTime('12:00');
  };

  const openCount = todos.filter(t => !t.done).length;

  return (
    <div className={styles.panelGroup}>
      <div className={styles.panelGroupLabel}>
        📝 Gedanken &amp; Todos{openCount ? ` (${openCount} offen)` : ''}
      </div>

      <form onSubmit={addTodo} style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.6rem' }}>
        <input
          type="text"
          className={styles.formInput}
          placeholder="Gedanke notieren…"
          value={input}
          onChange={e => setInput(e.target.value)}
          style={{ flex: 1 }}
        />
        <button type="submit" className={styles.formBtn} style={{ width: 'auto', padding: '0 0.9rem' }}>+</button>
      </form>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        {todos.length === 0 && <p className={styles.emptyState}>Noch keine Notizen. Schreib einfach drauflos.</p>}

        {todos.map(todo => (
          <div
            key={todo.id}
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--border-s)',
              borderRadius: '8px',
              padding: '0.55rem 0.65rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.55rem' }}>
              <button
                onClick={() => toggleTodo(todo.id)}
                title={todo.done ? 'Wieder öffnen' : 'Abhaken'}
                style={{
                  flexShrink: 0,
                  width: '18px',
                  height: '18px',
                  marginTop: '2px',
                  borderRadius: '5px',
                  border: '1.5px solid',
                  borderColor: todo.done ? 'var(--cobalt-bright)' : 'var(--border-s)',
                  background: todo.done ? 'var(--cobalt-bright)' : 'transparent',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: '0.7rem',
                  lineHeight: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease',
                }}
              >
                {todo.done ? '✓' : ''}
              </button>

              <span
                onClick={() => toggleTodo(todo.id)}
                style={{
                  flex: 1,
                  fontSize: '0.85rem',
                  lineHeight: 1.4,
                  color: todo.done ? 'var(--text3)' : 'var(--text)',
                  textDecoration: todo.done ? 'line-through' : 'none',
                  cursor: 'pointer',
                  wordBreak: 'break-word',
                }}
              >
                {todo.text}
                {todo.synced && (
                  <span style={{ marginLeft: '0.4rem', fontSize: '0.65rem', color: 'var(--green)' }} title="In den Kalender übernommen">
                    📅
                  </span>
                )}
              </span>

              <div style={{ display: 'flex', gap: '0.3rem', flexShrink: 0 }}>
                {!todo.synced && addCalendarBlock && (
                  <button
                    onClick={() => { setSyncFor(syncFor === todo.id ? null : todo.id); setSyncTime('12:00'); }}
                    title="Mit genauer Uhrzeit in den Kalender übernehmen"
                    style={{
                      background: 'none',
                      border: 'none',
                      color: syncFor === todo.id ? 'var(--cobalt-bright)' : 'var(--text3)',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      padding: 0,
                    }}
                  >
                    🕐
                  </button>
                )}
                <button
                  onClick={() => deleteTodo(todo.id)}
                  title="Löschen"
                  style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: '0.85rem', padding: 0 }}
                >
                  ✕
                </button>
              </div>
            </div>

            {syncFor === todo.id && (
              <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', marginTop: '0.5rem', paddingLeft: '1.7rem' }}>
                <input
                  type="time"
                  value={syncTime}
                  onChange={e => setSyncTime(e.target.value)}
                  className={styles.formInput}
                  style={{ width: 'auto', padding: '0.25rem 0.4rem', fontSize: '0.8rem' }}
                />
                <button
                  onClick={() => confirmSync(todo)}
                  className={styles.formBtn}
                  style={{ width: 'auto', padding: '0.25rem 0.7rem', fontSize: '0.75rem' }}
                >
                  In Queue übernehmen
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
