'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import AdminShell from '@/components/admin/admin-shell';
import { Button, Card, FieldLabel, TextField } from '@/components/ui';
import { useQuotes, useUpdateQuoteStatus } from '@/features/admin/quotes';

export default function AdminQuotesPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');

  const filters = useMemo(
    () => ({
      search: search || undefined,
      status: status || undefined,
    }),
    [search, status]
  );

  const { data, isLoading, isError, error } = useQuotes(filters);
  const updateStatusMutation = useUpdateQuoteStatus();
  const quotes = data?.items ?? [];

  async function handleQuickStatus(quoteId: string, nextStatus: 'sent' | 'approved' | 'rejected') {
    await updateStatusMutation.mutateAsync({
      quoteId,
      payload: { status: nextStatus },
    });
  }

  return (
    <AdminShell>
      <section className="dg-admin-page">
        <div className="dg-admin-page-head">
          <div>
            <h1 className="dg-page-title">Quote Management</h1>
            <p className="dg-page-subtitle">
              Manage draft, sent, approved, rejected, and expired quotations across all deals.
            </p>
          </div>
          <div className="dg-admin-toolbar">
            <Link href="/admin/dashboard" className="dg-btn-secondary">
              Dashboard
            </Link>
            <Link href="/admin/deals" className="dg-btn-secondary">
              Deals
            </Link>
          </div>
        </div>

        <Card className="dg-panel">
          <div className="dg-form-row">
            <div className="dg-col-fill">
              <FieldLabel htmlFor="quoteSearch">Search Quotes</FieldLabel>
              <TextField
                id="quoteSearch"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by quote number, customer, company, notes..."
              />
            </div>
            <div>
              <FieldLabel htmlFor="quoteStatus">Status</FieldLabel>
              <select
                id="quoteStatus"
                className="dg-select dg-select-md"
                value={status}
                onChange={(event) => setStatus(event.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="draft">draft</option>
                <option value="sent">sent</option>
                <option value="approved">approved</option>
                <option value="rejected">rejected</option>
                <option value="expired">expired</option>
              </select>
            </div>
            <Button type="button" size="sm">
              Apply
            </Button>
          </div>
        </Card>
      </section>

      <section className="dg-admin-page">
        <Card className="dg-panel">
          <div className="dg-admin-head">
            <h2 className="dg-title-sm">Quotes</h2>
            <span className="dg-badge">{quotes.length} Total</span>
          </div>

          {isLoading && <p className="text-sm text-[var(--color-text-muted)]">Loading quotes...</p>}
          {isError && (
            <p className="text-sm text-[var(--color-danger-text)]">
              {error instanceof Error ? error.message : 'Failed to load quotes.'}
            </p>
          )}

          {!isLoading && !isError && (
            <div className="dg-table-wrap">
              <table className="dg-table">
                <thead>
                  <tr>
                    <th>Quote #</th>
                    <th>Deal</th>
                    <th>Customer</th>
                    <th>Status</th>
                    <th>Total</th>
                    <th>Expires</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {quotes.map((quote) => (
                    <tr key={quote.id}>
                      <td>{quote.quote_number || '-'}</td>
                      <td>{quote.deal_id ? `#${quote.deal_id}` : '-'}</td>
                      <td>{quote.customer_company_name || quote.customer_id || '-'}</td>
                      <td>
                        <span className={`dg-status-pill dg-status-pill-${quote.status.toUpperCase()}`}>
                          {quote.status}
                        </span>
                      </td>
                      <td>
                        {quote.currency} {quote.total_amount.toFixed(2)}
                      </td>
                      <td>{quote.valid_until ? new Date(quote.valid_until).toLocaleDateString() : '-'}</td>
                      <td className="dg-form-row">
                        <Link href={`/admin/quotes/${quote.id}`} className="dg-btn-secondary">
                          Open
                        </Link>
                        {quote.status === 'draft' && (
                          <button
                            type="button"
                            className="dg-btn-secondary"
                            disabled={updateStatusMutation.isPending}
                            onClick={() => handleQuickStatus(quote.id, 'sent')}
                          >
                            Mark Sent
                          </button>
                        )}
                        {quote.status === 'sent' && (
                          <>
                            <button
                              type="button"
                              className="dg-btn-secondary"
                              disabled={updateStatusMutation.isPending}
                              onClick={() => handleQuickStatus(quote.id, 'approved')}
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              className="dg-btn-secondary"
                              disabled={updateStatusMutation.isPending}
                              onClick={() => handleQuickStatus(quote.id, 'rejected')}
                            >
                              Reject
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                  {quotes.length === 0 && (
                    <tr>
                      <td colSpan={7}>No quotes found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </section>
    </AdminShell>
  );
}
