'use client';

import Link from 'next/link';
import { ReactNode, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

const adminNavItems = [
  { href: '/admin/dashboard', label: 'Dashboard' },
  { href: '/admin/pipeline', label: 'Pipeline' },
  { href: '/admin/deals', label: 'Deals' },
  { href: '/admin/leads', label: 'Leads' },
  { href: '/admin/activities', label: 'Activities' },
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
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <div className="mx-auto grid max-w-[1440px] gap-4 px-4 py-4 md:grid-cols-[260px_1fr] sm:px-6 lg:px-8">
        <aside className="ui-card h-fit md:sticky md:top-4">
          <div className="mb-4 border-b border-[var(--color-border)] pb-3">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-ink-500)]">
              Dubai Garments CRM
            </p>
            <p className="mt-1 text-lg font-bold text-[var(--color-text)]">Admin Panel</p>
          </div>

          <nav className="grid gap-2">
            {adminNavItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`ui-btn ui-btn-sm justify-start ${
                    isActive ? 'ui-btn-primary' : 'ui-btn-secondary'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-6 grid gap-2 border-t border-[var(--color-border)] pt-4">
            <details className="relative">
              <summary className="ui-btn ui-btn-secondary ui-btn-sm w-full cursor-pointer justify-start list-none">
                {adminName}
              </summary>
              <div className="mt-2 rounded-xl border border-[var(--color-border)] bg-white p-2">
                <p className="px-2 py-1 text-xs text-[var(--color-text-muted)]">{adminEmail}</p>
                <Link href="/" className="ui-btn ui-btn-sm ui-btn-ghost w-full justify-start">
                  Go To Storefront
                </Link>
                <button
                  type="button"
                  className="ui-btn ui-btn-sm ui-btn-secondary mt-1 w-full justify-start"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                >
                  {isLoggingOut ? 'Signing out...' : 'Sign Out'}
                </button>
              </div>
            </details>
          </div>
        </aside>

        <main className="grid gap-6">{children}</main>
      </div>
    </div>
  );
}
