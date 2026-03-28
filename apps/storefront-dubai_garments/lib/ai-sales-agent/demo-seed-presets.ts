import crypto from 'node:crypto';
import { prisma } from '@/lib/prisma';

const DEMO_VERSION = 'v1';
const DEMO_NAMESPACE = `ai-sales-day28-${DEMO_VERSION}`;

const DEMO_USER_EMAILS = {
  admin: 'admin@dubaigarments.me',
  salesManager: 'sales.manager@dubaigarments.me',
  salesRep: 'sales.rep@dubaigarments.me',
} as const;

const DEMO_PRODUCT_SLUGS = [
  'premium-corporate-tshirt',
  'custom-event-hoodie',
  'hospitality-staff-uniform',
] as const;

const DEMO_SCENARIOS = [
  {
    key: 'uniform-fast-track',
    companyName: 'Dune Skyline Hospitality',
    contactName: 'Ayesha Malik',
    email: 'procurement@duneskyline.demo',
    source: 'demo_ai_preset',
    status: 'qualified',
    requestedQty: 480,
    budget: 42000,
    notes:
      'Need 480 hospitality staff uniforms for 3 locations. Require embroidery branding and phased delivery in 2 weeks.',
    aiProductHint: 'hospitality uniform set',
    aiClassification: 'HOT',
    aiScore: 86,
    timelineOffsetDays: 14,
    dealStage: 'negotiation',
    dealValue: 54000,
    quoteStatus: 'sent',
    quoteSubtotal: 51800,
    quoteDiscount: 2200,
    quoteTotal: 49600,
  },
  {
    key: 'event-hoodie-mid',
    companyName: 'Vertex Expo Agency',
    contactName: 'Nabil Rahman',
    email: 'events@vertexexpo.demo',
    source: 'demo_ai_preset',
    status: 'new',
    requestedQty: 220,
    budget: 21000,
    notes:
      'Looking for 220 custom hoodies for event crew. Need color options, logo placement guidance, and quote by next week.',
    aiProductHint: 'event hoodie',
    aiClassification: 'WARM',
    aiScore: 69,
    timelineOffsetDays: 9,
    dealStage: 'qualified',
    dealValue: 24800,
    quoteStatus: 'draft',
    quoteSubtotal: 23300,
    quoteDiscount: 0,
    quoteTotal: 23300,
  },
  {
    key: 'promo-tee-low',
    companyName: 'Orbit Campus Club',
    contactName: 'Hassan Ali',
    email: 'merch@orbitcampus.demo',
    source: 'demo_ai_preset',
    status: 'qualified',
    requestedQty: 600,
    budget: 18000,
    notes:
      'Campus merch request for 600 promotional t-shirts. Budget-sensitive. Need recommendation on quantity split and timeline.',
    aiProductHint: 'promotional t-shirt',
    aiClassification: 'COLD',
    aiScore: 52,
    timelineOffsetDays: 21,
    dealStage: 'quoted',
    dealValue: 21000,
    quoteStatus: 'approved',
    quoteSubtotal: 19800,
    quoteDiscount: 900,
    quoteTotal: 18900,
  },
] as const;

type DemoScenarioKey = (typeof DEMO_SCENARIOS)[number]['key'];

type DemoSeedContext = {
  userIds: {
    admin: string;
    salesManager: string;
    salesRep: string;
  };
  productIds: Record<string, string>;
};

function deterministicUuid(seed: string) {
  const hash = crypto.createHash('sha256').update(seed).digest('hex').slice(0, 32);
  const part1 = hash.slice(0, 8);
  const part2 = hash.slice(8, 12);
  const part3Raw = parseInt(hash.slice(12, 16), 16);
  const part4Raw = parseInt(hash.slice(16, 20), 16);
  const part3 = ((part3Raw & 0x0fff) | 0x4000).toString(16).padStart(4, '0');
  const part4 = ((part4Raw & 0x3fff) | 0x8000).toString(16).padStart(4, '0');
  const part5 = hash.slice(20, 32);
  return `${part1}-${part2}-${part3}-${part4}-${part5}`;
}

function demoId(kind: string, key: string) {
  return deterministicUuid(`${DEMO_NAMESPACE}:${kind}:${key}`);
}

function atStartOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(base: Date, days: number) {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

async function resolveDemoContext(): Promise<DemoSeedContext> {
  const users = await prisma.users.findMany({
    where: {
      email: {
        in: [
          DEMO_USER_EMAILS.admin,
          DEMO_USER_EMAILS.salesManager,
          DEMO_USER_EMAILS.salesRep,
        ],
      },
    },
    select: { id: true, email: true, role: true },
  });

  const byEmail = new Map(users.map((user) => [user.email, user.id]));

  const fallbackAdmin =
    byEmail.get(DEMO_USER_EMAILS.admin) ??
    users.find((user) => user.role === 'admin')?.id ??
    users[0]?.id;

  const fallbackSalesManager =
    byEmail.get(DEMO_USER_EMAILS.salesManager) ??
    users.find((user) => user.role === 'sales_manager')?.id ??
    fallbackAdmin;

  const fallbackSalesRep =
    byEmail.get(DEMO_USER_EMAILS.salesRep) ??
    users.find((user) => user.role === 'sales_rep')?.id ??
    fallbackSalesManager;

  if (!fallbackAdmin || !fallbackSalesManager || !fallbackSalesRep) {
    throw new Error('Demo preset requires at least one seeded admin/backoffice user.');
  }

  const products = await prisma.product.findMany({
    where: { slug: { in: [...DEMO_PRODUCT_SLUGS] } },
    select: { id: true, slug: true },
  });
  const productIds = Object.fromEntries(products.map((item) => [item.slug, item.id]));
  const missingProducts = DEMO_PRODUCT_SLUGS.filter((slug) => !productIds[slug]);
  if (missingProducts.length > 0) {
    throw new Error(`Demo preset missing products: ${missingProducts.join(', ')}`);
  }

  return {
    userIds: {
      admin: fallbackAdmin,
      salesManager: fallbackSalesManager,
      salesRep: fallbackSalesRep,
    },
    productIds,
  };
}

function scenarioProductSlug(key: DemoScenarioKey): string {
  if (key === 'uniform-fast-track') return 'hospitality-staff-uniform';
  if (key === 'event-hoodie-mid') return 'custom-event-hoodie';
  return 'premium-corporate-tshirt';
}

async function upsertScenario(scenario: (typeof DEMO_SCENARIOS)[number], ctx: DemoSeedContext) {
  const today = atStartOfToday();
  const customerId = demoId('customer', scenario.key);
  const leadId = demoId('lead', scenario.key);
  const dealId = demoId('deal', scenario.key);
  const quoteId = demoId('quote', scenario.key);
  const quoteItemId = demoId('quote_item', scenario.key);

  const productSlug = scenarioProductSlug(scenario.key);
  const productId = ctx.productIds[productSlug];
  const quoteNumber = `DG-AI-${scenario.key.toUpperCase().replace(/-/g, '').slice(0, 8)}`;

  await prisma.customers.upsert({
    where: { id: customerId },
    update: {
      company_name: scenario.companyName,
      contact_name: scenario.contactName,
      email: scenario.email,
      phone: '+971500000000',
      whatsapp: '+971500000000',
      industry: 'Garments',
      notes: `Demo preset ${DEMO_VERSION} customer profile`,
      owner_user_id: ctx.userIds.salesManager,
    },
    create: {
      id: customerId,
      company_name: scenario.companyName,
      contact_name: scenario.contactName,
      email: scenario.email,
      phone: '+971500000000',
      whatsapp: '+971500000000',
      industry: 'Garments',
      notes: `Demo preset ${DEMO_VERSION} customer profile`,
      owner_user_id: ctx.userIds.salesManager,
    },
  });

  await prisma.leads.upsert({
    where: { id: leadId },
    update: {
      customer_id: customerId,
      assigned_to_user_id: ctx.userIds.salesRep,
      source: scenario.source,
      status: scenario.status,
      company_name: scenario.companyName,
      contact_name: scenario.contactName,
      email: scenario.email,
      requested_qty: scenario.requestedQty,
      budget: scenario.budget,
      timeline_date: addDays(today, scenario.timelineOffsetDays),
      notes: scenario.notes,
      ai_product: scenario.aiProductHint,
      ai_quantity: scenario.requestedQty,
      ai_urgency: scenario.timelineOffsetDays <= 10 ? 'medium' : 'low',
      ai_complexity: scenario.requestedQty >= 400 ? 'high' : 'medium',
      ai_processed_at: new Date(),
      ai_provider: 'system',
      ai_fallback_used: true,
      ai_score: scenario.aiScore,
      ai_classification: scenario.aiClassification,
      ai_reasoning: {
        preset: DEMO_NAMESPACE,
        summary: `Deterministic demo triage for ${scenario.companyName}.`,
        classification: scenario.aiClassification,
      },
    },
    create: {
      id: leadId,
      customer_id: customerId,
      assigned_to_user_id: ctx.userIds.salesRep,
      source: scenario.source,
      status: scenario.status,
      company_name: scenario.companyName,
      contact_name: scenario.contactName,
      email: scenario.email,
      requested_qty: scenario.requestedQty,
      budget: scenario.budget,
      timeline_date: addDays(today, scenario.timelineOffsetDays),
      notes: scenario.notes,
      ai_product: scenario.aiProductHint,
      ai_quantity: scenario.requestedQty,
      ai_urgency: scenario.timelineOffsetDays <= 10 ? 'medium' : 'low',
      ai_complexity: scenario.requestedQty >= 400 ? 'high' : 'medium',
      ai_processed_at: new Date(),
      ai_provider: 'system',
      ai_fallback_used: true,
      ai_score: scenario.aiScore,
      ai_classification: scenario.aiClassification,
      ai_reasoning: {
        preset: DEMO_NAMESPACE,
        summary: `Deterministic demo triage for ${scenario.companyName}.`,
        classification: scenario.aiClassification,
      },
    },
  });

  await prisma.deals.upsert({
    where: { id: dealId },
    update: {
      lead_id: leadId,
      customer_id: customerId,
      owner_user_id: ctx.userIds.salesManager,
      title: `${scenario.companyName} - AI Opportunity`,
      stage: scenario.dealStage,
      expected_value: scenario.dealValue,
      probability_pct: scenario.dealStage === 'negotiation' ? 70 : 45,
      expected_close_date: addDays(today, scenario.timelineOffsetDays + 12),
      notes: `Demo preset ${DEMO_VERSION} deal for AI flow.`,
    },
    create: {
      id: dealId,
      lead_id: leadId,
      customer_id: customerId,
      owner_user_id: ctx.userIds.salesManager,
      title: `${scenario.companyName} - AI Opportunity`,
      stage: scenario.dealStage,
      expected_value: scenario.dealValue,
      probability_pct: scenario.dealStage === 'negotiation' ? 70 : 45,
      expected_close_date: addDays(today, scenario.timelineOffsetDays + 12),
      notes: `Demo preset ${DEMO_VERSION} deal for AI flow.`,
    },
  });

  await prisma.quotes.upsert({
    where: { id: quoteId },
    update: {
      quote_number: quoteNumber,
      customer_id: customerId,
      lead_id: leadId,
      deal_id: dealId,
      created_by_user_id: ctx.userIds.salesManager,
      status: scenario.quoteStatus,
      currency: 'AED',
      subtotal: scenario.quoteSubtotal,
      discount_amount: scenario.quoteDiscount,
      total_amount: scenario.quoteTotal,
      tax_amount: 0,
      valid_until: addDays(today, scenario.timelineOffsetDays + 20),
      notes: `Demo preset ${DEMO_VERSION} quote.`,
    },
    create: {
      id: quoteId,
      quote_number: quoteNumber,
      customer_id: customerId,
      lead_id: leadId,
      deal_id: dealId,
      created_by_user_id: ctx.userIds.salesManager,
      status: scenario.quoteStatus,
      currency: 'AED',
      subtotal: scenario.quoteSubtotal,
      discount_amount: scenario.quoteDiscount,
      total_amount: scenario.quoteTotal,
      tax_amount: 0,
      valid_until: addDays(today, scenario.timelineOffsetDays + 20),
      notes: `Demo preset ${DEMO_VERSION} quote.`,
    },
  });

  await prisma.quote_items.upsert({
    where: { id: quoteItemId },
    update: {
      quote_id: quoteId,
      product_id: productId,
      product_variant_id: null,
      item_name: `AI Suggested ${productSlug.replace(/-/g, ' ')}`,
      description: 'Preset line item for deterministic AI quote walkthrough.',
      quantity: Math.max(25, Math.floor(scenario.requestedQty / 4)),
      unit_price: Math.max(18, Math.floor(scenario.quoteTotal / Math.max(1, scenario.requestedQty))),
      discount_amount: 0,
      line_total: Math.floor(scenario.quoteTotal / 2),
    },
    create: {
      id: quoteItemId,
      quote_id: quoteId,
      product_id: productId,
      product_variant_id: null,
      item_name: `AI Suggested ${productSlug.replace(/-/g, ' ')}`,
      description: 'Preset line item for deterministic AI quote walkthrough.',
      quantity: Math.max(25, Math.floor(scenario.requestedQty / 4)),
      unit_price: Math.max(18, Math.floor(scenario.quoteTotal / Math.max(1, scenario.requestedQty))),
      discount_amount: 0,
      line_total: Math.floor(scenario.quoteTotal / 2),
    },
  });

  const activityRows = [
    {
      key: `${scenario.key}:triage`,
      type: 'ai_lead_triage',
      title: 'Ai Sales Agent triaged lead',
      details: `Preset triage marked ${scenario.aiClassification}.`,
      metadata: {
        preset: DEMO_NAMESPACE,
        provider: 'deterministic',
        source: 'fallback',
        fallbackUsed: true,
        failureReason: 'Deterministic preset scenario',
        score: scenario.aiScore,
      },
      occurredAt: addDays(today, -2),
    },
    {
      key: `${scenario.key}:copilot`,
      type: 'ai_copilot_action',
      title: 'AI Copilot drafted follow-up',
      details: 'Preset copilot action generated a targeted follow-up.',
      metadata: {
        preset: DEMO_NAMESPACE,
        action: 'draft_reply',
        executed: true,
      },
      occurredAt: addDays(today, -1),
    },
    {
      key: `${scenario.key}:intelligence`,
      type: 'ai_lead_intelligence_action',
      title: 'AI intelligence action applied',
      details: 'Preset intelligence recommended and applied prioritization.',
      metadata: {
        preset: DEMO_NAMESPACE,
        action: 'prioritize',
        outcome: 'success',
      },
      occurredAt: addDays(today, -1),
    },
    {
      key: `${scenario.key}:pipeline`,
      type: 'ai_pipeline_insight',
      title: 'AI Pipeline Insight',
      details: 'Preset risk insight generated for this opportunity.',
      metadata: {
        preset: DEMO_NAMESPACE,
        data: {
          riskScore: scenario.aiScore > 75 ? 38 : 72,
          stalled: scenario.aiScore <= 75,
        },
      },
      occurredAt: addDays(today, 0),
    },
    {
      key: `${scenario.key}:pipeline-exec`,
      type: 'ai_pipeline_insight_execution',
      title: 'AI Pipeline Action: draft_followup',
      details: 'Preset execution applied recommended follow-up.',
      metadata: {
        preset: DEMO_NAMESPACE,
        action: 'draft_followup',
        source: 'pipeline_insights_panel',
      },
      occurredAt: addDays(today, 0),
    },
    {
      key: `${scenario.key}:sla`,
      type: 'ai_smart_routing_sla',
      title: 'AI Smart Routing + SLA',
      details: 'Preset SLA routing action executed.',
      metadata: {
        preset: DEMO_NAMESPACE,
        slaBucket: 'on_track',
        assignmentApplied: true,
      },
      occurredAt: addDays(today, 0),
    },
  ] as const;

  for (const row of activityRows) {
    await prisma.activities.upsert({
      where: { id: demoId('activity', row.key) },
      update: {
        user_id: ctx.userIds.salesManager,
        customer_id: customerId,
        lead_id: leadId,
        deal_id: dealId,
        quote_id: quoteId,
        activity_type: row.type,
        title: row.title,
        details: row.details,
        metadata: row.metadata,
        occurred_at: row.occurredAt,
      },
      create: {
        id: demoId('activity', row.key),
        user_id: ctx.userIds.salesManager,
        customer_id: customerId,
        lead_id: leadId,
        deal_id: dealId,
        quote_id: quoteId,
        activity_type: row.type,
        title: row.title,
        details: row.details,
        metadata: row.metadata,
        occurred_at: row.occurredAt,
      },
    });
  }

  await prisma.automation_runs.upsert({
    where: { id: demoId('automation_run', scenario.key) },
    update: {
      workflow_name: 'ai_followup_sequence',
      trigger_source: 'demo_preset',
      trigger_entity_type: 'lead',
      trigger_entity_id: leadId,
      status: scenario.aiScore > 75 ? 'success' : 'failed',
      request_payload: {
        preset: DEMO_NAMESPACE,
        leadId,
      },
      response_payload: {
        message:
          scenario.aiScore > 75
            ? 'Follow-up generated and queued.'
            : 'Manual review required before sending.',
      },
      error_message:
        scenario.aiScore > 75
          ? null
          : 'Pending approvals for low-confidence scenario in deterministic preset.',
      started_at: addDays(today, 0),
      finished_at: addDays(today, 0),
    },
    create: {
      id: demoId('automation_run', scenario.key),
      workflow_name: 'ai_followup_sequence',
      trigger_source: 'demo_preset',
      trigger_entity_type: 'lead',
      trigger_entity_id: leadId,
      status: scenario.aiScore > 75 ? 'success' : 'failed',
      request_payload: {
        preset: DEMO_NAMESPACE,
        leadId,
      },
      response_payload: {
        message:
          scenario.aiScore > 75
            ? 'Follow-up generated and queued.'
            : 'Manual review required before sending.',
      },
      error_message:
        scenario.aiScore > 75
          ? null
          : 'Pending approvals for low-confidence scenario in deterministic preset.',
      started_at: addDays(today, 0),
      finished_at: addDays(today, 0),
    },
  });
}

export async function seedAiHeavyDemoPreset() {
  const ctx = await resolveDemoContext();

  for (const scenario of DEMO_SCENARIOS) {
    await upsertScenario(scenario, ctx);
  }

  const fingerprint = await computeAiDemoFingerprint();
  return {
    namespace: DEMO_NAMESPACE,
    version: DEMO_VERSION,
    scenarios: DEMO_SCENARIOS.length,
    fingerprint,
  };
}

async function computeDeterministicSnapshot() {
  const leadIds = DEMO_SCENARIOS.map((scenario) => demoId('lead', scenario.key));
  const dealIds = DEMO_SCENARIOS.map((scenario) => demoId('deal', scenario.key));
  const quoteIds = DEMO_SCENARIOS.map((scenario) => demoId('quote', scenario.key));
  const customerIds = DEMO_SCENARIOS.map((scenario) => demoId('customer', scenario.key));
  const automationRunIds = DEMO_SCENARIOS.map((scenario) => demoId('automation_run', scenario.key));
  const activityIds = DEMO_SCENARIOS.flatMap((scenario) =>
    ['triage', 'copilot', 'intelligence', 'pipeline', 'pipeline-exec', 'sla'].map((suffix) =>
      demoId('activity', `${scenario.key}:${suffix}`)
    )
  );

  const [leadCount, dealCount, quoteCount, customerCount, activityRows, automationRuns] =
    await Promise.all([
      prisma.leads.count({ where: { id: { in: leadIds } } }),
      prisma.deals.count({ where: { id: { in: dealIds } } }),
      prisma.quotes.count({ where: { id: { in: quoteIds } } }),
      prisma.customers.count({ where: { id: { in: customerIds } } }),
      prisma.activities.findMany({
        where: { id: { in: activityIds } },
        select: { id: true, activity_type: true, occurred_at: true, metadata: true },
      }),
      prisma.automation_runs.findMany({
        where: { id: { in: automationRunIds } },
        select: { id: true, status: true },
      }),
    ]);

  const activityTypeCounts = activityRows.reduce<Record<string, number>>((acc, row) => {
    acc[row.activity_type] = (acc[row.activity_type] ?? 0) + 1;
    return acc;
  }, {});

  const acceptedSuggestions = activityRows.filter((row) => {
    if (row.activity_type === 'ai_lead_intelligence_action') {
      const meta = row.metadata as Record<string, unknown> | null;
      return meta?.outcome === 'success';
    }
    if (row.activity_type === 'ai_pipeline_insight_execution') {
      const meta = row.metadata as Record<string, unknown> | null;
      return !!meta;
    }
    return false;
  }).length;

  const riskAlertsResolved = activityRows.filter((row) => {
    if (row.activity_type !== 'ai_pipeline_insight_execution') return false;
    const meta = row.metadata as Record<string, unknown> | null;
    return !!meta;
  }).length;

  const timeSavedMinutes = activityRows.reduce((sum, row) => {
    const map: Record<string, number> = {
      ai_lead_triage: 8,
      ai_copilot_action: 6,
      ai_lead_intelligence_action: 5,
      ai_pipeline_insight: 4,
      ai_pipeline_insight_execution: 3,
      ai_smart_routing_sla: 4,
    };
    return sum + (map[row.activity_type] ?? 0);
  }, 0);

  return {
    namespace: DEMO_NAMESPACE,
    version: DEMO_VERSION,
    counts: {
      leads: leadCount,
      deals: dealCount,
      quotes: quoteCount,
      customers: customerCount,
      activities: activityRows.length,
      automationRuns: automationRuns.length,
    },
    keys: {
      leadIds: [...leadIds].sort(),
      dealIds: [...dealIds].sort(),
      quoteIds: [...quoteIds].sort(),
      activityIds: [...activityIds].sort(),
    },
    aggregates: {
      activityTypeCounts,
      acceptedSuggestions,
      riskAlertsResolved,
      timeSavedMinutes,
      automationStatuses: automationRuns
        .map((row) => `${row.id}:${row.status}`)
        .sort(),
    },
  };
}

export async function computeAiDemoFingerprint() {
  const snapshot = await computeDeterministicSnapshot();
  const payload = JSON.stringify(snapshot, Object.keys(snapshot).sort());
  return crypto.createHash('sha256').update(payload).digest('hex');
}

export async function verifyAiDemoDeterminism() {
  await seedAiHeavyDemoPreset();

  const before = await computeDeterministicSnapshot();
  const beforeFingerprint = crypto
    .createHash('sha256')
    .update(JSON.stringify(before))
    .digest('hex');

  await seedAiHeavyDemoPreset();

  const after = await computeDeterministicSnapshot();
  const afterFingerprint = crypto
    .createHash('sha256')
    .update(JSON.stringify(after))
    .digest('hex');

  if (beforeFingerprint !== afterFingerprint) {
    const debugDiff = {
      before: before.counts,
      after: after.counts,
      beforeFingerprint,
      afterFingerprint,
    };
    throw new Error(
      `AI demo determinism check failed: fingerprint drift detected. ${JSON.stringify(debugDiff)}`
    );
  }

  return {
    ok: true,
    namespace: DEMO_NAMESPACE,
    fingerprint: afterFingerprint,
    counts: after.counts,
    aggregates: after.aggregates,
  };
}
