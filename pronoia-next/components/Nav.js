'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import styles from './Nav.module.css';

const NAV_LINKS = [
  { href: '/',          label: 'Core' },
  { href: '/protocol',  label: 'Protocol' },
  { href: '/vault',     label: 'Vault' },
  { href: '/labs',      label: 'Labs' },
  { href: '/health',    label: 'Health' },
  { href: '/store',     label: 'Store' },
];

export default function Nav() {
  const pathname          = usePathname();
  const { user, logout }  = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [theme, setTheme]       = useState('light');
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('px_theme') || 'light';
    setTheme(saved);
    document.documentElement.setAttribute('data-theme', saved);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    localStorage.setItem('px_theme', next);
    document.documentElement.setAttribute('data-theme', next);
  };

  return (
    <header className={`${styles.nav} ${scrolled ? styles.scrolled : ''}`}>
      <div className={styles.inner}>
        {/* Left */}
        <div className={styles.left}>
          <Link href="/" className={styles.logo}>
            <span className={styles.logoText}>PRONOIA</span>
          </Link>
          <div className={styles.divider} />
          <span className={styles.badge}>
            <span className="pulse-dot" />
            SYSTEM ACTIVE
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
          <button
            className={styles.themeBtn}
            onClick={toggleTheme}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? '◐ Light' : '◑ Dark'}
          </button>

          {user ? (
            <div className={styles.userArea}>
              <span className={styles.userEmail}>{user.email?.split('@')[0]}</span>
              <button className="btn btn-ghost" onClick={logout} style={{ padding: '0.5rem 1.1rem', fontSize: '0.65rem' }}>
                Logout
              </button>
            </div>
          ) : (
            <Link href="/auth" className="btn btn-primary" style={{ padding: '0.5rem 1.4rem', fontSize: '0.68rem' }}>
              Sign In
            </Link>
          )}

          {/* Mobile burger */}
          <button
            className={styles.burger}
            onClick={() => setMenuOpen(o => !o)}
            aria-label="Toggle menu"
          >
            <span className={menuOpen ? styles.burgerOpen : ''} />
            <span className={menuOpen ? styles.burgerOpen : ''} />
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className={styles.mobileMenu}>
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
        </div>
      )}
    </header>
  );
}
