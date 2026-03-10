'use client';

import { useMemo, useState } from 'react';
import AdminShell from '@/components/admin/admin-shell';
import { Card, DataTable, FieldLabel, TableCell, TableHeadCell, TableHeadRow, TableRow, TextField } from '@/components/ui';
import { useQuotes } from '@/features/admin/quotes';

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
  const quotes = data?.items ?? [];

  return (
    <AdminShell>
      <Card>
        <h1 className="text-xl font-semibold text-[var(--color-text)]">Quotes</h1>
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">
          Review all generated quotes and total amounts.
        </p>
      </Card>

      <Card>
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
          <div>
            <FieldLabel htmlFor="quoteSearch">Search Quotes</FieldLabel>
            <TextField
              id="quoteSearch"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Quote number, company, notes"
            />
          </div>
          <div>
            <FieldLabel htmlFor="quoteStatus">Status</FieldLabel>
            <select
              id="quoteStatus"
              className="ui-field"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              <option value="">All statuses</option>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="expired">Expired</option>
            </select>
          </div>
        </div>
      </Card>

      {isLoading && (
        <Card>
          <p className="text-sm text-[var(--color-text-muted)]">Loading quotes...</p>
        </Card>
      )}

      {isError && (
        <Card>
          <p className="text-sm text-[var(--color-danger-text)]">
            {error instanceof Error ? error.message : 'Failed to load quotes.'}
          </p>
        </Card>
      )}

      {!isLoading && !isError && (
        <Card>
          <DataTable>
            <thead>
              <TableHeadRow>
                <TableHeadCell>Quote #</TableHeadCell>
                <TableHeadCell>Customer</TableHeadCell>
                <TableHeadCell>Status</TableHeadCell>
                <TableHeadCell>Total</TableHeadCell>
                <TableHeadCell>Created</TableHeadCell>
              </TableHeadRow>
            </thead>
            <tbody>
              {quotes.map((quote) => (
                <TableRow key={quote.id}>
                  <TableCell className="font-semibold">{quote.quote_number}</TableCell>
                  <TableCell>{quote.customer_company_name || quote.customer_id}</TableCell>
                  <TableCell className="uppercase">{quote.status}</TableCell>
                  <TableCell>
                    {quote.currency} {quote.total_amount.toFixed(2)}
                  </TableCell>
                  <TableCell>{new Date(quote.created_at).toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </tbody>
          </DataTable>
          {quotes.length === 0 && (
            <p className="mt-3 text-sm text-[var(--color-text-muted)]">No quotes found.</p>
          )}
        </Card>
      )}
    </AdminShell>
  );
}
