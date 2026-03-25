import { prisma } from '@/lib/prisma';
import { LeadTriageOutputSchema, type LeadTriageOutput } from '@/lib/ai-sales-agent/contracts';
import { runStructuredWithRuntime } from '@/lib/ai-sales-agent/llm-runtime';

type TriageTenantContext = {
  userId?: string | null;
  role: string;
  requestId?: string;
};

function normalizeText(value: string | null | undefined) {
  return (value || '').trim();
}

function extractQuantity(text: string): number | null {
  const qtyMatch = text.match(/\b(\d{1,5})\s*(pcs|pieces|units|qty|quantity)?\b/i);
  if (!qtyMatch) return null;
  const parsed = Number(qtyMatch[1]);
  return Number.isFinite(parsed) ? parsed : null;
}

function inferIntent(text: string): LeadTriageOutput['intent'] {
  const t = text.toLowerCase();

  if (t.includes('quote') || t.includes('quotation') || t.includes('price')) {
    return 'quotation_request';
  }

  if (t.includes('bulk') || t.includes('moq') || t.includes('minimum order')) {
    return 'bulk_order';
  }

  if (t.includes('follow up') || t.includes('follow-up') || t.includes('update')) {
    return 'followup_request';
  }

  if (
    t.includes('product') ||
    t.includes('fabric') ||
    t.includes('size') ||
    t.includes('color') ||
    t.includes('branding')
  ) {
    return 'product_inquiry';
  }

  if (t.length > 0) {
    return 'general_sales';
  }

  return 'unknown';
}

function inferUrgency(text: string): LeadTriageOutput['urgency'] {
  const t = text.toLowerCase();

  if (
    t.includes('urgent') ||
    t.includes('asap') ||
    t.includes('today') ||
    t.includes('tomorrow') ||
    t.includes('immediately')
  ) {
    return 'high';
  }

  if (
    t.includes('soon') ||
    t.includes('this week') ||
    t.includes('next week')
  ) {
    return 'medium';
  }

  return 'low';
}

function inferComplexity(text: string, quantity: number | null): LeadTriageOutput['complexity'] {
  const t = text.toLowerCase();

  const complexitySignals = [
    'custom',
    'branding',
    'logo',
    'embroidery',
    'printing',
    'multiple sizes',
    'multiple colors',
    'urgent delivery',
    'sample',
  ];

  const signalCount = complexitySignals.filter((signal) => t.includes(signal)).length;

  if (signalCount >= 3 || (quantity !== null && quantity >= 500)) {
    return 'high';
  }

  if (signalCount >= 1 || (quantity !== null && quantity >= 100)) {
    return 'medium';
  }

  return 'low';
}

function computeConfidence(text: string, quantity: number | null): number {
  let score = 45;

  if (text.length > 40) score += 10;
  if (quantity !== null) score += 15;
  if (/quote|price|urgent|branding|logo|size|quantity/i.test(text)) score += 15;
  if (text.length > 120) score += 10;

  return Math.min(score, 95);
}

function cleanLeadNotesForSummary(notes: string | null): string | null {
  const raw = normalizeText(notes);
  if (!raw) return null;

  const withoutProductRef = raw.replace(
    /\bproduct:\s*[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi,
    ''
  );
  const withoutMessageLabel = withoutProductRef.replace(/\bmessage:\s*/gi, '');
  const primarySegment = withoutMessageLabel.split('|')[0]?.trim() || withoutMessageLabel;
  const collapsed = primarySegment.replace(/\s+/g, ' ').trim();

  return collapsed || null;
}

function isSyntheticContactOrCompany(value: string): boolean {
  const v = value.trim();
  if (!v) return false;
  return /^regression\s+\d+$/i.test(v) || /^qa-\d+$/i.test(v);
}

function buildContactSummary(contactName: string | null, companyName: string | null): string | null {
  const contact = normalizeText(contactName);
  const company = normalizeText(companyName);
  const contactLooksSynthetic = contact ? isSyntheticContactOrCompany(contact) : false;
  const companyLooksSynthetic = company ? isSyntheticContactOrCompany(company) : false;

  // Suppress QA/regression placeholders from generated test data in human-facing AI summary.
  if ((contactLooksSynthetic || !contact) && (companyLooksSynthetic || !company)) {
    return null;
  }

  if (contact && !contactLooksSynthetic) {
    return `Contact: ${contact}${company && !companyLooksSynthetic ? ` (${company})` : ''}.`;
  }

  if (company && !companyLooksSynthetic) {
    return `Company: ${company}.`;
  }

  return null;
}

function computeScore(params: {
  urgency: LeadTriageOutput['urgency'];
  complexity: LeadTriageOutput['complexity'];
  quantity: number | null;
  intent: LeadTriageOutput['intent'];
  confidence: number;
}): number {
  let score = 30;

  if (params.urgency === 'high') score += 20;
  if (params.urgency === 'medium') score += 10;

  if (params.intent === 'quotation_request') score += 20;
  if (params.intent === 'bulk_order') score += 18;
  if (params.intent === 'product_inquiry') score += 10;

  if (params.quantity !== null && params.quantity >= 300) score += 15;
  else if (params.quantity !== null && params.quantity >= 100) score += 10;
  else if (params.quantity !== null && params.quantity >= 20) score += 5;

  if (params.complexity === 'high') score += 5;
  if (params.confidence >= 80) score += 8;
  else if (params.confidence >= 65) score += 4;

  return Math.max(0, Math.min(score, 100));
}

function classifyLead(score: number): LeadTriageOutput['classification'] {
  if (score >= 75) return 'hot';
  if (score >= 50) return 'warm';
  return 'cold';
}

function toDbClassification(classification: LeadTriageOutput['classification']): 'HOT' | 'WARM' | 'COLD' {
  if (classification === 'hot') return 'HOT';
  if (classification === 'warm') return 'WARM';
  return 'COLD';
}

function toDbProvider(provider: string): 'openai' | 'system' {
  return provider.toLowerCase() === 'openai' ? 'openai' : 'system';
}

function buildNextBestAction(output: Omit<LeadTriageOutput, 'nextBestAction'>): string {
  if (output.classification === 'hot' && output.intent === 'quotation_request') {
    return 'Prepare and send a quote quickly, then follow up for blockers.';
  }

  if (output.intent === 'bulk_order') {
    return 'Confirm quantity, branding requirements, and delivery timeline before quote.';
  }

  if (output.intent === 'product_inquiry') {
    return 'Ask for missing product preferences such as size, color, branding, and quantity.';
  }

  if (output.urgency === 'high') {
    return 'Send a fast first response and prioritize manual review immediately.';
  }

  return 'Send a professional first reply and collect missing commercial details.';
}

function buildSummary(lead: {
  notes: string | null;
  company_name: string | null;
  contact_name: string | null;
  ai_product: string | null;
  requested_qty: number | null;
  timeline_date: Date | null;
}, quantity: number | null, intent: LeadTriageOutput['intent']) {
  const intentText = intent.replace(/_/g, ' ');
  const timeline = lead.timeline_date
    ? new Date(lead.timeline_date).toISOString().slice(0, 10)
    : null;

  const notes = cleanLeadNotesForSummary(lead.notes);
  const notesPreview = notes
    ? (notes.length > 120 ? `${notes.slice(0, 117)}...` : notes)
    : null;

  const productSignal = normalizeText(lead.ai_product);
  const isUuidLike = productSignal
    ? /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(productSignal)
    : false;

  const parts = [
    `Intent: ${intentText}.`,
    buildContactSummary(lead.contact_name, lead.company_name),
    quantity !== null ? `Quantity: ${quantity} units.` : null,
    timeline ? `Timeline: ${timeline}.` : null,
    productSignal && !isUuidLike ? `Product signal: ${productSignal}.` : null,
    notesPreview ? `Request: ${notesPreview}.` : null,
  ].filter(Boolean);

  return parts.join(' ');
}

export async function runLeadTriage(
  leadId: string,
  context: TriageTenantContext,
  dryRun = false
): Promise<{
  source: 'model' | 'fallback';
  provider: string;
  model: string;
  fallbackUsed: boolean;
  schemaValid: boolean;
  processingMs: number;
  failureReason: string | null;
  persisted: boolean;
  data: LeadTriageOutput;
}> {
  const lead = await prisma.leads.findFirst({
    where:
      context.role === 'sales_rep'
        ? {
            id: leadId,
            assigned_to_user_id: context.userId ?? '',
          }
        : {
            id: leadId,
          },
  });

  if (!lead) {
    throw new Error('Lead not found or not accessible.');
  }

  const sourceText = [
    normalizeText(lead.notes),
    normalizeText(lead.company_name),
    normalizeText(lead.contact_name),
    normalizeText(lead.email),
    normalizeText(lead.ai_product),
  ]
    .filter(Boolean)
    .join(' | ');

  const buildFallback = (): LeadTriageOutput => {
    const quantity = extractQuantity(sourceText);
    const intent = inferIntent(sourceText);
    const urgency = inferUrgency(sourceText);
    const complexity = inferComplexity(sourceText, quantity);
    const confidence = computeConfidence(sourceText, quantity);
    const score = computeScore({
      urgency,
      complexity,
      quantity,
      intent,
      confidence,
    });
    const classification = classifyLead(score);

    const partial: Omit<LeadTriageOutput, 'nextBestAction'> = {
      summary: buildSummary(lead, quantity, intent),
      intent,
      urgency,
      complexity,
      quantity,
      confidence,
      score,
      classification,
    };

    return {
      ...partial,
      nextBestAction: buildNextBestAction(partial),
    };
  };

  const runtimeResult = await runStructuredWithRuntime({
    requestId: context.requestId,
    feature: 'lead_triage',
    systemPrompt:
      'You are an AI lead triage assistant for B2B sales. Classify lead intent, urgency, complexity, confidence, score, classification, and next best action.',
    userInput: JSON.stringify({
      leadId,
      notes: normalizeText(lead.notes),
      companyName: normalizeText(lead.company_name),
      contactName: normalizeText(lead.contact_name),
      email: normalizeText(lead.email),
      aiProduct: normalizeText(lead.ai_product),
      requestedQty: lead.requested_qty,
      timelineDate: lead.timeline_date,
    }),
    schemaLabel: 'LeadTriageOutput',
    schemaHint:
      '{"summary":"string","intent":"quotation_request|product_inquiry|bulk_order|followup_request|general_sales|unknown","urgency":"high|medium|low","complexity":"high|medium|low","quantity":0|null,"confidence":0,"score":0,"classification":"hot|warm|cold","nextBestAction":"string"}',
    outputSchema: LeadTriageOutputSchema,
    fallbackReasonPrefix: 'LeadTriage:',
    fallback: buildFallback,
  });

  const data: LeadTriageOutput = runtimeResult.data;
  const source = runtimeResult.source;
  const provider = runtimeResult.provider;
  const model = runtimeResult.model;
  const fallbackUsed = runtimeResult.fallbackUsed;
  const schemaValid = runtimeResult.schemaValid;
  const processingMs = runtimeResult.processingMs;
  const failureReason = runtimeResult.failureReason;

  if (dryRun) {
    return {
        source,
        provider,
        model,
        fallbackUsed,
        schemaValid,
        processingMs,
        failureReason,
        persisted: false,
        data,
    };
  }

  await prisma.leads.update({
    where: { id: leadId },
    data: {
    ai_processed_at: new Date(),
    ai_quantity: data.quantity,
    ai_urgency: data.urgency,
    ai_complexity: data.complexity,
    ai_provider: toDbProvider(provider),
    ai_fallback_used: fallbackUsed,
    ai_score: data.score,
    ai_classification: toDbClassification(data.classification),
    ai_reasoning: {
            summary: data.summary,
            intent: data.intent,
            urgency: data.urgency,
            complexity: data.complexity,
            quantity: data.quantity,
            confidence: data.confidence,
            score: data.score,
            classification: data.classification,
            nextBestAction: data.nextBestAction,
            provider,
            source,
            fallbackUsed,
            failureReason,
            processedAt: new Date().toISOString(),
        },
    },
  });

  await prisma.activities.create({
    data: {
      user_id: context.userId ?? null,
      lead_id: leadId,
      activity_type: 'ai_lead_triage',
      title: 'Ai Sales Agent triaged lead',
      details: `Lead classified as ${data.classification} with score ${data.score}.`,
      metadata: {
        triage: data,
        source,
        provider,
        fallbackUsed,
        failureReason,
        dryRun,
        },
    },
  });

  return {
    source,
    provider,
    model,
    fallbackUsed,
    schemaValid,
    processingMs,
    failureReason,
    persisted: true,
    data,
    };
}
