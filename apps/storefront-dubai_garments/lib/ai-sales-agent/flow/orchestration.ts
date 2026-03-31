import { prisma } from '@/lib/prisma';
import { runLeadTriage } from '@/lib/ai-sales-agent/triage';
import { runReplyStudio } from '@/lib/ai-sales-agent/reply-studio';
import { runQuoteRecommendation } from '@/lib/ai-sales-agent/quote-recommendation';
import {
  resolveAgentFlow,
  type AgentFlowResult,
  type AgentFlowStage,
  type AgentFlowStageKey,
} from '@/lib/ai-sales-agent/flow/flow-model';

type OrchestrationContext = {
  userId: string;
  role: string;
  requestId?: string | null;
};

type ManualOverrideInput = {
  enabled: boolean;
  stageKey: AgentFlowStageKey;
  reason: string;
  force?: boolean;
  ownerUserId?: string;
};

type OrchestrationInput = {
  leadId?: string;
  dealId?: string;
  mode?: 'single' | 'sequence';
  maxSteps?: number;
  manualOverride?: ManualOverrideInput;
};

type OrchestrationActionResult = {
  stageKey: AgentFlowStageKey;
  status: 'executed' | 'skipped' | 'blocked' | 'failed';
  message: string;
  auditActivityId?: string | null;
  timelineActivityId?: string | null;
  validation: {
    entry: string[];
    exit: string[];
    passed: boolean;
  };
};

export type LeadToCloseOrchestrationResult = {
  leadId?: string | null;
  dealId?: string | null;
  quoteId?: string | null;
  startStageKey: AgentFlowStageKey;
  endStageKey: AgentFlowStageKey;
  mode: 'single' | 'sequence';
  manualOverrideApplied: boolean;
  actions: OrchestrationActionResult[];
  flow: AgentFlowResult;
};

function nowIso() {
  return new Date().toISOString();
}

function stageByKey(flow: AgentFlowResult, stageKey: AgentFlowStageKey) {
  const found = flow.stages.find((stage) => stage.key === stageKey);
  if (!found) {
    throw new Error(`Stage "${stageKey}" was not found in current lifecycle flow.`);
  }
  return found;
}

function validateTransition(input: {
  flow: AgentFlowResult;
  stage: AgentFlowStage;
  manualOverride?: ManualOverrideInput;
}) {
  const { flow, stage, manualOverride } = input;
  const entry: string[] = [];
  const exit: string[] = [];

  const previousStages = flow.stages.filter((candidate) => candidate.order < stage.order);
  const incompletePrevious = previousStages
    .filter((candidate) => !candidate.completed)
    .map((candidate) => candidate.label);

  if (manualOverride?.enabled) {
    if (!manualOverride.reason.trim()) {
      entry.push('Manual override reason is required.');
    } else {
      entry.push('Manual override reason captured.');
    }

    if (incompletePrevious.length > 0 && !manualOverride.force) {
      entry.push(
        `Previous stages are incomplete (${incompletePrevious.join(', ')}). Use force override if intentional.`
      );
    } else if (incompletePrevious.length === 0) {
      entry.push('All previous stages are complete.');
    }
  } else if (flow.activeStageKey !== stage.key) {
    entry.push(`Only active stage "${flow.activeStageKey}" can run without manual override.`);
  } else {
    entry.push('Active stage selected.');
  }

  if (stage.status === 'blocked' && !manualOverride?.enabled) {
    entry.push('Stage is blocked and requires override or blocker resolution first.');
  }

  if (
    stage.key === 'qualified' &&
    !manualOverride?.ownerUserId &&
    !flow.leadOwnerUserId
  ) {
    entry.push('Assigned agent is required for Qualified stage.');
  }

  if (stage.completed) {
    exit.push('Stage already completed before orchestration run.');
  }

  const failed = entry.some((line) =>
    /(required|requires|incomplete|blocked|only active stage)/i.test(line)
  );

  return {
    entry,
    exit,
    passed: !failed,
  };
}

async function writeFlowEvent(input: {
  userId: string;
  leadId?: string | null;
  dealId?: string | null;
  quoteId?: string | null;
  requestId?: string | null;
  stageKey: AgentFlowStageKey;
  eventType: 'timeline' | 'audit';
  title: string;
  details: string;
  metadata?: Record<string, unknown>;
}) {
  const activity = await prisma.activities.create({
    data: {
      user_id: input.userId,
      lead_id: input.leadId ?? null,
      deal_id: input.dealId ?? null,
      quote_id: input.quoteId ?? null,
      activity_type:
        input.eventType === 'audit' ? 'ai_flow_orchestration_audit' : 'ai_flow_orchestration_timeline',
      title: input.title,
      details: input.details,
      metadata: {
        requestId: input.requestId ?? null,
        stageKey: input.stageKey,
        eventType: input.eventType,
        at: nowIso(),
        ...(input.metadata ?? {}),
      },
    },
  });

  return activity.id;
}

async function ensureDealOpen(leadId: string, userId: string) {
  const lead = await prisma.leads.findUnique({ where: { id: leadId } });
  if (!lead) {
    throw new Error('Lead does not exist for deal conversion.');
  }

  let customerId = lead.customer_id ?? null;
  if (!customerId) {
    const customer = await prisma.customers.create({
      data: {
        company_name: lead.company_name ?? lead.contact_name ?? 'Converted Lead',
        contact_name: lead.contact_name ?? null,
        email: lead.email ?? null,
        phone: lead.phone ?? null,
        owner_user_id: lead.assigned_to_user_id ?? userId,
        notes: 'Auto-created during lead-to-close orchestration.',
      },
    });
    customerId = customer.id;
    await prisma.leads.update({
      where: { id: lead.id },
      data: { customer_id: customerId },
    });
  }

  const existing = await prisma.deals.findFirst({
    where: { lead_id: lead.id },
    orderBy: { created_at: 'desc' },
  });
  if (existing) {
    if (String(existing.stage || '').toLowerCase() === 'won' || String(existing.stage || '').toLowerCase() === 'lost') {
      const reopened = await prisma.deals.update({
        where: { id: existing.id },
        data: { stage: 'new' },
      });
      return { dealId: reopened.id, created: false, reopened: true };
    }
    return { dealId: existing.id, created: false, reopened: false };
  }

  const created = await prisma.deals.create({
    data: {
      lead_id: lead.id,
      customer_id: customerId,
      owner_user_id: lead.assigned_to_user_id ?? userId,
      title: `Deal: ${lead.company_name ?? lead.contact_name ?? lead.id}`,
      stage: 'new',
      expected_value: lead.budget ?? 0,
      probability_pct: 30,
      notes: 'Auto-created by AI lead-to-close orchestration.',
    },
  });

  return { dealId: created.id, created: true, reopened: false };
}

async function executeStageAction(input: {
  stageKey: AgentFlowStageKey;
  leadId?: string | null;
  dealId?: string | null;
  quoteId?: string | null;
  context: OrchestrationContext;
  manualOverride?: ManualOverrideInput;
}) {
  const { stageKey, context } = input;
  const leadId = input.leadId ?? null;
  let dealId = input.dealId ?? null;
  const quoteId = input.quoteId ?? null;

  switch (stageKey) {
    case 'lead_new':
      return {
        message: 'Lead intake acknowledged. Waiting for triage execution.',
        metadata: { action: 'noop_lead_new' },
        leadId,
        dealId,
        quoteId,
      };

    case 'triaged': {
      if (!leadId) throw new Error('Lead ID is required for triage orchestration.');
      const triage = await runLeadTriage(
        leadId,
        {
          userId: context.userId,
          role: context.role,
          requestId: context.requestId ?? undefined,
        }
      );
      return {
        message: `Lead triage persisted (${triage.data.classification}, score ${triage.data.score}).`,
        metadata: {
          action: 'run_lead_triage',
          source: triage.source,
          provider: triage.provider,
          fallbackUsed: triage.fallbackUsed,
          failureReason: triage.failureReason,
        },
        leadId,
        dealId,
        quoteId,
      };
    }

    case 'qualified': {
      if (!leadId) throw new Error('Lead ID is required to qualify lead.');
      const lead = await prisma.leads.findUnique({ where: { id: leadId } });
      if (!lead) {
        throw new Error('Lead was not found for qualification.');
      }
      const ownerUserId = input.manualOverride?.ownerUserId ?? lead.assigned_to_user_id ?? null;
      if (!ownerUserId) {
        throw new Error(
          'Mark Qualified requires selecting an assigned agent. Choose an agent and try again.'
        );
      }
      const owner = await prisma.users.findUnique({
        where: { id: ownerUserId },
        select: { id: true, full_name: true, role: true, is_active: true },
      });
      if (!owner || !owner.is_active || !['sales_rep', 'sales_manager'].includes(String(owner.role))) {
        throw new Error('Selected agent is invalid or inactive. Choose an active sales agent.');
      }
      await prisma.leads.update({
        where: { id: leadId },
        data: { status: 'qualified', assigned_to_user_id: ownerUserId },
      });
      await prisma.deals.updateMany({
        where: {
          lead_id: leadId,
          stage: { notIn: ['won', 'lost'] },
        },
        data: { owner_user_id: ownerUserId },
      });
      return {
        message: `Lead moved to qualified status and assigned to ${owner.full_name}.`,
        metadata: {
          action: 'mark_lead_qualified',
          ownerUserId,
          ownerName: owner.full_name,
        },
        leadId,
        dealId,
        quoteId,
      };
    }

    case 'reply_sent': {
      if (!leadId) throw new Error('Lead ID is required to generate/send reply.');
      const reply = await runReplyStudio({
        leadId,
        dealId: dealId ?? undefined,
        quoteId: quoteId ?? undefined,
        mode: 'first_reply',
        tone: 'formal',
        channel: 'email',
        context: {
          userId: context.userId,
          role: context.role,
          requestId: context.requestId ?? undefined,
        },
      });

      await prisma.activities.create({
        data: {
          user_id: context.userId,
          lead_id: leadId,
          deal_id: dealId,
          quote_id: quoteId,
          activity_type: 'ai_reply_studio_approved_send',
          title: 'AI Orchestration generated reply',
          details: 'Lead-to-close orchestration generated first reply draft evidence.',
          metadata: {
            source: reply.source,
            provider: reply.provider,
            fallbackUsed: reply.fallbackUsed,
            failureReason: reply.failureReason,
            channel: reply.data.channel,
            mode: reply.data.mode,
            reason: input.manualOverride?.reason ?? null,
            orchestrated: true,
          },
        },
      });

      return {
        message: 'Reply draft generated and execution evidence logged.',
        metadata: {
          action: 'run_reply_studio',
          source: reply.source,
          provider: reply.provider,
          fallbackUsed: reply.fallbackUsed,
          failureReason: reply.failureReason,
        },
        leadId,
        dealId,
        quoteId,
      };
    }

    case 'deal_open': {
      if (!leadId) throw new Error('Lead ID is required to open deal.');
      const ensured = await ensureDealOpen(leadId, context.userId);
      dealId = ensured.dealId;
      return {
        message: ensured.created
          ? 'Deal created from lead.'
          : ensured.reopened
          ? 'Existing deal reopened to active stage.'
          : 'Deal already open for this lead.',
        metadata: {
          action: 'ensure_deal_open',
          created: ensured.created,
          reopened: ensured.reopened,
          dealId: ensured.dealId,
        },
        leadId,
        dealId,
        quoteId,
      };
    }

    case 'quote_ready': {
      if (!leadId) throw new Error('Lead ID is required for quote recommendation.');
      const recommendation = await runQuoteRecommendation({
        leadId,
        dealId: dealId ?? undefined,
        quoteId: quoteId ?? undefined,
        context: {
          userId: context.userId,
          role: context.role,
          requestId: context.requestId ?? undefined,
        },
      });
      return {
        message: `Quote recommendation generated (${recommendation.data.recommendations.length} items). Create quote to complete Quote Ready stage.`,
        metadata: {
          action: 'run_quote_recommendation',
          source: recommendation.source,
          provider: recommendation.provider,
          fallbackUsed: recommendation.fallbackUsed,
          failureReason: recommendation.failureReason,
        },
        leadId,
        dealId: recommendation.dealId ?? dealId,
        quoteId: recommendation.quoteId ?? quoteId,
      };
    }

    case 'quote_sent': {
      const latestQuote = await prisma.quotes.findFirst({
        where: {
          OR: [
            ...(quoteId ? [{ id: quoteId }] : []),
            ...(dealId ? [{ deal_id: dealId }] : []),
            ...(leadId ? [{ lead_id: leadId }] : []),
          ],
        },
        orderBy: { created_at: 'desc' },
      });

      if (!latestQuote) {
        throw new Error('No quote exists to mark as sent.');
      }

      const guardrailIssues: string[] = [];
      const quoteItemCount = await prisma.quote_items.count({
        where: { quote_id: latestQuote.id },
      });
      if (quoteItemCount < 1) {
        guardrailIssues.push('Quote has no line items.');
      }
      const total = Number(latestQuote.total_amount ?? 0);
      if (!Number.isFinite(total) || total <= 0) {
        guardrailIssues.push('Quote total amount is missing or zero.');
      }
      if (!latestQuote.valid_until) {
        guardrailIssues.push('Quote validity date is not set.');
      }
      if (guardrailIssues.length > 0) {
        throw new Error(
          `Quote send guardrail failed: ${guardrailIssues.join(' ')}`
        );
      }

      if (String(latestQuote.status || '').toLowerCase() !== 'sent') {
        await prisma.quotes.update({
          where: { id: latestQuote.id },
          data: { status: 'sent' },
        });
      }

      await prisma.activities.create({
        data: {
          user_id: context.userId,
          lead_id: leadId,
          deal_id: dealId,
          quote_id: latestQuote.id,
          activity_type: 'quote_sent',
          title: 'Quote marked as sent by orchestration',
          details: 'Lead-to-close orchestration marked latest quote as sent.',
          metadata: {
            orchestrated: true,
            requestId: context.requestId ?? null,
          },
        },
      });

      return {
        message: 'Latest quote marked as sent and timeline updated.',
        metadata: { action: 'mark_quote_sent', quoteId: latestQuote.id },
        leadId,
        dealId: latestQuote.deal_id ?? dealId,
        quoteId: latestQuote.id,
      };
    }

    case 'negotiation':
      if (!dealId) {
        return {
          message: 'No deal exists yet; negotiation remains manual.',
          metadata: { action: 'skip_negotiation_no_deal' },
          leadId,
          dealId,
          quoteId,
        };
      }
      await prisma.deals.update({
        where: { id: dealId },
        data: { stage: 'negotiation' },
      });
      return {
        message: 'Deal moved to negotiation stage.',
        metadata: { action: 'move_deal_negotiation' },
        leadId,
        dealId,
        quoteId,
      };

    case 'won_lost':
      return {
        message: 'Outcome stage requires manual business decision (won/lost).',
        metadata: { action: 'manual_outcome_required' },
        leadId,
        dealId,
        quoteId,
      };

    case 'post_outcome': {
      if (!leadId) {
        return {
          message: 'No lead context found to persist post-outcome summary.',
          metadata: { action: 'skip_post_outcome_no_lead' },
          leadId,
          dealId,
          quoteId,
        };
      }
      const lead = await prisma.leads.findUnique({ where: { id: leadId } });
      const reasoning = (lead?.ai_reasoning && typeof lead.ai_reasoning === 'object'
        ? (lead.ai_reasoning as Record<string, unknown>)
        : {}) as Record<string, unknown>;
      await prisma.leads.update({
        where: { id: leadId },
        data: {
          ai_reasoning: {
            ...reasoning,
            postOutcomeSummary:
              (reasoning.postOutcomeSummary as string | undefined) ??
              'Post-outcome summary captured by orchestration.',
            postOutcomeAt: nowIso(),
          },
        },
      });
      await prisma.activities.create({
        data: {
          user_id: context.userId,
          lead_id: leadId,
          deal_id: dealId,
          quote_id: quoteId,
          activity_type: 'ai_post_outcome_analysis',
          title: 'Post-outcome intelligence captured',
          details: 'Lead-to-close orchestration captured post-outcome summary.',
          metadata: {
            orchestrated: true,
            requestId: context.requestId ?? null,
          },
        },
      });
      return {
        message: 'Post-outcome intelligence recorded.',
        metadata: { action: 'record_post_outcome' },
        leadId,
        dealId,
        quoteId,
      };
    }

    default:
      return {
        message: 'No automation action configured for this stage.',
        metadata: { action: 'noop' },
        leadId,
        dealId,
        quoteId,
      };
  }
}

export async function orchestrateLeadToClose(
  input: OrchestrationInput,
  context: OrchestrationContext
): Promise<LeadToCloseOrchestrationResult> {
  const mode = input.mode ?? 'single';
  const maxSteps = Math.min(Math.max(input.maxSteps ?? 1, 1), 6);

  let currentFlow = await resolveAgentFlow({
    leadId: input.leadId,
    dealId: input.dealId,
    context: {
      userId: context.userId,
      role: context.role,
    },
  });

  const startStageKey =
    input.manualOverride?.enabled && input.manualOverride.stageKey
      ? input.manualOverride.stageKey
      : currentFlow.activeStageKey;

  const actions: OrchestrationActionResult[] = [];

  for (let step = 0; step < (mode === 'sequence' ? maxSteps : 1); step += 1) {
    const targetStageKey =
      step === 0 && input.manualOverride?.enabled
        ? input.manualOverride.stageKey
        : currentFlow.activeStageKey;

    if (targetStageKey === 'won_lost') {
      const message =
        'Outcome stage is manual-only. Use Mark Won or Mark Lost to complete this stage.';
      const auditActivityId = await writeFlowEvent({
        userId: context.userId,
        leadId: currentFlow.leadId ?? null,
        dealId: currentFlow.dealId ?? null,
        quoteId: currentFlow.quoteId ?? null,
        requestId: context.requestId,
        stageKey: targetStageKey,
        eventType: 'audit',
        title: 'Flow blocked at Won / Lost',
        details: message,
        metadata: {
          mode,
          manualOverride: step === 0 ? input.manualOverride ?? null : null,
          status: 'blocked',
          reason: 'manual_outcome_required',
        },
      });

      actions.push({
        stageKey: targetStageKey,
        status: 'blocked',
        message,
        auditActivityId,
        validation: {
          entry: ['Outcome decision must be explicit and cannot be auto-orchestrated.'],
          exit: [],
          passed: false,
        },
      });
      break;
    }

    const stage = stageByKey(currentFlow, targetStageKey);
    const validation = validateTransition({
      flow: currentFlow,
      stage,
      manualOverride: step === 0 ? input.manualOverride : undefined,
    });

    if (!validation.passed) {
      const message = validation.entry.join(' ');
      const auditActivityId = await writeFlowEvent({
        userId: context.userId,
        leadId: currentFlow.leadId ?? null,
        dealId: currentFlow.dealId ?? null,
        quoteId: currentFlow.quoteId ?? null,
        requestId: context.requestId,
        stageKey: targetStageKey,
        eventType: 'audit',
        title: `Flow blocked at ${stage.label}`,
        details: message,
        metadata: {
          mode,
          manualOverride: input.manualOverride ?? null,
          validation,
          status: 'blocked',
        },
      });

      actions.push({
        stageKey: targetStageKey,
        status: 'blocked',
        message,
        auditActivityId,
        validation,
      });
      break;
    }

    try {
      const execution = await executeStageAction({
        stageKey: targetStageKey,
        leadId: currentFlow.leadId ?? input.leadId ?? null,
        dealId: currentFlow.dealId ?? input.dealId ?? null,
        quoteId: currentFlow.quoteId ?? null,
        context,
        manualOverride: step === 0 ? input.manualOverride : undefined,
      });

      const auditActivityId = await writeFlowEvent({
        userId: context.userId,
        leadId: execution.leadId,
        dealId: execution.dealId,
        quoteId: execution.quoteId,
        requestId: context.requestId,
        stageKey: targetStageKey,
        eventType: 'audit',
        title: `Orchestration action: ${stage.label}`,
        details: execution.message,
        metadata: {
          mode,
          manualOverride: step === 0 ? input.manualOverride ?? null : null,
          validation,
          execution: execution.metadata,
          status: 'executed',
        },
      });

      const timelineActivityId = await writeFlowEvent({
        userId: context.userId,
        leadId: execution.leadId,
        dealId: execution.dealId,
        quoteId: execution.quoteId,
        requestId: context.requestId,
        stageKey: targetStageKey,
        eventType: 'timeline',
        title: `Lifecycle progression: ${stage.label}`,
        details: execution.message,
        metadata: {
          status: 'executed',
          mode,
        },
      });

      actions.push({
        stageKey: targetStageKey,
        status: 'executed',
        message: execution.message,
        auditActivityId,
        timelineActivityId,
        validation,
      });

      currentFlow = await resolveAgentFlow({
        leadId: execution.leadId ?? currentFlow.leadId ?? undefined,
        dealId: execution.dealId ?? currentFlow.dealId ?? undefined,
        context: {
          userId: context.userId,
          role: context.role,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected orchestration error.';

      const auditActivityId = await writeFlowEvent({
        userId: context.userId,
        leadId: currentFlow.leadId ?? null,
        dealId: currentFlow.dealId ?? null,
        quoteId: currentFlow.quoteId ?? null,
        requestId: context.requestId,
        stageKey: targetStageKey,
        eventType: 'audit',
        title: `Orchestration failed: ${stage.label}`,
        details: message,
        metadata: {
          mode,
          manualOverride: step === 0 ? input.manualOverride ?? null : null,
          validation,
          status: 'failed',
        },
      });

      actions.push({
        stageKey: targetStageKey,
        status: 'failed',
        message,
        auditActivityId,
        validation,
      });
      break;
    }
  }

  return {
    leadId: currentFlow.leadId ?? null,
    dealId: currentFlow.dealId ?? null,
    quoteId: currentFlow.quoteId ?? null,
    startStageKey,
    endStageKey: currentFlow.activeStageKey,
    mode,
    manualOverrideApplied: !!input.manualOverride?.enabled,
    actions,
    flow: currentFlow,
  };
}
