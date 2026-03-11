'use client';

import Link from 'next/link';
import { FormEvent, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { isAxiosError } from 'axios';
import AdminShell from '@/components/admin/admin-shell';
import { DealStage, useDealById, useSendDealEmail, useUpdateDeal } from '@/features/admin/deals';
import { useProducts } from '@/features/products';
import { formatAed, getStartingUnitPriceAED } from '@/features/products/utils/product-pricing';
import { useCreateQuote } from '@/features/admin/quotes';

const stageOptions: DealStage[] = ['new', 'qualified', 'quoted', 'negotiation', 'won', 'lost'];

function stageBadgeClass(stage: string) {
  return `dg-status-pill dg-status-pill-${stage.toUpperCase()}`;
}

function stageLabel(stage: string) {
  return stage.charAt(0).toUpperCase() + stage.slice(1);
}

function productPriceLabel(name: string, startingPrice: number | null) {
  return `${name} - ${startingPrice !== null ? `${formatAed(startingPrice)} / unit` : 'On request'}`;
}

export default function AdminDealDetailsPage() {
  const params = useParams<{ dealId: string }>();
  const dealId = typeof params.dealId === 'string' ? params.dealId : '';

  const { data, isLoading, isError, error } = useDealById(dealId);
  const { data: products = [] } = useProducts();
  const updateDealMutation = useUpdateDeal();
  const sendDealEmailMutation = useSendDealEmail();
  const createQuoteMutation = useCreateQuote();

  const [dealSuccess, setDealSuccess] = useState<string | null>(null);
  const [emailSuccess, setEmailSuccess] = useState<string | null>(null);
  const [quoteSuccess, setQuoteSuccess] = useState<string | null>(null);
  const [dealError, setDealError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  const deal = data?.item;
  const quotes = useMemo(() => data?.quotes ?? [], [data?.quotes]);
  const communications = useMemo(() => data?.communications ?? [], [data?.communications]);

  async function handleUpdateDeal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!deal) return;
    setDealSuccess(null);
    setDealError(null);
    const formData = new FormData(event.currentTarget);

    const stage = String(formData.get('stage') || '').toLowerCase() as DealStage;
    const valueEstimate = Number(formData.get('value_estimate') || 0);
    const probability = Number(formData.get('probability_pct') || 0);
    const notes = String(formData.get('notes') || '').trim();

    try {
      await updateDealMutation.mutateAsync({
        dealId: deal.id,
        payload: {
          stage,
          expected_value: Number.isNaN(valueEstimate) ? undefined : valueEstimate,
          probability_pct: Number.isNaN(probability) ? undefined : probability,
          notes: notes || undefined,
        },
      });
      setDealSuccess('Deal updated successfully.');
    } catch (error) {
      if (isAxiosError(error)) {
        const detail = error.response?.data?.detail;
        setDealError(typeof detail === 'string' ? detail : 'Failed to update deal.');
        return;
      }
      setDealError(error instanceof Error ? error.message : 'Failed to update deal.');
    }
  }

  async function handleSendEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!deal) return;
    setEmailSuccess(null);
    setEmailError(null);
    const formData = new FormData(event.currentTarget);
    const recipient_email = String(formData.get('recipient_email') || '').trim();
    const subject = String(formData.get('subject') || '').trim();
    const message = String(formData.get('message') || '').trim();
    try {
      const response = await sendDealEmailMutation.mutateAsync({
        dealId: deal.id,
        payload: { recipient_email, subject, message },
      });
      setEmailSuccess(response.message);
    } catch (error) {
      if (isAxiosError(error)) {
        const detail = error.response?.data?.detail;
        setEmailError(typeof detail === 'string' ? detail : 'Failed to send email.');
        return;
      }
      setEmailError(error instanceof Error ? error.message : 'Failed to send email.');
    }
  }

  async function handleCreateQuote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!deal) return;
    setQuoteSuccess(null);
    setQuoteError(null);
    if (!deal.customer_id) {
      setQuoteError('This deal has no linked customer. Please link customer first.');
      return;
    }
    const formData = new FormData(event.currentTarget);
    const product_id = String(formData.get('product_id') || '');
    const quantity = Number(formData.get('quantity') || 0);
    const currency = String(formData.get('currency') || 'AED');
    const discount = Number(formData.get('discount') || 0);
    const tax = Number(formData.get('tax_pct') || 0);
    const valid_until = String(formData.get('expires_at') || '');
    const notes = String(formData.get('quote_notes') || '').trim();
    const item_note = String(formData.get('items_text') || '').trim();
    const normalizedProductId = product_id.trim();
    const normalizedQuantity = Number.isNaN(quantity) ? 0 : quantity;

    if (!normalizedProductId) {
      setQuoteError('Please select a product.');
      return;
    }
    if (normalizedQuantity <= 0) {
      setQuoteError('Quantity must be greater than 0.');
      return;
    }

    try {
      const created = await createQuoteMutation.mutateAsync({
        customer_id: deal.customer_id,
        lead_id: deal.lead_id || undefined,
        deal_id: deal.id,
        currency,
        valid_until: valid_until || undefined,
        notes: notes || undefined,
        discount_amount: Number.isNaN(discount) ? 0 : discount,
        tax_pct: Number.isNaN(tax) ? 0 : tax,
        items: [
          {
            product_id: normalizedProductId,
            quantity: normalizedQuantity,
            note: item_note || undefined,
            customization_cost_per_unit: 0,
            customization_flat_cost: 0,
            rush_fee_pct: 0,
            margin_pct: 0,
          },
        ],
      });

      setQuoteSuccess(`Quote created: ${created.quote_number}`);
    } catch (error) {
      if (isAxiosError(error)) {
        const detail = error.response?.data?.detail;
        if (typeof detail === 'string') {
          setQuoteError(detail);
          return;
        }
        if (Array.isArray(detail)) {
          const first = detail[0];
          if (first?.msg) {
            setQuoteError(String(first.msg));
            return;
          }
        }
        setQuoteError('Failed to create quote.');
        return;
      }
      setQuoteError(error instanceof Error ? error.message : 'Failed to create quote.');
    }
  }

  return (
    <AdminShell>
      <section className="dg-admin-page">
        <div className="dg-admin-page-head">
          <div>
            <h1 className="dg-page-title">Deal #{dealId.slice(0, 6).toUpperCase()}</h1>
            <p className="dg-page-subtitle">Update stage, ownership, value, and generate related quotes.</p>
          </div>
          <div className="dg-admin-toolbar">
            <Link href="/admin/deals" className="dg-btn-secondary">
              Back to Deals
            </Link>
            <Link href="/admin/quotes" className="dg-btn-secondary">
              Quotes
            </Link>
            {deal?.lead_id ? (
              <Link href={`/admin/leads/${deal.lead_id}`} className="dg-btn-secondary">
                Lead
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      <section className="dg-admin-page">
        {isLoading && (
          <div className="dg-card dg-panel">
            <p className="dg-muted-sm">Loading deal details...</p>
          </div>
        )}

        {isError && (
          <div className="dg-card dg-panel">
            <p className="dg-alert-error">
              {error instanceof Error ? error.message : 'Failed to load deal details.'}
            </p>
          </div>
        )}

        {deal && (
          <div className="dg-two-col-grid">
            <div className="dg-card dg-panel">
              <h2 className="dg-title-sm">Deal Snapshot</h2>
              <div className="dg-detail-list">
                <div className="dg-detail-item">
                  <span>Stage</span>
                  <span className={stageBadgeClass(deal.stage)}>{stageLabel(deal.stage)}</span>
                </div>
                <div className="dg-detail-item">
                  <span>Priority</span>
                  <strong>
                    {deal.probability_pct >= 70 ? 'high' : deal.probability_pct <= 35 ? 'low' : 'medium'}
                  </strong>
                </div>
                <div className="dg-detail-item">
                  <span>Value Estimate</span>
                  <strong>AED {Number(deal.expected_value || 0).toFixed(2)}</strong>
                </div>
                <div className="dg-detail-item">
                  <span>Assigned User</span>
                  <strong>{deal.owner_user_id ? deal.owner_user_id.slice(0, 8) : '-'}</strong>
                </div>
                <div className="dg-detail-item">
                  <span>Created</span>
                  <strong>{deal.created_at ? new Date(deal.created_at).toLocaleString() : '-'}</strong>
                </div>
                <div className="dg-detail-item">
                  <span>Updated</span>
                  <strong>{deal.updated_at ? new Date(deal.updated_at).toLocaleString() : '-'}</strong>
                </div>
              </div>

              <div className="dg-card dg-summary-card">
                <h3 className="dg-title-sm">Lead Context</h3>
                <div className="dg-detail-list">
                  <div className="dg-detail-item">
                    <span>Tracking Code</span>
                    <strong>{deal.lead_id ? deal.lead_id.slice(0, 6).toUpperCase() : '-'}</strong>
                  </div>
                  <div className="dg-detail-item">
                    <span>Customer</span>
                    <strong>{deal.lead_contact_name || '-'}</strong>
                  </div>
                  <div className="dg-detail-item">
                    <span>Company</span>
                    <strong>{deal.lead_company_name || deal.customer_company_name || '-'}</strong>
                  </div>
                  <div className="dg-detail-item">
                    <span>Product</span>
                    <strong>{deal.lead_product_name || '-'}</strong>
                  </div>
                  <div className="dg-detail-item">
                    <span>Quantity</span>
                    <strong>{deal.lead_quantity ? `${deal.lead_quantity} pcs` : '-'}</strong>
                  </div>
                </div>
              </div>

              <div className="dg-card dg-summary-card">
                <h3 className="dg-title-sm">Deal Notes</h3>
                <p className="dg-section-copy">{deal.notes || 'No notes available.'}</p>
              </div>

              <div className="dg-card dg-summary-card">
                <h3 className="dg-title-sm">Related Quotes</h3>
                {quotes.length > 0 ? (
                  <div className="dg-list">
                    {quotes.map((quote) => (
                      <div key={quote.id} className="dg-list-row">
                        <div className="dg-list-main">
                          <p className="dg-list-title">{quote.quote_number}</p>
                          <p className="dg-list-meta">
                            {quote.status} • {quote.currency} {Number(quote.total_amount || 0).toFixed(2)}
                          </p>
                        </div>
                        <Link href={`/admin/quotes/${quote.id}`} className="dg-btn-secondary">
                          Open
                        </Link>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="dg-muted-sm">No quotes created yet.</p>
                )}
              </div>
            </div>

            <div className="dg-side-stack">
              <div className="dg-card dg-panel">
                <h2 className="dg-title-sm">Update Deal</h2>
                {dealSuccess ? <div className="dg-alert-success">{dealSuccess}</div> : null}
                {dealError ? <div className="dg-alert-error">{dealError}</div> : null}
                <form className="dg-config-form" onSubmit={handleUpdateDeal}>
                  <div className="dg-config-grid">
                    <div className="dg-field">
                      <label htmlFor="stage" className="dg-label">
                        Stage
                      </label>
                      <select id="stage" name="stage" className="dg-select" defaultValue={deal.stage} required>
                        {stageOptions.map((stage) => (
                          <option key={stage} value={stage}>
                            {stageLabel(stage)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="dg-field">
                      <label htmlFor="probability_pct" className="dg-label">
                        Priority (Probability %)
                      </label>
                      <input
                        id="probability_pct"
                        name="probability_pct"
                        type="number"
                        min={0}
                        max={100}
                        className="dg-input"
                        defaultValue={deal.probability_pct}
                      />
                    </div>
                    <div className="dg-field">
                      <label htmlFor="value_estimate" className="dg-label">
                        Value Estimate
                      </label>
                      <input
                        id="value_estimate"
                        name="value_estimate"
                        type="number"
                        step="0.01"
                        min={0}
                        className="dg-input"
                        defaultValue={deal.expected_value}
                      />
                    </div>
                  </div>
                  <div className="dg-field">
                    <label htmlFor="notes" className="dg-label">
                      Notes
                    </label>
                    <textarea id="notes" name="notes" className="dg-textarea" rows={5} defaultValue={deal.notes || ''} />
                  </div>
                  <button type="submit" className="dg-btn-primary" disabled={updateDealMutation.isPending}>
                    {updateDealMutation.isPending ? 'Saving...' : 'Save Deal'}
                  </button>
                </form>
              </div>

              <div className="dg-card dg-panel">
                <h2 className="dg-title-sm">Create Quote</h2>
                <p className="dg-muted-sm">Use product and quantity to generate an exact quote breakdown.</p>
                {quoteSuccess ? <div className="dg-alert-success">{quoteSuccess}</div> : null}
                {quoteError ? <div className="dg-alert-error">{quoteError}</div> : null}
                <form className="dg-config-form" onSubmit={handleCreateQuote}>
                  <div className="dg-config-grid">
                    <div className="dg-field">
                      <label htmlFor="product_id" className="dg-label">
                        Product
                      </label>
                      <select id="product_id" name="product_id" className="dg-select" required>
                        <option value="">Select product</option>
                        {products.map((product) => (
                          <option key={product.id} value={product.id}>
                            {productPriceLabel(product.name, getStartingUnitPriceAED(product))}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="dg-field">
                      <label htmlFor="quantity" className="dg-label">
                        Quantity
                      </label>
                      <input
                        id="quantity"
                        name="quantity"
                        className="dg-input"
                        type="number"
                        min={1}
                        defaultValue={deal.lead_quantity || 1}
                        required
                      />
                    </div>
                    <div className="dg-field">
                      <label htmlFor="currency" className="dg-label">
                        Currency
                      </label>
                      <input id="currency" name="currency" className="dg-input" defaultValue="AED" required />
                    </div>
                    <div className="dg-field">
                      <label htmlFor="discount" className="dg-label">
                        Discount
                      </label>
                      <input id="discount" name="discount" className="dg-input" type="number" step="0.01" min={0} defaultValue={0} />
                    </div>
                    <div className="dg-field">
                      <label htmlFor="tax_pct" className="dg-label">
                        Tax %
                      </label>
                      <input id="tax_pct" name="tax_pct" className="dg-input" type="number" step="0.01" min={0} defaultValue={0} />
                    </div>
                    <div className="dg-field">
                      <label htmlFor="expires_at" className="dg-label">
                        Expires At
                      </label>
                      <input id="expires_at" name="expires_at" className="dg-input" type="date" />
                    </div>
                  </div>
                  <div className="dg-field">
                    <label htmlFor="items_text" className="dg-label">
                      Items Notes
                    </label>
                    <textarea
                      id="items_text"
                      name="items_text"
                      className="dg-textarea"
                      rows={4}
                      defaultValue={`${deal.lead_product_name || 'Product'} - Qty ${deal.lead_quantity || 1}`}
                    />
                  </div>
                  <div className="dg-field">
                    <label htmlFor="quote_notes" className="dg-label">
                      Notes
                    </label>
                    <textarea id="quote_notes" name="quote_notes" className="dg-textarea" rows={3} />
                  </div>
                  <button type="submit" className="dg-btn-primary" disabled={createQuoteMutation.isPending}>
                    {createQuoteMutation.isPending ? 'Creating...' : 'Create Quote'}
                  </button>
                </form>
              </div>

              <div className="dg-card dg-panel">
                <h2 className="dg-title-sm">Email Communication</h2>
                {emailSuccess ? <div className="dg-alert-success">{emailSuccess}</div> : null}
                {emailError ? <div className="dg-alert-error">{emailError}</div> : null}
                <form className="dg-config-form" onSubmit={handleSendEmail}>
                  <div className="dg-field">
                    <label htmlFor="recipient_email" className="dg-label">
                      Recipient Email
                    </label>
                    <input
                      id="recipient_email"
                      name="recipient_email"
                      type="email"
                      className="dg-input"
                      defaultValue={deal.lead_email || ''}
                      required
                    />
                  </div>
                  <div className="dg-field">
                    <label htmlFor="subject" className="dg-label">
                      Subject
                    </label>
                    <input
                      id="subject"
                      name="subject"
                      className="dg-input"
                      defaultValue={`Update on your order discussion - Deal #${deal.id.slice(0, 6).toUpperCase()}`}
                      required
                    />
                  </div>
                  <div className="dg-field">
                    <label htmlFor="message" className="dg-label">
                      Message
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      className="dg-textarea"
                      rows={5}
                      defaultValue={`Hello ${deal.lead_contact_name || 'Customer'},\n\nWe are currently processing your requirements and will share the latest update soon.\n\nRegards,\nDubai Garments Sales Team`}
                      required
                    />
                  </div>
                  <button type="submit" className="dg-btn-primary" disabled={sendDealEmailMutation.isPending}>
                    {sendDealEmailMutation.isPending ? 'Sending...' : 'Send Email'}
                  </button>
                </form>
              </div>

              <div className="dg-card dg-panel">
                <h2 className="dg-title-sm">Recent Communications</h2>
                {communications.length > 0 ? (
                  <div className="dg-list">
                    {communications.map((communication) => (
                      <div key={communication.id} className="dg-list-row">
                        <div className="dg-list-main">
                          <p className="dg-list-title">{communication.subject || 'No subject'}</p>
                          <p className="dg-list-meta">
                            {deal.lead_email || '-'} • SENT •{' '}
                            {new Date(communication.sent_at || communication.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="dg-muted-sm">No communication logs yet.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </section>
    </AdminShell>
  );
}
