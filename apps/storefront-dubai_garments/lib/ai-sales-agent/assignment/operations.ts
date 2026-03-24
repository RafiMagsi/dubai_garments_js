import { prisma } from '@/lib/prisma';
import type { AssignmentOperationsRequest } from '@/lib/ai-sales-agent/contracts';
import { executeAssignmentPolicyEngine, getAssignmentPolicyEngineState } from '@/lib/ai-sales-agent/assignment/policy-engine';
import { getAgentPipelineBoard } from '@/lib/ai-sales-agent/assignment/pipeline-board';
import { getLockedOwnerForCustomer, setStrategicOwnerLock } from '@/lib/ai-sales-agent/assignment/strategic-owner-locks';

type OperationsContext = {
  userId: string;
  role: string;
  requestId?: string | null;
};

type AssignmentChange = {
  leadId: string | null;
  dealId: string | null;
  customerId: string | null;
  fromUserId: string | null;
  toUserId: string | null;
  toUserName: string | null;
  applied: boolean;
  reason: string;
  timelineActivityId: string | null;
  auditActivityId: string | null;
};

async function writeAssignmentEvents(input: {
  context: OperationsContext;
  leadId?: string | null;
  dealId?: string | null;
  customerId?: string | null;
  fromUserId?: string | null;
  toUserId?: string | null;
  action: string;
  reason: string;
  metadata?: Record<string, unknown>;
}) {
  const common = {
    user_id: input.context.userId,
    lead_id: input.leadId ?? null,
    deal_id: input.dealId ?? null,
  };

  const timeline = await prisma.activities.create({
    data: {
      ...common,
      activity_type: 'ai_assignment_timeline',
      title: `Assignment: ${input.action}`,
      details: input.reason,
      metadata: {
        requestId: input.context.requestId ?? null,
        customerId: input.customerId ?? null,
        fromUserId: input.fromUserId ?? null,
        toUserId: input.toUserId ?? null,
        action: input.action,
        ...(input.metadata ?? {}),
      },
    },
  });

  const audit = await prisma.activities.create({
    data: {
      ...common,
      activity_type: 'ai_assignment_audit',
      title: `Assignment audit: ${input.action}`,
      details: input.reason,
      metadata: {
        requestId: input.context.requestId ?? null,
        customerId: input.customerId ?? null,
        fromUserId: input.fromUserId ?? null,
        toUserId: input.toUserId ?? null,
        action: input.action,
        ...(input.metadata ?? {}),
      },
    },
  });

  return {
    timelineActivityId: timeline.id,
    auditActivityId: audit.id,
  };
}

async function resolveOwnerName(userId: string | null | undefined) {
  if (!userId) return null;
  const user = await prisma.users.findUnique({ where: { id: userId }, select: { full_name: true } });
  return user?.full_name ?? null;
}

async function applyReassign(input: {
  context: OperationsContext;
  leadId?: string;
  dealId?: string;
  targetUserId: string;
  reason?: string;
  dryRun?: boolean;
}): Promise<AssignmentChange> {
  const lead = input.leadId
    ? await prisma.leads.findUnique({ where: { id: input.leadId }, select: { id: true, assigned_to_user_id: true, customer_id: true } })
    : null;
  const deal = input.dealId
    ? await prisma.deals.findUnique({ where: { id: input.dealId }, select: { id: true, owner_user_id: true, customer_id: true } })
    : null;

  if (!lead && !deal) {
    throw new Error('Lead or deal is required for reassign action.');
  }

  const customerId = lead?.customer_id ?? deal?.customer_id ?? null;
  const lock = await getLockedOwnerForCustomer(customerId);
  if (lock && lock.ownerUserId !== input.targetUserId) {
    return {
      leadId: lead?.id ?? null,
      dealId: deal?.id ?? null,
      customerId,
      fromUserId: lead?.assigned_to_user_id ?? deal?.owner_user_id ?? null,
      toUserId: input.targetUserId,
      toUserName: await resolveOwnerName(input.targetUserId),
      applied: false,
      reason: `Strategic owner lock active for customer ${customerId}. Locked owner must remain ${lock.ownerUserId}.`,
      timelineActivityId: null,
      auditActivityId: null,
    };
  }

  const result = await executeAssignmentPolicyEngine(
    {
      leadId: lead?.id ?? undefined,
      dealId: deal?.id ?? undefined,
      manualAssigneeUserId: input.targetUserId,
      reason: input.reason,
      dryRun: input.dryRun,
    },
    input.context
  );

  const fromUserId = lead?.assigned_to_user_id ?? deal?.owner_user_id ?? null;
  let activityIds = { timelineActivityId: null as string | null, auditActivityId: null as string | null };

  if (!input.dryRun && result.assignmentApplied) {
    activityIds = await writeAssignmentEvents({
      context: input.context,
      leadId: lead?.id ?? null,
      dealId: deal?.id ?? null,
      customerId,
      fromUserId,
      toUserId: result.selectedAssigneeUserId,
      action: 'reassign',
      reason: input.reason?.trim() || 'Manual reassignment by manager operation.',
      metadata: {
        mode: result.mode,
        fallbackUsed: result.fallbackUsed,
        reasoning: result.reasoning,
      },
    });
  }

  return {
    leadId: lead?.id ?? null,
    dealId: deal?.id ?? null,
    customerId,
    fromUserId,
    toUserId: result.selectedAssigneeUserId,
    toUserName: result.selectedAssigneeName,
    applied: !!result.assignmentApplied,
    reason: result.assignmentApplied
      ? 'Reassignment applied successfully.'
      : 'Reassignment did not change owner (already assigned).',
    timelineActivityId: activityIds.timelineActivityId,
    auditActivityId: activityIds.auditActivityId,
  };
}

async function applyBulkRebalance(input: {
  context: OperationsContext;
  filters?: AssignmentOperationsRequest['filters'];
  limit: number;
  reason?: string;
  dryRun?: boolean;
}) {
  const board = await getAgentPipelineBoard(input.context, {
    team: input.filters?.team,
    stage: input.filters?.stage,
    urgency: input.filters?.urgency,
    inactiveDays: input.filters?.inactiveDays,
    ownerUserId: input.filters?.ownerUserId,
  });

  const candidates = board.center.stages
    .flatMap((stage) => stage.items)
    .sort((a, b) => b.inactiveDays - a.inactiveDays)
    .slice(0, input.limit);

  const changes: AssignmentChange[] = [];

  for (const candidate of candidates) {
    const lock = await getLockedOwnerForCustomer(candidate.customerId);
    if (lock && lock.ownerUserId !== candidate.ownerUserId) {
      changes.push({
        leadId: candidate.itemType === 'lead' ? candidate.itemId : null,
        dealId: candidate.itemType === 'deal' ? candidate.itemId : null,
        customerId: candidate.customerId,
        fromUserId: candidate.ownerUserId,
        toUserId: lock.ownerUserId,
        toUserName: await resolveOwnerName(lock.ownerUserId),
        applied: false,
        reason: `Skipped due to strategic lock (owner ${lock.ownerUserId}).`,
        timelineActivityId: null,
        auditActivityId: null,
      });
      continue;
    }

    const result = await executeAssignmentPolicyEngine(
      {
        leadId: candidate.itemType === 'lead' ? candidate.itemId : undefined,
        dealId: candidate.itemType === 'deal' ? candidate.itemId : undefined,
        reason: input.reason,
        dryRun: input.dryRun,
      },
      input.context
    );

    let activityIds = { timelineActivityId: null as string | null, auditActivityId: null as string | null };
    if (!input.dryRun && result.assignmentApplied) {
      activityIds = await writeAssignmentEvents({
        context: input.context,
        leadId: candidate.itemType === 'lead' ? candidate.itemId : null,
        dealId: candidate.itemType === 'deal' ? candidate.itemId : null,
        customerId: candidate.customerId,
        fromUserId: candidate.ownerUserId,
        toUserId: result.selectedAssigneeUserId,
        action: 'bulk_rebalance',
        reason: input.reason?.trim() || 'Bulk rebalance by selected criteria.',
        metadata: {
          mode: result.mode,
          fallbackUsed: result.fallbackUsed,
          reasoning: result.reasoning,
        },
      });
    }

    changes.push({
      leadId: candidate.itemType === 'lead' ? candidate.itemId : null,
      dealId: candidate.itemType === 'deal' ? candidate.itemId : null,
      customerId: candidate.customerId,
      fromUserId: candidate.ownerUserId,
      toUserId: result.selectedAssigneeUserId,
      toUserName: result.selectedAssigneeName,
      applied: !!result.assignmentApplied,
      reason: result.assignmentApplied ? 'Rebalanced by assignment policy.' : 'No reassignment needed.',
      timelineActivityId: activityIds.timelineActivityId,
      auditActivityId: activityIds.auditActivityId,
    });
  }

  return changes;
}

async function applyAutoAssignUnowned(input: {
  context: OperationsContext;
  limit: number;
  reason?: string;
  dryRun?: boolean;
}) {
  const [leads, deals] = await Promise.all([
    prisma.leads.findMany({
      where: {
        assigned_to_user_id: null,
        status: { in: ['new', 'qualified', 'quoted'] },
      },
      select: { id: true, customer_id: true },
      orderBy: { created_at: 'asc' },
      take: input.limit,
    }),
    prisma.deals.findMany({
      where: {
        owner_user_id: null,
        stage: { notIn: ['won', 'lost'] },
      },
      select: { id: true, customer_id: true },
      orderBy: { created_at: 'asc' },
      take: input.limit,
    }),
  ]);

  const changes: AssignmentChange[] = [];
  const combined = [
    ...leads.map((lead) => ({ itemType: 'lead' as const, id: lead.id, customerId: lead.customer_id })),
    ...deals.map((deal) => ({ itemType: 'deal' as const, id: deal.id, customerId: deal.customer_id })),
  ].slice(0, input.limit);

  for (const item of combined) {
    const lock = await getLockedOwnerForCustomer(item.customerId);
    const result = await executeAssignmentPolicyEngine(
      {
        leadId: item.itemType === 'lead' ? item.id : undefined,
        dealId: item.itemType === 'deal' ? item.id : undefined,
        manualAssigneeUserId: lock?.ownerUserId ?? undefined,
        reason: input.reason,
        dryRun: input.dryRun,
      },
      input.context
    );

    let activityIds = { timelineActivityId: null as string | null, auditActivityId: null as string | null };
    if (!input.dryRun && result.assignmentApplied) {
      activityIds = await writeAssignmentEvents({
        context: input.context,
        leadId: item.itemType === 'lead' ? item.id : null,
        dealId: item.itemType === 'deal' ? item.id : null,
        customerId: item.customerId,
        fromUserId: null,
        toUserId: result.selectedAssigneeUserId,
        action: 'auto_assign_unowned',
        reason: input.reason?.trim() || 'Auto-assigned unowned record.',
        metadata: {
          mode: result.mode,
          fallbackUsed: result.fallbackUsed,
          strategicLock: lock ? true : false,
        },
      });
    }

    changes.push({
      leadId: item.itemType === 'lead' ? item.id : null,
      dealId: item.itemType === 'deal' ? item.id : null,
      customerId: item.customerId,
      fromUserId: null,
      toUserId: result.selectedAssigneeUserId,
      toUserName: result.selectedAssigneeName,
      applied: !!result.assignmentApplied,
      reason: result.assignmentApplied ? 'Auto-assignment applied.' : 'No assignment change required.',
      timelineActivityId: activityIds.timelineActivityId,
      auditActivityId: activityIds.auditActivityId,
    });
  }

  return changes;
}

async function applyLockOwner(input: {
  context: OperationsContext;
  customerId: string;
  targetUserId: string;
  reason?: string;
  dryRun?: boolean;
}): Promise<AssignmentChange> {
  const ownerName = await resolveOwnerName(input.targetUserId);
  let activityIds = { timelineActivityId: null as string | null, auditActivityId: null as string | null };

  if (!input.dryRun) {
    await setStrategicOwnerLock({
      customerId: input.customerId,
      ownerUserId: input.targetUserId,
      reason: input.reason,
      updatedByUserId: input.context.userId,
    });

    activityIds = await writeAssignmentEvents({
      context: input.context,
      customerId: input.customerId,
      fromUserId: null,
      toUserId: input.targetUserId,
      action: 'lock_owner',
      reason: input.reason?.trim() || 'Strategic account owner lock applied.',
      metadata: {
        strategicAccount: true,
      },
    });
  }

  return {
    leadId: null,
    dealId: null,
    customerId: input.customerId,
    fromUserId: null,
    toUserId: input.targetUserId,
    toUserName: ownerName,
    applied: true,
    reason: 'Strategic owner lock saved.',
    timelineActivityId: activityIds.timelineActivityId,
    auditActivityId: activityIds.auditActivityId,
  };
}

export async function runAssignmentOperation(input: AssignmentOperationsRequest, context: OperationsContext) {
  const dryRun = !!input.dry_run;
  const limit = Math.max(1, Math.min(100, Number(input.limit ?? 12)));
  let changes: AssignmentChange[] = [];

  if (input.action === 'reassign') {
    if (!input.targetUserId || (!input.leadId && !input.dealId)) {
      throw new Error('reassign requires targetUserId and leadId/dealId.');
    }
    const change = await applyReassign({
      context,
      leadId: input.leadId,
      dealId: input.dealId,
      targetUserId: input.targetUserId,
      reason: input.reason,
      dryRun,
    });
    changes = [change];
  } else if (input.action === 'bulk_rebalance') {
    changes = await applyBulkRebalance({
      context,
      filters: input.filters,
      limit,
      reason: input.reason,
      dryRun,
    });
  } else if (input.action === 'auto_assign_unowned') {
    changes = await applyAutoAssignUnowned({
      context,
      limit,
      reason: input.reason,
      dryRun,
    });
  } else if (input.action === 'lock_owner') {
    if (!input.customerId || !input.targetUserId) {
      throw new Error('lock_owner requires customerId and targetUserId.');
    }
    const change = await applyLockOwner({
      context,
      customerId: input.customerId,
      targetUserId: input.targetUserId,
      reason: input.reason,
      dryRun,
    });
    changes = [change];
  }

  const changedCount = changes.filter((item) => item.applied).length;
  const skippedCount = Math.max(0, changes.length - changedCount);

  const policy = await getAssignmentPolicyEngineState();

  return {
    action: input.action,
    dryRun,
    summary: `${input.action} processed ${changes.length} record(s): ${changedCount} changed, ${skippedCount} skipped.`,
    changedCount,
    skippedCount,
    changes,
    availableAgents: policy.availableAgents,
  };
}
