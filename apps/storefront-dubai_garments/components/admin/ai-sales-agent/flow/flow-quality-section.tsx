'use client';

import { CardTitle } from '@/components/ui';
import { FlowQualityCard } from '@/components/admin/ai-sales-agent/flow/flow-cards';
import type { AgentFlowResponse } from '@/features/admin/ai-sales-agent/types';

type FlowQualitySectionProps = {
  flow: AgentFlowResponse;
};

export function FlowQualitySection({ flow }: FlowQualitySectionProps) {
  return (
    <FlowQualityCard>
      <div className="aflow-quality-head">
        <div>
          <p className="aflow-kicker">Outcome Quality Controls</p>
          <CardTitle>SLAs, Transition Guardrails, and Close-Loop Summary</CardTitle>
        </div>
      </div>
      <div className="aflow-quality-grid">
        <section className="aflow-quality-panel">
          <p className="aflow-mini-title">Stage SLA Alerts</p>
          {flow.stageSlaAlerts.length > 0 ? (
            <ul className="aflow-mini-list">
              {flow.stageSlaAlerts.map((alert, index) => (
                <li key={`sla-${index}`}>
                  <span
                    className={`dg-ai-badge ${
                      alert.severity === 'critical' ? 'dg-ai-badge-red' : 'dg-ai-badge-amber'
                    }`}
                  >
                    {alert.severity}
                  </span>{' '}
                  {alert.stageLabel}: {alert.elapsedHours}h / SLA {alert.slaHours}h
                </li>
              ))}
            </ul>
          ) : (
            <p className="aflow-empty">No SLA alerts. Active stages are within target windows.</p>
          )}
        </section>

        <section className="aflow-quality-panel">
          <p className="aflow-mini-title">Transition Guardrails</p>
          {flow.transitionGuardrails.length > 0 ? (
            <ul className="aflow-mini-list">
              {flow.transitionGuardrails.map((rule, index) => (
                <li key={`guard-${index}`}>
                  <span className={`dg-ai-badge ${rule.passed ? 'dg-ai-badge-green' : 'dg-ai-badge-red'}`}>
                    {rule.passed ? 'pass' : 'block'}
                  </span>{' '}
                  {rule.rule}: {rule.message}
                </li>
              ))}
            </ul>
          ) : (
            <p className="aflow-empty">No transition guardrails configured yet.</p>
          )}
        </section>

        <section className="aflow-quality-panel">
          <p className="aflow-mini-title">Close-Loop Summary</p>
          <p className="aflow-empty">
            <strong>Result:</strong> {flow.closeLoopSummary.result}
          </p>
          <div className="aflow-mini-stack">
            <div className="aflow-mini-card">
              <p className="aflow-mini-title">AI did</p>
              <ul className="aflow-mini-list">
                {flow.closeLoopSummary.aiActions.map((item, index) => (
                  <li key={`close-ai-${index}`}>{item}</li>
                ))}
              </ul>
            </div>
            <div className="aflow-mini-card">
              <p className="aflow-mini-title">Human changed</p>
              <ul className="aflow-mini-list">
                {flow.closeLoopSummary.humanChanges.map((item, index) => (
                  <li key={`close-human-${index}`}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </div>
    </FlowQualityCard>
  );
}
