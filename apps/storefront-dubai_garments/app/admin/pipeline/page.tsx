'use client';

import Link from 'next/link';
import { useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import AdminPageHeader from '@/components/admin/common/page-header';
import AdminShell from '@/components/admin/admin-shell';
import {
  FieldGroup,
  FieldHint,
  FieldLabel,
  Modal,
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

function stageToneClass(stageKey: DealStage) {
  if (stageKey === 'won' || stageKey === 'lost') return 'is-good';
  if (stageKey === 'quoted') return 'is-info';
  if (stageKey === 'qualified' || stageKey === 'negotiation') return 'is-warn';
  return 'is-neutral';
}

function stagePipelineClass(stageKey: DealStage) {
  if (stageKey === 'new') return 'new';
  if (stageKey === 'qualified') return 'qualified';
  if (stageKey === 'quoted') return 'quoted';
  if (stageKey === 'negotiation') return 'negotiation';
  if (stageKey === 'won') return 'won';
  if (stageKey === 'lost') return 'lost';
  return 'new';
}

function firstInitial(value?: string | null) {
  if (!value) return 'U';
  const trimmed = value.trim();
  if (!trimmed) return 'U';
  return trimmed.charAt(0).toUpperCase();
}

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
  const [convertModalOpen, setConvertModalOpen] = useState(false);
  const [hideEmptyLanes, setHideEmptyLanes] = useState(true);
  const [stageDrafts, setStageDrafts] = useState<Record<string, DealStage>>({});
  const [draggingDealId, setDraggingDealId] = useState<string | null>(null);
  const [dropStageKey, setDropStageKey] = useState<DealStage | null>(null);
  const [pipelineMessage, setPipelineMessage] = useState('');
  const laneRefs = useRef<Partial<Record<DealStage, HTMLElement | null>>>({});
  const boardStages = useMemo(() => data?.stages ?? [], [data?.stages]);

  const totalDeals = useMemo(
    () => boardStages.reduce((acc, stage) => acc + stage.count, 0),
    [boardStages]
  );
  const visibleStages = useMemo(() => {
    if (!hideEmptyLanes) return boardStages;
    const filtered = boardStages.filter((stage) => stage.count > 0);
    return filtered.length > 0 ? filtered : boardStages;
  }, [boardStages, hideEmptyLanes]);
  const openDeals = useMemo(
    () =>
      boardStages
        .filter((stage) => ['new', 'qualified', 'quoted', 'negotiation'].includes(stage.stageKey))
        .reduce((acc, stage) => acc + stage.count, 0),
    [boardStages]
  );
  const closedDeals = useMemo(
    () =>
      boardStages
        .filter((stage) => ['won', 'lost'].includes(stage.stageKey))
        .reduce((acc, stage) => acc + stage.count, 0),
    [boardStages]
  );
  const stageCount = useMemo(() => {
    return {
      new: boardStages.find((stage) => stage.stageKey === 'new')?.count ?? 0,
      qualified: boardStages.find((stage) => stage.stageKey === 'qualified')?.count ?? 0,
      quoted: boardStages.find((stage) => stage.stageKey === 'quoted')?.count ?? 0,
      negotiation: boardStages.find((stage) => stage.stageKey === 'negotiation')?.count ?? 0,
      won: boardStages.find((stage) => stage.stageKey === 'won')?.count ?? 0,
      lost: boardStages.find((stage) => stage.stageKey === 'lost')?.count ?? 0,
    };
  }, [boardStages]);
  const bottleneck = useMemo(() => {
    const ordered: Array<{ key: DealStage; label: string; count: number }> = [
      { key: 'new', label: 'New', count: stageCount.new },
      { key: 'qualified', label: 'Qualified', count: stageCount.qualified },
      { key: 'quoted', label: 'Quoted', count: stageCount.quoted },
      { key: 'negotiation', label: 'Negotiation', count: stageCount.negotiation },
      { key: 'won', label: 'Won', count: stageCount.won },
      { key: 'lost', label: 'Lost', count: stageCount.lost },
    ];
    return ordered.sort((a, b) => b.count - a.count)[0];
  }, [stageCount]);
  const smartFocus = useMemo(() => {
    if (stageCount.new > 0) return 'Prioritize qualification of new deals.';
    if (stageCount.qualified > 0) return 'Convert qualified deals into quotes.';
    if (stageCount.quoted > 0) return 'Move quoted deals into negotiation.';
    if (stageCount.negotiation > 0) return 'Resolve negotiations into won/lost outcomes.';
    return 'Pipeline is clear. Convert new leads into deals.';
  }, [stageCount]);
  const nextBestAction = useMemo<{ label: string; stage: DealStage } | null>(() => {
    if (stageCount.new > 0) return { label: 'Open New Lane', stage: 'new' };
    if (stageCount.qualified > 0) return { label: 'Open Qualified Lane', stage: 'qualified' };
    if (stageCount.quoted > 0) return { label: 'Open Quoted Lane', stage: 'quoted' };
    if (stageCount.negotiation > 0) return { label: 'Open Negotiation Lane', stage: 'negotiation' };
    if (stageCount.won > 0) return { label: 'Open Won Lane', stage: 'won' };
    if (stageCount.lost > 0) return { label: 'Open Lost Lane', stage: 'lost' };
    return null;
  }, [stageCount]);
  const smartTransitionHint = useMemo(() => {
    if (!bottleneck || bottleneck.count <= 0) return 'No urgent transition required.';
    if (bottleneck.key === 'new') return 'Push New -> Qualified.';
    if (bottleneck.key === 'qualified') return 'Push Qualified -> Quoted.';
    if (bottleneck.key === 'quoted') return 'Push Quoted -> Negotiation.';
    if (bottleneck.key === 'negotiation') return 'Push Negotiation -> Won/Lost.';
    if (bottleneck.key === 'won') return 'Won is final. Keep post-sale follow-up clean.';
    return 'Lost is final. Review reasons and improve qualification.';
  }, [bottleneck]);
  const winRate = useMemo(() => {
    const totalClosed = stageCount.won + stageCount.lost;
    if (totalClosed === 0) return null;
    return Math.round((stageCount.won / totalClosed) * 100);
  }, [stageCount]);

  function focusStage(stageKey: DealStage) {
    const lane = laneRefs.current[stageKey];
    if (!lane) return;
    lane.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }

  async function handleConvertLead() {
    try {
      await convertLeadMutation.mutateAsync({
        leadId: leadId.trim(),
        payload: { title: leadTitle.trim() || undefined },
      });
      await queryClient.invalidateQueries({ queryKey: ['pipeline'] });
      setPipelineMessage('Lead converted to deal and added to pipeline.');
      setLeadId('');
      setLeadTitle('');
      setConvertModalOpen(false);
    } catch (error) {
      setPipelineMessage(error instanceof Error ? error.message : 'Failed to convert lead.');
    }
  }

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

  async function refreshPipelineBoard() {
    await queryClient.invalidateQueries({ queryKey: ['pipeline'] });
  }

  return (
    <AdminShell>
      <PageShell density="compact">
        <Panel className="dg-pipeline-top-panel">
          <AdminPageHeader
            title="Pipeline Board"
            actions={
              <Toolbar>
                <button
                  type="button"
                  className="ui-btn ui-btn-primary ui-btn-sm"
                  onClick={() => {
                    setConvertModalOpen(true);
                    convertLeadMutation.reset();
                  }}
                >
                  Convert Lead
                </button>
                <button
                  type="button"
                  className="ui-btn ui-btn-secondary ui-btn-sm"
                  onClick={() => void refreshPipelineBoard()}
                >
                  Refresh
                </button>
                <Link href="/admin/deals" className="ui-btn ui-btn-secondary ui-btn-sm">
                  Deals
                </Link>
                <Link href="/admin/quotes" className="ui-btn ui-btn-secondary ui-btn-sm">
                  Quotes
                </Link>
              </Toolbar>
            }
          />

          <div className="asgn-pipe-kpi-rail">
            <span className="asgn-pipe-kpi-chip">Total Deals: {totalDeals}</span>
            <span className="asgn-pipe-kpi-chip">Open: {openDeals}</span>
            <span className="asgn-pipe-kpi-chip">Closed: {closedDeals}</span>
            <span className="asgn-pipe-kpi-chip">
              Bottleneck: {bottleneck?.label ?? 'N/A'} ({bottleneck?.count ?? 0})
            </span>
            <span className="asgn-pipe-kpi-chip">
              Win Rate: {winRate === null ? '—' : `${winRate}%`}
            </span>
            <span className="asgn-pipe-kpi-chip">Visible Lanes: {visibleStages.length}/{boardStages.length}</span>
            <span className="asgn-pipe-kpi-chip">Smart: {smartFocus}</span>
            <span className="asgn-pipe-kpi-chip">Transition: {smartTransitionHint}</span>
          </div>
        </Panel>

        <Panel>
          <div className="asgn-pipe-head asgn-pipe-head--manager">
            <div>
              <h2 className="dg-title-sm">Stage Board</h2>
              <p className="dg-help">Scroll horizontally to move across all stages.</p>
            </div>
            <div className="asgn-actions">
              {bottleneck ? (
                <button
                  type="button"
                  className="ui-btn ui-btn-secondary ui-btn-sm"
                  onClick={() => focusStage(bottleneck.key)}
                >
                  Focus Bottleneck
                </button>
              ) : null}
              {nextBestAction ? (
                <button
                  type="button"
                  className="ui-btn ui-btn-secondary ui-btn-sm"
                  onClick={() => focusStage(nextBestAction.stage)}
                >
                  {nextBestAction.label}
                </button>
              ) : null}
              <button
                type="button"
                className="ui-btn ui-btn-secondary ui-btn-sm"
                onClick={() => setHideEmptyLanes((prev) => !prev)}
              >
                {hideEmptyLanes ? 'Show Empty Lanes' : 'Hide Empty Lanes'}
              </button>
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
          </div>
          <p className="dg-help">Drag cards or use stage selector. Moves auto-rollback on API failure.</p>
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
            <div className="sales-agents-workspace--structured dg-pipeline-page">
              <div className="dg-card asgn-pipe-card asgn-pipe-card--manager">
                <div className="asgn-pipe-grid asgn-pipe-grid-twenty asgn-pipe-grid-main">
                  <div className="asgn-pipe-col asgn-pipe-center">
                    <p className="asgn-pipe-col-title">Stages</p>
                    <div className="asgn-pipe-lanes">
                      {visibleStages.map((stage) => (
                        <article
                          key={stage.stageKey}
                          ref={(element) => {
                            laneRefs.current[stage.stageKey] = element;
                          }}
                          className={`asgn-pipe-lane ${stageToneClass(stage.stageKey)} dg-pipeline-column--${stagePipelineClass(stage.stageKey)} ${
                            dropStageKey === stage.stageKey ? 'is-drop-target'
                            : ''
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
                          <div className="asgn-pipe-lane-head">
                            <div className="dg-pipeline-stage-head">
                              <span className={`dg-pipeline-stage-chip dg-pipeline-stage-chip--${stage.stageKey}`}>
                                {stage.stageLabel}
                              </span>
                              <span className="dg-pipeline-stage-count">{stage.count}</span>
                            </div>
                          </div>

                          <div className="asgn-pipe-item-list">
                            {stage.items.length === 0 ? (
                              <div className="asgn-pipe-empty-state" role="status" aria-live="polite">
                                <p className="asgn-pipe-empty-title">No items</p>
                                <p className="asgn-pipe-empty-note">No assigned leads or deals in this stage.</p>
                              </div>
                            ) : null}

                            {stage.items.map((deal) => {
                              const selectedStage = stageDrafts[deal.id] || deal.stage;
                              const expectedValueNumber = Number(deal.expected_value);
                              const expectedValueLabel = Number.isFinite(expectedValueNumber)
                                ? `AED ${expectedValueNumber.toLocaleString()}`
                                : 'AED -';
                              const probabilityNumber = Number(deal.probability_pct);
                              const probabilityLabel = Number.isFinite(probabilityNumber)
                                ? `${probabilityNumber}%`
                                : '-';
                              const probabilityPercent = Number.isFinite(probabilityNumber)
                                ? Math.max(0, Math.min(100, probabilityNumber))
                                : 0;
                              const probabilityTone = !Number.isFinite(probabilityNumber) ? 'is-neutral'
                                : probabilityNumber >= 70 ? 'is-high'
                                : probabilityNumber >= 40 ? 'is-medium'
                                : 'is-low';

                              return (
                                <div
                                  key={deal.id}
                                  className={`asgn-pipe-item dg-pipeline-card dg-pipeline-card-modern dg-pipeline-card--${deal.stage} ${
                                    draggingDealId === deal.id ? 'is-dragging'
                                    : ''
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
                                    <div className="dg-pipeline-card-meta-left">
                                      <span className="asgn-pipe-item-grip" aria-hidden="true">
                                        ...
                                      </span>
                                      <StatusBadge status={deal.stage}>{titleCase(deal.stage)}</StatusBadge>
                                      <span className="asgn-pipe-item-type">Deal</span>
                                    </div>
                                    <span className="dg-pipeline-card-id">#{shortCode(deal.id)}</span>
                                  </div>
                                  <div className="asgn-pipe-item-heading">
                                    <p className="asgn-pipe-item-title">{deal.title || `Deal ${shortCode(deal.id)}`}</p>
                                    <div className="asgn-pipe-item-subline">
                                      <span className="asgn-pipe-item-owner-avatar" aria-hidden="true">
                                        {firstInitial(deal.customer_company_name || deal.title)}
                                      </span>
                                      <p className="asgn-pipe-item-company">
                                        {deal.customer_company_name || 'Unknown company'}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="asgn-pipe-item-stats" aria-label="Deal metrics">
                                    <div className="asgn-pipe-item-stat asgn-pipe-item-stat--value">
                                      <span>Value</span>
                                      <strong>{expectedValueLabel}</strong>
                                    </div>
                                    <div className={`asgn-pipe-item-stat asgn-pipe-item-stat--probability ${probabilityTone}`}>
                                      <span>Probability</span>
                                      <strong>{probabilityLabel}</strong>
                                      <div className="asgn-pipe-item-meter" aria-hidden="true">
                                        <span style={{ width: `${probabilityPercent}%` }} />
                                      </div>
                                    </div>
                                  </div>
                                  <div className="dg-pipeline-card-actions">
                                    <select
                                      className="dg-select dg-select-md asgn-pipe-item-stage-select"
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
                                      className="ui-btn ui-btn-primary ui-btn-sm asgn-pipe-item-move-btn"
                                      disabled={updateStageMutation.isPending || selectedStage === deal.stage}
                                      onClick={() => void commitMove(deal.id, selectedStage)}
                                    >
                                      {updateStageMutation.isPending ? 'Updating...' : 'Move'}
                                    </button>
                                  </div>
                                  {deal.lead_id ? (
                                    <div className="dg-pipeline-card-footer">
                                      <Link
                                        href={`/admin/leads/${deal.lead_id}`}
                                        className="ui-btn ui-btn-secondary ui-btn-sm asgn-pipe-item-open-lead"
                                      >
                                        Open Lead {shortCode(deal.lead_id)}
                                      </Link>
                                    </div>
                                  ) : null}
                                </div>
                              );
                            })}
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </Panel>
      </PageShell>

      <Modal
        open={convertModalOpen}
        onClose={() => {
          if (convertLeadMutation.isPending) return;
          setConvertModalOpen(false);
          convertLeadMutation.reset();
        }}
      >
        <div className="dg-card p-5 sm:p-6">
          <div className="dg-admin-head">
            <h2 className="dg-title-sm">Convert Lead to Deal</h2>
            <span className="dg-badge">Pipeline Intake</span>
          </div>
          <p className="dg-help mt-2 mb-4">Create a new deal from an existing lead without leaving pipeline.</p>

          <div className="dg-config-form">
            <div className="dg-config-grid">
              <FieldGroup className="dg-col-fill">
                <FieldLabel htmlFor="pipeline-convert-lead-id">Lead ID</FieldLabel>
                <TextField
                  id="pipeline-convert-lead-id"
                  placeholder="UUID of lead"
                  value={leadId}
                  onChange={(event) => setLeadId(event.target.value)}
                />
                <FieldHint>Paste an existing lead UUID from Leads.</FieldHint>
              </FieldGroup>
              <FieldGroup className="dg-col-fill">
                <FieldLabel htmlFor="pipeline-convert-lead-title">Deal Title (optional)</FieldLabel>
                <TextField
                  id="pipeline-convert-lead-title"
                  placeholder="e.g. ACME Corporate Uniform Contract"
                  value={leadTitle}
                  onChange={(event) => setLeadTitle(event.target.value)}
                />
                <FieldHint>Leave empty to auto-generate from lead context.</FieldHint>
              </FieldGroup>
            </div>

            {convertLeadMutation.isError ? (
              <p className="dg-alert-error">
                {convertLeadMutation.error instanceof Error
                  ? convertLeadMutation.error.message
                  : 'Failed to convert lead.'}
              </p>
            ) : null}
            {convertLeadMutation.isSuccess ? <p className="dg-alert-success">Lead converted successfully.</p> : null}

            <div className="dg-form-row mt-4 pt-2 border-t border-[var(--color-border)]">
              <button
                type="button"
                className="ui-btn ui-btn-primary ui-btn-md"
                disabled={convertLeadMutation.isPending || !leadId.trim()}
                onClick={() => void handleConvertLead()}
              >
                {convertLeadMutation.isPending ? 'Converting...' : 'Convert Lead'}
              </button>
              <button
                type="button"
                className="ui-btn ui-btn-secondary ui-btn-md"
                onClick={() => {
                  if (convertLeadMutation.isPending) return;
                  setConvertModalOpen(false);
                  convertLeadMutation.reset();
                }}
                disabled={convertLeadMutation.isPending}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </AdminShell>
  );
}
