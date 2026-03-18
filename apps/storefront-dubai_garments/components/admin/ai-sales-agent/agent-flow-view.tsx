'use client';

import { useMemo, useState } from 'react';
import { Button, Card, CardText, CardTitle, TextField } from '@/components/ui';
import { getAgentFlow } from '@/features/admin/ai-sales-agent/api';
import {
  convertLeadFromIntelligence,
  draftReplyFromLeadIntelligence,
  prioritizeLeadFromIntelligence,
  runLeadTriage,
} from '@/features/admin/ai-sales-agent/api';
import type { AgentFlowResponse } from '@/features/admin/ai-sales-agent/types';

type AgentFlowViewProps = {
  showHeader?: boolean;
};

function toTitle(value: string) {
  return value
    .split('_')
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : part))
    .join(' ');
}

function stageMeterPercent(status: string) {
  if (status === 'completed') return 100;
  if (status === 'active') return 62;
  if (status === 'blocked') return 28;
  return 14;
}

function stageStatusLabel(status: AgentFlowResponse['stages'][number]['status']) {
  if (status === 'completed') return 'Done';
  if (status === 'active') return 'In Progress';
  if (status === 'blocked') return 'Blocked';
  return 'Pending';
}

function stageStatusMessage(
  status: AgentFlowResponse['stages'][number]['status'],
  hasEvidence: boolean,
) {
  if (status === 'completed') return 'This step has been completed with sufficient execution evidence.';
  if (status === 'active') {
    return hasEvidence
      ? 'This step is in progress with partial evidence logged. Continue to complete it.'
      : 'This step is in progress, but no execution evidence is logged yet. Run the action to create evidence.';
  }
  if (status === 'blocked') return 'This step is blocked. Resolve listed blockers to continue.';
  return 'This step has not started yet.';
}

function normalizeEvidence(
  evidence: string[],
  stageLabel: string,
): string[] {
  const noEvidencePattern = /no evidence found for this stage yet\.?/i;
  const stageLabelPattern = new RegExp(`^${stageLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
  const unique = Array.from(
    new Set(
      evidence
        .map((item) => item.trim())
        .filter(Boolean)
        .filter((item) => !stageLabelPattern.test(item)),
    ),
  );

  const withoutNoEvidence = unique.filter((item) => !noEvidencePattern.test(item));
  if (withoutNoEvidence.length > 0) return withoutNoEvidence;
  if (unique.length > 0) return unique;
  return [];
}

export default function AgentFlowView({ showHeader = true }: AgentFlowViewProps) {
  const [leadId, setLeadId] = useState('');
  const [dealId, setDealId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flow, setFlow] = useState<AgentFlowResponse | null>(null);
  const [nextMoveBusy, setNextMoveBusy] = useState(false);
  const [nextMoveStatus, setNextMoveStatus] = useState<string | null>(null);
  const [nextMoveError, setNextMoveError] = useState<string | null>(null);
  const [blockerBusy, setBlockerBusy] = useState<string | null>(null);
  const [blockerStatus, setBlockerStatus] = useState<string | null>(null);
  const [blockerError, setBlockerError] = useState<string | null>(null);

  async function handleLoadFlow() {
    try {
      setError(null);
      setLoading(true);

      const result = await getAgentFlow({
        leadId: leadId.trim() || undefined,
        dealId: dealId.trim() || undefined,
      });

      setFlow(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load agent flow.');
      setFlow(null);
    } finally {
      setLoading(false);
    }
  }

  async function runStageAction(stageKey: AgentFlowResponse['activeStageKey']) {
    if (!flow) {
      throw new Error('Flow data is not loaded.');
    }

    const leadId = flow.leadId ?? undefined;

    switch (stageKey) {
      case 'ai_analysis': {
        if (!leadId) throw new Error('Lead ID is required to run triage.');
        await runLeadTriage({ leadId, dry_run: false });
        return 'Lead triage completed and persisted.';
      }
      case 'qualification': {
        if (!leadId) throw new Error('Lead ID is required to prioritize lead.');
        await prioritizeLeadFromIntelligence(leadId);
        return 'Lead prioritized to qualified status.';
      }
      case 'reply_prepared': {
        if (!leadId) throw new Error('Lead ID is required to generate draft reply.');
        const result = await draftReplyFromLeadIntelligence({
          leadId,
          tone: 'professional',
          channel: 'email',
        });
        const draft = (result as any)?.data;
        return draft?.subject ? `Draft reply generated: ${draft.subject}` : 'Draft reply generated successfully.';
      }
      case 'quote_preparation': {
        if (!leadId) throw new Error('Lead ID is required to convert lead to deal.');
        await convertLeadFromIntelligence(leadId);
        return 'Lead converted to deal successfully.';
      }
      case 'quote_sent': {
        throw new Error('Quote send is manual right now. Open Quotes and send the latest quote.');
      }
      default:
        return 'No direct automation for this stage. Follow recommended manual action.';
    }
  }

  function stageKeyFromBlocker(blocker: string): AgentFlowResponse['activeStageKey'] | null {
    if (!flow) return null;
    const stageLabel = blocker.split(':')[0]?.trim().toLowerCase();
    if (!stageLabel) return null;

    const found = flow.stages.find((stage) => stage.label.toLowerCase() === stageLabel);
    return found?.key ?? null;
  }

  async function handleRunNextMove() {
    if (!flow) return;
    try {
      setNextMoveError(null);
      setNextMoveStatus(null);
      setNextMoveBusy(true);
      const status = await runStageAction(flow.activeStageKey);
      setNextMoveStatus(status);

      const refreshed = await getAgentFlow({
        leadId: flow.leadId ?? undefined,
        dealId: flow.dealId ?? undefined,
      });
      setFlow(refreshed);
    } catch (err) {
      setNextMoveError(err instanceof Error ? err.message : 'Failed to execute next move.');
    } finally {
      setNextMoveBusy(false);
    }
  }

  async function handleResolveBlocker(blocker: string) {
    if (!flow) return;
    try {
      setBlockerError(null);
      setBlockerStatus(null);
      setBlockerBusy(blocker);

      const stageKey = stageKeyFromBlocker(blocker);
      if (!stageKey) {
        throw new Error('Unable to map blocker to a stage action.');
      }

      const status = await runStageAction(stageKey);
      setBlockerStatus(status);

      const refreshed = await getAgentFlow({
        leadId: flow.leadId ?? undefined,
        dealId: flow.dealId ?? undefined,
      });
      setFlow(refreshed);
    } catch (err) {
      setBlockerError(err instanceof Error ? err.message : 'Failed to resolve blocker.');
    } finally {
      setBlockerBusy(null);
    }
  }

  const completedCount = flow?.stages.filter((stage) => stage.status === 'completed').length ?? 0;
  const activeStage = flow?.stages.find((stage) => stage.status === 'active') ?? null;
  const pendingCount = flow?.stages.filter((stage) => stage.status === 'pending').length ?? 0;
  const blockedCount = flow?.stages.filter((stage) => stage.status === 'blocked').length ?? 0;

  const flowHealth = useMemo(() => {
    if (!flow) return { label: 'Not loaded', cls: 'dg-ai-badge-slate' };
    if (blockedCount > 0) return { label: 'Attention', cls: 'dg-ai-badge-red' };
    if (pendingCount > 0) return { label: 'In Progress', cls: 'dg-ai-badge-amber' };
    return { label: 'Healthy', cls: 'dg-ai-badge-green' };
  }, [flow, blockedCount, pendingCount]);

  const completionPercent = flow?.completionPercent ?? 0;
  const activeStageEvidence = activeStage ? normalizeEvidence(activeStage.evidence, activeStage.label) : [];

  return (
    <div className="aflow-stack">
      <Card className={`aflow-shell ${showHeader ? '' : 'aflow-shell-embedded'}`.trim()}>
        {showHeader ? (
          <>
            <div className="aflow-header">
              <CardTitle>Lead-to-Close Agent Flow</CardTitle>
              {flow ? <span className="dg-ai-badge dg-ai-badge-violet">Completion {completionPercent}%</span> : null}
            </div>
            <CardText>Query lead/deal context and map its AI execution journey end-to-end.</CardText>
          </>
        ) : (
          <div className="aflow-header aflow-embedded-head">
            <p className="aflow-kicker">AI Flow Query</p>
            {flow ? <span className="dg-ai-badge dg-ai-badge-violet">Completion {completionPercent}%</span> : null}
          </div>
        )}

        <div className="aflow-query-grid">
          <div>
            <label className="dg-text-xs dg-font-semibold dg-uppercase dg-tracking-wide dg-text-neutral-500">Lead ID</label>
            <TextField
              value={leadId}
              onChange={(event) => setLeadId(event.target.value)}
              placeholder="Optional lead ID"
              className="dg-mt-1"
            />
          </div>

          <div>
            <label className="dg-text-xs dg-font-semibold dg-uppercase dg-tracking-wide dg-text-neutral-500">Deal ID</label>
            <TextField
              value={dealId}
              onChange={(event) => setDealId(event.target.value)}
              placeholder="Optional deal ID"
              className="dg-mt-1"
            />
          </div>

          <div className="aflow-query-action">
            <Button type="button" onClick={handleLoadFlow} disabled={loading}>
              {loading ? 'Loading...' : 'Run Agent Flow'}
            </Button>
            <p className="dg-text-xs dg-text-neutral-500">Enter Lead ID, Deal ID, or both.</p>
          </div>
        </div>
      </Card>

      {error ? (
        <Card className="aflow-error-card">
          <CardTitle>Flow Error</CardTitle>
          <CardText>{error}</CardText>
        </Card>
      ) : null}

      {flow ? (
        <>
          <Card className="aflow-hero-card dg-ai-intel-hero">
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
          </Card>

          <Card className="aflow-decision-card">
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
                          onClick={() => void handleResolveBlocker(item)}
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
                    {activeStage ? toTitle(activeStage.key) : 'Manual'}
                  </span>
                </div>
                <div className="aflow-next-move">{flow.recommendedNextMove}</div>
                <div className="aflow-next-move-actions">
                  <Button
                    type="button"
                    size="sm"
                    className="aflow-glow-btn aflow-next-move-btn"
                    onClick={handleRunNextMove}
                    disabled={nextMoveBusy}
                  >
                    {nextMoveBusy ? 'Running...' : 'Run Next Move'}
                  </Button>
                  {nextMoveStatus ? <p className="aflow-next-move-status">{nextMoveStatus}</p> : null}
                  {nextMoveError ? <p className="aflow-next-move-error">{nextMoveError}</p> : null}
                </div>
              </section>
            </div>
          </Card>

          <Card className="aflow-track-card">
            <div className="aflow-track aflow-track-matrix">
              {flow.stages.map((stage) => (
                <article key={stage.key} className={`aflow-stage is-${stage.status}`}>
                  <div className="aflow-stage-top">
                    <span className="aflow-stage-step">Step {stage.order}</span>
                    <span className={`aflow-stage-status is-${stage.status}`}>{toTitle(stage.status)}</span>
                  </div>
                  <div className="aflow-stage-node">
                    <span className={`aflow-stage-dot is-${stage.status}`} aria-hidden="true" />
                    <p className="aflow-stage-key">{toTitle(stage.key)}</p>
                  </div>
                  <h4 className="aflow-stage-title">{stage.label}</h4>
                  <p className="aflow-stage-text">{stage.description}</p>
                  <div className="aflow-stage-meter">
                    <span className={`aflow-stage-meter-fill is-${stage.status}`} style={{ width: `${stageMeterPercent(stage.status)}%` }} />
                  </div>
                  {stage.evidence[0] ? (
                    <p className="aflow-stage-evidence">{stage.evidence[0]}</p>
                  ) : (
                    <p className="aflow-stage-evidence is-muted">Waiting for evidence</p>
                  )}
                </article>
              ))}
            </div>
          </Card>

          {activeStage ? (
            <Card className="aflow-active-card">
              <div className="aflow-active-head">
                <div>
                  <p className="aflow-kicker">Execution Evidence</p>
                  <CardTitle>{activeStage.label}</CardTitle>
                </div>
                <span className="dg-ai-badge dg-ai-badge-blue">{toTitle(activeStage.key)}</span>
              </div>
              <div className="aflow-active-head">
                <span className={`aflow-stage-status is-${activeStage.status}`}>
                  {stageStatusLabel(activeStage.status)}
                </span>
              </div>
              <CardText>{stageStatusMessage(activeStage.status, activeStageEvidence.length > 0)}</CardText>
              <CardText>{activeStage.description}</CardText>
              <div className="aflow-next-move-actions">
                <Button
                  type="button"
                  size="sm"
                  className="aflow-glow-btn aflow-next-move-btn"
                  onClick={handleRunNextMove}
                  disabled={nextMoveBusy}
                >
                  {nextMoveBusy ? 'Running...' : 'Run Next Move'}
                </Button>
                {nextMoveStatus ? <p className="aflow-next-move-status">{nextMoveStatus}</p> : null}
                {nextMoveError ? <p className="aflow-next-move-error">{nextMoveError}</p> : null}
              </div>
              <div className="aflow-evidence-list">
                {(activeStageEvidence.length > 0
                  ? activeStageEvidence
                  : ['No evidence captured yet for this stage.']).map((item, index) => (
                  <div className="aflow-evidence-item" key={`${activeStage.key}-evidence-${index}`}>
                    {item}
                  </div>
                ))}
              </div>
            </Card>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
