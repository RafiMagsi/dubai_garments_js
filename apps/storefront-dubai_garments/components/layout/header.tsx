'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const navItems = [
  { href: '/', label: 'Home' },
  { href: '/products', label: 'Products' },
  { href: '/quote', label: 'Request Quote' },
];

type SessionUser = {
  id: string;
  email: string;
  displayName: string;
  role: 'admin' | 'customer';
};

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function loadSession() {
      try {
        const response = await fetch('/api/auth/session', { cache: 'no-store' });
        const payload = await response.json();
        if (!mounted) return;
        setUser(payload?.authenticated ? payload.user : null);
      } catch {
        if (!mounted) return;
        setUser(null);
      } finally {
        if (mounted) setIsLoadingUser(false);
      }
    }
    void loadSession();
    return () => {
      mounted = false;
    };
  }, [pathname]);

  async function handleLogout() {
    if (!user) return;
    setIsLoggingOut(true);
    try {
      const logoutEndpoint =
        user.role === 'admin' ? '/api/admin/auth/logout' : '/api/customer/auth/logout';
      await fetch(logoutEndpoint, { method: 'POST' });
      setUser(null);
      router.replace(user.role === 'admin' ? '/admin/login' : '/customer/login');
      router.refresh();
    } finally {
      setIsLoggingOut(false);
    }
  }

  return (
    <header className="sticky top-0 z-20 border-b border-[var(--color-border)] bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="grid">
          <span className="text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-[var(--color-ink-500)]">
            Bulk Ordering Platform
          </span>
          <span className="text-xl font-bold tracking-tight text-[var(--color-ink-900)]">Dubai Garments</span>
        </Link>

        <nav className="flex flex-wrap items-center gap-1 rounded-full border border-[var(--color-border)] bg-white p-1 shadow-[var(--shadow-soft)]">
          {navItems.map((item) => {
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`ui-btn ui-btn-sm ${isActive ? 'ui-btn-primary' : 'ui-btn-ghost'}`}
              >
                {item.label}
              </Link>
            );
          })}

          {isLoadingUser ? (
            <span className="ui-btn ui-btn-sm ui-btn-ghost opacity-70">...</span>
          ) : user ? (
            <details className="relative">
              <summary className="ui-btn ui-btn-sm ui-btn-secondary cursor-pointer list-none">
                {user.displayName}
              </summary>
              <div className="absolute right-0 z-20 mt-2 min-w-48 rounded-xl border border-[var(--color-border)] bg-white p-2 shadow-[var(--shadow-card)]">
                <p className="px-2 py-1 text-xs font-semibold uppercase tracking-[0.06em] text-[var(--color-ink-500)]">
                  {user.role}
                </p>
                <p className="px-2 pb-2 text-xs text-[var(--color-text-muted)]">{user.email}</p>
                {user.role === 'admin' ? (
                  <Link href="/admin/dashboard" className="ui-btn ui-btn-sm ui-btn-ghost w-full justify-start">
                    Admin Dashboard
                  </Link>
                ) : (
                  <Link href="/customer/dashboard" className="ui-btn ui-btn-sm ui-btn-ghost w-full justify-start">
                    Customer Dashboard
                  </Link>
                )}
                <button
                  type="button"
                  className="ui-btn ui-btn-sm ui-btn-secondary mt-1 w-full justify-start"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                >
                  {isLoggingOut ? 'Logging out...' : 'Logout'}
                </button>
              </div>
            </details>
          ) : (
            <Link
              href="/customer/login"
              className={`ui-btn ui-btn-sm ${pathname === '/customer/login' ? 'ui-btn-primary' : 'ui-btn-ghost'}`}
            >
              Customer Login
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
