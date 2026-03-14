'use client';
/* eslint-disable @next/next/no-img-element */

import Link from 'next/link';
import { FormEvent, ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Modal } from '@/components/ui';
import { AppRole } from '@/lib/auth/session';
import { canAccessAdminPage } from '@/lib/auth/permissions';

const adminNavItems = [
  { href: '/admin/dashboard', label: 'Dashboard', hint: 'Revenue Snapshot', section: 'Workspace' },
  { href: '/admin/analytics', label: 'Analytics', hint: 'Business Metrics', section: 'Workspace' },
  { href: '/admin/leads', label: 'Leads', hint: 'Qualification Queue', section: 'Sales Operations' },
  { href: '/admin/deals', label: 'Deals', hint: 'Pipeline Board', section: 'Sales Operations' },
  { href: '/admin/quotes', label: 'Quotes', hint: 'Pricing & Approvals', section: 'Sales Operations' },
  { href: '/admin/products', label: 'Products', hint: 'Catalog Management', section: 'Sales Operations' },
  { href: '/admin/pipeline', label: 'Pipeline', hint: 'Stage View', section: 'Sales Operations' },
  { href: '/admin/activities', label: 'Activities', hint: 'System Timeline', section: 'Sales Operations' },
  { href: '/admin/automations', label: 'Automations', hint: 'Workflow Monitoring', section: 'Platform Control' },
  { href: '/admin/ai-logs', label: 'AI Logs', hint: 'Model Trace Logs', section: 'Platform Control' },
  { href: '/admin/observability', label: 'Observability', hint: 'Health & Metrics', section: 'Platform Control' },
  { href: '/admin/configuration', label: 'Configuration', hint: 'Scripts & Runtime', section: 'Platform Control' },
  { href: '/admin/users', label: 'Users', hint: 'User Access Control', section: 'Platform Control' },
  { href: '/admin/reconfigure', label: 'Reconfigure', hint: 'Install Settings', section: 'Platform Control' },
  { href: '/admin/search', label: 'Search', hint: 'Global Finder', section: 'Platform Control' },
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
  const [branding, setBranding] = useState({
    brandName: 'Dubai Garments',
    brandTagline: 'Revenue OS',
    logoUrl: '',
  });
  const [quickInput, setQuickInput] = useState('');
  const [commandOpen, setCommandOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState('');

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

  useEffect(() => {
    let mounted = true;
    async function loadBranding() {
      try {
        const response = await fetch('/api/branding', { cache: 'no-store' });
        const payload = (await response.json()) as {
          brandName?: string;
          brandTagline?: string;
          logoUrl?: string;
        };
        if (!mounted) return;
        setBranding({
          brandName: payload.brandName || 'Dubai Garments',
          brandTagline: payload.brandTagline || 'Revenue OS',
          logoUrl: payload.logoUrl || '',
        });
      } catch {
        if (!mounted) return;
      }
    }
    void loadBranding();
    return () => {
      mounted = false;
    };
  }, []);

  const handleLogout = useCallback(async () => {
    setIsLoggingOut(true);
    try {
      await fetch('/api/admin/auth/logout', { method: 'POST' });
    } finally {
      setIsLoggingOut(false);
      router.replace('/admin/login');
      router.refresh();
    }
  }, [router]);

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

  const commandItems = useMemo(() => {
    return [
      ...visibleNavItems.map((item) => ({
        id: `nav:${item.href}`,
        label: `Go to ${item.label}`,
        description: item.hint,
        keywords: `${item.label} ${item.hint} ${item.section} ${item.href}`.toLowerCase(),
        run: () => {
          router.push(item.href);
          setCommandOpen(false);
          setCommandQuery('');
          setQuickInput('');
        },
      })),
      {
        id: 'cmd:search',
        label: 'Open Global Search',
        description: 'Search leads, deals, quotes, and users from one place',
        keywords: 'global search find leads deals quotes users',
        run: () => {
          router.push('/admin/search');
          setCommandOpen(false);
          setCommandQuery('');
          setQuickInput('');
        },
      },
      {
        id: 'cmd:storefront',
        label: 'Open Storefront',
        description: 'Go to public storefront',
        keywords: 'storefront home public site',
        run: () => {
          router.push('/');
          setCommandOpen(false);
          setCommandQuery('');
          setQuickInput('');
        },
      },
      {
        id: 'cmd:logout',
        label: 'Logout',
        description: 'Sign out of admin session',
        keywords: 'logout sign out',
        run: () => {
          void handleLogout();
          setCommandOpen(false);
          setCommandQuery('');
          setQuickInput('');
        },
      },
    ];
  }, [handleLogout, router, visibleNavItems]);

  const filteredCommandItems = useMemo(() => {
    const query = commandQuery.trim().toLowerCase();
    if (!query) return commandItems;
    return commandItems.filter((item) => {
      return (
        item.label.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query) ||
        item.keywords.includes(query)
      );
    });
  }, [commandItems, commandQuery]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const isK = event.key.toLowerCase() === 'k';
      if (!isK) return;
      if (!(event.metaKey || event.ctrlKey)) return;
      event.preventDefault();
      setCommandQuery('');
      setCommandOpen(true);
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  function openCommandPalette(initialQuery = '') {
    setCommandQuery(initialQuery);
    setCommandOpen(true);
  }

  function closeCommandPalette() {
    setCommandOpen(false);
    setCommandQuery('');
  }

  function runGlobalSearch(query: string) {
    const value = query.trim();
    router.push(value ? `/admin/search?q=${encodeURIComponent(value)}` : '/admin/search');
    setQuickInput('');
    setCommandQuery('');
    setCommandOpen(false);
  }

  function submitQuickInput(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = quickInput.trim();
    if (!value) {
      openCommandPalette('');
      return;
    }

    if (value.startsWith('/admin')) {
      router.push(value);
      setQuickInput('');
      return;
    }

    if (value.toLowerCase() === 'logout') {
      void handleLogout();
      return;
    }

    if (value.toLowerCase().startsWith('go ')) {
      openCommandPalette(value.slice(3).trim());
      return;
    }

    runGlobalSearch(value);
  }

  return (
    <div className="dg-admin-shell">
      <a href="#admin-main-content" className="dg-skip-link">
        Skip to main content
      </a>
      <aside className="dg-admin-sidebar">
        <div className="dg-admin-brand">
          {branding.logoUrl ? (
            <img
              src={branding.logoUrl}
              alt={`${branding.brandName} logo`}
              className="mb-2 h-10 w-auto rounded border border-[var(--color-border)] bg-white p-1"
            />
          ) : null}
          <p className="dg-brand-subtitle">{branding.brandName}</p>
          <p className="dg-brand-title">{branding.brandTagline}</p>
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
            <p className="dg-admin-topbar-title">{branding.brandName} Revenue Workspace</p>
          </div>
          <form onSubmit={submitQuickInput} className="dg-col-fill max-w-xl">
            <div className="dg-form-row">
              <input
                type="text"
                className="dg-input dg-col-fill"
                placeholder="Search records, type '/admin/route', or press Cmd/Ctrl+K"
                value={quickInput}
                onChange={(event) => setQuickInput(event.target.value)}
              />
              <button
                type="button"
                className="ui-btn ui-btn-secondary ui-btn-md"
                onClick={() => openCommandPalette(quickInput.trim())}
                aria-label="Open quick command palette"
              >
                Cmd/Ctrl+K
              </button>
              <button type="submit" className="ui-btn ui-btn-primary ui-btn-md">
                Go
              </button>
            </div>
          </form>
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

      <Modal open={commandOpen} onClose={closeCommandPalette}>
        <div className="dg-card p-5 sm:p-6">
          <div className="dg-admin-head">
            <h2 className="dg-title-sm">Quick Command</h2>
            <span className="dg-badge">Cmd/Ctrl+K</span>
          </div>
          <p className="dg-help mt-2 mb-3">
            Jump to pages or run global search from one command input.
          </p>
          <div className="dg-form-row mb-3">
            <input
              type="text"
              className="dg-input dg-col-fill"
              placeholder="Type command or search keyword..."
              value={commandQuery}
              onChange={(event) => setCommandQuery(event.target.value)}
              autoFocus
            />
            <button
              type="button"
              className="ui-btn ui-btn-primary ui-btn-md"
              onClick={() => runGlobalSearch(commandQuery)}
            >
              Search All
            </button>
          </div>
          <div className="dg-list dg-list-density-compact max-h-80 overflow-y-auto">
            {filteredCommandItems.length > 0 ? (
              filteredCommandItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="dg-list-row w-full text-left"
                  onClick={item.run}
                >
                  <span className="dg-list-main">
                    <span className="dg-list-title">{item.label}</span>
                    <span className="dg-list-meta">{item.description}</span>
                  </span>
                </button>
              ))
            ) : (
              <p className="dg-help">No matching commands. Press “Search All” to run a global record search.</p>
            )}
          </div>
          <div className="dg-form-row mt-4 pt-2 border-t border-[var(--color-border)]">
            <button type="button" className="ui-btn ui-btn-secondary ui-btn-md" onClick={closeCommandPalette}>
              Close
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
