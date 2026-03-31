import { prisma } from '@/lib/prisma';

export type AgentFlowStageKey =
  | 'lead_new'
  | 'triaged'
  | 'qualified'
  | 'reply_sent'
  | 'deal_open'
  | 'quote_ready'
  | 'quote_sent'
  | 'negotiation'
  | 'won_lost'
  | 'post_outcome';

export type AgentFlowStageStatus = 'completed' | 'active' | 'pending' | 'blocked';

export type AgentFlowStage = {
  key: AgentFlowStageKey;
  order: number;
  label: string;
  description: string;
  status: AgentFlowStageStatus;
  completed: boolean;
  evidence: string[];
  blockerReason?: string | null;
};

export type AgentFlowMarker = {
  type: 'ai_action' | 'automation_action' | 'human_checkpoint' | 'pending_approval';
  label: string;
  stageKey: AgentFlowStageKey;
  details: string;
};

export type AgentFlowResult = {
  leadId?: string | null;
  dealId?: string | null;
  quoteId?: string | null;
  leadOwnerUserId?: string | null;
  dealOwnerUserId?: string | null;
  stages: AgentFlowStage[];
  activeStageKey: AgentFlowStageKey;
  completionPercent: number;
  summary: string;
  blockers: string[];
  recommendedNextMove: string;
  markers: AgentFlowMarker[];
  humanCheckpoints: string[];
  pendingApprovals: string[];
  confidenceTrend: Array<{
    label: string;
    value: number;
  }>;
  riskHints: string[];
  stageSlaAlerts: Array<{
    stageKey: AgentFlowStageKey;
    stageLabel: string;
    elapsedHours: number;
    slaHours: number;
    severity: 'warning' | 'critical';
    message: string;
  }>;
  transitionGuardrails: Array<{
    stageKey: AgentFlowStageKey;
    rule: string;
    passed: boolean;
    message: string;
  }>;
  closeLoopSummary: {
    aiActions: string[];
    humanChanges: string[];
    result: string;
  };
  outcomeSummary: {
    outcome: 'won' | 'lost' | 'pending';
    source: 'deal' | 'lead' | 'none';
    stage: string | null;
    updatedAt: string | null;
    reason: string | null;
  };
};

type FlowRequestContext = {
  userId: string;
  role: string;
};

type FlowSourceData = {
  lead: any | null;
  deal: any | null;
  quote: any | null;
  activities: any[];
  automationRuns: any[];
  quoteItemCount: number;
};

const STAGE_SLA_HOURS: Record<AgentFlowStageKey, number> = {
  lead_new: 2,
  triaged: 4,
  qualified: 8,
  reply_sent: 12,
  deal_open: 24,
  quote_ready: 24,
  quote_sent: 24,
  negotiation: 72,
  won_lost: 120,
  post_outcome: 168,
};

const CANONICAL_STAGE_DEFS: Array<{
  key: AgentFlowStageKey;
  label: string;
  description: string;
}> = [
  {
    key: 'lead_new',
    label: 'Lead New',
    description: 'Lead intake captured and ready for AI triage.',
  },
  {
    key: 'triaged',
    label: 'Triaged',
    description: 'AI triage/intelligence has been generated and persisted.',
  },
  {
    key: 'qualified',
    label: 'Qualified',
    description: 'Lead is commercially qualified for sales progression.',
  },
  {
    key: 'reply_sent',
    label: 'Reply Sent',
    description: 'First response sent to the lead with execution evidence.',
  },
  {
    key: 'deal_open',
    label: 'Deal Open',
    description: 'Lead has been converted and an active deal exists.',
  },
  {
    key: 'quote_ready',
    label: 'Quote Ready',
    description: 'Quote draft is prepared with pricing/line items and is ready to be sent.',
  },
  {
    key: 'quote_sent',
    label: 'Quote Sent',
    description: 'Quote has been sent to customer with delivery evidence.',
  },
  {
    key: 'negotiation',
    label: 'Negotiation',
    description: 'Commercial negotiation is active with customer feedback loop.',
  },
  {
    key: 'won_lost',
    label: 'Won / Lost',
    description: 'Outcome recorded as won or lost.',
  },
  {
    key: 'post_outcome',
    label: 'Post-Outcome',
    description: 'Post-outcome intelligence captured for learning and optimization.',
  },
];

function hasActivity(activities: any[], activityType: string) {
  return activities.some((item) => item.activity_type === activityType);
}

function hasStructuredTriagePayload(lead: any | null | undefined): boolean {
  if (!lead) return false;
  const reasoning = lead.ai_reasoning && typeof lead.ai_reasoning === 'object' ? lead.ai_reasoning : null;
  const hasSummary = typeof reasoning?.summary === 'string' && reasoning.summary.trim().length > 0;
  const hasIntent = typeof reasoning?.intent === 'string' && reasoning.intent.trim().length > 0;
  const hasNextAction =
    typeof reasoning?.nextBestAction === 'string' && reasoning.nextBestAction.trim().length > 0;
  const hasScore = typeof lead.ai_score === 'number' || typeof reasoning?.score === 'number';
  const hasClassification =
    (typeof lead.ai_classification === 'string' && lead.ai_classification.trim().length > 0) ||
    (typeof reasoning?.classification === 'string' && reasoning.classification.trim().length > 0);

  return hasSummary && hasIntent && hasNextAction && hasScore && hasClassification;
}

function stageBlockingReason(
  key: AgentFlowStageKey,
  source: FlowSourceData
): string | null {
  const lead = source.lead;
  const deal = source.deal;
  const quote = source.quote;
  const automationRuns = source.automationRuns;

  switch (key) {
    case 'triaged': {
      const failedLeadAiRun = automationRuns.find(
        (run) =>
          run?.workflow_name === 'lead_ai_processing' &&
          ['failed', 'error', 'cancelled'].includes(String(run?.status || '').toLowerCase()) &&
          (run?.trigger_entity_id === lead?.id || !run?.trigger_entity_id)
      );
      if (!lead?.ai_processed_at && failedLeadAiRun) {
        return 'Latest lead AI processing run failed/cancelled.';
      }
      return null;
    }

    case 'quote_ready': {
      if (!deal && !quote) {
        return 'Deal is not open yet; quote cannot be prepared.';
      }
      return null;
    }

    case 'quote_sent': {
      if (quote?.status && ['cancelled', 'rejected', 'expired'].includes(String(quote.status).toLowerCase())) {
        return `Quote is ${String(quote.status).toLowerCase()}.`;
      }
      return null;
    }

    case 'won_lost': {
      if (quote?.status && ['cancelled', 'rejected', 'expired'].includes(String(quote.status).toLowerCase())) {
        return `Quote is ${String(quote.status).toLowerCase()}; outcome must be reconciled before closure.`;
      }
      return null;
    }

    default:
      return null;
  }
}

function stageCompleted(
  key: AgentFlowStageKey,
  source: FlowSourceData
): { completed: boolean; evidence: string[] } {
  const evidence: string[] = [];
  const lead = source.lead;
  const deal = source.deal;
  const quote = source.quote;
  const activities = source.activities;
  const automationRuns = source.automationRuns;

  switch (key) {
    case 'lead_new': {
      if (lead) {
        evidence.push('Lead record exists.');
        return { completed: true, evidence };
      }
      return { completed: false, evidence };
    }

    case 'triaged': {
      if (lead?.ai_processed_at && hasStructuredTriagePayload(lead)) {
        evidence.push('Lead has ai_processed_at.');
        evidence.push('Lead has structured triage payload.');
      }
      return { completed: evidence.length > 0, evidence };
    }

    case 'qualified': {
      if (lead?.status === 'qualified') {
        evidence.push('Lead status is qualified.');
      }
      if (lead?.assigned_to_user_id) {
        evidence.push(`Lead owner is assigned (${lead.assigned_to_user_id}).`);
      }
      if (hasActivity(activities, 'lead_status_changed') && String(lead?.status ?? '').toLowerCase() === 'qualified') {
        evidence.push('Lead status changed activity confirms qualification.');
      }
      if (deal) {
        evidence.push('Deal exists, implying qualification gate was passed.');
        if (lead?.assigned_to_user_id && deal.owner_user_id === lead.assigned_to_user_id) {
          evidence.push('Deal owner matches qualified lead owner.');
        }
      }
      if (quote) {
        evidence.push('Quote exists, implying qualification and deal progression.');
      }
      return { completed: evidence.length > 0, evidence };
    }

    case 'reply_sent': {
      if (hasActivity(activities, 'ai_lead_intelligence_action')) {
        evidence.push('AI lead intelligence action activity exists.');
      }
      if (hasActivity(activities, 'email_sent')) {
        evidence.push('Email sent activity exists.');
      }
      if (hasActivity(activities, 'ai_reply_studio_approved_send')) {
        evidence.push('Reply Studio approved/send activity exists.');
      }
      return { completed: evidence.length > 0, evidence };
    }

    case 'deal_open': {
      if (deal) {
        evidence.push('Deal record exists.');
      }
      if (deal?.stage && !['won', 'lost'].includes(String(deal.stage).toLowerCase())) {
        evidence.push(`Deal is open in stage ${deal.stage}.`);
      }
      return { completed: evidence.length > 0, evidence };
    }

    case 'quote_ready': {
      if (quote) {
        evidence.push('Quote record exists.');
      }
      if (source.quoteItemCount > 0) {
        evidence.push('Quote has at least one line item.');
      }
      if (hasActivity(activities, 'quote_created')) {
        evidence.push('Quote created activity exists.');
      }
      return { completed: evidence.length > 0, evidence };
    }

    case 'quote_sent': {
      if (quote?.status === 'sent') {
        evidence.push('Quote status is sent.');
      }
      if (hasActivity(activities, 'quote_sent')) {
        evidence.push('Quote sent activity exists.');
      }
      return { completed: evidence.length > 0, evidence };
    }

    case 'negotiation': {
      if (deal?.stage === 'negotiation') {
        evidence.push('Deal stage is negotiation.');
      }
      if (deal?.stage === 'won' || deal?.stage === 'lost') {
        evidence.push(`Deal already reached outcome stage (${deal.stage}) after negotiation.`);
      }
      return { completed: evidence.length > 0, evidence };
    }

    case 'won_lost': {
      if (deal?.stage === 'won') {
        evidence.push('Deal stage is won.');
      }
      if (deal?.stage === 'lost') {
        evidence.push('Deal stage is lost.');
      }
      if (lead?.status === 'won') {
        evidence.push('Lead status is won.');
      }
      if (lead?.status === 'lost') {
        evidence.push('Lead status is lost.');
      }
      return { completed: evidence.length > 0, evidence };
    }

    case 'post_outcome': {
      const reasoning =
        lead?.ai_reasoning && typeof lead.ai_reasoning === 'object'
          ? (lead.ai_reasoning as Record<string, unknown>)
          : null;
      const postOutcomeSummary =
        reasoning && typeof reasoning.postOutcomeSummary === 'string'
          ? reasoning.postOutcomeSummary.trim()
          : '';
      const postOutcomeAtRaw =
        reasoning && typeof reasoning.postOutcomeAt === 'string'
          ? reasoning.postOutcomeAt.trim()
          : '';

      if (postOutcomeSummary) {
        evidence.push(`Summary: ${postOutcomeSummary}`);
      }
      if (postOutcomeAtRaw) {
        const parsed = parseDate(postOutcomeAtRaw);
        evidence.push(`Recorded at: ${parsed ? parsed.toISOString() : postOutcomeAtRaw}`);
      }
      if (hasActivity(activities, 'ai_post_outcome_analysis')) {
        evidence.push('Audit trail: Post-outcome AI analysis activity exists.');
      }
      return { completed: evidence.length > 0, evidence };
    }

    default:
      return { completed: false, evidence };
  }
}

function buildStages(source: FlowSourceData): AgentFlowStage[] {
  const preliminary = CANONICAL_STAGE_DEFS.map((stageDef, index) => {
    const result = stageCompleted(stageDef.key, source);
    const blockerReason = stageBlockingReason(stageDef.key, source);

    return {
      key: stageDef.key,
      order: index + 1,
      label: stageDef.label,
      description: stageDef.description,
      status: 'pending' as AgentFlowStageStatus,
      completed: result.completed,
      evidence: blockerReason ? [blockerReason, ...result.evidence] : result.evidence,
      blockerReason,
    };
  });

  const firstIncompleteIndex = preliminary.findIndex((stage) => !stage.completed);

  return preliminary.map((stage, index) => {
    if (stage.completed) {
      return { ...stage, status: 'completed' };
    }

    // Only the first incomplete stage is actionable/blocked.
    // Downstream incomplete stages remain pending until lifecycle reaches them.
    if (index === firstIncompleteIndex) {
      if (stage.blockerReason) {
        return { ...stage, status: 'blocked' };
      }
      return { ...stage, status: 'active' };
    }

    return { ...stage, status: 'pending' };
  });
}

function deriveBlockers(stages: AgentFlowStage[]): string[] {
  const blockers: string[] = [];

  const activeStage = stages.find((stage) => stage.status === 'active');
  const blockedStages = stages.filter((stage) => stage.status === 'blocked');

  if (blockedStages.length > 0) {
    blockedStages.forEach((stage) => {
      if (stage.evidence.length > 0) {
        blockers.push(`${stage.label}: ${stage.evidence[0]}`);
      } else {
        blockers.push(`${stage.label}: blocked without explicit evidence.`);
      }
    });
  }

  if (activeStage && activeStage.evidence.length === 0) {
    blockers.push(`${activeStage.label}: missing evidence to move forward.`);
  }

  if (!stages.find((stage) => stage.key === 'triaged')?.completed) {
    blockers.push('Triaged: lead has not been analyzed yet.');
  }

  if (!stages.find((stage) => stage.key === 'reply_sent')?.completed) {
    blockers.push('Reply Sent: no sent reply evidence detected.');
  }

  if (!stages.find((stage) => stage.key === 'quote_ready')?.completed) {
    blockers.push('Quote Ready: no quote preparation evidence found yet.');
  }

  if (!stages.find((stage) => stage.key === 'quote_sent')?.completed) {
    blockers.push('Quote Sent: no sent quote evidence found yet.');
  }

  return Array.from(new Set(blockers)).slice(0, 5);
}

function deriveRecommendedNextMove(stages: AgentFlowStage[]): string {
  const allCompleted = stages.length > 0 && stages.every((stage) => stage.completed);
  if (allCompleted) {
    return 'Lifecycle is fully completed. Review activities and close-loop summary for audit.';
  }

  const activeStage = stages.find((stage) => stage.status === 'active');

  if (!activeStage) {
    return 'Review the opportunity data and re-run the flow analysis.';
  }

  switch (activeStage.key) {
    case 'lead_new':
      return 'Review the lead and start AI analysis / triage.';
    case 'triaged':
      return 'Run lead triage so the system can generate intelligence and scoring.';
    case 'qualified':
      return 'Qualify the lead and confirm commercial readiness.';
    case 'reply_sent':
      return 'Generate or send the first reply from the intelligence workflow.';
    case 'deal_open':
      return 'Convert the lead to a deal and assign ownership.';
    case 'quote_ready':
      return 'Prepare quote recommendations and generate quote-ready summary.';
    case 'quote_sent':
      return 'Send the quote and record the commercial handoff.';
    case 'negotiation':
      return 'Advance negotiation with pricing, scope, or timing clarification.';
    case 'won_lost':
      return 'Record the final outcome as won or lost.';
    case 'post_outcome':
      return 'Mark close and record post-outcome checkpoint for audit and optimization.';
    default:
      return 'Review the active stage and move the lead forward manually.';
  }
}

function deriveMarkers(source: FlowSourceData): AgentFlowMarker[] {
  const markers: AgentFlowMarker[] = [];
  const lead = source.lead;
  const deal = source.deal;
  const quote = source.quote;
  const activities = source.activities;
  const automationRuns = source.automationRuns;

  if (lead?.ai_processed_at) {
    markers.push({
      type: 'ai_action',
      label: 'AI Triage',
      stageKey: 'triaged',
      details: 'Lead was analyzed by the AI triage pipeline.',
    });
  }

  if (activities.some((item) => item.activity_type === 'ai_lead_intelligence_action')) {
    markers.push({
      type: 'ai_action',
      label: 'AI Lead Intelligence Action',
      stageKey: 'reply_sent',
      details: 'AI-assisted reply, convert, or prioritize action was recorded.',
    });
  }

  if (deal) {
    markers.push({
      type: 'human_checkpoint',
      label: 'Deal Open',
      stageKey: 'deal_open',
      details: 'Deal record exists and indicates active sales progression.',
    });
  }

  if (quote) {
    markers.push({
      type: 'human_checkpoint',
      label: 'Quote Ready',
      stageKey: 'quote_ready',
      details: 'Quote preparation evidence exists.',
    });
  }

  if (quote?.status === 'sent' || activities.some((item) => item.activity_type === 'quote_sent')) {
    markers.push({
      type: 'pending_approval',
      label: 'Quote Awaiting Response',
      stageKey: 'quote_sent',
      details: 'Quote was sent and is awaiting customer response or approval.',
    });
  }

  if (automationRuns.length > 0) {
    markers.push({
      type: 'automation_action',
      label: 'Automation Run',
      stageKey: 'reply_sent',
      details: 'Automation execution records were found for this opportunity.',
    });
  }

  if (activities.some((item) => item.activity_type === 'followup_scheduled')) {
    markers.push({
      type: 'automation_action',
      label: 'Follow-up Scheduled',
      stageKey: 'reply_sent',
      details: 'A follow-up scheduling activity exists.',
    });
  }

  if (deal?.stage === 'negotiation') {
    markers.push({
      type: 'human_checkpoint',
      label: 'Negotiation Review',
      stageKey: 'negotiation',
      details: 'Deal is in negotiation and likely requires human oversight.',
    });
  }

  if (deal?.stage === 'won' || deal?.stage === 'lost' || lead?.status === 'won' || lead?.status === 'lost') {
    markers.push({
      type: 'human_checkpoint',
      label: 'Outcome Recorded',
      stageKey: 'won_lost',
      details: 'Opportunity outcome has been marked as won/lost.',
    });
  }

  return markers;
}

function deriveHumanCheckpoints(markers: AgentFlowMarker[]): string[] {
  return markers
    .filter((marker) => marker.type === 'human_checkpoint')
    .map((marker) => `${marker.label}: ${marker.details}`);
}

function derivePendingApprovals(
  source: FlowSourceData,
  markers: AgentFlowMarker[]
): string[] {
  const approvals: string[] = [];

  if (source.quote?.status === 'sent') {
    approvals.push('Quote approval is pending from the customer.');
  }

  if (source.deal?.stage === 'negotiation') {
    approvals.push('Negotiation outcome is still pending.');
  }

  markers
    .filter((marker) => marker.type === 'pending_approval')
    .forEach((marker) => approvals.push(marker.details));

  return Array.from(new Set(approvals));
}

function deriveConfidenceTrend(source: FlowSourceData): Array<{ label: string; value: number }> {
  const lead = source.lead;
  const currentScore = typeof lead?.ai_score === 'number' ? lead.ai_score : 0;
  const previous = Math.max(0, currentScore - 18);
  const mid = Math.max(previous, currentScore - 8);

  return [
    { label: 'Intake', value: previous },
    { label: 'Analysis', value: mid },
    { label: 'Current', value: currentScore },
  ];
}

function deriveRiskHints(source: FlowSourceData, stages: AgentFlowStage[]): string[] {
  const hints: string[] = [];
  const lead = source.lead;
  const deal = source.deal;
  const quote = source.quote;

  if (!lead?.ai_processed_at) {
    hints.push('Lead has not been analyzed by AI yet.');
  }

  if (!stages.find((stage) => stage.key === 'reply_sent')?.completed) {
    hints.push('No reply-sent evidence detected.');
  }

  if (!stages.find((stage) => stage.key === 'quote_ready')?.completed) {
    hints.push('Quote is not ready yet; missing quote preparation evidence.');
  }

  if (!quote) {
    hints.push('No quote has been prepared yet.');
  }

  if (deal?.stage === 'negotiation') {
    hints.push('Deal is in negotiation and may stall without intervention.');
  }

  if (typeof lead?.ai_fallback_used === 'boolean' && lead.ai_fallback_used) {
    hints.push('Current intelligence used fallback mode instead of the primary provider.');
  }

  if (typeof lead?.ai_score === 'number' && lead.ai_score < 50) {
    hints.push('Lead score is below 50, suggesting weaker commercial readiness.');
  }

  return Array.from(new Set(hints)).slice(0, 5);
}

function parseDate(input: unknown): Date | null {
  if (!input) return null;
  const date = new Date(String(input));
  return Number.isNaN(date.getTime()) ? null : date;
}

function getStageStartAt(
  stageKey: AgentFlowStageKey,
  source: FlowSourceData
): Date | null {
  const lead = source.lead;
  const deal = source.deal;
  const quote = source.quote;

  switch (stageKey) {
    case 'lead_new':
      return parseDate(lead?.created_at);
    case 'triaged':
      return parseDate(lead?.ai_processed_at) ?? parseDate(lead?.updated_at);
    case 'qualified':
      return parseDate(lead?.updated_at);
    case 'reply_sent': {
      const latestReplyEvidence = source.activities
        .filter((item) =>
          ['ai_reply_studio', 'ai_reply_studio_approved_send', 'email_sent'].includes(
            String(item.activity_type ?? '')
          )
        )
        .sort(
          (a, b) =>
            new Date(String(b.created_at ?? b.occurred_at ?? 0)).getTime() -
            new Date(String(a.created_at ?? a.occurred_at ?? 0)).getTime()
        )[0];
      return parseDate(latestReplyEvidence?.created_at ?? latestReplyEvidence?.occurred_at) ?? parseDate(lead?.updated_at);
    }
    case 'deal_open':
      return parseDate(deal?.created_at) ?? parseDate(deal?.updated_at);
    case 'quote_ready':
      return parseDate(quote?.created_at) ?? parseDate(quote?.updated_at);
    case 'quote_sent':
      return parseDate(quote?.updated_at) ?? parseDate(quote?.created_at);
    case 'negotiation':
      return parseDate(deal?.updated_at) ?? parseDate(deal?.created_at);
    case 'won_lost':
      return parseDate(deal?.updated_at) ?? parseDate(lead?.updated_at);
    case 'post_outcome': {
      const reasoning = lead?.ai_reasoning;
      const postOutcomeAt =
        reasoning && typeof reasoning === 'object' ? (reasoning as Record<string, unknown>).postOutcomeAt : null;
      return parseDate(postOutcomeAt) ?? parseDate(lead?.updated_at);
    }
    default:
      return null;
  }
}

function deriveStageSlaAlerts(
  source: FlowSourceData,
  stages: AgentFlowStage[]
): AgentFlowResult['stageSlaAlerts'] {
  const now = Date.now();
  const actionable = stages.filter((stage) => stage.status === 'active' || stage.status === 'blocked');
  const alerts: AgentFlowResult['stageSlaAlerts'] = [];

  for (const stage of actionable) {
    const startedAt = getStageStartAt(stage.key, source);
    if (!startedAt) continue;
    const elapsedHours = Math.max(0, Math.round((now - startedAt.getTime()) / (1000 * 60 * 60)));
    const slaHours = STAGE_SLA_HOURS[stage.key];
    if (elapsedHours < slaHours) continue;

    const overrunPct = Math.round((elapsedHours / Math.max(slaHours, 1)) * 100);
    const severity: 'warning' | 'critical' = overrunPct >= 180 ? 'critical' : 'warning';
    alerts.push({
      stageKey: stage.key,
      stageLabel: stage.label,
      elapsedHours,
      slaHours,
      severity,
      message:
        severity === 'critical'
          ? `${stage.label} exceeded SLA by ${elapsedHours - slaHours}h. Escalate now.`
          : `${stage.label} reached SLA threshold. Prioritize next action.`,
    });
  }

  return alerts.slice(0, 4);
}

function deriveTransitionGuardrails(source: FlowSourceData): AgentFlowResult['transitionGuardrails'] {
  const quote = source.quote;
  const guardrails: AgentFlowResult['transitionGuardrails'] = [];

  const quoteExists = !!quote;
  guardrails.push({
    stageKey: 'quote_sent',
    rule: 'Quote record exists',
    passed: quoteExists,
    message: quoteExists ? 'Quote record found.' : 'No quote found. Run Quote Recommendation/Copilot first.',
  });

  const hasItems = source.quoteItemCount > 0;
  guardrails.push({
    stageKey: 'quote_sent',
    rule: 'Quote has at least one line item',
    passed: hasItems,
    message: hasItems ? 'Quote line items present.' : 'Add quote line items before sending.',
  });

  const total = Number(quote?.total_amount ?? 0);
  const totalValid = Number.isFinite(total) && total > 0;
  guardrails.push({
    stageKey: 'quote_sent',
    rule: 'Quote total amount is valid',
    passed: totalValid,
    message: totalValid ? 'Quote total amount is valid.' : 'Quote total amount is missing or zero.',
  });

  const validUntil = parseDate(quote?.valid_until);
  const validUntilOk = !!validUntil;
  guardrails.push({
    stageKey: 'quote_sent',
    rule: 'Quote validity date is set',
    passed: validUntilOk,
    message: validUntilOk ? 'Validity date set.' : 'Set quote validity date before sending.',
  });

  return guardrails;
}

function deriveCloseLoopSummary(source: FlowSourceData): AgentFlowResult['closeLoopSummary'] {
  const aiActions = source.activities
    .filter((item) => String(item.activity_type ?? '').startsWith('ai_'))
    .slice(-5)
    .map((item) => `${item.title ?? item.activity_type}`);

  const humanChanges = source.activities
    .filter((item) => !String(item.activity_type ?? '').startsWith('ai_'))
    .slice(-5)
    .map((item) => `${item.title ?? item.activity_type}`);

  const dealStage = String(source.deal?.stage ?? '').toLowerCase();
  const leadStatus = String(source.lead?.status ?? '').toLowerCase();
  const quoteStatus = String(source.quote?.status ?? '').toLowerCase();
  let result = 'In progress';
  if (dealStage === 'won' || leadStatus === 'won') result = 'Won';
  else if (dealStage === 'lost' || leadStatus === 'lost') result = 'Lost';
  else if (quoteStatus === 'sent') result = 'Quote sent, awaiting outcome';

  return {
    aiActions: aiActions.length > 0 ? aiActions : ['No AI actions recorded yet.'],
    humanChanges: humanChanges.length > 0 ? humanChanges : ['No human changes recorded yet.'],
    result,
  };
}

function deriveOutcomeSummary(source: FlowSourceData): AgentFlowResult['outcomeSummary'] {
  const dealStage = String(source.deal?.stage ?? '').toLowerCase();
  const leadStatus = String(source.lead?.status ?? '').toLowerCase();

  if (dealStage === 'won' || dealStage === 'lost') {
    return {
      outcome: dealStage === 'won' ? 'won' : 'lost',
      source: 'deal',
      stage: source.deal?.stage ?? null,
      updatedAt:
        (source.deal?.won_at ? String(source.deal.won_at) : null) ??
        (source.deal?.updated_at ? String(source.deal.updated_at) : null) ??
        null,
      reason: source.deal?.lost_reason ? String(source.deal.lost_reason) : null,
    };
  }

  if (leadStatus === 'won' || leadStatus === 'lost') {
    return {
      outcome: leadStatus === 'won' ? 'won' : 'lost',
      source: 'lead',
      stage: source.lead?.status ?? null,
      updatedAt: source.lead?.updated_at ? String(source.lead.updated_at) : null,
      reason: null,
    };
  }

  return {
    outcome: 'pending',
    source: 'none',
    stage: source.deal?.stage ?? source.lead?.status ?? null,
    updatedAt:
      (source.deal?.updated_at ? String(source.deal.updated_at) : null) ??
      (source.lead?.updated_at ? String(source.lead.updated_at) : null) ??
      null,
    reason: null,
  };
}

function summarizeFlow(stages: AgentFlowStage[]) {
  const completedCount = stages.filter((stage) => stage.completed).length;
  const active = stages.find((stage) => stage.status === 'active') ?? stages[stages.length - 1];

  return `Completed ${completedCount}/${stages.length} stages. Current active stage: ${active.label}.`;
}

export async function resolveAgentFlow(input: {
  leadId?: string;
  dealId?: string;
  context: FlowRequestContext;
}): Promise<AgentFlowResult> {
  const { leadId, dealId, context } = input;

  let lead = null;
  let deal = null;

  if (leadId) {
    lead = await prisma.leads.findFirst({
      where:
        context.role === 'sales_rep'
          ? { id: leadId, assigned_to_user_id: context.userId }
          : { id: leadId },
    });
  }

  if (dealId) {
    deal = await prisma.deals.findFirst({
      where:
        context.role === 'sales_rep'
          ? { id: dealId, owner_user_id: context.userId }
          : { id: dealId },
    });
  }

  if (!deal && lead) {
    deal = await prisma.deals.findFirst({
      where:
        context.role === 'sales_rep'
          ? { lead_id: lead.id, owner_user_id: context.userId }
          : { lead_id: lead.id },
      orderBy: { created_at: 'desc' },
    });
  }

  if (!lead && deal?.lead_id) {
    lead = await prisma.leads.findFirst({
      where:
        context.role === 'sales_rep'
          ? { id: deal.lead_id, assigned_to_user_id: context.userId }
          : { id: deal.lead_id },
    });
  }

  if (!lead && !deal) {
    throw new Error('Lead or deal not found or not accessible.');
  }

  const quote = await prisma.quotes.findFirst({
    where: {
      OR: [
        ...(lead ? [{ lead_id: lead.id }] : []),
        ...(deal ? [{ deal_id: deal.id }] : []),
      ],
    },
    orderBy: { created_at: 'desc' },
  });

  const activities = await prisma.activities.findMany({
    where: {
      OR: [
        ...(lead ? [{ lead_id: lead.id }] : []),
        ...(deal ? [{ deal_id: deal.id }] : []),
        ...(quote ? [{ quote_id: quote.id }] : []),
      ],
    },
    orderBy: { created_at: 'asc' },
  });

  const automationRuns = await prisma.automation_runs.findMany({
    orderBy: { created_at: 'desc' },
    take: 25,
  });

  const quoteItemCount = quote
    ? await prisma.quote_items.count({
        where: { quote_id: quote.id },
      })
    : 0;

  const sourceData: FlowSourceData = {
    lead,
    deal,
    quote,
    activities,
    automationRuns,
    quoteItemCount,
  };

  const stages = buildStages(sourceData);

  const activeStage =
    stages.find((stage) => stage.status === 'active') ?? stages[stages.length - 1];

  const completionPercent = Math.round(
    (stages.filter((stage) => stage.completed).length / stages.length) * 100
  );

    const blockers = deriveBlockers(stages);
    const recommendedNextMove = deriveRecommendedNextMove(stages);
        const markers = deriveMarkers(sourceData);
    const humanCheckpoints = deriveHumanCheckpoints(markers);
    const pendingApprovals = derivePendingApprovals(sourceData, markers);
    const confidenceTrend = deriveConfidenceTrend(sourceData);
    const riskHints = deriveRiskHints(sourceData, stages);
    const stageSlaAlerts = deriveStageSlaAlerts(sourceData, stages);
    const transitionGuardrails = deriveTransitionGuardrails(sourceData);
    const closeLoopSummary = deriveCloseLoopSummary(sourceData);
    const outcomeSummary = deriveOutcomeSummary(sourceData);

  return {
    leadId: lead?.id ?? null,
    dealId: deal?.id ?? null,
    quoteId: quote?.id ?? null,
    leadOwnerUserId: lead?.assigned_to_user_id ?? null,
    dealOwnerUserId: deal?.owner_user_id ?? null,
    stages,
    activeStageKey: activeStage.key,
    completionPercent,
    summary: summarizeFlow(stages),
    blockers,
    recommendedNextMove,
    markers,
    humanCheckpoints,
    pendingApprovals,
    confidenceTrend,
    riskHints,
    stageSlaAlerts,
    transitionGuardrails,
    closeLoopSummary,
    outcomeSummary,
  };
}
