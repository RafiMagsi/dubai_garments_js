import { prisma } from '@/lib/prisma';
import { getSalesAgentWorkloadModel } from '@/lib/ai-sales-agent/assignment/workload-model';

type KpiContext = {
  userId: string;
  role: string;
  requestId?: string | null;
};

function round(value: number, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function stdDev(values: number[], mean: number) {
  if (values.length === 0) return 0;
  const variance = values.reduce((acc, value) => acc + (value - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

export async function getAssignmentKpiTargets(context: KpiContext) {
  const workload = await getSalesAgentWorkloadModel(context);
  const users = workload.agents;
  const userIds = users.map((agent) => agent.userId);

  if (userIds.length === 0) {
    return {
      generatedAt: new Date().toISOString(),
      timeToFirstResponseByAgent: [],
      stageAgingByAgent: [],
      assignmentFairnessIndex: {
        score: 100,
        meanLoad: 0,
        stdDevLoad: 0,
        minLoad: 0,
        maxLoad: 0,
      },
      conversionByOwner: [],
      conversionByStage: [],
      reassignmentImpact: {
        reassignmentCount: 0,
        assignmentOpsCount: 0,
        reassignmentRatePct: 0,
        reassignedClosedWinRatePct: 0,
        baselineClosedWinRatePct: 0,
        winRateDeltaPct: 0,
      },
    };
  }

  const [deals, assignmentAuditEvents] = await Promise.all([
    prisma.deals.findMany({
      where:
        context.role === 'sales_rep'
          ? { owner_user_id: context.userId }
          : { owner_user_id: { in: userIds } },
      select: {
        id: true,
        owner_user_id: true,
        stage: true,
        updated_at: true,
      },
      orderBy: { updated_at: 'desc' },
    }),
    prisma.activities.findMany({
      where: {
        activity_type: 'ai_assignment_audit',
      },
      select: {
        lead_id: true,
        deal_id: true,
        metadata: true,
      },
      orderBy: { created_at: 'desc' },
      take: 3000,
    }),
  ]);

  const now = new Date();
  const activeDeals = deals.filter((deal) => !['won', 'lost'].includes(String(deal.stage || '').toLowerCase()));
  const closedDeals = deals.filter((deal) => ['won', 'lost'].includes(String(deal.stage || '').toLowerCase()));

  const stageAgingByAgent = users
    .map((agent) => {
      const perStage = new Map<string, number[]>();
      activeDeals
        .filter((deal) => deal.owner_user_id === agent.userId)
        .forEach((deal) => {
          const stage = String(deal.stage || 'unknown').toLowerCase();
          const agingDays = Math.max(0, (now.getTime() - deal.updated_at.getTime()) / (1000 * 60 * 60 * 24));
          if (!perStage.has(stage)) perStage.set(stage, []);
          perStage.get(stage)!.push(agingDays);
        });

      return {
        userId: agent.userId,
        fullName: agent.fullName,
        stages: [...perStage.entries()]
          .map(([stage, values]) => ({
            stage,
            avgAgingDays: round(values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length), 2),
            count: values.length,
          }))
          .sort((a, b) => b.avgAgingDays - a.avgAgingDays),
      };
    })
    .filter((agent) => agent.stages.length > 0);

  const loads = users.map((agent) => agent.activeLeads + agent.activeDeals);
  const meanLoad = loads.reduce((sum, value) => sum + value, 0) / Math.max(1, loads.length);
  const stdDevLoad = stdDev(loads, meanLoad);
  const fairnessCv = meanLoad > 0 ? stdDevLoad / meanLoad : 0;
  const fairnessScore = Math.max(0, Math.min(100, round(100 - fairnessCv * 100, 2)));

  const conversionByOwner = users
    .map((agent) => {
      const ownerClosed = closedDeals.filter((deal) => deal.owner_user_id === agent.userId);
      const won = ownerClosed.filter((deal) => String(deal.stage || '').toLowerCase() === 'won').length;
      const closed = ownerClosed.length;
      return {
        userId: agent.userId,
        fullName: agent.fullName,
        wonDeals: won,
        closedDeals: closed,
        conversionRatePct: round(closed > 0 ? (won / closed) * 100 : 0, 2),
      };
    })
    .sort((a, b) => b.conversionRatePct - a.conversionRatePct);

  const stageDealMap = new Map<string, { totalDeals: number; wonDeals: number }>();
  deals.forEach((deal) => {
    const stage = String(deal.stage || 'unknown').toLowerCase();
    const entry = stageDealMap.get(stage) ?? { totalDeals: 0, wonDeals: 0 };
    entry.totalDeals += 1;
    if (stage === 'won') {
      entry.wonDeals += 1;
    }
    stageDealMap.set(stage, entry);
  });

  const conversionByStage = [...stageDealMap.entries()]
    .map(([stage, value]) => ({
      stage,
      wonDeals: value.wonDeals,
      totalDeals: value.totalDeals,
      conversionRatePct: round(value.totalDeals > 0 ? (value.wonDeals / value.totalDeals) * 100 : 0, 2),
    }))
    .sort((a, b) => b.totalDeals - a.totalDeals)
    .slice(0, 10);

  const assignmentOps = assignmentAuditEvents.filter((event) => {
    const meta = asRecord(event.metadata);
    const action = String(meta.action ?? '').toLowerCase();
    return ['reassign', 'bulk_rebalance', 'auto_assign_unowned', 'lock_owner'].includes(action);
  });

  const reassignmentOps = assignmentOps.filter((event) => {
    const meta = asRecord(event.metadata);
    const action = String(meta.action ?? '').toLowerCase();
    return ['reassign', 'bulk_rebalance'].includes(action);
  });

  const changedDealIds = new Set(
    assignmentOps
      .filter((event) => Boolean(event.deal_id))
      .map((event) => event.deal_id as string)
  );

  const reassignedClosedDeals = closedDeals.filter((deal) => changedDealIds.has(deal.id));
  const baselineClosedDeals = closedDeals.filter((deal) => !changedDealIds.has(deal.id));

  const reassignedWins = reassignedClosedDeals.filter((deal) => String(deal.stage || '').toLowerCase() === 'won').length;
  const baselineWins = baselineClosedDeals.filter((deal) => String(deal.stage || '').toLowerCase() === 'won').length;

  const reassignedClosedWinRatePct = round(
    reassignedClosedDeals.length > 0 ? (reassignedWins / reassignedClosedDeals.length) * 100 : 0,
    2
  );
  const baselineClosedWinRatePct = round(
    baselineClosedDeals.length > 0 ? (baselineWins / baselineClosedDeals.length) * 100 : 0,
    2
  );

  return {
    generatedAt: new Date().toISOString(),
    timeToFirstResponseByAgent: users
      .map((agent) => ({
        userId: agent.userId,
        fullName: agent.fullName,
        avgFirstResponseHours: agent.avgFirstResponseHours,
        responseRatePct: agent.responseRatePct,
        respondedLeadCount: agent.respondedLeadCount,
      }))
      .sort((a, b) => a.avgFirstResponseHours - b.avgFirstResponseHours),
    stageAgingByAgent,
    assignmentFairnessIndex: {
      score: fairnessScore,
      meanLoad: round(meanLoad, 2),
      stdDevLoad: round(stdDevLoad, 2),
      minLoad: loads.length ? Math.min(...loads) : 0,
      maxLoad: loads.length ? Math.max(...loads) : 0,
    },
    conversionByOwner,
    conversionByStage,
    reassignmentImpact: {
      reassignmentCount: reassignmentOps.length,
      assignmentOpsCount: assignmentOps.length,
      reassignmentRatePct: round(
        assignmentOps.length > 0 ? (reassignmentOps.length / assignmentOps.length) * 100 : 0,
        2
      ),
      reassignedClosedWinRatePct,
      baselineClosedWinRatePct,
      winRateDeltaPct: round(reassignedClosedWinRatePct - baselineClosedWinRatePct, 2),
    },
  };
}
