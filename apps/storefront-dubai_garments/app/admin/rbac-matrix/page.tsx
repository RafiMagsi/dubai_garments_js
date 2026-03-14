import Link from 'next/link';
import AdminShell from '@/components/admin/admin-shell';
import AdminPageHeader from '@/components/admin/common/page-header';
import {
  DataTable,
  PageShell,
  Panel,
  TableCell,
  TableHeadCell,
  TableHeadRow,
  TableRow,
  Toolbar,
} from '@/components/ui';
import { ADMIN_API_ROLE_MATRIX, ADMIN_PAGE_ROLE_MATRIX } from '@/lib/auth/permissions';

function roleCell(
  allowedRoles: string[],
  role: 'admin' | 'sales_manager' | 'sales_rep' | 'ops'
) {
  return allowedRoles.includes(role) ? 'Yes' : 'No';
}

export default function AdminRbacMatrixPage() {
  return (
    <AdminShell>
      <PageShell density="compact">
        <Panel>
          <AdminPageHeader
            title="RBAC Matrix"
            subtitle="Live role access matrix from the server-side permission map. This page is admin-only."
            actions={
              <Toolbar>
                <Link href="/admin/configuration" className="ui-btn ui-btn-secondary ui-btn-md">
                  Configuration
                </Link>
                <Link href="/admin/dashboard" className="ui-btn ui-btn-secondary ui-btn-md">
                  Dashboard
                </Link>
              </Toolbar>
            }
          />
        </Panel>

        <Panel>
          <article className="dg-card">
            <div className="dg-admin-head">
              <h2 className="dg-title-sm">Admin Pages</h2>
              <span className="dg-badge">{ADMIN_PAGE_ROLE_MATRIX.length} rules</span>
            </div>
            <DataTable density="compact">
              <thead>
                <TableHeadRow>
                  <TableHeadCell>Page Pattern</TableHeadCell>
                  <TableHeadCell>Admin</TableHeadCell>
                  <TableHeadCell>Sales Manager</TableHeadCell>
                  <TableHeadCell>Sales Rep</TableHeadCell>
                  <TableHeadCell>Ops</TableHeadCell>
                </TableHeadRow>
              </thead>
              <tbody>
                {ADMIN_PAGE_ROLE_MATRIX.map((rule) => (
                  <TableRow key={`page-${rule.pattern}`}>
                    <TableCell>
                      <code>{rule.pattern}</code>
                    </TableCell>
                    <TableCell>{roleCell(rule.roles, 'admin')}</TableCell>
                    <TableCell>{roleCell(rule.roles, 'sales_manager')}</TableCell>
                    <TableCell>{roleCell(rule.roles, 'sales_rep')}</TableCell>
                    <TableCell>{roleCell(rule.roles, 'ops')}</TableCell>
                  </TableRow>
                ))}
              </tbody>
            </DataTable>
          </article>
        </Panel>

        <Panel>
          <article className="dg-card">
            <div className="dg-admin-head">
              <h2 className="dg-title-sm">Admin APIs</h2>
              <span className="dg-badge">{ADMIN_API_ROLE_MATRIX.length} rules</span>
            </div>
            <DataTable density="compact">
              <thead>
                <TableHeadRow>
                  <TableHeadCell>API Pattern</TableHeadCell>
                  <TableHeadCell>Admin</TableHeadCell>
                  <TableHeadCell>Sales Manager</TableHeadCell>
                  <TableHeadCell>Sales Rep</TableHeadCell>
                  <TableHeadCell>Ops</TableHeadCell>
                </TableHeadRow>
              </thead>
              <tbody>
                {ADMIN_API_ROLE_MATRIX.map((rule) => (
                  <TableRow key={`api-${rule.pattern}`}>
                    <TableCell>
                      <code>{rule.pattern}</code>
                    </TableCell>
                    <TableCell>{roleCell(rule.roles, 'admin')}</TableCell>
                    <TableCell>{roleCell(rule.roles, 'sales_manager')}</TableCell>
                    <TableCell>{roleCell(rule.roles, 'sales_rep')}</TableCell>
                    <TableCell>{roleCell(rule.roles, 'ops')}</TableCell>
                  </TableRow>
                ))}
              </tbody>
            </DataTable>
          </article>
        </Panel>
      </PageShell>
    </AdminShell>
  );
}
