import { prisma } from '@/lib/prisma';

type QuoteRecommendationContext = {
  userId: string;
  role: string;
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
  lead: any;
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
  dryRun?: boolean;
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

  const recommendations = products.slice(0, 3).map((product: { id: string; name: string }) => ({
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

  const data = {
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

  const source: 'model' | 'fallback' = 'fallback';
  const provider = 'deterministic';
  const fallbackUsed = true;
  const failureReason = 'Quote Recommendation is currently using deterministic catalog matching.';

  return {
    source,
    provider,
    fallbackUsed,
    failureReason,
    dryRun: !!input.dryRun,
    leadId: input.leadId,
    dealId: input.dealId ?? null,
    quoteId: input.quoteId ?? null,
    data,
  };
}
