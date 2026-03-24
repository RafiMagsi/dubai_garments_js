'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button, Card, CardText, CardTitle, TextField } from '@/components/ui';
import { getAgentFlow } from '@/features/admin/ai-sales-agent/api';
import {
  convertLeadFromIntelligence,
  draftReplyFromLeadIntelligence,
  prioritizeLeadFromIntelligence,
  runLeadTriage,
} from '@/features/admin/ai-sales-agent/api';
import type { AgentFlowResponse } from '@/features/admin/ai-sales-agent/types';
import { AisFieldLabel } from '@/components/admin/ai-sales-agent/reusable';

type AgentFlowViewProps = {
  showHeader?: boolean;
  initialLeadId?: string;
  initialDealId?: string;
  compact?: boolean;
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

function markerTypeMeta(type: AgentFlowResponse['markers'][number]['type']) {
  switch (type) {
    case 'ai_action':
      return { label: 'AI', cls: 'is-ai' };
    case 'automation_action':
      return { label: 'Auto', cls: 'is-auto' };
    case 'human_checkpoint':
      return { label: 'Human', cls: 'is-human' };
    case 'pending_approval':
      return { label: 'Approval', cls: 'is-approval' };
    default:
      return { label: 'Signal', cls: 'is-neutral' };
  }
}

export default function AgentFlowView({
  showHeader = true,
  initialLeadId = '',
  initialDealId = '',
  compact = false,
}: AgentFlowViewProps) {
  const [leadId, setLeadId] = useState(initialLeadId);
  const [dealId, setDealId] = useState(initialDealId);
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

  useEffect(() => {
    if ((!initialLeadId && !initialDealId) || flow || loading) return;
    void handleLoadFlow();
    // intentionally keyed to initial ids only for first-load hydration
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialLeadId, initialDealId]);

  async function runStageAction(stageKey: AgentFlowResponse['activeStageKey']) {
    if (!flow) {
      throw new Error('Flow data is not loaded.');
    }

    const leadId = flow.leadId ?? undefined;

    switch (stageKey) {
      case 'triaged': {
        if (!leadId) throw new Error('Lead ID is required to run triage.');
        await runLeadTriage({ leadId, dry_run: false });
        return 'Lead triage completed and persisted.';
      }
      case 'qualified': {
        if (!leadId) throw new Error('Lead ID is required to prioritize lead.');
        await prioritizeLeadFromIntelligence(leadId);
        return 'Lead prioritized to qualified status.';
      }
      case 'reply_sent': {
        if (!leadId) throw new Error('Lead ID is required to generate draft reply.');
        const result = await draftReplyFromLeadIntelligence({
          leadId,
          tone: 'professional',
          channel: 'email',
        });
        const draft = (result as any)?.data;
        return draft?.subject ? `Draft reply generated: ${draft.subject}` : 'Draft reply generated successfully.';
      }
      case 'deal_open': {
        if (!leadId) throw new Error('Lead ID is required to convert lead to deal.');
        await convertLeadFromIntelligence(leadId);
        return 'Lead converted to deal successfully.';
      }
      case 'quote_ready':
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

  function getStageDeepLink(stageKey: AgentFlowResponse['activeStageKey']) {
    if (!flow?.leadId && !flow?.dealId && !flow?.quoteId) return null;

    switch (stageKey) {
      case 'lead_new':
      case 'triaged':
      case 'qualified':
      case 'reply_sent':
        return flow.leadId ? `/admin/leads/${flow.leadId}` : null;

      case 'deal_open':
        if (flow.dealId) return `/admin/deals/${flow.dealId}`;
        return flow.leadId ? `/admin/leads/${flow.leadId}` : null;

      case 'quote_ready':
      case 'quote_sent':
        if (flow.quoteId) return `/admin/quotes/${flow.quoteId}`;
        if (flow.dealId) return `/admin/deals/${flow.dealId}`;
        return flow.leadId ? `/admin/leads/${flow.leadId}` : null;

      case 'negotiation':
      case 'won_lost':
        if (flow.dealId) return `/admin/deals/${flow.dealId}`;
        return flow.leadId ? `/admin/leads/${flow.leadId}` : null;

      case 'post_outcome':
        return '/admin/activities';

      default:
        return flow.leadId ? `/admin/leads/${flow.leadId}` : null;
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
  const showPanelLoading = loading && !flow;

  return (
    <div className={`aflow-stack ${compact ? 'is-compact' : ''}`.trim()}>
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
            <AisFieldLabel>Lead ID</AisFieldLabel>
            <TextField
              value={leadId}
              onChange={(event) => setLeadId(event.target.value)}
              placeholder="Optional lead ID"
              className="dg-mt-1"
            />
          </div>

          <div>
            <AisFieldLabel>Deal ID</AisFieldLabel>
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

      {showPanelLoading ? (
        <Card className="aflow-shell aflow-shell-embedded">
          <CardTitle>Loading Flow Panels</CardTitle>
          <CardText>Resolving blockers, signals, stage map, and execution evidence...</CardText>
          <div className="aflow-signals-grid">
            <div className="aflow-signals-panel"><p className="aflow-empty">Loading decision panel...</p></div>
            <div className="aflow-signals-panel"><p className="aflow-empty">Loading signals panel...</p></div>
            <div className="aflow-signals-panel"><p className="aflow-empty">Loading stage matrix...</p></div>
            <div className="aflow-signals-panel"><p className="aflow-empty">Loading execution evidence...</p></div>
          </div>
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

                {flow.activeStageKey && getStageDeepLink(flow.activeStageKey) ? (
                    <div className="dg-mt-4">
                        <a
                        href={getStageDeepLink(flow.activeStageKey)!}
                        className="ui-btn ui-btn-primary ui-btn-sm"
                        >
                        Open Next Action
                        </a>
                    </div>
                ) : null}
              </section>
            </div>
          </Card>

          <Card className="aflow-signals-card">
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
          </Card>

          <Card className="aflow-track-card">
            {flow.stages.length > 0 ? (
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

                    {getStageDeepLink(stage.key) ? (
                      <div className="dg-mt-4">
                          <a
                          href={getStageDeepLink(stage.key)!}
                          className="ui-btn ui-btn-secondary ui-btn-sm"
                          >
                          Open Related Action
                          </a>
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
            ) : (
              <p className="aflow-empty">No flow stages were returned for this query.</p>
            )}
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
          ) : (
            <Card className="aflow-active-card">
              <p className="aflow-kicker">Execution Evidence</p>
              <CardText>No active stage selected yet. Run flow query to inspect current execution evidence.</CardText>
            </Card>
          )}
        </>
      ) : null}
    </div>
  );
}
