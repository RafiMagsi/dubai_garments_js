import type { AppRole } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import type { CopilotExecuteRequest, CopilotAction } from './contracts';
import { fallbackDraftReply } from './fallbacks';

type AllowedRole = Exclude<AppRole, 'customer'>;

export const COPILOT_ACTION_ROLE_WHITELIST: Record<CopilotAction, AllowedRole[]> = {
  draft_reply: ['admin', 'sales_manager', 'sales_rep', 'ops'],
  schedule_followup: ['admin', 'sales_manager', 'sales_rep'],
  mark_deal_at_risk: ['admin', 'sales_manager', 'ops'],
};

export function canExecuteCopilotAction(
  role: AppRole | null | undefined,
  action: CopilotAction
): boolean {
  if (!role || role === 'customer') return false;
  return COPILOT_ACTION_ROLE_WHITELIST[action].includes(role as AllowedRole);
}

export async function executeCopilotAction(input: CopilotExecuteRequest) {
  if (input.action === 'draft_reply') {
    const draft = await fallbackDraftReply({
      intent: 'draft_reply',
      leadId: input.leadId,
      dealId: input.dealId,
      channel: input.channel,
      context: input.payload
        ? {
            tone: input.payload.tone,
            userNotes: input.payload.userNotes,
          }
        : undefined,
    });

    return {
      type: 'draft_reply',
      channel: draft.channel,
      subject: draft.subject ?? null,
      message: draft.message,
      rationale: draft.rationale,
      suggestedNextAction: draft.suggestedNextAction,
    };
  }

  if (input.action === 'schedule_followup') {
    if (!input.leadId && !input.dealId) {
      throw new Error('schedule_followup requires leadId or dealId.');
    }

    return {
      type: 'schedule_followup',
      target: input.leadId ? 'lead' : 'deal',
      targetId: input.leadId ?? input.dealId ?? null,
      followupDate: input.payload?.followupDate ?? null,
      status: 'prepared',
    };
  }

  if (!input.dealId) {
    throw new Error('mark_deal_at_risk requires dealId.');
  }

  const deal = await prisma.deals.findUnique({
    where: { id: input.dealId },
  });

  if (!deal) {
    throw new Error('Deal not found.');
  }

  return {
    type: 'mark_deal_at_risk',
    dealId: input.dealId,
    stage: deal.stage,
    risk: 'high',
    reason: input.payload?.reason ?? 'AI/copilot risk escalation requested.',
  };
}