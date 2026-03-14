'use client';

import Link from 'next/link';
import { FormEvent, useMemo, useState } from 'react';
import AdminPageHeader from '@/components/admin/common/page-header';
import AdminShell from '@/components/admin/admin-shell';
import { PageShell, Panel, StatusBadge, Toolbar } from '@/components/ui';
import { DealStage, useDeals, usePipeline } from '@/features/admin/deals';
import {
  formatDateTime,
  shortCode,
  titleCase,
} from '@/features/admin/shared/view-format';

const stageOptions: Array<{ label: string; value: DealStage | 'all' }> = [
  { label: 'All Stages', value: 'all' },
  { label: 'New', value: 'new' },
  { label: 'Qualified', value: 'qualified' },
  { label: 'Quoted', value: 'quoted' },
  { label: 'Negotiation', value: 'negotiation' },
  { label: 'Won', value: 'won' },
  { label: 'Lost', value: 'lost' },
];

export default function AdminDealsPage() {
  const [searchInput, setSearchInput] = useState('');
  const [stageInput, setStageInput] = useState<DealStage | 'all'>('all');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [appliedStage, setAppliedStage] = useState<DealStage | 'all'>('all');

  const filters = useMemo(
    () => ({
      search: appliedSearch || undefined,
      stage: appliedStage === 'all' ? undefined : appliedStage,
    }),
    [appliedSearch, appliedStage]
  );

  const dealsQuery = useDeals(filters);
  const pipelineQuery = usePipeline();

  const deals = dealsQuery.data?.items ?? [];
  const pipelineStages = pipelineQuery.data?.stages ?? [];

  function handleApply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAppliedSearch(searchInput.trim());
    setAppliedStage(stageInput);
  }

  return (
    <AdminShell>
      <PageShell density="compact">
        <Panel>
          <AdminPageHeader
            title="Deal Pipeline"
            subtitle="Manage deal progression from qualification to won/lost outcomes."
            actions={
              <Toolbar>
                <Link href="/admin/dashboard" className="ui-btn ui-btn-secondary ui-btn-md">
                  Dashboard
                </Link>
                <Link href="/admin/quotes" className="ui-btn ui-btn-secondary ui-btn-md">
                  Quotes
                </Link>
              </Toolbar>
            }
          />

          <form onSubmit={handleApply} className="dg-form-row">
            <div className="dg-field dg-col-fill">
              <label className="dg-label" htmlFor="deals-search">Search</label>
              <input
                id="deals-search"
                name="search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search by lead, company, product, tracking code..."
                className="dg-input"
              />
              <p className="dg-help">Search by lead, account, or product signal.</p>
            </div>
            <div className="dg-field">
              <label className="dg-label" htmlFor="deals-stage">Stage</label>
              <select
                id="deals-stage"
                name="stage"
                className="dg-select dg-select-md"
                value={stageInput}
                onChange={(event) => setStageInput(event.target.value as DealStage | 'all')}
              >
                {stageOptions.map((stage) => (
                  <option key={stage.value} value={stage.value}>
                    {stage.label}
                  </option>
                ))}
              </select>
              <p className="dg-help">Focus on one stage or review all pipeline stages.</p>
            </div>
            <button type="submit" className="ui-btn ui-btn-primary ui-btn-md">
              Apply
            </button>
          </form>
        </Panel>

        <Panel>
          <div className="dg-pipeline-grid">
          {pipelineStages.map((stage) => (
            <article key={stage.stageKey} className="dg-card dg-pipeline-column">
              <div className="dg-admin-head">
                <h2 className="dg-title-sm">{stage.stageLabel}</h2>
                <span className="dg-badge">{stage.count}</span>
              </div>
              <div className="dg-pipeline-cards">
                {stage.items.length > 0 ? (
                  stage.items.map((deal) => (
                    <article key={deal.id} className="dg-card dg-summary-card">
                      <p className="dg-muted-sm">
                        <strong>#{shortCode(deal.id)}</strong>{' '}
                        {deal.lead_contact_name || '-'}
                      </p>
                      <p className="dg-muted-sm">{deal.lead_product_name || '-'}</p>
                      <p className="dg-muted-sm">
                        Value: AED {Number(deal.expected_value || 0).toFixed(2)}
                      </p>
                      <Link href={`/admin/deals/${deal.id}`} className="ui-btn ui-btn-secondary ui-btn-md">
                        Open
                      </Link>
                    </article>
                  ))
                ) : (
                  <p className="dg-muted-sm">No deals in this stage.</p>
                )}
              </div>
            </article>
          ))}
          </div>
        </Panel>

        <Panel>
          <div className="dg-admin-head">
            <h2 className="dg-title-sm">All Deals</h2>
            <span className="dg-badge">{deals.length} Total</span>
          </div>

          {dealsQuery.isLoading && <p className="dg-muted-sm">Loading deals...</p>}
          {dealsQuery.isError && (
            <p className="dg-alert-error">
              {dealsQuery.error instanceof Error ? dealsQuery.error.message : 'Failed to load deals.'}
            </p>
          )}

          {!dealsQuery.isLoading && !dealsQuery.isError && (
            <div className="ui-table-wrap">
              <table className="ui-table ui-table-density-compact">
                <thead>
                  <tr>
                    <th>Deal</th>
                    <th>Lead</th>
                    <th>Stage</th>
                    <th>Priority</th>
                    <th>Value</th>
                    <th>Assigned</th>
                    <th>Updated</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {deals.length > 0 ? (
                    deals.map((deal) => {
                      const priority =
                        deal.probability_pct >= 70
                          ? 'high'
                          : deal.probability_pct <= 35
                            ? 'low'
                            : 'medium';
                      return (
                        <tr key={deal.id}>
                          <td>#{shortCode(deal.id)}</td>
                          <td>{deal.lead_contact_name || '-'}</td>
                          <td>
                            <StatusBadge status={deal.stage}>
                              {titleCase(deal.stage)}
                            </StatusBadge>
                          </td>
                          <td>{priority}</td>
                          <td>AED {Number(deal.expected_value || 0).toFixed(2)}</td>
                          <td>{deal.owner_user_id ? deal.owner_user_id.slice(0, 6) : '-'}</td>
                          <td>{formatDateTime(deal.updated_at)}</td>
                          <td>
                            <Link href={`/admin/deals/${deal.id}`} className="ui-btn ui-btn-secondary ui-btn-md">
                              View
                            </Link>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={8}>No deals found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </PageShell>
    </AdminShell>
  );
}
