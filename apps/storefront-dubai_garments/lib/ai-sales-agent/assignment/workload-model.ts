import { prisma } from '@/lib/prisma';
import { loadSafeDealRows, loadSafeLeadsRows } from '@/lib/ai-sales-agent/assignment/safe-data';

type WorkloadContext = {
  userId: string;
  role: string;
  requestId?: string | null;
};

type LeadRow = {
  id: string;
  assigned_to_user_id: string | null;
  created_at: Date;
  updated_at: Date;
  status: string;
};

type DealRow = {
  id: string;
  owner_user_id: string | null;
  created_at: Date;
  updated_at: Date;
  stage: string;
};

const ACTIVE_LEAD_STATUSES = ['new', 'qualified', 'quoted'];
const CLOSED_DEAL_STAGES = ['won', 'lost'];
const UNASSIGNED_USER_ID = '__unassigned__';
const BACKOFFICE_OWNER_ROLES = ['sales_rep', 'sales_manager', 'admin', 'ops'] as const;
const RESPONSE_ACTIVITY_TYPES = [
  'email_sent',
  'ai_reply_studio_approved_send',
  'ai_lead_intelligence_action',
] as const;

function hoursBetween(start: Date, end: Date) {
  const diff = end.getTime() - start.getTime();
  return Math.max(0, diff / (1000 * 60 * 60));
}

export async function getSalesAgentWorkloadModel(context: WorkloadContext) {
  const leadResponseHours = Number(process.env.AI_AGENT_SLA_LEAD_RESPONSE_HOURS ?? 24);
  const dealAgingHours = Number(process.env.AI_AGENT_SLA_DEAL_AGING_HOURS ?? 72);

  let users = await prisma.users.findMany({
    where:
      context.role === 'sales_rep'
        ? { id: context.userId, is_active: true }
        : { is_active: true, role: { in: [...BACKOFFICE_OWNER_ROLES] } },
    select: {
      id: true,
      full_name: true,
      email: true,
      role: true,
      is_active: true,
    },
    orderBy: { created_at: 'asc' },
  });

  if (users.length === 0 && context.role !== 'sales_rep') {
    users = await prisma.users.findMany({
      where: { is_active: true, role: { in: [...BACKOFFICE_OWNER_ROLES] } },
      select: {
        id: true,
        full_name: true,
        email: true,
        role: true,
        is_active: true,
      },
      orderBy: { created_at: 'asc' },
    });
  }

  if (users.length === 0) {
    return {
      generatedAt: new Date().toISOString(),
      slaRules: {
        leadResponseHours,
        dealAgingHours,
      },
      agents: [],
    };
  }

  const userIds = users.map((user) => user.id);
  const now = new Date();

  const [allLeads, allDeals, followupGroups, responseActivities] = await Promise.all([
    loadSafeLeadsRows(),
    loadSafeDealRows(),
    prisma.followups.groupBy({
      by: ['assigned_to_user_id'],
      where: {
        assigned_to_user_id: { in: userIds },
        status: { in: ['pending', 'open'] },
        due_at: { lt: now },
      },
      _count: { _all: true },
    }),
    prisma.activities.findMany({
      where: {
        lead_id: { not: null },
        activity_type: { in: [...RESPONSE_ACTIVITY_TYPES] },
      },
      select: {
        lead_id: true,
        created_at: true,
      },
      orderBy: { created_at: 'asc' },
    }),
  ]);

  const leads = allLeads.filter((lead) =>
    context.role === 'sales_rep'
      ? Boolean(lead.assigned_to_user_id && userIds.includes(lead.assigned_to_user_id))
      : !lead.assigned_to_user_id || userIds.includes(lead.assigned_to_user_id)
  );
  const deals = allDeals.filter((deal) =>
    context.role === 'sales_rep'
      ? Boolean(deal.owner_user_id && userIds.includes(deal.owner_user_id))
      : !deal.owner_user_id || userIds.includes(deal.owner_user_id)
  );

  const includeUnassigned =
    context.role !== 'sales_rep' &&
    ((leads as LeadRow[]).some((lead) => !lead.assigned_to_user_id) ||
      (deals as DealRow[]).some((deal) => !deal.owner_user_id));

  const usersWithUnassigned = includeUnassigned
    ? [
        ...users,
        {
          id: UNASSIGNED_USER_ID,
          full_name: 'Unassigned Queue',
          email: '',
          role: 'unassigned',
          is_active: true,
        },
      ]
    : users;

  const openLeads = (leads as LeadRow[]).filter((lead) =>
    ACTIVE_LEAD_STATUSES.includes(String(lead.status).toLowerCase())
  );
  const openDeals = (deals as DealRow[]).filter(
    (deal) => !CLOSED_DEAL_STAGES.includes(String(deal.stage).toLowerCase())
  );

  const leadById = new Map(openLeads.map((lead) => [lead.id, lead]));
  const firstResponseByLead = new Map<string, Date>();
  for (const activity of responseActivities) {
    const leadId = activity.lead_id ?? null;
    if (!leadId) continue;
    if (!leadById.has(leadId)) continue;
    if (!firstResponseByLead.has(leadId)) {
      firstResponseByLead.set(leadId, activity.created_at);
    }
  }

  const overdueFollowupsMap = new Map<string, number>();
  followupGroups.forEach((row) => {
    if (row.assigned_to_user_id) {
      overdueFollowupsMap.set(row.assigned_to_user_id, row._count._all);
    }
  });

  const stageDistributionMap = new Map<string, Map<string, number>>();
  for (const deal of deals as DealRow[]) {
    const ownerId = deal.owner_user_id || (includeUnassigned ? UNASSIGNED_USER_ID : null);
    if (!ownerId) continue;
    const stage = String(deal.stage || 'unknown').toLowerCase();
    if (!stageDistributionMap.has(ownerId)) {
      stageDistributionMap.set(ownerId, new Map());
    }
    const inner = stageDistributionMap.get(ownerId)!;
    inner.set(stage, (inner.get(stage) ?? 0) + 1);
  }

  const agents = usersWithUnassigned.map((user) => {
    const isUnassignedUser = user.id === UNASSIGNED_USER_ID;
    const userOpenLeads = openLeads.filter((lead) =>
      isUnassignedUser ? !lead.assigned_to_user_id : lead.assigned_to_user_id === user.id
    );
    const userOpenDeals = openDeals.filter((deal) =>
      isUnassignedUser ? !deal.owner_user_id : deal.owner_user_id === user.id
    );
    const userAllDeals = (deals as DealRow[]).filter((deal) =>
      isUnassignedUser ? !deal.owner_user_id : deal.owner_user_id === user.id
    );

    const wonDeals = userAllDeals.filter(
      (deal) => String(deal.stage || '').toLowerCase() === 'won'
    ).length;
    const closedDeals = userAllDeals.filter((deal) =>
      CLOSED_DEAL_STAGES.includes(String(deal.stage || '').toLowerCase())
    ).length;
    const conversionRatePct = closedDeals > 0 ? (wonDeals / closedDeals) * 100 : 0;

    const respondedLeads = userOpenLeads.filter((lead) => firstResponseByLead.has(lead.id));
    const responseRatePct =
      userOpenLeads.length > 0 ? (respondedLeads.length / userOpenLeads.length) * 100 : 0;
    const avgFirstResponseHours =
      respondedLeads.length > 0
        ? respondedLeads.reduce((sum, lead) => {
            const first = firstResponseByLead.get(lead.id)!;
            return sum + hoursBetween(lead.created_at, first);
          }, 0) / respondedLeads.length
        : 0;

    const leadSlaRisks = userOpenLeads.filter((lead) => {
      const first = firstResponseByLead.get(lead.id);
      if (first) return false;
      return hoursBetween(lead.created_at, now) > leadResponseHours;
    }).length;

    const dealSlaRisks = userOpenDeals.filter((deal) => {
      const stage = String(deal.stage || '').toLowerCase();
      if (CLOSED_DEAL_STAGES.includes(stage)) return false;
      return hoursBetween(deal.updated_at, now) > dealAgingHours;
    }).length;

    const stageDistributionRaw = stageDistributionMap.get(user.id) ?? new Map<string, number>();
    const stageDistribution = [...stageDistributionRaw.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([stage, count]) => ({
        stage,
        count,
      }));

    return {
      userId: user.id,
      fullName: user.full_name,
      email: user.email,
      role: user.role,
      activeLeads: userOpenLeads.length,
      activeDeals: userOpenDeals.length,
      stageDistribution,
      overdueFollowups: overdueFollowupsMap.get(user.id) ?? 0,
      slaRiskCount: leadSlaRisks + dealSlaRisks,
      wonDeals,
      closedDeals,
      conversionRatePct: Number(conversionRatePct.toFixed(2)),
      respondedLeadCount: respondedLeads.length,
      responseRatePct: Number(responseRatePct.toFixed(2)),
      avgFirstResponseHours: Number(avgFirstResponseHours.toFixed(2)),
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    slaRules: {
      leadResponseHours,
      dealAgingHours,
    },
    agents,
  };
}
