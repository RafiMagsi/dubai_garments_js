'use client';

import AdminShell from '@/components/admin/admin-shell';
import { Card } from '@/components/ui';
import { usePipeline } from '@/features/admin/deals';

export default function AdminDashboardPage() {
  const { data, isLoading } = usePipeline();

  const totalDeals = data?.stages.reduce((sum, stage) => sum + stage.count, 0) ?? 0;
  const wonCount = data?.stages.find((stage) => stage.stageKey === 'won')?.count ?? 0;
  const lostCount = data?.stages.find((stage) => stage.stageKey === 'lost')?.count ?? 0;
  const openCount = totalDeals - wonCount - lostCount;

  return (
    <AdminShell>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-ink-500)]">Total Deals</p>
          <p className="mt-2 text-3xl font-bold text-[var(--color-text)]">{isLoading ? '...' : totalDeals}</p>
        </Card>
        <Card>
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-ink-500)]">Open</p>
          <p className="mt-2 text-3xl font-bold text-[var(--color-text)]">{isLoading ? '...' : openCount}</p>
        </Card>
        <Card>
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-ink-500)]">Won</p>
          <p className="mt-2 text-3xl font-bold text-[var(--color-success-text)]">{isLoading ? '...' : wonCount}</p>
        </Card>
        <Card>
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-ink-500)]">Lost</p>
          <p className="mt-2 text-3xl font-bold text-[var(--color-danger-text)]">{isLoading ? '...' : lostCount}</p>
        </Card>
      </section>

      <Card>
        <h2 className="text-lg font-semibold text-[var(--color-text)]">Admin Access</h2>
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">
          This area is private and role-protected. Use the sidebar to manage deals and pipeline.
        </p>
      </Card>
    </AdminShell>
  );
}
