'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button, Card, CardText, CardTitle, SelectField, TextField } from '@/components/ui';
import { getAgentFlow, orchestrateAgentFlow } from '@/features/admin/ai-sales-agent/api';
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
  const [overrideEnabled, setOverrideEnabled] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');
  const [overrideStageKey, setOverrideStageKey] = useState<AgentFlowResponse['activeStageKey']>('lead_new');
  const [overrideForce, setOverrideForce] = useState(false);
  const [selectedStageKey, setSelectedStageKey] = useState<AgentFlowResponse['activeStageKey']>('lead_new');

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
      const orchestration = await orchestrateAgentFlow({
        leadId: flow.leadId ?? undefined,
        dealId: flow.dealId ?? undefined,
        mode: 'single',
        manualOverride: overrideEnabled
          ? {
              enabled: true,
              stageKey: overrideStageKey,
              reason: overrideReason.trim(),
              force: overrideForce,
            }
          : undefined,
      });
      const latestAction = orchestration.actions[orchestration.actions.length - 1];
      setNextMoveStatus(latestAction?.message ?? 'Next move orchestration completed.');
      setFlow(orchestration.flow);
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

      const orchestration = await orchestrateAgentFlow({
        leadId: flow.leadId ?? undefined,
        dealId: flow.dealId ?? undefined,
        mode: 'single',
        manualOverride: {
          enabled: true,
          stageKey,
          reason: `Manual blocker resolution triggered from Flow Blockers panel: ${blocker}`,
          force: true,
        },
      });
      const latestAction = orchestration.actions[orchestration.actions.length - 1];
      setBlockerStatus(latestAction?.message ?? 'Blocker resolution executed.');
      setFlow(orchestration.flow);
    } catch (err) {
      setBlockerError(err instanceof Error ? err.message : 'Failed to resolve blocker.');
    } finally {
      setBlockerBusy(null);
    }
  }

  useEffect(() => {
    if (!flow) return;
    setOverrideStageKey(flow.activeStageKey);
    setSelectedStageKey(flow.activeStageKey);
  }, [flow?.activeStageKey, flow]);

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
  const selectedStage =
    flow?.stages.find((stage) => stage.key === selectedStageKey) ??
    activeStage ??
    null;
  const selectedStageEvidence = selectedStage
    ? normalizeEvidence(selectedStage.evidence, selectedStage.label)
    : [];
  const showPanelLoading = loading && !flow;

  return (
    <div className={`aflow-stack ${compact ? 'is-compact' : ''}`.trim()}>
      <Card className={`aflow-shell ${showHeader ? '' : 'aflow-shell-embedded'}`.trim()}>
        {showHeader ? (
          <>
            <div className="aflow-header aflow-shell-topline">
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
            <p className="aflow-query-hint">Enter Lead ID, Deal ID, or both.</p>
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
                  <div className="aflow-next-move-cta-row">
                    <Button
                      type="button"
                      size="sm"
                      className="aflow-glow-btn aflow-next-move-btn"
                      onClick={handleRunNextMove}
                      disabled={nextMoveBusy || (overrideEnabled && !overrideReason.trim())}
                    >
                      {nextMoveBusy ? 'Running...' : 'Run Next Move'}
                    </Button>
                    {flow.activeStageKey && getStageDeepLink(flow.activeStageKey) ? (
                      <a href={getStageDeepLink(flow.activeStageKey)!} className="ui-btn ui-btn-primary ui-btn-sm aflow-link-btn">
                        Open Next Action
                      </a>
                    ) : null}
                  </div>
                  {nextMoveStatus ? <p className="aflow-next-move-status">{nextMoveStatus}</p> : null}
                  {nextMoveError ? <p className="aflow-next-move-error">{nextMoveError}</p> : null}
                </div>
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

          <Card className="aflow-quality-card">
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
          </Card>

          {flow.stages.length > 0 ? (
            <Card className="aflow-board-card">
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
                    onClick={() => setSelectedStageKey(stage.key)}
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
                    {getStageDeepLink(selectedStage.key) ? (
                      <div className="aflow-stage-action-row">
                        <a href={getStageDeepLink(selectedStage.key)!} className="ui-btn ui-btn-secondary ui-btn-sm aflow-link-btn">
                          Open Related Action
                        </a>
                      </div>
                    ) : null}
                  </section>

                  <section className="aflow-stage-panel">
                    <div className="aflow-override-card">
                      <div className="aflow-override-head">
                        <p className="aflow-kicker">Manual Override</p>
                        <label className="aflow-override-toggle">
                          <input
                            type="checkbox"
                            checked={overrideEnabled}
                            onChange={(event) => setOverrideEnabled(event.target.checked)}
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
                                setOverrideStageKey(event.target.value as AgentFlowResponse['activeStageKey'])
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
                              onChange={(event) => setOverrideReason(event.target.value)}
                              placeholder="Explain why this override is needed..."
                              className="dg-mt-1"
                            />
                          </div>
                          <label className="aflow-override-force">
                            <input
                              type="checkbox"
                              checked={overrideForce}
                              onChange={(event) => setOverrideForce(event.target.checked)}
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
            </Card>
          ) : (
            <Card className="aflow-track-card">
              <p className="aflow-empty">No flow stages were returned for this query.</p>
            </Card>
          )}
        </>
      ) : null}
    </div>
  );
}
