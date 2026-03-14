'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import AdminPageHeader from '@/components/admin/common/page-header';
import AdminShell from '@/components/admin/admin-shell';
import {
  FieldGroup,
  FieldHint,
  FieldLabel,
  PageShell,
  Panel,
  TextField,
  Toolbar,
} from '@/components/ui';
import { DealStage, useConvertLeadToDeal, usePipeline, useUpdateDealStage } from '@/features/admin/deals';
import { shortCode } from '@/features/admin/shared/view-format';

const stageOptions: Array<{ label: string; value: DealStage }> = [
  { label: 'New', value: 'new' },
  { label: 'Qualified', value: 'qualified' },
  { label: 'Quoted', value: 'quoted' },
  { label: 'Negotiation', value: 'negotiation' },
  { label: 'Won', value: 'won' },
  { label: 'Lost', value: 'lost' },
];

export default function AdminPipelinePage() {
  const { data, isLoading, isError, error } = usePipeline();
  const updateStageMutation = useUpdateDealStage();
  const convertLeadMutation = useConvertLeadToDeal();

  const [leadId, setLeadId] = useState('');
  const [leadTitle, setLeadTitle] = useState('');
  const [stageDrafts, setStageDrafts] = useState<Record<string, DealStage>>({});

  const totalDeals = useMemo(
    () => data?.stages.reduce((acc, stage) => acc + stage.count, 0) ?? 0,
    [data?.stages]
  );

  return (
    <AdminShell>
      <PageShell density="compact">
        <Panel>
          <AdminPageHeader
            title="Pipeline Board"
            subtitle="Track all opportunities by stage and move deals through your sales process."
            actions={
              <Toolbar>
                <Link href="/admin/deals" className="ui-btn ui-btn-secondary ui-btn-md">
                  Deals
                </Link>
                <Link href="/admin/quotes" className="ui-btn ui-btn-secondary ui-btn-md">
                  Quotes
                </Link>
              </Toolbar>
            }
          />

          <div className="dg-kpi-grid md:grid-cols-3">
            <article className="dg-kpi-card">
              <p className="dg-kpi-label">Total Deals</p>
              <p className="dg-kpi-value">{totalDeals}</p>
              <p className="dg-kpi-meta">Across all pipeline stages</p>
            </article>
            <article className="dg-kpi-card">
              <p className="dg-kpi-label">Open Stages</p>
              <p className="dg-kpi-value">4</p>
              <p className="dg-kpi-meta">New, Qualified, Quoted, Negotiation</p>
            </article>
            <article className="dg-kpi-card">
              <p className="dg-kpi-label">Closed Stages</p>
              <p className="dg-kpi-value">2</p>
              <p className="dg-kpi-meta">Won, Lost</p>
            </article>
          </div>
        </Panel>

        <Panel>
          <h2 className="dg-title-sm">Convert Lead to Deal</h2>
          <p className="dg-muted-sm">
            Convert an existing lead into an opportunity and start tracking it in pipeline.
          </p>

          <div className="dg-form-row">
            <FieldGroup className="dg-col-fill">
              <FieldLabel htmlFor="leadId">Lead ID</FieldLabel>
              <TextField
                id="leadId"
                placeholder="UUID of lead"
                value={leadId}
                onChange={(event) => setLeadId(event.target.value)}
              />
              <FieldHint>Paste an existing lead UUID from the Lead module.</FieldHint>
            </FieldGroup>
            <FieldGroup className="dg-col-fill">
              <FieldLabel htmlFor="leadTitle">Deal Title (optional)</FieldLabel>
              <TextField
                id="leadTitle"
                placeholder="e.g. ACME Corporate Uniform Contract"
                value={leadTitle}
                onChange={(event) => setLeadTitle(event.target.value)}
              />
              <FieldHint>Leave empty to auto-generate a title.</FieldHint>
            </FieldGroup>
            <button
              type="button"
              className="ui-btn ui-btn-primary ui-btn-md"
              disabled={convertLeadMutation.isPending || !leadId.trim()}
              onClick={async () => {
                await convertLeadMutation.mutateAsync({
                  leadId: leadId.trim(),
                  payload: {
                    title: leadTitle.trim() || undefined,
                  },
                });
                setLeadId('');
                setLeadTitle('');
              }}
            >
              {convertLeadMutation.isPending ? 'Converting...' : 'Convert Lead'}
            </button>
          </div>

          {convertLeadMutation.isError && (
            <p className="dg-alert-error">
              {convertLeadMutation.error instanceof Error
                ? convertLeadMutation.error.message
                : 'Failed to convert lead.'}
            </p>
          )}
          {convertLeadMutation.isSuccess && (
            <p className="dg-alert-success">Lead converted successfully.</p>
          )}
        </Panel>

        <Panel>
          <div className="dg-admin-head">
            <h2 className="dg-title-sm">Stage Columns</h2>
            <button
              type="button"
              className="ui-btn ui-btn-secondary ui-btn-md"
              onClick={() => {
                void updateStageMutation.reset();
                void convertLeadMutation.reset();
              }}
            >
              Clear Alerts
            </button>
          </div>

          {isLoading && <p className="dg-muted-sm">Loading pipeline...</p>}

          {isError && (
            <p className="dg-alert-error">
              {error instanceof Error ? error.message : 'Failed to load pipeline.'}
            </p>
          )}

          {!isLoading && !isError && (
          <div className="dg-pipeline-grid">
            {data?.stages.map((stage) => (
              <article key={stage.stageKey} className="dg-card dg-pipeline-column">
                <div className="dg-admin-head">
                  <h3 className="dg-title-sm">
                    {stage.stageLabel}
                  </h3>
                  <span className="dg-badge">
                    {stage.count}
                  </span>
                </div>

                <div className="dg-pipeline-cards">
                  {stage.items.length === 0 && (
                    <p className="dg-muted-sm">
                      No deals in this stage.
                    </p>
                  )}

                  {stage.items.map((deal) => {
                    const selectedStage = stageDrafts[deal.id] || deal.stage;

                    return (
                      <div
                        key={deal.id}
                        className="dg-card dg-summary-card"
                      >
                        <p className="dg-list-title">{deal.title || `#${shortCode(deal.id)}`}</p>
                        <p className="dg-list-meta">
                          {deal.customer_company_name || 'Unknown company'}
                        </p>
                        <p className="dg-list-meta">
                          AED {deal.expected_value} | Probability {deal.probability_pct}%
                        </p>
                        {deal.lead_id && (
                          <p className="dg-help">
                            Lead: {shortCode(deal.lead_id)}
                          </p>
                        )}

                        <div className="grid gap-2">
                          <select
                            className="dg-select dg-select-md"
                            value={selectedStage}
                            onChange={(event) =>
                              setStageDrafts((prev) => ({
                                ...prev,
                                [deal.id]: event.target.value as DealStage,
                              }))
                            }
                          >
                            {stageOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>

                          <button
                            type="button"
                            className="ui-btn ui-btn-secondary ui-btn-md"
                            disabled={updateStageMutation.isPending || selectedStage === deal.stage}
                            onClick={() =>
                              updateStageMutation.mutate({
                                dealId: deal.id,
                                payload: { stage: selectedStage },
                              })
                            }
                          >
                            {updateStageMutation.isPending ? 'Updating...' : 'Move Stage'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </article>
            ))}
          </div>
          )}
        </Panel>
      </PageShell>
    </AdminShell>
  );
}
