import { prisma } from '@/lib/prisma';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type SafeLeadRow = {
  id: string;
  assigned_to_user_id: string | null;
  created_at: Date;
  updated_at: Date;
  status: string;
};

export type SafeDealRow = {
  id: string;
  owner_user_id: string | null;
  created_at: Date;
  updated_at: Date;
  stage: string;
};

type LeadRawRow = {
  id: string;
  assigned_to_user_id: string | null;
  created_at: Date | string;
  updated_at: Date | string;
  status: string | null;
};

type DealRawRow = {
  id: string;
  owner_user_id: string | null;
  created_at: Date | string;
  updated_at: Date | string;
  stage: string | null;
};

function asDate(value: Date | string) {
  return value instanceof Date ? value : new Date(value);
}

export function sanitizeUuid(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = String(value).trim();
  return UUID_REGEX.test(normalized) ? normalized : null;
}

export async function loadSafeLeadsRows(): Promise<SafeLeadRow[]> {
  const rows = await prisma.$queryRaw<LeadRawRow[]>`
    SELECT
      id::text AS id,
      assigned_to_user_id::text AS assigned_to_user_id,
      created_at,
      updated_at,
      status
    FROM leads
  `;

  return rows.map((row) => ({
    id: row.id,
    assigned_to_user_id: sanitizeUuid(row.assigned_to_user_id),
    created_at: asDate(row.created_at),
    updated_at: asDate(row.updated_at),
    status: String(row.status ?? ''),
  }));
}

export async function loadSafeDealRows(): Promise<SafeDealRow[]> {
  const rows = await prisma.$queryRaw<DealRawRow[]>`
    SELECT
      id::text AS id,
      owner_user_id::text AS owner_user_id,
      created_at,
      updated_at,
      stage
    FROM deals
  `;

  return rows.map((row) => ({
    id: row.id,
    owner_user_id: sanitizeUuid(row.owner_user_id),
    created_at: asDate(row.created_at),
    updated_at: asDate(row.updated_at),
    stage: String(row.stage ?? ''),
  }));
}
