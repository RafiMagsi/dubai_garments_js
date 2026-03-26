'use client';

import { FlowHeroCard } from '@/components/admin/ai-sales-agent/flow/flow-cards';
import type { AgentFlowResponse } from '@/features/admin/ai-sales-agent/types';

type FlowHeroSectionProps = {
  flow: AgentFlowResponse;
  activeStage: AgentFlowResponse['stages'][number] | null;
  completionPercent: number;
  completedCount: number;
  pendingCount: number;
  blockedCount: number;
  flowHealth: { label: string; cls: string };
  toTitle: (value: string) => string;
};

export function FlowHeroSection({
  flow,
  activeStage,
  completionPercent,
  completedCount,
  pendingCount,
  blockedCount,
  flowHealth,
  toTitle,
}: FlowHeroSectionProps) {
  return (
    <FlowHeroCard>
      <div className="dg-ai-intel-hero-body">
        <div className="dg-ai-intel-header">
          <div className="dg-ai-intel-title">
            <p className="aflow-kicker">AI Flow Intelligence</p>
            <h3 className="aflow-decision-title">{activeStage ? activeStage.label : 'Flow Snapshot'}</h3>
            <p className="aflow-decision-subtitle">{activeStage ? activeStage.description : flow.summary}</p>
          </div>

          <div className="dg-ai-intel-chip-row dg-ai-intel-meta-right">
            <span className={`dg-ai-badge ${flowHealth.cls}`}>{flowHealth.label}</span>
            <span className="dg-ai-badge dg-ai-badge-blue">Active {activeStage ? toTitle(activeStage.key) : 'n/a'}</span>
            <span className="dg-ai-badge dg-ai-badge-slate">Lead {flow.leadId ? 'Linked' : 'N/A'}</span>
            <span className="dg-ai-badge dg-ai-badge-slate">Deal {flow.dealId ? 'Linked' : 'N/A'}</span>
          </div>
        </div>

        <div className="aflow-progress-wrap">
          <div className="dg-ai-intel-progress-track">
            <div className="dg-ai-intel-progress-fill is-good" style={{ width: `${completionPercent}%` }} />
          </div>
        </div>

        <div className="aflow-trend-grid">
          <div className="aflow-trend-chip is-good">
            <span className="aflow-trend-label">Completed</span>
            <span className="aflow-trend-value">{completedCount}/{flow.stages.length}</span>
          </div>
          <div className="aflow-trend-chip is-info">
            <span className="aflow-trend-label">Pending</span>
            <span className="aflow-trend-value">{pendingCount}</span>
          </div>
          <div className="aflow-trend-chip is-warn">
            <span className="aflow-trend-label">Blocked</span>
            <span className="aflow-trend-value">{blockedCount}</span>
          </div>
          <div className="aflow-trend-chip is-cold">
            <span className="aflow-trend-label">Active Stage</span>
            <span className="aflow-trend-value">{activeStage ? `Step ${activeStage.order}` : 'None'}</span>
          </div>
        </div>
      </div>
    </FlowHeroCard>
  );
}
