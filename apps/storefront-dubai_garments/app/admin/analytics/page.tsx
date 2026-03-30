'use client';

import Link from 'next/link';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import AdminPageHeader from '@/components/admin/common/page-header';
import AdminShell from '@/components/admin/admin-shell';
import { PageShell, Panel, Toolbar } from '@/components/ui';
import { useDeals } from '@/features/admin/deals';
import { useLeads } from '@/features/admin/leads';
import { useQuotes } from '@/features/admin/quotes';
import { titleCase } from '@/features/admin/shared/view-format';
import { useMemo } from 'react';

const STAGE_ORDER = ['new', 'qualified', 'quoted', 'negotiation', 'won', 'lost'] as const;

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

function pct(numerator: number, denominator: number) {
  if (denominator <= 0) return 0;
  return Math.round((numerator / denominator) * 100);
}

function pctDelta(current: number, previous: number) {
  if (previous <= 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function scoreTone(value: number) {
  if (value >= 75) return 'is-good';
  if (value >= 50) return 'is-warn';
  return 'is-risk';
}

export default function AdminAnalyticsPage() {
  const leadsQuery = useLeads();
  const dealsQuery = useDeals();
  const quotesQuery = useQuotes();

  const leads = useMemo(() => leadsQuery.data?.items ?? [], [leadsQuery.data?.items]);
  const deals = useMemo(() => dealsQuery.data?.items ?? [], [dealsQuery.data?.items]);
  const quotes = useMemo(() => quotesQuery.data?.items ?? [], [quotesQuery.data?.items]);

  const isLoading = leadsQuery.isLoading || dealsQuery.isLoading || quotesQuery.isLoading;
  const hasError = leadsQuery.isError || dealsQuery.isError || quotesQuery.isError;

  const totalLeads = leads.length;
  const totalDeals = deals.length;
  const totalQuotes = quotes.length;

  const convertedLeadIds = new Set(
    deals.map((deal) => deal.lead_id).filter((leadId): leadId is string => Boolean(leadId))
  );
  const leadToDealRate = pct(convertedLeadIds.size, totalLeads);

  const aiProcessedLeadCount = leads.filter(
    (lead) => lead.ai_processed_at || lead.ai_score !== null || lead.ai_classification !== null
  ).length;
  const aiCoverageRate = pct(aiProcessedLeadCount, totalLeads);
  const aiLeadIds = new Set(
    leads
      .filter((lead) => lead.ai_processed_at || lead.ai_score !== null || lead.ai_classification !== null)
      .map((lead) => lead.id)
  );

  const aiLinkedDeals = deals.filter((deal) => deal.lead_id && aiLeadIds.has(deal.lead_id));
  const aiLeadToDealRate = pct(aiLinkedDeals.length, aiProcessedLeadCount);

  const approvedQuotes = quotes.filter((quote) => quote.status === 'approved').length;
  const rejectedQuotes = quotes.filter((quote) => quote.status === 'rejected').length;
  const expiredQuotes = quotes.filter((quote) => quote.status === 'expired').length;
  const sentQuotes = quotes.filter((quote) => quote.status === 'sent').length;
  const draftQuotes = quotes.filter((quote) => quote.status === 'draft').length;
  const decidedQuotes = approvedQuotes + rejectedQuotes + expiredQuotes;
  const quoteDecisionRate = pct(decidedQuotes, totalQuotes);
  const quoteAcceptanceRate = pct(approvedQuotes, decidedQuotes);
  const quoteFromDealRate = pct(totalQuotes, totalDeals);
  const approvedFromSentRate = pct(approvedQuotes, sentQuotes);

  const aiLinkedQuotes = quotes.filter((quote) => quote.lead_id && aiLeadIds.has(quote.lead_id));
  const aiSentQuotes = aiLinkedQuotes.filter((quote) => quote.status === 'sent').length;
  const quoteSendRate = pct(sentQuotes, totalQuotes);
  const aiQuoteSendRate = pct(aiSentQuotes, aiLinkedQuotes.length);

  const wonDeals = deals.filter((deal) => deal.stage === 'won').length;
  const overallWinRate = pct(wonDeals, totalDeals);
  const aiWonDeals = aiLinkedDeals.filter((deal) => deal.stage === 'won').length;
  const aiWinRate = pct(aiWonDeals, aiLinkedDeals.length);

  const hotLeadCount = leads.filter((lead) => lead.ai_classification === 'HOT').length;

  const pipelineOpenValue = deals
    .filter((deal) => deal.stage !== 'won' && deal.stage !== 'lost')
    .reduce((sum, deal) => sum + Number(deal.expected_value || 0), 0);
  const pipelineWonValue = deals
    .filter((deal) => deal.stage === 'won')
    .reduce((sum, deal) => sum + Number(deal.expected_value || 0), 0);
  const draftQuoteValue = quotes
    .filter((quote) => quote.status === 'draft')
    .reduce((sum, quote) => sum + Number(quote.total_amount || 0), 0);

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

  const agedNegotiationDeals = deals.filter((deal) => {
    if (deal.stage !== 'negotiation') return false;
    const created = new Date(deal.created_at || '').getTime();
    if (Number.isNaN(created)) return false;
    return (referenceTime - created) / oneDayMs >= 10;
  });
  const agedNegotiations = agedNegotiationDeals.length;
  const agedNegotiationValue = agedNegotiationDeals.reduce(
    (sum, deal) => sum + Number(deal.expected_value || 0),
    0
  );

  const agingDraftQuotes = quotes.filter((quote) => {
    if (quote.status !== 'draft') return false;
    const updated = new Date(quote.updated_at).getTime();
    if (Number.isNaN(updated)) return false;
    return (referenceTime - updated) / oneDayMs >= 5;
  }).length;

  const monthKeys = useMemo(() => buildLastSixMonthKeys(), []);
  const trendData = monthKeys.map(({ key, label }) => ({
    month: label,
    leads: leads.filter((lead) => toMonthKey(lead.created_at) === key).length,
    deals: deals.filter((deal) => toMonthKey(deal.created_at) === key).length,
    quotes: quotes.filter((quote) => toMonthKey(quote.created_at) === key).length,
    value:
      deals
        .filter((deal) => toMonthKey(deal.created_at) === key)
        .reduce((sum, deal) => sum + Number(deal.expected_value || 0), 0) / 1000,
  }));

  const latestTrend = trendData[trendData.length - 1] ?? { leads: 0, deals: 0, quotes: 0 };
  const previousTrend = trendData[trendData.length - 2] ?? { leads: 0, deals: 0, quotes: 0 };

  const pipelineData = STAGE_ORDER.map((stage) => ({
    stage: titleCase(stage),
    count: deals.filter((deal) => deal.stage === stage).length,
  }));

  const quoteOutcomeData = [
    { label: 'Approved', count: approvedQuotes },
    { label: 'Rejected', count: rejectedQuotes },
    { label: 'Expired', count: expiredQuotes },
    { label: 'Pending', count: sentQuotes + draftQuotes },
  ];

  const funnelData = [
    { label: 'Leads', count: totalLeads, tone: 'is-blue' },
    { label: 'AI Processed', count: aiProcessedLeadCount, tone: 'is-indigo' },
    { label: 'Deals', count: convertedLeadIds.size, tone: 'is-violet' },
    { label: 'Quotes Sent', count: sentQuotes, tone: 'is-amber' },
    { label: 'Approved', count: approvedQuotes, tone: 'is-green' },
  ] as const;
  const funnelMax = Math.max(1, ...funnelData.map((item) => item.count));

  const impactRows = [
    { key: 'lead_conversion', label: 'Lead Conversion', ai: aiLeadToDealRate, baseline: leadToDealRate },
    { key: 'quote_send', label: 'Quote Send Throughput', ai: aiQuoteSendRate, baseline: quoteSendRate },
    { key: 'win_rate', label: 'Win Rate', ai: aiWinRate, baseline: overallWinRate },
  ].map((row) => ({ ...row, delta: row.ai - row.baseline }));

  const impactDeltaAvg = Math.round(
    impactRows.reduce((sum, row) => sum + row.delta, 0) / Math.max(1, impactRows.length)
  );
  const riskItems = [
    { key: 'stale', label: 'Stale New Leads', count: staleNewLeads, tone: staleNewLeads > 8 ? 'is-risk' : staleNewLeads > 0 ? 'is-warn' : 'is-good' },
    { key: 'negotiation', label: 'Aged Negotiations', count: agedNegotiations, tone: agedNegotiations > 6 ? 'is-risk' : agedNegotiations > 0 ? 'is-warn' : 'is-good' },
    { key: 'drafts', label: 'Aging Draft Quotes', count: agingDraftQuotes, tone: agingDraftQuotes > 8 ? 'is-risk' : agingDraftQuotes > 0 ? 'is-warn' : 'is-good' },
  ] as const;
  const riskBacklog = staleNewLeads + agedNegotiations + agingDraftQuotes;

  const throughputScore = Math.round((leadToDealRate + quoteDecisionRate + overallWinRate) / 3);
  const riskScore = clamp(riskBacklog * 6, 0, 100);
  const aiAdvantageScore = clamp(50 + impactDeltaAvg * 2, 0, 100);
  const operationalScore = clamp(
    Math.round(aiCoverageRate * 0.35 + throughputScore * 0.45 + (100 - riskScore) * 0.2),
    0,
    100
  );

  const money = new Intl.NumberFormat('en-AE', {
    style: 'currency',
    currency: 'AED',
    maximumFractionDigits: 0,
  });

  const kpis = [
    { label: 'Lead to Deal', value: `${leadToDealRate}%`, meta: `${convertedLeadIds.size}/${totalLeads}` },
    { label: 'Quote Acceptance', value: `${quoteAcceptanceRate}%`, meta: `${approvedQuotes}/${decidedQuotes}` },
    { label: 'AI Coverage', value: `${aiCoverageRate}%`, meta: `${aiProcessedLeadCount}/${totalLeads}` },
    { label: 'Open Pipeline', value: money.format(pipelineOpenValue), meta: `Won ${money.format(pipelineWonValue)}` },
  ] as const;

  const executivePulse = [
    { label: 'Lead Intake', value: latestTrend.leads, delta: pctDelta(latestTrend.leads, previousTrend.leads) },
    { label: 'Deal Creation', value: latestTrend.deals, delta: pctDelta(latestTrend.deals, previousTrend.deals) },
    { label: 'Quote Throughput', value: latestTrend.quotes, delta: pctDelta(latestTrend.quotes, previousTrend.quotes) },
  ] as const;

  return (
    <AdminShell>
      <PageShell density="compact">
        <Panel>
          <AdminPageHeader
            title="Revenue Analytics Command"
            subtitle="Executive-grade conversion, AI lift, and risk intelligence."
            actions={
              <Toolbar>
                <Link href="/admin/dashboard" className="ui-btn ui-btn-secondary ui-btn-md">
                  Dashboard
                </Link>
                <Link href="/admin/pipeline" className="ui-btn ui-btn-secondary ui-btn-md">
                  Pipeline
                </Link>
                <Link href="/admin/quotes" className="ui-btn ui-btn-secondary ui-btn-md">
                  Quotes
                </Link>
                <Link href="/admin/leads" className="ui-btn ui-btn-primary ui-btn-md">
                  Leads
                </Link>
              </Toolbar>
            }
          />
        </Panel>

        {hasError ? (
          <Panel>
            <p className="dg-alert-error">
              Failed to load analytics data. Check leads, deals, and quotes API responses.
            </p>
          </Panel>
        ) : (
          <>
            <Panel>
              <div className="dg-ana-cockpit">
                <article className="dg-card dg-chart-card dg-ana-cockpit-main">
                  <div className="dg-admin-head">
                    <h2 className="dg-title-sm">Performance Cockpit</h2>
                    <span className="dg-badge">Live Intelligence</span>
                  </div>
                  <div className="dg-ana-kpi-grid">
                    {kpis.map((item) => (
                      <article key={item.label} className="dg-ana-kpi-card">
                        <span>{item.label}</span>
                        <strong>{isLoading ? '...' : item.value}</strong>
                        <em>{isLoading ? '...' : item.meta}</em>
                      </article>
                    ))}
                  </div>
                </article>

                <article className="dg-card dg-chart-card dg-ana-score-card">
                  <span className="dg-ana-score-label">Operational Score</span>
                  <strong className={`dg-ana-score-value ${scoreTone(operationalScore)}`}>
                    {isLoading ? '...' : `${operationalScore}/100`}
                  </strong>
                  <div className="dg-ana-score-meter">
                    <span className={scoreTone(operationalScore)} style={{ width: `${operationalScore}%` }} />
                  </div>
                  <div className="dg-ana-score-grid">
                    <div>
                      <span>Throughput</span>
                      <strong>{throughputScore}</strong>
                    </div>
                    <div>
                      <span>AI Advantage</span>
                      <strong>{aiAdvantageScore}</strong>
                    </div>
                    <div>
                      <span>Risk Load</span>
                      <strong>{riskScore}</strong>
                    </div>
                  </div>
                </article>
              </div>
            </Panel>

            <Panel>
              <div className="dg-grid dg-grid-cols-2 dg-gap-4">
                <article className="dg-card dg-chart-card dg-ana-impact-card">
                  <div className="dg-admin-head">
                    <h2 className="dg-title-sm">AI Impact vs Baseline</h2>
                    <span className={`dg-badge ${impactDeltaAvg >= 0 ? 'is-good' : 'is-risk'}`}>
                      {impactDeltaAvg >= 0 ? '+' : ''}
                      {impactDeltaAvg}pp avg
                    </span>
                  </div>
                  <div className="dg-ana-impact-list">
                    {impactRows.map((row) => {
                      const aiWidth = clamp(row.ai, 0, 100);
                      const baselineWidth = clamp(row.baseline, 0, 100);
                      return (
                        <div key={row.key} className="dg-ana-impact-row">
                          <div className="dg-ana-impact-head">
                            <span>{row.label}</span>
                            <strong className={row.delta >= 0 ? 'is-good' : 'is-risk'}>
                              {row.delta >= 0 ? '+' : ''}
                              {row.delta}pp
                            </strong>
                          </div>
                          <div className="dg-ana-impact-track">
                            <span className="is-ai" style={{ width: `${aiWidth}%` }} />
                            <span className="is-base" style={{ width: `${baselineWidth}%` }} />
                          </div>
                          <div className="dg-ana-impact-meta">
                            <em>AI {row.ai}%</em>
                            <em>Base {row.baseline}%</em>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </article>

                <article className="dg-card dg-chart-card dg-ana-risk-card">
                  <div className="dg-admin-head">
                    <h2 className="dg-title-sm">Risk Radar</h2>
                    <span className={`dg-badge ${scoreTone(100 - riskScore)}`}>{riskBacklog} items</span>
                  </div>
                  <div className="dg-ana-risk-list">
                    {riskItems.map((item) => (
                      <div key={item.key} className={`dg-ana-risk-item ${item.tone}`}>
                        <strong>{item.label}</strong>
                        <span>{item.count}</span>
                      </div>
                    ))}
                  </div>
                  <div className="dg-ana-risk-foot">
                    <span>Aged negotiation value: {money.format(agedNegotiationValue)}</span>
                    <span>Hot leads: {hotLeadCount}</span>
                  </div>
                </article>
              </div>
            </Panel>

            <Panel>
              <div className="dg-ana-visual-grid">
                <article className="dg-card dg-chart-card dg-ana-funnel-card">
                  <h2 className="dg-title-sm">Conversion Funnel</h2>
                  <div className="dg-ana-funnel-list">
                    {funnelData.map((item) => (
                      <div key={item.label} className="dg-ana-funnel-row">
                        <span>{item.label}</span>
                        <strong>{item.count}</strong>
                        <div className="dg-ana-funnel-meter">
                          <span
                            className={item.tone}
                            style={{ width: `${Math.round((item.count / funnelMax) * 100)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="dg-ana-funnel-foot">
                    <span>Quote from deal {quoteFromDealRate}%</span>
                    <span>Approved from sent {approvedFromSentRate}%</span>
                  </div>
                </article>

                <article className="dg-card dg-chart-card">
                  <h2 className="dg-title-sm">Pipeline Stage Mix</h2>
                  <div style={{ width: '100%', height: 280 }}>
                    <ResponsiveContainer>
                      <BarChart data={pipelineData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="stage" />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Bar dataKey="count" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </article>

                <article className="dg-card dg-chart-card">
                  <h2 className="dg-title-sm">Quote Decision Mix</h2>
                  <div style={{ width: '100%', height: 280 }}>
                    <ResponsiveContainer>
                      <BarChart data={quoteOutcomeData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="label" />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Bar dataKey="count" fill="#4f46e5" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="dg-help">Decision rate: {quoteDecisionRate}%</p>
                </article>
              </div>
            </Panel>

            <Panel>
              <div className="dg-grid dg-grid-cols-2 dg-gap-4">
                <article className="dg-card dg-chart-card">
                  <h2 className="dg-title-sm">Momentum (6 Months)</h2>
                  <div style={{ width: '100%', height: 320 }}>
                    <ResponsiveContainer>
                      <AreaChart data={trendData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Legend />
                        <Area type="monotone" dataKey="leads" fill="rgba(37,99,235,0.17)" stroke="#2563eb" strokeWidth={2} />
                        <Area type="monotone" dataKey="quotes" fill="rgba(124,58,237,0.13)" stroke="#7c3aed" strokeWidth={2} />
                        <Line type="monotone" dataKey="deals" stroke="#14b8a6" strokeWidth={2} dot={{ r: 2 }} />
                        <Line type="monotone" dataKey="value" stroke="#ea580c" strokeWidth={2} dot={false} name="Pipeline Value (k AED)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </article>

                <article className="dg-card dg-chart-card">
                  <div className="dg-admin-head">
                    <h2 className="dg-title-sm">Backlog Economics</h2>
                    <span className="dg-badge">Action Queue</span>
                  </div>
                  <div className="dg-ana-exec-grid">
                    <div className="dg-ana-exec-item">
                      <span>Aged Negotiation Value</span>
                      <strong>{money.format(agedNegotiationValue)}</strong>
                      <em className={agedNegotiationValue > 0 ? 'is-down' : 'is-up'}>
                        {agedNegotiations} aged deals
                      </em>
                    </div>
                    <div className="dg-ana-exec-item">
                      <span>Draft Quote Value</span>
                      <strong>{money.format(draftQuoteValue)}</strong>
                      <em className={draftQuoteValue > 0 ? 'is-down' : 'is-up'}>
                        {draftQuotes} draft quotes
                      </em>
                    </div>
                    <div className="dg-ana-exec-item">
                      <span>Decision Throughput</span>
                      <strong>{quoteDecisionRate}%</strong>
                      <em className={quoteDecisionRate >= 60 ? 'is-up' : 'is-down'}>
                        {decidedQuotes}/{totalQuotes} decided
                      </em>
                    </div>
                    {executivePulse.map((item) => (
                      <div key={item.label} className="dg-ana-exec-item">
                        <span>{item.label}</span>
                        <strong>{item.value}</strong>
                        <em className={item.delta >= 0 ? 'is-up' : 'is-down'}>
                          {item.delta >= 0 ? '+' : ''}
                          {item.delta}% vs previous month
                        </em>
                      </div>
                    ))}
                  </div>
                  <div className="dg-ana-action-links">
                    <Link href="/admin/leads" className="ui-btn ui-btn-secondary ui-btn-sm">
                      Resolve Lead Backlog
                    </Link>
                    <Link href="/admin/pipeline" className="ui-btn ui-btn-secondary ui-btn-sm">
                      Resolve Negotiations
                    </Link>
                    <Link href="/admin/quotes" className="ui-btn ui-btn-secondary ui-btn-sm">
                      Resolve Draft Quotes
                    </Link>
                  </div>
                </article>
              </div>
            </Panel>
          </>
        )}
      </PageShell>
    </AdminShell>
  );
}
