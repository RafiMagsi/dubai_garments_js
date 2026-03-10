'use client';

import { useMemo, useState } from 'react';
import AdminShell from '@/components/admin/admin-shell';
import { Button, Card, FieldLabel, TextField } from '@/components/ui';
import { DealStage, useConvertLeadToDeal, usePipeline, useUpdateDealStage } from '@/features/admin/deals';

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
      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-ink-500)]">Total Deals</p>
          <p className="mt-2 text-3xl font-bold text-[var(--color-text)]">{totalDeals}</p>
        </Card>
        <Card>
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-ink-500)]">Open Stages</p>
          <p className="mt-2 text-3xl font-bold text-[var(--color-text)]">4</p>
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">New, Qualified, Quoted, Negotiation</p>
        </Card>
        <Card>
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-ink-500)]">Closed Stages</p>
          <p className="mt-2 text-3xl font-bold text-[var(--color-text)]">2</p>
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">Won, Lost</p>
        </Card>
      </section>

      <section>
        <Card className="space-y-4">
          <h2 className="text-lg font-semibold text-[var(--color-text)]">Convert Lead to Deal</h2>
          <p className="text-sm text-[var(--color-text-muted)]">
            Convert an existing lead into an opportunity and start tracking it in pipeline.
          </p>

          <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
            <div>
              <FieldLabel htmlFor="leadId">Lead ID</FieldLabel>
              <TextField
                id="leadId"
                placeholder="UUID of lead"
                value={leadId}
                onChange={(event) => setLeadId(event.target.value)}
              />
            </div>
            <div>
              <FieldLabel htmlFor="leadTitle">Deal Title (optional)</FieldLabel>
              <TextField
                id="leadTitle"
                placeholder="e.g. ACME Corporate Uniform Contract"
                value={leadTitle}
                onChange={(event) => setLeadTitle(event.target.value)}
              />
            </div>
            <Button
              type="button"
              size="md"
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
            </Button>
          </div>

          {convertLeadMutation.isError && (
            <p className="text-sm text-[var(--color-danger-text)]">
              {convertLeadMutation.error instanceof Error
                ? convertLeadMutation.error.message
                : 'Failed to convert lead.'}
            </p>
          )}
          {convertLeadMutation.isSuccess && (
            <p className="text-sm text-[var(--color-success-text)]">Lead converted successfully.</p>
          )}
        </Card>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-[var(--color-text)]">Pipeline Board</h2>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => {
              void updateStageMutation.reset();
              void convertLeadMutation.reset();
            }}
          >
            Clear Alerts
          </Button>
        </div>

        {isLoading && (
          <Card>
            <p className="text-sm text-[var(--color-text-muted)]">Loading pipeline...</p>
          </Card>
        )}

        {isError && (
          <Card>
            <p className="text-sm text-[var(--color-danger-text)]">
              {error instanceof Error ? error.message : 'Failed to load pipeline.'}
            </p>
          </Card>
        )}

        {!isLoading && !isError && (
          <div className="grid gap-4 xl:grid-cols-3 2xl:grid-cols-6">
            {data?.stages.map((stage) => (
              <Card key={stage.stageKey} className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.06em] text-[var(--color-ink-500)]">
                    {stage.stageLabel}
                  </h3>
                  <span className="rounded-full border border-[var(--color-border)] bg-white px-2 py-1 text-xs font-semibold text-[var(--color-text-muted)]">
                    {stage.count}
                  </span>
                </div>

                <div className="grid gap-3">
                  {stage.items.length === 0 && (
                    <p className="rounded-[var(--radius-sm)] border border-dashed border-[var(--color-border)] px-3 py-3 text-sm text-[var(--color-text-muted)]">
                      No deals in this stage.
                    </p>
                  )}

                  {stage.items.map((deal) => {
                    const selectedStage = stageDrafts[deal.id] || deal.stage;

                    return (
                      <div
                        key={deal.id}
                        className="rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-white p-3"
                      >
                        <p className="text-sm font-semibold text-[var(--color-text)]">{deal.title}</p>
                        <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                          {deal.customer_company_name || 'Unknown company'}
                        </p>
                        <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                          AED {deal.expected_value} | Probability {deal.probability_pct}%
                        </p>
                        {deal.lead_id && (
                          <p className="mt-1 break-all text-[11px] text-[var(--color-ink-500)]">
                            Lead: {deal.lead_id}
                          </p>
                        )}

                        <div className="mt-3 grid gap-2">
                          <select
                            className="ui-field"
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

                          <Button
                            type="button"
                            size="sm"
                            disabled={updateStageMutation.isPending || selectedStage === deal.stage}
                            onClick={() =>
                              updateStageMutation.mutate({
                                dealId: deal.id,
                                payload: { stage: selectedStage },
                              })
                            }
                          >
                            {updateStageMutation.isPending ? 'Updating...' : 'Move Stage'}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </AdminShell>
  );
}
