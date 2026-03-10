'use client';

import Link from 'next/link';
import { FormEvent, useMemo, useState } from 'react';
import AdminShell from '@/components/admin/admin-shell';
import { LeadStatus, useLeadById, useLeads, useUpdateLeadStatus } from '@/features/admin/leads';

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

function formatStatus(status: LeadStatus) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function nextStatus(current: LeadStatus): LeadStatus | null {
  if (current === 'new') return 'qualified';
  if (current === 'qualified') return 'quoted';
  if (current === 'quoted') return 'won';
  return null;
}

export default function AdminLeadsPage() {
  const [statusFilter, setStatusFilter] = useState<LeadStatus | 'all'>('all');
  const [searchInput, setSearchInput] = useState('');
  const [selectedLeadId, setSelectedLeadId] = useState<string | undefined>(undefined);

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
  const { data: leadDetail, isLoading: isLeadLoading } = useLeadById(selectedLeadId);
  const updateStatusMutation = useUpdateLeadStatus();

  const leads = data?.items ?? [];
  const selectedLead = leadDetail?.item;

  function handleApplyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAppliedSearch(searchInput.trim());
    setAppliedStatus(statusFilter);
  }

  return (
    <AdminShell>
      <section className="dg-admin-page">
        <div className="dg-admin-page-head">
          <div>
            <h1 className="dg-page-title">Lead Management</h1>
            <p className="dg-page-subtitle">
              Review incoming requests, qualify opportunities, and move leads into deals.
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
                        <td>{lead.id.slice(0, 6).toUpperCase()}</td>
                        <td>{lead.ai_product || '-'}</td>
                        <td>{lead.requested_qty ? `${lead.requested_qty} pcs` : '-'}</td>
                        <td>
                          <span className={statusPillClass(lead.status)}>{formatStatus(lead.status)}</span>
                        </td>
                        <td>{new Date(lead.created_at).toLocaleString()}</td>
                        <td>
                          <button
                            type="button"
                            className="dg-btn-secondary"
                            onClick={() => setSelectedLeadId(lead.id)}
                          >
                            View
                          </button>
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

      {selectedLeadId && (
        <section className="dg-admin-page">
          <div className="dg-card dg-panel">
            <div className="dg-admin-head">
              <h2 className="dg-title-sm">Lead Details</h2>
              {selectedLead ? (
                <span className={statusPillClass(selectedLead.status)}>{formatStatus(selectedLead.status)}</span>
              ) : null}
            </div>

            {isLeadLoading && <p className="dg-muted-sm">Loading lead details...</p>}
            {!isLeadLoading && !selectedLead && (
              <p className="dg-muted-sm">Unable to load selected lead details.</p>
            )}

            {selectedLead && (
              <>
                <div className="dg-detail-list">
                  <div className="dg-detail-item">
                    <span>Contact</span>
                    <strong>{selectedLead.contact_name || '-'}</strong>
                  </div>
                  <div className="dg-detail-item">
                    <span>Company</span>
                    <strong>{selectedLead.company_name || '-'}</strong>
                  </div>
                  <div className="dg-detail-item">
                    <span>Email</span>
                    <strong>{selectedLead.email || '-'}</strong>
                  </div>
                  <div className="dg-detail-item">
                    <span>Phone</span>
                    <strong>{selectedLead.phone || '-'}</strong>
                  </div>
                  <div className="dg-detail-item">
                    <span>Requested Quantity</span>
                    <strong>{selectedLead.requested_qty ? `${selectedLead.requested_qty} pcs` : '-'}</strong>
                  </div>
                  <div className="dg-detail-item">
                    <span>Notes</span>
                    <strong>{selectedLead.notes || '-'}</strong>
                  </div>
                </div>

                {nextStatus(selectedLead.status) && (
                  <div className="dg-hero-actions">
                    <button
                      type="button"
                      className="dg-btn-primary"
                      disabled={updateStatusMutation.isPending}
                      onClick={() =>
                        updateStatusMutation.mutate({
                          leadId: selectedLead.id,
                          payload: { status: nextStatus(selectedLead.status) as LeadStatus },
                        })
                      }
                    >
                      {updateStatusMutation.isPending
                        ? 'Updating...'
                        : `Move To ${formatStatus(nextStatus(selectedLead.status) as LeadStatus)}`}
                    </button>
                    <button
                      type="button"
                      className="dg-btn-secondary"
                      disabled={updateStatusMutation.isPending}
                      onClick={() =>
                        updateStatusMutation.mutate({
                          leadId: selectedLead.id,
                          payload: { status: 'lost' },
                        })
                      }
                    >
                      Mark Lost
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      )}
    </AdminShell>
  );
}
