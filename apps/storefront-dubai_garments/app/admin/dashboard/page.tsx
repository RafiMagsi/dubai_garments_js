'use client';

import Link from 'next/link';
import AdminShell from '@/components/admin/admin-shell';
import { useDeals, usePipeline } from '@/features/admin/deals';
import { useLeads } from '@/features/admin/leads';
import { useQuotes } from '@/features/admin/quotes';

const leadStatuses = ['new', 'qualified', 'quoted', 'won', 'lost'] as const;
const dealStages = ['new', 'qualified', 'quoted', 'negotiation', 'won', 'lost'] as const;

function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export default function AdminDashboardPage() {
  const leadsQuery = useLeads();
  const dealsQuery = useDeals();
  const quotesQuery = useQuotes();
  const pipelineQuery = usePipeline();

  const leads = leadsQuery.data?.items ?? [];
  const deals = dealsQuery.data?.items ?? [];
  const quotes = quotesQuery.data?.items ?? [];

  const totalLeads = leads.length;
  const hotLeads = leads.filter((lead) => lead.ai_classification === 'HOT').length;
  const totalDeals = deals.length;
  const wonDeals = deals.filter((deal) => deal.stage === 'won').length;
  const totalQuotes = quotes.length;
  const sentQuotes = quotes.filter((quote) => quote.status === 'sent').length;

  const hotLeadRate = totalLeads > 0 ? Math.round((hotLeads / totalLeads) * 100) : 0;
  const winRate = totalDeals > 0 ? Math.round((wonDeals / totalDeals) * 100) : 0;
  const quoteSendRate = totalQuotes > 0 ? Math.round((sentQuotes / totalQuotes) * 100) : 0;

  const leadCountsByStatus = Object.fromEntries(
    leadStatuses.map((status) => [status, leads.filter((lead) => lead.status === status).length])
  ) as Record<(typeof leadStatuses)[number], number>;

  const dealCountsByStage = Object.fromEntries(
    dealStages.map((stage) => [stage, deals.filter((deal) => deal.stage === stage).length])
  ) as Record<(typeof dealStages)[number], number>;

  const leadStatusTotal = Object.values(leadCountsByStatus).reduce((sum, count) => sum + count, 0);
  const dealStageTotal = Object.values(dealCountsByStage).reduce((sum, count) => sum + count, 0);

  const recentLeads = leads.slice(0, 5);
  const recentDeals = deals.slice(0, 5);
  const recentQuotes = quotes.slice(0, 8);

  const isLoading =
    leadsQuery.isLoading || dealsQuery.isLoading || quotesQuery.isLoading || pipelineQuery.isLoading;

  const pipelineStages = pipelineQuery.data?.stages ?? [];
  const teamUsers = Math.max(
    1,
    new Set(
      deals
        .map((deal) => deal.owner_user_id)
        .concat(leads.map((lead) => lead.assigned_to_user_id))
        .filter(Boolean)
    ).size
  );

  return (
    <AdminShell>
      <section className="dg-admin-page">
        <div className="dg-admin-page-head">
          <div>
            <h1 className="dg-page-title">Dashboard Analytics</h1>
            <p className="dg-page-subtitle">
              Performance overview for lead intake, pipeline progress, and quote conversion.
            </p>
          </div>
          <div className="dg-admin-toolbar">
            <Link href="/admin/leads" className="dg-btn-secondary">
              Open Leads
            </Link>
            <Link href="/admin/deals" className="dg-btn-secondary">
              Open Pipeline
            </Link>
            <Link href="/admin/quotes" className="dg-btn-secondary">
              Open Quotes
            </Link>
          </div>
        </div>

        <div className="dg-kpi-grid">
          <article className="dg-card dg-kpi-card">
            <p className="dg-kpi-label">Total Leads</p>
            <p className="dg-kpi-value">{isLoading ? '...' : totalLeads}</p>
            <p className="dg-kpi-meta">
              {isLoading ? '...' : `${hotLeads} hot leads (${hotLeadRate}%)`}
            </p>
          </article>
          <article className="dg-card dg-kpi-card">
            <p className="dg-kpi-label">Total Deals</p>
            <p className="dg-kpi-value">{isLoading ? '...' : totalDeals}</p>
            <p className="dg-kpi-meta">{isLoading ? '...' : `Win rate ${winRate}%`}</p>
          </article>
          <article className="dg-card dg-kpi-card">
            <p className="dg-kpi-label">Total Quotes</p>
            <p className="dg-kpi-value">{isLoading ? '...' : totalQuotes}</p>
            <p className="dg-kpi-meta">
              {isLoading ? '...' : `${sentQuotes} sent (${quoteSendRate}%)`}
            </p>
          </article>
          <article className="dg-card dg-kpi-card">
            <p className="dg-kpi-label">Team Users</p>
            <p className="dg-kpi-value">{isLoading ? '...' : teamUsers}</p>
            <p className="dg-kpi-meta">Admin and sales accounts</p>
          </article>
        </div>
      </section>

      <section className="dg-admin-page">
        <div className="dg-analytics-grid">
          <article className="dg-card dg-chart-card">
            <h2 className="dg-title-sm">Lead Status Breakdown</h2>
            <div className="dg-stat-bars">
              {leadStatuses.map((status) => {
                const count = leadCountsByStatus[status];
                const percentage = leadStatusTotal > 0 ? Math.round((count / leadStatusTotal) * 100) : 0;
                return (
                  <div key={status} className="dg-stat-row">
                    <span>{titleCase(status)}</span>
                    <progress className="dg-progress" value={count} max={Math.max(leadStatusTotal, 1)} />
                    <strong>{percentage}%</strong>
                  </div>
                );
              })}
            </div>
          </article>

          <article className="dg-card dg-chart-card">
            <h2 className="dg-title-sm">Deal Stage Breakdown</h2>
            <div className="dg-stat-bars">
              {dealStages.map((stage) => {
                const pipelineCount =
                  pipelineStages.find((pipelineStage) => pipelineStage.stageKey === stage)?.count ??
                  dealCountsByStage[stage];
                const percentage =
                  dealStageTotal > 0 ? Math.round((pipelineCount / dealStageTotal) * 100) : 0;
                return (
                  <div key={stage} className="dg-stat-row">
                    <span>{titleCase(stage)}</span>
                    <progress
                      className="dg-progress"
                      value={pipelineCount}
                      max={Math.max(dealStageTotal, 1)}
                    />
                    <strong>{percentage}%</strong>
                  </div>
                );
              })}
            </div>
          </article>
        </div>
      </section>

      <section className="dg-admin-page">
        <div className="dg-analytics-grid">
          <article className="dg-card dg-chart-card">
            <h2 className="dg-title-sm">Recent Leads</h2>
            <div className="dg-list">
              {recentLeads.length > 0 ? (
                recentLeads.map((lead) => (
                  <div key={lead.id} className="dg-list-row">
                    <div className="dg-list-main">
                      <p className="dg-list-title">
                        #{lead.id.slice(0, 6).toUpperCase()} {lead.contact_name || 'Unnamed Lead'}
                      </p>
                      <p className="dg-list-meta">
                        {titleCase(lead.status)} • {lead.ai_product || 'No product'}
                      </p>
                    </div>
                    <Link href={`/admin/leads/${lead.id}`} className="dg-btn-secondary">
                      Open
                    </Link>
                  </div>
                ))
              ) : (
                <p className="dg-muted-sm">No recent leads.</p>
              )}
            </div>
          </article>

          <article className="dg-card dg-chart-card">
            <h2 className="dg-title-sm">Recent Deals</h2>
            <div className="dg-list">
              {recentDeals.length > 0 ? (
                recentDeals.map((deal) => (
                  <div key={deal.id} className="dg-list-row">
                    <div className="dg-list-main">
                      <p className="dg-list-title">
                        #{deal.id.slice(0, 6).toUpperCase()} {deal.lead_contact_name || 'No customer'}
                      </p>
                      <p className="dg-list-meta">{titleCase(deal.stage)} • Pipeline item</p>
                    </div>
                    <Link href="/admin/deals" className="dg-btn-secondary">
                      Open
                    </Link>
                  </div>
                ))
              ) : (
                <p className="dg-muted-sm">No recent deals.</p>
              )}
            </div>
          </article>
        </div>
      </section>

      <section className="dg-admin-page">
        <article className="dg-card dg-chart-card">
          <div className="dg-admin-head">
            <h2 className="dg-title-sm">Recent Quotes</h2>
            <Link href="/admin/quotes" className="dg-btn-secondary">
              View All
            </Link>
          </div>
          <div className="dg-table-wrap">
            <table className="dg-table">
              <thead>
                <tr>
                  <th>Quote</th>
                  <th>Customer</th>
                  <th>Status</th>
                  <th>Total</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {recentQuotes.length > 0 ? (
                  recentQuotes.map((quote) => (
                    <tr key={quote.id}>
                      <td>{quote.quote_number || `#${quote.id.slice(0, 6).toUpperCase()}`}</td>
                      <td>{quote.customer_company_name || '-'}</td>
                      <td>
                        <span className="dg-status-pill">{quote.status}</span>
                      </td>
                      <td>
                        {quote.currency} {Number(quote.total_amount || 0).toFixed(2)}
                      </td>
                      <td>
                        <Link href={`/admin/quotes/${quote.id}`} className="dg-btn-secondary">
                          Open
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5}>No recent quotes.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </article>
      </section>
    </AdminShell>
  );
}
