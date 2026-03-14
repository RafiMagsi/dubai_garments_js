'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import AdminPageHeader from '@/components/admin/common/page-header';
import RecordTimeline, { RecordTimelineEvent } from '@/components/admin/common/record-timeline';
import AdminShell from '@/components/admin/admin-shell';
import { PageShell, Panel, StatusBadge, Toolbar } from '@/components/ui';
import { useConvertLeadToDeal } from '@/features/admin/deals/hooks/use-deals';
import { LeadStatus, useLeadById, useSendLeadEmail, useUpdateLeadStatus } from '@/features/admin/leads';
import {
  formatDateTime,
  shortCode,
  titleCase,
} from '@/features/admin/shared/view-format';

const statusOptions: LeadStatus[] = ['new', 'qualified', 'quoted', 'won', 'lost'];

function statusPillClass(status: string) {
  return `dg-status-pill dg-status-pill-${status.toUpperCase()}`;
}

export default function AdminLeadDetailsPage() {
  const params = useParams<{ leadId: string }>();
  const leadId = typeof params.leadId === 'string' ? params.leadId : '';
  const { data, isLoading, isError, error } = useLeadById(leadId);
  const updateStatusMutation = useUpdateLeadStatus();
  const convertToDealMutation = useConvertLeadToDeal();
  const sendLeadEmailMutation = useSendLeadEmail();

  const [emailSuccess, setEmailSuccess] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailDraftMeta, setEmailDraftMeta] = useState<string | null>(null);
  const [isDraftingEmail, setIsDraftingEmail] = useState(false);
  const [emailRecipient, setEmailRecipient] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [dealSuccess, setDealSuccess] = useState<string | null>(null);
  const [dealError, setDealError] = useState<string | null>(null);
  const [statusSuccess, setStatusSuccess] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [sessionUserId, setSessionUserId] = useState<string>('');

  const lead = data?.item;
  const deal = data?.deal;
  const communications = useMemo(() => data?.communications ?? [], [data?.communications]);
  const timelineEvents = useMemo<RecordTimelineEvent[]>(() => {
    const activityEvents =
      data?.activities?.map((activity) => ({
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
      meta: `${lead?.email || '-'} • ${titleCase(communication.channel)}`,
    }));

    const systemEvents: RecordTimelineEvent[] = [];
    if (lead?.created_at) {
      systemEvents.push({
        id: `system:lead-created:${lead.id}`,
        occurredAt: lead.created_at,
        title: 'Lead Created',
        details: `Lead ${shortCode(lead.id)} was created from ${lead.source || 'unknown source'}.`,
        type: 'lead_created',
        meta: lead.company_name || lead.contact_name || null,
      });
    }
    if (lead?.updated_at) {
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
    setEmailRecipient(lead.email || '');
    setEmailSubject(`Regarding your quote request ${shortCode(lead.id)}`);
    setEmailMessage(
      `Hello ${lead.contact_name || 'Customer'},\n\nThank you for contacting Dubai Garments. We have received your request and our sales team will follow up shortly.\n\nRegards,\nDubai Garments Sales Team`
    );
    setEmailSuccess(null);
    setEmailError(null);
    setEmailDraftMeta(null);
  }, [lead]);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const response = await fetch('/api/auth/session', { cache: 'no-store' });
        const payload = (await response.json()) as { authenticated?: boolean; user?: { id?: string } };
        if (!isMounted || !payload?.authenticated || !payload?.user?.id) return;
        setSessionUserId(payload.user.id);
      } catch {
        // Keep silent; owner assignment will fall back to unassigned.
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  async function handleStatusUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!lead) return;
    setStatusSuccess(null);
    setStatusError(null);
    const formData = new FormData(event.currentTarget);
    const status = String(formData.get('status') || '').toLowerCase() as LeadStatus;
    try {
      await updateStatusMutation.mutateAsync({
        leadId: lead.id,
        payload: { status },
      });
      setStatusSuccess(`Lead status updated to ${titleCase(status)}.`);
    } catch (error) {
      setStatusError(error instanceof Error ? error.message : 'Failed to update lead status.');
    }
  }

  async function handleCreateDeal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!lead) return;
    setDealSuccess(null);
    setDealError(null);

    const formData = new FormData(event.currentTarget);
    const priority = String(formData.get('priority') || 'medium');
    const ownerMode = String(formData.get('owner_mode') || 'self');
    const valueEstimateRaw = String(formData.get('value_estimate') || '');
    const notes = String(formData.get('notes') || '').trim();
    const probability =
      priority === 'high' ? 75 : priority === 'low' ? 30 : 50;
    const ownerUserId =
      ownerMode === 'self'
        ? sessionUserId || undefined
        : ownerMode === 'unassigned'
          ? undefined
          : undefined;

    try {
      const result = await convertToDealMutation.mutateAsync({
        leadId: lead.id,
        payload: {
          title: `${lead.company_name || lead.contact_name || 'Company'} Opportunity`,
          owner_user_id: ownerUserId,
          expected_value: valueEstimateRaw ? Number(valueEstimateRaw) : 0,
          probability_pct: probability,
          notes: notes || undefined,
        },
      });

      setDealSuccess(`Deal created successfully: #${shortCode(result.id)}`);
    } catch (error) {
      setDealError(error instanceof Error ? error.message : 'Failed to create deal.');
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

              <div className="dg-card">
                <div className="dg-admin-head">
                  <h2 className="dg-title-sm">Qualification Snapshot</h2>
                  <span className={statusPillClass(lead.ai_classification || 'NEW')}>
                    {lead.ai_classification || 'Unclassified'}
                  </span>
                </div>
                <div className="dg-detail-list">
                  <div className="dg-detail-item">
                    <span>AI Score</span>
                    <strong>{lead.ai_score ?? '-'}</strong>
                  </div>
                  <div className="dg-detail-item">
                    <span>Provider</span>
                    <strong>{lead.ai_provider || '-'}</strong>
                  </div>
                  <div className="dg-detail-item">
                    <span>Processed At</span>
                    <strong>{formatDateTime(lead.ai_processed_at)}</strong>
                  </div>
                  <div className="dg-detail-item">
                    <span>Fallback Used</span>
                    <strong>{lead.ai_fallback_used ? 'Yes' : 'No'}</strong>
                  </div>
                  <div className="dg-detail-item">
                    <span>Urgency</span>
                    <strong>{lead.ai_urgency || '-'}</strong>
                  </div>
                  <div className="dg-detail-item">
                    <span>Complexity</span>
                    <strong>{lead.ai_complexity || '-'}</strong>
                  </div>
                </div>
                {lead.ai_reasoning?.summary ? (
                  <div className="dg-summary-card">
                    <h3 className="dg-title-sm">AI Reasoning</h3>
                    <p className="dg-muted-sm">{lead.ai_reasoning.summary}</p>
                  </div>
                ) : null}
              </div>

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
                <h2 className="dg-title-sm">Update Lead Status</h2>
                {statusSuccess ? <div className="dg-alert-success">{statusSuccess}</div> : null}
                {statusError ? <div className="dg-alert-error">{statusError}</div> : null}
                <form className="dg-config-form" onSubmit={handleStatusUpdate}>
                  <div className="dg-field">
                    <label htmlFor="status" className="dg-label">
                      Status
                    </label>
                    <select
                      id="status"
                      name="status"
                      className="dg-select"
                      defaultValue={lead.status}
                    >
                      {statusOptions.map((status) => (
                        <option key={status} value={status}>
                          {titleCase(status)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="submit"
                    className="ui-btn ui-btn-primary ui-btn-md"
                    disabled={updateStatusMutation.isPending}
                  >
                    {updateStatusMutation.isPending ? 'Saving...' : 'Save Status'}
                  </button>
                </form>
              </div>

              <div className="dg-card">
                <h2 className="dg-title-sm">Deal Link</h2>
                {deal ? (
                  <>
                    <div className="dg-detail-list">
                      <div className="dg-detail-item">
                        <span>Deal ID</span>
                        <strong>#{shortCode(deal.id)}</strong>
                      </div>
                      <div className="dg-detail-item">
                        <span>Stage</span>
                        <strong>{titleCase(deal.stage)}</strong>
                      </div>
                    </div>
                    <div className="dg-hero-actions">
                      <Link href={`/admin/deals/${deal.id}`} className="ui-btn ui-btn-primary ui-btn-md">
                        Open Deal
                      </Link>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="dg-muted-sm">No deal exists for this lead yet.</p>
                    {dealSuccess ? <div className="dg-alert-success">{dealSuccess}</div> : null}
                    {dealError ? <div className="dg-alert-error">{dealError}</div> : null}
                    <form className="dg-config-form" onSubmit={handleCreateDeal}>
                      <div className="dg-config-grid">
                        <div className="dg-field">
                          <label htmlFor="priority" className="dg-label">
                            Priority
                          </label>
                          <select id="priority" name="priority" className="dg-select">
                            <option value="medium">medium</option>
                            <option value="high">high</option>
                            <option value="low">low</option>
                          </select>
                        </div>
                        <div className="dg-field">
                          <label htmlFor="owner_mode" className="dg-label">
                            Owner Assignment
                          </label>
                          <select id="owner_mode" name="owner_mode" className="dg-select" defaultValue="self">
                            <option value="self">Assign to me (recommended)</option>
                            <option value="unassigned">Leave unassigned</option>
                          </select>
                          <p className="dg-help">
                            Defaults for sales workflow: assign the new deal to current signed-in user.
                          </p>
                        </div>
                        <div className="dg-field">
                          <label htmlFor="value_estimate" className="dg-label">
                            Value Estimate
                          </label>
                          <input
                            id="value_estimate"
                            name="value_estimate"
                            type="number"
                            min={0}
                            step={0.01}
                            className="dg-input"
                          />
                        </div>
                      </div>
                      <div className="dg-field">
                        <label htmlFor="notes" className="dg-label">
                          Notes
                        </label>
                        <textarea id="notes" name="notes" className="dg-textarea" rows={3} />
                      </div>
                      <button
                        type="submit"
                        className="ui-btn ui-btn-primary ui-btn-md"
                        disabled={convertToDealMutation.isPending}
                      >
                        {convertToDealMutation.isPending ? 'Creating...' : 'Create Deal'}
                      </button>
                    </form>
                  </>
                )}
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
        )}
      </Panel>
      </PageShell>
    </AdminShell>
  );
}
