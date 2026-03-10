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

      <section className="grid gap-4 xl:grid-cols-[1.1fr_1.6fr_1.2fr]">
        <Card className="space-y-4">
          <h2 className="text-lg font-semibold text-[var(--color-text)]">Create Lead</h2>
          <form className="grid gap-3" onSubmit={handleCreateLead}>
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
            <div>
              <FieldLabel htmlFor="notes">Notes</FieldLabel>
              <TextAreaField id="notes" name="notes" />
            </div>
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
          </form>
        </Card>

        <Card className="space-y-4">
          <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
            <div>
              <FieldLabel htmlFor="leadSearch">Search Leads</FieldLabel>
              <TextField
                id="leadSearch"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search name, company, email..."
              />
            </div>
            <select
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

          {isLoading && <p className="text-sm text-[var(--color-text-muted)]">Loading leads...</p>}
          {isError && (
            <p className="text-sm text-[var(--color-danger-text)]">
              {error instanceof Error ? error.message : 'Failed to load leads.'}
            </p>
          )}

          {!isLoading && !isError && (
            <div className="grid gap-2">
              {data?.items.map((lead) => (
                <button
                  key={lead.id}
                  type="button"
                  className={`rounded-[var(--radius-sm)] border p-3 text-left transition ${
                    selectedLeadId === lead.id
                      ? 'border-[var(--color-brand)] bg-[var(--color-brand-50)]'
                      : 'border-[var(--color-border)] bg-white'
                  }`}
                  onClick={() => setSelectedLeadId(lead.id)}
                >
                  <p className="text-sm font-semibold text-[var(--color-text)]">{lead.contact_name}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {lead.company_name || 'No company'} | {lead.email || 'No email'}
                  </p>
                  <p className="mt-1 text-xs uppercase tracking-[0.06em] text-[var(--color-ink-500)]">
                    {lead.status}
                  </p>
                </button>
              ))}
              {data?.items.length === 0 && (
                <p className="text-sm text-[var(--color-text-muted)]">No leads found.</p>
              )}
            </div>
          )}
        </Card>

        <Card className="space-y-4">
          <h2 className="text-lg font-semibold text-[var(--color-text)]">Lead Details</h2>
          {!selectedLeadId && (
            <p className="text-sm text-[var(--color-text-muted)]">Select a lead to view details.</p>
          )}
          {selectedLeadId && isLoadingDetail && (
            <p className="text-sm text-[var(--color-text-muted)]">Loading details...</p>
          )}
          {leadDetail?.item && (
            <>
              <div className="space-y-1 text-sm text-[var(--color-text-muted)]">
                <p><strong className="text-[var(--color-text)]">Contact:</strong> {leadDetail.item.contact_name}</p>
                <p><strong className="text-[var(--color-text)]">Company:</strong> {leadDetail.item.company_name || 'N/A'}</p>
                <p><strong className="text-[var(--color-text)]">Email:</strong> {leadDetail.item.email || 'N/A'}</p>
                <p><strong className="text-[var(--color-text)]">Phone:</strong> {leadDetail.item.phone || 'N/A'}</p>
                <p><strong className="text-[var(--color-text)]">Status:</strong> {leadDetail.item.status}</p>
              </div>

              {leadDetail.item.status !== 'won' && leadDetail.item.status !== 'lost' && (
                <Button
                  type="button"
                  size="sm"
                  disabled={updateStatusMutation.isPending}
                  onClick={() =>
                    updateStatusMutation.mutate({
                      leadId: leadDetail.item.id,
                      payload: { status: nextStatus(leadDetail.item.status) },
                    })
                  }
                >
                  {updateStatusMutation.isPending ? 'Updating...' : `Move To ${nextStatus(leadDetail.item.status)}`}
                </Button>
              )}

              <div className="space-y-2">
                <p className="text-sm font-semibold text-[var(--color-text)]">Status Tracking</p>
                <div className="grid gap-2">
                  {leadDetail.activities.map((activity) => (
                    <div key={activity.id} className="rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-white p-2">
                      <p className="text-sm font-medium text-[var(--color-text)]">{activity.title}</p>
                      <p className="text-xs text-[var(--color-text-muted)]">
                        {new Date(activity.created_at).toLocaleString()}
                      </p>
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
