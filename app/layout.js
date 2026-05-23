import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import Nav from '@/components/Nav';

export const metadata = {
  title: { default: 'Pronoia', template: '%s | Pronoia' },
  description: 'Agentic Optimization System — Protocol, Knowledge, Biological Integrity.',
  metadataBase: new URL('https://pronoia-kappa.vercel.app'),
};

export default function RootLayout({ children }) {
  return (
    <html lang="de">
      <body>
        <AuthProvider>
          {/* Fixed ambient background */}
          <div className="orb-bg" aria-hidden="true">
            <div className="orb orb-1" />
            <div className="orb orb-2" />
            <div className="orb orb-3" />
          </div>

          <Nav />
          <main>{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
