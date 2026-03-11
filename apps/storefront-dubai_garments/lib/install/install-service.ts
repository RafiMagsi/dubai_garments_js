import { prisma } from '@/lib/prisma';
import { timingSafeEqual } from 'node:crypto';

type Scope = 'global' | 'storefront' | 'fastapi';

export type InstallSettingsPayload = {
  database: {
    databaseUrl?: string;
  };
  tenant: {
    name?: string;
    slug?: string;
  };
  admin: {
    fullName: string;
    email: string;
    password: string;
  };
  ai: {
    openaiApiKey?: string;
    openaiModel?: string;
  };
  email: {
    provider: 'log' | 'smtp' | 'sendgrid' | 'resend';
    fromName?: string;
    fromAddress?: string;
    smtpHost?: string;
    smtpPort?: string;
    smtpUsername?: string;
    smtpPassword?: string;
    sendgridApiKey?: string;
    resendApiKey?: string;
  };
  storage: {
    provider: 'local' | 's3' | 'r2';
    bucket?: string;
    region?: string;
    endpoint?: string;
    accessKey?: string;
    secretKey?: string;
    publicUrlBase?: string;
  };
  automation: {
    sharedSecret?: string;
    n8nFollowupEnabled?: boolean;
    n8nQuoteFollowupWebhookUrl?: string;
  };
};

export type InstallStatusResult = {
  installed: boolean;
  tenantSlug: string;
  installedAt: string | null;
  tokenRequired: boolean;
  tokenConsumed: boolean;
  accessGranted: boolean;
};

const INSTALL_SETUP_TOKEN = String(process.env.INSTALL_SETUP_TOKEN || '').trim();

function tokenRequired() {
  return INSTALL_SETUP_TOKEN.length > 0;
}

function tokenEquals(actual: string | null | undefined) {
  if (!tokenRequired()) return true;
  const provided = Buffer.from(String(actual || ''));
  const expected = Buffer.from(INSTALL_SETUP_TOKEN);
  if (provided.length !== expected.length) return false;
  return timingSafeEqual(provided, expected);
}

function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'default';
}

export async function assertInstallTables() {
  const checks = await prisma.$queryRaw<Array<{ tenants_exists: boolean; settings_exists: boolean; users_exists: boolean }>>`
    SELECT
      to_regclass('public.tenants') IS NOT NULL AS tenants_exists,
      to_regclass('public.system_settings') IS NOT NULL AS settings_exists,
      to_regclass('public.users') IS NOT NULL AS users_exists
  `;
  const row = checks[0];
  if (!row?.tenants_exists || !row?.settings_exists || !row?.users_exists) {
    throw new Error('Install tables are missing. Run DB migrations (including tenant migrations) first.');
  }
}

export async function getInstallStatus(input?: { token?: string | null }): Promise<InstallStatusResult> {
  await assertInstallTables();

  const fallbackSlug = String(process.env.DEFAULT_TENANT_SLUG || 'default').trim() || 'default';
  const rows = await prisma.$queryRaw<
    Array<{ installed: boolean; tenant_slug: string | null; installed_at: string | null; token_consumed: boolean }>
  >`
    SELECT
      EXISTS (
        SELECT 1
        FROM system_settings ss
        WHERE ss.scope = 'global'
          AND ss.key = 'INSTALLATION_STATUS'
          AND ss.value = 'ready'
          AND ss.is_active = TRUE
      ) AS installed,
      (
        SELECT t.slug
        FROM system_settings ss
        JOIN tenants t ON t.id = ss.tenant_id
        WHERE ss.scope = 'global'
          AND ss.key = 'INSTALLATION_STATUS'
          AND ss.value = 'ready'
          AND ss.is_active = TRUE
        ORDER BY ss.updated_at DESC
        LIMIT 1
      ) AS tenant_slug,
      (
        SELECT ss.value
        FROM system_settings ss
        WHERE ss.scope = 'global'
          AND ss.key = 'INSTALLATION_COMPLETED_AT'
          AND ss.is_active = TRUE
        ORDER BY ss.updated_at DESC
        LIMIT 1
      ) AS installed_at
      ,
      EXISTS (
        SELECT 1
        FROM system_settings ss
        WHERE ss.scope = 'global'
          AND ss.key = 'INSTALL_TOKEN_CONSUMED'
          AND ss.value = 'true'
          AND ss.is_active = TRUE
      ) AS token_consumed
  `;

  const row = rows[0];
  const consumed = Boolean(row?.token_consumed);
  const required = tokenRequired();
  const accessGranted = !required || (!consumed && tokenEquals(input?.token));

  return {
    installed: Boolean(row?.installed),
    tenantSlug: row?.tenant_slug || fallbackSlug,
    installedAt: row?.installed_at || null,
    tokenRequired: required,
    tokenConsumed: consumed,
    accessGranted,
  };
}

export async function validateCurrentDatabaseConnection() {
  await prisma.$queryRaw`SELECT 1`;
  return true;
}

async function ensureTenant(name?: string, slug?: string) {
  const tenantSlug = normalizeSlug(slug || process.env.DEFAULT_TENANT_SLUG || 'default');
  const tenantName = (name || 'Default Tenant').trim();

  const existing = await prisma.$queryRaw<Array<{ id: string; slug: string }>>`
    SELECT id::text, slug
    FROM tenants
    WHERE slug = ${tenantSlug}
    LIMIT 1
  `;
  if (existing[0]) {
    return existing[0];
  }

  const inserted = await prisma.$queryRaw<Array<{ id: string; slug: string }>>`
    INSERT INTO tenants (slug, name)
    VALUES (${tenantSlug}, ${tenantName})
    RETURNING id::text, slug
  `;
  return inserted[0];
}

async function upsertSystemSetting(input: {
  tenantId: string;
  scope: Scope;
  key: string;
  value: string;
  isSecret?: boolean;
  description?: string;
  updatedByUserId?: string;
}) {
  const updatedByUserId = input.updatedByUserId || null;
  await prisma.$executeRaw`
    WITH updated AS (
      UPDATE system_settings
      SET
        value = ${input.value},
        is_secret = ${input.isSecret ?? true},
        is_active = TRUE,
        description = ${input.description || null},
        updated_by_user_id = ${updatedByUserId}::uuid,
        updated_at = NOW()
      WHERE tenant_id = ${input.tenantId}::uuid
        AND scope = ${input.scope}
        AND key = ${input.key}
      RETURNING id
    )
    INSERT INTO system_settings (tenant_id, scope, key, value, is_secret, is_active, description, updated_by_user_id)
    SELECT
      ${input.tenantId}::uuid,
      ${input.scope},
      ${input.key},
      ${input.value},
      ${input.isSecret ?? true},
      TRUE,
      ${input.description || null},
      ${updatedByUserId}::uuid
    WHERE NOT EXISTS (SELECT 1 FROM updated)
  `;
}

async function createOrUpdateAdminUser(input: {
  tenantId: string;
  fullName: string;
  email: string;
  password: string;
}) {
  const email = input.email.trim().toLowerCase();

  const updated = await prisma.$queryRaw<Array<{ id: string }>>`
    UPDATE users
    SET
      full_name = ${input.fullName},
      password_hash = crypt(${input.password}, gen_salt('bf')),
      role = 'admin',
      is_active = TRUE,
      tenant_id = ${input.tenantId}::uuid,
      updated_at = NOW()
    WHERE LOWER(email) = ${email}
      AND tenant_id = ${input.tenantId}::uuid
    RETURNING id::text
  `;
  if (updated[0]) {
    return updated[0].id;
  }

  const inserted = await prisma.$queryRaw<Array<{ id: string }>>`
    INSERT INTO users (full_name, email, password_hash, role, is_active, tenant_id)
    VALUES (
      ${input.fullName},
      ${email},
      crypt(${input.password}, gen_salt('bf')),
      'admin',
      TRUE,
      ${input.tenantId}::uuid
    )
    RETURNING id::text
  `;
  return inserted[0].id;
}

async function applySettingsForTenant(input: {
  tenantId: string;
  actorUserId: string;
  payload: InstallSettingsPayload;
  markInstalled: boolean;
  markTokenConsumed?: boolean;
}) {
  const settings: Array<{
    scope: Scope;
    key: string;
    value: string;
    isSecret?: boolean;
    description?: string;
  }> = [
    ...(input.markInstalled
      ? [
          {
            scope: 'global' as const,
            key: 'INSTALLATION_STATUS',
            value: 'ready',
            isSecret: false,
            description: 'Installation status flag',
          },
          {
            scope: 'global' as const,
            key: 'INSTALLATION_COMPLETED_AT',
            value: new Date().toISOString(),
            isSecret: false,
            description: 'Installation completion timestamp',
          },
        ]
      : []),
    { scope: 'global', key: 'TENANT_SLUG', value: input.payload.tenant.slug || 'default', isSecret: false, description: 'Primary tenant slug' },
    { scope: 'storefront', key: 'FASTAPI_BASE_URL', value: process.env.FASTAPI_BASE_URL || process.env.NEXT_PUBLIC_FASTAPI_BASE_URL || 'http://localhost:8000', isSecret: false, description: 'FastAPI base URL for storefront proxy' },
    { scope: 'storefront', key: 'AUTH_SESSION_SECRET', value: process.env.AUTH_SESSION_SECRET || '', isSecret: true, description: 'Session secret for storefront auth' },
    { scope: 'fastapi', key: 'OPENAI_API_KEY', value: input.payload.ai.openaiApiKey || '', isSecret: true, description: 'OpenAI API key' },
    { scope: 'fastapi', key: 'OPENAI_MODEL', value: input.payload.ai.openaiModel || 'gpt-4o-mini', isSecret: false, description: 'OpenAI model' },
    { scope: 'fastapi', key: 'EMAIL_PROVIDER', value: input.payload.email.provider || 'log', isSecret: false, description: 'Email provider' },
    { scope: 'fastapi', key: 'EMAIL_FROM_NAME', value: input.payload.email.fromName || 'Dubai Garments', isSecret: false, description: 'Email sender name' },
    { scope: 'fastapi', key: 'EMAIL_FROM_ADDRESS', value: input.payload.email.fromAddress || 'no-reply@example.com', isSecret: false, description: 'Email sender address' },
    { scope: 'fastapi', key: 'SMTP_HOST', value: input.payload.email.smtpHost || '', isSecret: false, description: 'SMTP host' },
    { scope: 'fastapi', key: 'SMTP_PORT', value: input.payload.email.smtpPort || '587', isSecret: false, description: 'SMTP port' },
    { scope: 'fastapi', key: 'SMTP_USERNAME', value: input.payload.email.smtpUsername || '', isSecret: true, description: 'SMTP username' },
    { scope: 'fastapi', key: 'SMTP_PASSWORD', value: input.payload.email.smtpPassword || '', isSecret: true, description: 'SMTP password' },
    { scope: 'fastapi', key: 'SENDGRID_API_KEY', value: input.payload.email.sendgridApiKey || '', isSecret: true, description: 'SendGrid API key' },
    { scope: 'fastapi', key: 'RESEND_API_KEY', value: input.payload.email.resendApiKey || '', isSecret: true, description: 'Resend API key' },
    { scope: 'fastapi', key: 'STORAGE_PROVIDER', value: input.payload.storage.provider || 'local', isSecret: false, description: 'Storage provider' },
    { scope: 'fastapi', key: 'STORAGE_S3_BUCKET', value: input.payload.storage.bucket || '', isSecret: false, description: 'S3/R2 bucket' },
    { scope: 'fastapi', key: 'STORAGE_S3_REGION', value: input.payload.storage.region || 'auto', isSecret: false, description: 'S3/R2 region' },
    { scope: 'fastapi', key: 'STORAGE_S3_ENDPOINT', value: input.payload.storage.endpoint || '', isSecret: false, description: 'S3/R2 endpoint' },
    { scope: 'fastapi', key: 'STORAGE_S3_ACCESS_KEY', value: input.payload.storage.accessKey || '', isSecret: true, description: 'S3/R2 access key' },
    { scope: 'fastapi', key: 'STORAGE_S3_SECRET_KEY', value: input.payload.storage.secretKey || '', isSecret: true, description: 'S3/R2 secret key' },
    { scope: 'fastapi', key: 'STORAGE_S3_PUBLIC_URL_BASE', value: input.payload.storage.publicUrlBase || '', isSecret: false, description: 'Public URL base for storage' },
    { scope: 'fastapi', key: 'AUTOMATION_SHARED_SECRET', value: input.payload.automation.sharedSecret || '', isSecret: true, description: 'Automation shared secret' },
    { scope: 'fastapi', key: 'N8N_FOLLOWUP_ENABLED', value: input.payload.automation.n8nFollowupEnabled ? 'true' : 'false', isSecret: false, description: 'Enable n8n followups' },
    { scope: 'fastapi', key: 'N8N_QUOTE_FOLLOWUP_WEBHOOK_URL', value: input.payload.automation.n8nQuoteFollowupWebhookUrl || '', isSecret: true, description: 'n8n followup webhook URL' },
    ...(input.markTokenConsumed
      ? [
          {
            scope: 'global' as const,
            key: 'INSTALL_TOKEN_CONSUMED',
            value: 'true',
            isSecret: false,
            description: 'One-time installation token consumed',
          },
        ]
      : []),
  ];

  if (input.payload.database.databaseUrl?.trim()) {
    settings.push(
      {
        scope: 'storefront',
        key: 'DATABASE_URL',
        value: input.payload.database.databaseUrl.trim(),
        isSecret: true,
        description: 'Storefront database URL',
      },
      {
        scope: 'fastapi',
        key: 'DATABASE_URL',
        value: input.payload.database.databaseUrl.trim(),
        isSecret: true,
        description: 'FastAPI database URL',
      }
    );
  }

  for (const setting of settings) {
    await upsertSystemSetting({
      tenantId: input.tenantId,
      scope: setting.scope,
      key: setting.key,
      value: setting.value,
      isSecret: setting.isSecret,
      description: setting.description,
      updatedByUserId: input.actorUserId,
    });
  }
}

export async function completeInstallation(payload: InstallSettingsPayload, installToken?: string | null) {
  await assertInstallTables();

  const status = await getInstallStatus({ token: installToken });
  if (status.installed) {
    throw new Error('System is already installed.');
  }
  if (!status.accessGranted) {
    throw new Error('Invalid or missing one-time install token.');
  }

  if (!payload.admin.fullName?.trim() || !payload.admin.email?.trim() || !payload.admin.password?.trim()) {
    throw new Error('Admin name, email, and password are required.');
  }
  if (payload.admin.password.trim().length < 8) {
    throw new Error('Admin password must be at least 8 characters.');
  }

  await validateCurrentDatabaseConnection();

  const tenant = await ensureTenant(payload.tenant.name, payload.tenant.slug);
  const adminUserId = await createOrUpdateAdminUser({
    tenantId: tenant.id,
    fullName: payload.admin.fullName.trim(),
    email: payload.admin.email,
    password: payload.admin.password,
  });

  await applySettingsForTenant({
    tenantId: tenant.id,
    actorUserId: adminUserId,
    payload: {
      ...payload,
      tenant: { ...payload.tenant, slug: tenant.slug },
    },
    markInstalled: true,
    markTokenConsumed: tokenRequired(),
  });

  return {
    tenant,
    adminUserId,
    completedAt: new Date().toISOString(),
  };
}

export async function enableReconfigureMode(input: {
  tenantId: string;
  actorUserId: string;
  enabled: boolean;
  ttlMinutes?: number;
}) {
  const ttlMinutes = Math.max(5, Math.min(120, Number(input.ttlMinutes || 30)));
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString();
  await upsertSystemSetting({
    tenantId: input.tenantId,
    scope: 'global',
    key: 'RECONFIGURE_MODE',
    value: input.enabled ? 'true' : 'false',
    isSecret: false,
    description: 'Allows post-install reconfiguration',
    updatedByUserId: input.actorUserId,
  });
  await upsertSystemSetting({
    tenantId: input.tenantId,
    scope: 'global',
    key: 'RECONFIGURE_MODE_EXPIRES_AT',
    value: input.enabled ? expiresAt : '',
    isSecret: false,
    description: 'Reconfigure mode expiry timestamp',
    updatedByUserId: input.actorUserId,
  });
  return { enabled: input.enabled, expiresAt: input.enabled ? expiresAt : null };
}

export async function getReconfigureModeStatus(tenantId: string) {
  const rows = await prisma.$queryRaw<Array<{ key: string; value: string }>>`
    SELECT key, value
    FROM system_settings
    WHERE tenant_id = ${tenantId}::uuid
      AND scope = 'global'
      AND key IN ('RECONFIGURE_MODE', 'RECONFIGURE_MODE_EXPIRES_AT')
      AND is_active = TRUE
  `;
  const map = new Map(rows.map((row) => [row.key, row.value || '']));
  const enabled = map.get('RECONFIGURE_MODE') === 'true';
  const expiresAt = map.get('RECONFIGURE_MODE_EXPIRES_AT') || null;
  const isExpired = expiresAt ? new Date(expiresAt).getTime() <= Date.now() : true;
  return {
    enabled: enabled && !isExpired,
    expiresAt,
  };
}

export async function reconfigureInstalledSystem(input: {
  tenantId: string;
  actorUserId: string;
  payload: InstallSettingsPayload;
}) {
  const status = await getInstallStatus();
  if (!status.installed) {
    throw new Error('System is not installed yet.');
  }
  const mode = await getReconfigureModeStatus(input.tenantId);
  if (!mode.enabled) {
    throw new Error('Reconfigure mode is disabled or expired.');
  }
  await applySettingsForTenant({
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    payload: input.payload,
    markInstalled: false,
  });
  await enableReconfigureMode({
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    enabled: false,
  });
  return { ok: true, updatedAt: new Date().toISOString() };
}
