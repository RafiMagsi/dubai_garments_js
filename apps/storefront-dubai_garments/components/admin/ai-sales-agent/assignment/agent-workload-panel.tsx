'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button, Card, CardText, CardTitle } from '@/components/ui';
import { getAgentWorkload } from '@/features/admin/ai-sales-agent/api';
import type { AgentWorkloadEnvelope } from '@/features/admin/ai-sales-agent/types';

export default function AgentWorkloadPanel() {
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
      };
    }

    return data.agents.reduce(
      (acc, agent) => {
        acc.activeLeads += agent.activeLeads;
        acc.activeDeals += agent.activeDeals;
        acc.overdueFollowups += agent.overdueFollowups;
        acc.slaRisks += agent.slaRiskCount;
        return acc;
      },
      { activeLeads: 0, activeDeals: 0, overdueFollowups: 0, slaRisks: 0 }
    );
  }, [data]);

  return (
    <Card className="asgn-workload-card">
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

      {error ? <p className="asgn-error">{error}</p> : null}

      <div className="asgn-workload-kpis">
        <div className="asgn-kpi">
          <span>Active Leads</span>
          <strong>{summary.activeLeads}</strong>
        </div>
        <div className="asgn-kpi">
          <span>Active Deals</span>
          <strong>{summary.activeDeals}</strong>
        </div>
        <div className="asgn-kpi">
          <span>Overdue Follow-ups</span>
          <strong>{summary.overdueFollowups}</strong>
        </div>
        <div className="asgn-kpi">
          <span>SLA Risk Count</span>
          <strong>{summary.slaRisks}</strong>
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
                <p className="asgn-agent-meta">
                  Conversion {agent.conversionRatePct}% · Response {agent.responseRatePct}% · Avg First Response{' '}
                  {agent.avgFirstResponseHours}h
                </p>
                <p className="asgn-agent-meta">
                  Overdue Follow-ups {agent.overdueFollowups} · SLA Risks {agent.slaRiskCount}
                </p>
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

