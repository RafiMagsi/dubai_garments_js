import { describe, expect, it } from 'vitest';
import {
  canAccessAdminApiPath,
  canAccessAdminPage,
  isBackofficeRole,
} from '../../lib/auth/permissions';

describe('RBAC permissions matrix', () => {
  it('accepts backoffice roles and rejects customer', () => {
    expect(isBackofficeRole('admin')).toBe(true);
    expect(isBackofficeRole('sales_manager')).toBe(true);
    expect(isBackofficeRole('sales_rep')).toBe(true);
    expect(isBackofficeRole('ops')).toBe(true);
    expect(isBackofficeRole('customer')).toBe(false);
  });

  it('enforces admin-only pages', () => {
    expect(canAccessAdminPage('admin', '/admin/users')).toBe(true);
    expect(canAccessAdminPage('sales_manager', '/admin/users')).toBe(false);
    expect(canAccessAdminPage('sales_rep', '/admin/users')).toBe(false);
    expect(canAccessAdminPage('ops', '/admin/users')).toBe(false);
  });

  it('enforces admin/sales manager product API access', () => {
    expect(canAccessAdminApiPath('admin', '/api/admin/products')).toBe(true);
    expect(canAccessAdminApiPath('sales_manager', '/api/admin/products')).toBe(true);
    expect(canAccessAdminApiPath('sales_rep', '/api/admin/products')).toBe(false);
    expect(canAccessAdminApiPath('ops', '/api/admin/products')).toBe(false);
  });

  it('allows all backoffice roles for AI sales agent APIs', () => {
    expect(canAccessAdminApiPath('admin', '/api/admin/ai-sales-agent/copilot')).toBe(true);
    expect(canAccessAdminApiPath('sales_manager', '/api/admin/ai-sales-agent/copilot')).toBe(
      true
    );
    expect(canAccessAdminApiPath('sales_rep', '/api/admin/ai-sales-agent/copilot')).toBe(true);
    expect(canAccessAdminApiPath('ops', '/api/admin/ai-sales-agent/copilot')).toBe(true);
  });
});

