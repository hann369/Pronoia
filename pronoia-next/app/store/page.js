'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import styles from './page.module.css';

// Fallback products if Firestore is empty / not yet configured
const FALLBACK_PRODUCTS = [
  {
    id: 'pronoia-protocol-system',
    name: 'Pronoia Protocol System',
    subtitle: 'The Complete Agentic Framework',
    price: 97,
    currency: 'EUR',
    tag: 'BESTSELLER',
    description:
      'The full Pronoia Protocol: 12-week circadian optimization program, agentic workflow architecture, supplement stack guide, and AI-driven daily scheduling. Everything you need to build a high-performance system.',
    includes: [
      '12-Week Protocol PDF (142 pages)',
      'Supplement Stack Blueprint',
      'Circadian Optimization Guide',
      'Agentic Workflow Templates',
      'Private Community Access',
    ],
    stripePaymentLink: 'https://buy.stripe.com/REPLACE_ME_1',
    featured: true,
  },
  {
    id: 'deliberate-practice-course',
    name: 'Deliberate Practice',
    subtitle: 'Skill Acquisition Architecture',
    price: 47,
    currency: 'EUR',
    tag: 'COURSE',
    description:
      'The science of accelerated skill acquisition applied to real-world execution. Learn how to design deliberate practice sessions that compound daily.',
    includes: [
      'PDF Guide (68 pages)',
      'Practice Template System',
      'Progress Tracking Sheets',
      'Reading List & Resources',
    ],
    stripePaymentLink: 'https://buy.stripe.com/REPLACE_ME_2',
    featured: false,
  },
  {
    id: 'biological-blueprint',
    name: 'Biological Blueprint',
    subtitle: 'Environment over Willpower',
    price: 27,
    currency: 'EUR',
    tag: 'GUIDE',
    description:
      'Eliminate invisible friction. A practical guide to removing endocrine disruptors, toxic inputs, and circadian stressors from your environment.',
    includes: [
      'PDF Blueprint (48 pages)',
      'Toxin Audit Checklist',
      'Product Replacement List',
      'Morning & Evening Routines',
    ],
    stripePaymentLink: 'https://buy.stripe.com/REPLACE_ME_3',
    featured: false,
  },
];

function formatPrice(price, currency = 'EUR') {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency }).format(price);
}

export default function StorePage() {
  const router           = useRouter();
  const { user, loading } = useAuth();
  const [products, setProducts]   = useState([]);
  const [fetching, setFetching]   = useState(true);
  const [toast, setToast]         = useState('');

  // Load products from Firestore (falls back to static list)
  useEffect(() => {
    async function loadProducts() {
      try {
        const q = query(collection(db, 'products'), orderBy('order', 'asc'));
        const snap = await getDocs(q);
        if (!snap.empty) {
          setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } else {
          setProducts(FALLBACK_PRODUCTS);
        }
      } catch {
        setProducts(FALLBACK_PRODUCTS);
      } finally {
        setFetching(false);
      }
    }
    loadProducts();
  }, []);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  const handleBuy = (product) => {
    if (loading) return;
    if (!user) {
      showToast('Please sign in to purchase →');
      setTimeout(() => router.push('/auth'), 1200);
      return;
    }
    if (!product.stripePaymentLink || product.stripePaymentLink.includes('REPLACE_ME')) {
      showToast('Checkout coming soon — link not yet configured.');
      return;
    }
    // Pass user email to Stripe pre-fill
    const url = new URL(product.stripePaymentLink);
    url.searchParams.set('prefilled_email', user.email);
    window.open(url.toString(), '_blank', 'noopener');
  };

  const featured = products.find(p => p.featured);
  const rest      = products.filter(p => !p.featured);

  return (
    <>
      {/* Toast */}
      {toast && (
        <div className={styles.toast} role="status">
          {toast}
        </div>
      )}

      {/* ═══ HERO ══════════════════════════════════════════════ */}
      <section className={styles.hero}>
        <div className="container">
          <div className={styles.heroInner}>
            <span className="badge badge-cobalt" style={{ marginBottom: '2rem' }}>
              <span className="pulse-dot" />
              Pronoia Store
            </span>
            <h1 className={styles.heroTitle}>
              Invest in your<br />
              <em>system.</em>
            </h1>
            <p className={styles.heroSub}>
              PDFs, protocols, and frameworks built from first principles.
              No fluff. No courses stretched to fill time.
              Every product is exactly as long as it needs to be.
            </p>
            <div className={styles.heroStats}>
              <div className={styles.heroStat}>
                <span className={styles.heroStatNum}>3</span>
                <span className={styles.heroStatLabel}>Products</span>
              </div>
              <div className={styles.heroStatDivider} />
              <div className={styles.heroStat}>
                <span className={styles.heroStatNum}>PDF</span>
                <span className={styles.heroStatLabel}>Format</span>
              </div>
              <div className={styles.heroStatDivider} />
              <div className={styles.heroStat}>
                <span className={styles.heroStatNum}>∞</span>
                <span className={styles.heroStatLabel}>Access</span>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className={styles.scrollHint} aria-hidden="true">
          <span className="label-mono" style={{ fontSize: '0.6rem' }}>Scroll</span>
          <div className={styles.scrollLine} />
        </div>
      </section>

      {/* ═══ FEATURED PRODUCT ══════════════════════════════════ */}
      {!fetching && featured && (
        <section className={styles.featuredSection}>
          <div className="container">
            <span className="label-mono" style={{ marginBottom: '2rem', display: 'block' }}>Featured</span>
            <div className={styles.featuredCard}>
              <div className={styles.featuredBadge}>{featured.tag}</div>

              <div className={styles.featuredLeft}>
                <h2 className={styles.featuredTitle}>{featured.name}</h2>
                <p className={styles.featuredSubtitle}>{featured.subtitle}</p>
                <p className={styles.featuredDesc}>{featured.description}</p>

                <ul className={styles.includes}>
                  {featured.includes.map((item, i) => (
                    <li key={i} className={styles.includesItem}>
                      <span className={styles.includesCheck}>✓</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className={styles.featuredRight}>
                <div className={styles.priceBox}>
                  <span className={styles.priceLabel}>One-time payment</span>
                  <span className={styles.price}>{formatPrice(featured.price, featured.currency)}</span>
                  <span className={styles.priceNote}>Lifetime access · Instant PDF download</span>
                </div>

                <button
                  className={`btn btn-primary btn-lg ${styles.buyBtn}`}
                  onClick={() => handleBuy(featured)}
                >
                  Get Access →
                </button>

                {!user && (
                  <p className={styles.loginNote}>
                    <a href="/auth">Sign in</a> required before checkout
                  </p>
                )}

                <div className={styles.guarantee}>
                  <span>🔒</span>
                  <span>Secure checkout via Stripe</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ═══ PRODUCT GRID ═══════════════════════════════════════ */}
      <section className={`section ${styles.gridSection}`}>
        <div className="container">
          <div className={styles.gridHeader}>
            <h2 className={styles.gridTitle}>All Products</h2>
            <span className="label-mono">{products.length} available</span>
          </div>

          {fetching ? (
            <div className={styles.loading}>
              <span className="label-mono">Loading products…</span>
            </div>
          ) : (
            <div className={styles.productGrid}>
              {rest.map(product => (
                <article key={product.id} className={`card ${styles.productCard}`}>
                  {product.tag && (
                    <div className={styles.cardTag}>{product.tag}</div>
                  )}
                  <h3 className={styles.cardTitle}>{product.name}</h3>
                  <p className={styles.cardSubtitle}>{product.subtitle}</p>
                  <p className={styles.cardDesc}>{product.description}</p>

                  <ul className={styles.cardIncludes}>
                    {product.includes?.map((item, i) => (
                      <li key={i}>
                        <span style={{ color: 'var(--cobalt-bright)' }}>✓</span> {item}
                      </li>
                    ))}
                  </ul>

                  <div className={styles.cardFooter}>
                    <span className={styles.cardPrice}>{formatPrice(product.price, product.currency)}</span>
                    <button
                      className="btn btn-dark"
                      onClick={() => handleBuy(product)}
                      style={{ fontSize: '0.7rem', padding: '0.7rem 1.4rem' }}
                    >
                      Buy →
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ═══ PROOF / MANIFESTO ══════════════════════════════════ */}
      <section className={styles.manifesto}>
        <div className="container">
          <blockquote className={styles.manifestoQuote}>
            "We don't sell courses stretched to fill time.
            We sell systems built to compound."
          </blockquote>
          <cite className={styles.manifestoCite}>— Pronoia Protocol</cite>
        </div>
      </section>

      {/* ═══ FAQ ════════════════════════════════════════════════ */}
      <section className="section">
        <div className="container" style={{ maxWidth: '720px' }}>
          <h2 className={styles.faqTitle}>FAQ</h2>
          {FAQ.map(({ q, a }, i) => (
            <FAQItem key={i} q={q} a={a} />
          ))}
        </div>
      </section>

      {/* ═══ FINAL CTA ═════════════════════════════════════════ */}
      <section className={styles.finalCta}>
        <div className="container">
          <h2 className={styles.ctaTitle}>Ready to build your system?</h2>
          <p className={styles.ctaSub}>One purchase. Lifetime access. No subscriptions.</p>
          <button
            className="btn btn-primary btn-lg"
            onClick={() => document.querySelector(`.${styles.featuredSection}`)?.scrollIntoView({ behavior: 'smooth' })}
          >
            See Products →
          </button>
        </div>
      </section>
    </>
  );
}

const FAQ = [
  { q: 'What format are the products?', a: 'All products are delivered as PDF files. After successful payment via Stripe, you receive an instant download link.' },
  { q: 'Do I need to create an account?', a: 'Yes — a Pronoia account links your purchase to your profile, enabling future access to your order history and protocol data.' },
  { q: 'Is the payment secure?', a: 'All payments are processed by Stripe — the same payment infrastructure used by Amazon, Google, and millions of businesses worldwide. We never store your card details.' },
  { q: 'Do you offer refunds?', a: 'Due to the digital nature of the products, all sales are final. If you have an issue, contact us and we will make it right.' },
  { q: 'Can I use the protocol if I\'m a beginner?', a: 'Yes. The Pronoia Protocol System is designed for implementation from day one, with clear onboarding steps regardless of your current baseline.' },
];

function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={styles.faqItem}>
      <button className={styles.faqQ} onClick={() => setOpen(o => !o)} aria-expanded={open}>
        <span>{q}</span>
        <span className={styles.faqIcon}>{open ? '−' : '+'}</span>
      </button>
      {open && <p className={styles.faqA}>{a}</p>}
    </div>
  );
}
