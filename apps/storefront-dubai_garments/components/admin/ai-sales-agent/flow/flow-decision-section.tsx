'use client';

import { Button } from '@/components/ui';
import { FlowDecisionCard } from '@/components/admin/ai-sales-agent/flow/flow-cards';
import type { AgentFlowResponse } from '@/features/admin/ai-sales-agent/types';

type FlowDecisionSectionProps = {
  flow: AgentFlowResponse;
  activeStage: AgentFlowResponse['stages'][number] | null;
  toTitle: (value: string) => string;
  nextMoveBusy: boolean;
  nextMoveLabel: string;
  overrideEnabled: boolean;
  overrideReason: string;
  nextMoveStatus: string | null;
  nextMoveError: string | null;
  blockerBusy: string | null;
  blockerStatus: string | null;
  blockerError: string | null;
  onRunNextMove: () => void;
  onResolveBlocker: (blocker: string) => void;
  getStageActionLink: (stageKey: AgentFlowResponse['activeStageKey']) => { href: string; label: string } | null;
};

export function FlowDecisionSection({
  flow,
  activeStage,
  toTitle,
  nextMoveBusy,
  nextMoveLabel,
  overrideEnabled,
  overrideReason,
  nextMoveStatus,
  nextMoveError,
  blockerBusy,
  blockerStatus,
  blockerError,
  onRunNextMove,
  onResolveBlocker,
  getStageActionLink,
}: FlowDecisionSectionProps) {
  return (
    <FlowDecisionCard>
      <div className="aflow-decision-grid">
        <section className="aflow-decision-panel is-blockers">
          <div className="aflow-decision-panel-head">
            <p className="aflow-kicker">Flow Blockers</p>
            <span className={`dg-ai-badge ${flow.blockers.length > 0 ? 'dg-ai-badge-red' : 'dg-ai-badge-green'}`}>
              {flow.blockers.length > 0 ? `${flow.blockers.length} detected` : 'Clear'}
            </span>
          </div>
          {flow.blockers.length > 0 ? (
            <ul className="aflow-list">
              {flow.blockers.map((item, index) => (
                <li key={`blocker-${index}`} className="aflow-blocker-item">
                  <span className="aflow-blocker-copy">{item}</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="aflow-glow-btn aflow-resolve-btn"
                    onClick={() => onResolveBlocker(item)}
                    disabled={blockerBusy === item}
                  >
                    {blockerBusy === item ? 'Resolving...' : 'Resolve'}
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="aflow-empty">No blockers detected.</p>
          )}
          {blockerStatus ? <p className="aflow-next-move-status">{blockerStatus}</p> : null}
          {blockerError ? <p className="aflow-next-move-error">{blockerError}</p> : null}
        </section>
        <section className="aflow-decision-panel is-next-move">
          <div className="aflow-decision-panel-head">
            <p className="aflow-kicker">Recommended Next Move</p>
            <span className="dg-ai-badge dg-ai-badge-blue">
              {activeStage ? toTitle(activeStage.key) : flow.completionPercent >= 100 ? 'Completed' : 'Manual'}
            </span>
          </div>
          <div className="aflow-next-move">{flow.recommendedNextMove}</div>
          <div className="aflow-next-move-actions">
            <div className="aflow-next-move-cta-row">
              <Button
                type="button"
                size="sm"
                className="aflow-glow-btn aflow-next-move-btn"
                onClick={onRunNextMove}
                disabled={nextMoveBusy || (overrideEnabled && !overrideReason.trim())}
              >
                {nextMoveBusy ? 'Running...' : nextMoveLabel}
              </Button>
              {flow.activeStageKey &&
              flow.activeStageKey !== 'post_outcome' &&
              getStageActionLink(flow.activeStageKey) ? (
                <a
                  href={getStageActionLink(flow.activeStageKey)!.href}
                  className="ui-btn ui-btn-primary ui-btn-sm aflow-link-btn"
                >
                  {getStageActionLink(flow.activeStageKey)!.label}
                </a>
              ) : null}
            </div>
            {nextMoveStatus ? <p className="aflow-next-move-status">{nextMoveStatus}</p> : null}
            {nextMoveError ? <p className="aflow-next-move-error">{nextMoveError}</p> : null}
          </div>
        </section>
      </div>
    </FlowDecisionCard>
  );
}
