'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { CardText, CardTitle } from '@/components/ui';
import {
  convertLeadFromIntelligence,
  getAgentFlow,
  orchestrateAgentFlow,
  prioritizeLeadFromIntelligence,
  runLeadTriage,
  updateDealStageFromFlow,
} from '@/features/admin/ai-sales-agent/api';
import type { AgentFlowResponse } from '@/features/admin/ai-sales-agent/types';
import type { ConvertLeadToDealInput } from '@/features/admin/deals/types/deal.types';
import {
  FlowErrorCard,
  FlowLoadingCard,
} from '@/components/admin/ai-sales-agent/flow/flow-cards';
import { FlowQuerySection } from '@/components/admin/ai-sales-agent/flow/flow-query-section';
import { FlowHeroSection } from '@/components/admin/ai-sales-agent/flow/flow-hero-section';
import { FlowDecisionSection } from '@/components/admin/ai-sales-agent/flow/flow-decision-section';
import { FlowSignalsSection } from '@/components/admin/ai-sales-agent/flow/flow-signals-section';
import { FlowQualitySection } from '@/components/admin/ai-sales-agent/flow/flow-quality-section';
import { FlowExecutionBoardSection } from '@/components/admin/ai-sales-agent/flow/flow-execution-board-section';
import {
  getFlowStageGuidance,
  getNextMoveGuidance,
} from '@/lib/ai-sales-agent/flow/stage-guidance';

type AgentFlowViewProps = {
  showHeader?: boolean;
  initialLeadId?: string;
  initialDealId?: string;
  compact?: boolean;
  onOpenCreateQuoteModal?: () => void;
  refreshSignal?: number;
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
  stageKey: AgentFlowResponse['activeStageKey'],
) {
  if (status === 'completed') return 'This step has been completed with sufficient execution evidence.';
  if (status === 'active') {
    if (stageKey === 'post_outcome' && !hasEvidence) {
      return 'Mark close to finalize this workflow and record the post-outcome checkpoint.';
    }
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
  onOpenCreateQuoteModal,
  refreshSignal = 0,
}: AgentFlowViewProps) {
  const queryClient = useQueryClient();
  const [leadId, setLeadId] = useState(initialLeadId);
  const [dealId, setDealId] = useState(initialDealId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flow, setFlow] = useState<AgentFlowResponse | null>(null);
  const [nextMoveBusy, setNextMoveBusy] = useState(false);
  const [nextMoveStatus, setNextMoveStatus] = useState<string | null>(null);
  const [nextMoveError, setNextMoveError] = useState<string | null>(null);
  const [triageBusy, setTriageBusy] = useState(false);
  const [triageStatus, setTriageStatus] = useState<string | null>(null);
  const [triageError, setTriageError] = useState<string | null>(null);
  const [outcomeActionBusy, setOutcomeActionBusy] = useState<'won' | 'lost' | null>(null);
  const [outcomeActionStatus, setOutcomeActionStatus] = useState<string | null>(null);
  const [outcomeActionError, setOutcomeActionError] = useState<string | null>(null);
  const [qualifyBusy, setQualifyBusy] = useState(false);
  const [qualifyStatus, setQualifyStatus] = useState<string | null>(null);
  const [qualifyError, setQualifyError] = useState<string | null>(null);
  const [dealActionBusy, setDealActionBusy] = useState(false);
  const [dealActionStatus, setDealActionStatus] = useState<string | null>(null);
  const [dealActionError, setDealActionError] = useState<string | null>(null);
  const [blockerBusy, setBlockerBusy] = useState<string | null>(null);
  const [blockerStatus, setBlockerStatus] = useState<string | null>(null);
  const [blockerError, setBlockerError] = useState<string | null>(null);
  const [overrideEnabled, setOverrideEnabled] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');
  const [overrideStageKey, setOverrideStageKey] = useState<AgentFlowResponse['activeStageKey']>('lead_new');
  const [overrideForce, setOverrideForce] = useState(false);
  const [selectedStageKey, setSelectedStageKey] = useState<AgentFlowResponse['activeStageKey']>('lead_new');
  const [sessionUserId, setSessionUserId] = useState('');

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

  useEffect(() => {
    if (!flow || loading) return;
    void handleLoadFlow();
    // external refresh trigger from host page actions (e.g., quote creation)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshSignal]);

  function stageKeyFromBlocker(blocker: string): AgentFlowResponse['activeStageKey'] | null {
    if (!flow) return null;
    const stageLabel = blocker.split(':')[0]?.trim().toLowerCase();
    if (!stageLabel) return null;

    const found = flow.stages.find((stage) => stage.label.toLowerCase() === stageLabel);
    return found?.key ?? null;
  }

  async function handleRunNextMove() {
    if (!flow) return;
    const allStagesCompleted = flow.stages.length > 0 && flow.stages.every((stage) => stage.completed);
    if (allStagesCompleted) {
      const params = new URLSearchParams();
      if (flow.leadId) params.set('lead_id', flow.leadId);
      if (flow.dealId) params.set('deal_id', flow.dealId);
      if (flow.quoteId) params.set('quote_id', flow.quoteId);
      params.set('source', 'lead_execution_board');
      const suffix = params.toString();
      window.location.href = suffix ? `/admin/activities?${suffix}` : '/admin/activities';
      return;
    }

    try {
      setNextMoveError(null);
      setNextMoveStatus(null);
      setNextMoveBusy(true);
      const startStageKey = flow.activeStageKey;
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
      const baseMessage = latestAction?.message ?? 'Next move orchestration completed.';
      const needsQuoteCreation =
        startStageKey === 'quote_ready' &&
        !orchestration.flow.quoteId &&
        typeof onOpenCreateQuoteModal === 'function';
      setNextMoveStatus(
        needsQuoteCreation
          ? `${baseMessage} Opening Create Quote now.`
          : baseMessage
      );
      setFlow(orchestration.flow);
      if (needsQuoteCreation) {
        onOpenCreateQuoteModal?.();
      }
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

  async function handleCompleteQualifiedFromPanel() {
    if (!flow?.leadId) return;
    try {
      setQualifyError(null);
      setQualifyStatus(null);
      setQualifyBusy(true);
      const orchestration = await orchestrateAgentFlow({
        leadId: flow.leadId,
        dealId: flow.dealId ?? undefined,
        mode: 'single',
        manualOverride: {
          enabled: true,
          stageKey: 'qualified',
          reason: 'Qualified stage completed directly from flow panel.',
          force: true,
        },
      });
      const latestAction = orchestration.actions[orchestration.actions.length - 1];
      setQualifyStatus(latestAction?.message ?? 'Lead marked as qualified.');
      setFlow(orchestration.flow);
    } catch (err) {
      setQualifyError(err instanceof Error ? err.message : 'Failed to complete qualified stage.');
    } finally {
      setQualifyBusy(false);
    }
  }

  async function handleRunLeadTriageFromPanel() {
    if (!flow?.leadId) return;
    try {
      setTriageError(null);
      setTriageStatus(null);
      setTriageBusy(true);

      await runLeadTriage({ leadId: flow.leadId, dry_run: false });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['lead', flow.leadId] }),
        queryClient.invalidateQueries({ queryKey: ['leads'] }),
        queryClient.invalidateQueries({ queryKey: ['activities'] }),
      ]);
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['lead', flow.leadId], type: 'active' }),
        queryClient.refetchQueries({ queryKey: ['leads'], type: 'active' }),
        queryClient.refetchQueries({ queryKey: ['activities'], type: 'active' }),
      ]);
      const refreshed = await getAgentFlow({
        leadId: flow.leadId ?? undefined,
        dealId: flow.dealId ?? undefined,
      });
      setFlow(refreshed);
      setTriageStatus('Lead triage completed and flow refreshed.');

      // When Agent Flow is embedded on Lead Detail page, reveal intelligence section immediately.
      const intelligenceSection = document.querySelector('[data-testid="lead-detail-intelligence-section"]');
      if (intelligenceSection instanceof HTMLElement) {
        intelligenceSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } catch (err) {
      setTriageError(err instanceof Error ? err.message : 'Failed to run lead triage.');
    } finally {
      setTriageBusy(false);
    }
  }

  async function handleMarkClosedFromPanel() {
    if (!flow?.leadId) return;
    try {
      setNextMoveError(null);
      setNextMoveStatus(null);
      setNextMoveBusy(true);
      const orchestration = await orchestrateAgentFlow({
        leadId: flow.leadId,
        dealId: flow.dealId ?? undefined,
        mode: 'single',
        manualOverride: {
          enabled: true,
          stageKey: 'post_outcome',
          reason: 'Post-outcome marked closed from execution evidence panel.',
          force: true,
        },
      });
      const latestAction = orchestration.actions[orchestration.actions.length - 1];
      setNextMoveStatus(latestAction?.message ?? 'Post-outcome marked closed.');
      setFlow(orchestration.flow);
    } catch (err) {
      setNextMoveError(err instanceof Error ? err.message : 'Failed to mark post-outcome as closed.');
    } finally {
      setNextMoveBusy(false);
    }
  }

  async function handleMarkOutcomeFromPanel(stage: 'won' | 'lost') {
    if (!flow?.dealId) {
      setOutcomeActionError('No active deal found for outcome update.');
      return;
    }
    try {
      setOutcomeActionError(null);
      setOutcomeActionStatus(null);
      setOutcomeActionBusy(stage);
      await updateDealStageFromFlow(flow.dealId, {
        stage,
        notes: `Outcome marked ${stage} from lead-to-close execution board.`,
        lost_reason: stage === 'lost' ? 'Marked as lost from execution board.' : undefined,
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['deal', flow.dealId] }),
        queryClient.invalidateQueries({ queryKey: ['deals'] }),
        queryClient.invalidateQueries({ queryKey: ['pipeline'] }),
        queryClient.invalidateQueries({ queryKey: ['lead', flow.leadId] }),
        queryClient.invalidateQueries({ queryKey: ['leads'] }),
        queryClient.invalidateQueries({ queryKey: ['activities'] }),
      ]);

      const refreshed = await getAgentFlow({
        leadId: flow.leadId ?? undefined,
        dealId: flow.dealId ?? undefined,
      });
      setFlow(refreshed);
      setOutcomeActionStatus(`Deal marked as ${stage}.`);
    } catch (err) {
      setOutcomeActionError(err instanceof Error ? err.message : `Failed to mark outcome as ${stage}.`);
    } finally {
      setOutcomeActionBusy(null);
    }
  }

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const response = await fetch('/api/auth/session', { cache: 'no-store' });
        const payload = (await response.json()) as { authenticated?: boolean; user?: { id?: string } };
        if (!isMounted || !payload?.authenticated || !payload?.user?.id) return;
        setSessionUserId(payload.user.id);
      } catch {
        // no-op
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  async function handleCreateDealFromPanel(payload: ConvertLeadToDealInput) {
    if (!flow?.leadId) return;
    try {
      setDealActionError(null);
      setDealActionStatus(null);
      setDealActionBusy(true);

      const result = await convertLeadFromIntelligence(flow.leadId, payload);
      // Keep lead stage/status consistent immediately after deal conversion.
      await prioritizeLeadFromIntelligence(flow.leadId);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['lead', flow.leadId] }),
        queryClient.invalidateQueries({ queryKey: ['leads'] }),
        queryClient.invalidateQueries({ queryKey: ['deals'] }),
        queryClient.invalidateQueries({ queryKey: ['pipeline'] }),
        queryClient.invalidateQueries({ queryKey: ['activities'] }),
      ]);

      const createdDealId =
        (result as { item?: { id?: string } })?.item?.id ??
        (result as { id?: string })?.id ??
        flow.dealId;

      const refreshed = await getAgentFlow({
        leadId: flow.leadId ?? undefined,
        dealId: createdDealId ?? undefined,
      });
      setFlow(refreshed);
      setDealActionStatus('Deal created successfully.');

      if (createdDealId) {
        window.location.href = `/admin/deals/${createdDealId}`;
      }
    } catch (err) {
      setDealActionError(err instanceof Error ? err.message : 'Failed to create/open deal.');
    } finally {
      setDealActionBusy(false);
    }
  }

  useEffect(() => {
    if (!flow) return;
    setOverrideStageKey(flow.activeStageKey);
    setSelectedStageKey(flow.activeStageKey);
  }, [flow?.activeStageKey, flow]);

  function getStageActionLink(stageKey: AgentFlowResponse['activeStageKey']) {
    if (!flow?.leadId && !flow?.dealId && !flow?.quoteId) return null;

    switch (stageKey) {
      case 'lead_new':
        return flow.leadId ? { href: `/admin/leads/${flow.leadId}`, label: 'Open Lead Profile' } : null;
      case 'triaged':
        return null;
      case 'qualified':
        return null;
      case 'reply_sent':
        {
          const params = new URLSearchParams({
            tab: 'reply-studio',
            expanded: 'true',
          });
          if (flow.leadId) params.set('replyLeadId', flow.leadId);
          if (flow.dealId) params.set('replyDealId', flow.dealId);
          if (flow.quoteId) params.set('replyQuoteId', flow.quoteId);
          return { href: `/admin/ai-sales-agent?${params.toString()}`, label: 'Open Reply Studio' };
        }

      case 'deal_open':
        if (flow.dealId) return { href: `/admin/deals/${flow.dealId}`, label: 'Open Deal' };
        return null;

      case 'quote_ready':
        if (flow.quoteId) return { href: `/admin/quotes/${flow.quoteId}`, label: 'Open Quote' };
        if (onOpenCreateQuoteModal) return null;
        if (flow.dealId) return { href: `/admin/deals/${flow.dealId}?openCreateQuote=1`, label: 'Create Quote' };
        return { href: '/admin/ai-sales-agent?tab=quote-copilot&expanded=true', label: 'Open Quote Copilot' };

      case 'quote_sent':
        if (flow.quoteId) return { href: `/admin/quotes/${flow.quoteId}`, label: 'Open Quote' };
        if (onOpenCreateQuoteModal) return null;
        if (flow.dealId) return { href: `/admin/deals/${flow.dealId}?openCreateQuote=1`, label: 'Create Quote' };
        return { href: '/admin/ai-sales-agent?tab=quote-copilot&expanded=true', label: 'Open Quote Copilot' };

      case 'negotiation':
        if (flow.dealId) return { href: `/admin/deals/${flow.dealId}`, label: 'Open Negotiation' };
        if (flow.quoteId) return { href: `/admin/quotes/${flow.quoteId}`, label: 'Open Quote' };
        return flow.leadId ? { href: `/admin/leads/${flow.leadId}`, label: 'Open Lead' } : null;

      case 'won_lost':
        if (flow.dealId) return { href: `/admin/deals/${flow.dealId}`, label: 'Open Outcome' };
        if (flow.quoteId) return { href: `/admin/quotes/${flow.quoteId}`, label: 'Open Quote Outcome' };
        return flow.leadId ? { href: `/admin/leads/${flow.leadId}`, label: 'Open Lead' } : null;

      case 'post_outcome':
        {
          const params = new URLSearchParams();
          if (flow.leadId) params.set('lead_id', flow.leadId);
          if (flow.dealId) params.set('deal_id', flow.dealId);
          if (flow.quoteId) params.set('quote_id', flow.quoteId);
          params.set('source', 'lead_execution_board');
          const suffix = params.toString();
          return { href: suffix ? `/admin/activities?${suffix}` : '/admin/activities', label: 'Open Activities' };
        }

      default:
        return flow.leadId ? { href: `/admin/leads/${flow.leadId}`, label: 'Open Lead' } : null;
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
  const allStagesCompleted = flow?.stages.length ? flow.stages.every((stage) => stage.completed) : false;
  const nextMoveLabel = allStagesCompleted
    ? 'Open Activities'
    : activeStage?.key === 'post_outcome'
    ? 'Mark Close'
    : 'Run Next Move';
  const selectedStageGuidance = selectedStage
    ? getFlowStageGuidance(selectedStage.key, selectedStage.status, {
        hasDeal: Boolean(flow?.dealId),
        hasQuote: Boolean(flow?.quoteId),
      })
    : null;
  const nextMoveGuidance = getNextMoveGuidance({
    activeStageKey: activeStage?.key ?? null,
    activeStageStatus: activeStage?.status ?? null,
    allStagesCompleted,
    hasDeal: Boolean(flow?.dealId),
    hasQuote: Boolean(flow?.quoteId),
    nextMoveLabel,
  });
  const showPanelLoading = loading && !flow;

  return (
    <div className={`aflow-stack ${compact ? 'is-compact' : ''}`.trim()}>
      <FlowQuerySection
        showHeader={showHeader}
        completionPercent={completionPercent}
        hasFlow={Boolean(flow)}
        leadId={leadId}
        dealId={dealId}
        loading={loading}
        onLeadIdChange={setLeadId}
        onDealIdChange={setDealId}
        onRunFlow={handleLoadFlow}
      />

      {error ? (
        <FlowErrorCard>
          <CardTitle>Flow Error</CardTitle>
          <CardText>{error}</CardText>
        </FlowErrorCard>
      ) : null}
          
      {showPanelLoading ? (
        <FlowLoadingCard>
          <CardTitle>Loading Flow Panels</CardTitle>
          <CardText>Resolving blockers, signals, stage map, and execution evidence...</CardText>
          <div className="aflow-signals-grid">
            <div className="aflow-signals-panel"><p className="aflow-empty">Loading decision panel...</p></div>
            <div className="aflow-signals-panel"><p className="aflow-empty">Loading signals panel...</p></div>
            <div className="aflow-signals-panel"><p className="aflow-empty">Loading stage matrix...</p></div>
            <div className="aflow-signals-panel"><p className="aflow-empty">Loading execution evidence...</p></div>
          </div>
        </FlowLoadingCard>
      ) : null}

      {flow ? (
        <>
          <FlowExecutionBoardSection
            flow={flow}
            selectedStage={selectedStage}
            selectedStageEvidence={selectedStageEvidence}
            toTitle={toTitle}
            stageStatusLabel={stageStatusLabel}
            stageStatusMessage={stageStatusMessage}
            stageMeterPercent={stageMeterPercent}
            onSelectStage={setSelectedStageKey}
            getStageActionLink={getStageActionLink}
            selectedStageGuidance={selectedStageGuidance}
            markCloseBusy={nextMoveBusy}
            postOutcomeStatus={nextMoveStatus}
            postOutcomeError={nextMoveError}
            qualifyBusy={qualifyBusy}
            qualifyStatus={qualifyStatus}
            qualifyError={qualifyError}
            triageBusy={triageBusy}
            triageStatus={triageStatus}
            triageError={triageError}
            outcomeActionBusy={outcomeActionBusy}
            outcomeActionStatus={outcomeActionStatus}
            outcomeActionError={outcomeActionError}
            dealActionBusy={dealActionBusy}
            dealActionStatus={dealActionStatus}
            dealActionError={dealActionError}
            sessionUserId={sessionUserId}
            onCompleteQualified={handleCompleteQualifiedFromPanel}
            onRunLeadTriage={handleRunLeadTriageFromPanel}
            onMarkClosed={handleMarkClosedFromPanel}
            onMarkOutcome={(stage) => void handleMarkOutcomeFromPanel(stage)}
            onCreateDeal={(input) => void handleCreateDealFromPanel(input)}
            onOpenCreateQuoteModal={onOpenCreateQuoteModal}
            overrideEnabled={overrideEnabled}
            overrideReason={overrideReason}
            overrideStageKey={overrideStageKey}
            overrideForce={overrideForce}
            onOverrideEnabledChange={setOverrideEnabled}
            onOverrideReasonChange={setOverrideReason}
            onOverrideStageKeyChange={setOverrideStageKey}
            onOverrideForceChange={setOverrideForce}
          />

          <FlowHeroSection
            flow={flow}
            activeStage={activeStage}
            completionPercent={completionPercent}
            completedCount={completedCount}
            pendingCount={pendingCount}
            blockedCount={blockedCount}
            flowHealth={flowHealth}
            toTitle={toTitle}
          />

          <FlowDecisionSection
            flow={flow}
            activeStage={activeStage}
            toTitle={toTitle}
            nextMoveBusy={nextMoveBusy}
            nextMoveLabel={nextMoveLabel}
            overrideEnabled={overrideEnabled}
            overrideReason={overrideReason}
            nextMoveStatus={nextMoveStatus}
            nextMoveError={nextMoveError}
            blockerBusy={blockerBusy}
            blockerStatus={blockerStatus}
            blockerError={blockerError}
            onRunNextMove={handleRunNextMove}
            onResolveBlocker={(item) => void handleResolveBlocker(item)}
            getStageActionLink={getStageActionLink}
            nextMoveGuidance={nextMoveGuidance}
          />

          <FlowSignalsSection flow={flow} toTitle={toTitle} markerTypeMeta={markerTypeMeta} />

          <FlowQualitySection flow={flow} />
        </>
      ) : null}
    </div>
  );
}
