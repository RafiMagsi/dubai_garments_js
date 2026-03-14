'use client';

import Link from 'next/link';
import { ReactNode, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AppRole } from '@/lib/auth/session';
import { canAccessAdminPage } from '@/lib/auth/permissions';

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
  { href: '/admin/users', label: 'Users', hint: 'User Access Control', section: 'Platform Control' },
  { href: '/admin/reconfigure', label: 'Reconfigure', hint: 'Install Settings', section: 'Platform Control' },
  { href: '/admin/design-system', label: 'Design System', hint: 'Tokens & UI Kit', section: 'Platform Control' },
  { href: '/admin/rbac-matrix', label: 'RBAC Matrix', hint: 'Role Access Rules', section: 'Platform Control' },
];

export default function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [adminName, setAdminName] = useState('Admin');
  const [adminEmail, setAdminEmail] = useState('');
  const [role, setRole] = useState<AppRole>('admin');

  useEffect(() => {
    let mounted = true;
    async function loadSession() {
      try {
        const response = await fetch('/api/auth/session', { cache: 'no-store' });
        const payload = await response.json();
        if (!mounted) return;
        if (payload?.authenticated && payload?.user?.role) {
          setAdminName(payload.user.displayName || 'Admin');
          setAdminEmail(payload.user.email || '');
          setRole(payload.user.role as AppRole);
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

  function isNavItemActive(href: string) {
    if (href === '/admin') {
      return pathname === href;
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  function formatRoleLabel(value: AppRole) {
    return value
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  const visibleNavItems = adminNavItems.filter((item) => canAccessAdminPage(role, item.href));
  const navSections = Array.from(new Set(visibleNavItems.map((item) => item.section)));

  return (
    <div className="dg-admin-shell">
      <a href="#admin-main-content" className="dg-skip-link">
        Skip to main content
      </a>
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
              {visibleNavItems
                .filter((item) => item.section === section)
                .map((item) => {
                  const isActive = isNavItemActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={isActive ? 'page' : undefined}
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
          <Link href="/" className="ui-btn ui-btn-secondary ui-btn-md">
            Open Storefront
          </Link>
          <button
            type="button"
            className="ui-btn ui-btn-secondary ui-btn-md dg-btn-block"
            onClick={handleLogout}
            disabled={isLoggingOut}
          >
            {isLoggingOut ? 'Signing out...' : 'Logout'}
          </button>
        </div>
      </aside>

      <main id="admin-main-content" className="dg-admin-main" tabIndex={-1}>
        <header className="dg-admin-topbar">
          <div>
            <p className="dg-admin-topbar-label">Sales Console</p>
            <p className="dg-admin-topbar-title">Dubai Garments Revenue Workspace</p>
          </div>
          <div className="dg-admin-user-pill">
            <span className="dg-admin-user-avatar">{(adminName || 'A').slice(0, 1).toUpperCase()}</span>
            <div>
              <p>{adminName}</p>
              <small>{adminEmail || `${formatRoleLabel(role)} session`}</small>
            </div>
          </div>
        </header>

        {children}
      </main>
    </div>
  );
}
