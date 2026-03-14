'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useParams } from 'next/navigation';
import AdminShell from '@/components/admin/admin-shell';
import AdminPageHeader from '@/components/admin/common/page-header';
import { Card, FieldLabel, PageShell, Panel, TextAreaField, Toolbar } from '@/components/ui';
import {
  useGenerateQuotePdf,
  useQuoteById,
  useQuotePdfStatus,
  useUpdateQuoteStatus,
} from '@/features/admin/quotes';

const statusOptions: Array<'draft' | 'sent' | 'approved' | 'rejected' | 'expired'> = [
  'draft',
  'sent',
  'approved',
  'rejected',
  'expired',
];

export default function AdminQuoteDetailPage() {
  const params = useParams<{ quoteId: string }>();
  const quoteId = params?.quoteId;
  const { data, isLoading, isError, error } = useQuoteById(quoteId);
  const { data: pdfStatus } = useQuotePdfStatus(quoteId);
  const updateStatusMutation = useUpdateQuoteStatus();
  const generatePdfMutation = useGenerateQuotePdf();
  const [notes, setNotes] = useState('');

  const quote = data?.item;
  const items = data?.items ?? [];

  async function handleStatusChange(status: 'draft' | 'sent' | 'approved' | 'rejected' | 'expired') {
    if (!quoteId) return;
    await updateStatusMutation.mutateAsync({
      quoteId,
      payload: { status, notes: notes || undefined },
    });
  }

  async function handleGeneratePdf() {
    if (!quoteId) return;
    await generatePdfMutation.mutateAsync(quoteId);
  }

  return (
    <AdminShell>
      <PageShell density="compact">
      <Panel>
        <AdminPageHeader
          title={quote ? `Quote ${quote.quote_number}` : 'Quote Details'}
          subtitle="Update quote status, review pricing breakdown, and close outcome."
          actions={
            <Toolbar>
              <Link href="/admin/quotes" className="ui-btn ui-btn-secondary ui-btn-md">
                Back to Quotes
              </Link>
              <Link href="/admin/deals" className="ui-btn ui-btn-secondary ui-btn-md">
                Deals
              </Link>
            </Toolbar>
          }
        />
      </Panel>

      {isLoading && (
        <Panel>
          <Card>
            <p className="text-sm text-[var(--color-text-muted)]">Loading quote...</p>
          </Card>
        </Panel>
      )}

      {isError && (
        <Panel>
          <Card>
            <p className="text-sm text-[var(--color-danger-text)]">
              {error instanceof Error ? error.message : 'Failed to load quote.'}
            </p>
          </Card>
        </Panel>
      )}

      {quote && !isLoading && !isError && (
        <Panel>
          <div className="dg-two-col-grid">
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

              <Card className="dg-summary-card">
                <h3 className="dg-title-sm">Status Actions</h3>
                <div className="dg-form-row">
                  {statusOptions.map((status) => (
                    <button
                      key={status}
                      type="button"
                      className="ui-btn ui-btn-secondary ui-btn-md"
                      disabled={updateStatusMutation.isPending || status === quote.status}
                      onClick={() => handleStatusChange(status)}
                    >
                      Set {status}
                    </button>
                  ))}
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
            </Card>

            <Card>
              <h2 className="dg-title-sm">Quote Items</h2>
              <div className="ui-table-wrap">
                <table className="ui-table">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Qty</th>
                      <th>Unit Price</th>
                      <th>Line Total</th>
                      <th>Pricing Breakdown</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.id}>
                        <td>{item.item_name}</td>
                        <td>{item.quantity}</td>
                        <td>
                          {quote.currency} {item.unit_price.toFixed(2)}
                        </td>
                        <td>
                          {quote.currency} {item.line_total.toFixed(2)}
                        </td>
                        <td>
                          <pre className="whitespace-pre-wrap text-xs text-[var(--color-text-muted)]">
                            {JSON.stringify(item.pricing_breakdown, null, 2)}
                          </pre>
                        </td>
                      </tr>
                    ))}
                    {items.length === 0 && (
                      <tr>
                        <td colSpan={5}>No quote items found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </Panel>
      )}
      </PageShell>
    </AdminShell>
  );
}
