import { prisma } from '@/lib/prisma';

export type AgentFlowStageKey =
  | 'lead_received'
  | 'ai_analysis'
  | 'qualification'
  | 'reply_prepared'
  | 'human_review'
  | 'quote_preparation'
  | 'quote_sent'
  | 'followup_automation'
  | 'negotiation'
  | 'decision'
  | 'post_outcome_intelligence';

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
};

const CANONICAL_STAGE_DEFS: Array<{
  key: AgentFlowStageKey;
  label: string;
  description: string;
}> = [
  {
    key: 'lead_received',
    label: 'Lead Received',
    description: 'Lead was captured and is available for sales handling.',
  },
  {
    key: 'ai_analysis',
    label: 'AI Analysis',
    description: 'AI triage/intelligence has been generated for the lead.',
  },
  {
    key: 'qualification',
    label: 'Qualification',
    description: 'Lead has been qualified and prioritized.',
  },
  {
    key: 'reply_prepared',
    label: 'Reply Prepared',
    description: 'Prepare a draft reply or first response for the lead.',
  },
  {
    key: 'human_review',
    label: 'Human Review',
    description: 'A human operator reviewed or acted on the lead.',
  },
  {
    key: 'quote_preparation',
    label: 'Quote Preparation',
    description: 'A quote or deal preparation step has started.',
  },
  {
    key: 'quote_sent',
    label: 'Quote Sent',
    description: 'A quote has been sent or commercial offer has been recorded.',
  },
  {
    key: 'followup_automation',
    label: 'Follow-up Automation',
    description: 'Automation runs or scheduled follow-up activity exists.',
  },
  {
    key: 'negotiation',
    label: 'Negotiation',
    description: 'The lead/deal is in a negotiation-like stage.',
  },
  {
    key: 'decision',
    label: 'Decision',
    description: 'The opportunity is won, lost, or at a terminal decision stage.',
  },
  {
    key: 'post_outcome_intelligence',
    label: 'Post-Outcome Intelligence',
    description: 'Outcome intelligence or post-close reasoning has been captured.',
  },
];

function hasActivity(activities: any[], activityType: string) {
  return activities.some((item) => item.activity_type === activityType);
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
    case 'ai_analysis': {
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

    case 'followup_automation': {
      const failedFollowupRun = automationRuns.find(
        (run) =>
          ['failed', 'error', 'cancelled'].includes(String(run?.status || '').toLowerCase()) &&
          (run?.trigger_entity_id === lead?.id || run?.trigger_entity_id === deal?.id)
      );
      if (failedFollowupRun) {
        return 'Automation execution has failed for this opportunity.';
      }
      return null;
    }

    case 'quote_sent': {
      if (quote?.status && ['cancelled', 'rejected', 'expired'].includes(String(quote.status).toLowerCase())) {
        return `Quote is ${String(quote.status).toLowerCase()}.`;
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
    case 'lead_received': {
      if (lead) {
        evidence.push('Lead record exists.');
        return { completed: true, evidence };
      }
      return { completed: false, evidence };
    }

    case 'ai_analysis': {
      if (lead?.ai_processed_at) {
        evidence.push('Lead has ai_processed_at.');
      }
      if (lead?.ai_reasoning) {
        evidence.push('Lead has ai_reasoning.');
      }
      return { completed: evidence.length > 0, evidence };
    }

    case 'qualification': {
      if (lead?.status === 'qualified') {
        evidence.push('Lead status is qualified.');
      }
      if (lead?.ai_classification) {
        evidence.push(`Lead has ai_classification=${lead.ai_classification}.`);
      }
      return { completed: evidence.length > 0, evidence };
    }

    case 'reply_prepared': {
      if (hasActivity(activities, 'ai_lead_intelligence_action')) {
        evidence.push('AI lead intelligence action activity exists.');
      }
      if (hasActivity(activities, 'email_sent')) {
        evidence.push('Email sent activity exists.');
      }
      return { completed: evidence.length > 0, evidence };
    }

    case 'human_review': {
      if (hasActivity(activities, 'note_added')) {
        evidence.push('Manual note activity exists.');
      }
      if (hasActivity(activities, 'status_changed')) {
        evidence.push('Status change activity exists.');
      }
      if (hasActivity(activities, 'ai_lead_triage')) {
        evidence.push('AI triage activity exists for operator review context.');
      }
      return { completed: evidence.length > 0, evidence };
    }

    case 'quote_preparation': {
      if (deal) {
        evidence.push('Deal record exists.');
      }
      if (quote) {
        evidence.push('Quote record exists.');
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

    case 'followup_automation': {
      if (automationRuns.length > 0) {
        evidence.push('Automation run records exist.');
      }
      if (hasActivity(activities, 'followup_scheduled')) {
        evidence.push('Follow-up scheduled activity exists.');
      }
      return { completed: evidence.length > 0, evidence };
    }

    case 'negotiation': {
      if (deal?.stage === 'negotiation') {
        evidence.push('Deal stage is negotiation.');
      }
      if (lead?.status === 'quoted') {
        evidence.push('Lead status is quoted.');
      }
      return { completed: evidence.length > 0, evidence };
    }

    case 'decision': {
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

    case 'post_outcome_intelligence': {
      if (lead?.ai_reasoning?.postOutcomeSummary) {
        evidence.push('Lead AI reasoning contains postOutcomeSummary.');
      }
      if (hasActivity(activities, 'ai_post_outcome_analysis')) {
        evidence.push('Post-outcome AI analysis activity exists.');
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

  const firstActionableIndex = preliminary.findIndex(
    (stage) => !stage.completed && !stage.blockerReason
  );

  return preliminary.map((stage, index) => {
    if (stage.completed) {
      return { ...stage, status: 'completed' };
    }

    if (stage.blockerReason) {
      return { ...stage, status: 'blocked' };
    }

    if (firstActionableIndex === index) {
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

  if (!stages.find((stage) => stage.key === 'ai_analysis')?.completed) {
    blockers.push('AI Analysis: lead has not been analyzed yet.');
  }

  if (!stages.find((stage) => stage.key === 'reply_prepared')?.completed) {
    blockers.push('Reply Prepared: no reply draft or email activity detected.');
  }

  if (!stages.find((stage) => stage.key === 'quote_sent')?.completed) {
    blockers.push('Quote Sent: no sent quote evidence found yet.');
  }

  return Array.from(new Set(blockers)).slice(0, 5);
}

function deriveRecommendedNextMove(stages: AgentFlowStage[]): string {
  const activeStage = stages.find((stage) => stage.status === 'active');

  if (!activeStage) {
    return 'Review the opportunity data and re-run the flow analysis.';
  }

  switch (activeStage.key) {
    case 'lead_received':
      return 'Review the lead and start AI analysis / triage.';
    case 'ai_analysis':
      return 'Run lead triage so the system can generate intelligence and scoring.';
    case 'qualification':
      return 'Qualify the lead and confirm commercial readiness.';
    case 'reply_prepared':
      return 'Generate or send the first reply from the intelligence workflow.';
    case 'human_review':
      return 'Have a sales operator review the lead and confirm next action.';
    case 'quote_preparation':
      return 'Prepare a deal or quote based on the current lead requirements.';
    case 'quote_sent':
      return 'Send the quote and record the commercial handoff.';
    case 'followup_automation':
      return 'Schedule or verify follow-up automation for the opportunity.';
    case 'negotiation':
      return 'Advance negotiation with pricing, scope, or timing clarification.';
    case 'decision':
      return 'Record the final outcome as won or lost.';
    case 'post_outcome_intelligence':
      return 'Capture post-outcome reasoning and lessons for future AI guidance.';
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
      stageKey: 'ai_analysis',
      details: 'Lead was analyzed by the AI triage pipeline.',
    });
  }

  if (activities.some((item) => item.activity_type === 'ai_lead_intelligence_action')) {
    markers.push({
      type: 'ai_action',
      label: 'AI Lead Intelligence Action',
      stageKey: 'reply_prepared',
      details: 'AI-assisted reply, convert, or prioritize action was recorded.',
    });
  }

  if (quote) {
    markers.push({
      type: 'human_checkpoint',
      label: 'Quote Prepared',
      stageKey: 'quote_preparation',
      details: 'A quote record exists and indicates human or operator intervention.',
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
      stageKey: 'followup_automation',
      details: 'Automation execution records were found for this opportunity.',
    });
  }

  if (activities.some((item) => item.activity_type === 'followup_scheduled')) {
    markers.push({
      type: 'automation_action',
      label: 'Follow-up Scheduled',
      stageKey: 'followup_automation',
      details: 'A follow-up scheduling activity exists.',
    });
  }

  if (activities.some((item) => item.activity_type === 'note_added')) {
    markers.push({
      type: 'human_checkpoint',
      label: 'Operator Review',
      stageKey: 'human_review',
      details: 'A human note was added during the flow.',
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

  const currentScore =
    typeof lead?.ai_score === 'number' ? lead.ai_score : 0;

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

  if (!stages.find((stage) => stage.key === 'reply_prepared')?.completed) {
    hints.push('No reply preparation evidence detected.');
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

  const stages = buildStages({
    lead,
    deal,
    quote,
    activities,
    automationRuns,
  });

  const activeStage =
    stages.find((stage) => stage.status === 'active') ?? stages[stages.length - 1];

  const completionPercent = Math.round(
    (stages.filter((stage) => stage.completed).length / stages.length) * 100
  );

    const blockers = deriveBlockers(stages);
    const recommendedNextMove = deriveRecommendedNextMove(stages);

    const markers = deriveMarkers({
    lead,
    deal,
    quote,
    activities,
    automationRuns,
    });
    const humanCheckpoints = deriveHumanCheckpoints(markers);
    const pendingApprovals = derivePendingApprovals(
    { lead, deal, quote, activities, automationRuns },
    markers
    );
    const confidenceTrend = deriveConfidenceTrend({
    lead,
    deal,
    quote,
    activities,
    automationRuns,
    });
    const riskHints = deriveRiskHints(
    { lead, deal, quote, activities, automationRuns },
    stages
    );

    return {
    leadId: lead?.id ?? null,
    dealId: deal?.id ?? null,
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
    };
}
