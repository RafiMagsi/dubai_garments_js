'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button, Card, CardText, CardTitle } from '@/components/ui';
import { getAgentWorkload } from '@/features/admin/ai-sales-agent/api';
import type { AgentWorkloadEnvelope } from '@/features/admin/ai-sales-agent/types';

type AgentWorkloadPanelProps = {
  compact?: boolean;
};

function toneForRisk(value: number) {
  if (value >= 12) return 'is-bad';
  if (value >= 5) return 'is-warn';
  return 'is-good';
}

function toneForResponseRate(value: number) {
  if (value >= 80) return 'is-good';
  if (value >= 60) return 'is-warn';
  return 'is-bad';
}

function toneForConversion(value: number) {
  if (value >= 35) return 'is-good';
  if (value >= 15) return 'is-warn';
  return 'is-bad';
}

export default function AgentWorkloadPanel({ compact = false }: AgentWorkloadPanelProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AgentWorkloadEnvelope | null>(null);

  async function load() {
    try {
      setLoading(true);
      setError(null);
      const result = await getAgentWorkload();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load workload model.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const summary = useMemo(() => {
    if (!data || data.agents.length === 0) {
      return {
        activeLeads: 0,
        activeDeals: 0,
        overdueFollowups: 0,
        slaRisks: 0,
        avgResponseRate: 0,
      };
    }

    const totals = data.agents.reduce(
      (acc, agent) => {
        acc.activeLeads += agent.activeLeads;
        acc.activeDeals += agent.activeDeals;
        acc.overdueFollowups += agent.overdueFollowups;
        acc.slaRisks += agent.slaRiskCount;
        acc.avgResponseRate += agent.responseRatePct;
        return acc;
      },
      { activeLeads: 0, activeDeals: 0, overdueFollowups: 0, slaRisks: 0, avgResponseRate: 0 }
    );

    return {
      ...totals,
      avgResponseRate: Math.round(totals.avgResponseRate / data.agents.length),
    };
  }, [data]);

  return (
    <Card className="asgn-workload-card">
      {!compact ? (
        <div className="asgn-workload-head">
          <div>
            <p className="aflow-kicker">Sales Agent Workload Model</p>
            <CardTitle>Agent Capacity, Stage Distribution, and SLA Risks</CardTitle>
            <CardText>
              Tracks active ownership, response metrics, follow-up debt, and conversion health per agent.
            </CardText>
          </div>
          <Button type="button" size="sm" variant="secondary" onClick={() => void load()} disabled={loading}>
            {loading ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      ) : (
        <div className="asgn-actions">
          <Button type="button" size="sm" variant="secondary" onClick={() => void load()} disabled={loading}>
            {loading ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      )}

      {error ? <p className="asgn-error">{error}</p> : null}

      <div className="asgn-workload-kpis">
        <div className="asgn-kpi is-info">
          <span>Active Leads</span>
          <strong>{summary.activeLeads}</strong>
        </div>
        <div className="asgn-kpi is-info">
          <span>Active Deals</span>
          <strong>{summary.activeDeals}</strong>
        </div>
        <div className={`asgn-kpi ${toneForRisk(summary.overdueFollowups)}`}>
          <span>Overdue Follow-ups</span>
          <strong>{summary.overdueFollowups}</strong>
        </div>
        <div className={`asgn-kpi ${toneForRisk(summary.slaRisks)}`}>
          <span>SLA Risk Count</span>
          <strong>{summary.slaRisks}</strong>
        </div>
        <div className={`asgn-kpi ${toneForResponseRate(summary.avgResponseRate)}`}>
          <span>Avg Response Rate</span>
          <strong>{summary.avgResponseRate}%</strong>
        </div>
      </div>

      {data ? (
        <>
          <p className="aflow-empty">
            SLA rules: lead response {data.slaRules.leadResponseHours}h, deal aging {data.slaRules.dealAgingHours}h.
          </p>
          <div className="asgn-workload-grid">
            {data.agents.map((agent) => (
              <div className="asgn-workload-agent" key={`workload-${agent.userId}`}>
                <p className="asgn-agent-name">{agent.fullName}</p>
                <p className="asgn-agent-meta">
                  {agent.role} · Leads {agent.activeLeads} · Deals {agent.activeDeals}
                </p>
                <div className="asgn-agent-health-row">
                  <span className={`asgn-agent-health-chip ${toneForRisk(agent.slaRiskCount)}`}>
                    SLA Risk {agent.slaRiskCount}
                  </span>
                  <span className={`asgn-agent-health-chip ${toneForRisk(agent.overdueFollowups)}`}>
                    Overdue {agent.overdueFollowups}
                  </span>
                  <span className={`asgn-agent-health-chip ${toneForResponseRate(agent.responseRatePct)}`}>
                    Response {agent.responseRatePct}%
                  </span>
                  <span className={`asgn-agent-health-chip ${toneForConversion(agent.conversionRatePct)}`}>
                    Conversion {agent.conversionRatePct}%
                  </span>
                </div>
                <p className="asgn-agent-meta">Avg first response: {agent.avgFirstResponseHours}h</p>
                <div className="asgn-stage-tags">
                  {agent.stageDistribution.length > 0 ? (
                    agent.stageDistribution.slice(0, 6).map((stage) => (
                      <span className="asgn-stage-tag" key={`${agent.userId}-${stage.stage}`}>
                        {stage.stage}: {stage.count}
                      </span>
                    ))
                  ) : (
                    <span className="asgn-stage-tag">No stage distribution</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <p className="aflow-empty">No workload data available yet.</p>
      )}
    </Card>
  );
}
