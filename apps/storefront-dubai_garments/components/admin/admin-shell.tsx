'use client';

import Link from 'next/link';
import { ReactNode, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

const adminNavItems = [
  { href: '/admin/dashboard', label: 'Dashboard', hint: 'Analytics' },
  { href: '/admin/leads', label: 'Leads', hint: 'Qualification' },
  { href: '/admin/deals', label: 'Deals', hint: 'Pipeline' },
  { href: '/admin/quotes', label: 'Quotes', hint: 'Pricing' },
  { href: '/admin/pipeline', label: 'Pipeline', hint: 'Stage View' },
  { href: '/admin/activities', label: 'Activities', hint: 'System Log' },
];

export default function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [adminName, setAdminName] = useState('Admin');
  const [adminEmail, setAdminEmail] = useState('');

  useEffect(() => {
    let mounted = true;
    async function loadSession() {
      try {
        const response = await fetch('/api/auth/session', { cache: 'no-store' });
        const payload = await response.json();
        if (!mounted) return;
        if (payload?.authenticated && payload?.user?.role === 'admin') {
          setAdminName(payload.user.displayName || 'Admin');
          setAdminEmail(payload.user.email || '');
        }
      } catch {
        if (!mounted) return;
      }
    }
    void loadSession();
    return () => {
      mounted = false;
    };
  }, []);

  async function handleLogout() {
    setIsLoggingOut(true);
    try {
      await fetch('/api/admin/auth/logout', { method: 'POST' });
    } finally {
      setIsLoggingOut(false);
      router.replace('/admin/login');
      router.refresh();
    }
  }

  return (
    <div className="dg-admin-shell">
      <aside className="dg-admin-sidebar">
        <div className="dg-admin-brand">
          <p className="dg-brand-subtitle">Dubai Garments</p>
          <p className="dg-brand-title">Sales Console</p>
          <p className="dg-admin-brand-copy">Lead, deal, and quote operations in one workspace.</p>
        </div>

        <nav className="dg-admin-nav" aria-label="Admin Navigation">
          {adminNavItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`dg-admin-link ${isActive ? 'is-active' : ''}`}
              >
                <span>{item.label}</span>
                <small>{item.hint}</small>
              </Link>
            );
          })}
        </nav>

        <div className="dg-admin-footer">
          <Link href="/" className="dg-btn-secondary">
            Open Storefront
          </Link>
          <button
            type="button"
            className="dg-btn-secondary dg-btn-block"
            onClick={handleLogout}
            disabled={isLoggingOut}
          >
            {isLoggingOut ? 'Signing out...' : 'Logout'}
          </button>
        </div>
      </aside>

      <main className="dg-admin-main">
        <header className="dg-admin-topbar">
          <div>
            <p className="dg-admin-topbar-label">Admin Workspace</p>
            <p className="dg-admin-topbar-title">Dubai Garments CRM</p>
          </div>
          <div className="dg-admin-user-pill">
            <span className="dg-admin-user-avatar">{(adminName || 'A').slice(0, 1).toUpperCase()}</span>
            <div>
              <p>{adminName}</p>
              <small>{adminEmail || 'admin session'}</small>
            </div>
          </div>
        </header>

        {children}
      </main>
    </div>
  );
}
