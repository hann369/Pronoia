'use client';

/*
 * Vault (Context Ingestion) tab — extracted from the life-os monolith.
 * Behaviour identical to the inline `case 'vault'` block; all state, setters
 * and handlers are threaded as props. Local view consts stay local.
 */

import { useTabData } from '@/hooks/useTabData';
import styles from '@/app/life-os/page.module.css';

const VAULT_TYPE = {
  note: '✦ Note', link: '⌘ Link', youtube: '▶ Video', file: '💾 File',
};

const TYPE_OPTIONS = [
  { v: 'note', label: 'Note', icon: 'notes' },
  { v: 'link', label: 'Web', icon: 'link' },
  { v: 'youtube', label: 'Video', icon: 'smart_display' },
  { v: 'file', label: 'File', icon: 'upload_file' },
];

export default function VaultTab({
  vaultItems = [],
  vaultForm,
  setVaultForm,
  vaultToast,
  uploadingFile,
  uploadProgress,
  vaultSaving,
  vaultLoading,
  handleVaultFileUpload,
  handleSaveVaultItem,
  handleDeleteVaultItem,
}) {
  // Last-used tag filter persists across reloads via the shared per-tab store.
  const { data: vaultFilterTag, save: setVaultFilterTag } = useTabData('vaultFilter', 'all');

  const allTags = [...new Set(vaultItems.flatMap((i) => i.tags || []))];
  const visibleItems = vaultFilterTag === 'all'
    ? vaultItems
    : vaultItems.filter((i) => (i.tags || []).includes(vaultFilterTag));

  return (
    <div className={styles.vtView}>
      <div className={styles.vtGlow} aria-hidden="true" />

      <header className={styles.vtHero}>
        <div className={styles.vtEyebrow}>Vault · Context Ingestion</div>
        <h1 className={styles.vtTitle}>Dein zweites<br />Gedächtnis.</h1>
        <p className={styles.vtLede}>Speise Notizen, Links und Quellen ein — strukturiert nach Tags, jederzeit abrufbar.</p>
        <div className={styles.vtStats}>
          <span><strong>{vaultItems.length}</strong> Items</span>
          <span><strong>{allTags.length}</strong> Tags</span>
        </div>
      </header>

      <div className={styles.vtGrid}>
        {/* Ingestion form */}
        <section className={styles.vtCard}>
          <div className={styles.vtCardHead}>
            <span className={styles.vtCardIndex}>+</span>
            Einspeisen
          </div>
          <div className={styles.vtCardBody}>
            {vaultToast && <div className={styles.vtToast}>{vaultToast}</div>}
            <label className={styles.vtLabel}>Typ</label>
            <div className={styles.vtTypeGrid}>
              {TYPE_OPTIONS.map((t) => (
                <button
                  type="button"
                  key={t.v}
                  className={`${styles.vtTypeBtn} ${vaultForm.type === t.v ? styles.vtTypeBtnActive : ''}`}
                  onClick={() => setVaultForm((f) => ({ ...f, type: t.v }))}
                >
                  <span className="material-symbols-outlined">{t.icon}</span>
                  <span>{t.label}</span>
                </button>
              ))}
            </div>
            {vaultForm.type === 'file' && (
              <div className={styles.vtDropzone}>
                <input type="file" onChange={handleVaultFileUpload} disabled={uploadingFile} className={styles.vtFileInput} />
                {uploadingFile && (
                  <div className={styles.vtUploadStatus}>
                    Upload: {uploadProgress}%
                    <div className={styles.vtUploadBar}>
                      <div className={styles.vtUploadFill} style={{ width: `${uploadProgress}%` }} />
                    </div>
                  </div>
                )}
              </div>
            )}
            <label className={styles.vtLabel}>Titel</label>
            <input type="text" className={styles.vtInput} placeholder="Titel…" value={vaultForm.title} onChange={(e) => setVaultForm((f) => ({ ...f, title: e.target.value }))} />
            <label className={styles.vtLabel}>Inhalt / URL</label>
            <textarea className={styles.vtInput} rows={4} style={{ resize: 'none' }} placeholder="Inhalt / URL…" value={vaultForm.content} onChange={(e) => setVaultForm((f) => ({ ...f, content: e.target.value }))} />
            <label className={styles.vtLabel}>Tags (kommagetrennt)</label>
            <div className={styles.vtTagInputWrap}>
              <span className={`material-symbols-outlined ${styles.vtTagInputIcon}`}>sell</span>
              <input type="text" className={`${styles.vtInput} ${styles.vtInputWithIcon}`} placeholder="neuroscience, focus, learning…" value={vaultForm.tags} onChange={(e) => setVaultForm((f) => ({ ...f, tags: e.target.value }))} />
            </div>
            <button className={styles.vtIngestBtn} onClick={handleSaveVaultItem} disabled={vaultSaving}>
              {vaultSaving ? 'Einspeisen…' : 'In den Vault einspeisen →'}
            </button>
          </div>
        </section>

        {/* Saved items */}
        <aside className={styles.vtCard}>
          <div className={styles.vtCardHead}>
            <span className={styles.vtCardIndex}>◫</span>
            Archiv
          </div>
          <div className={styles.vtCardBody}>
            <div className={styles.vtTagsRow}>
              {['all', ...allTags].map((tag) => (
                <button key={tag} className={`${styles.vtTag} ${vaultFilterTag === tag ? styles.vtTagActive : ''}`} onClick={() => setVaultFilterTag(tag)}>
                  {tag === 'all' ? 'Alle' : `#${tag}`}
                </button>
              ))}
            </div>
            <div className={styles.vtItemScroll}>
              {vaultLoading ? (
                <p className={styles.vtEmpty}>Lade Vault…</p>
              ) : visibleItems.length === 0 ? (
                <p className={styles.vtEmpty}>Noch nichts eingespeist.</p>
              ) : (
                visibleItems.map((item) => (
                  <div key={item.id} className={styles.vtItem}>
                    <div className={styles.vtItemTop}>
                      <span className={styles.vtItemType}>{VAULT_TYPE[item.type] || '✦ Note'}</span>
                      <button className={styles.vtItemDelete} onClick={() => handleDeleteVaultItem(item.id)} aria-label="Löschen">✕</button>
                    </div>
                    <h4 className={styles.vtItemTitle}>{item.title}</h4>
                    <p className={styles.vtItemContent}>{item.content}</p>
                    <div className={styles.vtItemTags}>
                      {(item.tags || []).map((tag) => <span key={tag} className={styles.vtItemTag} onClick={() => setVaultFilterTag(tag)}>#{tag}</span>)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
