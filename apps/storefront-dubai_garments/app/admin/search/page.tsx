'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import AdminShell from '@/components/admin/admin-shell';
import AdminPageHeader from '@/components/admin/common/page-header';
import { DataTable, PageShell, Panel, StatusBadge, TableCell, TableHeadCell, TableHeadRow, TableRow } from '@/components/ui';
import { formatDateTime, shortCode, titleCase } from '@/features/admin/shared/view-format';

type LeadItem = {
  id: string;
  contact_name?: string | null;
  email?: string | null;
  company_name?: string | null;
  status: string;
  created_at?: string | null;
};

type DealItem = {
  id: string;
  lead_contact_name?: string | null;
  lead_company_name?: string | null;
  stage: string;
  expected_value?: number | null;
  updated_at?: string | null;
};

type QuoteItem = {
  id: string;
  quote_number?: string | null;
  customer_company_name?: string | null;
  status: string;
  total_amount?: number;
  currency?: string;
  updated_at?: string | null;
};

type UserItem = {
  id: string;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
  updated_at?: string | null;
};

async function readResponsePayload(response: Response): Promise<Record<string, unknown>> {
  const raw = await response.text();
  if (!raw.trim()) return {};
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export default function AdminGlobalSearchPage() {
  const [query, setQuery] = useState('');
  const [appliedQuery, setAppliedQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [deals, setDeals] = useState<DealItem[]>([]);
  const [quotes, setQuotes] = useState<QuoteItem[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);

  useEffect(() => {
    const search = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('q') : '';
    const initial = (search || '').trim();
    setQuery(initial);
    setAppliedQuery(initial);
  }, []);

  useEffect(() => {
    const q = appliedQuery.trim();
    if (q.length < 2) {
      setLeads([]);
      setDeals([]);
      setQuotes([]);
      setUsers([]);
      setError('');
      return;
    }

    let mounted = true;
    setIsLoading(true);
    setError('');

    async function load() {
      try {
        const encoded = encodeURIComponent(q);
        const [leadsRes, dealsRes, quotesRes, usersRes] = await Promise.all([
          fetch(`/api/admin/leads?search=${encoded}`, { cache: 'no-store' }),
          fetch(`/api/admin/deals?search=${encoded}`, { cache: 'no-store' }),
          fetch(`/api/admin/quotes?search=${encoded}`, { cache: 'no-store' }),
          fetch('/api/admin/users', { cache: 'no-store' }),
        ]);

        const [leadsPayload, dealsPayload, quotesPayload, usersPayload] = await Promise.all([
          readResponsePayload(leadsRes),
          readResponsePayload(dealsRes),
          readResponsePayload(quotesRes),
          readResponsePayload(usersRes),
        ]);

        if (!leadsRes.ok || !dealsRes.ok || !quotesRes.ok || !usersRes.ok) {
          throw new Error('Failed to run global search. Check API permissions and service status.');
        }

        const userItems = Array.isArray(usersPayload.items) ? (usersPayload.items as UserItem[]) : [];
        const userQuery = q.toLowerCase();
        const filteredUsers = userItems.filter((item) => {
          return (
            item.full_name.toLowerCase().includes(userQuery) ||
            item.email.toLowerCase().includes(userQuery) ||
            item.role.toLowerCase().includes(userQuery)
          );
        });

        if (!mounted) return;
        setLeads((Array.isArray(leadsPayload.items) ? (leadsPayload.items as LeadItem[]) : []).slice(0, 8));
        setDeals((Array.isArray(dealsPayload.items) ? (dealsPayload.items as DealItem[]) : []).slice(0, 8));
        setQuotes((Array.isArray(quotesPayload.items) ? (quotesPayload.items as QuoteItem[]) : []).slice(0, 8));
        setUsers(filteredUsers.slice(0, 8));
      } catch (loadError) {
        if (!mounted) return;
        setError(loadError instanceof Error ? loadError.message : 'Failed to run global search.');
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    void load();
    return () => {
      mounted = false;
    };
  }, [appliedQuery]);

  const totalMatches = useMemo(
    () => leads.length + deals.length + quotes.length + users.length,
    [deals.length, leads.length, quotes.length, users.length]
  );

  function applyQuery(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = query.trim();
    setAppliedQuery(value);
    if (typeof window !== 'undefined') {
      const url = value ? `/admin/search?q=${encodeURIComponent(value)}` : '/admin/search';
      window.history.replaceState(null, '', url);
    }
  }

  return (
    <AdminShell>
      <PageShell density="compact">
        <Panel>
          <AdminPageHeader
            title="Global Search"
            subtitle="Search across leads, deals, quotes, and users from a single command-style input."
          />

          <form onSubmit={applyQuery} className="dg-form-row">
            <div className="dg-field dg-col-fill">
              <label className="dg-label" htmlFor="global-search-query">Search</label>
              <input
                id="global-search-query"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="dg-input"
                placeholder="Try name, email, company, quote number, or ID snippet..."
              />
              <p className="dg-help">Enter at least 2 characters.</p>
            </div>
            <button type="submit" className="ui-btn ui-btn-primary ui-btn-md">
              Search
            </button>
          </form>
        </Panel>

        <Panel>
          <div className="dg-admin-head">
            <h2 className="dg-title-sm">Search Summary</h2>
            <span className="dg-badge">{totalMatches} Matches</span>
          </div>
          {isLoading ? <p className="dg-muted-sm">Searching...</p> : null}
          {error ? <p className="dg-alert-error">{error}</p> : null}
          {!isLoading && !error && appliedQuery.trim().length < 2 ? (
            <p className="dg-muted-sm">Type at least 2 characters to start global search.</p>
          ) : null}
        </Panel>

        <Panel>
          <div className="dg-admin-head">
            <h2 className="dg-title-sm">Leads</h2>
            <span className="dg-badge">{leads.length}</span>
          </div>
          <DataTable density="compact">
            <thead>
              <TableHeadRow>
                <TableHeadCell>Lead</TableHeadCell>
                <TableHeadCell>Company</TableHeadCell>
                <TableHeadCell>Status</TableHeadCell>
                <TableHeadCell>Created</TableHeadCell>
                <TableHeadCell>Action</TableHeadCell>
              </TableHeadRow>
            </thead>
            <tbody>
              {leads.length > 0 ? (
                leads.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div>{item.contact_name || '-'}</div>
                      <div className="dg-help">{item.email || shortCode(item.id)}</div>
                    </TableCell>
                    <TableCell>{item.company_name || '-'}</TableCell>
                    <TableCell>
                      <StatusBadge status={item.status}>{titleCase(item.status)}</StatusBadge>
                    </TableCell>
                    <TableCell>{formatDateTime(item.created_at)}</TableCell>
                    <TableCell>
                      <Link href={`/admin/leads/${item.id}`} className="ui-btn ui-btn-secondary ui-btn-md">
                        Open
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5}>No lead matches.</TableCell>
                </TableRow>
              )}
            </tbody>
          </DataTable>
        </Panel>

        <Panel>
          <div className="dg-admin-head">
            <h2 className="dg-title-sm">Deals</h2>
            <span className="dg-badge">{deals.length}</span>
          </div>
          <DataTable density="compact">
            <thead>
              <TableHeadRow>
                <TableHeadCell>Deal</TableHeadCell>
                <TableHeadCell>Company</TableHeadCell>
                <TableHeadCell>Stage</TableHeadCell>
                <TableHeadCell>Value</TableHeadCell>
                <TableHeadCell>Action</TableHeadCell>
              </TableHeadRow>
            </thead>
            <tbody>
              {deals.length > 0 ? (
                deals.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div>#{shortCode(item.id)}</div>
                      <div className="dg-help">{item.lead_contact_name || '-'}</div>
                    </TableCell>
                    <TableCell>{item.lead_company_name || '-'}</TableCell>
                    <TableCell>
                      <StatusBadge status={item.stage}>{titleCase(item.stage)}</StatusBadge>
                    </TableCell>
                    <TableCell>AED {Number(item.expected_value || 0).toFixed(2)}</TableCell>
                    <TableCell>
                      <Link href={`/admin/deals/${item.id}`} className="ui-btn ui-btn-secondary ui-btn-md">
                        Open
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5}>No deal matches.</TableCell>
                </TableRow>
              )}
            </tbody>
          </DataTable>
        </Panel>

        <Panel>
          <div className="dg-admin-head">
            <h2 className="dg-title-sm">Quotes</h2>
            <span className="dg-badge">{quotes.length}</span>
          </div>
          <DataTable density="compact">
            <thead>
              <TableHeadRow>
                <TableHeadCell>Quote</TableHeadCell>
                <TableHeadCell>Customer</TableHeadCell>
                <TableHeadCell>Status</TableHeadCell>
                <TableHeadCell>Total</TableHeadCell>
                <TableHeadCell>Action</TableHeadCell>
              </TableHeadRow>
            </thead>
            <tbody>
              {quotes.length > 0 ? (
                quotes.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.quote_number || `#${shortCode(item.id)}`}</TableCell>
                    <TableCell>{item.customer_company_name || '-'}</TableCell>
                    <TableCell>
                      <StatusBadge status={item.status}>{titleCase(item.status)}</StatusBadge>
                    </TableCell>
                    <TableCell>
                      {item.currency || 'AED'} {Number(item.total_amount || 0).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Link href={`/admin/quotes/${item.id}`} className="ui-btn ui-btn-secondary ui-btn-md">
                        Open
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5}>No quote matches.</TableCell>
                </TableRow>
              )}
            </tbody>
          </DataTable>
        </Panel>

        <Panel>
          <div className="dg-admin-head">
            <h2 className="dg-title-sm">Users</h2>
            <span className="dg-badge">{users.length}</span>
          </div>
          <DataTable density="compact">
            <thead>
              <TableHeadRow>
                <TableHeadCell>Name</TableHeadCell>
                <TableHeadCell>Email</TableHeadCell>
                <TableHeadCell>Role</TableHeadCell>
                <TableHeadCell>Status</TableHeadCell>
                <TableHeadCell>Action</TableHeadCell>
              </TableHeadRow>
            </thead>
            <tbody>
              {users.length > 0 ? (
                users.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.full_name}</TableCell>
                    <TableCell>{item.email}</TableCell>
                    <TableCell>{titleCase(item.role)}</TableCell>
                    <TableCell>
                      <StatusBadge status={item.is_active ? 'success' : 'danger'}>
                        {item.is_active ? 'Active' : 'Inactive'}
                      </StatusBadge>
                    </TableCell>
                    <TableCell>
                      <Link href="/admin/users" className="ui-btn ui-btn-secondary ui-btn-md">
                        Manage
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5}>No user matches.</TableCell>
                </TableRow>
              )}
            </tbody>
          </DataTable>
        </Panel>
      </PageShell>
    </AdminShell>
  );
}
