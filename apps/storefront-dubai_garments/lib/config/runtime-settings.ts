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
}): Promise<string> {
  const mode = resolveConfigMode();
  const envValue = process.env[input.key];

  if (mode === 'env') {
    return envValue ?? input.defaultValue ?? '';
  }

  try {
    const scope = input.scope || 'storefront';
    const rows = await prisma.$queryRaw<Array<{ scope: string; value: string }>>`
      SELECT scope, value
      FROM system_settings
      WHERE is_active = TRUE
        AND key = ${input.key}
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
