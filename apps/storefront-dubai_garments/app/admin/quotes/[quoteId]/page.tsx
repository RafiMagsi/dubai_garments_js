'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import AdminShell from '@/components/admin/admin-shell';
import AdminPageHeader from '@/components/admin/common/page-header';
import RecordTimeline, { RecordTimelineEvent } from '@/components/admin/common/record-timeline';
import QuoteItemsSummarySection from '@/components/admin/quotes/quote-items-summary-section';
import { Card, FieldLabel, PageShell, Panel, TextAreaField, Toolbar } from '@/components/ui';
import { useActivities } from '@/features/admin/activities';
import {
  useGenerateQuotePdf,
  useQuoteById,
  useQuotePdfStatus,
  useUpdateQuoteStatus,
} from '@/features/admin/quotes';
import { shortCode, titleCase } from '@/features/admin/shared/view-format';

const statusOptions: Array<'draft' | 'sent' | 'approved' | 'rejected' | 'expired'> = [
  'draft',
  'sent',
  'approved',
  'rejected',
  'expired',
];
type QuoteStatus = (typeof statusOptions)[number];

function isQuoteStatus(value: string): value is QuoteStatus {
  return statusOptions.includes(value as QuoteStatus);
}

function getQuickStatusActions(status: QuoteStatus): QuoteStatus[] {
  switch (status) {
    case 'draft':
      return ['sent', 'rejected'];
    case 'sent':
      return ['approved', 'rejected'];
    case 'approved':
      return ['expired'];
    case 'rejected':
      return ['draft'];
    case 'expired':
      return ['draft'];
    default:
      return [];
  }
}

export default function AdminQuoteDetailPage() {
  const params = useParams<{ quoteId: string }>();
  const quoteId = params?.quoteId;
  const { data, isLoading, isError, error } = useQuoteById(quoteId);
  const activitiesQuery = useActivities({ quote_id: quoteId });
  const { data: pdfStatus } = useQuotePdfStatus(quoteId);
  const updateStatusMutation = useUpdateQuoteStatus();
  const generatePdfMutation = useGenerateQuotePdf();
  const [notes, setNotes] = useState('');
  const [emailRecipient, setEmailRecipient] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [isDraftingQuoteEmail, setIsDraftingQuoteEmail] = useState(false);
  const [isSendingQuoteEmail, setIsSendingQuoteEmail] = useState(false);
  const [quoteEmailSuccess, setQuoteEmailSuccess] = useState<string | null>(null);
  const [quoteEmailError, setQuoteEmailError] = useState<string | null>(null);
  const [quoteEmailDraftMeta, setQuoteEmailDraftMeta] = useState<string | null>(null);
  const [statusActionSuccess, setStatusActionSuccess] = useState<string | null>(null);
  const [statusActionError, setStatusActionError] = useState<string | null>(null);
  const [targetStatus, setTargetStatus] = useState<QuoteStatus>('draft');

  function getErrorMessage(error: unknown, fallback: string) {
    if (error instanceof Error) {
      const maybeResponse = (error as Error & { response?: { data?: { detail?: string; message?: string } } }).response;
      const responseMessage = maybeResponse?.data?.detail || maybeResponse?.data?.message;
      return responseMessage || error.message || fallback;
    }
    return fallback;
  }

  const quote = data?.item;
  const items = data?.items ?? [];
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

    const systemEvents: RecordTimelineEvent[] = quote
      ? [
          {
            id: `system:quote-created:${quote.id}`,
            occurredAt: quote.created_at,
            title: 'Quote Created',
            details: `Quote ${quote.quote_number} was created.`,
            type: 'quote_created',
            meta: null,
          },
          {
            id: `system:quote-updated:${quote.id}`,
            occurredAt: quote.updated_at,
            title: 'Quote Updated',
            details: `Status is currently ${quote.status}.`,
            type: 'quote_updated',
            meta: null,
          },
          {
            id: `system:quote-items:${quote.id}`,
            occurredAt: quote.updated_at,
            title: 'Quote Items Updated',
            details: `${items.length} item(s) in this quote. Total ${quote.currency} ${quote.total_amount.toFixed(2)}.`,
            type: 'quote_updated',
            meta: null,
          },
          ...(quote.deal_id
            ? [
                {
                  id: `system:quote-linked-deal:${quote.id}`,
                  occurredAt: quote.updated_at,
                  title: 'Linked Deal',
                  details: `Linked to deal ${shortCode(quote.deal_id)}.`,
                  type: 'deal_created',
                  meta: null,
                } as RecordTimelineEvent,
              ]
            : []),
          ...(quote.lead_id
            ? [
                {
                  id: `system:quote-linked-lead:${quote.id}`,
                  occurredAt: quote.updated_at,
                  title: 'Linked Lead',
                  details: `Linked to lead ${shortCode(quote.lead_id)}.`,
                  type: 'lead_created',
                  meta: null,
                } as RecordTimelineEvent,
              ]
            : []),
          {
            id: `system:quote-pdf:${quote.id}`,
            occurredAt: quote.updated_at,
            title: 'PDF Status',
            details: `Proposal PDF is ${pdfStatus?.status || 'not_generated'}.`,
            type: 'quote_pdf_status',
            meta: null,
          },
        ]
      : [];

    return [...activityEvents, ...systemEvents];
  }, [activitiesQuery.data?.items, items.length, pdfStatus?.status, quote]);

  useEffect(() => {
    if (!quote) return;
    setEmailSubject(`Quote ${quote.quote_number} from Dubai Garments`);
    setEmailMessage(
      `Hello,\n\nYour quote ${quote.quote_number} is ready for review.\n\nTotal: ${quote.currency} ${quote.total_amount.toFixed(2)}\n\nRegards,\nDubai Garments Sales Team`
    );
    setQuoteEmailSuccess(null);
    setQuoteEmailError(null);
    setQuoteEmailDraftMeta(null);
    setTargetStatus(isQuoteStatus(quote.status) ? quote.status : 'draft');
  }, [quote]);

  async function handleStatusChange(status: 'draft' | 'sent' | 'approved' | 'rejected' | 'expired') {
    if (!quoteId) return;
    setStatusActionSuccess(null);
    setStatusActionError(null);
    try {
      await updateStatusMutation.mutateAsync({
        quoteId,
        payload: { status, notes: notes || undefined },
      });
      setStatusActionSuccess(`Quote status updated to ${status}.`);
    } catch (error) {
      setStatusActionError(getErrorMessage(error, 'Failed to update quote status.'));
    }
  }

  async function handleGeneratePdf() {
    if (!quoteId) return;
    await generatePdfMutation.mutateAsync(quoteId);
  }

  async function handleDraftQuoteEmail() {
    if (!quoteId) return;
    setIsDraftingQuoteEmail(true);
    setQuoteEmailSuccess(null);
    setQuoteEmailError(null);
    setQuoteEmailDraftMeta(null);
    try {
      const response = await fetch(`/api/admin/quotes/${quoteId}/draft-email`, {
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
        throw new Error(payload.detail || payload.message || 'Failed to generate quote email draft.');
      }

      if (payload.draft.recipient_email) setEmailRecipient(payload.draft.recipient_email);
      if (payload.draft.subject) setEmailSubject(payload.draft.subject);
      if (payload.draft.message) setEmailMessage(payload.draft.message);
      setQuoteEmailDraftMeta(
        `Draft generated via ${payload.draft.provider || 'system'}${payload.draft.fallback_used ? ' (fallback)' : ''}.`
      );
    } catch (error) {
      setQuoteEmailError(error instanceof Error ? error.message : 'Failed to generate AI draft.');
    } finally {
      setIsDraftingQuoteEmail(false);
    }
  }

  async function handleSendQuoteEmail() {
    if (!quoteId || !quote) return;
    setIsSendingQuoteEmail(true);
    setQuoteEmailSuccess(null);
    setQuoteEmailError(null);
    try {
      const response = await fetch('/api/admin/emails/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quote_id: quoteId,
          recipient_email: emailRecipient.trim(),
          subject: emailSubject.trim(),
          message: emailMessage.trim(),
        }),
      });
      const payload = (await response.json()) as { message?: string; detail?: string };
      if (!response.ok) {
        throw new Error(payload.detail || payload.message || 'Failed to send quote email.');
      }
      setQuoteEmailSuccess(payload.message || 'Quote email sent successfully.');
    } catch (error) {
      setQuoteEmailError(error instanceof Error ? error.message : 'Failed to send quote email.');
    } finally {
      setIsSendingQuoteEmail(false);
    }
  }

  return (
    <AdminShell>
      <PageShell density="compact">
      <Panel>
        <AdminPageHeader
          title={quote ? `Quote ${quote.quote_number}` : 'Quote Details'}
          subtitle="Update quote status, review quote line items, and close outcome."
          actions={
            <Toolbar>
              <Link href="/admin/quotes" className="ui-btn ui-btn-secondary ui-btn-md">
                Back to Quotes
              </Link>
              <Link href="/admin/deals" className="ui-btn ui-btn-secondary ui-btn-md">
                Deals
              </Link>
              {quote?.lead_id ? (
                <Link href={`/admin/leads/${quote.lead_id}`} className="ui-btn ui-btn-secondary ui-btn-md">
                  Open Lead
                </Link>
              ) : null}
            </Toolbar>
          }
        />
      </Panel>

      {isLoading && (
        <Panel>
          <Card>
            <p className="dg-muted-sm">Loading quote...</p>
          </Card>
        </Panel>
      )}

      {isError && (
        <Panel>
          <Card>
            <p className="dg-alert-error">
              {error instanceof Error ? error.message : 'Failed to load quote.'}
            </p>
          </Card>
        </Panel>
      )}

      {!isLoading && !isError && !quote ? (
        <Panel>
          <Card>
            <p className="dg-alert-error">
              Quote not found or you do not have access to this record.
            </p>
          </Card>
        </Panel>
      ) : null}

      {quote && !isLoading && !isError && (
        <Panel>
          <div className="dg-two-col-grid dg-two-col-grid-compact">
            <div className="dg-side-stack">
              <Card>
                <h2 className="dg-title-sm">Quote Summary</h2>
                <div className="dg-detail-list">
                  <div className="dg-detail-item">
                    <span>Status</span>
                    <span className={`dg-status-pill dg-status-pill-${quote.status.toUpperCase()}`}>
                      {quote.status}
                    </span>
                  </div>
                  <div className="dg-detail-item">
                    <span>Customer</span>
                    <strong>{quote.customer_company_name || quote.customer_id}</strong>
                  </div>
                  <div className="dg-detail-item">
                    <span>Lead</span>
                    <strong>
                      {quote.lead_id ? (
                        <Link href={`/admin/leads/${quote.lead_id}`} className="dg-link-primary">
                          {shortCode(quote.lead_id)}
                        </Link>
                      ) : (
                        '-'
                      )}
                    </strong>
                  </div>
                  <div className="dg-detail-item">
                    <span>Currency</span>
                    <strong>{quote.currency}</strong>
                  </div>
                  <div className="dg-detail-item">
                    <span>Subtotal</span>
                    <strong>
                      {quote.currency} {quote.subtotal.toFixed(2)}
                    </strong>
                  </div>
                  <div className="dg-detail-item">
                    <span>Tax</span>
                    <strong>
                      {quote.currency} {quote.tax_amount.toFixed(2)}
                    </strong>
                  </div>
                  <div className="dg-detail-item">
                    <span>Discount</span>
                    <strong>
                      {quote.currency} {quote.discount_amount.toFixed(2)}
                    </strong>
                  </div>
                  <div className="dg-detail-item">
                    <span>Total</span>
                    <strong>
                      {quote.currency} {quote.total_amount.toFixed(2)}
                    </strong>
                  </div>
                </div>
              </Card>

              <RecordTimeline
                title="Quote Timeline"
                events={timelineEvents}
                emptyText="No activity timeline available for this quote yet."
                isLoading={activitiesQuery.isLoading}
                errorText={
                  activitiesQuery.isError
                    ? activitiesQuery.error instanceof Error
                      ? activitiesQuery.error.message
                      : 'Failed to load quote timeline.'
                    : null
                }
              />
            </div>

            <div className="dg-side-stack">
              <Card className="min-w-0">
                <h2 className="dg-title-sm">Quote Items</h2>
                <p className="dg-muted-sm">Summary in key-value format for quote line items.</p>
                <div className="dg-mt-2">
                  <QuoteItemsSummarySection currency={quote.currency} items={items} />
                </div>
              </Card>

              <Card className="dg-summary-card">
                <h3 className="dg-title-sm">Status Actions</h3>
                {statusActionSuccess ? <div className="dg-alert-success">{statusActionSuccess}</div> : null}
                {statusActionError ? <div className="dg-alert-error">{statusActionError}</div> : null}
                <div className="dg-field">
                  <FieldLabel htmlFor="quoteTargetStatus">Set Next Status</FieldLabel>
                  <div className="dg-form-row">
                    <select
                      id="quoteTargetStatus"
                      className="dg-input"
                      value={targetStatus}
                      onChange={(event) => {
                        const value = event.target.value;
                        if (isQuoteStatus(value)) setTargetStatus(value);
                      }}
                    >
                      {statusOptions.map((status) => (
                        <option key={status} value={status}>
                          {titleCase(status)}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="ui-btn ui-btn-primary ui-btn-md"
                      disabled={updateStatusMutation.isPending || targetStatus === quote.status}
                      onClick={() => handleStatusChange(targetStatus)}
                    >
                      {updateStatusMutation.isPending ? 'Applying...' : `Apply ${titleCase(targetStatus)}`}
                    </button>
                  </div>
                  <p className="dg-help">Current status: {titleCase(quote.status)}</p>
                </div>

                <div className="dg-field">
                  <FieldLabel>Quick Actions</FieldLabel>
                  <div className="dg-form-row">
                    {getQuickStatusActions(isQuoteStatus(quote.status) ? quote.status : 'draft').map((status) => (
                      <button
                        key={status}
                        type="button"
                        className="ui-btn ui-btn-secondary ui-btn-md"
                        disabled={updateStatusMutation.isPending || status === quote.status}
                        onClick={() => handleStatusChange(status)}
                      >
                        Set {titleCase(status)}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mt-3">
                  <FieldLabel htmlFor="statusNotes">Status Notes</FieldLabel>
                  <TextAreaField
                    id="statusNotes"
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder="Add notes for status transition..."
                  />
                </div>
              </Card>

              <Card className="dg-summary-card">
                <h3 className="dg-title-sm">Proposal PDF</h3>
                <p className="dg-muted-sm">
                  Generate a professional PDF proposal and share it with the customer.
                </p>
                <div className="dg-hero-actions">
                  <button
                    type="button"
                    className="ui-btn ui-btn-primary ui-btn-md"
                    disabled={generatePdfMutation.isPending}
                    onClick={handleGeneratePdf}
                  >
                    {generatePdfMutation.isPending ? 'Queueing...' : 'Generate PDF'}
                  </button>
                  {pdfStatus?.status === 'generated' ? (
                    <a
                      href={`/api/admin/quotes/${quote.id}/pdf/download`}
                      className="ui-btn ui-btn-secondary ui-btn-md"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Open PDF
                    </a>
                  ) : null}
                </div>
                <p className="dg-help">
                  Status: {pdfStatus?.status || 'not_generated'}
                  {pdfStatus?.document?.error_message
                    ? ` (${pdfStatus.document.error_message})`
                    : ''}
                </p>
              </Card>

              <Card className="dg-summary-card">
                <h3 className="dg-title-sm">Quote Email Composer</h3>
                <p className="dg-muted-sm">Generate AI draft and send quote email from admin.</p>
                {quoteEmailSuccess ? <div className="dg-alert-success">{quoteEmailSuccess}</div> : null}
                {quoteEmailError ? <div className="dg-alert-error">{quoteEmailError}</div> : null}
                {quoteEmailDraftMeta ? <p className="dg-help">{quoteEmailDraftMeta}</p> : null}
                <div className="dg-field">
                  <FieldLabel htmlFor="quoteEmailRecipient">Recipient Email</FieldLabel>
                  <input
                    id="quoteEmailRecipient"
                    className="dg-input"
                    type="email"
                    value={emailRecipient}
                    onChange={(event) => setEmailRecipient(event.target.value)}
                    placeholder="customer@company.com"
                    required
                  />
                </div>
                <div className="dg-field">
                  <FieldLabel htmlFor="quoteEmailSubject">Subject</FieldLabel>
                  <input
                    id="quoteEmailSubject"
                    className="dg-input"
                    value={emailSubject}
                    onChange={(event) => setEmailSubject(event.target.value)}
                    required
                  />
                </div>
                <div className="dg-field">
                  <FieldLabel htmlFor="quoteEmailMessage">Message</FieldLabel>
                  <TextAreaField
                    id="quoteEmailMessage"
                    value={emailMessage}
                    onChange={(event) => setEmailMessage(event.target.value)}
                    rows={7}
                  />
                </div>
                <div className="dg-form-row">
                  <button
                    type="button"
                    className="ui-btn ui-btn-secondary ui-btn-md"
                    onClick={() => void handleDraftQuoteEmail()}
                    disabled={isDraftingQuoteEmail}
                  >
                    {isDraftingQuoteEmail ? 'Drafting...' : 'AI Draft Quote Email'}
                  </button>
                  <button
                    type="button"
                    className="ui-btn ui-btn-primary ui-btn-md"
                    onClick={() => void handleSendQuoteEmail()}
                    disabled={isSendingQuoteEmail}
                  >
                    {isSendingQuoteEmail ? 'Sending...' : 'Send Email'}
                  </button>
                </div>
              </Card>
            </div>

          </div>
        </Panel>
      )}
      </PageShell>
    </AdminShell>
  );
}
