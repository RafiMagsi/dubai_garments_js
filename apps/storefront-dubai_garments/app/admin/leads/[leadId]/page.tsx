'use client';

import Link from 'next/link';
import { FormEvent, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import AdminPageHeader from '@/components/admin/common/page-header';
import AdminShell from '@/components/admin/admin-shell';
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
  const [dealSuccess, setDealSuccess] = useState<string | null>(null);

  const lead = data?.item;
  const deal = data?.deal;
  const communications = useMemo(() => data?.communications ?? [], [data?.communications]);

  async function handleStatusUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!lead) return;
    const formData = new FormData(event.currentTarget);
    const status = String(formData.get('status') || '').toLowerCase() as LeadStatus;
    await updateStatusMutation.mutateAsync({
      leadId: lead.id,
      payload: { status },
    });
  }

  async function handleCreateDeal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!lead) return;

    const formData = new FormData(event.currentTarget);
    const priority = String(formData.get('priority') || 'medium');
    const valueEstimateRaw = String(formData.get('value_estimate') || '');
    const notes = String(formData.get('notes') || '').trim();
    const probability =
      priority === 'high' ? 75 : priority === 'low' ? 30 : 50;

    const result = await convertToDealMutation.mutateAsync({
      leadId: lead.id,
      payload: {
        title: `${lead.company_name || lead.contact_name || 'Company'} Opportunity`,
        expected_value: valueEstimateRaw ? Number(valueEstimateRaw) : 0,
        probability_pct: probability,
        notes: notes || undefined,
      },
    });

    setDealSuccess(`Deal created successfully: #${shortCode(result.id)}`);
  }

  async function handleSendEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!lead) return;

    const formData = new FormData(event.currentTarget);
    const recipient_email = String(formData.get('recipient_email') || '').trim();
    const subject = String(formData.get('subject') || '').trim();
    const message = String(formData.get('message') || '').trim();

    const response = await sendLeadEmailMutation.mutateAsync({
      leadId: lead.id,
      payload: { recipient_email, subject, message },
    });
    setEmailSuccess(response.message);
  }

  return (
    <AdminShell>
      <section className="dg-admin-page">
        <AdminPageHeader
          title={`Lead #${shortCode(leadId)}`}
          subtitle="Full context, communication history, and pipeline actions for this lead."
          actions={
            <>
            <Link href="/admin/leads" className="dg-btn-secondary">
              Back to Leads
            </Link>
            <Link href="/admin/deals" className="dg-btn-secondary">
              Pipeline
            </Link>
            </>
          }
        />
      </section>

      <section className="dg-admin-page">
        {isLoading && (
          <div className="dg-card dg-panel">
            <p className="dg-muted-sm">Loading lead details...</p>
          </div>
        )}

        {isError && (
          <div className="dg-card dg-panel">
            <p className="dg-alert-error">
              {error instanceof Error ? error.message : 'Failed to load lead details.'}
            </p>
          </div>
        )}

        {lead && (
          <div className="dg-two-col-grid">
            <div className="dg-card dg-panel">
              <h2 className="dg-title-sm">Lead Information</h2>
              <div className="dg-detail-list">
                <div className="dg-detail-item">
                  <span>Tracking Code</span>
                  <strong>{shortCode(lead.id)}</strong>
                </div>
                <div className="dg-detail-item">
                  <span>Name</span>
                  <strong>{lead.contact_name || '-'}</strong>
                </div>
                <div className="dg-detail-item">
                  <span>Company</span>
                  <strong>{lead.company_name || '-'}</strong>
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
                <div className="dg-detail-item">
                  <span>Status</span>
                  <span className={statusPillClass(lead.status)}>{titleCase(lead.status)}</span>
                </div>
                <div className="dg-detail-item">
                  <span>AI Score</span>
                  <strong>{lead.ai_score ?? '-'}</strong>
                </div>
                <div className="dg-detail-item">
                  <span>Classification</span>
                  <strong>{lead.ai_classification ?? '-'}</strong>
                </div>
              </div>

              <div className="dg-card dg-summary-card">
                <h3 className="dg-title-sm">Customer Message</h3>
                <p className="dg-section-copy">{lead.notes || 'No message submitted.'}</p>
              </div>
            </div>

            <div className="dg-side-stack">
              <div className="dg-card dg-panel">
                <h2 className="dg-title-sm">Update Lead Status</h2>
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
                  <button type="submit" className="dg-btn-primary" disabled={updateStatusMutation.isPending}>
                    {updateStatusMutation.isPending ? 'Saving...' : 'Save Status'}
                  </button>
                </form>
              </div>

              <div className="dg-card dg-panel">
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
                      <Link href={`/admin/deals/${deal.id}`} className="dg-btn-primary">
                        Open Deal
                      </Link>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="dg-muted-sm">No deal exists for this lead yet.</p>
                    {dealSuccess ? <div className="dg-alert-success">{dealSuccess}</div> : null}
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
                        className="dg-btn-primary"
                        disabled={convertToDealMutation.isPending}
                      >
                        {convertToDealMutation.isPending ? 'Creating...' : 'Create Deal'}
                      </button>
                    </form>
                  </>
                )}
              </div>

              <div className="dg-card dg-panel">
                <h2 className="dg-title-sm">Email Communication</h2>
                {emailSuccess ? <div className="dg-alert-success">{emailSuccess}</div> : null}
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
                      defaultValue={lead.email || ''}
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
                      defaultValue={`Regarding your quote request ${shortCode(lead.id)}`}
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
                      defaultValue={`Hello ${lead.contact_name || 'Customer'},\n\nThank you for contacting Dubai Garments. We have received your request and our sales team will follow up shortly.\n\nRegards,\nDubai Garments Sales Team`}
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    className="dg-btn-primary"
                    disabled={sendLeadEmailMutation.isPending}
                  >
                    {sendLeadEmailMutation.isPending ? 'Sending...' : 'Send Email'}
                  </button>
                </form>
              </div>

              <div className="dg-card dg-panel">
                <h2 className="dg-title-sm">AI Processing</h2>
                <div className="dg-detail-list">
                  <div className="dg-detail-item">
                    <span>Provider</span>
                    <strong>{lead.ai_provider || '-'}</strong>
                  </div>
                  <div className="dg-detail-item">
                    <span>Fallback Used</span>
                    <strong>{lead.ai_fallback_used ? 'Yes' : 'No'}</strong>
                  </div>
                  <div className="dg-detail-item">
                    <span>Processed At</span>
                    <strong>
                      {formatDateTime(lead.ai_processed_at)}
                    </strong>
                  </div>
                  <div className="dg-detail-item">
                    <span>Extracted Product</span>
                    <strong>{lead.ai_product || '-'}</strong>
                  </div>
                  <div className="dg-detail-item">
                    <span>Extracted Quantity</span>
                    <strong>{lead.ai_quantity ?? '-'}</strong>
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

              <div className="dg-card dg-panel">
                <h2 className="dg-title-sm">Recent Communications</h2>
                {communications.length > 0 ? (
                  <div className="dg-list">
                    {communications.map((communication) => (
                      <div key={communication.id} className="dg-list-row">
                        <div className="dg-list-main">
                          <p className="dg-list-title">{communication.subject || 'No subject'}</p>
                          <p className="dg-list-meta">
                            {lead.email || '-'} • SENT • {formatDateTime(communication.sent_at || communication.created_at)}
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
