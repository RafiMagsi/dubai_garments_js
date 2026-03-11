'use client';

import Link from 'next/link';
import { FormEvent, useMemo, useState } from 'react';
import AdminPageHeader from '@/components/admin/common/page-header';
import AdminShell from '@/components/admin/admin-shell';
import { LeadStatus, useLeads } from '@/features/admin/leads';
import {
  formatDateTime,
  shortCode,
  titleCase,
} from '@/features/admin/shared/view-format';

const statusOptions: Array<{ label: string; value: LeadStatus | 'all' }> = [
  { label: 'All Statuses', value: 'all' },
  { label: 'New', value: 'new' },
  { label: 'Qualified', value: 'qualified' },
  { label: 'Quoted', value: 'quoted' },
  { label: 'Won', value: 'won' },
  { label: 'Lost', value: 'lost' },
];

function statusPillClass(status: LeadStatus) {
  return `dg-status-pill dg-status-pill-${status.toUpperCase()}`;
}

export default function AdminLeadsPage() {
  const [statusFilter, setStatusFilter] = useState<LeadStatus | 'all'>('all');
  const [searchInput, setSearchInput] = useState('');

  const [appliedStatus, setAppliedStatus] = useState<LeadStatus | 'all'>('all');
  const [appliedSearch, setAppliedSearch] = useState('');

  const filters = useMemo(
    () => ({
      status: appliedStatus,
      search: appliedSearch || undefined,
    }),
    [appliedSearch, appliedStatus]
  );

  const { data, isLoading, isError, error } = useLeads(filters);
  const leads = data?.items ?? [];

  function handleApplyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAppliedSearch(searchInput.trim());
    setAppliedStatus(statusFilter);
  }

  return (
    <AdminShell>
      <section className="dg-admin-page">
        <AdminPageHeader
          title="Lead List"
          subtitle="Review incoming requests, qualify opportunities, and move leads into deals."
          actions={
            <>
            <Link href="/admin/dashboard" className="dg-btn-secondary">
              Dashboard
            </Link>
            <Link href="/admin/deals" className="dg-btn-secondary">
              Deals
            </Link>
            </>
          }
        />

        <div className="dg-card dg-panel">
          <form onSubmit={handleApplyFilters} className="dg-form-row">
            <input
              name="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search by name, company, email, tracking code..."
              className="dg-input dg-col-fill"
            />
            <select
              name="status"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as LeadStatus | 'all')}
              className="dg-select dg-select-md"
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <button type="submit" className="dg-btn-primary">
              Apply
            </button>
          </form>
        </div>
      </section>

      <section className="dg-admin-page">
        <div className="dg-card dg-panel">
          <div className="dg-admin-head">
            <h2 className="dg-title-sm">Leads</h2>
            <span className="dg-badge">{leads.length} Total</span>
          </div>

          {isLoading && <p className="dg-muted-sm">Loading leads...</p>}
          {isError && (
            <p className="dg-alert-error">{error instanceof Error ? error.message : 'Failed to load leads.'}</p>
          )}

          {!isLoading && !isError && (
            <div className="dg-table-wrap">
              <table className="dg-table">
                <thead>
                  <tr>
                    <th>Lead</th>
                    <th>Tracking</th>
                    <th>Product</th>
                    <th>Quantity</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.length === 0 ? (
                    <tr>
                      <td colSpan={7}>No leads found.</td>
                    </tr>
                  ) : (
                    leads.map((lead) => (
                      <tr key={lead.id}>
                        <td>
                          <div>{lead.contact_name || '-'}</div>
                          <div className="dg-help">{lead.email || '-'}</div>
                        </td>
                        <td>{shortCode(lead.id)}</td>
                        <td>{lead.ai_product || '-'}</td>
                        <td>{lead.requested_qty ? `${lead.requested_qty} pcs` : '-'}</td>
                        <td>
                          <span className={statusPillClass(lead.status)}>{titleCase(lead.status)}</span>
                        </td>
                        <td>{formatDateTime(lead.created_at)}</td>
                        <td>
                          <Link href={`/admin/leads/${lead.id}`} className="dg-btn-secondary">
                            View
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </AdminShell>
  );
}
