'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import AdminPageHeader from '@/components/admin/common/page-header';
import AdminShell from '@/components/admin/admin-shell';
import {
  FieldGroup,
  FieldHint,
  FieldLabel,
  PageShell,
  Panel,
  StatusBadge,
  TextField,
  Toolbar,
} from '@/components/ui';
import { useQuotes, useUpdateQuoteStatus } from '@/features/admin/quotes';
import { formatDate, titleCase } from '@/features/admin/shared/view-format';

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
      <PageShell density="compact">
        <Panel>
          <AdminPageHeader
            title="Quote Management"
            subtitle="Manage draft, sent, approved, rejected, and expired quotations across all deals."
            actions={
              <Toolbar>
                <Link href="/admin/dashboard" className="ui-btn ui-btn-secondary ui-btn-md">
                  Dashboard
                </Link>
                <Link href="/admin/deals" className="ui-btn ui-btn-secondary ui-btn-md">
                  Deals
                </Link>
              </Toolbar>
            }
          />

          <div className="dg-form-row">
            <FieldGroup className="dg-col-fill">
              <FieldLabel htmlFor="quoteSearch">Search Quotes</FieldLabel>
              <TextField
                id="quoteSearch"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by quote number, customer, company, notes..."
              />
              <FieldHint>Search by quote number, company, or notes.</FieldHint>
            </FieldGroup>
            <FieldGroup>
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
              <FieldHint>Leave as All Statuses for full visibility.</FieldHint>
            </FieldGroup>
            <button type="button" className="ui-btn ui-btn-primary ui-btn-md">
              Apply
            </button>
          </div>
        </Panel>

        <Panel>
          <div className="dg-admin-head">
            <h2 className="dg-title-sm">Quotes</h2>
            <span className="dg-badge">{quotes.length} Total</span>
          </div>

          {isLoading && <p className="dg-muted-sm">Loading quotes...</p>}
          {isError && (
            <p className="dg-alert-error">
              {error instanceof Error ? error.message : 'Failed to load quotes.'}
            </p>
          )}

          {!isLoading && !isError && (
            <div className="ui-table-wrap">
              <table className="ui-table ui-table-density-compact">
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
                        <StatusBadge status={quote.status}>{titleCase(quote.status)}</StatusBadge>
                      </td>
                      <td>
                        {quote.currency} {quote.total_amount.toFixed(2)}
                      </td>
                      <td>{formatDate(quote.valid_until)}</td>
                      <td className="dg-form-row">
                        <Link href={`/admin/quotes/${quote.id}`} className="ui-btn ui-btn-secondary ui-btn-md">
                          Open
                        </Link>
                        {quote.status === 'draft' && (
                          <button
                            type="button"
                            className="ui-btn ui-btn-secondary ui-btn-md"
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
                              className="ui-btn ui-btn-secondary ui-btn-md"
                              disabled={updateStatusMutation.isPending}
                              onClick={() => handleQuickStatus(quote.id, 'approved')}
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              className="ui-btn ui-btn-secondary ui-btn-md"
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
        </Panel>
      </PageShell>
    </AdminShell>
  );
}
