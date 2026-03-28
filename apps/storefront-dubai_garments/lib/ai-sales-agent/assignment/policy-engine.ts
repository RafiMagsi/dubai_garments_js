import { prisma } from '@/lib/prisma';
import {
  AssignmentPolicyConfigSchema,
  type AssignmentMode,
  type AssignmentPolicyConfig,
} from '@/lib/ai-sales-agent/contracts';

const SETTINGS_KEYS = {
  config: 'AI_ASSIGNMENT_POLICY_V1',
  rrCursor: 'AI_ASSIGNMENT_POLICY_RR_CURSOR',
} as const;

type EngineContext = {
  userId: string;
  role: string;
  requestId?: string | null;
};

type Candidate = {
  id: string;
  fullName: string;
  email: string;
  role: string;
  isActive: boolean;
  openLeadCount: number;
  openDealCount: number;
  weightedLoad: number;
  skillTags: string[];
  capacityWeight: number;
};

type ResolveInput = {
  leadId?: string;
  dealId?: string;
  manualAssigneeUserId?: string;
  reason?: string;
};

async function upsertSetting(input: {
  key: string;
  value: string;
  description: string;
  updatedByUserId: string;
}) {
  await prisma.$executeRaw`
    WITH updated AS (
      UPDATE system_settings
      SET
        value = ${input.value},
        is_secret = FALSE,
        is_active = TRUE,
        description = ${input.description},
        updated_by_user_id = ${input.updatedByUserId}::uuid,
        updated_at = NOW()
      WHERE scope = 'storefront'
        AND key = ${input.key}
      RETURNING id
    )
    INSERT INTO system_settings (
      scope,
      key,
      value,
      is_secret,
      is_active,
      description,
      updated_by_user_id
    )
    SELECT
      'storefront',
      ${input.key},
      ${input.value},
      FALSE,
      TRUE,
      ${input.description},
      ${input.updatedByUserId}::uuid
    WHERE NOT EXISTS (SELECT 1 FROM updated)
  `;
}

async function readSetting(key: string) {
  const rows = await prisma.$queryRaw<Array<{ value: string }>>`
    SELECT value
    FROM system_settings
    WHERE is_active = TRUE
      AND scope IN ('storefront', 'global')
      AND key = ${key}
    ORDER BY CASE WHEN scope = 'storefront' THEN 0 ELSE 1 END, updated_at DESC
    LIMIT 1
  `;
  return rows[0]?.value ?? null;
}

async function getPolicyConfig() {
  const raw = await readSetting(SETTINGS_KEYS.config);
  if (!raw) {
    return AssignmentPolicyConfigSchema.parse({});
  }

  try {
    return AssignmentPolicyConfigSchema.parse(JSON.parse(raw));
  } catch {
    return AssignmentPolicyConfigSchema.parse({});
  }
}

async function getActiveAgents(config: AssignmentPolicyConfig): Promise<Candidate[]> {
  const users = await prisma.users.findMany({
    where: {
      is_active: true,
      role: { in: ['sales_rep', 'sales_manager'] },
    },
    orderBy: { created_at: 'asc' },
    select: {
      id: true,
      full_name: true,
      email: true,
      role: true,
      is_active: true,
    },
  });

  if (users.length === 0) return [];

  const userIds = users.map((user) => user.id);

  const [leadCounts, dealCounts] = await Promise.all([
    prisma.leads.groupBy({
      by: ['assigned_to_user_id'],
      where: {
        assigned_to_user_id: { in: userIds },
        status: { in: ['new', 'qualified', 'quoted'] },
      },
      _count: { _all: true },
    }),
    prisma.deals.groupBy({
      by: ['owner_user_id'],
      where: {
        owner_user_id: { in: userIds },
        stage: { notIn: ['won', 'lost'] },
      },
      _count: { _all: true },
    }),
  ]);

  const leadsMap = new Map<string, number>();
  leadCounts.forEach((row) => {
    if (row.assigned_to_user_id) {
      leadsMap.set(row.assigned_to_user_id, row._count._all);
    }
  });

  const dealsMap = new Map<string, number>();
  dealCounts.forEach((row) => {
    if (row.owner_user_id) {
      dealsMap.set(row.owner_user_id, row._count._all);
    }
  });

  return users.map((user) => {
    const openLeadCount = leadsMap.get(user.id) ?? 0;
    const openDealCount = dealsMap.get(user.id) ?? 0;
    const capacityWeight = config.capacityByUserId[user.id] ?? 1;
    const skillTags = config.skillsByUserId[user.id] ?? [];
    const weightedLoad =
      (openLeadCount * config.weightedLeadMultiplier + openDealCount * config.weightedDealMultiplier) /
      Math.max(capacityWeight, 1);

    return {
      id: user.id,
      fullName: user.full_name,
      email: user.email,
      role: user.role,
      isActive: user.is_active,
      openLeadCount,
      openDealCount,
      weightedLoad: Number(weightedLoad.toFixed(2)),
      skillTags,
      capacityWeight,
    };
  });
}

function tokenizeLeadSignals(input: {
  lead:
    | {
        source?: string | null;
        notes?: string | null;
        ai_product?: string | null;
        company_name?: string | null;
      }
    | null;
  deal:
    | {
        title?: string | null;
        notes?: string | null;
      }
    | null;
}) {
  const text = [
    String(input.lead?.source ?? ''),
    String(input.lead?.notes ?? ''),
    String(input.lead?.ai_product ?? ''),
    String(input.lead?.company_name ?? ''),
    String(input.deal?.title ?? ''),
    String(input.deal?.notes ?? ''),
  ]
    .join(' ')
    .toLowerCase();

  return Array.from(new Set(text.split(/[^a-z0-9]+/g).map((x) => x.trim()).filter(Boolean)));
}

function resolveRoundRobinCandidate(candidates: Candidate[], cursor: string | null) {
  if (candidates.length === 0) return null;
  if (!cursor) return candidates[0];
  const index = candidates.findIndex((candidate) => candidate.id === cursor);
  if (index < 0) return candidates[0];
  return candidates[(index + 1) % candidates.length];
}

function resolveWeightedCandidate(candidates: Candidate[]) {
  return [...candidates].sort((a, b) => a.weightedLoad - b.weightedLoad)[0] ?? null;
}

function resolveSkillCandidate(candidates: Candidate[], signalTokens: string[]) {
  let winner: Candidate | null = null;
  let maxScore = -1;
  for (const candidate of candidates) {
    const score = candidate.skillTags.reduce((acc, tag) => {
      const normalized = tag.toLowerCase().trim();
      return signalTokens.includes(normalized) ? acc + 1 : acc;
    }, 0);
    if (score > maxScore) {
      maxScore = score;
      winner = candidate;
    } else if (score === maxScore && winner && candidate.weightedLoad < winner.weightedLoad) {
      winner = candidate;
    }
  }
  return maxScore <= 0 ? null : winner;
}

export async function getAssignmentPolicyEngineState() {
  const config = await getPolicyConfig();
  const availableAgents = await getActiveAgents(config);
  return {
    config,
    availableAgents,
  };
}

export async function updateAssignmentPolicyEngineConfig(input: {
  config: AssignmentPolicyConfig;
  updatedByUserId: string;
}) {
  const validated = AssignmentPolicyConfigSchema.parse(input.config);
  await upsertSetting({
    key: SETTINGS_KEYS.config,
    value: JSON.stringify(validated),
    description: 'AI Sales Agent assignment policy engine configuration',
    updatedByUserId: input.updatedByUserId,
  });
  return getAssignmentPolicyEngineState();
}

export async function executeAssignmentPolicyEngine(input: ResolveInput, context: EngineContext) {
  const config = await getPolicyConfig();
  const candidates = await getActiveAgents(config);
  const reasoning: string[] = [];

  let lead = null;
  let deal = null;

  if (input.leadId) {
    lead = await prisma.leads.findFirst({
      where:
        context.role === 'sales_rep'
          ? { id: input.leadId, assigned_to_user_id: context.userId }
          : { id: input.leadId },
    });
  }

  if (input.dealId) {
    deal = await prisma.deals.findFirst({
      where:
        context.role === 'sales_rep'
          ? { id: input.dealId, owner_user_id: context.userId }
          : { id: input.dealId },
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

  let fallbackUsed = false;
  let selectedCandidate: Candidate | null = null;
  const mode: AssignmentMode =
    input.manualAssigneeUserId || config.mode === 'manual_override'
      ? 'manual_override'
      : config.mode;

  if (mode === 'manual_override') {
    const assigneeId = input.manualAssigneeUserId ?? config.fallbackAssigneeUserId;
    if (!assigneeId) {
      throw new Error('Manual override mode requires a manual assignee or fallback assignee.');
    }
    selectedCandidate = candidates.find((candidate) => candidate.id === assigneeId) ?? null;
    reasoning.push('Manual override selection applied.');
  } else if (mode === 'round_robin') {
    const cursor = await readSetting(SETTINGS_KEYS.rrCursor);
    selectedCandidate = resolveRoundRobinCandidate(candidates, cursor);
    reasoning.push('Round-robin policy selected next candidate from rotation.');
  } else if (mode === 'weighted_capacity') {
    selectedCandidate = resolveWeightedCandidate(candidates);
    reasoning.push('Weighted-capacity policy selected candidate with minimum weighted load.');
  } else if (mode === 'skill_tag_based') {
    const signals = tokenizeLeadSignals({ lead, deal });
    selectedCandidate = resolveSkillCandidate(candidates, signals);
    reasoning.push('Skill/tag policy attempted to match lead/deal signals against agent tags.');
    if (!selectedCandidate) {
      selectedCandidate = resolveWeightedCandidate(candidates);
      fallbackUsed = true;
      reasoning.push('No skill match found; fell back to weighted-capacity candidate.');
    }
  }

  if (!selectedCandidate && config.fallbackAssigneeUserId) {
    selectedCandidate = candidates.find((candidate) => candidate.id === config.fallbackAssigneeUserId) ?? null;
    fallbackUsed = true;
    reasoning.push('Primary policy returned no candidate; fallback assignee selected.');
  }

  if (!selectedCandidate && candidates.length > 0) {
    selectedCandidate = candidates[0];
    fallbackUsed = true;
    reasoning.push('Primary policy returned no candidate; defaulted to first active agent.');
  }

  if (!selectedCandidate) {
    throw new Error('No active sales agent available for assignment.');
  }

  let assignmentApplied = false;
  if (lead && lead.assigned_to_user_id !== selectedCandidate.id) {
    await prisma.leads.update({
      where: { id: lead.id },
      data: { assigned_to_user_id: selectedCandidate.id },
    });
    assignmentApplied = true;
  }

  if (deal && deal.owner_user_id !== selectedCandidate.id) {
    await prisma.deals.update({
      where: { id: deal.id },
      data: { owner_user_id: selectedCandidate.id },
    });
    assignmentApplied = true;
  }

  if (mode === 'round_robin') {
    await upsertSetting({
      key: SETTINGS_KEYS.rrCursor,
      value: selectedCandidate.id,
      description: 'Last selected assignee cursor for round-robin assignment mode',
      updatedByUserId: context.userId,
    });
  }

  await prisma.activities.create({
    data: {
      user_id: context.userId,
      lead_id: lead?.id ?? null,
      deal_id: deal?.id ?? null,
      activity_type: 'ai_assignment_policy',
      title: 'AI Assignment Policy Engine',
      details: `Policy ${mode} selected ${selectedCandidate.fullName}.`,
      metadata: {
        requestId: context.requestId ?? null,
        mode,
        selectedAssigneeUserId: selectedCandidate.id,
        selectedAssigneeName: selectedCandidate.fullName,
        assignmentApplied,
        fallbackUsed,
        reason: input.reason ?? null,
        reasoning,
      },
    },
  });

  return {
    mode,
    leadId: lead?.id ?? null,
    dealId: deal?.id ?? null,
    selectedAssigneeUserId: selectedCandidate.id,
    selectedAssigneeName: selectedCandidate.fullName,
    assignmentApplied,
    fallbackUsed,
    reasoning,
  };
}
