'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button, Card, CardText, CardTitle, SelectField, TextField } from '@/components/ui';
import { getAgentPipelineBoard } from '@/features/admin/ai-sales-agent/api';
import type { AgentPipelineBoardEnvelope } from '@/features/admin/ai-sales-agent/types';
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

export default function AgentPipelineBoard() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AgentPipelineBoardEnvelope | null>(null);
  const [filters, setFilters] = useState<PipelineFilters>(DEFAULT_FILTERS);

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

  return (
    <Card className="asgn-pipe-card">
      <div className="asgn-pipe-head">
        <div>
          <p className="aflow-kicker">Agent Pipeline View</p>
          <CardTitle>Manager Board: Workload, Stages, and Rebalance Signals</CardTitle>
          <CardText>
            Left: agent capacity and KPI chips. Center: assigned leads/deals by stage. Right: alerts and rebalance suggestions.
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

      <div className="asgn-pipe-grid" data-testid="agent-pipeline-board">
        <div className="asgn-pipe-col asgn-pipe-left">
          <p className="asgn-pipe-col-title">Agents</p>
          {data?.left.agents.length ? (
            data.left.agents.map((agent) => (
              <div className="asgn-pipe-agent" key={`pipe-agent-${agent.userId}`}>
                <div className="asgn-pipe-agent-head">
                  <strong>{agent.fullName}</strong>
                  <span>{agent.team}</span>
                </div>
                <div className="asgn-pipe-chip-row">
                  <span className="asgn-pipe-chip">Leads {agent.activeLeads}</span>
                  <span className="asgn-pipe-chip">Deals {agent.activeDeals}</span>
                  <span className="asgn-pipe-chip">SLA {agent.slaRiskCount}</span>
                  <span className="asgn-pipe-chip">Overdue {agent.overdueFollowups}</span>
                  <span className="asgn-pipe-chip">Conv {agent.conversionRatePct}%</span>
                  <span className="asgn-pipe-chip">Resp {agent.responseRatePct}%</span>
                </div>
              </div>
            ))
          ) : (
            <p className="aflow-empty">No agents in selected filters.</p>
          )}
        </div>

        <div className="asgn-pipe-col asgn-pipe-center">
          <p className="asgn-pipe-col-title">Assigned Leads/Deals by Stage</p>
          <div className="asgn-pipe-lanes">
            {data?.center.stages.map((lane) => (
              <div className={`asgn-pipe-lane ${stageToneClass(lane.key)}`} key={`lane-${lane.key}`}>
                <div className="asgn-pipe-lane-head">
                  <strong>{lane.label}</strong>
                  <span>
                    {lane.total} · L{lane.leads}/D{lane.deals}
                  </span>
                </div>
                {lane.items.length > 0 ? (
                  <div className="asgn-pipe-item-list">
                    {lane.items.slice(0, 4).map((item) => (
                      <div className="asgn-pipe-item" key={`${lane.key}-${item.itemType}-${item.itemId}`}>
                        <p>{item.title}</p>
                        <p>
                          {item.itemType.toUpperCase()} · {item.ownerName}
                        </p>
                        <p>
                          Urgency {item.urgency} · Inactive {item.inactiveDays}d
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="aflow-empty">No items</p>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="asgn-pipe-col asgn-pipe-right">
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
            <ul className="aflow-mini-list">
              {(data?.right.rebalanceSuggestions ?? []).map((line, index) => (
                <li key={`suggest-${index}`}>{line}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </Card>
  );
}
