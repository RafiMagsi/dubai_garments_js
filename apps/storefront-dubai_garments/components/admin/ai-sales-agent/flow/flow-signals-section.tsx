'use client';

import { CardText, CardTitle } from '@/components/ui';
import { FlowSignalsCard } from '@/components/admin/ai-sales-agent/flow/flow-cards';
import type { AgentFlowResponse } from '@/features/admin/ai-sales-agent/types';

type FlowSignalsSectionProps = {
  flow: AgentFlowResponse;
  toTitle: (value: string) => string;
  markerTypeMeta: (type: AgentFlowResponse['markers'][number]['type']) => { label: string; cls: string };
};

export function FlowSignalsSection({ flow, toTitle, markerTypeMeta }: FlowSignalsSectionProps) {
  return (
    <FlowSignalsCard>
      <div className="aflow-signals-head">
        <div>
          <CardTitle>Flow Signals Sidebar</CardTitle>
          <CardText>Compact AI + automation + human oversight signals.</CardText>
        </div>
        <span className="dg-ai-badge dg-ai-badge-slate">{flow.markers.length} signals</span>
      </div>

      <div className="aflow-signals-grid">
        <section className="aflow-signals-panel is-markers">
          <p className="aflow-kicker">Action Markers</p>
          {flow.markers.length > 0 ? (
            <ul className="aflow-signals-list">
              {flow.markers.map((marker, index) => {
                const meta = markerTypeMeta(marker.type);
                return (
                  <li className="aflow-signal-item" key={`marker-${index}`}>
                    <span className={`aflow-signal-tag ${meta.cls}`}>{meta.label}</span>
                    <div className="aflow-signal-copy">
                      <p className="aflow-signal-title">{marker.label}</p>
                      <p className="aflow-signal-text">{marker.details}</p>
                      <p className="aflow-signal-meta">Stage: {toTitle(marker.stageKey)}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="aflow-empty">No flow markers detected.</p>
          )}
        </section>

        <section className="aflow-signals-panel is-human">
          <p className="aflow-kicker">Human + Approvals</p>
          <div className="aflow-mini-stack">
            <div className="aflow-mini-card">
              <p className="aflow-mini-title">Human Checkpoints</p>
              {flow.humanCheckpoints.length > 0 ? (
                <ul className="aflow-mini-list">
                  {flow.humanCheckpoints.map((item, index) => (
                    <li key={`checkpoint-${index}`}>{item}</li>
                  ))}
                </ul>
              ) : (
                <p className="aflow-empty">No human checkpoints detected yet.</p>
              )}
            </div>
            <div className="aflow-mini-card">
              <p className="aflow-mini-title">Pending Approvals</p>
              {flow.pendingApprovals.length > 0 ? (
                <ul className="aflow-mini-list">
                  {flow.pendingApprovals.map((item, index) => (
                    <li key={`approval-${index}`}>{item}</li>
                  ))}
                </ul>
              ) : (
                <p className="aflow-empty">No pending approvals detected.</p>
              )}
            </div>
          </div>
        </section>

        <section className="aflow-signals-panel is-confidence">
          <p className="aflow-kicker">Confidence Trend</p>
          {flow.confidenceTrend.length > 0 ? (
            <div className="aflow-confidence-list">
              {flow.confidenceTrend.map((point, index) => (
                <div className="aflow-confidence-row" key={`confidence-${index}`}>
                  <div className="aflow-confidence-top">
                    <span>{point.label}</span>
                    <span>{point.value}%</span>
                  </div>
                  <div className="aflow-confidence-track">
                    <div className="aflow-confidence-fill" style={{ width: `${point.value}%` }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="aflow-empty">No confidence trend points available.</p>
          )}
        </section>

        <section className="aflow-signals-panel is-risk">
          <p className="aflow-kicker">Risk Hints</p>
          {flow.riskHints.length > 0 ? (
            <ul className="aflow-mini-list is-risk">
              {flow.riskHints.map((hint, index) => (
                <li key={`risk-${index}`}>{hint}</li>
              ))}
            </ul>
          ) : (
            <p className="aflow-empty">No major risk hints detected.</p>
          )}
        </section>
      </div>
    </FlowSignalsCard>
  );
}
