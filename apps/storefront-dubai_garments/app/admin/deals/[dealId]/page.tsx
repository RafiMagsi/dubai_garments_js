'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { isAxiosError } from 'axios';
import AdminPageHeader from '@/components/admin/common/page-header';
import RecordTimeline, { RecordTimelineEvent } from '@/components/admin/common/record-timeline';
import AdminShell from '@/components/admin/admin-shell';
import UpdateDealCard from '@/components/admin/deals/update-deal-card';
import { PageShell, Panel, StatusBadge, Toolbar } from '@/components/ui';
import { useActivities } from '@/features/admin/activities';
import { DealStage, useDealById, useSendDealEmail, useUpdateDeal } from '@/features/admin/deals';
import type { DealUpdateInput } from '@/features/admin/deals/types/deal.types';
import {
  formatDateTime,
  shortCode,
  titleCase,
} from '@/features/admin/shared/view-format';

const stageOptions: DealStage[] = ['new', 'qualified', 'quoted', 'negotiation', 'won', 'lost'];

export default function AdminDealDetailsPage() {
  const params = useParams<{ dealId: string }>();
  const dealId = typeof params.dealId === 'string' ? params.dealId : '';

  const { data, isLoading, isError, error } = useDealById(dealId);
  const activitiesQuery = useActivities({ deal_id: dealId || undefined });
  const updateDealMutation = useUpdateDeal();
  const sendDealEmailMutation = useSendDealEmail();

  const [dealSuccess, setDealSuccess] = useState<string | null>(null);
  const [emailSuccess, setEmailSuccess] = useState<string | null>(null);
  const [dealError, setDealError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailDraftMeta, setEmailDraftMeta] = useState<string | null>(null);
  const [isDraftingEmail, setIsDraftingEmail] = useState(false);
  const [emailRecipient, setEmailRecipient] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [sessionUserId, setSessionUserId] = useState<string>('');

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
      occurredAt: quote.updated_at || quote.created_at || deal?.updated_at || deal?.created_at || new Date().toISOString(),
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

  async function handleUpdateDeal(payload: DealUpdateInput) {
    if (!deal) return;
    setDealSuccess(null);
    setDealError(null);

    try {
      await updateDealMutation.mutateAsync({
        dealId: deal.id,
        payload,
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
                  Open Lead
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
              <UpdateDealCard
                deal={deal}
                stageOptions={stageOptions}
                sessionUserId={sessionUserId}
                isPending={updateDealMutation.isPending}
                success={dealSuccess}
                error={dealError}
                onSubmit={handleUpdateDeal}
              />

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
