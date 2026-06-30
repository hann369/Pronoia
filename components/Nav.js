'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useProtocol } from '@/hooks/useProtocol';
import CinematicThemeSwitcher from '@/components/ui/cinematic-theme-switcher';
import styles from './Nav.module.css';

const NAV_LINKS = [
  { href: '/',                label: 'Start' },
  { href: '/life-os',         label: 'Life OS' },
  { href: '/labs',            label: 'Pronoia Labs' },
  { href: '/bio-synthetics',  label: 'Bio-Synthetics' },
  { href: '/safety',          label: 'Pronoia Safety' },
  { href: '/store',           label: 'Store' },
];

export default function Nav() {
  const pathname          = usePathname();
  const { user, logout }  = useAuth();
  const { profile }       = useProtocol();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Inside the Life OS app the sidebar is the one navigation — hide the global nav.
  if (pathname?.startsWith('/life-os')) return null;

  return (
    <header className={`${styles.nav} ${scrolled ? styles.scrolled : ''}`}>
      <div className={styles.inner}>
        {/* Left */}
        <div className={styles.left}>
          <Link href="/" className={styles.logo} aria-label="Pronoia">
            <img src="/pronoia-wordmark.png" alt="Pronoia" className={styles.logoImg} />
          </Link>
          <div className={styles.divider} />
          <span className={styles.badge}>
            <span className="pulse-dot" />
            SYSTEM AKTIV
          </span>
        </div>

        {/* Links — desktop */}
        <nav className={styles.links} aria-label="Main navigation">
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`${styles.link} ${pathname === href ? styles.active : ''} ${label === 'Store' ? styles.storeLink : ''}`}
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* Right */}
        <div className={styles.right}>
          <CinematicThemeSwitcher />


          {user ? (
            <div className={`${styles.userArea} ${styles.authDesktop}`}>
              <span className={styles.userEmail}>{user.email?.split('@')[0]}</span>
              <button className="btn btn-ghost" onClick={logout} style={{ padding: '0.5rem 1.1rem', fontSize: '0.65rem' }}>
                Abmelden
              </button>
            </div>
          ) : (
            <Link href="/auth" className={`btn btn-primary ${styles.authDesktop}`} style={{ padding: '0.5rem 1.4rem', fontSize: '0.68rem' }}>
              Anmelden
            </Link>
          )}

          {/* Mobile burger */}
          <button
            className={styles.burger}
            onClick={() => setMenuOpen(o => !o)}
            aria-label={menuOpen ? 'Menü schließen' : 'Menü öffnen'}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
          >
            <span className={menuOpen ? styles.burgerOpen : ''} />
            <span className={menuOpen ? styles.burgerOpen : ''} />
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className={styles.mobileMenu} id="mobile-menu">
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`${styles.mobileLink} ${pathname === href ? styles.active : ''}`}
              onClick={() => setMenuOpen(false)}
            >
              {label}
            </Link>
          ))}
          <div className={styles.mobileAuth}>
            {user ? (
              <button
                className="btn btn-ghost"
                onClick={() => { setMenuOpen(false); logout(); }}
              >
                Abmelden ({user.email?.split('@')[0]})
              </button>
            ) : (
              <Link href="/auth" className="btn btn-primary" onClick={() => setMenuOpen(false)}>
                Anmelden
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
