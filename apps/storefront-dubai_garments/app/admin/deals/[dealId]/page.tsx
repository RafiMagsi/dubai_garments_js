'use client';

import Link from 'next/link';
import { FormEvent, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { isAxiosError } from 'axios';
import AdminPageHeader from '@/components/admin/common/page-header';
import RecordTimeline, { RecordTimelineEvent } from '@/components/admin/common/record-timeline';
import AdminShell from '@/components/admin/admin-shell';
import { PageShell, Panel, StatusBadge, Toolbar } from '@/components/ui';
import { useActivities } from '@/features/admin/activities';
import { DealStage, useDealById, useSendDealEmail, useUpdateDeal } from '@/features/admin/deals';
import { useProducts } from '@/features/products';
import { formatAed, getStartingUnitPriceAED } from '@/features/products/utils/product-pricing';
import { useCreateQuote } from '@/features/admin/quotes';
import {
  formatDateTime,
  shortCode,
  titleCase,
} from '@/features/admin/shared/view-format';

const stageOptions: DealStage[] = ['new', 'qualified', 'quoted', 'negotiation', 'won', 'lost'];

function productPriceLabel(name: string, startingPrice: number | null) {
  return `${name} - ${startingPrice !== null ? `${formatAed(startingPrice)} / unit` : 'On request'}`;
}

export default function AdminDealDetailsPage() {
  const params = useParams<{ dealId: string }>();
  const dealId = typeof params.dealId === 'string' ? params.dealId : '';

  const { data, isLoading, isError, error } = useDealById(dealId);
  const activitiesQuery = useActivities({ deal_id: dealId || undefined });
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
  const timelineEvents = useMemo<RecordTimelineEvent[]>(() => {
    const activityEvents =
      activitiesQuery.data?.items?.map((activity) => ({
        id: `activity:${activity.id}`,
        occurredAt: activity.occurred_at || activity.created_at,
        title: activity.title || titleCase(activity.activity_type),
        details: activity.details || null,
        type: activity.activity_type,
        meta: null,
      })) ?? [];

    const communicationEvents = communications.map((communication) => ({
      id: `comm:${communication.id}`,
      occurredAt: communication.sent_at || communication.created_at,
      title: communication.subject || 'Email Sent',
      details: communication.message_text || null,
      type: 'email_sent',
      meta: `${deal?.lead_email || '-'} • ${titleCase(communication.channel)}`,
    }));

    return [...activityEvents, ...communicationEvents];
  }, [activitiesQuery.data?.items, communications, deal?.lead_email]);

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
      <PageShell density="compact">
      <Panel>
        <AdminPageHeader
          title={`Deal #${shortCode(dealId)}`}
          subtitle="Update stage, ownership, value, and generate related quotes."
          actions={
            <Toolbar>
              <Link href="/admin/deals" className="ui-btn ui-btn-secondary ui-btn-md">
                Back to Deals
              </Link>
              <Link href="/admin/quotes" className="ui-btn ui-btn-secondary ui-btn-md">
                Quotes
              </Link>
              {deal?.lead_id ? (
                <Link href={`/admin/leads/${deal.lead_id}`} className="ui-btn ui-btn-secondary ui-btn-md">
                  Lead
                </Link>
              ) : null}
            </Toolbar>
          }
        />
      </Panel>

      <Panel className="dg-deal-detail-page">
        {isLoading && (
          <div className="dg-card">
            <p className="dg-muted-sm">Loading deal details...</p>
          </div>
        )}

        {isError && (
          <div className="dg-card">
            <p className="dg-alert-error">
              {error instanceof Error ? error.message : 'Failed to load deal details.'}
            </p>
          </div>
        )}

        {deal && (
          <div className="dg-two-col-grid">
            <div className="dg-side-stack">
              <div className="dg-card">
                <div className="dg-admin-head">
                  <div>
                    <p className="dg-eyebrow">Deal Profile</p>
                    <h2 className="dg-title-sm">
                      {deal.lead_contact_name || deal.customer_company_name || 'Unknown Deal'}
                      {deal.lead_company_name ? ` • ${deal.lead_company_name}` : ''}
                    </h2>
                  </div>
                  <StatusBadge status={deal.stage}>{titleCase(deal.stage)}</StatusBadge>
                </div>
                <div className="dg-detail-list">
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
                    <strong>{formatDateTime(deal.created_at)}</strong>
                  </div>
                  <div className="dg-detail-item">
                    <span>Updated</span>
                    <strong>{formatDateTime(deal.updated_at)}</strong>
                  </div>
                </div>
              </div>

              <div className="dg-card">
                <h2 className="dg-title-sm">Lead Context</h2>
                <div className="dg-detail-list">
                  <div className="dg-detail-item">
                    <span>Tracking Code</span>
                    <strong>{shortCode(deal.lead_id)}</strong>
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

              <div className="dg-card">
                <h2 className="dg-title-sm">Deal Notes</h2>
                <p className="dg-section-copy">{deal.notes || 'No notes available.'}</p>
              </div>

              <div className="dg-card">
                <h2 className="dg-title-sm">Related Quotes</h2>
                {quotes.length > 0 ? (
                  <div className="dg-list dg-list-density-compact">
                    {quotes.map((quote) => (
                      <div key={quote.id} className="dg-list-row">
                        <div className="dg-list-main">
                          <p className="dg-list-title">{quote.quote_number}</p>
                          <p className="dg-list-meta">
                            {quote.status} • {quote.currency} {Number(quote.total_amount || 0).toFixed(2)}
                          </p>
                        </div>
                        <Link href={`/admin/quotes/${quote.id}`} className="ui-btn ui-btn-secondary ui-btn-md">
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

            <div className="dg-side-stack dg-record-rail">
              <div className="dg-card">
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
                            {titleCase(stage)}
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
                  <button type="submit" className="ui-btn ui-btn-primary ui-btn-md" disabled={updateDealMutation.isPending}>
                    {updateDealMutation.isPending ? 'Saving...' : 'Save Deal'}
                  </button>
                </form>
              </div>

              <div className="dg-card">
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
                  <button type="submit" className="ui-btn ui-btn-primary ui-btn-md" disabled={createQuoteMutation.isPending}>
                    {createQuoteMutation.isPending ? 'Creating...' : 'Create Quote'}
                  </button>
                </form>
              </div>

              <div className="dg-card">
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
                      defaultValue={`Update on your order discussion - Deal #${shortCode(deal.id)}`}
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
                  <button type="submit" className="ui-btn ui-btn-primary ui-btn-md" disabled={sendDealEmailMutation.isPending}>
                    {sendDealEmailMutation.isPending ? 'Sending...' : 'Send Email'}
                  </button>
                </form>
              </div>

              <RecordTimeline
                title="Deal Timeline"
                events={timelineEvents}
                emptyText="No activities or communications yet for this deal."
              />
            </div>
          </div>
        )}
      </Panel>
      </PageShell>
    </AdminShell>
  );
}
