'use client';

import { useRouter } from 'next/navigation';
import StorefrontShell from '@/components/layout/storefront-shell';
import { Button, Card } from '@/components/ui';

export default function CustomerDashboardPage() {
  const router = useRouter();

  async function handleLogout() {
    await fetch('/api/customer/auth/logout', { method: 'POST' });
    router.replace('/customer/login');
    router.refresh();
  }

  return (
    <StorefrontShell>
      <main className="dg-main">
        <section className="dg-section">
          <div className="dg-container grid gap-4">
            <Card>
              <h1 className="text-2xl font-bold text-[var(--color-text)]">Customer Dashboard</h1>
              <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                Your customer account is active. You can continue submitting quote requests from the storefront.
              </p>
              <div className="mt-4 flex gap-2">
                <Button type="button" variant="secondary" size="sm" onClick={handleLogout}>
                  Logout
                </Button>
              </div>
            </Card>
          </div>
        </section>
      </main>
    </StorefrontShell>
  );
}
