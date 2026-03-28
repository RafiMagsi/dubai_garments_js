'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import AdminPageHeader from '@/components/admin/common/page-header';
import RecordTimeline, { RecordTimelineEvent } from '@/components/admin/common/record-timeline';
import AdminShell from '@/components/admin/admin-shell';
import { PageShell, Panel, StatusBadge, Toolbar } from '@/components/ui';
import CreateQuoteCard, { DealQuoteCreateInput } from '@/components/admin/deals/create-quote-card';
import { LeadStatus, useLeadById, useSendLeadEmail, useUpdateLeadStatus } from '@/features/admin/leads';
import { useCreateQuote } from '@/features/admin/quotes';
import { useProducts } from '@/features/products';
import { formatAed, getStartingUnitPriceAED } from '@/features/products/utils/product-pricing';
import {
  shortCode,
  titleCase,
} from '@/features/admin/shared/view-format';
import LeadIntelligenceCards from '@/components/admin/ai-sales-agent/lead-intelligence-cards';
import AgentFlowView from '@/components/admin/ai-sales-agent/agent-flow-view';
import LinkedRecordsSnapshotCard from '@/components/admin/leads/linked-records-snapshot-card';
import LeadZoneSection from '@/components/admin/leads/lead-zone-section';

const statusOptions: LeadStatus[] = ['new', 'qualified', 'quoted', 'won', 'lost'];

function productPriceLabel(name: string, startingPrice: number | null) {
  return `${name} - ${startingPrice !== null ? `${formatAed(startingPrice)} / unit` : 'On request'}`;
}

function extractProductHintFromLead(lead: { ai_product?: string | null; notes?: string | null }) {
  const aiProduct = String(lead.ai_product || '').trim();
  if (aiProduct) return aiProduct;

  const notes = String(lead.notes || '');
  const productLineMatch = notes.match(/product\s*:\s*([^\n\r]+)/i);
  if (productLineMatch?.[1]?.trim()) return productLineMatch[1].trim();

  const uuidMatch = notes.match(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}/);
  if (uuidMatch?.[0]) return uuidMatch[0];

  return '';
}

export default function AdminLeadDetailsPage() {
  const params = useParams<{ leadId: string }>();
  const leadId = typeof params.leadId === 'string' ? params.leadId : '';
  const { data, isLoading, isError, error } = useLeadById(leadId);
  const updateStatusMutation = useUpdateLeadStatus();
  const createQuoteMutation = useCreateQuote();
  const { data: products = [] } = useProducts();
  const sendLeadEmailMutation = useSendLeadEmail();

  const [emailSuccess, setEmailSuccess] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailDraftMeta, setEmailDraftMeta] = useState<string | null>(null);
  const [isDraftingEmail, setIsDraftingEmail] = useState(false);
  const [emailRecipient, setEmailRecipient] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [statusSuccess, setStatusSuccess] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [statusDraft, setStatusDraft] = useState<LeadStatus>('new');
  const [statusOverrideEnabled, setStatusOverrideEnabled] = useState(false);
  const [statusOverrideReason, setStatusOverrideReason] = useState('');
  const [quoteSuccess, setQuoteSuccess] = useState<string | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [quoteModalOpen, setQuoteModalOpen] = useState(false);
  const [flowRefreshSignal, setFlowRefreshSignal] = useState(0);

  const lead = data?.item;
  const deal = data?.deal;
  const linkedQuote = useMemo(() => {
    if (data?.quote?.id) return data.quote;

    const activityWithQuote = (data?.activities ?? []).find((activity) => Boolean(activity.quote_id));
    if (!activityWithQuote?.quote_id) return null;

    return {
      id: activityWithQuote.quote_id,
      quote_number: null,
      status: null,
      currency: null,
      total_amount: null,
      created_at: activityWithQuote.created_at || activityWithQuote.occurred_at,
      updated_at: activityWithQuote.created_at || activityWithQuote.occurred_at,
    };
  }, [data?.activities, data?.quote]);
  const communications = useMemo(() => data?.communications ?? [], [data?.communications]);
  const timelineEvents = useMemo<RecordTimelineEvent[]>(() => {
    const hiddenTimelineActivityTypes = new Set(['ai_flow_orchestration_audit']);
    const activityEvents =
      data?.activities
        ?.filter((activity) => !hiddenTimelineActivityTypes.has(String(activity.activity_type || '').toLowerCase()))
        .map((activity) => ({
          id: `activity:${activity.id}`,
          occurredAt: activity.occurred_at || activity.created_at,
          title: activity.title || titleCase(activity.activity_type),
          details: activity.details || null,
          type: activity.activity_type,
          meta: null,
        })) ?? [];

    const activityTypes = new Set(
      (data?.activities ?? []).map((activity) => String(activity.activity_type || '').toLowerCase())
    );
    const hasLeadCreatedActivity = activityTypes.has('lead_created');
    const hasLeadUpdatedActivity =
      activityTypes.has('lead_updated') || activityTypes.has('lead_status_changed');

    const communicationEvents = communications.map((communication) => ({
      id: `comm:${communication.id}`,
      occurredAt: communication.sent_at || communication.created_at,
      title: communication.subject || 'Email Sent',
      details: communication.message_text || null,
      type: 'email_sent',
      meta: `${lead?.email || '-'} • ${titleCase(communication.channel)}`,
    }));

    const systemEvents: RecordTimelineEvent[] = [];
    if (lead?.created_at && !hasLeadCreatedActivity) {
      systemEvents.push({
        id: `system:lead-created:${lead.id}`,
        occurredAt: lead.created_at,
        title: 'Lead Created',
        details: `Lead ${shortCode(lead.id)} was created from ${lead.source || 'unknown source'}.`,
        type: 'lead_created',
        meta: lead.company_name || lead.contact_name || null,
      });
    }
    const createdAtMs = lead?.created_at ? Date.parse(lead.created_at) : NaN;
    const updatedAtMs = lead?.updated_at ? Date.parse(lead.updated_at) : NaN;
    const hasMeaningfulUpdateTimestamp =
      Number.isFinite(createdAtMs) &&
      Number.isFinite(updatedAtMs) &&
      Math.abs(updatedAtMs - createdAtMs) > 1000;
    if (lead?.updated_at && hasMeaningfulUpdateTimestamp && !hasLeadUpdatedActivity) {
      systemEvents.push({
        id: `system:lead-updated:${lead.id}`,
        occurredAt: lead.updated_at,
        title: 'Lead Updated',
        details: `Current status: ${titleCase(lead.status)}.`,
        type: 'lead_updated',
        meta: null,
      });
    }
    if (deal?.id) {
      systemEvents.push({
        id: `system:lead-linked-deal:${lead?.id}:${deal.id}`,
        occurredAt: deal.created_at || lead?.updated_at || lead?.created_at || new Date().toISOString(),
        title: 'Deal Linked',
        details: `Converted/linked to deal ${shortCode(deal.id)} (${titleCase(deal.stage || 'new')}).`,
        type: 'deal_created',
        meta: deal.title || null,
      });
    }

    return [...activityEvents, ...communicationEvents, ...systemEvents];
  }, [communications, data?.activities, deal?.created_at, deal?.id, deal?.stage, deal?.title, lead]);

  useEffect(() => {
    if (!lead) return;
    setStatusDraft(lead.status);
    setEmailRecipient(lead.email || '');
    setEmailSubject(`Regarding your quote request ${shortCode(lead.id)}`);
    setEmailMessage(
      `Hello ${lead.contact_name || 'Customer'},\n\nThank you for contacting Dubai Garments. We have received your request and our sales team will follow up shortly.\n\nRegards,\nDubai Garments Sales Team`
    );
    setEmailSuccess(null);
    setEmailError(null);
    setEmailDraftMeta(null);
  }, [lead]);

  async function handleStatusUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!lead) return;
    setStatusSuccess(null);
    setStatusError(null);

    if (!statusOverrideEnabled) {
      setStatusError('Enable Manual Override to update lead status.');
      return;
    }

    const reason = statusOverrideReason.trim();
    if (reason.length < 8) {
      setStatusError('Manual override reason is required (minimum 8 characters).');
      return;
    }

    const status = statusDraft;
    if (status === lead.status) {
      setStatusError('Select a different status before saving the override.');
      return;
    }

    try {
      await updateStatusMutation.mutateAsync({
        leadId: lead.id,
        payload: {
          status,
          notes: `Manual override reason: ${reason}`,
        },
      });
      setStatusSuccess(`Lead status updated to ${titleCase(status)} via manual override.`);
      setStatusOverrideEnabled(false);
      setStatusOverrideReason('');
    } catch (error) {
      setStatusError(error instanceof Error ? error.message : 'Failed to update lead status.');
    }
  }

  async function handleSendEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!lead) return;
    setEmailSuccess(null);
    setEmailError(null);

    try {
      const response = await sendLeadEmailMutation.mutateAsync({
        leadId: lead.id,
        payload: {
          recipient_email: emailRecipient.trim(),
          subject: emailSubject.trim(),
          message: emailMessage.trim(),
        },
      });
      setEmailSuccess(response.message);
    } catch (error) {
      setEmailError(error instanceof Error ? error.message : 'Failed to send email.');
    }
  }

  async function handleCreateQuote(input: DealQuoteCreateInput) {
    if (!lead) {
      setQuoteError('Lead context is missing. Reload and try again.');
      return false;
    }
    if (!lead.customer_id) {
      setQuoteError('This lead is missing a linked customer. Link/convert the customer before creating a quote.');
      return false;
    }
    setQuoteSuccess(null);
    setQuoteError(null);

    const normalizedProductId = String(input.product_id || '').trim();
    const normalizedQuantity = Number(input.quantity || 0);
    if (!normalizedProductId) {
      setQuoteError('Please select a product.');
      return false;
    }
    if (!Number.isFinite(normalizedQuantity) || normalizedQuantity <= 0) {
      setQuoteError('Quantity must be greater than 0.');
      return false;
    }

    try {
      const created = await createQuoteMutation.mutateAsync({
        customer_id: lead.customer_id,
        lead_id: lead.id,
        deal_id: deal?.id || undefined,
        currency: String(input.currency || 'AED'),
        valid_until: input.expires_at || undefined,
        notes: input.quote_notes || undefined,
        discount_amount: Number.isFinite(input.discount) ? input.discount : 0,
        tax_pct: Number.isFinite(input.tax_pct) ? input.tax_pct : 0,
        items: [
          {
            product_id: normalizedProductId,
            quantity: normalizedQuantity,
            note: input.items_text || undefined,
            customization_cost_per_unit: 0,
            customization_flat_cost: 0,
            rush_fee_pct: 0,
            margin_pct: 0,
          },
        ],
      });
      setQuoteSuccess(`Quote created: ${created.quote_number}`);
      setFlowRefreshSignal((prev) => prev + 1);
      return true;
    } catch (error) {
      setQuoteError(error instanceof Error ? error.message : 'Failed to create quote.');
      return false;
    }
  }

  function handleQuoteModalOpenChange(nextOpen: boolean) {
    setQuoteModalOpen(nextOpen);
    if (nextOpen) {
      setQuoteSuccess(null);
      setQuoteError(null);
    }
  }

  async function handleDraftReply() {
    if (!lead) return;
    setIsDraftingEmail(true);
    setEmailSuccess(null);
    setEmailError(null);
    setEmailDraftMeta(null);
    try {
      const response = await fetch(`/api/admin/leads/${lead.id}/draft-reply`, {
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

  return (
    <AdminShell>
      <PageShell density="compact">
      <Panel>
        <AdminPageHeader
          title={`Lead #${shortCode(leadId)}`}
          subtitle="Lead profile, qualification context, communication history, and pipeline actions."
          actions={
            <Toolbar>
              <Link href="/admin/leads" className="ui-btn ui-btn-secondary ui-btn-md">
                Back to Leads
              </Link>
              <Link href="/admin/deals" className="ui-btn ui-btn-secondary ui-btn-md">
                Pipeline
              </Link>
            </Toolbar>
          }
        />
      </Panel>

      <Panel className="dg-lead-detail-page">
        {isLoading && (
          <div className="dg-card">
            <p className="dg-muted-sm">Loading lead details...</p>
          </div>
        )}

        {isError && (
          <div className="dg-card">
            <p className="dg-alert-error">
              {error instanceof Error ? error.message : 'Failed to load lead details.'}
            </p>
          </div>
        )}

        {!isLoading && !isError && !lead ? (
          <div className="dg-card">
            <p className="dg-alert-error">
              Lead not found or you do not have access to this record.
            </p>
          </div>
        ) : null}

        {lead && (
          <div className="dg-lead-detail-sections">
            <LeadZoneSection
              zone="Record Context"
              title="Lead Profile, Manual Status Control, and Linked Records"
              description="Primary customer context and explicit override controls for deterministic lifecycle handling."
              testId="lead-zone-record-context"
            >
              <div className="dg-record-detail-grid">
                <div className="dg-side-stack">
                  <div className="dg-card">
                <div className="dg-admin-head">
                  <div>
                    <p className="dg-eyebrow">Lead Profile</p>
                    <h2 className="dg-title-sm">
                      {lead.contact_name || 'Unknown Contact'} {lead.company_name ? `• ${lead.company_name}` : ''}
                    </h2>
                  </div>
                  <StatusBadge status={lead.status}>{titleCase(lead.status)}</StatusBadge>
                </div>
                <div className="dg-detail-list">
                  <div className="dg-detail-item">
                    <span>Tracking Code</span>
                    <strong>{shortCode(lead.id)}</strong>
                  </div>
                  <div className="dg-detail-item">
                    <span>Email</span>
                    <strong>{lead.email || '-'}</strong>
                  </div>
                  <div className="dg-detail-item">
                    <span>Phone</span>
                    <strong>{lead.phone || '-'}</strong>
                  </div>
                  <div className="dg-detail-item">
                    <span>Product</span>
                    <strong>{lead.ai_product || '-'}</strong>
                  </div>
                  <div className="dg-detail-item">
                    <span>Quantity</span>
                    <strong>{lead.requested_qty ? `${lead.requested_qty} pcs` : '-'}</strong>
                  </div>
                  <div className="dg-detail-item">
                    <span>Required Delivery</span>
                    <strong>{lead.timeline_date || '-'}</strong>
                  </div>
                </div>
                  </div>
                </div>

                <div className="dg-side-stack dg-record-rail">
                  <div className="dg-card">
                <h2 className="dg-title-sm">Update Lead Status</h2>
                <p className="dg-help">Status changes here are restricted to explicit manual overrides.</p>
                {statusSuccess ? <div className="dg-alert-success">{statusSuccess}</div> : null}
                {statusError ? <div className="dg-alert-error">{statusError}</div> : null}
                <form className="dg-config-form" onSubmit={handleStatusUpdate}>
                  <div className="dg-field">
                    <label className="dg-form-row" htmlFor="manual-status-override-toggle">
                      <input
                        id="manual-status-override-toggle"
                        type="checkbox"
                        checked={statusOverrideEnabled}
                        onChange={(event) => {
                          setStatusOverrideEnabled(event.target.checked);
                          if (!event.target.checked) {
                            setStatusOverrideReason('');
                          }
                        }}
                      />
                      <span className="dg-label">Enable Manual Override</span>
                    </label>
                    <p className="dg-help">
                      Use only when lifecycle stage automation cannot represent the required status transition.
                    </p>
                  </div>
                  <div className="dg-field">
                    <label htmlFor="status" className="dg-label">
                      Status
                    </label>
                    <select
                      id="status"
                      name="status"
                      className="dg-select"
                      value={statusDraft}
                      onChange={(event) => setStatusDraft(event.target.value as LeadStatus)}
                      disabled={!statusOverrideEnabled}
                    >
                      {statusOptions.map((status) => (
                        <option key={status} value={status}>
                          {titleCase(status)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="dg-field">
                    <label htmlFor="status-override-reason" className="dg-label">
                      Override Reason
                    </label>
                    <textarea
                      id="status-override-reason"
                      className="dg-textarea"
                      rows={3}
                      value={statusOverrideReason}
                      onChange={(event) => setStatusOverrideReason(event.target.value)}
                      placeholder="Why this override is required..."
                      disabled={!statusOverrideEnabled}
                    />
                  </div>
                  <button
                    type="submit"
                    className="ui-btn ui-btn-primary ui-btn-md"
                    disabled={updateStatusMutation.isPending || !statusOverrideEnabled}
                  >
                    {updateStatusMutation.isPending ? 'Saving...' : 'Save Manual Override'}
                  </button>
                </form>
                  </div>
                </div>
              </div>

              <LinkedRecordsSnapshotCard lead={lead} deal={deal} quote={linkedQuote} />
            </LeadZoneSection>

            <LeadZoneSection
              zone="Lifecycle Orchestration"
              title="Lead-to-Close Stage Execution"
              description="Single authority surface for stage progression, guardrails, and deterministic lifecycle actions."
              testId="lead-zone-lifecycle-orchestration"
            >
              <section data-testid="lead-detail-agent-flow-section">
                <AgentFlowView
                  showHeader={false}
                  initialLeadId={lead.id}
                  compact
                  onOpenCreateQuoteModal={() => handleQuoteModalOpenChange(true)}
                  refreshSignal={flowRefreshSignal}
                />
              </section>
            </LeadZoneSection>

            <LeadZoneSection
              zone="Intelligence"
              title="AI Lead Intelligence"
              description="Persistent scoring, reasoning, confidence signals, and actionable recommendations."
              testId="lead-zone-intelligence"
            >
              <section data-testid="lead-detail-intelligence-section">
                <LeadIntelligenceCards lead={lead} title="Lead Intelligence" />
              </section>
            </LeadZoneSection>

            <LeadZoneSection
              zone="Communications and Audit"
              title="Customer Request, Outreach, and Timeline Audit"
              description="Customer message context, outbound communications, and full chronological audit evidence."
              testId="lead-zone-communications-audit"
            >
              <div className="dg-record-detail-grid">
                <div className="dg-side-stack">
                  <div className="dg-card">
                    <h2 className="dg-title-sm">Customer Request</h2>
                    <p className="dg-section-copy">{lead.notes || 'No message submitted.'}</p>
                  </div>

                  <RecordTimeline
                    title="Lead Timeline"
                    events={timelineEvents}
                    emptyText="No activities or communications yet for this lead."
                    isLoading={isLoading}
                    errorText={isError ? (error instanceof Error ? error.message : 'Failed to load lead timeline.') : null}
                  />
                </div>

                <div className="dg-side-stack dg-record-rail">

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
                    <button
                      type="submit"
                      className="ui-btn ui-btn-primary ui-btn-md"
                      disabled={sendLeadEmailMutation.isPending}
                    >
                      {sendLeadEmailMutation.isPending ? 'Sending...' : 'Send Email'}
                    </button>
                  </div>
                </form>
                  </div>
                </div>
              </div>
            </LeadZoneSection>

          <CreateQuoteCard
            dealLeadQuantity={lead.requested_qty}
            dealLeadProductName={lead.ai_product}
            productHint={extractProductHintFromLead(lead)}
            productOptions={products.map((product) => ({
              id: product.id,
              label: productPriceLabel(product.name, getStartingUnitPriceAED(product)),
            }))}
            isPending={createQuoteMutation.isPending}
            success={quoteSuccess}
            error={quoteError}
            hideInlineCard
            open={quoteModalOpen}
            onOpenChange={handleQuoteModalOpenChange}
            onSubmit={handleCreateQuote}
          />
          </div>
        )}
      </Panel>
      </PageShell>
    </AdminShell>
  );
}
