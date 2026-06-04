'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import styles from './page.module.css';

export default function AuthPage() {
  const router = useRouter();
  const { login, signup, loginWithGoogle, resetPassword } = useAuth();
  const [mode, setMode]         = useState('login'); // 'login' | 'signup' | 'forgot'
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [info, setInfo]         = useState('');
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);
    try {
      if (mode === 'forgot') {
        await resetPassword(email);
        setInfo('Ein Link zum Zurücksetzen deines Passworts wurde an deine E-Mail-Adresse gesendet.');
      } else {
        if (mode === 'login') await login(email, password);
        else                  await signup(email, password);
        
        const searchParams = new URLSearchParams(window.location.search);
        const tgId = searchParams.get('tg_id');
        if (tgId) {
          router.push(`/life-os?tg_id=${tgId}`);
        } else {
          router.push('/store');
        }
      }
    } catch (err) {
      setError(err.message.replace('Firebase: ', ''));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError('');
    setInfo('');
    setLoading(true);
    try {
      await loginWithGoogle();
      
      const searchParams = new URLSearchParams(window.location.search);
      const tgId = searchParams.get('tg_id');
      if (tgId) {
        router.push(`/life-os?tg_id=${tgId}`);
      } else {
        router.push('/store');
      }
    } catch (err) {
      setError(err.message.replace('Firebase: ', ''));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        {/* Header */}
        <div className={styles.header}>
          <span className="label-mono" style={{ color: 'var(--tan)' }}>Pronoia System</span>
          <h1 className={styles.title}>
            {mode === 'login' ? 'Welcome back.' : mode === 'signup' ? 'Create account.' : 'Reset Password.'}
          </h1>
          <p className={styles.sub}>
            {mode === 'login'
              ? 'Access your protocols, purchases, and agent.'
              : mode === 'signup'
              ? 'Join the Pronoia ecosystem.'
              : 'Enter your email to receive a password reset link.'}
          </p>
        </div>

        {/* Google (Hide in forgot password mode) */}
        {mode !== 'forgot' && (
          <button className={styles.googleBtn} onClick={handleGoogle} disabled={loading}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
              <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>
        )}

        {mode !== 'forgot' && (
          <div className={styles.dividerRow}>
            <div className={styles.dividerLine} />
            <span className={styles.dividerText}>or</span>
            <div className={styles.dividerLine} />
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label className="label-mono" htmlFor="auth-email">Email</label>
            <input
              id="auth-email"
              type="email"
              className={styles.input}
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          {mode !== 'forgot' && (
            <div className={styles.field}>
              <div style={{ display: 'flex', justifyContent: 'between', alignItems: 'center' }}>
                <label className="label-mono" htmlFor="auth-pw" style={{ flex: 1 }}>Password</label>
                {mode === 'login' && (
                  <button
                    type="button"
                    className={styles.toggleBtn}
                    onClick={() => { setMode('forgot'); setError(''); setInfo(''); }}
                    style={{ fontSize: '0.75rem', textDecoration: 'none', color: 'var(--text3)' }}
                  >
                    Passwort vergessen?
                  </button>
                )}
              </div>
              <input
                id="auth-pw"
                type="password"
                className={styles.input}
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required={mode !== 'forgot'}
                minLength={6}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
            </div>
          )}

          {error && <p className={styles.error}>{error}</p>}
          {info && <p className={styles.info} style={{ color: 'var(--green)', fontSize: '0.85rem', fontFamily: 'var(--font-mono)', margin: '0.5rem 0' }}>{info}</p>}

          <button type="submit" className="btn btn-primary btn-lg" disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
            {loading ? '...' : mode === 'login' ? 'Sign In →' : mode === 'signup' ? 'Create Account →' : 'Send Reset Link →'}
          </button>
        </form>

        {/* Toggle */}
        <div className={styles.toggle}>
          {mode === 'login' && (
            <span>
              Don't have an account?{' '}
              <button
                type="button"
                className={styles.toggleBtn}
                onClick={() => { setMode('signup'); setError(''); setInfo(''); }}
              >
                Sign up
              </button>
            </span>
          )}
          {mode === 'signup' && (
            <span>
              Already a member?{' '}
              <button
                type="button"
                className={styles.toggleBtn}
                onClick={() => { setMode('login'); setError(''); setInfo(''); }}
              >
                Sign in
              </button>
            </span>
          )}
          {mode === 'forgot' && (
            <button
              type="button"
              className={styles.toggleBtn}
              onClick={() => { setMode('login'); setError(''); setInfo(''); }}
            >
              ← Back to Login
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
