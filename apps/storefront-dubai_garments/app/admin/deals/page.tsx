'use client';

import AdminShell from '@/components/admin/admin-shell';
import { Card } from '@/components/ui';
import { useDeals } from '@/features/admin/deals';

export default function AdminDealsPage() {
  const { data, isLoading, isError, error } = useDeals();

  return (
    <AdminShell>
      <Card>
        <h1 className="text-xl font-semibold text-[var(--color-text)]">Deals</h1>
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">
          Complete deal list across all stages.
        </p>
      </Card>

      {isLoading && (
        <Card>
          <p className="text-sm text-[var(--color-text-muted)]">Loading deals...</p>
        </Card>
      )}

      {isError && (
        <Card>
          <p className="text-sm text-[var(--color-danger-text)]">
            {error instanceof Error ? error.message : 'Failed to load deals.'}
          </p>
        </Card>
      )}

      {!isLoading && !isError && (
        <div className="grid gap-3">
          {data?.items.map((deal) => (
            <Card key={deal.id}>
              <p className="font-semibold text-[var(--color-text)]">{deal.title}</p>
              <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                Stage: {deal.stage} | AED {deal.expected_value} | {deal.probability_pct}%
              </p>
            </Card>
          ))}
          {data?.items.length === 0 && (
            <Card>
              <p className="text-sm text-[var(--color-text-muted)]">No deals available.</p>
            </Card>
          )}
        </div>
      )}
    </AdminShell>
  );
}
