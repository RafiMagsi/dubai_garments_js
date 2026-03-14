'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
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
  const [emailDraftMeta, setEmailDraftMeta] = useState<string | null>(null);
  const [isDraftingEmail, setIsDraftingEmail] = useState(false);
  const [emailRecipient, setEmailRecipient] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [sessionUserId, setSessionUserId] = useState<string>('');
  const [ownerDraft, setOwnerDraft] = useState('');
  const [ownerMode, setOwnerMode] = useState<'self' | 'unassigned' | 'custom'>('unassigned');

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

    const quoteEvents = quotes.map((quote) => ({
      id: `quote:${quote.id}`,
      occurredAt: deal?.updated_at || deal?.created_at || new Date().toISOString(),
      title: `Quote ${quote.quote_number}`,
      details: `${titleCase(quote.status)} • ${quote.currency} ${Number(quote.total_amount || 0).toFixed(2)}`,
      type: 'quote_created',
      meta: null,
    }));

    const systemEvents: RecordTimelineEvent[] = [];
    if (deal?.created_at) {
      systemEvents.push({
        id: `system:deal-created:${deal.id}`,
        occurredAt: deal.created_at,
        title: 'Deal Created',
        details: `Deal ${shortCode(deal.id)} entered the pipeline.`,
        type: 'deal_created',
        meta: deal.title || null,
      });
    }
    if (deal?.updated_at) {
      systemEvents.push({
        id: `system:deal-updated:${deal.id}`,
        occurredAt: deal.updated_at,
        title: 'Deal Updated',
        details: `Current stage: ${titleCase(deal.stage)}.`,
        type: 'deal_stage_changed',
        meta: null,
      });
    }

    return [...activityEvents, ...communicationEvents, ...quoteEvents, ...systemEvents];
  }, [activitiesQuery.data?.items, communications, deal, quotes]);

  useEffect(() => {
    if (!deal) return;
    setEmailRecipient(deal.lead_email || '');
    setEmailSubject(`Update on your order discussion - Deal #${shortCode(deal.id)}`);
    setEmailMessage(
      `Hello ${deal.lead_contact_name || 'Customer'},\n\nWe are currently processing your requirements and will share the latest update soon.\n\nRegards,\nDubai Garments Sales Team`
    );
    setEmailSuccess(null);
    setEmailError(null);
    setEmailDraftMeta(null);
  }, [deal]);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const response = await fetch('/api/auth/session', { cache: 'no-store' });
        const payload = (await response.json()) as { authenticated?: boolean; user?: { id?: string } };
        if (!isMounted || !payload?.authenticated || !payload?.user?.id) return;
        setSessionUserId(payload.user.id);
      } catch {
        // no-op
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!deal) return;
    if (deal.owner_user_id) {
      if (sessionUserId && deal.owner_user_id === sessionUserId) {
        setOwnerMode('self');
        setOwnerDraft(sessionUserId);
      } else {
        setOwnerMode('custom');
        setOwnerDraft(deal.owner_user_id);
      }
      return;
    }
    if (sessionUserId) {
      setOwnerMode('self');
      setOwnerDraft(sessionUserId);
      return;
    }
    setOwnerMode('unassigned');
    setOwnerDraft('');
  }, [deal, sessionUserId]);

  async function handleUpdateDeal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!deal) return;
    setDealSuccess(null);
    setDealError(null);
    const formData = new FormData(event.currentTarget);

    const stage = String(formData.get('stage') || '').toLowerCase() as DealStage;
    const valueEstimate = Number(formData.get('value_estimate') || 0);
    const probability = Number(formData.get('probability_pct') || 0);
    const ownerUserIdRaw = String(formData.get('owner_user_id') || '').trim();
    const ownerModeRaw = String(formData.get('owner_mode') || ownerMode);
    const notes = String(formData.get('notes') || '').trim();

    const ownerUserId =
      ownerModeRaw === 'self'
        ? sessionUserId || ownerUserIdRaw || undefined
        : ownerModeRaw === 'unassigned'
          ? undefined
          : ownerUserIdRaw || undefined;

    try {
      await updateDealMutation.mutateAsync({
        dealId: deal.id,
        payload: {
          stage,
          owner_user_id: ownerUserId,
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
    try {
      const response = await sendDealEmailMutation.mutateAsync({
        dealId: deal.id,
        payload: {
          recipient_email: emailRecipient.trim(),
          subject: emailSubject.trim(),
          message: emailMessage.trim(),
        },
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

  async function handleDraftReply() {
    if (!deal) return;
    setIsDraftingEmail(true);
    setEmailSuccess(null);
    setEmailError(null);
    setEmailDraftMeta(null);

    try {
      const response = await fetch(`/api/admin/deals/${deal.id}/draft-reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tone: 'professional' }),
      });
      const payload = (await response.json()) as {
        draft?: {
          recipient_email?: string;
          subject?: string;
          message?: string;
          provider?: string;
          fallback_used?: boolean;
        };
        detail?: string;
        message?: string;
      };
      if (!response.ok || !payload.draft) {
        throw new Error(payload.detail || payload.message || 'Failed to generate draft.');
      }

      if (payload.draft.recipient_email) setEmailRecipient(payload.draft.recipient_email);
      if (payload.draft.subject) setEmailSubject(payload.draft.subject);
      if (payload.draft.message) setEmailMessage(payload.draft.message);

      setEmailDraftMeta(
        `Draft generated via ${payload.draft.provider || 'system'}${payload.draft.fallback_used ? ' (fallback)' : ''}.`
      );
    } catch (error) {
      setEmailError(error instanceof Error ? error.message : 'Failed to generate AI draft.');
    } finally {
      setIsDraftingEmail(false);
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

        {!isLoading && !isError && !deal ? (
          <div className="dg-card">
            <p className="dg-alert-error">
              Deal not found or you do not have access to this record.
            </p>
          </div>
        ) : null}

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
                    <div className="dg-field">
                      <label htmlFor="owner_mode" className="dg-label">
                        Owner Assignment
                      </label>
                      <select
                        id="owner_mode"
                        name="owner_mode"
                        className="dg-select"
                        value={ownerMode}
                        onChange={(event) => {
                          const nextMode = event.target.value as 'self' | 'unassigned' | 'custom';
                          setOwnerMode(nextMode);
                          if (nextMode === 'self') {
                            setOwnerDraft(sessionUserId);
                          }
                          if (nextMode === 'unassigned') {
                            setOwnerDraft('');
                          }
                        }}
                      >
                        <option value="self">Assign to me (recommended)</option>
                        <option value="unassigned">Leave unassigned</option>
                        <option value="custom">Assign by user ID</option>
                      </select>
                      <p className="dg-help">
                        Sales default keeps deal ownership on current signed-in user.
                      </p>
                    </div>
                    <div className="dg-field">
                      <label htmlFor="owner_user_id" className="dg-label">
                        Owner User ID (for custom assignment)
                      </label>
                      <input
                        id="owner_user_id"
                        name="owner_user_id"
                        type="text"
                        className="dg-input"
                        value={ownerDraft}
                        onChange={(event) => setOwnerDraft(event.target.value)}
                        placeholder="Enter owner user UUID"
                        disabled={ownerMode !== 'custom'}
                      />
                      <div className="dg-form-row mt-2">
                        <button
                          type="button"
                          className="ui-btn ui-btn-secondary ui-btn-sm"
                          onClick={() => {
                            setOwnerMode('self');
                            setOwnerDraft(sessionUserId);
                          }}
                          disabled={!sessionUserId}
                        >
                          Assign to me
                        </button>
                        <button
                          type="button"
                          className="ui-btn ui-btn-secondary ui-btn-sm"
                          onClick={() => {
                            setOwnerMode('unassigned');
                            setOwnerDraft('');
                          }}
                        >
                          Unassign
                        </button>
                      </div>
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
                {emailDraftMeta ? <p className="dg-help">{emailDraftMeta}</p> : null}
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
                      value={emailRecipient}
                      onChange={(event) => setEmailRecipient(event.target.value)}
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
                      value={emailSubject}
                      onChange={(event) => setEmailSubject(event.target.value)}
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
                      value={emailMessage}
                      onChange={(event) => setEmailMessage(event.target.value)}
                      required
                    />
                  </div>
                  <div className="dg-form-row">
                    <button
                      type="button"
                      className="ui-btn ui-btn-secondary ui-btn-md"
                      onClick={() => void handleDraftReply()}
                      disabled={isDraftingEmail}
                    >
                      {isDraftingEmail ? 'Drafting...' : 'AI Draft Reply'}
                    </button>
                    <button type="submit" className="ui-btn ui-btn-primary ui-btn-md" disabled={sendDealEmailMutation.isPending}>
                      {sendDealEmailMutation.isPending ? 'Sending...' : 'Send Email'}
                    </button>
                  </div>
                </form>
              </div>

              <RecordTimeline
                title="Deal Timeline"
                events={timelineEvents}
                emptyText="No activities or communications yet for this deal."
                isLoading={activitiesQuery.isLoading}
                errorText={
                  activitiesQuery.isError
                    ? activitiesQuery.error instanceof Error
                      ? activitiesQuery.error.message
                      : 'Failed to load deal timeline.'
                    : null
                }
              />
            </div>
          </div>
        )}
      </Panel>
      </PageShell>
    </AdminShell>
  );
}
