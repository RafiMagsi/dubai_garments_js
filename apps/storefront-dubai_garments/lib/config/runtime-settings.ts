import { prisma } from '@/lib/prisma';

export type ConfigScope = 'storefront' | 'fastapi' | 'global';

function isDevelopmentEnv() {
  return process.env.NODE_ENV === 'development';
}

export function resolveConfigMode(): 'env' | 'db' {
  const configured = String(process.env.CONFIG_MODE || 'auto').trim().toLowerCase();
  if (configured === 'env' || configured === 'db') {
    return configured;
  }
  return isDevelopmentEnv() ? 'env' : 'db';
}

export async function getRuntimeSetting(input: {
  key: string;
  scope?: Exclude<ConfigScope, 'global'>;
  defaultValue?: string;
  tenantId?: string | null;
}): Promise<string> {
  const mode = resolveConfigMode();
  const envValue = process.env[input.key];

  if (mode === 'env') {
    return envValue ?? input.defaultValue ?? '';
  }

  try {
    const scope = input.scope || 'storefront';
    const defaultTenantSlug = String(process.env.DEFAULT_TENANT_SLUG || 'default').trim() || 'default';
    const tenantRows = input.tenantId
      ? [{ id: input.tenantId }]
      : await prisma.$queryRaw<Array<{ id: string }>>`
          SELECT id::text
          FROM tenants
          WHERE slug = ${defaultTenantSlug}
          LIMIT 1
        `;
    const tenantId = tenantRows[0]?.id;
    if (!tenantId) {
      return envValue ?? input.defaultValue ?? '';
    }

    const rows = await prisma.$queryRaw<Array<{ scope: string; value: string }>>`
      SELECT scope, value
      FROM system_settings
      WHERE is_active = TRUE
        AND key = ${input.key}
        AND tenant_id = ${tenantId}::uuid
        AND scope IN ('global', ${scope})
      ORDER BY CASE WHEN scope = ${scope} THEN 0 ELSE 1 END
      LIMIT 1
    `;
    const dbValue = rows[0]?.value;
    if (dbValue !== undefined && dbValue !== null && dbValue !== '') {
      return dbValue;
    }
  } catch {
    // Fall back to env/default when settings table is unavailable.
  }

  return envValue ?? input.defaultValue ?? '';
}
