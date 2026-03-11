'use client';

import Link from 'next/link';
import { ReactNode, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

const adminNavItems = [
  { href: '/admin/dashboard', label: 'Dashboard', hint: 'Revenue Snapshot', section: 'Workspace' },
  { href: '/admin/analytics', label: 'Analytics', hint: 'Business Metrics', section: 'Workspace' },
  { href: '/admin/leads', label: 'Leads', hint: 'Qualification Queue', section: 'Sales Operations' },
  { href: '/admin/deals', label: 'Deals', hint: 'Pipeline Board', section: 'Sales Operations' },
  { href: '/admin/quotes', label: 'Quotes', hint: 'Pricing & Approvals', section: 'Sales Operations' },
  { href: '/admin/pipeline', label: 'Pipeline', hint: 'Stage View', section: 'Sales Operations' },
  { href: '/admin/activities', label: 'Activities', hint: 'System Timeline', section: 'Sales Operations' },
  { href: '/admin/automations', label: 'Automations', hint: 'Workflow Monitoring', section: 'Platform Control' },
  { href: '/admin/observability', label: 'Observability', hint: 'Health & Metrics', section: 'Platform Control' },
  { href: '/admin/configuration', label: 'Configuration', hint: 'Scripts & Runtime', section: 'Platform Control' },
  { href: '/admin/design-system', label: 'Design System', hint: 'Tokens & UI Kit', section: 'Platform Control' },
];

const navSections = Array.from(new Set(adminNavItems.map((item) => item.section)));

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
          <p className="dg-brand-title">Revenue OS</p>
          <p className="dg-admin-brand-copy">Plug-and-play AI sales operations for leads, deals, quotes, and automations.</p>
        </div>

        <nav className="dg-admin-nav" aria-label="Admin Navigation">
          {navSections.map((section) => (
            <div key={section} className="dg-admin-nav-group">
              <p className="dg-admin-nav-heading">{section}</p>
              {adminNavItems
                .filter((item) => item.section === section)
                .map((item) => {
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
            </div>
          ))}
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
            <p className="dg-admin-topbar-label">Sales Console</p>
            <p className="dg-admin-topbar-title">Dubai Garments Revenue Workspace</p>
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
