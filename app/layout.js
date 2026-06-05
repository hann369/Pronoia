import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import Nav from '@/components/Nav';

export const metadata = {
  title: { default: 'Pronoia', template: '%s | Pronoia' },
  description: 'Bio-Cognitive Operating System',
};

export default function RootLayout({ children }) {
  return (
    <html lang="de" data-theme="dark" data-ui-mode="cyber">
      <body>
        <div className="orb-bg">
          <div className="orb orb-1" />
          <div className="orb orb-2" />
          <div className="orb orb-3" />
        </div>

        <AuthProvider>
          <Nav />
          <main>{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
