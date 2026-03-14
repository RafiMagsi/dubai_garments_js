'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import AdminPageHeader from '@/components/admin/common/page-header';
import AdminShell from '@/components/admin/admin-shell';
import {
  FieldGroup,
  FieldHint,
  FieldLabel,
  PageShell,
  Panel,
  StatusBadge,
  TextField,
  Toolbar,
} from '@/components/ui';
import {
  Deal,
  DealStage,
  PipelineStage,
  PipelineResponse,
  useConvertLeadToDeal,
  usePipeline,
  useUpdateDealStage,
} from '@/features/admin/deals';
import { shortCode, titleCase } from '@/features/admin/shared/view-format';

const stageOptions: Array<{ label: string; value: DealStage }> = [
  { label: 'New', value: 'new' },
  { label: 'Qualified', value: 'qualified' },
  { label: 'Quoted', value: 'quoted' },
  { label: 'Negotiation', value: 'negotiation' },
  { label: 'Won', value: 'won' },
  { label: 'Lost', value: 'lost' },
];

function cloneStages(stages: PipelineStage[]): PipelineStage[] {
  return stages.map((stage) => ({
    ...stage,
    items: [...stage.items],
  }));
}

function moveDealInStages(stages: PipelineStage[], dealId: string, targetStage: DealStage): PipelineStage[] {
  const next = cloneStages(stages);
  let movingDeal: Deal | null = null;
  let sourceStage: DealStage | null = null;

  for (const stage of next) {
    const index = stage.items.findIndex((item) => item.id === dealId);
    if (index >= 0) {
      const [removed] = stage.items.splice(index, 1);
      movingDeal = removed;
      sourceStage = stage.stageKey;
      stage.count = stage.items.length;
      break;
    }
  }

  if (!movingDeal || sourceStage === targetStage) {
    return stages;
  }

  movingDeal = { ...movingDeal, stage: targetStage };
  const target = next.find((stage) => stage.stageKey === targetStage);
  if (!target) return stages;
  target.items.unshift(movingDeal);
  target.count = target.items.length;
  return next;
}

export default function AdminPipelinePage() {
  const { data, isLoading, isError, error } = usePipeline();
  const queryClient = useQueryClient();
  const updateStageMutation = useUpdateDealStage();
  const convertLeadMutation = useConvertLeadToDeal();

  const [leadId, setLeadId] = useState('');
  const [leadTitle, setLeadTitle] = useState('');
  const [stageDrafts, setStageDrafts] = useState<Record<string, DealStage>>({});
  const [draggingDealId, setDraggingDealId] = useState<string | null>(null);
  const [dropStageKey, setDropStageKey] = useState<DealStage | null>(null);
  const [pipelineMessage, setPipelineMessage] = useState('');
  const boardStages = useMemo(() => data?.stages ?? [], [data?.stages]);

  const totalDeals = useMemo(
    () => boardStages.reduce((acc, stage) => acc + stage.count, 0),
    [boardStages]
  );

  async function commitMove(dealId: string, targetStage: DealStage) {
    const currentPipeline = (queryClient.getQueryData(['pipeline']) as PipelineResponse | undefined) ?? {
      stages: boardStages,
    };
    const currentDeal = currentPipeline.stages
      .flatMap((stage) => stage.items)
      .find((item) => item.id === dealId);
    if (!currentDeal || currentDeal.stage === targetStage) return;

    const snapshot = cloneStages(currentPipeline.stages);
    const optimistic = moveDealInStages(currentPipeline.stages, dealId, targetStage);
    queryClient.setQueryData(['pipeline'], { ...currentPipeline, stages: optimistic });

    setPipelineMessage(`Moving #${shortCode(dealId)} to ${targetStage}...`);
    try {
      await updateStageMutation.mutateAsync({
        dealId,
        payload: { stage: targetStage },
      });
      setPipelineMessage(`Moved #${shortCode(dealId)} to ${targetStage}.`);
    } catch (moveError) {
      queryClient.setQueryData(['pipeline'], { ...currentPipeline, stages: snapshot });
      setPipelineMessage(
        moveError instanceof Error ? moveError.message : 'Failed to move deal. Changes reverted.'
      );
    }
  }

  async function handleDropToStage(targetStage: DealStage) {
    const dealId = draggingDealId;
    setDropStageKey(null);
    setDraggingDealId(null);
    if (!dealId) return;
    await commitMove(dealId, targetStage);
  }

  return (
    <AdminShell>
      <PageShell density="compact">
        <Panel>
          <AdminPageHeader
            title="Pipeline Board"
            subtitle="Track opportunities by stage and move deals with drag-and-drop for demo-grade workflow."
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
          <p className="dg-muted-sm">Convert an existing lead into an opportunity and start tracking it in pipeline.</p>

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
                  payload: { title: leadTitle.trim() || undefined },
                });
                await queryClient.invalidateQueries({ queryKey: ['pipeline'] });
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
          {convertLeadMutation.isSuccess && <p className="dg-alert-success">Lead converted successfully.</p>}
        </Panel>

        <Panel>
          <div className="dg-admin-head">
            <h2 className="dg-title-sm">Stage Columns</h2>
            <button
              type="button"
              className="ui-btn ui-btn-secondary ui-btn-md"
              onClick={() => {
                updateStageMutation.reset();
                convertLeadMutation.reset();
                setPipelineMessage('');
              }}
            >
              Clear Alerts
            </button>
          </div>
          <p className="dg-help">
            Drag any deal card into another stage column. The board updates instantly and auto-rolls back if the server rejects.
          </p>
          {pipelineMessage ? (
            <p className={pipelineMessage.toLowerCase().includes('failed') ? 'dg-alert-error' : 'dg-alert-success'}>
              {pipelineMessage}
            </p>
          ) : null}

          {isLoading && <p className="dg-muted-sm">Loading pipeline...</p>}
          {isError && (
            <p className="dg-alert-error">
              {error instanceof Error ? error.message : 'Failed to load pipeline.'}
            </p>
          )}

          {!isLoading && !isError && (
            <div className="dg-pipeline-grid">
              {boardStages.map((stage) => (
                <article
                  key={stage.stageKey}
                  className={`dg-card dg-pipeline-column dg-pipeline-column--${stage.stageKey} ${
                    dropStageKey === stage.stageKey ? 'is-drop-target' : ''
                  }`}
                  onDragOver={(event) => {
                    event.preventDefault();
                    if (dropStageKey !== stage.stageKey) setDropStageKey(stage.stageKey);
                  }}
                  onDragLeave={() => {
                    if (dropStageKey === stage.stageKey) setDropStageKey(null);
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    void handleDropToStage(stage.stageKey);
                  }}
                >
                  <div className="dg-admin-head">
                    <div className="dg-pipeline-stage-head">
                      <span className={`dg-pipeline-stage-chip dg-pipeline-stage-chip--${stage.stageKey}`}>
                        {stage.stageLabel}
                      </span>
                      <span className="dg-pipeline-stage-count">{stage.count}</span>
                    </div>
                  </div>

                  <div className="dg-pipeline-cards">
                    {stage.items.length === 0 && <p className="dg-muted-sm">No deals in this stage.</p>}

                    {stage.items.map((deal) => {
                      const selectedStage = stageDrafts[deal.id] || deal.stage;

                      return (
                        <div
                          key={deal.id}
                          className={`dg-card dg-summary-card dg-pipeline-card ${
                            draggingDealId === deal.id ? 'is-dragging' : ''
                          }`}
                          draggable
                          onDragStart={() => {
                            setDraggingDealId(deal.id);
                            setPipelineMessage(`Dragging #${shortCode(deal.id)}...`);
                          }}
                          onDragEnd={() => {
                            setDraggingDealId(null);
                            setDropStageKey(null);
                          }}
                        >
                          <div className="dg-pipeline-card-meta">
                            <StatusBadge status={deal.stage}>{titleCase(deal.stage)}</StatusBadge>
                            <span className="dg-pipeline-card-id">#{shortCode(deal.id)}</span>
                          </div>
                          <p className="dg-list-title">{deal.title || `Deal ${shortCode(deal.id)}`}</p>
                          <p className="dg-list-meta">{deal.customer_company_name || 'Unknown company'}</p>
                          <p className="dg-list-meta">
                            AED {deal.expected_value} | Probability {deal.probability_pct}%
                          </p>
                          {deal.lead_id && <p className="dg-help">Lead: {shortCode(deal.lead_id)}</p>}

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
                              onClick={() => void commitMove(deal.id, selectedStage)}
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
