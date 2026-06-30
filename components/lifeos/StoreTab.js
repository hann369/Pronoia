'use client';

/*
 * Ecosystem / Store tab — extracted from the life-os monolith.
 * Identical behaviour to the inline `case 'store'` block; all state, setters and
 * handlers (incl. the renderBlueprintsView closure) are threaded as props.
 * Product catalogue + derived consts stay local to this tab.
 */

import { useState, useEffect } from 'react';
import styles from '@/app/life-os/page.module.css';
import { PRODUCTS } from '@/lib/storeProducts';

export default function StoreTab({
  profile,
  tiers = [],
  storeCategory,
  setStoreCategory,
  cart = [],
  portalTab,
  setPortalTab,
  storeView,
  setStoreView,
  selectedProduct,
  setSelectedProduct,
  tierCheckoutBusy,
  tierCheckoutMsg,
  handleTierCheckout,
  handleCartCheckout,
  cartCheckoutBusy,
  cartCheckoutMsg,
  renderBlueprintsView,
  addToCart,
  removeFromCart,
  setCartQty,
}) {
  const cats = ['all', ...Array.from(new Set(PRODUCTS.map((p) => p.category)))];
  const visibleProducts = storeCategory === 'all' ? PRODUCTS : PRODUCTS.filter((p) => p.category === storeCategory);
  const cartCount = cart.reduce((s, i) => s + i.qty, 0);
  const cartSubtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);

  // ─── Produktgalerie / Lightbox ───
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const galleryImages = selectedProduct?.images?.length
    ? selectedProduct.images
    : selectedProduct
      ? [{ src: selectedProduct.image, label: selectedProduct.name }]
      : [];

  // Bei Produktwechsel zurück auf das erste Bild und Lightbox schließen.
  useEffect(() => {
    setGalleryIndex(0);
    setLightboxOpen(false);
  }, [selectedProduct?.id]);

  // Tastatursteuerung der Lightbox (Esc schließen, Pfeile blättern).
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

  return (
    <div className={styles.ecoView}>
      <div className={styles.ecoGlow} aria-hidden="true" />

      <header className={styles.ecoHero}>
        <div className={styles.ecoEyebrow}>Ecosystem · System-Level &amp; Store</div>
        <h1 className={styles.ecoTitle}>
          {portalTab === 'subscriptions' ? 'Wähle dein System-Level.' : portalTab === 'blueprints' ? 'Optimierungs-Protokolle der Elite.' : 'Der Ecosystem Store.'}
        </h1>
        <p className={styles.ecoLede}>
          {portalTab === 'subscriptions'
            ? 'Drei Stufen. Ein Protokoll. Jederzeit kündbar.'
            : portalTab === 'blueprints'
              ? 'Erwerbe und installiere wissenschaftliche Blueprints zur System-Optimierung.'
              : 'Kuratierte Werkzeuge für deine Evolution — abgestimmt auf das Pronoia-Protokoll.'}
        </p>
        <div className={styles.ecoToggle}>
          <button
            className={`${styles.ecoToggleBtn} ${portalTab === 'subscriptions' ? styles.ecoToggleActive : ''}`}
            onClick={() => setPortalTab('subscriptions')}
          >
            Abonnements
          </button>
          <button
            className={`${styles.ecoToggleBtn} ${portalTab === 'store' ? styles.ecoToggleActive : ''}`}
            onClick={() => { setPortalTab('store'); setStoreView('grid'); }}
          >
            Store
          </button>
          <button
            className={`${styles.ecoToggleBtn} ${portalTab === 'blueprints' ? styles.ecoToggleActive : ''}`}
            onClick={() => setPortalTab('blueprints')}
          >
            Protocol Blueprints
          </button>
        </div>
      </header>

      {portalTab === 'subscriptions' ? (
        <div className={styles.ecoTiers}>
          {tiers.map((t) => {
            const isActive = (profile?.subscriptionTier || 'free') === t.id;
            return (
              <div key={t.id} className={`${styles.ecoTier} ${t.featured ? styles.ecoTierFeatured : ''}`}>
                {t.featured && <span className={styles.ecoTierBadge}>Beliebt</span>}
                {isActive && <span className={styles.ecoTierCurrent}>Aktiv</span>}
                <div className={styles.ecoTierName}>{t.name}</div>
                <div className={styles.ecoTierSub}>{t.subtitle}</div>
                <div className={styles.ecoTierPriceRow}>
                  <span className={styles.ecoTierPrice}>€{t.price}</span>
                  <span className={styles.ecoTierPeriod}>/ {t.period}</span>
                </div>
                <p className={styles.ecoTierDesc}>{t.description}</p>
                <ul className={styles.ecoTierFeatures}>
                  {t.features.map((f, i) => (
                    <li key={i} className={`${styles.ecoTierFeat} ${!f.available ? styles.ecoTierFeatOff : ''}`}>
                      <span className="material-symbols-outlined">{f.available ? 'check' : 'remove'}</span>
                      {f.text}
                    </li>
                  ))}
                </ul>
                <button
                  className={`${styles.ecoTierBtn} ${t.featured ? styles.ecoTierBtnFeatured : ''}`}
                  onClick={() => handleTierCheckout(t.id)}
                  disabled={tierCheckoutBusy || isActive}
                >
                  {isActive ? 'Aktueller Plan' : tierCheckoutBusy ? 'Lädt…' : t.ctaText}
                </button>
              </div>
            );
          })}
          {tierCheckoutMsg && (
            <p
              role="status"
              aria-live="polite"
              style={{
                gridColumn: '1 / -1',
                margin: '0.25rem 0 0',
                padding: '0.75rem 1rem',
                borderRadius: '10px',
                fontSize: '0.85rem',
                textAlign: 'center',
                border: '1px solid',
                borderColor:
                  tierCheckoutMsg.type === 'error' ? 'rgba(255,77,77,0.4)'
                  : tierCheckoutMsg.type === 'success' ? 'rgba(0,196,140,0.4)'
                  : 'var(--border, rgba(255,255,255,0.15))',
                color:
                  tierCheckoutMsg.type === 'error' ? '#ff6b6b'
                  : tierCheckoutMsg.type === 'success' ? '#00c48c'
                  : 'var(--text-muted, #a8b4c0)',
                background: 'rgba(0,0,0,0.2)',
              }}
            >
              {tierCheckoutMsg.text}
            </p>
          )}
        </div>
      ) : portalTab === 'blueprints' ? (
        renderBlueprintsView()
      ) : storeView === 'cart' ? (
        /* ─── Warenkorb ─── */
        <div className={styles.ecoCart}>
          <button className={styles.ecoBack} onClick={() => setStoreView('grid')}>← Weiter einkaufen</button>
          <h2 className={styles.ecoSectionTitle}>Dein Warenkorb</h2>
          {cart.length === 0 ? (
            <p className={styles.ecoEmpty}>Dein Warenkorb ist leer.</p>
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
                <div className={styles.ecoSummaryRow}><span>Zwischensumme</span><span>€{cartSubtotal.toFixed(2)}</span></div>
                <div className={styles.ecoSummaryRow}><span>Versand</span><span className={styles.ecoFree}>Kostenlos</span></div>
                <div className={styles.ecoSummaryRow}><span>MwSt. (19%)</span><span>€{(cartSubtotal * 0.19).toFixed(2)}</span></div>
                <div className={styles.ecoSummaryTotal}><span>Gesamtsumme</span><span>€{(cartSubtotal * 1.19).toFixed(2)}</span></div>
                <button className={styles.ecoCheckout} onClick={handleCartCheckout} disabled={cartCheckoutBusy}>
                  {cartCheckoutBusy ? 'Lädt…' : 'Zur Kasse'}
                </button>
                {cartCheckoutMsg && (
                  <p
                    role="status"
                    aria-live="polite"
                    style={{
                      margin: '0.5rem 0 0',
                      fontSize: '0.8rem',
                      textAlign: 'center',
                      color: cartCheckoutMsg.type === 'error' ? '#ff6b6b'
                        : cartCheckoutMsg.type === 'success' ? '#00c48c'
                        : 'var(--text-muted, #a8b4c0)',
                    }}
                  >
                    {cartCheckoutMsg.text}
                  </p>
                )}
                <div className={styles.ecoSummaryNote}>
                  <span className="material-symbols-outlined">verified_user</span> Gesicherte Zahlung
                </div>
              </div>
            </div>
          )}
        </div>
      ) : storeView === 'product' && selectedProduct ? (
        /* ─── Produktdetail ─── */
        <div className={styles.ecoDetail}>
          <button className={styles.ecoBack} onClick={() => setStoreView('grid')}>← Zurück zum Store</button>
          <div className={styles.ecoDetailTop}>
            <div className={styles.ecoGallery}>
              <button
                type="button"
                className={styles.ecoDetailImg}
                onClick={() => setLightboxOpen(true)}
                aria-label="Bild vergrößern"
              >
                <img src={galleryImages[galleryIndex]?.src} alt={`${selectedProduct.name} — ${galleryImages[galleryIndex]?.label || ''}`} />
                <span className={styles.ecoGalleryZoom}><span className="material-symbols-outlined">zoom_in</span></span>
              </button>
              {galleryImages.length > 1 && (
                <div className={styles.ecoThumbs}>
                  {galleryImages.map((im, i) => (
                    <button
                      key={i}
                      type="button"
                      className={`${styles.ecoThumb} ${i === galleryIndex ? styles.ecoThumbActive : ''}`}
                      onClick={() => setGalleryIndex(i)}
                      aria-label={im.label}
                      title={im.label}
                    >
                      <img src={im.src} alt={im.label} />
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className={styles.ecoDetailInfo}>
              <div className={styles.ecoDetailCat}>System Module / {selectedProduct.category}</div>
              <h2 className={styles.ecoDetailName}>{selectedProduct.name}</h2>
              <div className={styles.ecoDetailPrice}>€{selectedProduct.price.toFixed(2)} <span>inkl. MwSt.</span></div>
              <p className={styles.ecoDetailDesc}>{selectedProduct.desc}</p>
              <button className={styles.ecoAddBtnLg} onClick={() => addToCart(selectedProduct)}>In den Warenkorb</button>
            </div>
          </div>
          <div className={styles.ecoDetailCards}>
            <div className={styles.ecoInfoCard}>
              <div className={styles.ecoInfoLabel}>Vorteile</div>
              <ul className={styles.ecoInfoList}>
                {selectedProduct.benefits.map((b, i) => <li key={i}>{b}</li>)}
              </ul>
            </div>
            <div className={styles.ecoInfoCard}>
              <div className={styles.ecoInfoLabel}>Anwendung</div>
              <p className={styles.ecoInfoText}>{selectedProduct.usage}</p>
            </div>
            <div className={styles.ecoInfoCard}>
              <div className={styles.ecoInfoLabel}>Inhaltsstoffe</div>
              <div className={styles.ecoIngredients}>
                {selectedProduct.ingredients.map(([n, a], i) => (
                  <div key={i} className={styles.ecoIngredient}><span>{n}</span><span>{a}</span></div>
                ))}
              </div>
            </div>
          </div>

          {lightboxOpen && (
            <div className={styles.ecoLightbox} onClick={() => setLightboxOpen(false)} role="dialog" aria-modal="true">
              <button className={styles.ecoLightboxClose} onClick={() => setLightboxOpen(false)} aria-label="Schließen">
                <span className="material-symbols-outlined">close</span>
              </button>
              {galleryImages.length > 1 && (
                <button
                  className={styles.ecoLightboxNav}
                  data-dir="prev"
                  onClick={(e) => { e.stopPropagation(); setGalleryIndex((i) => (i - 1 + galleryImages.length) % galleryImages.length); }}
                  aria-label="Vorheriges Bild"
                >
                  <span className="material-symbols-outlined">chevron_left</span>
                </button>
              )}
              <img
                className={styles.ecoLightboxImg}
                src={galleryImages[galleryIndex]?.src}
                alt={`${selectedProduct.name} — ${galleryImages[galleryIndex]?.label || ''}`}
                onClick={(e) => e.stopPropagation()}
              />
              {galleryImages.length > 1 && (
                <button
                  className={styles.ecoLightboxNav}
                  data-dir="next"
                  onClick={(e) => { e.stopPropagation(); setGalleryIndex((i) => (i + 1) % galleryImages.length); }}
                  aria-label="Nächstes Bild"
                >
                  <span className="material-symbols-outlined">chevron_right</span>
                </button>
              )}
              <div className={styles.ecoLightboxCaption} onClick={(e) => e.stopPropagation()}>
                {galleryImages[galleryIndex]?.label} · {galleryIndex + 1} / {galleryImages.length}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ─── Store-Grid ─── */
        <>
          <div className={styles.ecoBar}>
            <div className={styles.ecoCats}>
              {cats.map((c) => (
                <button
                  key={c}
                  className={`${styles.ecoCat} ${storeCategory === c ? styles.ecoCatActive : ''}`}
                  onClick={() => setStoreCategory(c)}
                >
                  {c === 'all' ? 'Alle' : c}
                </button>
              ))}
            </div>
            <button className={styles.ecoCartBtn} onClick={() => setStoreView('cart')} aria-label="Warenkorb">
              <span className="material-symbols-outlined">shopping_cart</span>
              {cartCount > 0 && <span className={styles.ecoCartCount}>{cartCount}</span>}
            </button>
          </div>
          <div className={styles.ecoGrid}>
            {visibleProducts.map((p) => (
              <article key={p.id} className={styles.ecoCard}>
                <div className={styles.ecoCardImg} onClick={() => { setSelectedProduct(p); setStoreView('product'); }}>
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
                    <button className={styles.ecoLinkBtn} onClick={() => { setSelectedProduct(p); setStoreView('product'); }}>Details</button>
                    <button className={styles.ecoAddBtn} onClick={() => addToCart(p)}>In den Warenkorb</button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
