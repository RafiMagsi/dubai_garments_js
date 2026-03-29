'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Card, CardTitle, SelectField, TextField } from '@/components/ui';
import { getAgentPipelineBoard, runAssignmentOperation } from '@/features/admin/ai-sales-agent/api';
import type {
  AgentWorkloadItem,
  AgentPipelineBoardEnvelope,
  AgentPipelineBoardItem,
  AssignmentOperationsEnvelope,
} from '@/features/admin/ai-sales-agent/types';
import { AisFieldLabel } from '@/components/admin/ai-sales-agent/reusable';

type PipelineFilters = {
  team: string;
  stage: string;
  urgency: string;
  inactiveDays: string;
  ownerUserId: string;
};

const DEFAULT_FILTERS: PipelineFilters = {
  team: 'all',
  stage: 'all',
  urgency: 'all',
  inactiveDays: '0',
  ownerUserId: '',
};

const LEAD_STAGE_KEYS = ['lead_new', 'triaged', 'qualified', 'reply_sent'];
const DEAL_STAGE_KEYS = ['deal_open', 'negotiation', 'won_lost', 'post_outcome'];
const QUOTE_STAGE_KEYS = ['quote_ready', 'quote_sent'];

function stageToneClass(stageKey: string) {
  if (['won_lost', 'post_outcome'].includes(stageKey)) return 'is-good';
  if (['reply_sent', 'quote_ready', 'quote_sent'].includes(stageKey)) return 'is-info';
  if (['deal_open', 'negotiation'].includes(stageKey)) return 'is-warn';
  return 'is-neutral';
}

function stagePipelineClass(stageKey: string) {
  if (['lead_new', 'triaged'].includes(stageKey)) return 'new';
  if (['qualified'].includes(stageKey)) return 'qualified';
  if (['reply_sent', 'quote_ready', 'quote_sent'].includes(stageKey)) return 'quoted';
  if (['deal_open', 'negotiation'].includes(stageKey)) return 'negotiation';
  if (['won_lost', 'post_outcome'].includes(stageKey)) return 'won';
  return 'new';
}

function alertToneClass(severity: 'warning' | 'critical' | 'info') {
  if (severity === 'critical') return 'is-critical';
  if (severity === 'warning') return 'is-warning';
  return 'is-info';
}

type SuggestionTone = 'is-good' | 'is-warning' | 'is-critical' | 'is-info';

function suggestionToneClass(suggestion: {
  id: string;
  title: string;
  detail: string;
  stage: string | null;
  limit: number | null;
}): SuggestionTone {
  const id = suggestion.id.toLowerCase();
  const title = suggestion.title.toLowerCase();
  const detail = suggestion.detail.toLowerCase();

  if (id === 'balanced' || title.includes('balanced')) return 'is-good';
  if (id.includes('load-rebalance') || title.includes('redistribute') || title.includes('rebalance')) {
    return 'is-warning';
  }
  if (title.includes('high sla') || detail.includes('urgent') || detail.includes('overloaded')) {
    return 'is-critical';
  }
  if (id.includes('empty') || suggestion.stage) return 'is-info';
  return 'is-info';
}

function toneLabel(tone: SuggestionTone | 'is-warning' | 'is-critical' | 'is-info') {
  if (tone === 'is-critical') return 'Critical';
  if (tone === 'is-warning') return 'Warning';
  if (tone === 'is-good') return 'Good';
  return 'Info';
}

function toInt(input: string) {
  const parsed = Number(input);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.floor(parsed));
}

function isUuidLike(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function prettyRole(role: string) {
  return role
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function stageCount(agent: AgentWorkloadItem, stageKeys: string[]) {
  const keySet = new Set(stageKeys);
  return agent.stageDistribution.reduce((sum, stage) => {
    if (!keySet.has(stage.stage)) return sum;
    return sum + stage.count;
  }, 0);
}

function isDisplayAgent(agent: { userId: string; fullName: string }) {
  if (!isUuidLike(agent.userId)) return false;
  if (/unassigned/i.test(agent.fullName)) return false;
  return true;
}

type AgentEntityLane = {
  key: 'lead' | 'deal' | 'quote';
  label: string;
  pipelineTone: 'new' | 'negotiation' | 'quoted';
  total: number;
  items: Array<{
    agent: AgentWorkloadItem & {
      team: string;
      itemCount: number;
      highUrgencyCount: number;
      maxInactiveDays: number;
    };
    count: number;
    progression: Array<{
      label: string;
      value: number;
    }>;
  }>;
};

type AgentPipelineBoardMode = 'all' | 'manager' | 'agents';

type AgentPipelineBoardProps = {
  mode?: AgentPipelineBoardMode;
};

export default function AgentPipelineBoard({ mode = 'all' }: AgentPipelineBoardProps) {
  const [loading, setLoading] = useState(false);
  const [opLoading, setOpLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [opError, setOpError] = useState<string | null>(null);
  const [opSuccess, setOpSuccess] = useState<string | null>(null);

  const [data, setData] = useState<AgentPipelineBoardEnvelope | null>(null);
  const [filters, setFilters] = useState<PipelineFilters>(DEFAULT_FILTERS);

  const [selectedItem, setSelectedItem] = useState<AgentPipelineBoardItem | null>(null);
  const [targetUserId, setTargetUserId] = useState('');
  const [bulkLimit, setBulkLimit] = useState('12');
  const [lockCustomerId, setLockCustomerId] = useState('');
  const [lockOwnerUserId, setLockOwnerUserId] = useState('');
  const [operationResult, setOperationResult] = useState<AssignmentOperationsEnvelope | null>(null);

  const [focusedAgentUserId, setFocusedAgentUserId] = useState('');
  const stageLanesRef = useRef<HTMLDivElement | null>(null);
  const agentsBoardRef = useRef<HTMLDivElement | null>(null);

  const showManagerBoard = mode === 'all' || mode === 'manager';
  const showAgentsBoard = mode === 'all' || mode === 'agents';

  async function load(nextFilters?: PipelineFilters) {
    try {
      setLoading(true);
      setError(null);

      const selected = nextFilters ?? filters;
      const result = await getAgentPipelineBoard({
        team: selected.team,
        stage: selected.stage,
        urgency: selected.urgency,
        inactiveDays: toInt(selected.inactiveDays),
        ownerUserId: selected.ownerUserId || undefined,
      });

      setData(result);

      if (selectedItem) {
        const exists = result.center.stages.some((lane) =>
          lane.items.some((item) => item.itemId === selectedItem.itemId && item.itemType === selectedItem.itemType)
        );
        if (!exists) {
          setSelectedItem(null);
          setTargetUserId('');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load agent pipeline board.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load(DEFAULT_FILTERS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const options = useMemo(() => {
    if (!data) {
      return {
        teams: ['all'],
        stages: ['all'],
        urgencies: ['all'],
        owners: [] as Array<{ userId: string; fullName: string }>,
      };
    }
    return data.filterOptions;
  }, [data]);

  const assignableOwners = useMemo(
    () => options.owners.filter((owner) => isUuidLike(owner.userId)),
    [options.owners]
  );

  const selectedSummary = useMemo(() => {
    if (!data) {
      return { lanes: 0, cards: 0, alerts: 0 };
    }
    const cards = data.center.stages.reduce((sum, lane) => sum + lane.total, 0);
    return {
      lanes: data.center.stages.filter((lane) => lane.total > 0).length,
      cards,
      alerts: data.right.alerts.length,
    };
  }, [data]);

  const visibleAgents = useMemo(() => {
    return (data?.left.agents ?? []).filter(isDisplayAgent);
  }, [data]);

  const focusedAgent = useMemo(
    () => visibleAgents.find((agent) => agent.userId === focusedAgentUserId) ?? null,
    [visibleAgents, focusedAgentUserId]
  );

  const boardAgents = useMemo(
    () => (focusedAgent ? [focusedAgent] : visibleAgents),
    [focusedAgent, visibleAgents]
  );

  useEffect(() => {
    if (!focusedAgentUserId) return;
    const exists = visibleAgents.some((agent) => agent.userId === focusedAgentUserId);
    if (!exists) {
      setFocusedAgentUserId('');
    }
  }, [focusedAgentUserId, visibleAgents]);

  const agentEntityLanes = useMemo<AgentEntityLane[]>(() => {
    const agents = boardAgents;

    const leadsLaneItems = agents
      .map((agent) => ({
        agent,
        count: Math.max(agent.activeLeads, stageCount(agent, LEAD_STAGE_KEYS)),
        progression: [
          { label: 'Triaged', value: stageCount(agent, ['triaged']) },
          { label: 'Qualified', value: stageCount(agent, ['qualified']) },
        ],
      }))
      .filter((item) => item.count > 0)
      .sort((a, b) => b.count - a.count);

    const dealsLaneItems = agents
      .map((agent) => ({
        agent,
        count: Math.max(agent.activeDeals, stageCount(agent, DEAL_STAGE_KEYS)),
        progression: [
          { label: 'Negotiation', value: stageCount(agent, ['negotiation']) },
          { label: 'Outcomes', value: stageCount(agent, ['won_lost']) },
        ],
      }))
      .filter((item) => item.count > 0)
      .sort((a, b) => b.count - a.count);

    const quotesLaneItems = agents
      .map((agent) => ({
        agent,
        count: stageCount(agent, QUOTE_STAGE_KEYS),
        progression: [
          { label: 'Ready', value: stageCount(agent, ['quote_ready']) },
          { label: 'Sent', value: stageCount(agent, ['quote_sent']) },
        ],
      }))
      .filter((item) => item.count > 0)
      .sort((a, b) => b.count - a.count);

    return [
      {
        key: 'lead',
        label: 'Leads',
        pipelineTone: 'new',
        total: leadsLaneItems.reduce((sum, item) => sum + item.count, 0),
        items: leadsLaneItems,
      },
      {
        key: 'deal',
        label: 'Deals',
        pipelineTone: 'negotiation',
        total: dealsLaneItems.reduce((sum, item) => sum + item.count, 0),
        items: dealsLaneItems,
      },
      {
        key: 'quote',
        label: 'Quotes',
        pipelineTone: 'quoted',
        total: quotesLaneItems.reduce((sum, item) => sum + item.count, 0),
        items: quotesLaneItems,
      },
    ];
  }, [boardAgents]);

  const visibleAlerts = useMemo(() => data?.right.alerts ?? [], [data]);
  const visibleSuggestions = useMemo(() => data?.right.rebalanceSuggestions ?? [], [data]);

  const selectedRecordHref = useMemo(() => {
    if (!selectedItem) return null;
    return selectedItem.itemType === 'lead'
      ? `/admin/leads/${selectedItem.itemId}`
      : `/admin/deals/${selectedItem.itemId}`;
  }, [selectedItem]);

  const selectedRecordLinkLabel = selectedItem?.itemType === 'lead' ? 'Open Lead' : 'Open Deal';

  async function runOperation(payload: Parameters<typeof runAssignmentOperation>[0], successMessage?: string) {
    try {
      setOpLoading(true);
      setOpError(null);
      setOpSuccess(null);

      const result = await runAssignmentOperation(payload);
      setOperationResult(result);
      setOpSuccess(successMessage ?? result.summary);
      await load();
    } catch (err) {
      setOpError(err instanceof Error ? err.message : 'Failed to run assignment operation.');
    } finally {
      setOpLoading(false);
    }
  }

  useEffect(() => {
    function bindHorizontalWheelGuard(container: HTMLDivElement | null) {
      if (!container) return () => {};

      function onWheel(event: WheelEvent) {
        if (Math.abs(event.deltaX) < 0.5) return;
        event.preventDefault();
        event.stopPropagation();
        container.scrollLeft += event.deltaX;
      }

      container.addEventListener('wheel', onWheel, { passive: false });
      return () => container.removeEventListener('wheel', onWheel);
    }

    const unbindStageLanes = bindHorizontalWheelGuard(stageLanesRef.current);
    const unbindAgentBoard = bindHorizontalWheelGuard(agentsBoardRef.current);

    return () => {
      unbindStageLanes();
      unbindAgentBoard();
    };
  }, [showManagerBoard, showAgentsBoard, data?.center.stages.length, agentEntityLanes.length]);

  return (
    <div className="asgn-pipe-stack">
      {showManagerBoard ? (
        <Card className="asgn-pipe-card asgn-pipe-card--manager">
          <div className="asgn-pipe-head asgn-pipe-head--manager">
            <div>
              <CardTitle>Manager Board: Stages, Alerts, and Rebalance Actions</CardTitle>
            </div>
            <div className="asgn-pipe-kpi-rail asgn-pipe-kpi-rail--agents asgn-pipe-kpi-rail--minimal">
              <span className="asgn-pipe-kpi-chip">Items: {selectedSummary.cards}</span>
              <span className="asgn-pipe-kpi-chip">Alerts: {selectedSummary.alerts}</span>
              <Button type="button" size="sm" variant="secondary" onClick={() => void load()} disabled={loading}>
                {loading ? 'Refreshing...' : 'Refresh'}
              </Button>
            </div>
          </div>

          <details className="asgn-pipe-filter-panel" open>
            <summary>Queue Filters</summary>
            <div className="asgn-pipe-filters asgn-pipe-filters--manager">
              <div>
                <AisFieldLabel>Team</AisFieldLabel>
                <SelectField
                  className="dg-mt-1"
                  value={filters.team}
                  onChange={(event) => setFilters((prev) => ({ ...prev, team: event.target.value }))}
                >
                  {options.teams.map((team) => (
                    <option key={`team-${team}`} value={team}>
                      {team === 'all' ? 'All Teams' : team}
                    </option>
                  ))}
                </SelectField>
              </div>

              <div>
                <AisFieldLabel>Stage</AisFieldLabel>
                <SelectField
                  className="dg-mt-1"
                  value={filters.stage}
                  onChange={(event) => setFilters((prev) => ({ ...prev, stage: event.target.value }))}
                >
                  {options.stages.map((stage) => (
                    <option key={`stage-${stage}`} value={stage}>
                      {stage === 'all' ? 'All Stages' : stage}
                    </option>
                  ))}
                </SelectField>
              </div>

              <div>
                <AisFieldLabel>Urgency</AisFieldLabel>
                <SelectField
                  className="dg-mt-1"
                  value={filters.urgency}
                  onChange={(event) => setFilters((prev) => ({ ...prev, urgency: event.target.value }))}
                >
                  {options.urgencies.map((urgency) => (
                    <option key={`urgency-${urgency}`} value={urgency}>
                      {urgency === 'all' ? 'All Urgency' : urgency}
                    </option>
                  ))}
                </SelectField>
              </div>

              <div>
                <AisFieldLabel>Inactive Days (min)</AisFieldLabel>
                <TextField
                  className="dg-mt-1"
                  value={filters.inactiveDays}
                  onChange={(event) => setFilters((prev) => ({ ...prev, inactiveDays: event.target.value }))}
                  placeholder="0"
                />
              </div>

              <div>
                <AisFieldLabel>Owner</AisFieldLabel>
                <SelectField
                  className="dg-mt-1"
                  value={filters.ownerUserId}
                  onChange={(event) => setFilters((prev) => ({ ...prev, ownerUserId: event.target.value }))}
                >
                  <option value="">All Owners</option>
                  {options.owners.map((owner) => (
                    <option key={`owner-${owner.userId}`} value={owner.userId}>
                      {owner.fullName}
                    </option>
                  ))}
                </SelectField>
              </div>

              <div className="asgn-pipe-filter-actions">
                <Button type="button" size="sm" variant="secondary" onClick={() => void load()} disabled={loading}>
                  {loading ? 'Loading...' : 'Apply Filters'}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setFilters(DEFAULT_FILTERS);
                    void load(DEFAULT_FILTERS);
                  }}
                  disabled={loading}
                >
                  Reset
                </Button>
              </div>
            </div>
          </details>

          {error ? <p className="asgn-error">{error}</p> : null}
          {opError ? <p className="asgn-error">{opError}</p> : null}
          {opSuccess ? <p className="asgn-success">{opSuccess}</p> : null}

          <div className="asgn-pipe-grid asgn-pipe-grid-twenty asgn-pipe-grid-main" data-testid="agent-pipeline-board">
            <div className="asgn-pipe-col asgn-pipe-center">
              <p className="asgn-pipe-col-title">Stages</p>
              <div className="asgn-pipe-lanes" ref={stageLanesRef}>
                {(data?.center.stages ?? []).map((lane) => (
                  <div
                    className={`asgn-pipe-lane ${stageToneClass(lane.key)} dg-pipeline-column--${stagePipelineClass(lane.key)}`}
                    key={`lane-${lane.key}`}
                  >
                    <div className="asgn-pipe-lane-head">
                      <div className="dg-pipeline-stage-head">
                        <span className={`dg-pipeline-stage-chip dg-pipeline-stage-chip--${stagePipelineClass(lane.key)}`}>
                          {lane.label}
                        </span>
                        <span className="dg-pipeline-stage-count">{lane.total}</span>
                      </div>
                    </div>

                    {lane.items.length > 0 ? (
                      <div className="asgn-pipe-item-list">
                        {lane.items.map((item) => (
                          <button
                            type="button"
                            className={`asgn-pipe-item dg-pipeline-card ${
                              selectedItem?.itemId === item.itemId && selectedItem?.itemType === item.itemType
                                ? 'is-selected'
                                : ''
                            }`}
                            key={`${lane.key}-${item.itemType}-${item.itemId}`}
                            onClick={() => {
                              setSelectedItem(item);
                              setTargetUserId(item.ownerUserId ?? '');
                              if (item.customerId) {
                                setLockCustomerId(item.customerId);
                              }
                            }}
                          >
                            <div className="asgn-pipe-item-top">
                              <p>{item.title}</p>
                              <span className="asgn-pipe-item-type">{item.itemType.toUpperCase()}</span>
                            </div>
                            <p className="asgn-pipe-item-meta">{item.ownerName}</p>
                            <div className="asgn-pipe-item-chip-row">
                              <span className="asgn-pipe-item-chip">Urgency {item.urgency}</span>
                              <span className="asgn-pipe-item-chip">Inactive {item.inactiveDays}d</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="asgn-pipe-empty-state" role="status" aria-live="polite">
                        <p className="asgn-pipe-empty-title">No items</p>
                        <p className="asgn-pipe-empty-note">No assigned leads or deals in this stage.</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="asgn-pipe-col asgn-pipe-right">
              <p className="asgn-pipe-col-title">Quick Actions</p>
              <div className="asgn-pipe-right-stack">
                <div className="asgn-pipe-ops-shell">
                  <div className="asgn-pipe-ops">
                    <div className="asgn-pipe-op-section">
                      <p className="asgn-pipe-op-section-title">Selected Record</p>
                      <div className="asgn-pipe-selected-record">
                        <p className="asgn-pipe-selected-value">
                          {selectedItem
                            ? `${selectedItem.itemType.toUpperCase()} · ${selectedItem.title}`
                            : 'No record selected'}
                        </p>
                        {selectedItem ? (
                          <p className="asgn-pipe-selected-help">
                            Stage {selectedItem.stage} · Inactive {selectedItem.inactiveDays}d
                          </p>
                        ) : (
                          <p className="asgn-pipe-selected-help">
                            Select a card from the board.
                          </p>
                        )}
                        {selectedItem ? (
                          <div className="asgn-actions">
                            <a className="asgn-link-btn" href={selectedRecordHref ?? '#'} target="_blank" rel="noreferrer">
                              {selectedRecordLinkLabel}
                            </a>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setSelectedItem(null);
                                setTargetUserId('');
                              }}
                            >
                              Clear Selection
                            </Button>
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <div className="asgn-pipe-op-grid">
                      <div className="asgn-pipe-op-section">
                        <p className="asgn-pipe-op-section-title">Reassign Selected</p>
                        <AisFieldLabel>Target Owner</AisFieldLabel>
                        <SelectField
                          className="dg-mt-1"
                          value={targetUserId}
                          onChange={(event) => setTargetUserId(event.target.value)}
                        >
                          <option value="">Select owner</option>
                          {assignableOwners.map((owner) => (
                            <option key={`op-owner-${owner.userId}`} value={owner.userId}>
                              {owner.fullName}
                            </option>
                          ))}
                        </SelectField>
                        <div className="asgn-actions dg-mt-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            disabled={opLoading || !selectedItem || !targetUserId}
                            onClick={() => {
                              if (!selectedItem || !targetUserId) return;
                              void runOperation(
                                {
                                  action: 'reassign',
                                  leadId: selectedItem.itemType === 'lead' ? selectedItem.itemId : undefined,
                                  dealId: selectedItem.itemType === 'deal' ? selectedItem.itemId : undefined,
                                  targetUserId,
                                  reason: 'Manual reassignment from manager pipeline board.',
                                },
                                'Reassignment executed.'
                              );
                            }}
                          >
                            Reassign Record
                          </Button>
                        </div>
                      </div>

                      <div className="asgn-pipe-op-section">
                        <p className="asgn-pipe-op-section-title">Queue Actions</p>
                        <AisFieldLabel>Batch Size</AisFieldLabel>
                        <TextField
                          className="dg-mt-1"
                          value={bulkLimit}
                          onChange={(event) => setBulkLimit(event.target.value)}
                          placeholder="12"
                        />
                        <div className="asgn-actions dg-mt-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            disabled={opLoading}
                            onClick={() =>
                              void runOperation(
                                {
                                  action: 'bulk_rebalance',
                                  limit: Math.max(1, toInt(bulkLimit)),
                                  filters: {
                                    team: filters.team,
                                    stage: filters.stage,
                                    urgency: filters.urgency,
                                    inactiveDays: toInt(filters.inactiveDays),
                                    ownerUserId: filters.ownerUserId || undefined,
                                  },
                                  reason: 'Bulk rebalance from manager board with selected criteria.',
                                },
                                'Bulk rebalance completed.'
                              )
                            }
                          >
                            Rebalance Queue
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            disabled={opLoading}
                            onClick={() =>
                              void runOperation(
                                {
                                  action: 'auto_assign_unowned',
                                  limit: Math.max(1, toInt(bulkLimit)),
                                  reason: 'Auto-assigned unowned records from manager board.',
                                },
                                'Auto-assign unowned completed.'
                              )
                            }
                          >
                            Auto-Assign Unowned
                          </Button>
                        </div>
                      </div>

                      <details className="asgn-pipe-advanced asgn-pipe-op-section">
                        <summary>Advanced: Strategic Owner Lock</summary>
                        <div className="dg-mt-2">
                          <AisFieldLabel>Customer ID</AisFieldLabel>
                          <TextField
                            className="dg-mt-1"
                            value={lockCustomerId}
                            onChange={(event) => setLockCustomerId(event.target.value)}
                            placeholder="Customer ID"
                          />
                          <div className="dg-mt-2">
                            <AisFieldLabel>Lock Owner</AisFieldLabel>
                          </div>
                          <SelectField
                            className="dg-mt-1"
                            value={lockOwnerUserId}
                            onChange={(event) => setLockOwnerUserId(event.target.value)}
                          >
                            <option value="">Select lock owner</option>
                            {assignableOwners.map((owner) => (
                              <option key={`lock-owner-${owner.userId}`} value={owner.userId}>
                                {owner.fullName}
                              </option>
                            ))}
                          </SelectField>
                          <div className="asgn-actions dg-mt-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              disabled={opLoading || !lockCustomerId || !lockOwnerUserId}
                              onClick={() =>
                                void runOperation(
                                  {
                                    action: 'lock_owner',
                                    customerId: lockCustomerId.trim(),
                                    targetUserId: lockOwnerUserId,
                                    reason: 'Strategic account owner lock from manager board.',
                                  },
                                  'Strategic owner lock saved.'
                                )
                              }
                            >
                              Lock Strategic Owner
                            </Button>
                          </div>
                        </div>
                      </details>
                    </div>

                    {operationResult ? (
                      <div className="asgn-result asgn-result-inline">
                        <p className="aflow-empty">
                          {operationResult.summary} ({operationResult.changedCount} changed / {operationResult.skippedCount}{' '}
                          skipped)
                        </p>
                        <ul className="aflow-mini-list">
                          {operationResult.changes.slice(0, 3).map((change, index) => (
                            <li key={`op-change-${index}`}>
                              {(change.leadId ? `Lead ${change.leadId}` : `Deal ${change.dealId}`)}: {change.reason}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="asgn-pipe-insights-shell">
                  <p className="asgn-pipe-col-title">Alerts and Suggestions</p>

                  {visibleAlerts.length ? (
                    <div className="asgn-pipe-alerts">
                      {visibleAlerts.map((alert, index) => (
                        <div className={`asgn-pipe-alert ${alertToneClass(alert.severity)}`} key={`alert-${index}`}>
                          <span className={`asgn-pipe-alert-kind ${alertToneClass(alert.severity)}`}>
                            {toneLabel(alertToneClass(alert.severity))}
                          </span>
                          <p>{alert.title}</p>
                          <p>{alert.detail}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="aflow-empty">No active alert signals for current filter scope.</p>
                  )}

                  <div className="asgn-pipe-suggest">
                    <div className="asgn-pipe-suggest-list">
                      {visibleSuggestions.map((suggestion) => {
                        const tone = suggestionToneClass(suggestion);
                        return (
                          <div className={`asgn-pipe-suggest-card ${tone}`} key={`suggest-${suggestion.id}`}>
                            <span className={`asgn-pipe-suggest-kind ${tone}`}>{toneLabel(tone)}</span>
                            <p className="asgn-pipe-suggest-title">{suggestion.title}</p>
                            <p className="asgn-pipe-suggest-detail">{suggestion.detail}</p>
                            <div className="asgn-actions">
                              <Button
                                type="button"
                                size="sm"
                                variant="secondary"
                                disabled={opLoading || suggestion.id === 'balanced'}
                                onClick={() =>
                                  void runOperation(
                                    {
                                      action: 'bulk_rebalance',
                                      limit: Math.max(1, suggestion.limit ?? Math.max(1, toInt(bulkLimit))),
                                      filters: {
                                        team: filters.team,
                                        stage: suggestion.stage ?? filters.stage,
                                        urgency: filters.urgency,
                                        inactiveDays: toInt(filters.inactiveDays),
                                        ownerUserId: (suggestion.fromOwnerUserId ?? filters.ownerUserId) || undefined,
                                      },
                                      reason: `Rebalance from suggestion: ${suggestion.title}`,
                                    },
                                    'Suggestion rebalance executed.'
                                  )
                                }
                              >
                                Run
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  const owner = suggestion.fromOwnerUserId ?? suggestion.toOwnerUserId ?? '';
                                  const nextFilters = { ...filters, ownerUserId: owner };
                                  setFilters(nextFilters);
                                  void load(nextFilters);
                                }}
                                disabled={opLoading}
                              >
                                Owner
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  const nextFilters = { ...filters, stage: suggestion.stage ?? 'all' };
                                  setFilters(nextFilters);
                                  void load(nextFilters);
                                }}
                                disabled={opLoading}
                              >
                                Stage
                              </Button>
                            </div>
                          </div>
                        );
                      })}

                      {visibleSuggestions.length === 0 ? (
                        <p className="aflow-empty">No rebalance suggestions for current filters.</p>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>
      ) : null}

      {showAgentsBoard ? (
        <Card className="asgn-pipe-agents-board">
          <div className="asgn-pipe-head">
            <div>
              <CardTitle>Agents Board: Lead, Deal, Quote</CardTitle>
            </div>
            <div className="asgn-pipe-kpi-rail asgn-pipe-kpi-rail--agents asgn-pipe-kpi-rail--minimal">
              <span className="asgn-pipe-kpi-chip">Agents: {visibleAgents.length}</span>
              <Button type="button" size="sm" variant="secondary" onClick={() => void load()} disabled={loading}>
                {loading ? 'Refreshing...' : 'Refresh'}
              </Button>
            </div>
          </div>

          <div className="asgn-agent-directory-shell">
            <p className="asgn-pipe-col-title">Focus Agent</p>
            <div className="asgn-agent-directory">
              <button
                type="button"
                className={`asgn-agent-directory-card${focusedAgentUserId ? '' : ' is-active'}`}
                onClick={() => setFocusedAgentUserId('')}
              >
                <strong>All Agents</strong>
                <span>{visibleAgents.length} owners</span>
              </button>

              {visibleAgents.map((agent) => (
                <button
                  key={`agent-focus-${agent.userId}`}
                  type="button"
                  className={`asgn-agent-directory-card${focusedAgentUserId === agent.userId ? ' is-active' : ''}`}
                  onClick={() => setFocusedAgentUserId(agent.userId)}
                >
                  <strong>{agent.fullName}</strong>
                  <span>
                    L{agent.activeLeads} · D{agent.activeDeals}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {agentEntityLanes.length > 0 ? (
            <div className="asgn-agent-status-board" ref={agentsBoardRef}>
              {agentEntityLanes.map((lane) => (
                <div
                  key={`agent-entity-lane-${lane.key}`}
                  className={`asgn-agent-status-lane asgn-agent-status-lane--${lane.pipelineTone}`}
                >
                  <div className="asgn-agent-entity-lane-head">
                    <div className="dg-pipeline-stage-head">
                      <span className={`dg-pipeline-stage-chip dg-pipeline-stage-chip--${lane.pipelineTone}`}>
                        {lane.label}
                      </span>
                      <span className="dg-pipeline-stage-count">{lane.total}</span>
                    </div>
                  </div>

                  <div className="asgn-agent-status-cards">
                    {lane.items.map((item) => (
                      <div key={`agent-entity-${lane.key}-${item.agent.userId}`} className="asgn-agent-status-card">
                        <div className="asgn-agent-entity-card-head">
                          <div className="asgn-pipe-agent-identity">
                            <span className="asgn-pipe-agent-avatar asgn-pipe-agent-photo">
                              {initials(item.agent.fullName)}
                            </span>
                            <div className="asgn-pipe-agent-copy">
                              <strong>{item.agent.fullName}</strong>
                              <span>{prettyRole(item.agent.role)}</span>
                            </div>
                          </div>
                          <span className="asgn-pipe-team-badge">{item.agent.team}</span>
                        </div>

                        <div className="asgn-agent-entity-summary-row">
                          <div className="asgn-agent-entity-summary-item">
                            <em>Owned</em>
                            <strong>{item.count}</strong>
                          </div>
                          <div className="asgn-agent-entity-summary-item">
                            <em>SLA Risk</em>
                            <strong>{item.agent.slaRiskCount}</strong>
                          </div>
                          <div className="asgn-agent-entity-summary-item">
                            <em>Inactive</em>
                            <strong>{item.agent.maxInactiveDays}d</strong>
                          </div>
                        </div>

                        <div className="asgn-agent-entity-progress">
                          <div className="asgn-agent-entity-progress-row">
                            {item.progression.map((progress) => (
                              <span
                                key={`progress-${lane.key}-${item.agent.userId}-${progress.label}`}
                                className="asgn-agent-entity-progress-pill"
                              >
                                {progress.label}
                                <strong>{progress.value}</strong>
                              </span>
                            ))}
                          </div>
                        </div>

                        <p className="asgn-agent-entity-footnote">
                          Leads {item.agent.activeLeads} · Deals {item.agent.activeDeals} · Conv{' '}
                          {item.agent.conversionRatePct}%
                        </p>
                      </div>
                    ))}

                    {lane.items.length === 0 ? <p className="aflow-empty">No assigned records in this board.</p> : null}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="aflow-empty">No agent progression data for current filters.</p>
          )}
        </Card>
      ) : null}
    </div>
  );
}
