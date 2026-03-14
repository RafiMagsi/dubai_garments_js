'use client';

import Link from 'next/link';
import AdminPageHeader from '@/components/admin/common/page-header';
import AdminShell from '@/components/admin/admin-shell';
import { PageShell, Panel, StatusBadge, Toolbar } from '@/components/ui';
import { FeatureGrid, MetricStrip } from '@/components/shared/sections';
import { useDeals, usePipeline } from '@/features/admin/deals';
import { useLeads } from '@/features/admin/leads';
import { useQuotes } from '@/features/admin/quotes';
import { shortCode, titleCase } from '@/features/admin/shared/view-format';

const leadStatuses = ['new', 'qualified', 'quoted', 'won', 'lost'] as const;
const dealStages = ['new', 'qualified', 'quoted', 'negotiation', 'won', 'lost'] as const;

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
      <PageShell density="compact">
        <Panel>
          <AdminPageHeader
            title="Dashboard Analytics"
            subtitle="Performance overview for lead intake, pipeline progress, and quote conversion."
            actions={
              <Toolbar>
                <Link href="/admin/analytics" className="ui-btn ui-btn-secondary ui-btn-md">
                  Analytics Dashboard
                </Link>
                <Link href="/admin/leads" className="ui-btn ui-btn-secondary ui-btn-md">
                  Open Leads
                </Link>
                <Link href="/admin/deals" className="ui-btn ui-btn-secondary ui-btn-md">
                  Open Pipeline
                </Link>
                <Link href="/admin/quotes" className="ui-btn ui-btn-secondary ui-btn-md">
                  Open Quotes
                </Link>
              </Toolbar>
            }
          />

          <MetricStrip
            items={[
              {
                label: 'Total Leads',
                value: isLoading ? '...' : totalLeads,
                meta: isLoading ? '...' : `${hotLeads} hot leads (${hotLeadRate}%)`,
              },
              {
                label: 'Total Deals',
                value: isLoading ? '...' : totalDeals,
                meta: isLoading ? '...' : `Win rate ${winRate}%`,
              },
              {
                label: 'Total Quotes',
                value: isLoading ? '...' : totalQuotes,
                meta: isLoading ? '...' : `${sentQuotes} sent (${quoteSendRate}%)`,
              },
              {
                label: 'Team Users',
                value: isLoading ? '...' : teamUsers,
                meta: 'Admin and sales accounts',
              },
            ]}
          />
        </Panel>

        <Panel>
          <FeatureGrid
            columns={3}
            items={[
              {
                eyebrow: 'Sales Module',
                title: 'Lead List',
                description: 'Track new and qualified opportunities with quick drill-down.',
                action: <Link href="/admin/leads" className="ui-btn ui-btn-secondary ui-btn-md">Open Lead List</Link>,
              },
              {
                eyebrow: 'Sales Module',
                title: 'Deal Pipeline',
                description: 'Monitor stage movement from New to Won/Lost.',
                action: <Link href="/admin/deals" className="ui-btn ui-btn-secondary ui-btn-md">Open Deal Pipeline</Link>,
              },
              {
                eyebrow: 'Sales Module',
                title: 'Quote Management',
                description: 'Manage draft/sent/approved quotes with full lifecycle actions.',
                action: <Link href="/admin/quotes" className="ui-btn ui-btn-secondary ui-btn-md">Open Quote Management</Link>,
              },
            ]}
          />
        </Panel>

        <Panel>
          <div className="dg-analytics-grid">
          <article className="dg-chart-card">
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

          <article className="dg-chart-card">
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
        </Panel>

        <Panel>
          <div className="dg-analytics-grid">
          <article className="dg-chart-card">
            <h2 className="dg-title-sm">Recent Leads</h2>
            <div className="dg-list dg-list-density-compact">
              {recentLeads.length > 0 ? (
                recentLeads.map((lead) => (
                  <div key={lead.id} className="dg-list-row">
                    <div className="dg-list-main">
                      <p className="dg-list-title">
                        #{shortCode(lead.id)} {lead.contact_name || 'Unnamed Lead'}
                      </p>
                      <p className="dg-list-meta">
                        {titleCase(lead.status)} • {lead.ai_product || 'No product'}
                      </p>
                    </div>
                    <Link href={`/admin/leads/${lead.id}`} className="ui-btn ui-btn-secondary ui-btn-md">
                      Open
                    </Link>
                  </div>
                ))
              ) : (
                <p className="dg-muted-sm">No recent leads.</p>
              )}
            </div>
          </article>

          <article className="dg-chart-card">
            <h2 className="dg-title-sm">Recent Deals</h2>
            <div className="dg-list dg-list-density-compact">
              {recentDeals.length > 0 ? (
                recentDeals.map((deal) => (
                  <div key={deal.id} className="dg-list-row">
                    <div className="dg-list-main">
                      <p className="dg-list-title">
                        #{shortCode(deal.id)} {deal.lead_contact_name || 'No customer'}
                      </p>
                      <p className="dg-list-meta">{titleCase(deal.stage)} • Pipeline item</p>
                    </div>
                    <Link href="/admin/deals" className="ui-btn ui-btn-secondary ui-btn-md">
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
        </Panel>

        <Panel>
          <article className="dg-chart-card">
          <div className="dg-admin-head">
            <h2 className="dg-title-sm">Recent Quotes</h2>
            <Link href="/admin/quotes" className="ui-btn ui-btn-secondary ui-btn-md">
              View All
            </Link>
          </div>
          <div className="ui-table-wrap">
            <table className="ui-table ui-table-density-compact">
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
                      <td>{quote.quote_number || `#${shortCode(quote.id)}`}</td>
                      <td>{quote.customer_company_name || '-'}</td>
                      <td>
                        <StatusBadge status={quote.status}>{quote.status}</StatusBadge>
                      </td>
                      <td>
                        {quote.currency} {Number(quote.total_amount || 0).toFixed(2)}
                      </td>
                      <td>
                        <Link href={`/admin/quotes/${quote.id}`} className="ui-btn ui-btn-secondary ui-btn-md">
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
        </Panel>
      </PageShell>
    </AdminShell>
  );
}
