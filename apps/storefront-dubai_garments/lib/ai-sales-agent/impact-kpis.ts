import { prisma } from '@/lib/prisma';

type ImpactMetric = {
  value: number;
  today: number;
  last7d: number;
  denominator7d: number;
  deltaPct: number;
};

type ImpactResponse = {
  generatedAt: string;
  window: {
    todayStart: string;
    last7dStart: string;
  };
  timeSavedEstimate: ImpactMetric & {
    hoursSaved7d: number;
  };
  suggestionsAccepted: ImpactMetric & {
    acceptanceRate7d: number;
  };
  riskAlertsResolved: ImpactMetric & {
    resolutionRate7d: number;
  };
};

const AI_ACTIVITY_TYPES = [
  'ai_lead_triage',
  'ai_copilot_action',
  'ai_lead_intelligence_action',
  'ai_pipeline_insight',
  'ai_pipeline_insight_execution',
  'ai_smart_routing_sla',
  'ai_automation_rerun',
  'ai_automation_template_toggle',
] as const;

const TIME_SAVED_MINUTES: Record<string, number> = {
  ai_lead_triage: 8,
  ai_copilot_action: 6,
  ai_lead_intelligence_action: 5,
  ai_pipeline_insight: 4,
  ai_pipeline_insight_execution: 3,
  ai_smart_routing_sla: 4,
  ai_automation_rerun: 3,
  ai_automation_template_toggle: 2,
};

function startOfToday() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function safeMeta(row: unknown): Record<string, unknown> {
  if (!row || typeof row !== 'object' || Array.isArray(row)) return {};
  return row as Record<string, unknown>;
}

function pct(part: number, total: number) {
  if (total <= 0) return 0;
  return Number(((part / total) * 100).toFixed(1));
}

function deltaPct(current: number, previous: number) {
  if (previous <= 0) {
    return current > 0 ? 100 : 0;
  }
  return Number((((current - previous) / previous) * 100).toFixed(1));
}

export async function getAiImpactKpis(): Promise<ImpactResponse> {
  const todayStart = startOfToday();
  const last7dStart = addDays(todayStart, -6);
  const previous7dStart = addDays(last7dStart, -7);
  const previous7dEnd = addDays(last7dStart, -1);

  const [recentActivities, previousWindowActivities] = await Promise.all([
    prisma.activities.findMany({
      where: {
        activity_type: { in: [...AI_ACTIVITY_TYPES] },
        occurred_at: { gte: last7dStart },
      },
      select: {
        activity_type: true,
        occurred_at: true,
        metadata: true,
      },
    }),
    prisma.activities.findMany({
      where: {
        activity_type: { in: [...AI_ACTIVITY_TYPES] },
        occurred_at: {
          gte: previous7dStart,
          lte: previous7dEnd,
        },
      },
      select: {
        activity_type: true,
        occurred_at: true,
        metadata: true,
      },
    }),
  ]);

  const todayActivities = recentActivities.filter(
    (activity) => new Date(activity.occurred_at) >= todayStart
  );

  const timeSaved7d = recentActivities.reduce(
    (sum, row) => sum + (TIME_SAVED_MINUTES[row.activity_type] ?? 0),
    0
  );
  const timeSavedToday = todayActivities.reduce(
    (sum, row) => sum + (TIME_SAVED_MINUTES[row.activity_type] ?? 0),
    0
  );
  const previousTimeSaved7d = previousWindowActivities.reduce(
    (sum, row) => sum + (TIME_SAVED_MINUTES[row.activity_type] ?? 0),
    0
  );

  const acceptedPredicate = (row: { activity_type: string; metadata: unknown }) => {
    const meta = safeMeta(row.metadata);
    if (row.activity_type === 'ai_lead_intelligence_action') {
      return meta.outcome === 'success';
    }
    if (row.activity_type === 'ai_pipeline_insight_execution') {
      return meta.dryRun === false;
    }
    if (row.activity_type === 'ai_copilot_action') {
      return meta.executed === true;
    }
    return false;
  };

  const acceptedEligiblePredicate = (row: { activity_type: string }) =>
    row.activity_type === 'ai_lead_intelligence_action' ||
    row.activity_type === 'ai_pipeline_insight_execution' ||
    row.activity_type === 'ai_copilot_action';

  const accepted7d = recentActivities.filter(acceptedPredicate).length;
  const acceptedToday = todayActivities.filter(acceptedPredicate).length;
  const acceptedEligible7d = recentActivities.filter(acceptedEligiblePredicate).length;
  const previousAccepted7d = previousWindowActivities.filter(acceptedPredicate).length;

  const riskDetectedPredicate = (row: { activity_type: string; metadata: unknown }) => {
    if (row.activity_type !== 'ai_pipeline_insight') return false;
    const meta = safeMeta(row.metadata);
    const data = safeMeta(meta.data);
    const score = typeof data.riskScore === 'number' ? data.riskScore : 0;
    return score >= 60;
  };

  const riskResolvedPredicate = (row: { activity_type: string; metadata: unknown }) => {
    if (
      row.activity_type !== 'ai_pipeline_insight_execution' &&
      row.activity_type !== 'ai_smart_routing_sla'
    ) {
      return false;
    }
    const meta = safeMeta(row.metadata);
    if (row.activity_type === 'ai_pipeline_insight_execution') {
      return meta.dryRun === false;
    }
    return meta.assignmentApplied === true || meta.slaBucket === 'on_track';
  };

  const riskDetected7d = recentActivities.filter(riskDetectedPredicate).length;
  const riskResolved7d = recentActivities.filter(riskResolvedPredicate).length;
  const riskResolvedToday = todayActivities.filter(riskResolvedPredicate).length;
  const previousRiskResolved7d = previousWindowActivities.filter(riskResolvedPredicate).length;

  return {
    generatedAt: new Date().toISOString(),
    window: {
      todayStart: todayStart.toISOString(),
      last7dStart: last7dStart.toISOString(),
    },
    timeSavedEstimate: {
      value: timeSaved7d,
      today: timeSavedToday,
      last7d: timeSaved7d,
      denominator7d: recentActivities.length,
      deltaPct: deltaPct(timeSaved7d, previousTimeSaved7d),
      hoursSaved7d: Number((timeSaved7d / 60).toFixed(1)),
    },
    suggestionsAccepted: {
      value: accepted7d,
      today: acceptedToday,
      last7d: accepted7d,
      denominator7d: acceptedEligible7d,
      deltaPct: deltaPct(accepted7d, previousAccepted7d),
      acceptanceRate7d: pct(accepted7d, acceptedEligible7d),
    },
    riskAlertsResolved: {
      value: riskResolved7d,
      today: riskResolvedToday,
      last7d: riskResolved7d,
      denominator7d: riskDetected7d,
      deltaPct: deltaPct(riskResolved7d, previousRiskResolved7d),
      resolutionRate7d: pct(riskResolved7d, riskDetected7d),
    },
  };
}

