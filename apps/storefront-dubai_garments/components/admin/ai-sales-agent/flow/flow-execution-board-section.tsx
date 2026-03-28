'use client';

import { useMemo, useState } from 'react';
import { Button, CardText, CardTitle, SelectField, TextField } from '@/components/ui';
import { AisFieldLabel } from '@/components/admin/ai-sales-agent/reusable';
import { FlowBoardCard, FlowTrackCard } from '@/components/admin/ai-sales-agent/flow/flow-cards';
import type { AgentFlowResponse } from '@/features/admin/ai-sales-agent/types';
import type { ConvertLeadToDealInput } from '@/features/admin/deals/types/deal.types';
import type { FlowStageGuidance } from '@/lib/ai-sales-agent/flow/stage-guidance';
import Modal from '@/components/ui/modal';

type FlowExecutionBoardSectionProps = {
  flow: AgentFlowResponse;
  selectedStage: AgentFlowResponse['stages'][number] | null;
  selectedStageEvidence: string[];
  toTitle: (value: string) => string;
  stageStatusLabel: (status: AgentFlowResponse['stages'][number]['status']) => string;
  stageStatusMessage: (
    status: AgentFlowResponse['stages'][number]['status'],
    hasEvidence: boolean,
    stageKey: AgentFlowResponse['activeStageKey']
  ) => string;
  stageMeterPercent: (status: string) => number;
  onSelectStage: (stageKey: AgentFlowResponse['activeStageKey']) => void;
  getStageActionLink: (stageKey: AgentFlowResponse['activeStageKey']) => { href: string; label: string } | null;
  selectedStageGuidance: FlowStageGuidance | null;
  markCloseBusy: boolean;
  postOutcomeStatus: string | null;
  postOutcomeError: string | null;
  qualifyBusy: boolean;
  qualifyStatus: string | null;
  qualifyError: string | null;
  triageBusy: boolean;
  triageStatus: string | null;
  triageError: string | null;
  outcomeActionBusy: 'won' | 'lost' | null;
  outcomeActionStatus: string | null;
  outcomeActionError: string | null;
  dealActionBusy: boolean;
  dealActionStatus: string | null;
  dealActionError: string | null;
  sessionUserId?: string;
  onCompleteQualified: () => void;
  onRunLeadTriage: () => void;
  onMarkClosed: () => void;
  onMarkOutcome: (stage: 'won' | 'lost') => void;
  onCreateDeal: (payload: ConvertLeadToDealInput) => void;
  onOpenCreateQuoteModal?: () => void;
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
  selectedStageGuidance,
  markCloseBusy,
  postOutcomeStatus,
  postOutcomeError,
  qualifyBusy,
  qualifyStatus,
  qualifyError,
  triageBusy,
  triageStatus,
  triageError,
  outcomeActionBusy,
  outcomeActionStatus,
  outcomeActionError,
  dealActionBusy,
  dealActionStatus,
  dealActionError,
  sessionUserId,
  onCompleteQualified,
  onRunLeadTriage,
  onMarkClosed,
  onMarkOutcome,
  onCreateDeal,
  onOpenCreateQuoteModal,
  overrideEnabled,
  overrideReason,
  overrideStageKey,
  overrideForce,
  onOverrideEnabledChange,
  onOverrideReasonChange,
  onOverrideStageKeyChange,
  onOverrideForceChange,
}: FlowExecutionBoardSectionProps) {
  const selectedStageActionLink = selectedStage ? getStageActionLink(selectedStage.key) : null;
  const isQuoteGuidance = selectedStageGuidance?.theme === 'quote';
  const outcome = flow.outcomeSummary;
  const [createDealModalOpen, setCreateDealModalOpen] = useState(false);
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [ownerMode, setOwnerMode] = useState<'self' | 'unassigned'>('self');
  const [valueEstimate, setValueEstimate] = useState('');
  const [notes, setNotes] = useState('');
  const probability = useMemo(() => {
    if (priority === 'high') return 75;
    if (priority === 'low') return 30;
    return 50;
  }, [priority]);

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
            <CardText>{stageStatusMessage(selectedStage.status, selectedStageEvidence.length > 0, selectedStage.key)}</CardText>
            <CardText>{selectedStage.description}</CardText>
            {selectedStageGuidance ? (
              <div className={`aflow-stage-guidance ${isQuoteGuidance ? 'is-quote' : ''}`.trim()}>
                <div className="aflow-stage-guidance-top">
                  <p className="aflow-kicker">Stage Guidance</p>
                  {isQuoteGuidance ? <span className="dg-ai-badge dg-ai-badge-blue">Quote Playbook</span> : null}
                </div>
                <p className="aflow-stage-guidance-headline">{selectedStageGuidance.headline}</p>
                <ul className="aflow-guidance-list">
                  <li>
                    <strong>What to do:</strong> {selectedStageGuidance.actionHint}
                  </li>
                  <li>
                    <strong>What happens:</strong> {selectedStageGuidance.expectedResult}
                  </li>
                  <li>
                    <strong>Done when:</strong> {selectedStageGuidance.completionSignal}
                  </li>
                </ul>
                {isQuoteGuidance && selectedStageGuidance.playbook.length > 0 ? (
                  <div className="aflow-quote-playbook">
                    {selectedStageGuidance.playbook.map((step, index) => (
                      <div className="aflow-quote-playbook-step" key={`${selectedStage.key}-playbook-${index}`}>
                        <span className="aflow-quote-playbook-dot">{index + 1}</span>
                        <span>{step}</span>
                      </div>
                    ))}
                  </div>
                ) : null}
                {selectedStageGuidance.scenarios.length > 0 ? (
                  <ul className="aflow-guidance-scenarios">
                    {selectedStageGuidance.scenarios.slice(0, 2).map((item, index) => (
                      <li key={`${selectedStage.key}-scenario-${index}`}>{item}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}
            {selectedStage.key === 'won_lost' ? (
              <div className="aflow-outcome-summary">
                <div className="aflow-outcome-summary-head">
                  <p className="aflow-kicker">Outcome Summary</p>
                  <span
                    className={`dg-ai-badge ${
                      outcome.outcome === 'won'
                        ? 'dg-ai-badge-green'
                        : outcome.outcome === 'lost'
                        ? 'dg-ai-badge-red'
                        : 'dg-ai-badge-slate'
                    }`}
                  >
                    {outcome.outcome === 'pending' ? 'Pending' : toTitle(outcome.outcome)}
                  </span>
                </div>
                <div className="aflow-outcome-grid">
                  <div className="aflow-outcome-row">
                    <span>Source</span>
                    <strong>{toTitle(outcome.source)}</strong>
                  </div>
                  <div className="aflow-outcome-row">
                    <span>Current Stage</span>
                    <strong>{outcome.stage ? toTitle(String(outcome.stage)) : '-'}</strong>
                  </div>
                  <div className="aflow-outcome-row">
                    <span>Updated At</span>
                    <strong>{outcome.updatedAt ? new Date(outcome.updatedAt).toLocaleString() : '-'}</strong>
                  </div>
                  <div className="aflow-outcome-row">
                    <span>Reason</span>
                    <strong>{outcome.reason || '-'}</strong>
                  </div>
                </div>
              </div>
            ) : null}
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
            {(selectedStage.key === 'quote_ready' || selectedStage.key === 'quote_sent') &&
            onOpenCreateQuoteModal &&
            !flow.quoteId ? (
              <div className="aflow-stage-action-row">
                <Button
                  type="button"
                  size="sm"
                  className="aflow-glow-btn aflow-next-move-btn"
                  onClick={onOpenCreateQuoteModal}
                >
                  Create Quote
                </Button>
              </div>
            ) : null}
            {selectedStageActionLink &&
            selectedStage.key !== 'deal_open' &&
            selectedStage.key !== 'won_lost' &&
            selectedStage.key !== 'post_outcome' &&
            !(
              onOpenCreateQuoteModal &&
              (selectedStage.key === 'quote_ready' || selectedStage.key === 'quote_sent') &&
              !flow.quoteId
            ) ? (
              <div className="aflow-stage-action-row">
                <a
                  href={selectedStageActionLink.href}
                  className="ui-btn ui-btn-secondary ui-btn-sm aflow-link-btn"
                >
                  {selectedStageActionLink.label}
                </a>
              </div>
            ) : null}
            {selectedStage.key === 'post_outcome' ? (
              <>
                {selectedStage.status === 'completed' ? (
                  selectedStageActionLink ? (
                    <div className="aflow-stage-action-row">
                      <a
                        href={selectedStageActionLink.href}
                        className="ui-btn ui-btn-secondary ui-btn-sm aflow-link-btn"
                      >
                        Open Activities
                      </a>
                    </div>
                  ) : null
                ) : (
                  <div className="aflow-stage-action-row">
                    <Button
                      type="button"
                      size="sm"
                      className="aflow-glow-btn aflow-next-move-btn"
                      onClick={onMarkClosed}
                      disabled={markCloseBusy}
                    >
                      {markCloseBusy ? 'Marking...' : 'Mark Closed'}
                    </Button>
                  </div>
                )}
                {selectedStage.status !== 'completed' && selectedStageActionLink ? (
                  <p className="dg-help">
                    Audit trail:{' '}
                    <a href={selectedStageActionLink.href} className="dg-link-primary">
                      {selectedStageActionLink.label}
                    </a>
                  </p>
                ) : null}
              </>
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
            {selectedStage.key === 'deal_open' ? (
              <div className="aflow-stage-action-row">
                <Button
                  type="button"
                  size="sm"
                  className="aflow-glow-btn aflow-next-move-btn"
                  onClick={() => {
                    if (flow.dealId) {
                      window.location.href = `/admin/deals/${flow.dealId}`;
                      return;
                    }
                    setCreateDealModalOpen(true);
                  }}
                  disabled={dealActionBusy}
                >
                  {dealActionBusy ? 'Processing...' : flow.dealId ? 'Open Deal' : 'Create Deal'}
                </Button>
              </div>
            ) : null}
            {selectedStage.key === 'won_lost' ? (
              <div className="aflow-stage-action-row">
                <Button
                  type="button"
                  size="sm"
                  className="aflow-glow-btn aflow-next-move-btn"
                  onClick={() => onMarkOutcome('won')}
                  disabled={outcomeActionBusy !== null}
                >
                  {outcomeActionBusy === 'won' ? 'Marking Won...' : 'Mark Won'}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="aflow-glow-btn aflow-link-btn"
                  onClick={() => onMarkOutcome('lost')}
                  disabled={outcomeActionBusy !== null}
                >
                  {outcomeActionBusy === 'lost' ? 'Marking Lost...' : 'Mark Lost'}
                </Button>
              </div>
            ) : null}
            {qualifyStatus ? <p className="aflow-next-move-status">{qualifyStatus}</p> : null}
            {qualifyError ? <p className="aflow-next-move-error">{qualifyError}</p> : null}
            {triageStatus ? <p className="aflow-next-move-status">{triageStatus}</p> : null}
            {triageError ? <p className="aflow-next-move-error">{triageError}</p> : null}
            {outcomeActionStatus ? <p className="aflow-next-move-status">{outcomeActionStatus}</p> : null}
            {outcomeActionError ? <p className="aflow-next-move-error">{outcomeActionError}</p> : null}
            {dealActionStatus ? <p className="aflow-next-move-status">{dealActionStatus}</p> : null}
            {dealActionError ? <p className="aflow-next-move-error">{dealActionError}</p> : null}
            {postOutcomeStatus ? <p className="aflow-next-move-status">{postOutcomeStatus}</p> : null}
            {postOutcomeError ? <p className="aflow-next-move-error">{postOutcomeError}</p> : null}
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

      <Modal open={createDealModalOpen} onClose={() => setCreateDealModalOpen(false)}>
        <div className="ui-modal-card ui-modal-size-lg">
          <div className="ui-modal-head">
            <div className="ui-modal-title-block">
              <p className="ui-modal-kicker">Execution Evidence</p>
              <h3 className="ui-modal-title">Create Deal</h3>
            </div>
            <div className="ui-modal-actions">
              <span className="dg-badge">From Execution Evidence</span>
            </div>
          </div>
          <p className="ui-modal-meta">Configure deal ownership and value before creation.</p>

          <div className="dg-config-form" style={{ marginTop: '0.75rem' }}>
            <div className="dg-config-grid aflow-deal-grid">
              <div className="dg-field">
                <label htmlFor="flow-deal-priority" className="dg-label">
                  Priority
                </label>
                <SelectField
                  id="flow-deal-priority"
                  className="aflow-deal-control"
                  value={priority}
                  onChange={(event) => setPriority(event.target.value as 'low' | 'medium' | 'high')}
                >
                  <option value="medium">medium</option>
                  <option value="high">high</option>
                  <option value="low">low</option>
                </SelectField>
              </div>
              <div className="dg-field">
                <label htmlFor="flow-deal-owner-mode" className="dg-label">
                  Owner Assignment
                </label>
                <SelectField
                  id="flow-deal-owner-mode"
                  className="aflow-deal-control"
                  value={ownerMode}
                  onChange={(event) => setOwnerMode(event.target.value as 'self' | 'unassigned')}
                >
                  <option value="self">Assign to me (recommended)</option>
                  <option value="unassigned">Leave unassigned</option>
                </SelectField>
                <p className="dg-help">Current probability: {probability}%</p>
              </div>
            </div>

            <div className="dg-field">
              <label htmlFor="flow-deal-value-estimate" className="dg-label">
                Value Estimate
              </label>
              <TextField
                id="flow-deal-value-estimate"
                className="aflow-deal-control"
                type="number"
                min={0}
                step={0.01}
                value={valueEstimate}
                onChange={(event) => setValueEstimate(event.target.value)}
              />
            </div>

            <div className="dg-field">
              <label htmlFor="flow-deal-notes" className="dg-label">
                Notes
              </label>
              <textarea
                id="flow-deal-notes"
                className="dg-textarea"
                rows={3}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
              />
            </div>

            <div className="dg-form-row mt-4 pt-2 border-t border-[var(--color-border)]">
              <button
                type="button"
                className="ui-btn ui-btn-primary ui-btn-md"
                disabled={dealActionBusy}
                onClick={() => {
                  const ownerUserId = ownerMode === 'self' ? sessionUserId || undefined : undefined;
                  onCreateDeal({
                    owner_user_id: ownerUserId,
                    expected_value: valueEstimate ? Number(valueEstimate) : 0,
                    probability_pct: probability,
                    notes: notes.trim() || undefined,
                  });
                  if (!dealActionBusy) {
                    setCreateDealModalOpen(false);
                  }
                }}
              >
                {dealActionBusy ? 'Creating...' : 'Create Deal'}
              </button>
              <button
                type="button"
                className="ui-btn ui-btn-secondary ui-btn-md"
                onClick={() => setCreateDealModalOpen(false)}
                disabled={dealActionBusy}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </FlowBoardCard>
  );
}
