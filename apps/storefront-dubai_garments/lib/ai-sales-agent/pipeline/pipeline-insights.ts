import { prisma } from '@/lib/prisma';
import { PipelineInsightPayloadSchema } from '@/lib/ai-sales-agent/contracts';
import { runStructuredWithRuntime } from '@/lib/ai-sales-agent/llm-runtime';
import { getAiModelConfig } from '@/lib/ai-sales-agent/model-config';

type PipelineInsightsContext = {
  userId: string;
  role: string;
  requestId?: string;
};

function daysBetween(value?: Date | string | null) {
  if (!value) return 999;
  const date = value instanceof Date ? value : new Date(value);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

export async function runPipelineInsights(input: {
  leadId?: string;
  dealId?: string;
  context: PipelineInsightsContext;
}) {
  let lead = null;
  let deal = null;

  if (input.leadId) {
    lead = await prisma.leads.findFirst({
      where:
        input.context.role === 'sales_rep'
          ? { id: input.leadId, assigned_to_user_id: input.context.userId }
          : { id: input.leadId },
    });
  }

  if (input.dealId) {
    deal = await prisma.deals.findFirst({
      where:
        input.context.role === 'sales_rep'
          ? { id: input.dealId, owner_user_id: input.context.userId }
          : { id: input.dealId },
    });
  }

  if (!lead && deal?.lead_id) {
    lead = await prisma.leads.findFirst({
      where:
        input.context.role === 'sales_rep'
          ? { id: deal.lead_id, assigned_to_user_id: input.context.userId }
          : { id: deal.lead_id },
    });
  }

  if (!lead && !deal) {
    throw new Error('Lead or deal not found or not accessible.');
  }

  const activities = await prisma.activities.findMany({
    where: {
      OR: [
        ...(lead ? [{ lead_id: lead.id }] : []),
        ...(deal ? [{ deal_id: deal.id }] : []),
      ],
    },
    orderBy: { created_at: 'desc' },
    take: 20,
  });

  const lastActivityAt = activities[0]?.created_at ?? lead?.updated_at ?? deal?.updated_at ?? null;
  const inactivityDays = daysBetween(lastActivityAt);

  const stageReference = deal?.updated_at ?? lead?.updated_at ?? lead?.created_at ?? null;
  const stageAgeDays = daysBetween(stageReference);

  const buildFallback = () => {
    const stalled = inactivityDays >= 5 || stageAgeDays >= 7;

    const riskReasons: Array<{ label: string; impact: 'low' | 'medium' | 'high' }> = [];

    if (stalled) {
      riskReasons.push({
        label: 'Opportunity appears stalled due to inactivity or aging stage.',
        impact: 'high',
      });
    }

    if (!lead?.ai_processed_at) {
      riskReasons.push({
        label: 'Lead still lacks AI analysis/triage.',
        impact: 'medium',
      });
    }

    if (deal?.stage === 'negotiation') {
      riskReasons.push({
        label: 'Deal is in negotiation and may need intervention.',
        impact: 'medium',
      });
    }

    if (lead?.status === 'new') {
      riskReasons.push({
        label: 'Lead is still in new status and has not progressed.',
        impact: 'medium',
      });
    }

    const riskScore = Math.min(
      100,
      (stalled ? 45 : 0) +
        (inactivityDays >= 3 ? 20 : 0) +
        (stageAgeDays >= 5 ? 15 : 0) +
        (deal?.stage === 'negotiation' ? 10 : 0) +
        (!lead?.ai_processed_at ? 10 : 0)
    );

    const urgencyQueue = [
      {
        title: 'Immediate follow-up',
        urgency: stalled ? ('critical' as const) : ('medium' as const),
        reason: stalled
          ? 'Stall signal detected from inactivity/stage aging.'
          : 'Maintain momentum on current opportunity.',
      },
      {
        title: 'Risk review',
        urgency: riskScore >= 70 ? ('high' as const) : ('medium' as const),
        reason: `Risk score currently ${riskScore}.`,
      },
    ];

    const nextAction = stalled
      ? 'Review the opportunity now and trigger follow-up or escalation.'
      : 'Proceed with the next scheduled touchpoint and keep the opportunity moving.';

    return {
      summary: stalled
        ? 'Pipeline insight detected a stalled or aging opportunity.'
        : 'Pipeline insight indicates the opportunity is active but should be monitored.',
      stalled,
      stageAgeDays,
      inactivityDays,
      riskScore,
      riskReasons,
      urgencyQueue,
      nextAction,
    };
  };
  const { config } = await getAiModelConfig();

  const runtimeResult = await runStructuredWithRuntime({
    requestId: input.context.requestId,
    feature: 'pipeline_insights',
    systemPrompt: `${config.prompts.copilotSystem}
Task: Assess stall signals, risk score/reasons, urgency queue, and next action for pipeline operations.`,
    userInput: JSON.stringify({
      leadId: lead?.id ?? null,
      dealId: deal?.id ?? null,
      leadStatus: lead?.status ?? null,
      dealStage: deal?.stage ?? null,
      inactivityDays,
      stageAgeDays,
      recentActivities: activities.map((activity) => ({
        type: activity.activity_type,
        title: activity.title,
        occurredAt: activity.created_at,
      })),
      leadSummary: {
        companyName: lead?.company_name ?? null,
        contactName: lead?.contact_name ?? null,
        notes: lead?.notes ?? null,
      },
    }),
    schemaLabel: 'PipelineInsightPayload',
    schemaHint:
      '{"summary":"string","stalled":true,"stageAgeDays":0,"inactivityDays":0,"riskScore":0,"riskReasons":[{"label":"string","impact":"low|medium|high"}],"urgencyQueue":[{"title":"string","urgency":"low|medium|high|critical","reason":"string"}],"nextAction":"string"}',
    outputSchema: PipelineInsightPayloadSchema,
    fallbackReasonPrefix: 'PipelineInsights:',
    fallback: buildFallback,
  });

  const source = runtimeResult.source;
  const provider = runtimeResult.provider;
  const model = runtimeResult.model;
  const fallbackUsed = runtimeResult.fallbackUsed;
  const schemaValid = runtimeResult.schemaValid;
  const processingMs = runtimeResult.processingMs;
  const failureReason = runtimeResult.failureReason;
  const data = runtimeResult.data;

  await prisma.activities.create({
    data: {
      user_id: input.context.userId,
      lead_id: lead?.id ?? null,
      deal_id: deal?.id ?? null,
      activity_type: 'ai_pipeline_insight',
      title: 'AI Pipeline Insight',
      details: `Generated pipeline insight with risk score ${data.riskScore}.`,
      metadata: {
        source,
        provider,
        fallbackUsed,
        failureReason,
        data,
      },
    },
  });

  return {
    leadId: lead?.id ?? null,
    dealId: deal?.id ?? null,
    source,
    provider,
    model,
    fallbackUsed,
    schemaValid,
    processingMs,
    failureReason,
    data,
  };
}
