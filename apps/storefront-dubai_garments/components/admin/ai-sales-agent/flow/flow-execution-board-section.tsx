'use client';

import { Button, CardText, CardTitle, SelectField, TextField } from '@/components/ui';
import { AisFieldLabel } from '@/components/admin/ai-sales-agent/reusable';
import { FlowBoardCard, FlowTrackCard } from '@/components/admin/ai-sales-agent/flow/flow-cards';
import type { AgentFlowResponse } from '@/features/admin/ai-sales-agent/types';

type FlowExecutionBoardSectionProps = {
  flow: AgentFlowResponse;
  selectedStage: AgentFlowResponse['stages'][number] | null;
  selectedStageEvidence: string[];
  toTitle: (value: string) => string;
  stageStatusLabel: (status: AgentFlowResponse['stages'][number]['status']) => string;
  stageStatusMessage: (status: AgentFlowResponse['stages'][number]['status'], hasEvidence: boolean) => string;
  stageMeterPercent: (status: string) => number;
  onSelectStage: (stageKey: AgentFlowResponse['activeStageKey']) => void;
  getStageActionLink: (stageKey: AgentFlowResponse['activeStageKey']) => { href: string; label: string } | null;
  qualifyBusy: boolean;
  qualifyStatus: string | null;
  qualifyError: string | null;
  triageBusy: boolean;
  triageStatus: string | null;
  triageError: string | null;
  onCompleteQualified: () => void;
  onRunLeadTriage: () => void;
  overrideEnabled: boolean;
  overrideReason: string;
  overrideStageKey: AgentFlowResponse['activeStageKey'];
  overrideForce: boolean;
  onOverrideEnabledChange: (next: boolean) => void;
  onOverrideReasonChange: (next: string) => void;
  onOverrideStageKeyChange: (next: AgentFlowResponse['activeStageKey']) => void;
  onOverrideForceChange: (next: boolean) => void;
};

export function FlowExecutionBoardSection({
  flow,
  selectedStage,
  selectedStageEvidence,
  toTitle,
  stageStatusLabel,
  stageStatusMessage,
  stageMeterPercent,
  onSelectStage,
  getStageActionLink,
  qualifyBusy,
  qualifyStatus,
  qualifyError,
  triageBusy,
  triageStatus,
  triageError,
  onCompleteQualified,
  onRunLeadTriage,
  overrideEnabled,
  overrideReason,
  overrideStageKey,
  overrideForce,
  onOverrideEnabledChange,
  onOverrideReasonChange,
  onOverrideStageKeyChange,
  onOverrideForceChange,
}: FlowExecutionBoardSectionProps) {
  if (flow.stages.length === 0) {
    return (
      <FlowTrackCard>
        <p className="aflow-empty">No flow stages were returned for this query.</p>
      </FlowTrackCard>
    );
  }

  return (
    <FlowBoardCard>
      <div className="aflow-board-head">
        <div>
          <p className="aflow-kicker">Lead-to-Close Execution Board</p>
          <CardTitle>Stage Progression Rail</CardTitle>
        </div>
        <span className="dg-ai-badge dg-ai-badge-slate">Select stage to inspect evidence</span>
      </div>

      <div className="aflow-rail">
        {flow.stages.map((stage) => (
          <button
            key={`rail-${stage.key}`}
            type="button"
            className={`aflow-rail-node is-${stage.status} ${
              selectedStage?.key === stage.key ? 'is-selected' : ''
            }`.trim()}
            onClick={() => onSelectStage(stage.key)}
          >
            <span className="aflow-rail-step">#{stage.order}</span>
            <span className="aflow-rail-label">{stage.label}</span>
            <span className={`aflow-stage-status is-${stage.status}`}>{toTitle(stage.status)}</span>
          </button>
        ))}
      </div>

      {selectedStage ? (
        <div className="aflow-board-grid">
          <section className="aflow-stage-panel">
            <div className="aflow-active-head">
              <div>
                <p className="aflow-kicker">Execution Evidence</p>
                <CardTitle>{selectedStage.label}</CardTitle>
              </div>
              <span className="dg-ai-badge dg-ai-badge-blue">{toTitle(selectedStage.key)}</span>
            </div>
            <div className="aflow-active-head">
              <span className={`aflow-stage-status is-${selectedStage.status}`}>
                {stageStatusLabel(selectedStage.status)}
              </span>
            </div>
            <CardText>{stageStatusMessage(selectedStage.status, selectedStageEvidence.length > 0)}</CardText>
            <CardText>{selectedStage.description}</CardText>
            <div className="aflow-stage-meter">
              <span
                className={`aflow-stage-meter-fill is-${selectedStage.status}`}
                style={{ width: `${stageMeterPercent(selectedStage.status)}%` }}
              />
            </div>
            <div className="aflow-evidence-list">
              {(selectedStageEvidence.length > 0
                ? selectedStageEvidence
                : ['No evidence captured yet for this stage.']).map((item, index) => (
                <div className="aflow-evidence-item" key={`${selectedStage.key}-evidence-${index}`}>
                  {item}
                </div>
              ))}
            </div>
            {getStageActionLink(selectedStage.key) ? (
              <div className="aflow-stage-action-row">
                <a
                  href={getStageActionLink(selectedStage.key)!.href}
                  className="ui-btn ui-btn-secondary ui-btn-sm aflow-link-btn"
                >
                  {getStageActionLink(selectedStage.key)!.label}
                </a>
              </div>
            ) : null}
            {selectedStage.key === 'qualified' &&
            (selectedStage.status === 'active' || selectedStage.status === 'pending') ? (
              <div className="aflow-stage-action-row">
                <Button
                  type="button"
                  size="sm"
                  className="aflow-glow-btn aflow-next-move-btn"
                  onClick={onCompleteQualified}
                  disabled={qualifyBusy}
                >
                  {qualifyBusy ? 'Marking...' : 'Mark Qualified'}
                </Button>
              </div>
            ) : null}
            {selectedStage.key === 'triaged' ? (
              <div className="aflow-stage-action-row">
                <Button
                  type="button"
                  size="sm"
                  className="aflow-glow-btn aflow-next-move-btn"
                  onClick={onRunLeadTriage}
                  disabled={triageBusy}
                >
                  {triageBusy ? 'Running Triage...' : 'Run Lead Triage'}
                </Button>
              </div>
            ) : null}
            {qualifyStatus ? <p className="aflow-next-move-status">{qualifyStatus}</p> : null}
            {qualifyError ? <p className="aflow-next-move-error">{qualifyError}</p> : null}
            {triageStatus ? <p className="aflow-next-move-status">{triageStatus}</p> : null}
            {triageError ? <p className="aflow-next-move-error">{triageError}</p> : null}
          </section>

          <section className="aflow-stage-panel">
            <div className="aflow-override-card">
              <div className="aflow-override-head">
                <p className="aflow-kicker">Manual Override</p>
                <label className="aflow-override-toggle">
                  <input
                    type="checkbox"
                    checked={overrideEnabled}
                    onChange={(event) => onOverrideEnabledChange(event.target.checked)}
                  />
                  <span>Enable</span>
                </label>
              </div>
              {overrideEnabled ? (
                <div className="aflow-override-grid">
                  <div>
                    <AisFieldLabel>Override Stage</AisFieldLabel>
                    <SelectField
                      value={overrideStageKey}
                      onChange={(event) =>
                        onOverrideStageKeyChange(event.target.value as AgentFlowResponse['activeStageKey'])
                      }
                      className="dg-mt-1"
                    >
                      {flow.stages.map((stage) => (
                        <option key={`override-stage-${stage.key}`} value={stage.key}>
                          {stage.order}. {stage.label}
                        </option>
                      ))}
                    </SelectField>
                  </div>
                  <div>
                    <AisFieldLabel>Reason (required)</AisFieldLabel>
                    <TextField
                      value={overrideReason}
                      onChange={(event) => onOverrideReasonChange(event.target.value)}
                      placeholder="Explain why this override is needed..."
                      className="dg-mt-1"
                    />
                  </div>
                  <label className="aflow-override-force">
                    <input
                      type="checkbox"
                      checked={overrideForce}
                      onChange={(event) => onOverrideForceChange(event.target.checked)}
                    />
                    <span>Force override if previous stages are incomplete</span>
                  </label>
                </div>
              ) : (
                <p className="aflow-empty">Run normal active-stage orchestration without override.</p>
              )}
            </div>
          </section>
        </div>
      ) : (
        <p className="aflow-empty">No stage selected yet.</p>
      )}
    </FlowBoardCard>
  );
}
