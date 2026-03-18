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
};

export type AgentFlowResult = {
  leadId?: string | null;
  dealId?: string | null;
  stages: AgentFlowStage[];
  activeStageKey: AgentFlowStageKey;
  completionPercent: number;
  summary: string;
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
    description: 'A draft reply or first response has been generated.',
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

    return {
      key: stageDef.key,
      order: index + 1,
      label: stageDef.label,
      description: stageDef.description,
      status: 'pending' as AgentFlowStageStatus,
      completed: result.completed,
      evidence: result.evidence,
    };
  });

  const firstPendingIndex = preliminary.findIndex((stage) => !stage.completed);

  return preliminary.map((stage, index) => {
    if (stage.completed) {
      return { ...stage, status: 'completed' };
    }

    if (firstPendingIndex === index) {
      return { ...stage, status: 'active' };
    }

    return { ...stage, status: 'pending' };
  });
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

  return {
    leadId: lead?.id ?? null,
    dealId: deal?.id ?? null,
    stages,
    activeStageKey: activeStage.key,
    completionPercent,
    summary: summarizeFlow(stages),
  };
}