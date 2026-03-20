import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { runStructuredWithRuntime } from './llm-runtime';

type RoutingContext = {
  userId: string;
  role: string;
};

const SmartRoutingSlaOutputSchema = z.object({
  recommendedOwner: z.string().nullable(),
  routingReason: z.string(),
  slaBucket: z.enum(['on_track', 'at_risk', 'breached']),
  slaReason: z.string(),
  recommendedAction: z.string(),
});

function daysBetween(value?: Date | string | null) {
  if (!value) return 999;
  const date = value instanceof Date ? value : new Date(value);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

export async function runSmartRoutingSla(input: {
  leadId?: string;
  dealId?: string;
  dryRun?: boolean;
  context: RoutingContext;
}) {
  let lead: Awaited<ReturnType<typeof prisma.leads.findFirst>> = null;
  let deal: Awaited<ReturnType<typeof prisma.deals.findFirst>> = null;

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

  async function resolveRecommendedOwnerId() {
    if (lead?.assigned_to_user_id) return lead.assigned_to_user_id;
    if (deal?.owner_user_id) return deal.owner_user_id;

    if (input.context.role === 'sales_rep' || input.context.role === 'sales_manager') {
      return input.context.userId;
    }

    const fallbackOwner = await prisma.users.findFirst({
      where: {
        is_active: true,
        role: { in: ['sales_manager', 'sales_rep'] },
      },
      orderBy: { created_at: 'asc' },
      select: { id: true },
    });

    return fallbackOwner?.id ?? null;
  }

  const inactivityDays = daysBetween(lead?.updated_at ?? deal?.updated_at ?? null);
  const resolvedRecommendedOwner = await resolveRecommendedOwnerId();

  const buildFallback = () => {
    const slaBucket =
      inactivityDays >= 7 ? 'breached' : inactivityDays >= 3 ? 'at_risk' : 'on_track';

    const routingReason = resolvedRecommendedOwner
      ? 'Keep ownership with the currently assigned sales owner.'
      : 'No owner found; assign a sales owner immediately.';

    const slaReason =
      slaBucket === 'breached'
        ? 'No meaningful progress in 7+ days.'
        : slaBucket === 'at_risk'
        ? 'Opportunity is aging without recent movement.'
        : 'SLA is currently healthy.';

    const recommendedAction =
      slaBucket === 'breached'
        ? 'Escalate and assign immediate follow-up.'
        : slaBucket === 'at_risk'
        ? 'Trigger a same-day follow-up and review ownership.'
        : 'Maintain current routing and continue normal progression.';

    return {
      recommendedOwner: resolvedRecommendedOwner,
      routingReason,
      slaBucket,
      slaReason,
      recommendedAction,
    };
  };

  const runtimeResult = await runStructuredWithRuntime({
    feature: 'smart_routing_sla',
    systemPrompt:
      'You are an AI smart-routing and SLA assistant. Recommend owner routing, SLA status, reason, and next action.',
    userInput: JSON.stringify({
      leadId: lead?.id ?? null,
      dealId: deal?.id ?? null,
      inactivityDays,
      leadStatus: lead?.status ?? null,
      dealStage: deal?.stage ?? null,
      currentOwner: lead?.assigned_to_user_id ?? deal?.owner_user_id ?? null,
      resolvedRecommendedOwner,
    }),
    schemaLabel: 'SmartRoutingSlaOutput',
    schemaHint:
      '{"recommendedOwner":"uuid|null","routingReason":"string","slaBucket":"on_track|at_risk|breached","slaReason":"string","recommendedAction":"string"}',
    outputSchema: SmartRoutingSlaOutputSchema,
    fallbackReasonPrefix: 'SmartRoutingSLA:',
    fallback: buildFallback,
  });

  const source = runtimeResult.source;
  const provider = runtimeResult.provider;
  const fallbackUsed = runtimeResult.fallbackUsed;
  const failureReason = runtimeResult.failureReason;
  const data = runtimeResult.data;
  let assignmentApplied = false;

  if (!input.dryRun) {
    if (data.recommendedOwner) {
      if (lead && lead.assigned_to_user_id !== data.recommendedOwner) {
        await prisma.leads.update({
          where: { id: lead.id },
          data: { assigned_to_user_id: data.recommendedOwner },
        });
        assignmentApplied = true;
      }

      if (deal && deal.owner_user_id !== data.recommendedOwner) {
        await prisma.deals.update({
          where: { id: deal.id },
          data: { owner_user_id: data.recommendedOwner },
        });
        assignmentApplied = true;
      }
    }

    await prisma.activities.create({
      data: {
        user_id: input.context.userId,
        lead_id: lead?.id ?? null,
        deal_id: deal?.id ?? null,
        activity_type: 'ai_smart_routing_sla',
        title: 'AI Smart Routing + SLA',
        details: `Generated ${data.slaBucket} routing guidance.`,
        metadata: {
          source,
          provider,
          fallbackUsed,
          failureReason,
          recommendedOwner: data.recommendedOwner,
          routingReason: data.routingReason,
          slaBucket: data.slaBucket,
          slaReason: data.slaReason,
          recommendedAction: data.recommendedAction,
          assignmentApplied,
        },
      },
    });
  }

  return {
    leadId: lead?.id ?? null,
    dealId: deal?.id ?? null,
    source,
    provider,
    fallbackUsed,
    failureReason,
    dryRun: !!input.dryRun,
    data,
  };
}
