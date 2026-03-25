'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button, Card, CardText, CardTitle, SelectField, TextField } from '@/components/ui';
import { getAgentPipelineBoard, runAssignmentOperation } from '@/features/admin/ai-sales-agent/api';
import type {
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

function stageToneClass(stageKey: string) {
  if (['won_lost', 'post_outcome'].includes(stageKey)) return 'is-good';
  if (['reply_sent', 'quote_ready', 'quote_sent'].includes(stageKey)) return 'is-info';
  if (['negotiation'].includes(stageKey)) return 'is-warn';
  return 'is-neutral';
}

function stagePipelineClass(stageKey: string) {
  if (['lead_new', 'triaged'].includes(stageKey)) return 'new';
  if (['qualified'].includes(stageKey)) return 'qualified';
  if (['reply_sent', 'quote_ready', 'quote_sent'].includes(stageKey)) return 'quoted';
  if (['negotiation'].includes(stageKey)) return 'negotiation';
  if (['won_lost', 'post_outcome'].includes(stageKey)) return 'won';
  return 'new';
}

function alertToneClass(severity: 'warning' | 'critical' | 'info') {
  if (severity === 'critical') return 'is-critical';
  if (severity === 'warning') return 'is-warning';
  return 'is-info';
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

export default function AgentPipelineBoard() {
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
        if (!exists) setSelectedItem(null);
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
      return { agents: 0, lanes: 0, cards: 0, alerts: 0 };
    }
    const cards = data.center.stages.reduce((sum, lane) => sum + lane.total, 0);
    return {
      agents: data.left.agents.length,
      lanes: data.center.stages.filter((lane) => lane.total > 0).length,
      cards,
      alerts: data.right.alerts.length,
    };
  }, [data]);

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
    <Card className="asgn-pipe-card">
      <div className="asgn-pipe-head">
        <div>
          <p className="aflow-kicker">Agent Pipeline View</p>
          <CardTitle>Manager Board: Workload, Stages, and Rebalance Signals</CardTitle>
          <CardText>
            Left: agent capacity and KPI chips. Center: assigned leads/deals by stage. Right: alerts, rebalance suggestions, and assignment operations.
          </CardText>
        </div>
        <div className="asgn-pipe-kpi-rail">
          <span className="asgn-pipe-kpi-chip">Agents: {selectedSummary.agents}</span>
          <span className="asgn-pipe-kpi-chip">Active Lanes: {selectedSummary.lanes}</span>
          <span className="asgn-pipe-kpi-chip">Items: {selectedSummary.cards}</span>
          <span className="asgn-pipe-kpi-chip">Alerts: {selectedSummary.alerts}</span>
        </div>
      </div>

      <div className="asgn-pipe-filters">
        <div>
          <AisFieldLabel>Team</AisFieldLabel>
          <SelectField
            className="dg-mt-1"
            value={filters.team}
            onChange={(event) => setFilters((prev) => ({ ...prev, team: event.target.value }))}
            data-testid="agent-pipeline-filter-team"
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
            data-testid="agent-pipeline-filter-stage"
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
            data-testid="agent-pipeline-filter-urgency"
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
            data-testid="agent-pipeline-filter-inactive-days"
          />
        </div>

        <div>
          <AisFieldLabel>Owner</AisFieldLabel>
          <SelectField
            className="dg-mt-1"
            value={filters.ownerUserId}
            onChange={(event) => setFilters((prev) => ({ ...prev, ownerUserId: event.target.value }))}
            data-testid="agent-pipeline-filter-owner"
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

      {error ? <p className="asgn-error">{error}</p> : null}
      {opError ? <p className="asgn-error">{opError}</p> : null}
      {opSuccess ? <p className="asgn-success">{opSuccess}</p> : null}

      <div className="asgn-pipe-grid asgn-pipe-grid-twenty" data-testid="agent-pipeline-board">
        <div className="asgn-pipe-col asgn-pipe-left dg-pipeline-column">
          <p className="asgn-pipe-col-title">Agents</p>
          {data?.left.agents.length ? (
            <div className="asgn-pipe-agent-list">
              {data.left.agents.map((agent) => (
                <div className="asgn-pipe-agent" key={`pipe-agent-${agent.userId}`}>
                <div className="asgn-pipe-agent-head">
                  <div className="asgn-pipe-agent-identity">
                    <span className="asgn-pipe-agent-avatar">{initials(agent.fullName)}</span>
                    <div className="asgn-pipe-agent-copy">
                      <strong>{agent.fullName}</strong>
                      <span>{prettyRole(agent.role)}</span>
                    </div>
                  </div>
                  <span className="asgn-pipe-team-badge">{agent.team}</span>
                </div>
                <div className="asgn-pipe-agent-kpi-grid">
                  <div className="asgn-pipe-agent-kpi">
                    <span>Leads</span>
                    <strong>{agent.activeLeads}</strong>
                  </div>
                  <div className="asgn-pipe-agent-kpi">
                    <span>Deals</span>
                    <strong>{agent.activeDeals}</strong>
                  </div>
                  <div className="asgn-pipe-agent-kpi">
                    <span>SLA Risk</span>
                    <strong>{agent.slaRiskCount}</strong>
                  </div>
                  <div className="asgn-pipe-agent-kpi">
                    <span>Overdue</span>
                    <strong>{agent.overdueFollowups}</strong>
                  </div>
                  <div className="asgn-pipe-agent-kpi">
                    <span>Conv</span>
                    <strong>{agent.conversionRatePct}%</strong>
                  </div>
                  <div className="asgn-pipe-agent-kpi">
                    <span>Resp</span>
                    <strong>{agent.responseRatePct}%</strong>
                  </div>
                </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="aflow-empty">No agents in selected filters.</p>
          )}
        </div>

        <div className="asgn-pipe-col asgn-pipe-center dg-pipeline-column">
          <p className="asgn-pipe-col-title">Assigned Leads/Deals by Stage</p>
          <div className="asgn-pipe-lanes dg-pipeline-grid">
            {data?.center.stages.map((lane) => (
              <div
                className={`asgn-pipe-lane ${stageToneClass(lane.key)} dg-pipeline-column dg-pipeline-column--${stagePipelineClass(lane.key)}`}
                key={`lane-${lane.key}`}
              >
                <div className="asgn-pipe-lane-head">
                  <div className="dg-pipeline-stage-head">
                    <span className={`dg-pipeline-stage-chip dg-pipeline-stage-chip--${stagePipelineClass(lane.key)}`}>{lane.label}</span>
                    <span className="dg-pipeline-stage-count">{lane.total}</span>
                  </div>
                  <span>L{lane.leads}/D{lane.deals}</span>
                </div>
                {lane.items.length > 0 ? (
                  <div className="asgn-pipe-item-list dg-pipeline-cards">
                    {lane.items.slice(0, 4).map((item) => (
                      <button
                        type="button"
                        className={`asgn-pipe-item dg-pipeline-card ${selectedItem?.itemId === item.itemId && selectedItem?.itemType === item.itemType ? 'is-selected' : ''}`}
                        key={`${lane.key}-${item.itemType}-${item.itemId}`}
                        onClick={() => {
                          setSelectedItem(item);
                          setTargetUserId(item.ownerUserId ?? '');
                          if (item.customerId) {
                            setLockCustomerId(item.customerId);
                          }
                        }}
                        data-testid={`agent-pipeline-item-${item.itemType}-${item.itemId}`}
                      >
                        <p>{item.title}</p>
                        <p>
                          {item.itemType.toUpperCase()} · {item.ownerName}
                        </p>
                        <p>
                          Urgency {item.urgency} · Inactive {item.inactiveDays}d
                        </p>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="aflow-empty">No items</p>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="asgn-pipe-col asgn-pipe-right dg-pipeline-column">
          <p className="asgn-pipe-col-title">Alerts & Rebalance Suggestions</p>

          <div className="asgn-pipe-alerts">
            {data?.right.alerts.map((alert, index) => (
              <div className={`asgn-pipe-alert ${alertToneClass(alert.severity)}`} key={`alert-${index}`}>
                <p>{alert.title}</p>
                <p>{alert.detail}</p>
              </div>
            ))}
          </div>

          <div className="asgn-pipe-suggest">
            <p className="aflow-mini-title">Rebalance Suggestions</p>
            <div className="asgn-pipe-suggest-list">
              {(data?.right.rebalanceSuggestions ?? []).map((suggestion) => (
                <div className="asgn-pipe-suggest-card" key={`suggest-${suggestion.id}`}>
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
                      data-testid={`agent-pipeline-suggestion-reassign-${suggestion.id}`}
                    >
                      Reassign
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
                      data-testid={`agent-pipeline-suggestion-open-owner-${suggestion.id}`}
                    >
                      Open Owner
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
                      data-testid={`agent-pipeline-suggestion-open-stage-${suggestion.id}`}
                    >
                      Open Stage Queue
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="asgn-pipe-ops">
            <p className="aflow-mini-title">Assignment Operations</p>

            <div className="asgn-pipe-op-grid">
              <div>
                <AisFieldLabel>Selected Item</AisFieldLabel>
                <p className="aflow-empty">
                  {selectedItem
                    ? `${selectedItem.itemType.toUpperCase()}: ${selectedItem.title}`
                    : 'Select a lead/deal card from center lane.'}
                </p>
              </div>

              <div>
                <AisFieldLabel>Target Owner</AisFieldLabel>
                <SelectField
                  className="dg-mt-1"
                  value={targetUserId}
                  onChange={(event) => setTargetUserId(event.target.value)}
                  data-testid="agent-pipeline-op-target-owner"
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
                    data-testid="agent-pipeline-op-reassign"
                  >
                    Reassign Lead/Deal
                  </Button>
                </div>
              </div>

              <div>
                <AisFieldLabel>Bulk Rebalance Limit</AisFieldLabel>
                <TextField
                  className="dg-mt-1"
                  value={bulkLimit}
                  onChange={(event) => setBulkLimit(event.target.value)}
                  placeholder="12"
                  data-testid="agent-pipeline-op-bulk-limit"
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
                    data-testid="agent-pipeline-op-bulk"
                  >
                    Bulk Rebalance by Criteria
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
                    data-testid="agent-pipeline-op-auto"
                  >
                    Auto-Assign Unowned
                  </Button>
                </div>
              </div>

              <div>
                <AisFieldLabel>Strategic Account Lock</AisFieldLabel>
                <TextField
                  className="dg-mt-1"
                  value={lockCustomerId}
                  onChange={(event) => setLockCustomerId(event.target.value)}
                  placeholder="Customer ID"
                  data-testid="agent-pipeline-op-lock-customer"
                />
                <SelectField
                  className="dg-mt-1"
                  value={lockOwnerUserId}
                  onChange={(event) => setLockOwnerUserId(event.target.value)}
                  data-testid="agent-pipeline-op-lock-owner"
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
                    data-testid="agent-pipeline-op-lock"
                  >
                    Lock Owner for Strategic Account
                  </Button>
                </div>
              </div>
            </div>

            {operationResult ? (
              <div className="asgn-result">
                <p className="aflow-mini-title">Latest Operation Result</p>
                <p className="aflow-empty">
                  {operationResult.summary} ({operationResult.changedCount} changed / {operationResult.skippedCount} skipped)
                </p>
                <ul className="aflow-mini-list">
                  {operationResult.changes.slice(0, 5).map((change, index) => (
                    <li key={`op-change-${index}`}>
                      {(change.leadId ? `Lead ${change.leadId}` : `Deal ${change.dealId}`)}: {change.reason}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </Card>
  );
}
