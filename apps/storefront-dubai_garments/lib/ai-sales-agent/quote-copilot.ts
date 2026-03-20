import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import {
  QuoteCopilotSummarySchema,
  QuoteCopilotUpsellSchema,
} from './contracts';
import { runStructuredWithRuntime } from './llm-runtime';

type QuoteCopilotContext = {
  userId: string;
  role: string;
};

const QuoteCopilotGenerationSchema = z.object({
  summary: QuoteCopilotSummarySchema,
  upsellSuggestions: z.array(QuoteCopilotUpsellSchema),
});

type PriceTier = {
  minQty: number;
  maxQty: number | null;
  unitPrice: number;
};

function normalizeText(value: string | null | undefined) {
  return (value || '').trim();
}

function parseRequestedDiscountPct(texts: string[]): number | null {
  const text = texts.join(' ').toLowerCase();
  const match = text.match(/\b(\d{1,2})\s*%\s*(off|discount)?\b/);
  if (!match) return null;
  const value = Number(match[1]);
  if (!Number.isFinite(value)) return null;
  return Math.min(60, Math.max(0, value));
}

function parsePriceTiers(raw: unknown): PriceTier[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const row = item as Record<string, unknown>;
      const minQtyRaw = Number(row.min_qty ?? row.minQty ?? row.min);
      const maxQtyRaw = row.max_qty ?? row.maxQty ?? row.max;
      const unitRaw = Number(row.unit_price ?? row.unitPrice ?? row.unitPriceAED);
      if (!Number.isFinite(minQtyRaw) || !Number.isFinite(unitRaw)) return null;
      const max = maxQtyRaw == null ? null : Number(maxQtyRaw);
      return {
        minQty: minQtyRaw,
        maxQty: Number.isFinite(max) ? max : null,
        unitPrice: unitRaw,
      } as PriceTier;
    })
    .filter((item): item is PriceTier => !!item)
    .sort((a, b) => a.minQty - b.minQty);
}

function selectTierPrice(tiers: PriceTier[], qty: number | null): number | null {
  if (tiers.length === 0) return null;
  if (!qty || qty <= 0) return tiers[0].unitPrice;
  for (const tier of tiers) {
    if (qty >= tier.minQty && (tier.maxQty == null || qty <= tier.maxQty)) {
      return tier.unitPrice;
    }
  }
  return tiers[tiers.length - 1]?.unitPrice ?? null;
}

function toNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function runQuoteCopilot(input: {
  leadId: string;
  dealId?: string;
  quoteId?: string;
  acceptedRecommendations: Array<{
    productId: string | null;
    productName: string;
    suggestedQuantity: number | null;
    suggestedVariant: string | null;
  }>;
  dryRun?: boolean;
  context: QuoteCopilotContext;
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

  const acceptedCount = input.acceptedRecommendations.length;
  const acceptedItems = input.acceptedRecommendations.map((item) => item.productName);
  const generationMode = acceptedCount > 0 ? 'selected_recommendations' as const : 'lead_context_only' as const;

  const buildFallbackGeneration = () => {
    const canProceed = acceptedCount > 0;
    return {
      summary: {
        summaryTitle: acceptedCount > 0
          ? 'Quote-ready recommendation summary'
          : 'Quote context summary',
        summaryText:
          acceptedCount > 0
            ? `Prepared quote guidance for ${acceptedCount} accepted recommendation(s) for ${lead.company_name || lead.contact_name || 'this lead'}.`
            : `Prepared quote guidance from lead/deal context for ${lead.company_name || lead.contact_name || 'this lead'} without selected recommendation lines.`,
        acceptedCount,
        acceptedItems,
        generationMode,
        canProceed,
        suggestedNextAction: canProceed
          ? 'Review quote summary and proceed to quote preparation.'
          : 'Optionally select recommendation lines, then regenerate for a line-item grounded quote summary.',
      },
      upsellSuggestions: [
        {
          title: 'Premium variant upgrade',
          type: 'upsell' as const,
          rationale:
            'Offer a higher-value option when the customer is already evaluating a core item.',
        },
        {
          title: 'Complementary add-on item',
          type: 'cross_sell' as const,
          rationale:
            'Bundle a related accessory or add-on to increase total quote value.',
        },
      ],
    };
  };

  const runtimeResult = await runStructuredWithRuntime({
    feature: 'quote_copilot_summary',
    systemPrompt:
      'You are an AI quote copilot assistant. Generate a structured quote summary and upsell/cross-sell suggestions.',
    userInput: JSON.stringify({
      leadId: input.leadId,
      dealId: input.dealId ?? null,
      quoteId: input.quoteId ?? null,
      acceptedCount,
      acceptedItems,
      generationMode,
      companyName: lead.company_name ?? null,
      contactName: lead.contact_name ?? null,
      leadNotes: lead.notes ?? null,
      dealNotes: deal?.notes ?? null,
      quoteNotes: quote?.notes ?? null,
      acceptedRecommendations: input.acceptedRecommendations,
    }),
    schemaLabel: 'QuoteCopilotGeneration',
    schemaHint:
      '{"summary":{"summaryTitle":"string","summaryText":"string","acceptedCount":0,"acceptedItems":["string"],"generationMode":"selected_recommendations|lead_context_only","canProceed":true,"suggestedNextAction":"string"},"upsellSuggestions":[{"title":"string","type":"upsell|cross_sell","rationale":"string"}]}',
    outputSchema: QuoteCopilotGenerationSchema,
    fallbackReasonPrefix: 'QuoteCopilot:',
    fallback: buildFallbackGeneration,
  });

  const source = runtimeResult.source;
  const provider = runtimeResult.provider;
  const fallbackUsed = runtimeResult.fallbackUsed;
  const failureReason = runtimeResult.failureReason;
  const summary = runtimeResult.data.summary;
  const upsellSuggestions = runtimeResult.data.upsellSuggestions;

  const requestedDiscountPct = parseRequestedDiscountPct([
    normalizeText(lead.notes),
    normalizeText(deal?.notes),
    normalizeText(quote?.notes),
  ]);

  const productIds = input.acceptedRecommendations
    .map((item) => item.productId)
    .filter((id): id is string => !!id);

  const products = productIds.length
    ? await prisma.product.findMany({
        where: { id: { in: productIds } },
        select: {
          id: true,
          minOrderQty: true,
          priceTiers: true,
        },
      })
    : [];

  const productsById = new Map(products.map((p) => [p.id, p]));
  const pricingRiskHints: string[] = [];
  let estimatedSubtotalAED = 0;

  for (const item of input.acceptedRecommendations) {
    if (!item.productId) {
      pricingRiskHints.push(`No catalog ID found for "${item.productName}", so pricing precision is limited.`);
      continue;
    }
    const product = productsById.get(item.productId);
    if (!product) {
      pricingRiskHints.push(`Product "${item.productName}" could not be resolved in catalog.`);
      continue;
    }

    const qty = toNumber(item.suggestedQuantity);
    if (qty && qty < product.minOrderQty) {
      pricingRiskHints.push(
        `"${item.productName}" quantity (${qty}) is below MOQ (${product.minOrderQty}).`,
      );
    }
    if (!qty) {
      pricingRiskHints.push(`"${item.productName}" has no quantity, so subtotal is estimated conservatively.`);
      continue;
    }

    const tiers = parsePriceTiers(product.priceTiers);
    const tierUnit = selectTierPrice(tiers, qty);
    if (!tierUnit) {
      pricingRiskHints.push(`"${item.productName}" has no valid price tier data.`);
      continue;
    }
    const discountedUnit =
      requestedDiscountPct != null ? tierUnit * (1 - requestedDiscountPct / 100) : tierUnit;
    estimatedSubtotalAED += discountedUnit * qty;
  }

  const maxSafeDiscountPct = acceptedCount > 0 ? 12 : 8;
  const suggestedDiscountPct =
    requestedDiscountPct != null
      ? Math.min(requestedDiscountPct, maxSafeDiscountPct)
      : acceptedCount > 1
      ? 6
      : 4;
  const estimatedGrossMarginPct =
    requestedDiscountPct != null
      ? Math.max(8, Math.round(34 - requestedDiscountPct * 1.8))
      : 32;

  const marginSafetyStatus =
    estimatedGrossMarginPct >= 24 ? 'safe' : estimatedGrossMarginPct >= 16 ? 'watch' : 'risk';
  const marginGuidance =
    marginSafetyStatus === 'safe'
      ? 'Margin profile looks healthy for this quote configuration.'
      : marginSafetyStatus === 'watch'
      ? 'Margin is tightening. Keep discounts controlled and validate costs before sending.'
      : 'Margin risk is high. Revisit discount level or product mix before final quote.';

  if (requestedDiscountPct != null && requestedDiscountPct > maxSafeDiscountPct) {
    pricingRiskHints.push(
      `Requested discount ${requestedDiscountPct}% is above recommended safe limit ${maxSafeDiscountPct}%.`,
    );
  }
  if (pricingRiskHints.length === 0) {
    pricingRiskHints.push('No immediate pricing risks detected for current inputs.');
  }

  if (!input.dryRun) {
    await prisma.activities.create({
      data: {
        user_id: input.context.userId,
        lead_id: input.leadId,
        activity_type: 'ai_quote_copilot',
        title: 'AI Quote Copilot summary generated',
        details: `Generated quote copilot summary from ${acceptedCount} accepted recommendation(s).`,
        metadata: {
          source,
          provider,
          fallbackUsed,
          failureReason,
          acceptedCount,
          acceptedItems,
          generationMode,
          canProceed: summary.canProceed,
          suggestedNextAction: summary.suggestedNextAction,
          upsellSuggestions,
          quoteIntelligence: {
            estimatedSubtotalAED: estimatedSubtotalAED > 0 ? Number(estimatedSubtotalAED.toFixed(2)) : null,
            marginSafety: {
              status: marginSafetyStatus,
              estimatedGrossMarginPct,
              guidance: marginGuidance,
            },
            discountGuidance: {
              requestedDiscountPct,
              suggestedDiscountPct,
              maxSafeDiscountPct,
              reason:
                requestedDiscountPct != null
                  ? 'Discount guidance was tuned against requested discount signal from lead/deal context.'
                  : 'No explicit discount requested; using conservative default discount recommendation.',
            },
            pricingRiskHints,
          },
        },
      },
    });
  }

  return {
    leadId: input.leadId,
    dealId: input.dealId ?? null,
    quoteId: input.quoteId ?? null,
    source,
    provider,
    fallbackUsed,
    failureReason,
      dryRun: !!input.dryRun,
      data: {
      summary,
      upsellSuggestions,
      quoteIntelligence: {
        estimatedSubtotalAED: estimatedSubtotalAED > 0 ? Number(estimatedSubtotalAED.toFixed(2)) : null,
        marginSafety: {
          status: marginSafetyStatus,
          estimatedGrossMarginPct,
          guidance: marginGuidance,
        },
        discountGuidance: {
          requestedDiscountPct,
          suggestedDiscountPct,
          maxSafeDiscountPct,
          reason:
            requestedDiscountPct != null
              ? 'Discount guidance was tuned against requested discount signal from lead/deal context.'
              : 'No explicit discount requested; using conservative default discount recommendation.',
        },
        pricingRiskHints,
      },
    },
  };
}
