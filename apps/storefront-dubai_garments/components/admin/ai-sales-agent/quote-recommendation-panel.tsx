'use client';

import { useState } from 'react';
import { Button, Card, CardText, CardTitle, TextField } from '@/components/ui';
import { runQuoteRecommendation } from '@/features/admin/ai-sales-agent/api';
import type {
  QuoteRecommendationEnvelope,
  QuoteRecommendationItem,
  QuoteRecommendationMissingField,
} from '@/features/admin/ai-sales-agent/types';
import { AisFieldLabel } from './reusable';

type QuoteRecommendationPanelProps = {
  onRecommendationLoaded?: (payload: QuoteRecommendationEnvelope) => void;
};

export default function QuoteRecommendationPanel({
  onRecommendationLoaded,
}: QuoteRecommendationPanelProps) {
  const [leadId, setLeadId] = useState('');
  const [dealId, setDealId] = useState('');
  const [quoteId, setQuoteId] = useState('');
  const [dryRun, setDryRun] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<QuoteRecommendationEnvelope | null>(null);

  function fieldLabel(field: string) {
    if (field === 'quantity') return 'Quantity';
    if (field === 'variant') return 'Variant';
    if (field === 'contact_context') return 'Contact Context';
    return field;
  }

  async function handleRun() {
    if (!leadId.trim()) {
      setResponse(null);
      setError('Insert Lead ID.');
      return;
    }

    try {
      setError(null);
      setLoading(true);

      const result = await runQuoteRecommendation({
        leadId: leadId.trim(),
        dealId: dealId.trim() || undefined,
        quoteId: quoteId.trim() || undefined,
        dry_run: dryRun,
      });

      setResponse(result);
      onRecommendationLoaded?.(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run quote recommendation.');
      setResponse(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="qrec-scope qrec-stack" data-testid="quote-recommendation-panel">
      <div className="qrec-composer" data-testid="quote-recommendation-input-card">
        <p className="qrec-kicker">Quote Query</p>
        <p className="qrec-subtitle">
          Generate product, quantity, and variant recommendations from lead, deal, and quote context.
        </p>

        <div className="qrec-grid">
          <div>
            <AisFieldLabel>Lead ID</AisFieldLabel>
            <TextField
              value={leadId}
              onChange={(event) => setLeadId(event.target.value)}
              placeholder="Lead UUID"
              className="qrec-input"
              data-testid="quote-recommendation-lead-id-input"
            />
          </div>

          <div>
            <AisFieldLabel>Deal ID</AisFieldLabel>
            <TextField
              value={dealId}
              onChange={(event) => setDealId(event.target.value)}
              placeholder="Optional Deal UUID"
              className="qrec-input"
            />
          </div>

          <div>
            <AisFieldLabel>Quote ID</AisFieldLabel>
            <TextField
              value={quoteId}
              onChange={(event) => setQuoteId(event.target.value)}
              placeholder="Optional Quote UUID"
              className="qrec-input"
            />
          </div>
        </div>

        <div className="qrec-actions">
          <label className="dg-flex dg-items-center dg-gap-2 dg-text-sm">
            <input
              type="checkbox"
              checked={dryRun}
              onChange={(event) => setDryRun(event.target.checked)}
            />
            Dry run
          </label>

          <Button type="button" onClick={handleRun} disabled={loading}>
            {loading ? 'Analyzing...' : 'Run Quote Recommendation'}
          </Button>
        </div>
      </div>

      {error ? (
        <Card className="qrec-card qrec-card-error" data-testid="quote-recommendation-error-card">
          <CardTitle>Quote Recommendation Error</CardTitle>
          <CardText>{error}</CardText>
        </Card>
      ) : null}

      {response?.ok ? (
        <>
          <Card className="qrec-card" data-testid="quote-recommendation-summary-card">
            <CardTitle>Quote Recommendation Output</CardTitle>
            <CardText>{response.data.summary}</CardText>

            <div className="qrec-badges">
              <span className="dg-badge">Provider: {response.provider}</span>
              <span className="dg-badge">
                {response.fallbackUsed ? 'Fallback' : 'Primary'}
              </span>
              <span className="dg-badge">Confidence: {response.data.confidence}%</span>
              <span className="dg-badge">
                {response.data.canCreateQuote ? 'Quote Ready' : 'Missing Data'}
              </span>
            </div>
          </Card>

          <Card className="qrec-card" data-testid="quote-recommendation-products-card">
            <CardTitle>Suggested Products / Variants</CardTitle>
            <div className="qrec-product-grid dg-grid dg-gap-3">
              {response.data.recommendations.map((item: QuoteRecommendationItem, index: number) => (
                <article
                  key={`${item.productId || item.productName}-${index}`}
                  className="qrec-product-card dg-space-y-2"
                >
                  <div className="qrec-product-head dg-flex dg-items-start dg-justify-between dg-gap-3">
                    <h4 className="qrec-product-title dg-m-0">{item.productName}</h4>
                    <div className="qrec-product-badges dg-flex dg-flex-wrap dg-justify-end dg-gap-2">
                      <span className="qrec-mini-badge dg-inline-flex dg-items-center dg-gap-1">
                        Qty:<strong>{item.suggestedQuantity ?? 'n/a'}</strong>
                      </span>
                      <span className="qrec-mini-badge dg-inline-flex dg-items-center dg-gap-1">
                        Variant:<strong>{item.suggestedVariant ?? 'n/a'}</strong>
                      </span>
                    </div>
                  </div>
                  <div className="qrec-product-rationale">{item.rationale}</div>
                </article>
              ))}
            </div>
          </Card>

          <Card className="qrec-card" data-testid="quote-recommendation-missing-card">
            <CardTitle>Missing Data Detection</CardTitle>
            {response.data.missingData.length > 0 ? (
              <ul className="qrec-missing-list">
                {response.data.missingData.map((item: QuoteRecommendationMissingField, index: number) => (
                  <li key={`${item.field}-${index}`}>
                    <strong>{fieldLabel(item.field)}</strong>: {item.reason}
                  </li>
                ))}
              </ul>
            ) : (
              <CardText>No blocking missing data detected.</CardText>
            )}

            <div className="qrec-next-action">
              Next action: {response.data.suggestedNextAction}
            </div>
          </Card>
        </>
      ) : null}
    </div>
  );
}
