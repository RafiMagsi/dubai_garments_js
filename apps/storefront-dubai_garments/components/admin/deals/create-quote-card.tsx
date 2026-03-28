'use client';

import { FormEvent, useEffect, useState } from 'react';
import Modal from '@/components/ui/modal';

export type DealQuoteCreateInput = {
  product_id: string;
  quantity: number;
  currency: string;
  discount: number;
  tax_pct: number;
  expires_at?: string;
  quote_notes?: string;
  items_text?: string;
};

type CreateQuoteCardProps = {
  dealLeadQuantity: number | null | undefined;
  dealLeadProductName: string | null | undefined;
  productHint?: string | null;
  productOptions: Array<{ id: string; label: string }>;
  isPending: boolean;
  success: string | null;
  error: string | null;
  autoOpen?: boolean;
  hideInlineCard?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSubmit: (input: DealQuoteCreateInput) => Promise<boolean>;
};

export default function CreateQuoteCard({
  dealLeadQuantity,
  dealLeadProductName,
  productHint,
  productOptions,
  isPending,
  success,
  error,
  autoOpen = false,
  hideInlineCard = false,
  open,
  onOpenChange,
  onSubmit,
}: CreateQuoteCardProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState(String(dealLeadQuantity || 1));
  const [currency, setCurrency] = useState('AED');
  const [discount, setDiscount] = useState('0');
  const [taxPct, setTaxPct] = useState('0');
  const [expiresAt, setExpiresAt] = useState('');
  const [itemsText, setItemsText] = useState(
    `${dealLeadProductName || 'Product'} - Qty ${dealLeadQuantity || 1}`
  );
  const [quoteNotes, setQuoteNotes] = useState('');
  const [clientError, setClientError] = useState<string | null>(null);

  useEffect(() => {
    if (productId || productOptions.length === 0) return;

    const raw = String(productHint || dealLeadProductName || '').trim();
    const lowerRaw = raw.toLowerCase();
    const uuidMatch = raw.match(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}/);
    const uuidFromRaw = uuidMatch?.[0]?.toLowerCase();

    const byId =
      (raw && productOptions.find((option) => option.id.toLowerCase() === lowerRaw)) ||
      (uuidFromRaw && productOptions.find((option) => option.id.toLowerCase() === uuidFromRaw));

    if (byId) {
      setProductId(byId.id);
      return;
    }

    const byName =
      raw &&
      productOptions.find((option) => {
        const label = option.label.toLowerCase();
        return label.startsWith(lowerRaw) || label.includes(lowerRaw);
      });

    if (byName) {
      setProductId(byName.id);
    }
  }, [dealLeadProductName, productHint, productId, productOptions]);

  useEffect(() => {
    if (autoOpen) setModalOpen(true);
  }, [autoOpen]);

  useEffect(() => {
    if (typeof open === 'boolean') {
      setModalOpen(open);
    }
  }, [open]);

  useEffect(() => {
    if (!modalOpen) {
      setClientError(null);
    }
  }, [modalOpen]);

  function setOpen(next: boolean) {
    setModalOpen(next);
    onOpenChange?.(next);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setClientError(null);

    const normalizedProductId = productId.trim();
    const normalizedQuantity = Number(quantity || 0);

    if (!normalizedProductId) {
      setClientError('Please select a product before creating the quote.');
      return;
    }
    if (!Number.isFinite(normalizedQuantity) || normalizedQuantity <= 0) {
      setClientError('Quantity must be greater than 0.');
      return;
    }

    const ok = await onSubmit({
      product_id: normalizedProductId,
      quantity: normalizedQuantity,
      currency: currency.trim() || 'AED',
      discount: Number(discount || 0),
      tax_pct: Number(taxPct || 0),
      expires_at: expiresAt || undefined,
      quote_notes: quoteNotes.trim() || undefined,
      items_text: itemsText.trim() || undefined,
    });
    if (ok) {
      setOpen(false);
      return;
    }

    if (!error) {
      setClientError('Quote creation failed. Check required fields and try again.');
    }
  }

  return (
    <>
      {!hideInlineCard ? (
        <div className="dg-card">
          <h2 className="dg-title-sm">Create Quote</h2>
          <p className="dg-muted-sm">Generate quote from a dedicated modal flow with full product and pricing controls.</p>
          {success ? <div className="dg-alert-success">{success}</div> : null}
          {error ? <div className="dg-alert-error">{error}</div> : null}
          <div className="dg-form-row mt-3">
            <button
              type="button"
              className="ui-btn ui-btn-primary ui-btn-md"
              onClick={() => setOpen(true)}
              disabled={isPending}
            >
              {isPending ? 'Creating...' : 'Open Create Quote'}
            </button>
          </div>
        </div>
      ) : null}

      <Modal open={modalOpen} onClose={() => setOpen(false)}>
        <div className="ui-modal-card ui-modal-size-lg">
          <div className="ui-modal-head">
            <div className="ui-modal-title-block">
              <p className="ui-modal-kicker">Deal Quote</p>
              <h3 className="ui-modal-title">Create Quote</h3>
            </div>
          </div>
          <p className="ui-modal-meta">Use product and quantity to generate an exact quote breakdown.</p>
          {success ? <div className="dg-alert-success">{success}</div> : null}
          {error ? <div className="dg-alert-error">{error}</div> : null}
          {clientError ? <div className="dg-alert-error">{clientError}</div> : null}

          <form className="dg-config-form" onSubmit={(event) => void handleSubmit(event)}>
            <div className="dg-config-grid">
              <div className="dg-field">
                <label htmlFor="cq-product-id" className="dg-label">
                  Product
                </label>
                <select
                  id="cq-product-id"
                  className="dg-select"
                  value={productId}
                  onChange={(event) => setProductId(event.target.value)}
                  required
                >
                  <option value="">Select product</option>
                  {productOptions.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="dg-field">
                <label htmlFor="cq-quantity" className="dg-label">
                  Quantity
                </label>
                <input
                  id="cq-quantity"
                  className="dg-input"
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                  required
                />
              </div>
              <div className="dg-field">
                <label htmlFor="cq-currency" className="dg-label">
                  Currency
                </label>
                <input
                  id="cq-currency"
                  className="dg-input"
                  value={currency}
                  onChange={(event) => setCurrency(event.target.value)}
                  required
                />
              </div>
              <div className="dg-field">
                <label htmlFor="cq-discount" className="dg-label">
                  Discount
                </label>
                <input
                  id="cq-discount"
                  className="dg-input"
                  type="number"
                  step="0.01"
                  min={0}
                  value={discount}
                  onChange={(event) => setDiscount(event.target.value)}
                />
              </div>
              <div className="dg-field">
                <label htmlFor="cq-tax-pct" className="dg-label">
                  Tax %
                </label>
                <input
                  id="cq-tax-pct"
                  className="dg-input"
                  type="number"
                  step="0.01"
                  min={0}
                  value={taxPct}
                  onChange={(event) => setTaxPct(event.target.value)}
                />
              </div>
              <div className="dg-field">
                <label htmlFor="cq-expires-at" className="dg-label">
                  Expires At
                </label>
                <input
                  id="cq-expires-at"
                  className="dg-input"
                  type="date"
                  value={expiresAt}
                  onChange={(event) => setExpiresAt(event.target.value)}
                />
              </div>
            </div>
            <div className="dg-field">
              <label htmlFor="cq-items-text" className="dg-label">
                Items Notes
              </label>
              <textarea
                id="cq-items-text"
                className="dg-textarea"
                rows={4}
                value={itemsText}
                onChange={(event) => setItemsText(event.target.value)}
              />
            </div>
            <div className="dg-field">
              <label htmlFor="cq-quote-notes" className="dg-label">
                Notes
              </label>
              <textarea
                id="cq-quote-notes"
                className="dg-textarea"
                rows={3}
                value={quoteNotes}
                onChange={(event) => setQuoteNotes(event.target.value)}
              />
            </div>
            <div className="dg-form-row mt-3">
              <button type="submit" className="ui-btn ui-btn-primary ui-btn-md" disabled={isPending}>
                {isPending ? 'Creating...' : 'Create Quote'}
              </button>
              <button
                type="button"
                className="ui-btn ui-btn-secondary ui-btn-md"
                onClick={() => setOpen(false)}
                disabled={isPending}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </Modal>
    </>
  );
}
