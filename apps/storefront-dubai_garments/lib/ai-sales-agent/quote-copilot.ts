import { prisma } from '@/lib/prisma';

type QuoteCopilotContext = {
  userId: string;
  role: string;
};

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

  const summaryTitle = acceptedCount > 0
    ? 'Quote-ready recommendation summary'
    : 'Quote context summary';

  const summaryText =
    acceptedCount > 0
      ? `Prepared quote guidance for ${acceptedCount} accepted recommendation(s) for ${lead.company_name || lead.contact_name || 'this lead'}.`
      : `Prepared quote guidance from lead/deal context for ${lead.company_name || lead.contact_name || 'this lead'} without selected recommendation lines.`;

  const canProceed = acceptedCount > 0;

  const suggestedNextAction = canProceed
    ? 'Review quote summary and proceed to quote preparation.'
    : 'Optionally select recommendation lines, then regenerate for a line-item grounded quote summary.';

  const upsellSuggestions = [
    {
      title: 'Premium variant upgrade',
      type: 'upsell' as const,
      rationale: 'Offer a higher-value option when the customer is already evaluating a core item.',
    },
    {
      title: 'Complementary add-on item',
      type: 'cross_sell' as const,
      rationale: 'Bundle a related accessory or add-on to increase total quote value.',
    },
  ];

  const source: 'model' | 'fallback' = 'fallback';
  const provider = 'deterministic';
  const fallbackUsed = true;
  const failureReason = 'Quote Copilot is currently using deterministic quote summary generation.';

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
          canProceed,
          suggestedNextAction,
          upsellSuggestions,
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
      summary: {
        summaryTitle,
        summaryText,
        acceptedCount,
        acceptedItems,
        generationMode,
        canProceed,
        suggestedNextAction,
      },
      upsellSuggestions,
    },
  };
}
