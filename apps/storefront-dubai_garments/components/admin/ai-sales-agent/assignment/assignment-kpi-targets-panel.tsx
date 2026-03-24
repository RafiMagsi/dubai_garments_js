'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button, Card, CardText, CardTitle } from '@/components/ui';
import { getAssignmentKpiTargets } from '@/features/admin/ai-sales-agent/api';
import type { AssignmentKpiTargetsEnvelope } from '@/features/admin/ai-sales-agent/types';

function toneClass(value: number) {
  if (value >= 75) return 'is-good';
  if (value >= 45) return 'is-warn';
  return 'is-bad';
}

export default function AssignmentKpiTargetsPanel() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AssignmentKpiTargetsEnvelope | null>(null);

  async function load() {
    try {
      setLoading(true);
      setError(null);
      const result = await getAssignmentKpiTargets();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load assignment KPI targets.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const top = useMemo(() => {
    if (!data) {
      return {
        fairness: 0,
        reassignmentRate: 0,
        winImpact: 0,
      };
    }
    return {
      fairness: data.assignmentFairnessIndex.score,
      reassignmentRate: data.reassignmentImpact.reassignmentRatePct,
      winImpact: data.reassignmentImpact.winRateDeltaPct,
    };
  }, [data]);

  return (
    <Card className="asgn-kpi-targets-card">
      <div className="asgn-kpi-targets-head">
        <div>
          <p className="aflow-kicker">Additional KPI Targets</p>
          <CardTitle>Assignment Performance and Reliability Metrics</CardTitle>
          <CardText>
            Time-to-first-response, stage aging, fairness, conversion, and reassignment impact for manager-level control.
          </CardText>
        </div>
        <Button type="button" size="sm" variant="secondary" onClick={() => void load()} disabled={loading}>
          {loading ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {error ? <p className="asgn-error">{error}</p> : null}

      <div className="asgn-kpi-targets-rail">
        <div className={`asgn-kpi-target-chip ${toneClass(top.fairness)}`}>
          <span>Assignment Fairness Index</span>
          <strong>{top.fairness}%</strong>
        </div>
        <div className={`asgn-kpi-target-chip ${toneClass(100 - top.reassignmentRate)}`}>
          <span>Reassignment Rate</span>
          <strong>{top.reassignmentRate}%</strong>
        </div>
        <div className={`asgn-kpi-target-chip ${toneClass(top.winImpact + 50)}`}>
          <span>Win-Rate Impact</span>
          <strong>{top.winImpact}%</strong>
        </div>
      </div>

      {!data ? (
        <p className="aflow-empty">No KPI data loaded yet.</p>
      ) : (
        <div className="asgn-kpi-targets-grid">
          <div className="asgn-kpi-targets-panel">
            <p className="aflow-mini-title">1. Time-to-first-response by agent</p>
            <ul className="aflow-mini-list">
              {data.timeToFirstResponseByAgent.slice(0, 6).map((item) => (
                <li key={`tfr-${item.userId}`}>
                  {item.fullName}: {item.avgFirstResponseHours}h avg · {item.responseRatePct}% response ({item.respondedLeadCount} leads)
                </li>
              ))}
            </ul>
          </div>

          <div className="asgn-kpi-targets-panel">
            <p className="aflow-mini-title">2. Stage aging by agent</p>
            <ul className="aflow-mini-list">
              {data.stageAgingByAgent.slice(0, 5).map((agent) => (
                <li key={`aging-${agent.userId}`}>
                  {agent.fullName}: {agent.stages.slice(0, 2).map((stage) => `${stage.stage} ${stage.avgAgingDays}d`).join(' · ')}
                </li>
              ))}
            </ul>
          </div>

          <div className="asgn-kpi-targets-panel">
            <p className="aflow-mini-title">3. Assignment fairness index</p>
            <ul className="aflow-mini-list">
              <li>Score: {data.assignmentFairnessIndex.score}%</li>
              <li>Mean load: {data.assignmentFairnessIndex.meanLoad}</li>
              <li>StdDev load: {data.assignmentFairnessIndex.stdDevLoad}</li>
              <li>
                Range: {data.assignmentFairnessIndex.minLoad} to {data.assignmentFairnessIndex.maxLoad}
              </li>
            </ul>
          </div>

          <div className="asgn-kpi-targets-panel">
            <p className="aflow-mini-title">4. Conversion by owner and stage</p>
            <ul className="aflow-mini-list">
              {data.conversionByOwner.slice(0, 5).map((owner) => (
                <li key={`owner-conv-${owner.userId}`}>
                  {owner.fullName}: {owner.conversionRatePct}% ({owner.wonDeals}/{owner.closedDeals})
                </li>
              ))}
            </ul>
            <div className="asgn-stage-tags dg-mt-2">
              {data.conversionByStage.slice(0, 6).map((stage) => (
                <span className="asgn-stage-tag" key={`stage-conv-${stage.stage}`}>
                  {stage.stage}: {stage.conversionRatePct}%
                </span>
              ))}
            </div>
          </div>

          <div className="asgn-kpi-targets-panel">
            <p className="aflow-mini-title">5. Reassignment rate and impact on win-rate</p>
            <ul className="aflow-mini-list">
              <li>
                Reassignment rate: {data.reassignmentImpact.reassignmentRatePct}% ({data.reassignmentImpact.reassignmentCount}/
                {data.reassignmentImpact.assignmentOpsCount})
              </li>
              <li>Reassigned closed win-rate: {data.reassignmentImpact.reassignedClosedWinRatePct}%</li>
              <li>Baseline closed win-rate: {data.reassignmentImpact.baselineClosedWinRatePct}%</li>
              <li>Delta: {data.reassignmentImpact.winRateDeltaPct}%</li>
            </ul>
          </div>
        </div>
      )}
    </Card>
  );
}
