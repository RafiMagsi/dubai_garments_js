'use client';

import Link from 'next/link';
import { StatusBadge } from '@/components/ui';
import { formatDateTime, shortCode, titleCase } from '@/features/admin/shared/view-format';

type LinkedRecordsSnapshotCardProps = {
  lead: {
    id: string;
    status: string;
    contact_name?: string | null;
    company_name?: string | null;
    created_at?: string | null;
  };
  deal?: {
    id: string;
    stage?: string | null;
    title?: string | null;
    created_at?: string | null;
  } | null;
  quote?: {
    id: string;
    quote_number?: string | null;
    status?: string | null;
    currency?: string | null;
    total_amount?: number | null;
    created_at?: string | null;
  } | null;
};

type RecordTileProps = {
  title: string;
  subtitle: string;
  status: string;
  createdAt?: string | null;
  href?: string | null;
  emptyText?: string;
};

function RecordTile({ title, subtitle, status, createdAt, href, emptyText = 'Not linked yet.' }: RecordTileProps) {
  const hasRecord = Boolean(href);
  return (
    <div className="dg-card" style={{ padding: '0.9rem', display: 'grid', gap: 8 }}>
      <div className="dg-form-row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <p className="dg-eyebrow" style={{ margin: 0 }}>
          {title}
        </p>
        <StatusBadge status={status}>{titleCase(status)}</StatusBadge>
      </div>
      {hasRecord ? (
        <>
          <p className="dg-list-title" style={{ margin: 0 }}>
            {subtitle}
          </p>
          <p className="dg-list-meta" style={{ margin: 0 }}>
            {createdAt ? `Created: ${formatDateTime(createdAt)}` : 'Created: -'}
          </p>
          <div className="dg-form-row" style={{ marginTop: 4 }}>
            <Link href={href as string} className="ui-btn ui-btn-secondary ui-btn-sm">
              Open
            </Link>
          </div>
        </>
      ) : (
        <p className="dg-muted-sm" style={{ margin: 0 }}>
          {emptyText}
        </p>
      )}
    </div>
  );
}

export default function LinkedRecordsSnapshotCard({ lead, deal, quote }: LinkedRecordsSnapshotCardProps) {
  const quoteSubtitle =
    quote?.quote_number ||
    (quote?.id ? `Quote #${shortCode(quote.id)}` : 'No quote attached');
  const quoteStatus = quote?.status || 'pending';
  const quoteAmount =
    quote?.total_amount != null && Number.isFinite(quote.total_amount)
      ? `${quote.currency || 'AED'} ${quote.total_amount.toFixed(2)}`
      : null;

  return (
    <section data-testid="lead-linked-records-snapshot">
      <div className="dg-card" style={{ display: 'grid', gap: 12 }}>
        <div>
          <p className="dg-eyebrow">Linked Records Snapshot</p>
          <p className="dg-muted-sm">Quick visibility and navigation for this lead, its deal, and quote chain.</p>
        </div>
        <div
          style={{
            display: 'grid',
            gap: 12,
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          }}
        >
          <RecordTile
            title="Lead"
            subtitle={`${lead.contact_name || 'Unknown Contact'} • ${shortCode(lead.id)}`}
            status={lead.status}
            createdAt={lead.created_at}
            href={`/admin/leads/${lead.id}`}
          />
          <RecordTile
            title="Deal"
            subtitle={deal?.title || (deal?.id ? `Deal #${shortCode(deal.id)}` : 'No deal linked')}
            status={deal?.stage || 'pending'}
            createdAt={deal?.created_at}
            href={deal?.id ? `/admin/deals/${deal.id}` : null}
            emptyText="No linked deal yet. Create/convert deal from Execution Board."
          />
          <RecordTile
            title="Quote"
            subtitle={quoteAmount ? `${quoteSubtitle} • ${quoteAmount}` : quoteSubtitle}
            status={quoteStatus}
            createdAt={quote?.created_at}
            href={quote?.id ? `/admin/quotes/${quote.id}` : null}
            emptyText="No linked quote yet. Generate quote from Execution Board."
          />
        </div>
      </div>
    </section>
  );
}

