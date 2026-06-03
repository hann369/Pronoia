'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ProtocolRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/life-os');
  }, [router]);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#030408',
      color: '#00c48c',
      fontFamily: 'monospace',
      fontSize: '0.9rem',
      letterSpacing: '0.15em'
    }}>
      REDIRECTING_TO_LIFE_OS...
    </div>
  );
}
