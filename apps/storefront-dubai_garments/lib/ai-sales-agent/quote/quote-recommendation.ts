import { prisma } from '@/lib/prisma';
import { QuoteRecommendationPayloadSchema } from '@/lib/ai-sales-agent/contracts';
import { runStructuredWithRuntime } from '@/lib/ai-sales-agent/llm-runtime';
import { getAiModelConfig } from '@/lib/ai-sales-agent/model-config';

type QuoteRecommendationContext = {
  userId: string;
  role: string;
  requestId?: string;
};

function normalizeText(value: string | null | undefined) {
  return (value || '').trim();
}

function parseRequestedQuantity(texts: string[]): number | null {
  const text = texts.join(' ');
  const match = text.match(/\b(\d{1,5})\s*(pcs|pieces|units|qty|quantity)?\b/i);
  if (!match) return null;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : null;
}

function detectVariant(texts: string[]): string | null {
  const text = texts.join(' ').toLowerCase();

  if (text.includes('small')) return 'small';
  if (text.includes('medium')) return 'medium';
  if (text.includes('large')) return 'large';
  if (text.includes('xl')) return 'xl';
  if (text.includes('xxl')) return 'xxl';

  return null;
}

function buildMissingData(params: {
  quantity: number | null;
  variant: string | null;
  lead: {
    company_name?: string | null;
    contact_name?: string | null;
  } | null;
}): Array<{ field: string; reason: string }> {
  const missing: Array<{ field: string; reason: string }> = [];

  if (!params.quantity) {
    missing.push({
      field: 'quantity',
      reason: 'No clear quantity was detected from lead/deal/quote context.',
    });
  }

  if (!params.variant) {
    missing.push({
      field: 'variant',
      reason: 'No clear size or variant preference was detected.',
    });
  }

  if (!normalizeText(params.lead?.company_name) && !normalizeText(params.lead?.contact_name)) {
    missing.push({
      field: 'contact_context',
      reason: 'Lead identity context is weak, so quote targeting may be inaccurate.',
    });
  }

  return missing;
}

export async function runQuoteRecommendation(input: {
  leadId: string;
  dealId?: string;
  quoteId?: string;
  context: QuoteRecommendationContext;
}) {
  const lead = await prisma.leads.findFirst({
    where:
      input.context.role === 'sales_rep'
        ? { id: input.leadId, assigned_to_user_id: input.context.userId }
        : { id: input.leadId },
  });

  if (!lead) {
    throw new Error('Lead not found or not accessible.');
  }

  const deal = input.dealId
    ? await prisma.deals.findFirst({
        where:
          input.context.role === 'sales_rep'
            ? { id: input.dealId, owner_user_id: input.context.userId }
            : { id: input.dealId },
      })
    : null;

  const quote = input.quoteId
    ? await prisma.quotes.findFirst({
        where: { id: input.quoteId },
      })
    : null;

  const products = await prisma.product.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
  });

  const contextTexts = [
    normalizeText(lead.company_name),
    normalizeText(lead.contact_name),
    normalizeText(lead.notes),
    normalizeText(lead.ai_product),
    normalizeText(deal?.notes),
    normalizeText(quote?.notes),
  ].filter(Boolean);

  const quantity = parseRequestedQuantity(contextTexts);
  const variant = detectVariant(contextTexts);

  const buildFallback = () => {
    const recommendations = products
      .slice(0, 3)
      .map((product: { id: string; name: string }) => ({
        productId: product.id,
        productName: product.name,
        suggestedQuantity: quantity,
        suggestedVariant: variant,
        rationale: `Recommended from available catalog context and lead notes for ${product.name}.`,
      }));

    const missingData = buildMissingData({
      quantity,
      variant,
      lead,
    });

    const canCreateQuote = missingData.length === 0;

    return {
      summary: canCreateQuote
        ? 'Enough information is available to prepare a quote recommendation.'
        : 'Important quote inputs are still missing.',
      recommendations,
      missingData,
      canCreateQuote,
      suggestedNextAction: canCreateQuote
        ? 'Prepare quote draft from recommended product and quantity.'
        : 'Collect missing quantity/variant details before creating quote.',
      confidence: canCreateQuote ? 78 : 61,
    };
  };
  const { config } = await getAiModelConfig();

  const runtimeResult = await runStructuredWithRuntime({
    requestId: input.context.requestId,
    feature: 'quote_recommendation',
    systemPrompt: `${config.prompts.quoteCopilotSystem}
Task: Produce product suggestions, missing-data checks, and quote readiness output as structured JSON.`,
    userInput: JSON.stringify({
      leadId: input.leadId,
      dealId: input.dealId ?? null,
      quoteId: input.quoteId ?? null,
      lead: {
        companyName: normalizeText(lead.company_name),
        contactName: normalizeText(lead.contact_name),
        notes: normalizeText(lead.notes),
        aiProduct: normalizeText(lead.ai_product),
      },
      dealNotes: normalizeText(deal?.notes),
      quoteNotes: normalizeText(quote?.notes),
      catalogProducts: products.slice(0, 5).map((product) => ({
        productId: product.id,
        productName: product.name,
      })),
      parsedSignals: {
        quantity,
        variant,
      },
    }),
    schemaLabel: 'QuoteRecommendationPayload',
    schemaHint:
      '{"summary":"string","recommendations":[{"productId":"uuid|null","productName":"string","suggestedQuantity":0|null,"suggestedVariant":"string|null","rationale":"string"}],"missingData":[{"field":"string","reason":"string"}],"canCreateQuote":true,"suggestedNextAction":"string","confidence":0}',
    outputSchema: QuoteRecommendationPayloadSchema,
    fallbackReasonPrefix: 'QuoteRecommendation:',
    fallback: buildFallback,
  });

  const source = runtimeResult.source;
  const provider = runtimeResult.provider;
  const model = runtimeResult.model;
  const fallbackUsed = runtimeResult.fallbackUsed;
  const schemaValid = runtimeResult.schemaValid;
  const processingMs = runtimeResult.processingMs;
  const failureReason = runtimeResult.failureReason;
  const data = runtimeResult.data;

  return {
    source,
    provider,
    model,
    fallbackUsed,
    schemaValid,
    processingMs,
    failureReason,
    leadId: input.leadId,
    dealId: input.dealId ?? null,
    quoteId: input.quoteId ?? null,
    data,
  };
}
