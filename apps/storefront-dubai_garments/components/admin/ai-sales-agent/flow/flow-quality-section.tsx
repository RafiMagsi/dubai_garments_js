'use client';

import { CardText, CardTitle } from '@/components/ui';
import { FlowQualityCard } from '@/components/admin/ai-sales-agent/flow/flow-cards';
import type { AgentFlowResponse } from '@/features/admin/ai-sales-agent/types';

type FlowQualitySectionProps = {
  flow: AgentFlowResponse;
};

export function FlowQualitySection({ flow }: FlowQualitySectionProps) {
  const criticalAlerts = flow.stageSlaAlerts.filter((alert) => alert.severity === 'critical');
  const warningAlerts = flow.stageSlaAlerts.filter((alert) => alert.severity === 'warning');
  const failedGuardrails = flow.transitionGuardrails.filter((rule) => !rule.passed);
  const passedGuardrails = flow.transitionGuardrails.filter((rule) => rule.passed);

  const sortedAlerts = [...flow.stageSlaAlerts].sort((a, b) => {
    const severityWeight = (severity: 'warning' | 'critical') => (severity === 'critical' ? 0 : 1);
    const severityDiff = severityWeight(a.severity) - severityWeight(b.severity);
    if (severityDiff !== 0) return severityDiff;
    const aDelta = a.elapsedHours - a.slaHours;
    const bDelta = b.elapsedHours - b.slaHours;
    return bDelta - aDelta;
  });

  const priorityTone: 'critical' | 'warning' | 'healthy' =
    criticalAlerts.length > 0 || failedGuardrails.length > 0
      ? 'critical'
      : warningAlerts.length > 0
        ? 'warning'
        : 'healthy';

  const priorityMessage =
    sortedAlerts[0]?.message ??
    failedGuardrails[0]?.message ??
    'Quality checks are healthy. Continue progressing stages with normal cadence.';

  const qualityReadinessLabel =
    priorityTone === 'critical'
      ? 'Action Required'
      : priorityTone === 'warning'
        ? 'Watch Closely'
        : 'Healthy';

  const outcomeSource =
    flow.outcomeSummary.source === 'deal'
      ? 'Deal'
      : flow.outcomeSummary.source === 'lead'
        ? 'Lead'
        : 'Unmapped';

  return (
    <FlowQualityCard>
      <div className="aflow-quality-head">
        <div>
          <p className="aflow-kicker">Outcome Quality Controls</p>
          <CardTitle>Quality Command Center</CardTitle>
          <CardText>Clear risk visibility for SLA breaches, transition blockers, and outcome reporting quality.</CardText>
        </div>
        <span
          className={`dg-ai-badge ${
            priorityTone === 'critical'
              ? 'dg-ai-badge-red'
              : priorityTone === 'warning'
                ? 'dg-ai-badge-amber'
                : 'dg-ai-badge-green'
          }`}
        >
          {qualityReadinessLabel}
        </span>
      </div>

      <div className={`aflow-quality-priority is-${priorityTone}`}>
        <p className="aflow-mini-title">Priority Focus</p>
        <p className="aflow-empty">{priorityMessage}</p>
      </div>

      <div className="aflow-quality-kpi-rail">
        <div className="aflow-quality-kpi">
          <p className="aflow-quality-kpi-label">Critical SLA</p>
          <p className="aflow-quality-kpi-value">{criticalAlerts.length}</p>
        </div>
        <div className="aflow-quality-kpi">
          <p className="aflow-quality-kpi-label">Warning SLA</p>
          <p className="aflow-quality-kpi-value">{warningAlerts.length}</p>
        </div>
        <div className="aflow-quality-kpi">
          <p className="aflow-quality-kpi-label">Guardrails Blocking</p>
          <p className="aflow-quality-kpi-value">{failedGuardrails.length}</p>
        </div>
        <div className="aflow-quality-kpi">
          <p className="aflow-quality-kpi-label">Outcome State</p>
          <p className="aflow-quality-kpi-value">{flow.outcomeSummary.outcome.toUpperCase()}</p>
        </div>
      </div>

      <div className="aflow-quality-grid">
        <section className="aflow-quality-panel">
          <p className="aflow-mini-title">SLA Monitor</p>
          {sortedAlerts.length > 0 ? (
            <div className="aflow-quality-stream">
              {sortedAlerts.map((alert, index) => (
                <div key={`sla-${index}`} className="aflow-quality-item">
                  <div className="aflow-quality-item-top">
                    <span
                      className={`dg-ai-badge ${
                        alert.severity === 'critical' ? 'dg-ai-badge-red' : 'dg-ai-badge-amber'
                      }`}
                    >
                      {alert.severity}
                    </span>
                    <strong>{alert.stageLabel}</strong>
                  </div>
                  <p className="aflow-empty">{alert.message}</p>
                  <p className="aflow-quality-item-meta">
                    {alert.elapsedHours}h elapsed • SLA target {alert.slaHours}h
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="aflow-empty">No SLA alerts. Active stages are within target windows.</p>
          )}
        </section>

        <section className="aflow-quality-panel">
          <p className="aflow-mini-title">Transition Guardrails</p>
          {flow.transitionGuardrails.length > 0 ? (
            <div className="aflow-quality-stream">
              {failedGuardrails.length > 0 ? (
                failedGuardrails.map((rule, index) => (
                  <div key={`guard-fail-${index}`} className="aflow-quality-item">
                    <div className="aflow-quality-item-top">
                      <span className="dg-ai-badge dg-ai-badge-red">block</span>
                      <strong>{rule.rule}</strong>
                    </div>
                    <p className="aflow-empty">{rule.message}</p>
                  </div>
                ))
              ) : (
                <p className="aflow-empty">No blocking guardrails detected.</p>
              )}
              {passedGuardrails.length > 0 ? (
                <p className="aflow-quality-item-meta">
                  {passedGuardrails.length} additional guardrails are currently passing.
                </p>
              ) : null}
            </div>
          ) : (
            <p className="aflow-empty">No transition guardrails configured yet.</p>
          )}
        </section>

        <section className="aflow-quality-panel">
          <p className="aflow-mini-title">Close-Loop Summary</p>
          <div className="aflow-quality-outcome">
            <div className="aflow-quality-item-top">
              <span className="dg-ai-badge dg-ai-badge-slate">{flow.outcomeSummary.outcome}</span>
              <strong>Source: {outcomeSource}</strong>
            </div>
            <p className="aflow-empty">{flow.closeLoopSummary.result}</p>
            <p className="aflow-quality-item-meta">
              {flow.outcomeSummary.updatedAt
                ? `Updated: ${new Date(flow.outcomeSummary.updatedAt).toLocaleString()}`
                : 'Updated: pending'}
            </p>
            {flow.outcomeSummary.reason ? (
              <p className="aflow-quality-item-meta">Reason: {flow.outcomeSummary.reason}</p>
            ) : null}
          </div>
          <div className="aflow-mini-stack">
            <div className="aflow-mini-card">
              <p className="aflow-mini-title">AI did</p>
              {flow.closeLoopSummary.aiActions.length > 0 ? (
                <ul className="aflow-mini-list">
                  {flow.closeLoopSummary.aiActions.map((item, index) => (
                    <li key={`close-ai-${index}`}>{item}</li>
                  ))}
                </ul>
              ) : (
                <p className="aflow-empty">No AI actions recorded yet.</p>
              )}
            </div>
            <div className="aflow-mini-card">
              <p className="aflow-mini-title">Human changed</p>
              {flow.closeLoopSummary.humanChanges.length > 0 ? (
                <ul className="aflow-mini-list">
                  {flow.closeLoopSummary.humanChanges.map((item, index) => (
                    <li key={`close-human-${index}`}>{item}</li>
                  ))}
                </ul>
              ) : (
                <p className="aflow-empty">No human edits recorded yet.</p>
              )}
            </div>
          </div>
        </section>
      </div>
    </FlowQualityCard>
  );
}
