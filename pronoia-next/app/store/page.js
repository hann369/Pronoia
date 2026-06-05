'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function StorePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/life-os?tab=store');
  }, [router]);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999, background: '#080a0f',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: '#6a7890', letterSpacing: '0.15em', gap: '1.5rem'
    }}>
      <div style={{ width: '36px', height: '36px', border: '2px solid rgba(26,106,255,0.15)', borderTopColor: '#1A6AFF', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      LIFE_OS // REDIRECTING TO ECOSYSTEM STORE...
    </div>
  );
}
