'use client';
import { useEffect, useState } from 'react';
import { collection, query, orderBy, getDocs, addDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import styles from './page.module.css';

const TYPE_ICONS = { note: '✦', link: '⌘', youtube: '▶', file: '◈' };

export default function VaultPage() {
  const { user } = useAuth();
  const [items, setItems]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [formOpen, setFormOpen]     = useState(false);
  const [filterTag, setFilterTag]   = useState('all');
  const [saving, setSaving]         = useState(false);
  const [toast, setToast]           = useState('');
  const [form, setForm] = useState({ type: 'note', title: '', content: '', tags: '' });

  const userId = user?.uid || 'local-user-123';

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const loadItems = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'vault_items'), orderBy('created_at', 'desc'));
      const snap = await getDocs(q);
      setItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      // fallback to localStorage
      const local = JSON.parse(localStorage.getItem('px_vault') || '[]');
      setItems(local);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadItems(); }, []);

  const allTags = ['all', ...new Set(items.flatMap(i => i.tags || []))];
  const filtered = filterTag === 'all' ? items : items.filter(i => (i.tags || []).includes(filterTag));

  const handleSave = async () => {
    if (!form.title.trim()) return showToast('Title required');
    setSaving(true);
    const payload = {
      user_id: userId,
      type: form.type,
      title: form.title.trim(),
      content: form.content.trim(),
      tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
      created_at: new Date().toISOString(),
    };
    try {
      await addDoc(collection(db, 'vault_items'), payload);
    } catch {
      const local = JSON.parse(localStorage.getItem('px_vault') || '[]');
      localStorage.setItem('px_vault', JSON.stringify([{ id: Date.now().toString(), ...payload }, ...local]));
    }
    await loadItems();
    setForm({ type: 'note', title: '', content: '', tags: '' });
    setFormOpen(false);
    setSaving(false);
    showToast('Ingested into vault ✓');
  };

  const handleDelete = async (id) => {
    try {
      await deleteDoc(doc(db, 'vault_items', id));
    } catch {
      const local = JSON.parse(localStorage.getItem('px_vault') || '[]');
      localStorage.setItem('px_vault', JSON.stringify(local.filter(i => i.id !== id)));
    }
    setItems(prev => prev.filter(i => i.id !== id));
  };

  return (
    <>
      {toast && <div className={styles.toast}>{toast}</div>}

      {/* Hero */}
      <section className={styles.hero}>
        <div className="container">
          <span className="label-mono" style={{ color: 'var(--tan)', marginBottom: '1.5rem', display: 'block' }}>
            Context Canvas
          </span>
          <h1 className={styles.heroTitle}>Knowledge Vault</h1>
          <p className={styles.heroSub}>
            Your intelligent spatial storage. The Pronoia Agent references this vault
            to optimize your protocols and generate personalized insights.
          </p>
          <div className={styles.heroMeta}>
            <div className={styles.stat}>
              <span className={styles.statNum}>{items.length}</span>
              <span className={styles.statLabel}>Items</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statNum}>{new Set(items.flatMap(i => i.tags || [])).size}</span>
              <span className={styles.statLabel}>Tags</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statNum}>{items.filter(i => {
                const d = new Date(i.created_at);
                return (Date.now() - d.getTime()) < 7 * 24 * 60 * 60 * 1000;
              }).length}</span>
              <span className={styles.statLabel}>This Week</span>
            </div>
          </div>
        </div>
      </section>

      {/* Main content */}
      <div className="container" style={{ paddingBottom: '8rem' }}>

        {/* Actions bar */}
        <div className={styles.actionsBar}>
          <div className={styles.tags}>
            {allTags.map(t => (
              <button
                key={t}
                className={`${styles.tagBtn} ${filterTag === t ? styles.tagActive : ''}`}
                onClick={() => setFilterTag(t)}
              >
                {t}
              </button>
            ))}
          </div>
          <button className="btn btn-primary" onClick={() => setFormOpen(o => !o)} style={{ fontSize: '0.72rem' }}>
            {formOpen ? '× Close' : '+ Ingest'}
          </button>
        </div>

        {/* Ingest form */}
        {formOpen && (
          <div className={`card ${styles.form}`}>
            <h2 className={styles.formTitle}>Ingest Context</h2>
            <div className={styles.formRow}>
              <div className={styles.formField}>
                <label className="label-mono">Type</label>
                <select className={styles.input} value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                  <option value="note">Note / Text</option>
                  <option value="link">Web Link</option>
                  <option value="youtube">YouTube</option>
                  <option value="file">File Reference</option>
                </select>
              </div>
              <div className={styles.formField} style={{ flex: 2 }}>
                <label className="label-mono">Title</label>
                <input className={styles.input} placeholder="Give this context a name" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
              </div>
            </div>
            <div className={styles.formField}>
              <label className="label-mono">Content / URL</label>
              <textarea className={styles.input} rows={5} placeholder="Paste your link, thoughts, or raw text…" value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} />
            </div>
            <div className={styles.formField}>
              <label className="label-mono">Tags (comma separated)</label>
              <input className={styles.input} placeholder="research, neuroscience, protocol" value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} />
            </div>
            <div className={styles.formActions}>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Ingesting…' : 'Ingest into Vault →'}</button>
              <button className="btn btn-ghost" onClick={() => setFormOpen(false)}>Cancel</button>
            </div>
          </div>
        )}

        {/* Insight panel */}
        {items.length > 0 && (
          <div className={styles.insightPanel}>
            <span className={styles.insightIcon}>✦</span>
            <div>
              <span className="label-mono" style={{ color: 'var(--cobalt-bright)', display: 'block', marginBottom: '0.3rem' }}>Agent Insight</span>
              <p className={styles.insightText}>
                {items.length} items stored. {allTags.filter(t => t !== 'all').slice(0, 3).map(t => `#${t}`).join(', ')} are your top tags. Consider reviewing older items to enrich your protocol context.
              </p>
            </div>
          </div>
        )}

        {/* Grid */}
        {loading ? (
          <div className={styles.empty}><span className="label-mono">Loading vault…</span></div>
        ) : filtered.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>✦</div>
            <p className={styles.emptyTitle}>Your vault is empty.</p>
            <p className={styles.emptySub}>Ingest research, links, and notes to power your protocol.</p>
            <button className="btn btn-primary" onClick={() => setFormOpen(true)}>Add First Item →</button>
          </div>
        ) : (
          <div className={styles.grid}>
            {filtered.map(item => (
              <article key={item.id} className={`card ${styles.item}`}>
                <div className={styles.itemType}>{TYPE_ICONS[item.type] || '✦'} {item.type}</div>
                <h3 className={styles.itemTitle}>{item.title}</h3>
                <p className={styles.itemContent}>{item.content}</p>
                <div className={styles.itemMeta}>
                  <div className={styles.itemTags}>
                    {(item.tags || []).map(t => (
                      <span key={t} className={styles.itemTag} onClick={() => setFilterTag(t)}>#{t}</span>
                    ))}
                  </div>
                  <button className={styles.deleteBtn} onClick={() => handleDelete(item.id)} aria-label="Delete item">×</button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
