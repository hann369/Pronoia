'use client';

/*
 * Standalone public store — NOT part of Life OS. Browsable anonymously; shows
 * only the physical products. Checkout works for guests (auth optional) via the
 * same /api/stripe/cart route. Reuses the Ecosystem store styles for a
 * consistent look. The global <Nav> renders here, so users always have a way
 * back to the main site.
 */

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { PRODUCTS } from '@/lib/storeProducts';
import { useForceDarkTheme } from '@/hooks/useForceDarkTheme';
import styles from '@/app/life-os/page.module.css';

function StoreInner() {
  useForceDarkTheme();
  const { user } = useAuth();
  const searchParams = useSearchParams();

  const [cart, setCart] = useState([]);
  const [view, setView] = useState('grid'); // 'grid' | 'product' | 'cart'
  const [selected, setSelected] = useState(null);
  const [category, setCategory] = useState('all');
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null); // { type, text }

  const cats = ['all', ...Array.from(new Set(PRODUCTS.map((p) => p.category)))];
  const visible = category === 'all' ? PRODUCTS : PRODUCTS.filter((p) => p.category === category);
  const cartCount = cart.reduce((s, i) => s + i.qty, 0);
  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);

  const galleryImages = selected?.images?.length
    ? selected.images
    : selected
      ? [{ src: selected.image, label: selected.name }]
      : [];

  // Surface Stripe checkout return state.
  useEffect(() => {
    const c = searchParams.get('checkout');
    if (c === 'success') { setView('cart'); setMsg({ type: 'success', text: 'Zahlung erfolgreich. Vielen Dank für deinen Einkauf — deine Bestellung wird bearbeitet.' }); setCart([]); }
    else if (c === 'cancel') setMsg({ type: 'error', text: 'Bezahlung abgebrochen. Dein Warenkorb ist weiterhin gespeichert.' });
  }, [searchParams]);

  useEffect(() => { setGalleryIndex(0); setLightboxOpen(false); }, [selected?.id]);

  useEffect(() => {
    if (!lightboxOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setLightboxOpen(false);
      else if (e.key === 'ArrowRight') setGalleryIndex((i) => (i + 1) % galleryImages.length);
      else if (e.key === 'ArrowLeft') setGalleryIndex((i) => (i - 1 + galleryImages.length) % galleryImages.length);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightboxOpen, galleryImages.length]);

  const addToCart = (product) => {
    setCart((prev) => {
      const found = prev.find((i) => i.id === product.id);
      if (found) return prev.map((i) => (i.id === product.id ? { ...i, qty: i.qty + 1 } : i));
      return [...prev, { id: product.id, name: product.name, price: product.price, image: product.image, qty: 1 }];
    });
    setMsg({ type: 'info', text: `${product.name} in den Warenkorb gelegt.` });
  };
  const removeFromCart = (id) => setCart((prev) => prev.filter((i) => i.id !== id));
  const setCartQty = (id, delta) => setCart((prev) => prev.map((i) => (i.id === id ? { ...i, qty: Math.max(1, i.qty + delta) } : i)));

  const checkout = async () => {
    if (cart.length === 0 || busy) return;
    setBusy(true);
    setMsg({ type: 'info', text: 'Leite zur sicheren Stripe-Kasse…' });
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (user) {
        try { headers.Authorization = `Bearer ${await user.getIdToken()}`; } catch {}
      }
      const res = await fetch('/api/stripe/cart', {
        method: 'POST',
        headers,
        body: JSON.stringify({ items: cart.map((i) => ({ id: i.id, qty: i.qty })) }),
      });
      const data = await res.json();
      if (data.url) { window.location.href = data.url; return; }
      setMsg({ type: 'error', text: 'Kasse ist derzeit nicht verfügbar. Bitte versuche es später erneut.' });
    } catch (e) {
      setMsg({ type: 'error', text: 'Verbindung zur Kasse fehlgeschlagen. Bitte erneut versuchen.' });
    } finally {
      setBusy(false);
    }
  };

  const msgStyle = (m) => ({
    margin: '0.5rem 0 0', fontSize: '0.8rem', textAlign: 'center',
    color: m.type === 'error' ? '#ff6b6b' : m.type === 'success' ? '#00c48c' : 'var(--text-muted, #a8b4c0)',
  });

  return (
    <main style={{ background: 'var(--bg)', minHeight: '100vh', paddingTop: '5.5rem' }}>
      <div className={styles.ecoView} style={{ maxWidth: 1280, margin: '0 auto', padding: '0 1.5rem 5rem' }}>
        <div className={styles.ecoGlow} aria-hidden="true" />

        <header className={styles.ecoHero}>
          <div className={styles.ecoEyebrow}>Pronoia Store · Kuratierte Werkzeuge</div>
          <h1 className={styles.ecoTitle}>Der Pronoia Store.</h1>
          <p className={styles.ecoLede}>
            Kuratierte Werkzeuge für deine Evolution — abgestimmt auf das Pronoia-Protokoll. Versand in der EU, sichere Bezahlung über Stripe.
          </p>
        </header>

        {view === 'cart' ? (
          <div className={styles.ecoCart}>
            <button className={styles.ecoBack} onClick={() => setView('grid')}>← Weiter einkaufen</button>
            <h2 className={styles.ecoSectionTitle}>Dein Warenkorb</h2>
            {cart.length === 0 ? (
              <>
                <p className={styles.ecoEmpty}>Dein Warenkorb ist leer.</p>
                {msg && <p style={msgStyle(msg)}>{msg.text}</p>}
              </>
            ) : (
              <div className={styles.ecoCartGrid}>
                <div className={styles.ecoCartItems}>
                  {cart.map((i) => (
                    <div key={i.id} className={styles.ecoCartItem}>
                      <div className={styles.ecoCartItemImg}><img src={i.image} alt={i.name} /></div>
                      <div className={styles.ecoCartItemMain}>
                        <div className={styles.ecoCartItemTop}>
                          <h3 className={styles.ecoCartItemName}>{i.name}</h3>
                          <span className={styles.ecoCartItemPrice}>€{(i.price * i.qty).toFixed(2)}</span>
                        </div>
                        <div className={styles.ecoCartItemBottom}>
                          <div className={styles.ecoQty}>
                            <button onClick={() => setCartQty(i.id, -1)} aria-label="Weniger"><span className="material-symbols-outlined">remove</span></button>
                            <span>{i.qty}</span>
                            <button onClick={() => setCartQty(i.id, 1)} aria-label="Mehr"><span className="material-symbols-outlined">add</span></button>
                          </div>
                          <button className={styles.ecoCartDelete} onClick={() => removeFromCart(i.id)} aria-label="Entfernen"><span className="material-symbols-outlined">delete</span></button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className={styles.ecoSummary}>
                  <h3 className={styles.ecoSummaryTitle}>Bestellübersicht</h3>
                  <div className={styles.ecoSummaryRow}><span>Zwischensumme</span><span>€{subtotal.toFixed(2)}</span></div>
                  <div className={styles.ecoSummaryRow}><span>Versand</span><span className={styles.ecoFree}>Kostenlos</span></div>
                  <div className={styles.ecoSummaryRow}><span>MwSt. (19%)</span><span>€{(subtotal * 0.19).toFixed(2)}</span></div>
                  <div className={styles.ecoSummaryTotal}><span>Gesamtsumme</span><span>€{(subtotal * 1.19).toFixed(2)}</span></div>
                  <button className={styles.ecoCheckout} onClick={checkout} disabled={busy}>{busy ? 'Lädt…' : 'Zur Kasse'}</button>
                  {msg && <p role="status" aria-live="polite" style={msgStyle(msg)}>{msg.text}</p>}
                  <div className={styles.ecoSummaryNote}>
                    <span className="material-symbols-outlined">verified_user</span> Gesicherte Zahlung
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : view === 'product' && selected ? (
          <div className={styles.ecoDetail}>
            <button className={styles.ecoBack} onClick={() => setView('grid')}>← Zurück zum Store</button>
            <div className={styles.ecoDetailTop}>
              <div className={styles.ecoGallery}>
                <button type="button" className={styles.ecoDetailImg} onClick={() => setLightboxOpen(true)} aria-label="Bild vergrößern">
                  <img src={galleryImages[galleryIndex]?.src} alt={`${selected.name} — ${galleryImages[galleryIndex]?.label || ''}`} />
                  <span className={styles.ecoGalleryZoom}><span className="material-symbols-outlined">zoom_in</span></span>
                </button>
                {galleryImages.length > 1 && (
                  <div className={styles.ecoThumbs}>
                    {galleryImages.map((im, i) => (
                      <button key={i} type="button" className={`${styles.ecoThumb} ${i === galleryIndex ? styles.ecoThumbActive : ''}`} onClick={() => setGalleryIndex(i)} aria-label={im.label} title={im.label}>
                        <img src={im.src} alt={im.label} />
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className={styles.ecoDetailInfo}>
                <div className={styles.ecoDetailCat}>System Module / {selected.category}</div>
                <h2 className={styles.ecoDetailName}>{selected.name}</h2>
                <div className={styles.ecoDetailPrice}>€{selected.price.toFixed(2)} <span>inkl. MwSt.</span></div>
                <p className={styles.ecoDetailDesc}>{selected.desc}</p>
                <button className={styles.ecoAddBtnLg} onClick={() => addToCart(selected)}>In den Warenkorb</button>
              </div>
            </div>
            <div className={styles.ecoDetailCards}>
              <div className={styles.ecoInfoCard}>
                <div className={styles.ecoInfoLabel}>Vorteile</div>
                <ul className={styles.ecoInfoList}>{selected.benefits.map((b, i) => <li key={i}>{b}</li>)}</ul>
              </div>
              <div className={styles.ecoInfoCard}>
                <div className={styles.ecoInfoLabel}>Anwendung</div>
                <p className={styles.ecoInfoText}>{selected.usage}</p>
              </div>
              <div className={styles.ecoInfoCard}>
                <div className={styles.ecoInfoLabel}>Inhaltsstoffe</div>
                <div className={styles.ecoIngredients}>
                  {selected.ingredients.map(([n, a], i) => <div key={i} className={styles.ecoIngredient}><span>{n}</span><span>{a}</span></div>)}
                </div>
              </div>
            </div>

            {lightboxOpen && (
              <div className={styles.ecoLightbox} onClick={() => setLightboxOpen(false)} role="dialog" aria-modal="true">
                <button className={styles.ecoLightboxClose} onClick={() => setLightboxOpen(false)} aria-label="Schließen"><span className="material-symbols-outlined">close</span></button>
                {galleryImages.length > 1 && (
                  <button className={styles.ecoLightboxNav} data-dir="prev" onClick={(e) => { e.stopPropagation(); setGalleryIndex((i) => (i - 1 + galleryImages.length) % galleryImages.length); }} aria-label="Vorheriges Bild"><span className="material-symbols-outlined">chevron_left</span></button>
                )}
                <img className={styles.ecoLightboxImg} src={galleryImages[galleryIndex]?.src} alt={`${selected.name} — ${galleryImages[galleryIndex]?.label || ''}`} onClick={(e) => e.stopPropagation()} />
                {galleryImages.length > 1 && (
                  <button className={styles.ecoLightboxNav} data-dir="next" onClick={(e) => { e.stopPropagation(); setGalleryIndex((i) => (i + 1) % galleryImages.length); }} aria-label="Nächstes Bild"><span className="material-symbols-outlined">chevron_right</span></button>
                )}
                <div className={styles.ecoLightboxCaption} onClick={(e) => e.stopPropagation()}>{galleryImages[galleryIndex]?.label} · {galleryIndex + 1} / {galleryImages.length}</div>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className={styles.ecoBar}>
              <div className={styles.ecoCats}>
                {cats.map((c) => (
                  <button key={c} className={`${styles.ecoCat} ${category === c ? styles.ecoCatActive : ''}`} onClick={() => setCategory(c)}>
                    {c === 'all' ? 'Alle' : c}
                  </button>
                ))}
              </div>
              <button className={styles.ecoCartBtn} onClick={() => setView('cart')} aria-label="Warenkorb">
                <span className="material-symbols-outlined">shopping_cart</span>
                {cartCount > 0 && <span className={styles.ecoCartCount}>{cartCount}</span>}
              </button>
            </div>
            <div className={styles.ecoGrid}>
              {visible.map((p) => (
                <article key={p.id} className={styles.ecoCard}>
                  <div className={styles.ecoCardImg} onClick={() => { setSelected(p); setView('product'); }}>
                    <img src={p.image} alt={p.name} />
                    <span className={styles.ecoCardCat}>{p.category}</span>
                  </div>
                  <div className={styles.ecoCardBody}>
                    <div className={styles.ecoCardTop}>
                      <h3 className={styles.ecoCardName}>{p.name}</h3>
                      <span className={styles.ecoCardPrice}>€{p.price}</span>
                    </div>
                    <p className={styles.ecoCardDesc}>{p.desc}</p>
                    <div className={styles.ecoCardFoot}>
                      <button className={styles.ecoLinkBtn} onClick={() => { setSelected(p); setView('product'); }}>Details</button>
                      <button className={styles.ecoAddBtn} onClick={() => addToCart(p)}>In den Warenkorb</button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  );
}

export default function StorePage() {
  return (
    <Suspense fallback={null}>
      <StoreInner />
    </Suspense>
  );
}
