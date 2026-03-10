import { ReactNode } from 'react';
import Header from './header';
import Footer from './footer';

export default function StorefrontShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen text-[var(--color-ink-900)]">
      <Header />
      {children}
      <Footer />
    </div>
  );
}
