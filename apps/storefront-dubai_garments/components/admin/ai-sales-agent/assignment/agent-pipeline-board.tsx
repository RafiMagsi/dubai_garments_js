'use client';

import { useEffect, useMemo, useState } from 'react';
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

function shortEntityCode(value: string, size = 6) {
  if (!value) return '-';
  return value.slice(0, size).toUpperCase();
}

function urgencyToneClass(urgency: string) {
  const normalized = urgency.toLowerCase();
  if (normalized === 'high') return 'is-risk';
  if (normalized === 'medium') return 'is-warn';
  if (normalized === 'low') return 'is-clear';
  return 'is-neutral';
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

type AgentEntityLaneKey = 'agent' | 'lead' | 'deal' | 'quote' | 'closed';

type AgentEntityLane = {
  key: AgentEntityLaneKey;
  label: string;
  pipelineTone: 'new' | 'negotiation' | 'quoted' | 'idle' | 'won';
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

const AGENT_LANE_COPY: Record<
  AgentEntityLaneKey,
  { subtitle: string; emptyTitle: string; emptyNote: string }
> = {
  agent: {
    subtitle: 'Click an agent card to filter all lanes by owner.',
    emptyTitle: 'No agents available',
    emptyNote: 'Add or activate sales agents to populate this board.',
  },
  lead: {
    subtitle: 'Agents actively owning and progressing leads.',
    emptyTitle: 'No lead owners',
    emptyNote: 'No agents are currently holding leads.',
  },
  deal: {
    subtitle: 'Agents responsible for open commercial deals.',
    emptyTitle: 'No deal owners',
    emptyNote: 'No agents are currently holding deals.',
  },
  quote: {
    subtitle: 'Agents handling quote preparation and sends.',
    emptyTitle: 'No quote owners',
    emptyNote: 'No agents are currently handling quote stages.',
  },
  closed: {
    subtitle: 'Closed outcomes with won/lost totals.',
    emptyTitle: 'No closed outcomes',
    emptyNote: 'No won/lost records are available for current filters.',
  },
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

  const directoryTotals = useMemo(
    () =>
      visibleAgents.reduce(
        (acc, agent) => {
          acc.leads += agent.activeLeads;
          acc.deals += agent.activeDeals;
          acc.closed += agent.closedDeals;
          return acc;
        },
        { leads: 0, deals: 0, closed: 0 }
      ),
    [visibleAgents]
  );

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
    const allAgents = visibleAgents;

    const agentsLaneItems = allAgents
      .map((agent) => ({
        agent,
        count:
          Math.max(agent.activeLeads, stageCount(agent, LEAD_STAGE_KEYS)) +
          Math.max(agent.activeDeals, stageCount(agent, DEAL_STAGE_KEYS)) +
          stageCount(agent, QUOTE_STAGE_KEYS),
        progression: [
          { label: 'Leads', value: Math.max(agent.activeLeads, stageCount(agent, LEAD_STAGE_KEYS)) },
          { label: 'Deals', value: Math.max(agent.activeDeals, stageCount(agent, DEAL_STAGE_KEYS)) },
        ],
      }))
      .sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;
        return a.agent.fullName.localeCompare(b.agent.fullName);
      });

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

    const closedLaneItems = agents
      .map((agent) => ({
        agent,
        count: agent.closedDeals,
        progression: [
          { label: 'Won', value: agent.wonDeals },
          { label: 'Lost', value: Math.max(0, agent.closedDeals - agent.wonDeals) },
        ],
      }))
      .filter((item) => item.count > 0)
      .sort((a, b) => b.count - a.count);

    return [
      {
        key: 'agent',
        label: 'Agents',
        pipelineTone: 'idle',
        total: agentsLaneItems.length,
        items: agentsLaneItems,
      },
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
      {
        key: 'closed',
        label: 'Closed',
        pipelineTone: 'won',
        total: closedLaneItems.reduce((sum, item) => sum + item.count, 0),
        items: closedLaneItems,
      },
    ];
  }, [boardAgents, visibleAgents]);

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
              <div className="asgn-pipe-lanes">
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
                        {lane.items.map((item) => {
                          const entityTone = stagePipelineClass(lane.key);
                          const urgencyTone = urgencyToneClass(item.urgency);
                          const isSelected =
                            selectedItem?.itemId === item.itemId && selectedItem?.itemType === item.itemType;

                          return (
                            <button
                              type="button"
                              className={`asgn-pipe-item dg-pipeline-card dg-pipeline-card-modern dg-pipeline-card--${entityTone} ${
                                isSelected ? 'is-selected' : ''
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
                              <div className="dg-pipeline-card-meta">
                                <div className="dg-pipeline-card-meta-left">
                                  <span className="asgn-pipe-item-grip" aria-hidden="true">
                                    ...
                                  </span>
                                  <span className="asgn-pipe-item-type">{item.itemType.toUpperCase()}</span>
                                </div>
                                <span className="dg-pipeline-card-id">#{shortEntityCode(item.itemId)}</span>
                              </div>

                              <div className="asgn-pipe-item-heading">
                                <p className="asgn-pipe-item-title">{item.title}</p>
                                <div className="asgn-pipe-item-subline">
                                  <span className="asgn-pipe-item-owner-avatar" aria-hidden="true">
                                    {initials(item.ownerName || 'Unknown')}
                                  </span>
                                  <p className="asgn-pipe-item-company">{item.ownerName}</p>
                                </div>
                              </div>

                              <div className="asgn-pipe-item-stats" aria-label="Pipeline item metrics">
                                <div className={`asgn-pipe-item-stat asgn-pipe-item-stat--urgency ${urgencyTone}`}>
                                  <span>Urgency</span>
                                  <strong>{item.urgency}</strong>
                                </div>
                                <div className="asgn-pipe-item-stat asgn-pipe-item-stat--inactive">
                                  <span>Inactive</span>
                                  <strong>{item.inactiveDays}d</strong>
                                </div>
                              </div>

                              <div className="asgn-pipe-item-footnote">Click to select for quick actions</div>
                            </button>
                          );
                        })}
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
        <Card className="asgn-pipe-agents-board asgn-pipe-agents-board--v4">
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

          {agentEntityLanes.length > 0 ? (
            <div className="asgn-agent-status-board">
              {agentEntityLanes.map((lane) => (
                <div
                  key={`agent-entity-lane-${lane.key}`}
                  className={`asgn-agent-status-lane asgn-agent-status-lane--${lane.pipelineTone}`}
                >
                  <div className="asgn-agents3-lane-head">
                    <div className="dg-pipeline-stage-head">
                      <span className={`dg-pipeline-stage-chip dg-pipeline-stage-chip--${lane.pipelineTone}`}>
                        {lane.label}
                      </span>
                      <span className="dg-pipeline-stage-count">{lane.total}</span>
                    </div>
                    <p className="asgn-agents3-lane-subtitle">{AGENT_LANE_COPY[lane.key].subtitle}</p>
                  </div>

                  <div className="asgn-agents3-card-stack">
                    {lane.key === 'agent' ? (
                      <button
                        type="button"
                        className={`asgn-agents3-card asgn-agents3-card--idle asgn-agents3-card--selectable asgn-agents3-card--all${
                          focusedAgentUserId ? '' : ' is-active'
                        }`}
                        onClick={() => setFocusedAgentUserId('')}
                      >
                        <div className="asgn-agents3-card-head">
                          <div className="asgn-agents3-card-person">
                            <span className="asgn-agents3-avatar">ALL</span>
                            <div className="asgn-agents3-card-identity">
                              <strong>All Agents</strong>
                              <div className="asgn-agents3-card-subline">
                                <span className="asgn-agents3-card-role">Global view</span>
                                <span className="asgn-agents3-state">All statuses</span>
                              </div>
                            </div>
                          </div>
                          <div className="asgn-agents3-tags" />
                        </div>
                        <dl className="asgn-agents3-kpis">
                          <div className="asgn-agents3-kpi is-owned">
                            <dt>Agents</dt>
                            <dd>{visibleAgents.length}</dd>
                          </div>
                          <div className="asgn-agents3-kpi is-clear">
                            <dt>Leads</dt>
                            <dd>{directoryTotals.leads}</dd>
                          </div>
                          <div className="asgn-agents3-kpi is-warn">
                            <dt>Deals</dt>
                            <dd>{directoryTotals.deals}</dd>
                          </div>
                          <div className="asgn-agents3-kpi is-risk">
                            <dt>Closed</dt>
                            <dd>{directoryTotals.closed}</dd>
                          </div>
                        </dl>
                      </button>
                    ) : null}

                    {lane.items.map((item) => {
                      const closedWon = item.agent.wonDeals;
                      const closedLost = Math.max(0, item.agent.closedDeals - item.agent.wonDeals);
                      const closedWinRate = item.agent.closedDeals > 0 ? Math.round((closedWon / item.agent.closedDeals) * 100) : 0;
                      const primaryMetricLabel = lane.key === 'closed' ? 'Closed' : 'Owned';
                      const statusLabel =
                        lane.key === 'agent' ? 'Filter by owner' : lane.key === 'closed' ? 'Closed outcomes' : '';
                      const statusClass =
                        lane.key === 'agent' || lane.key === 'closed' ? ' is-idle' : '';

                      const cardContent = (
                        <>
                          <div className="asgn-agents3-card-head">
                            <div className="asgn-agents3-card-person">
                              <span className="asgn-agents3-avatar">
                                {initials(item.agent.fullName)}
                              </span>
                              <div className="asgn-agents3-card-identity">
                                <strong>{item.agent.fullName}</strong>
                              <div className="asgn-agents3-card-subline">
                                <span className="asgn-agents3-card-role">{prettyRole(item.agent.role)}</span>
                                  {statusLabel ? (
                                    <span className={`asgn-agents3-state${statusClass}`}>
                                      {statusLabel}
                                    </span>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                            <div className="asgn-agents3-tags">
                              <span className="asgn-agents3-tag asgn-agents3-tag--team">{item.agent.team}</span>
                            </div>
                          </div>

                          <dl className="asgn-agents3-kpis">
                            <div className="asgn-agents3-kpi is-owned">
                              <dt>{primaryMetricLabel}</dt>
                              <dd>{item.count}</dd>
                            </div>
                            <div
                              className={`asgn-agents3-kpi ${
                                item.agent.slaRiskCount > 0 ? 'is-risk' : 'is-clear'
                              }`}
                            >
                              <dt>SLA Risk</dt>
                              <dd>{item.agent.slaRiskCount}</dd>
                            </div>
                            <div
                              className={`asgn-agents3-kpi ${
                                item.agent.maxInactiveDays >= 7
                                  ? 'is-risk'
                                  : item.agent.maxInactiveDays >= 3
                                    ? 'is-warn'
                                    : 'is-clear'
                              }`}
                            >
                              <dt>Inactive</dt>
                              <dd>{item.agent.maxInactiveDays}d</dd>
                            </div>
                          </dl>

                          <div className="asgn-agents3-progress">
                            <div className="asgn-agents3-progress-pills">
                              {item.progression.map((progress) => (
                                <span
                                  key={`progress-${lane.key}-${item.agent.userId}-${progress.label}`}
                                  className="asgn-agents3-progress-pill"
                                >
                                  <em>{progress.label}</em>
                                  <strong>{progress.value}</strong>
                                </span>
                              ))}
                            </div>
                          </div>

                          <div className="asgn-agents3-foot">
                            {lane.key === 'closed' ? (
                              <>
                                <span>
                                  Won <strong>{closedWon}</strong>
                                </span>
                                <span>
                                  Lost <strong>{closedLost}</strong>
                                </span>
                                <span>
                                  Win Rate <strong>{closedWinRate}%</strong>
                                </span>
                              </>
                            ) : (
                              <>
                                <span>
                                  Leads <strong>{item.agent.activeLeads}</strong>
                                </span>
                                <span>
                                  Deals <strong>{item.agent.activeDeals}</strong>
                                </span>
                                <span>
                                  Resp <strong>{item.agent.responseRatePct}%</strong>
                                </span>
                              </>
                            )}
                          </div>
                        </>
                      );

                      if (lane.key === 'agent') {
                        return (
                          <button
                            key={`agent-entity-${lane.key}-${item.agent.userId}`}
                            type="button"
                            className={`asgn-agents3-card asgn-agents3-card--${lane.pipelineTone} asgn-agents3-card--selectable${
                              focusedAgentUserId === item.agent.userId ? ' is-active' : ''
                            }`}
                            onClick={() => setFocusedAgentUserId(item.agent.userId)}
                          >
                            {cardContent}
                          </button>
                        );
                      }

                      return (
                        <article
                          key={`agent-entity-${lane.key}-${item.agent.userId}`}
                          className={`asgn-agents3-card asgn-agents3-card--${lane.pipelineTone}`}
                        >
                          {cardContent}
                        </article>
                      );
                    })}

                    {lane.items.length === 0 ? (
                      <div className="asgn-agents3-empty" role="status" aria-live="polite">
                        <p className="asgn-agents3-empty-title">{AGENT_LANE_COPY[lane.key].emptyTitle}</p>
                        <p className="asgn-agents3-empty-note">{AGENT_LANE_COPY[lane.key].emptyNote}</p>
                      </div>
                    ) : null}
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
