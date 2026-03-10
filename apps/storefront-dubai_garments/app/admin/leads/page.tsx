'use client';

import { FormEvent, useMemo, useState } from 'react';
import AdminShell from '@/components/admin/admin-shell';
import { Button, Card, FieldLabel, TextAreaField, TextField } from '@/components/ui';
import { LeadStatus, useCreateLead, useLeadById, useLeads, useUpdateLeadStatus } from '@/features/admin/leads';

const statusOptions: Array<{ label: string; value: LeadStatus | 'all' }> = [
  { label: 'All Statuses', value: 'all' },
  { label: 'New', value: 'new' },
  { label: 'Qualified', value: 'qualified' },
  { label: 'Quoted', value: 'quoted' },
  { label: 'Won', value: 'won' },
  { label: 'Lost', value: 'lost' },
];

const statusFlow: LeadStatus[] = ['new', 'qualified', 'quoted', 'won', 'lost'];

function nextStatus(current: LeadStatus): LeadStatus {
  const index = statusFlow.indexOf(current);
  return statusFlow[Math.min(index + 1, statusFlow.length - 1)];
}

export default function AdminLeadsPage() {
  const [statusFilter, setStatusFilter] = useState<LeadStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [selectedLeadId, setSelectedLeadId] = useState<string | undefined>(undefined);

  const filters = useMemo(
    () => ({
      status: statusFilter,
      search: search || undefined,
    }),
    [statusFilter, search]
  );

  const { data, isLoading, isError, error } = useLeads(filters);
  const {
    data: leadDetail,
    isLoading: isLoadingDetail,
  } = useLeadById(selectedLeadId);
  const createLeadMutation = useCreateLead();
  const updateStatusMutation = useUpdateLeadStatus();
  const leads = useMemo(() => data?.items ?? [], [data?.items]);
  const selectedLead = leadDetail?.item;

  const leadCounts = useMemo(() => {
    return leads.reduce(
      (accumulator, lead) => {
        accumulator.total += 1;
        accumulator[lead.status] += 1;
        return accumulator;
      },
      { total: 0, new: 0, qualified: 0, quoted: 0, won: 0, lost: 0 }
    );
  }, [leads]);

  async function handleCreateLead(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const contact_name = String(formData.get('contact_name') || '').trim();
    const company_name = String(formData.get('company_name') || '').trim();
    const email = String(formData.get('email') || '').trim();
    const phone = String(formData.get('phone') || '').trim();
    const requested_qty_raw = String(formData.get('requested_qty') || '').trim();
    const notes = String(formData.get('notes') || '').trim();

    await createLeadMutation.mutateAsync({
      contact_name,
      company_name: company_name || undefined,
      email: email || undefined,
      phone: phone || undefined,
      requested_qty: requested_qty_raw ? Number(requested_qty_raw) : undefined,
      notes: notes || undefined,
      status: 'new',
      source: 'admin',
    });

    event.currentTarget.reset();
  }

  return (
    <AdminShell>
      <Card>
        <h1 className="text-xl font-semibold text-[var(--color-text)]">Lead Module</h1>
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">
          Store and manage incoming quote requests with status tracking.
        </p>
      </Card>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Card className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-ink-500)]">
            Total Leads
          </p>
          <p className="text-3xl font-semibold text-[var(--color-text)]">{leadCounts.total}</p>
          <p className="text-sm text-[var(--color-text-muted)]">All incoming opportunities in the system.</p>
        </Card>
        <Card className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-ink-500)]">New</p>
          <p className="text-3xl font-semibold text-[var(--color-text)]">{leadCounts.new}</p>
          <p className="text-sm text-[var(--color-text-muted)]">Fresh inquiries waiting for qualification.</p>
        </Card>
        <Card className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-ink-500)]">Qualified</p>
          <p className="text-3xl font-semibold text-[var(--color-text)]">{leadCounts.qualified}</p>
          <p className="text-sm text-[var(--color-text-muted)]">Leads ready for active sales follow-up.</p>
        </Card>
        <Card className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-ink-500)]">Quoted</p>
          <p className="text-3xl font-semibold text-[var(--color-text)]">{leadCounts.quoted}</p>
          <p className="text-sm text-[var(--color-text-muted)]">Quotes sent and awaiting customer response.</p>
        </Card>
        <Card className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-ink-500)]">Closed</p>
          <p className="text-3xl font-semibold text-[var(--color-text)]">
            {leadCounts.won + leadCounts.lost}
          </p>
          <p className="text-sm text-[var(--color-text-muted)]">Won and lost outcomes combined.</p>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(360px,0.95fr)]">
        <div className="grid gap-4">
          <Card className="space-y-4">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-[var(--color-text)]">Lead Workspace</h2>
                <p className="text-sm text-[var(--color-text-muted)]">
                  Search, filter, and open a lead to review status and history.
                </p>
              </div>
              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
                <div>
                  <FieldLabel htmlFor="leadSearch">Search Leads</FieldLabel>
                  <TextField
                    id="leadSearch"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search name, company, email..."
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="leadStatus">Status</FieldLabel>
                  <select
                    id="leadStatus"
                    className="ui-field"
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value as LeadStatus | 'all')}
                  >
                    {statusOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {isLoading && <p className="text-sm text-[var(--color-text-muted)]">Loading leads...</p>}
            {isError && (
              <p className="text-sm text-[var(--color-danger-text)]">
                {error instanceof Error ? error.message : 'Failed to load leads.'}
              </p>
            )}

            {!isLoading && !isError && (
              <div className="grid gap-3">
                {leads.map((lead) => (
                  <button
                    key={lead.id}
                    type="button"
                    className={`rounded-[var(--radius-md)] border p-4 text-left transition ${
                      selectedLeadId === lead.id
                        ? 'border-[var(--color-brand)] bg-[var(--color-brand-50)] shadow-[0_12px_32px_-22px_rgba(154,52,18,0.45)]'
                        : 'border-[var(--color-border)] bg-white hover:border-[var(--color-brand)]/40 hover:bg-[var(--color-surface-soft)]'
                    }`}
                    onClick={() => setSelectedLeadId(lead.id)}
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0">
                        <p className="text-base font-semibold text-[var(--color-text)]">{lead.contact_name}</p>
                        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                          {lead.company_name || 'No company provided'}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--color-ink-500)]">
                          <span>{lead.email || 'No email'}</span>
                          <span>{lead.phone || 'No phone'}</span>
                          <span>Qty: {lead.requested_qty || 'N/A'}</span>
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-wrap items-center gap-2">
                        <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-ink-700)] border border-[var(--color-border)]">
                          {lead.status}
                        </span>
                        <span className="text-xs text-[var(--color-text-muted)]">
                          {new Date(lead.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
                {leads.length === 0 && (
                  <p className="text-sm text-[var(--color-text-muted)]">No leads found.</p>
                )}
              </div>
            )}
          </Card>

          <Card className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-[var(--color-text)]">Create Lead</h2>
              <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                Manually add a lead from a phone call, meeting, or offline inquiry.
              </p>
            </div>
            <form className="grid gap-4 md:grid-cols-2" onSubmit={handleCreateLead}>
              <div>
                <FieldLabel htmlFor="contact_name">Contact Name</FieldLabel>
                <TextField id="contact_name" name="contact_name" required />
              </div>
              <div>
                <FieldLabel htmlFor="company_name">Company</FieldLabel>
                <TextField id="company_name" name="company_name" />
              </div>
              <div>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <TextField id="email" name="email" type="email" />
              </div>
              <div>
                <FieldLabel htmlFor="phone">Phone</FieldLabel>
                <TextField id="phone" name="phone" />
              </div>
              <div>
                <FieldLabel htmlFor="requested_qty">Requested Qty</FieldLabel>
                <TextField id="requested_qty" name="requested_qty" type="number" min={1} />
              </div>
              <div className="md:col-span-2">
                <FieldLabel htmlFor="notes">Notes</FieldLabel>
                <TextAreaField id="notes" name="notes" />
              </div>
              <div className="flex flex-wrap items-center gap-3 md:col-span-2">
                <Button type="submit" size="sm" disabled={createLeadMutation.isPending}>
                  {createLeadMutation.isPending ? 'Creating...' : 'Create Lead'}
                </Button>
                {createLeadMutation.isError && (
                  <p className="text-sm text-[var(--color-danger-text)]">
                    {createLeadMutation.error instanceof Error
                      ? createLeadMutation.error.message
                      : 'Failed to create lead.'}
                  </p>
                )}
              </div>
            </form>
          </Card>
        </div>

        <Card className="space-y-5 xl:sticky xl:top-4 xl:h-fit">
          <div>
            <h2 className="text-lg font-semibold text-[var(--color-text)]">Lead Details</h2>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">
              Review the selected lead, then progress it through the sales process.
            </p>
          </div>

          {!selectedLeadId && (
            <div className="rounded-[var(--radius-md)] border border-dashed border-[var(--color-border)] bg-[var(--color-surface-soft)] p-5 text-sm text-[var(--color-text-muted)]">
              Select a lead from the workspace to view full contact details and status history.
            </div>
          )}

          {selectedLeadId && isLoadingDetail && (
            <p className="text-sm text-[var(--color-text-muted)]">Loading details...</p>
          )}

          {selectedLead && (
            <>
              <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-soft)] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold text-[var(--color-text)]">{selectedLead.contact_name}</p>
                    <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                      {selectedLead.company_name || 'No company provided'}
                    </p>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-ink-700)] border border-[var(--color-border)]">
                    {selectedLead.status}
                  </span>
                </div>
              </div>

              <div className="grid gap-3 text-sm text-[var(--color-text-muted)]">
                <div className="rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-white p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-ink-500)]">Email</p>
                  <p className="mt-1 text-sm text-[var(--color-text)]">{selectedLead.email || 'N/A'}</p>
                </div>
                <div className="rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-white p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-ink-500)]">Phone</p>
                  <p className="mt-1 text-sm text-[var(--color-text)]">{selectedLead.phone || 'N/A'}</p>
                </div>
                <div className="rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-white p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-ink-500)]">Requested Quantity</p>
                  <p className="mt-1 text-sm text-[var(--color-text)]">{selectedLead.requested_qty || 'N/A'}</p>
                </div>
                <div className="rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-white p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-ink-500)]">Notes</p>
                  <p className="mt-1 text-sm text-[var(--color-text)]">{selectedLead.notes || 'No notes added.'}</p>
                </div>
              </div>

              {selectedLead.status !== 'won' && selectedLead.status !== 'lost' && (
                <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-brand-50)] p-4">
                  <p className="text-sm font-semibold text-[var(--color-text)]">Next Recommended Action</p>
                  <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                    Move this lead to <span className="font-semibold text-[var(--color-text)]">{nextStatus(selectedLead.status)}</span> once qualification is complete.
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    className="mt-3"
                    disabled={updateStatusMutation.isPending}
                    onClick={() =>
                      updateStatusMutation.mutate({
                        leadId: selectedLead.id,
                        payload: { status: nextStatus(selectedLead.status) },
                      })
                    }
                  >
                    {updateStatusMutation.isPending ? 'Updating...' : `Move To ${nextStatus(selectedLead.status)}`}
                  </Button>
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <p className="text-sm font-semibold text-[var(--color-text)]">Status Tracking</p>
                  <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                    Timeline of events recorded for this lead.
                  </p>
                </div>
                <div className="grid gap-3">
                  {leadDetail.activities.map((activity) => (
                    <div
                      key={activity.id}
                      className="rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-white p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-medium text-[var(--color-text)]">{activity.title}</p>
                        <span className="text-xs text-[var(--color-text-muted)]">
                          {new Date(activity.created_at).toLocaleString()}
                        </span>
                      </div>
                      {activity.details && (
                        <p className="mt-2 text-sm text-[var(--color-text-muted)]">{activity.details}</p>
                      )}
                    </div>
                  ))}
                  {leadDetail.activities.length === 0 && (
                    <p className="text-sm text-[var(--color-text-muted)]">No tracking events yet.</p>
                  )}
                </div>
              </div>
            </>
          )}
        </Card>
      </section>
    </AdminShell>
  );
}
