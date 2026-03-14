import { AppRole } from '@/lib/auth/session';

export const BACKOFFICE_ROLES: AppRole[] = ['admin', 'sales_manager', 'sales_rep', 'ops'];
export const SALES_ROLES: AppRole[] = ['sales_manager', 'sales_rep'];

type BackofficeRole = Exclude<AppRole, 'customer'>;
type RoleRule = {
  pattern: string;
  roles: BackofficeRole[];
};

const BACKOFFICE_ALL: BackofficeRole[] = ['admin', 'sales_manager', 'sales_rep', 'ops'];
const ADMIN_AND_OPS: BackofficeRole[] = ['admin', 'ops'];
const ADMIN_AND_SALES_MANAGER: BackofficeRole[] = ['admin', 'sales_manager'];
const ADMIN_ONLY: BackofficeRole[] = ['admin'];

// Explicit page-by-page matrix for admin area access.
export const ADMIN_PAGE_ROLE_MATRIX: RoleRule[] = [
  { pattern: '/admin', roles: BACKOFFICE_ALL },
  { pattern: '/admin/dashboard', roles: BACKOFFICE_ALL },
  { pattern: '/admin/analytics', roles: BACKOFFICE_ALL },
  { pattern: '/admin/leads*', roles: BACKOFFICE_ALL },
  { pattern: '/admin/deals*', roles: BACKOFFICE_ALL },
  { pattern: '/admin/quotes*', roles: BACKOFFICE_ALL },
  { pattern: '/admin/products', roles: ADMIN_AND_SALES_MANAGER },
  { pattern: '/admin/pipeline', roles: BACKOFFICE_ALL },
  { pattern: '/admin/activities', roles: BACKOFFICE_ALL },
  { pattern: '/admin/automations', roles: ADMIN_AND_OPS },
  { pattern: '/admin/ai-logs*', roles: ADMIN_AND_OPS },
  { pattern: '/admin/observability', roles: ADMIN_AND_OPS },
  { pattern: '/admin/configuration*', roles: ADMIN_ONLY },
  { pattern: '/admin/reconfigure', roles: ADMIN_ONLY },
  { pattern: '/admin/search', roles: BACKOFFICE_ALL },
  { pattern: '/admin/design-system', roles: ADMIN_ONLY },
  { pattern: '/admin/users', roles: ADMIN_ONLY },
  { pattern: '/admin/rbac-matrix', roles: ADMIN_ONLY },
];

// Explicit API matrix for second-layer route-handler authorization.
export const ADMIN_API_ROLE_MATRIX: RoleRule[] = [
  { pattern: '/api/admin/activities*', roles: BACKOFFICE_ALL },
  { pattern: '/api/admin/leads*', roles: BACKOFFICE_ALL },
  { pattern: '/api/admin/deals*', roles: BACKOFFICE_ALL },
  { pattern: '/api/admin/quotes*', roles: BACKOFFICE_ALL },
  { pattern: '/api/admin/products*', roles: ADMIN_AND_SALES_MANAGER },
  { pattern: '/api/admin/pipeline', roles: BACKOFFICE_ALL },
  { pattern: '/api/admin/automation-runs*', roles: ADMIN_AND_OPS },
  { pattern: '/api/admin/ai-logs*', roles: ADMIN_AND_OPS },
  { pattern: '/api/admin/observability', roles: ADMIN_AND_OPS },
  { pattern: '/api/admin/config*', roles: ADMIN_ONLY },
  { pattern: '/api/admin/reconfigure', roles: ADMIN_ONLY },
  { pattern: '/api/admin/users*', roles: ADMIN_ONLY },
  { pattern: '/api/admin/auth/logout', roles: BACKOFFICE_ALL },
];

function pathMatches(pattern: string, pathname: string): boolean {
  if (pattern.endsWith('*')) {
    const prefix = pattern.slice(0, -1);
    return pathname === prefix || pathname.startsWith(`${prefix}/`);
  }
  return pathname === pattern;
}

function allowedRolesForPath(matrix: RoleRule[], pathname: string): BackofficeRole[] | null {
  for (const rule of matrix) {
    if (pathMatches(rule.pattern, pathname)) {
      return rule.roles;
    }
  }
  return null;
}

export function isBackofficeRole(role: AppRole | null | undefined): role is AppRole {
  return Boolean(role && BACKOFFICE_ROLES.includes(role));
}

export function isSalesRole(role: AppRole | null | undefined): role is AppRole {
  return Boolean(role && SALES_ROLES.includes(role));
}

export function canAccessAdminArea(role: AppRole | null | undefined): boolean {
  return isBackofficeRole(role);
}

export function canAccessAdminPage(role: AppRole | null | undefined, pathname: string): boolean {
  if (!canAccessAdminArea(role)) return false;
  const allowedRoles = allowedRolesForPath(ADMIN_PAGE_ROLE_MATRIX, pathname);
  if (!allowedRoles) return role === 'admin';
  return allowedRoles.includes(role as BackofficeRole);
}

export function canAccessAdminApiPath(role: AppRole | null | undefined, pathname: string): boolean {
  if (!canAccessAdminArea(role)) return false;
  const allowedRoles = allowedRolesForPath(ADMIN_API_ROLE_MATRIX, pathname);
  if (!allowedRoles) return role === 'admin';
  return allowedRoles.includes(role as BackofficeRole);
}

export function isAdminOnlyPath(pathname: string): boolean {
  const pageRoles = allowedRolesForPath(ADMIN_PAGE_ROLE_MATRIX, pathname);
  if (pageRoles && pageRoles.length === 1 && pageRoles[0] === 'admin') return true;

  const apiRoles = allowedRolesForPath(ADMIN_API_ROLE_MATRIX, pathname);
  if (apiRoles && apiRoles.length === 1 && apiRoles[0] === 'admin') return true;

  return false;
}

export function canAccessPath(role: AppRole | null | undefined, pathname: string): boolean {
  if (pathname.startsWith('/api/admin')) {
    return canAccessAdminApiPath(role, pathname);
  }
  if (pathname.startsWith('/admin')) {
    return canAccessAdminPage(role, pathname);
  }
  return canAccessAdminArea(role);
}
