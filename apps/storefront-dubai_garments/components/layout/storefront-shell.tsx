import { ReactNode } from 'react';
import Header from './header';
import Footer from './footer';

export default function StorefrontShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <Header />
      <main>{children}</main>
      <Footer />
    </div>
  );
}
