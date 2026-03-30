'use client';

import Link from 'next/link';
import AdminPageHeader from '@/components/admin/common/page-header';
import AdminShell from '@/components/admin/admin-shell';
import AiSalesLiveStatusOverview from '@/components/admin/ai-sales-agent/live-status-overview';
import { PageShell, Panel, Toolbar } from '@/components/ui';
import { useDeals } from '@/features/admin/deals';
import { useLeads } from '@/features/admin/leads';
import { useQuotes } from '@/features/admin/quotes';
import { useMemo } from 'react';

export default function AdminDashboardPage() {
  const leadsQuery = useLeads();
  const dealsQuery = useDeals();
  const quotesQuery = useQuotes();

  const leads = useMemo(() => leadsQuery.data?.items ?? [], [leadsQuery.data?.items]);
  const deals = useMemo(() => dealsQuery.data?.items ?? [], [dealsQuery.data?.items]);
  const quotes = useMemo(() => quotesQuery.data?.items ?? [], [quotesQuery.data?.items]);

  const quoteDraftCount = quotes.filter((quote) => quote.status === 'draft').length;
  const quoteSentCount = quotes.filter((quote) => quote.status === 'sent').length;
  const quoteApprovedCount = quotes.filter((quote) => quote.status === 'approved').length;
  const quoteAwaitingOutcomeCount = Math.max(0, quoteSentCount - quoteApprovedCount);

  const hotUnqualifiedCount = leads.filter((lead) => lead.ai_classification === 'HOT' && lead.status === 'new').length;

  const oneDayMs = 86_400_000;
  const referenceTime = useMemo(() => {
    const timestamps = [
      ...leads.map((lead) => new Date(lead.created_at).getTime()),
      ...deals.map((deal) => new Date(deal.created_at || '').getTime()),
      ...quotes.map((quote) => new Date(quote.updated_at).getTime()),
    ].filter((value) => Number.isFinite(value));
    return timestamps.length > 0 ? Math.max(...timestamps) : 0;
  }, [leads, deals, quotes]);

  const staleNewLeads = leads.filter((lead) => {
    if (lead.status !== 'new') return false;
    const created = new Date(lead.created_at).getTime();
    if (Number.isNaN(created)) return false;
    return (referenceTime - created) / oneDayMs >= 7;
  }).length;

  const agedNegotiations = deals.filter((deal) => {
    if (deal.stage !== 'negotiation') return false;
    const created = new Date(deal.created_at || '').getTime();
    if (Number.isNaN(created)) return false;
    return (referenceTime - created) / oneDayMs >= 10;
  }).length;

  const agingDraftQuotes = quotes.filter((quote) => {
    if (quote.status !== 'draft') return false;
    const updated = new Date(quote.updated_at).getTime();
    if (Number.isNaN(updated)) return false;
    return (referenceTime - updated) / oneDayMs >= 5;
  }).length;

  const leadSnapshot = [
    { label: 'New', value: leads.filter((lead) => lead.status === 'new').length },
    { label: 'Qualified', value: leads.filter((lead) => lead.status === 'qualified').length },
    { label: 'Quoted', value: leads.filter((lead) => lead.status === 'quoted').length },
    { label: 'Won', value: leads.filter((lead) => lead.status === 'won').length },
    { label: 'Lost', value: leads.filter((lead) => lead.status === 'lost').length },
  ] as const;

  const dealSnapshot = [
    { label: 'New', value: deals.filter((deal) => deal.stage === 'new').length },
    { label: 'Qualified', value: deals.filter((deal) => deal.stage === 'qualified').length },
    { label: 'Quoted', value: deals.filter((deal) => deal.stage === 'quoted').length },
    { label: 'Negotiation', value: deals.filter((deal) => deal.stage === 'negotiation').length },
    { label: 'Won', value: deals.filter((deal) => deal.stage === 'won').length },
    { label: 'Lost', value: deals.filter((deal) => deal.stage === 'lost').length },
  ] as const;

  return (
    <AdminShell>
      <PageShell density="compact">
        <Panel>
          <AdminPageHeader
            title="Revenue Control Center"
            subtitle="AI execution health, queue pressure, and lifecycle status in one dashboard."
            actions={
              <Toolbar>
                <Link href="/admin/leads" className="ui-btn ui-btn-secondary ui-btn-md">
                  Open Leads
                </Link>
                <Link href="/admin/pipeline" className="ui-btn ui-btn-secondary ui-btn-md">
                  Open Pipeline
                </Link>
                <Link href="/admin/quotes" className="ui-btn ui-btn-secondary ui-btn-md">
                  Open Quotes
                </Link>
                <Link href="/admin/analytics" className="ui-btn ui-btn-primary ui-btn-md">
                  Analytics
                </Link>
              </Toolbar>
            }
          />
        </Panel>

        <AiSalesLiveStatusOverview />

        <Panel>
          <div className="dg-grid dg-grid-cols-2 dg-gap-4">
            <article className="dg-chart-card dg-dash-focus-card">
              <div className="dg-admin-head">
                <h2 className="dg-title-sm">Action Queue</h2>
                <span className="dg-badge">Priority</span>
              </div>
              <div className="dg-impact-mini-grid dg-dash-focus-grid">
                <article className="dg-impact-mini-card">
                  <span>Hot Leads Waiting</span>
                  <strong>{hotUnqualifiedCount}</strong>
                  <em>Hot + not qualified</em>
                  <Link href="/admin/leads" className="ui-btn ui-btn-secondary ui-btn-sm">
                    Open Leads
                  </Link>
                </article>
                <article className="dg-impact-mini-card">
                  <span>Stale New Leads</span>
                  <strong>{staleNewLeads}</strong>
                  <em>New stage older than 7d</em>
                  <Link href="/admin/leads" className="ui-btn ui-btn-secondary ui-btn-sm">
                    Review Leads
                  </Link>
                </article>
                <article className="dg-impact-mini-card">
                  <span>Aged Negotiations</span>
                  <strong>{agedNegotiations}</strong>
                  <em>Negotiation older than 10d</em>
                  <Link href="/admin/pipeline" className="ui-btn ui-btn-secondary ui-btn-sm">
                    Open Pipeline
                  </Link>
                </article>
                <article className="dg-impact-mini-card">
                  <span>Draft Quotes Aging</span>
                  <strong>{agingDraftQuotes}</strong>
                  <em>Draft unchanged for 5d+</em>
                  <Link href="/admin/quotes" className="ui-btn ui-btn-secondary ui-btn-sm">
                    Review Drafts
                  </Link>
                </article>
              </div>
            </article>

            <article className="dg-chart-card">
              <div className="dg-admin-head">
                <h2 className="dg-title-sm">Lifecycle Snapshot</h2>
                <span className="dg-badge">Live</span>
              </div>
              <div className="dg-dash-snapshot-grid">
                <div className="dg-dash-snapshot-block">
                  <h3>Leads</h3>
                  <div className="dg-dash-snapshot-list">
                    {leadSnapshot.map((item) => (
                      <div key={item.label} className="dg-dash-snapshot-item">
                        <span>{item.label}</span>
                        <strong>{item.value}</strong>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="dg-dash-snapshot-block">
                  <h3>Deals</h3>
                  <div className="dg-dash-snapshot-list">
                    {dealSnapshot.map((item) => (
                      <div key={item.label} className="dg-dash-snapshot-item">
                        <span>{item.label}</span>
                        <strong>{item.value}</strong>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="dg-dash-snapshot-block">
                  <h3>Quotes</h3>
                  <div className="dg-dash-snapshot-list">
                    <div className="dg-dash-snapshot-item">
                      <span>Draft</span>
                      <strong>{quoteDraftCount}</strong>
                    </div>
                    <div className="dg-dash-snapshot-item">
                      <span>Sent</span>
                      <strong>{quoteSentCount}</strong>
                    </div>
                    <div className="dg-dash-snapshot-item">
                      <span>Approved</span>
                      <strong>{quoteApprovedCount}</strong>
                    </div>
                    <div className="dg-dash-snapshot-item">
                      <span>Awaiting Outcome</span>
                      <strong>{quoteAwaitingOutcomeCount}</strong>
                    </div>
                  </div>
                </div>
              </div>
            </article>
          </div>
        </Panel>
      </PageShell>
    </AdminShell>
  );
}
