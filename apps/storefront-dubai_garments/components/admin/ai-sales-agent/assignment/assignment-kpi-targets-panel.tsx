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

function signedPercent(value: number) {
  if (value > 0) return `+${value}%`;
  if (value < 0) return `${value}%`;
  return '0%';
}

function inverseToneClass(value: number) {
  if (value <= 25) return 'is-good';
  if (value <= 45) return 'is-warn';
  return 'is-bad';
}

function hourToneClass(hours: number) {
  if (hours <= 2) return 'is-good';
  if (hours <= 6) return 'is-warn';
  return 'is-bad';
}

function dayToneClass(days: number) {
  if (days <= 3) return 'is-good';
  if (days <= 7) return 'is-warn';
  return 'is-bad';
}

type AssignmentKpiTargetsPanelProps = {
  compact?: boolean;
};

export default function AssignmentKpiTargetsPanel({ compact = false }: AssignmentKpiTargetsPanelProps) {
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

  const riskScore = useMemo(() => {
    if (!data) return 0;
    const stability = 100 - data.reassignmentImpact.reassignmentRatePct;
    const response = data.timeToFirstResponseByAgent.length
      ? Math.round(
          data.timeToFirstResponseByAgent.reduce((sum, item) => sum + item.responseRatePct, 0) /
            data.timeToFirstResponseByAgent.length
        )
      : 0;
    return Math.max(0, Math.min(100, Math.round((top.fairness * 0.4) + (stability * 0.35) + (response * 0.25))));
  }, [data, top.fairness]);

  return (
    <Card className="asgn-kpi-targets-card asgn-kpi-targets-card-twenty">
      {!compact ? (
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
      ) : (
        <div className="asgn-actions">
          <Button type="button" size="sm" variant="secondary" onClick={() => void load()} disabled={loading}>
            {loading ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      )}

      {error ? <p className="asgn-error">{error}</p> : null}

      <div className="asgn-kpi-targets-rail asgn-kpi-targets-rail-twenty">
        <div className={`asgn-kpi-target-chip asgn-kpi-target-chip-main ${toneClass(top.fairness)}`}>
          <span>Assignment Fairness</span>
          <strong>{top.fairness}%</strong>
          <em>Load spread quality across agents</em>
        </div>
        <div className={`asgn-kpi-target-chip ${toneClass(100 - top.reassignmentRate)}`}>
          <span>Reassignment Rate</span>
          <strong>{top.reassignmentRate}%</strong>
          <em>Lower means more stable ownership</em>
        </div>
        <div className={`asgn-kpi-target-chip ${top.winImpact >= 0 ? 'is-good' : 'is-bad'}`}>
          <span>Win-Rate Impact</span>
          <strong>{signedPercent(top.winImpact)}</strong>
          <em>Reassigned vs baseline close-win delta</em>
        </div>
        <div className={`asgn-kpi-target-chip ${toneClass(riskScore)}`}>
          <span>Assignment Health</span>
          <strong>{riskScore}%</strong>
          <em>Composite of fairness, stability, response</em>
        </div>
      </div>

      {!data ? (
        <p className="aflow-empty">No KPI data loaded yet.</p>
      ) : (
        <div className="asgn-kpi-targets-grid">
          <div className="asgn-kpi-targets-panel">
            <p className="aflow-mini-title">1. Time-to-first-response by agent</p>
            <ul className="aflow-mini-list asgn-kpi-list-tight">
              {data.timeToFirstResponseByAgent.slice(0, 6).map((item) => (
                <li key={`tfr-${item.userId}`} className="asgn-kpi-line">
                  <strong>{item.fullName}</strong>
                  <span className={`asgn-kpi-pill ${hourToneClass(item.avgFirstResponseHours)}`}>
                    First response {item.avgFirstResponseHours}h
                  </span>
                  <span className={`asgn-kpi-pill ${toneClass(item.responseRatePct)}`}>
                    Response {item.responseRatePct}%
                  </span>
                  <span className="asgn-kpi-pill is-info">{item.respondedLeadCount} leads</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="asgn-kpi-targets-panel">
            <p className="aflow-mini-title">2. Stage aging by agent</p>
            <ul className="aflow-mini-list asgn-kpi-list-tight">
              {data.stageAgingByAgent.slice(0, 5).map((agent) => (
                <li key={`aging-${agent.userId}`} className="asgn-kpi-line">
                  <strong>{agent.fullName}</strong>
                  {agent.stages.slice(0, 2).map((stage) => (
                    <span key={`${agent.userId}-${stage.stage}`} className={`asgn-kpi-pill ${dayToneClass(stage.avgAgingDays)}`}>
                      {stage.stage} {stage.avgAgingDays}d
                    </span>
                  ))}
                </li>
              ))}
            </ul>
          </div>

          <div className="asgn-kpi-targets-panel">
            <p className="aflow-mini-title">3. Assignment fairness index</p>
            <ul className="aflow-mini-list asgn-kpi-list-tight">
              <li className="asgn-kpi-line">
                <span className={`asgn-kpi-pill ${toneClass(data.assignmentFairnessIndex.score)}`}>
                  Score {data.assignmentFairnessIndex.score}%
                </span>
                <span className="asgn-kpi-pill is-info">Mean {data.assignmentFairnessIndex.meanLoad}</span>
                <span className="asgn-kpi-pill is-info">StdDev {data.assignmentFairnessIndex.stdDevLoad}</span>
              </li>
              <li className="asgn-kpi-line">
                <span className="asgn-kpi-pill is-info">
                Range: {data.assignmentFairnessIndex.minLoad} to {data.assignmentFairnessIndex.maxLoad}
                </span>
              </li>
            </ul>
          </div>

          <div className="asgn-kpi-targets-panel">
            <p className="aflow-mini-title">4. Conversion by owner and stage</p>
            <ul className="aflow-mini-list asgn-kpi-list-tight">
              {data.conversionByOwner.slice(0, 5).map((owner) => (
                <li key={`owner-conv-${owner.userId}`} className="asgn-kpi-line">
                  <strong>{owner.fullName}</strong>
                  <span className={`asgn-kpi-pill ${toneClass(owner.conversionRatePct)}`}>
                    {owner.conversionRatePct}% win
                  </span>
                  <span className="asgn-kpi-pill is-info">
                    {owner.wonDeals}/{owner.closedDeals}
                  </span>
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
            <ul className="aflow-mini-list asgn-kpi-list-tight">
              <li className="asgn-kpi-line">
                <span className={`asgn-kpi-pill ${inverseToneClass(data.reassignmentImpact.reassignmentRatePct)}`}>
                  Reassignment {data.reassignmentImpact.reassignmentRatePct}%
                </span>
                <span className="asgn-kpi-pill is-info">
                  {data.reassignmentImpact.reassignmentCount}/{data.reassignmentImpact.assignmentOpsCount} ops
                </span>
              </li>
              <li className="asgn-kpi-line">
                <span className={`asgn-kpi-pill ${toneClass(data.reassignmentImpact.reassignedClosedWinRatePct)}`}>
                  Reassigned win {data.reassignmentImpact.reassignedClosedWinRatePct}%
                </span>
                <span className={`asgn-kpi-pill ${toneClass(data.reassignmentImpact.baselineClosedWinRatePct)}`}>
                  Baseline win {data.reassignmentImpact.baselineClosedWinRatePct}%
                </span>
                <span className={`asgn-kpi-pill ${data.reassignmentImpact.winRateDeltaPct >= 0 ? 'is-good' : 'is-bad'}`}>
                  Delta {signedPercent(data.reassignmentImpact.winRateDeltaPct)}
                </span>
              </li>
            </ul>
          </div>
        </div>
      )}
    </Card>
  );
}
