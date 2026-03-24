import { prisma } from '@/lib/prisma';

const STRATEGIC_LOCKS_KEY = 'AI_ASSIGNMENT_STRATEGIC_OWNER_LOCKS_V1';

type StrategicOwnerLock = {
  customerId: string;
  ownerUserId: string;
  reason: string | null;
  lockedAt: string;
  lockedByUserId: string;
};

type StrategicOwnerLocksMap = Record<string, StrategicOwnerLock>;

async function readSetting(key: string) {
  const rows = await prisma.$queryRaw<Array<{ value: string }>>`
    SELECT value
    FROM system_settings
    WHERE is_active = TRUE
      AND scope IN ('storefront', 'global')
      AND key = ${key}
    ORDER BY CASE WHEN scope = 'storefront' THEN 0 ELSE 1 END, updated_at DESC
    LIMIT 1
  `;
  return rows[0]?.value ?? null;
}

async function upsertSetting(input: {
  key: string;
  value: string;
  description: string;
  updatedByUserId: string;
}) {
  await prisma.$executeRaw`
    WITH updated AS (
      UPDATE system_settings
      SET
        value = ${input.value},
        is_secret = FALSE,
        is_active = TRUE,
        description = ${input.description},
        updated_by_user_id = ${input.updatedByUserId}::uuid,
        updated_at = NOW()
      WHERE scope = 'storefront'
        AND key = ${input.key}
      RETURNING id
    )
    INSERT INTO system_settings (
      scope,
      key,
      value,
      is_secret,
      is_active,
      description,
      updated_by_user_id
    )
    SELECT
      'storefront',
      ${input.key},
      ${input.value},
      FALSE,
      TRUE,
      ${input.description},
      ${input.updatedByUserId}::uuid
    WHERE NOT EXISTS (SELECT 1 FROM updated)
  `;
}

export async function getStrategicOwnerLocks(): Promise<StrategicOwnerLocksMap> {
  const raw = await readSetting(STRATEGIC_LOCKS_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as StrategicOwnerLocksMap;
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed;
  } catch {
    return {};
  }
}

export async function getLockedOwnerForCustomer(customerId: string | null | undefined) {
  if (!customerId) return null;
  const locks = await getStrategicOwnerLocks();
  return locks[customerId] ?? null;
}

export async function setStrategicOwnerLock(input: {
  customerId: string;
  ownerUserId: string;
  reason?: string;
  updatedByUserId: string;
}) {
  const locks = await getStrategicOwnerLocks();
  locks[input.customerId] = {
    customerId: input.customerId,
    ownerUserId: input.ownerUserId,
    reason: input.reason?.trim() || null,
    lockedAt: new Date().toISOString(),
    lockedByUserId: input.updatedByUserId,
  };

  await upsertSetting({
    key: STRATEGIC_LOCKS_KEY,
    value: JSON.stringify(locks),
    description: 'Strategic account owner locks for assignment operations',
    updatedByUserId: input.updatedByUserId,
  });

  return locks[input.customerId];
}
