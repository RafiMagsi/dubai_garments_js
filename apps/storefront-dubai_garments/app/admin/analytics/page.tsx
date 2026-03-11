'use client';

import Link from 'next/link';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import AdminPageHeader from '@/components/admin/common/page-header';
import AdminShell from '@/components/admin/admin-shell';
import { useDeals } from '@/features/admin/deals';
import { useLeads } from '@/features/admin/leads';
import { useQuotes } from '@/features/admin/quotes';
import { titleCase } from '@/features/admin/shared/view-format';

const STAGE_ORDER = ['new', 'qualified', 'quoted', 'negotiation', 'won', 'lost'] as const;
const STATUS_COLORS = ['#c2410c', '#f59e0b', '#10b981', '#64748b', '#334155'];

function monthLabel(date: Date) {
  return date.toLocaleString('en-US', { month: 'short' });
}

function buildLastSixMonthKeys() {
  const now = new Date();
  const keys: Array<{ key: string; label: string }> = [];
  for (let i = 5; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: monthLabel(d),
    });
  }
  return keys;
}

function toMonthKey(value?: string | null) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function AdminAnalyticsPage() {
  const leadsQuery = useLeads();
  const dealsQuery = useDeals();
  const quotesQuery = useQuotes();

  const leads = leadsQuery.data?.items ?? [];
  const deals = dealsQuery.data?.items ?? [];
  const quotes = quotesQuery.data?.items ?? [];

  const monthKeys = buildLastSixMonthKeys();
  const leadVolumeByMonth = monthKeys.map(({ key, label }) => {
    const count = leads.filter((lead) => toMonthKey(lead.created_at) === key).length;
    const dealsCount = deals.filter((deal) => toMonthKey(deal.created_at) === key).length;
    return { month: label, leads: count, deals: dealsCount };
  });

  const hotLeads = leads.filter((lead) => lead.ai_classification === 'HOT').length;
  const warmLeads = leads.filter((lead) => lead.ai_classification === 'WARM').length;
  const coldLeads = leads.filter((lead) => lead.ai_classification === 'COLD').length;
  const unclassifiedLeads = leads.filter((lead) => !lead.ai_classification).length;

  const hotLeadBreakdown = [
    { name: 'HOT', value: hotLeads },
    { name: 'WARM', value: warmLeads },
    { name: 'COLD', value: coldLeads },
    { name: 'Unclassified', value: unclassifiedLeads },
  ].filter((item) => item.value > 0);

  const leadsWithDeal = deals.filter((deal) => Boolean(deal.lead_id)).length;
  const conversionRate = leads.length > 0 ? Math.round((leadsWithDeal / leads.length) * 100) : 0;

  const acceptedQuotes = quotes.filter((quote) => quote.status === 'approved').length;
  const rejectedQuotes = quotes.filter((quote) => quote.status === 'rejected').length;
  const expiredQuotes = quotes.filter((quote) => quote.status === 'expired').length;
  const sentQuotes = quotes.filter((quote) => quote.status === 'sent').length;
  const draftQuotes = quotes.filter((quote) => quote.status === 'draft').length;
  const decisionBase = acceptedQuotes + rejectedQuotes + expiredQuotes;
  const acceptanceRate = decisionBase > 0 ? Math.round((acceptedQuotes / decisionBase) * 100) : 0;

  const quoteOutcomeData = [
    { name: 'Approved', count: acceptedQuotes },
    { name: 'Rejected', count: rejectedQuotes },
    { name: 'Expired', count: expiredQuotes },
    { name: 'Sent', count: sentQuotes },
    { name: 'Draft', count: draftQuotes },
  ];

  const pipelineData = STAGE_ORDER.map((stage) => ({
    stage: titleCase(stage),
    count: deals.filter((deal) => deal.stage === stage).length,
  }));

  const isLoading = leadsQuery.isLoading || dealsQuery.isLoading || quotesQuery.isLoading;
  const hasError = leadsQuery.isError || dealsQuery.isError || quotesQuery.isError;

  return (
    <AdminShell>
      <section className="dg-admin-page">
        <AdminPageHeader
          title="Analytics Dashboard"
          subtitle="Business intelligence view for lead volume, conversion, hot leads, and quote acceptance."
          actions={
            <>
            <Link href="/admin/dashboard" className="dg-btn-secondary">
              Back to Dashboard
            </Link>
            <Link href="/admin/leads" className="dg-btn-secondary">
              Lead List
            </Link>
            <Link href="/admin/deals" className="dg-btn-secondary">
              Deal Pipeline
            </Link>
            <Link href="/admin/quotes" className="dg-btn-secondary">
              Quote Management
            </Link>
            </>
          }
        />
      </section>

      <section className="dg-admin-page">
        <div className="dg-kpi-grid">
          <article className="dg-card dg-kpi-card">
            <p className="dg-kpi-label">Lead Volume</p>
            <p className="dg-kpi-value">{isLoading ? '...' : leads.length}</p>
            <p className="dg-kpi-meta">Total leads in system</p>
          </article>
          <article className="dg-card dg-kpi-card">
            <p className="dg-kpi-label">Conversion Rate</p>
            <p className="dg-kpi-value">{isLoading ? '...' : `${conversionRate}%`}</p>
            <p className="dg-kpi-meta">Leads converted into deals</p>
          </article>
          <article className="dg-card dg-kpi-card">
            <p className="dg-kpi-label">Hot Leads</p>
            <p className="dg-kpi-value">{isLoading ? '...' : hotLeads}</p>
            <p className="dg-kpi-meta">AI-classified HOT opportunities</p>
          </article>
          <article className="dg-card dg-kpi-card">
            <p className="dg-kpi-label">Quote Acceptance</p>
            <p className="dg-kpi-value">{isLoading ? '...' : `${acceptanceRate}%`}</p>
            <p className="dg-kpi-meta">Approved out of decided quotes</p>
          </article>
        </div>
      </section>

      {hasError && (
        <section className="dg-admin-page">
          <article className="dg-card dg-panel">
            <p className="dg-alert-error">
              Failed to load analytics data. Check leads, deals, and quotes API responses.
            </p>
          </article>
        </section>
      )}

      {!hasError && (
        <>
          <section className="dg-admin-page">
            <div className="dg-analytics-grid">
              <article className="dg-card dg-chart-card">
                <h2 className="dg-title-sm">Lead Volume Trend (6 Months)</h2>
                <div style={{ width: '100%', height: 280 }}>
                  <ResponsiveContainer>
                    <LineChart data={leadVolumeByMonth}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="leads"
                        stroke="#c2410c"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        name="Leads"
                      />
                      <Line
                        type="monotone"
                        dataKey="deals"
                        stroke="#0f766e"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        name="Deals"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </article>

              <article className="dg-card dg-chart-card">
                <h2 className="dg-title-sm">Hot Leads Distribution</h2>
                <div style={{ width: '100%', height: 280 }}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={hotLeadBreakdown}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={90}
                        label
                      >
                        {hotLeadBreakdown.map((entry, index) => (
                          <Cell key={`${entry.name}-${entry.value}`} fill={STATUS_COLORS[index % STATUS_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </article>
            </div>
          </section>

          <section className="dg-admin-page">
            <div className="dg-analytics-grid">
              <article className="dg-card dg-chart-card">
                <h2 className="dg-title-sm">Quote Outcome Breakdown</h2>
                <div style={{ width: '100%', height: 280 }}>
                  <ResponsiveContainer>
                    <BarChart data={quoteOutcomeData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#c2410c" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </article>

              <article className="dg-card dg-chart-card">
                <h2 className="dg-title-sm">Pipeline Stage Distribution</h2>
                <div style={{ width: '100%', height: 280 }}>
                  <ResponsiveContainer>
                    <BarChart data={pipelineData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="stage" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#0f766e" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </article>
            </div>
          </section>
        </>
      )}
    </AdminShell>
  );
}
