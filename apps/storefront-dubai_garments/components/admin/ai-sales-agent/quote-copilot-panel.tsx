'use client';

import { useState } from 'react';
import { Button, Card, CardText, CardTitle } from '@/components/ui';
import QuoteRecommendationPanel from './quote-recommendation-panel';
import { runQuoteCopilot } from '@/features/admin/ai-sales-agent/api';
import type {
  QuoteCopilotEnvelope,
  QuoteRecommendationEnvelope,
  QuoteRecommendationItem,
  QuoteCopilotUpsell,
} from '@/features/admin/ai-sales-agent/types';

export default function QuoteCopilotPanel() {
  const [recommendation, setRecommendation] = useState<QuoteRecommendationEnvelope | null>(null);
  const [accepted, setAccepted] = useState<Record<number, boolean>>({});
  const [copilotLoading, setCopilotLoading] = useState(false);
  const [copilotError, setCopilotError] = useState<string | null>(null);
  const [copilotResponse, setCopilotResponse] = useState<QuoteCopilotEnvelope | null>(null);

  function toggleAccepted(index: number) {
    setAccepted((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  }

  async function handleGenerateSummary() {
    if (!recommendation?.ok) {
      setCopilotError('Run Quote Recommendation first.');
      return;
    }

    const acceptedRecommendations = recommendation.data.recommendations
      .filter((_: QuoteRecommendationItem, index: number) => !!accepted[index])
      .map((item: QuoteRecommendationItem) => ({
        productId: item.productId,
        productName: item.productName,
        suggestedQuantity: item.suggestedQuantity,
        suggestedVariant: item.suggestedVariant,
      }));

    try {
      setCopilotError(null);
      setCopilotLoading(true);

      const result = await runQuoteCopilot({
        leadId: recommendation.leadId,
        dealId: recommendation.dealId || undefined,
        quoteId: recommendation.quoteId || undefined,
        acceptedRecommendations,
        dry_run: true,
      });

      setCopilotResponse(result);
    } catch (err) {
      setCopilotError(err instanceof Error ? err.message : 'Failed to generate quote summary.');
      setCopilotResponse(null);
    } finally {
      setCopilotLoading(false);
    }
  }

  function acceptAll() {
    if (!recommendation?.ok) return;
    const next: Record<number, boolean> = {};
    recommendation.data.recommendations.forEach((_, index) => {
      next[index] = true;
    });
    setAccepted(next);
  }

  function clearAccepted() {
    setAccepted({});
  }

  const selectedCount = recommendation?.ok
    ? recommendation.data.recommendations.filter((_, index) => !!accepted[index]).length
    : 0;

  return (
    <div className="qcop-scope qcop-stack">
      <QuoteRecommendationPanel onRecommendationLoaded={setRecommendation} />

      {recommendation?.ok ? (
        <Card
          className="qcop-card qcop-acceptance"
          data-testid="quote-copilot-acceptance-card"
        >
          <CardTitle>Recommendation Acceptance</CardTitle>
          <CardText className="qcop-muted">
            Optional: accept recommendation lines to ground quote summary generation in specific products.
          </CardText>

          <div className="qcop-toolbar">
            <div className="qcop-pill">
              Selected <strong>{selectedCount}</strong> / {recommendation.data.recommendations.length}
            </div>
            <div className="qcop-toolbar-actions">
              <Button type="button" variant="secondary" onClick={acceptAll}>
                Accept All
              </Button>
              <Button type="button" variant="secondary" onClick={clearAccepted}>
                Clear
              </Button>
            </div>
          </div>

          <div className="qcop-grid">
            {recommendation.data.recommendations.map((item: QuoteRecommendationItem, index: number) => (
              <label
                key={`${item.productId || item.productName}-${index}`}
                className="qcop-item"
              >
                <input
                  type="checkbox"
                  checked={!!accepted[index]}
                  onChange={() => toggleAccepted(index)}
                />
                <div className="qcop-item-content">
                  <div className="qcop-item-title">{item.productName}</div>
                  <div className="qcop-item-meta">
                    Qty: {item.suggestedQuantity ?? 'n/a'} · Variant: {item.suggestedVariant ?? 'n/a'}
                  </div>
                  <div className="qcop-item-rationale">{item.rationale}</div>
                </div>
              </label>
            ))}
          </div>

          <div className="qcop-actions">
            <Button type="button" onClick={handleGenerateSummary} disabled={copilotLoading}>
              {copilotLoading ? 'Generating...' : 'Generate Quote Copilot Summary'}
            </Button>
          </div>
        </Card>
      ) : null}

      {copilotError ? (
        <Card className="qcop-card qcop-card-error" data-testid="quote-copilot-error-card">
          <CardTitle>Quote Copilot Error</CardTitle>
          <CardText>{copilotError}</CardText>
        </Card>
      ) : null}

      {copilotResponse?.ok ? (
        <>
          <Card className="qcop-card" data-testid="quote-copilot-summary-card">
            <CardTitle>Quote Copilot Output</CardTitle>
            <CardText className="qcop-muted">
              {copilotResponse.data.summary.generationMode === 'selected_recommendations'
                ? 'Generated from selected recommendation lines.'
                : 'Generated from lead/deal context only.'}
            </CardText>
            <CardTitle>{copilotResponse.data.summary.summaryTitle}</CardTitle>
            <CardText>{copilotResponse.data.summary.summaryText}</CardText>

            <div className="qcop-badges">
              <span className="dg-ai-badge dg-ai-badge-slate">
                Accepted: {copilotResponse.data.summary.acceptedCount}
              </span>
              {copilotResponse.data.summary.generationMode === 'lead_context_only' ? (
                <span className="dg-ai-badge dg-ai-badge-amber">No Recommendation</span>
              ) : null}
              <span className="dg-ai-badge dg-ai-badge-green">
                Source: {copilotResponse.data.summary.generationMode === 'selected_recommendations'
                  ? 'Selected Recommendations'
                  : 'Lead/Deal Context'}
              </span>
              <span className={`dg-ai-badge ${copilotResponse.data.summary.canProceed ? 'dg-ai-badge-green' : 'dg-ai-badge-amber'}`}>
                {copilotResponse.data.summary.canProceed ? 'Quote Ready' : 'Needs Review'}
              </span>
            </div>

            {copilotResponse.data.summary.acceptedItems.length > 0 ? (
              <div className="qcop-next-action">
                Included lines: {copilotResponse.data.summary.acceptedItems.join(', ')}
              </div>
            ) : null}

            <div className="qcop-next-action">
              Next action: {copilotResponse.data.summary.suggestedNextAction}
            </div>
          </Card>

          <Card className="qcop-card" data-testid="quote-copilot-upsell-card">
            <CardTitle>Upsell / Cross-sell Suggestions</CardTitle>
            <div className="qcop-upsell-grid">
              {copilotResponse.data.upsellSuggestions.map((item: QuoteCopilotUpsell, index: number) => (
                <article key={`${item.title}-${index}`} className="qcop-upsell-item">
                  <div className="qcop-upsell-title">
                    {item.title}
                    <span className="qcop-upsell-type">
                      {item.type === 'cross_sell' ? 'Cross-sell' : 'Upsell'}
                    </span>
                  </div>
                  <div className="qcop-upsell-rationale">{item.rationale}</div>
                </article>
              ))}
            </div>
          </Card>
        </>
      ) : null}
    </div>
  );
}
