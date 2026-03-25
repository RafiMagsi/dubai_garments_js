import { prisma } from '@/lib/prisma';
import { getSalesAgentWorkloadModel } from '@/lib/ai-sales-agent/assignment/workload-model';
import { loadSafeDealRows, loadSafeLeadsRows } from '@/lib/ai-sales-agent/assignment/safe-data';

export type AgentPipelineFilters = {
  team?: string | null;
  stage?: string | null;
  urgency?: string | null;
  inactiveDays?: number | null;
  ownerUserId?: string | null;
};

type PipelineContext = {
  userId: string;
  role: string;
  requestId?: string | null;
};

type PipelineStageKey =
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

type BoardItem = {
  itemId: string;
  itemType: 'lead' | 'deal';
  customerId: string | null;
  ownerUserId: string;
  ownerName: string;
  title: string;
  stage: PipelineStageKey;
  urgency: 'low' | 'medium' | 'high' | 'critical' | 'unknown';
  inactiveDays: number;
  lastActivityAt: string;
  createdAt: string;
};

const PIPELINE_STAGE_META: Array<{ key: PipelineStageKey; label: string }> = [
  { key: 'lead_new', label: 'Lead New' },
  { key: 'triaged', label: 'Triaged' },
  { key: 'qualified', label: 'Qualified' },
  { key: 'reply_sent', label: 'Reply Sent' },
  { key: 'deal_open', label: 'Deal Open' },
  { key: 'quote_ready', label: 'Quote Ready' },
  { key: 'quote_sent', label: 'Quote Sent' },
  { key: 'negotiation', label: 'Negotiation' },
  { key: 'won_lost', label: 'Won / Lost' },
  { key: 'post_outcome', label: 'Post-Outcome' },
];

const ACTIVE_LEAD_STATUSES = ['new', 'qualified', 'quoted'];
const CLOSED_DEAL_STAGES = ['won', 'lost'];
const UNASSIGNED_USER_ID = '__unassigned__';

function toUrgency(value: string | null | undefined): BoardItem['urgency'] {
  const normalized = String(value ?? '').toLowerCase().trim();
  if (normalized === 'low' || normalized === 'medium' || normalized === 'high' || normalized === 'critical') {
    return normalized;
  }
  return 'unknown';
}

function toDaysDiff(from: Date, to: Date) {
  const ms = to.getTime() - from.getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

function deriveTeamFromRole(role: string) {
  const normalized = String(role || '').toLowerCase();
  if (normalized.includes('ops')) return 'operations';
  if (normalized.includes('sales')) return 'sales';
  if (normalized.includes('admin')) return 'management';
  return 'other';
}

function mapLeadToPipelineStage(status: string, hasAiAnalysis: boolean): PipelineStageKey {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'new') {
    return hasAiAnalysis ? 'triaged' : 'lead_new';
  }
  if (normalized === 'qualified') return 'qualified';
  if (normalized === 'quoted') return 'quote_ready';
  return hasAiAnalysis ? 'triaged' : 'lead_new';
}

function mapDealToPipelineStage(stage: string): PipelineStageKey {
  const normalized = String(stage || '').toLowerCase();
  if (['new', 'open', 'qualified'].includes(normalized)) return 'deal_open';
  if (['proposal', 'quote_draft', 'quote_ready'].includes(normalized)) return 'quote_ready';
  if (['quote_sent', 'sent'].includes(normalized)) return 'quote_sent';
  if (['negotiation', 'counter', 'revision'].includes(normalized)) return 'negotiation';
  if (['won', 'lost'].includes(normalized)) return 'won_lost';
  return 'deal_open';
}

function mapDealUrgency(probabilityPct: number | null): BoardItem['urgency'] {
  const probability = Number(probabilityPct ?? 0);
  if (probability >= 80) return 'high';
  if (probability >= 50) return 'medium';
  if (probability > 0) return 'low';
  return 'unknown';
}

export async function getAgentPipelineBoard(context: PipelineContext, filters: AgentPipelineFilters) {
  const workload = await getSalesAgentWorkloadModel(context);
  const users = workload.agents;

  if (users.length === 0) {
    return {
      generatedAt: new Date().toISOString(),
      filtersApplied: {
        team: 'all',
        stage: 'all',
        urgency: 'all',
        inactiveDays: 0,
        ownerUserId: null,
      },
      filterOptions: {
        teams: ['all'],
        stages: ['all', ...PIPELINE_STAGE_META.map((item) => item.key)],
        urgencies: ['all', 'low', 'medium', 'high', 'critical', 'unknown'],
        owners: [],
      },
      left: {
        agents: [],
      },
      center: {
        stages: PIPELINE_STAGE_META.map((meta) => ({
          key: meta.key,
          label: meta.label,
          total: 0,
          leads: 0,
          deals: 0,
          items: [],
        })),
      },
      right: {
        alerts: [],
        rebalanceSuggestions: [],
      },
    };
  }

  const ownerMap = new Map(users.map((agent) => [agent.userId, agent]));
  const userIds = users.map((agent) => agent.userId);
  const dbUserIds = userIds.filter((id) => id !== UNASSIGNED_USER_ID);
  const includeUnassigned = context.role !== 'sales_rep' && userIds.includes(UNASSIGNED_USER_ID);
  const now = new Date();
  const inactiveDaysFilter = Math.max(0, Number(filters.inactiveDays ?? 0));
  const stageFilter = String(filters.stage ?? 'all').toLowerCase();
  const urgencyFilter = String(filters.urgency ?? 'all').toLowerCase();
  const ownerFilter = filters.ownerUserId ? String(filters.ownerUserId) : 'all';
  const teamFilter = String(filters.team ?? 'all').toLowerCase();

  const [allLeadsRows, allDealsRows, leadExtras, dealExtras] = await Promise.all([
    loadSafeLeadsRows(),
    loadSafeDealRows(),
    prisma.leads.findMany({
      select: {
        id: true,
        customer_id: true,
        contact_name: true,
        company_name: true,
        ai_urgency: true,
        ai_processed_at: true,
        last_contacted_at: true,
      },
    }),
    prisma.deals.findMany({
      select: {
        id: true,
        customer_id: true,
        title: true,
        probability_pct: true,
      },
    }),
  ]);
  const leadExtraMap = new Map(leadExtras.map((lead) => [lead.id, lead]));
  const dealExtraMap = new Map(dealExtras.map((deal) => [deal.id, deal]));

  const leads = allLeadsRows
    .filter((lead) =>
      includeUnassigned
        ? !lead.assigned_to_user_id || dbUserIds.includes(lead.assigned_to_user_id)
        : Boolean(lead.assigned_to_user_id && dbUserIds.includes(lead.assigned_to_user_id))
    )
    .map((lead) => ({
      ...lead,
      customer_id: leadExtraMap.get(lead.id)?.customer_id ?? null,
      contact_name: leadExtraMap.get(lead.id)?.contact_name ?? null,
      company_name: leadExtraMap.get(lead.id)?.company_name ?? null,
      ai_urgency: leadExtraMap.get(lead.id)?.ai_urgency ?? null,
      ai_processed_at: leadExtraMap.get(lead.id)?.ai_processed_at ?? null,
      last_contacted_at: leadExtraMap.get(lead.id)?.last_contacted_at ?? null,
    }))
    .sort((a, b) => b.updated_at.getTime() - a.updated_at.getTime());

  const deals = allDealsRows
    .filter((deal) =>
      includeUnassigned
        ? !deal.owner_user_id || dbUserIds.includes(deal.owner_user_id)
        : Boolean(deal.owner_user_id && dbUserIds.includes(deal.owner_user_id))
    )
    .map((deal) => ({
      ...deal,
      customer_id: dealExtraMap.get(deal.id)?.customer_id ?? null,
      title: dealExtraMap.get(deal.id)?.title ?? null,
      probability_pct: dealExtraMap.get(deal.id)?.probability_pct ?? null,
    }))
    .sort((a, b) => b.updated_at.getTime() - a.updated_at.getTime());

  const leadItems: BoardItem[] = leads
    .filter((lead) => ACTIVE_LEAD_STATUSES.includes(String(lead.status || '').toLowerCase()))
    .flatMap<BoardItem>((lead) => {
      const ownerUserId = lead.assigned_to_user_id || (includeUnassigned ? UNASSIGNED_USER_ID : null);
      if (!ownerUserId) return [];
      const owner = ownerMap.get(ownerUserId);
      const lastActivity = lead.last_contacted_at ?? lead.updated_at;
      return [{
        itemId: lead.id,
        itemType: 'lead' as const,
        customerId: lead.customer_id,
        ownerUserId,
        ownerName: owner?.fullName ?? 'Unknown',
        title: lead.contact_name || lead.company_name || `Lead ${lead.id.slice(0, 8)}`,
        stage: mapLeadToPipelineStage(String(lead.status || ''), Boolean(lead.ai_processed_at)),
        urgency: toUrgency(lead.ai_urgency),
        inactiveDays: toDaysDiff(lastActivity, now),
        lastActivityAt: lastActivity.toISOString(),
        createdAt: lead.created_at.toISOString(),
      }];
    });

  const dealItems: BoardItem[] = deals
    .filter((deal) => !CLOSED_DEAL_STAGES.includes(String(deal.stage || '').toLowerCase()))
    .flatMap<BoardItem>((deal) => {
      const ownerUserId = deal.owner_user_id || (includeUnassigned ? UNASSIGNED_USER_ID : null);
      if (!ownerUserId) return [];
      const owner = ownerMap.get(ownerUserId);
      return [{
        itemId: deal.id,
        itemType: 'deal' as const,
        customerId: deal.customer_id,
        ownerUserId,
        ownerName: owner?.fullName ?? 'Unknown',
        title: deal.title || `Deal ${deal.id.slice(0, 8)}`,
        stage: mapDealToPipelineStage(String(deal.stage || '')),
        urgency: mapDealUrgency(deal.probability_pct),
        inactiveDays: toDaysDiff(deal.updated_at, now),
        lastActivityAt: deal.updated_at.toISOString(),
        createdAt: deal.created_at.toISOString(),
      }];
    });

  const items = [...leadItems, ...dealItems].filter((item) => {
    const agent = ownerMap.get(item.ownerUserId);
    const agentTeam = deriveTeamFromRole(agent?.role ?? '');

    if (teamFilter !== 'all' && teamFilter !== agentTeam) return false;
    if (ownerFilter !== 'all' && ownerFilter !== item.ownerUserId) return false;
    if (stageFilter !== 'all' && stageFilter !== item.stage) return false;
    if (urgencyFilter !== 'all' && urgencyFilter !== item.urgency) return false;
    if (inactiveDaysFilter > 0 && item.inactiveDays < inactiveDaysFilter) return false;

    return true;
  });

  const stageBuckets = PIPELINE_STAGE_META.map((meta) => {
    const stageItems = items
      .filter((item) => item.stage === meta.key)
      .sort((a, b) => b.inactiveDays - a.inactiveDays)
      .slice(0, 12);

    return {
      key: meta.key,
      label: meta.label,
      total: stageItems.length,
      leads: stageItems.filter((item) => item.itemType === 'lead').length,
      deals: stageItems.filter((item) => item.itemType === 'deal').length,
      items: stageItems,
    };
  });

  const filteredAgents = users
    .filter((agent) => {
      const team = deriveTeamFromRole(agent.role);
      if (teamFilter !== 'all' && team !== teamFilter) return false;
      if (ownerFilter !== 'all' && ownerFilter !== agent.userId) return false;
      return true;
    })
    .map((agent) => {
      const agentItems = items.filter((item) => item.ownerUserId === agent.userId);
      const maxInactiveDays = agentItems.length > 0 ? Math.max(...agentItems.map((item) => item.inactiveDays)) : 0;
      const highUrgencyCount = agentItems.filter((item) => item.urgency === 'high' || item.urgency === 'critical').length;
      return {
        ...agent,
        team: deriveTeamFromRole(agent.role),
        itemCount: agentItems.length,
        highUrgencyCount,
        maxInactiveDays,
      };
    })
    .sort((a, b) => b.slaRiskCount - a.slaRiskCount || b.itemCount - a.itemCount);

  const alerts: Array<{ severity: 'warning' | 'critical' | 'info'; title: string; detail: string }> = [];
  for (const agent of filteredAgents) {
    if (agent.slaRiskCount >= 3) {
      alerts.push({
        severity: 'critical',
        title: `${agent.fullName}: high SLA risk`,
        detail: `${agent.slaRiskCount} items are beyond SLA thresholds.`,
      });
    } else if (agent.slaRiskCount > 0) {
      alerts.push({
        severity: 'warning',
        title: `${agent.fullName}: SLA watch`,
        detail: `${agent.slaRiskCount} items need intervention soon.`,
      });
    }

    if (agent.overdueFollowups > 0) {
      alerts.push({
        severity: 'warning',
        title: `${agent.fullName}: overdue follow-ups`,
        detail: `${agent.overdueFollowups} follow-up tasks are overdue.`,
      });
    }

    if (agent.maxInactiveDays >= Math.max(3, inactiveDaysFilter || 0)) {
      alerts.push({
        severity: 'info',
        title: `${agent.fullName}: inactivity cluster`,
        detail: `Longest inactivity is ${agent.maxInactiveDays} day(s).`,
      });
    }
  }

  const rebalancedSuggestions: Array<{
    id: string;
    title: string;
    detail: string;
    fromOwnerUserId: string | null;
    toOwnerUserId: string | null;
    stage: string | null;
    limit: number | null;
  }> = [];
  if (filteredAgents.length >= 2) {
    const byLoad = [...filteredAgents].sort((a, b) => b.itemCount - a.itemCount);
    const high = byLoad[0];
    const low = byLoad[byLoad.length - 1];
    if (high && low && high.userId !== low.userId && high.itemCount - low.itemCount >= 3) {
      rebalancedSuggestions.push({
        id: 'load-rebalance',
        title: 'Redistribute overloaded owner queue',
        detail: `Move ${Math.floor((high.itemCount - low.itemCount) / 2)} item(s) from ${high.fullName} to ${low.fullName}.`,
        fromOwnerUserId: high.userId,
        toOwnerUserId: low.userId,
        stage: null,
        limit: Math.floor((high.itemCount - low.itemCount) / 2),
      });
    }
  }

  if (stageBuckets.find((stage) => stage.key === 'reply_sent')?.total === 0) {
    rebalancedSuggestions.push({
      id: 'reply-queue-empty',
      title: 'Reply queue is empty',
      detail: 'No active Reply Sent workload. Open qualified stage queue and trigger reply execution.',
      fromOwnerUserId: filteredAgents[0]?.userId ?? null,
      toOwnerUserId: null,
      stage: 'qualified',
      limit: 6,
    });
  }

  if (alerts.length === 0) {
    alerts.push({
      severity: 'info',
      title: 'Pipeline health on track',
      detail: 'No critical agent workload risks detected in the current filters.',
    });
  }

  if (rebalancedSuggestions.length === 0) {
    rebalancedSuggestions.push({
      id: 'balanced',
      title: 'Distribution is balanced',
      detail: 'No immediate rebalance needed. Keep monitoring SLA and inactivity trends.',
      fromOwnerUserId: filteredAgents[0]?.userId ?? null,
      toOwnerUserId: null,
      stage: null,
      limit: null,
    });
  }

  return {
    generatedAt: new Date().toISOString(),
    filtersApplied: {
      team: teamFilter,
      stage: stageFilter,
      urgency: urgencyFilter,
      inactiveDays: inactiveDaysFilter,
      ownerUserId: ownerFilter === 'all' ? null : ownerFilter,
    },
    filterOptions: {
      teams: ['all', 'sales', 'operations', 'management', 'other'],
      stages: ['all', ...PIPELINE_STAGE_META.map((item) => item.key)],
      urgencies: ['all', 'low', 'medium', 'high', 'critical', 'unknown'],
      owners: users.map((user) => ({
        userId: user.userId,
        fullName: user.fullName,
      })),
    },
    left: {
      agents: filteredAgents,
    },
    center: {
      stages: stageBuckets,
    },
    right: {
      alerts: alerts.slice(0, 8),
      rebalanceSuggestions: rebalancedSuggestions.slice(0, 5),
    },
  };
}
