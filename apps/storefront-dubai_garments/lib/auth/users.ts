import { AppRole } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';

export type AppUser = {
  id: string;
  email: string;
  role: AppRole;
  displayName: string;
  tenantId?: string;
  tenantSlug: string;
};

type DbUser = {
  id: string;
  email: string;
  full_name: string;
  role: string;
  tenant_id?: string;
  tenant_slug: string;
};

export async function findUserByCredentials(
  role: AppRole,
  email: string,
  password: string,
  tenantSlug: string
): Promise<AppUser | null> {
  const normalizedEmail = email.trim().toLowerCase();

  const users = await prisma.$queryRaw<DbUser[]>`
    SELECT
      u.id::text,
      u.email,
      u.full_name,
      u.role,
      u.tenant_id::text AS tenant_id,
      t.slug AS tenant_slug
    FROM users u
    JOIN tenants t ON t.id = u.tenant_id
    WHERE LOWER(u.email) = ${normalizedEmail}
      AND u.role = ${role}
      AND t.slug = ${tenantSlug}
      AND u.is_active = TRUE
      AND u.password_hash = crypt(${password}, u.password_hash)
    LIMIT 1
  `;

  const user = users[0];
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    role: user.role as AppRole,
    displayName: user.full_name,
    tenantId: user.tenant_id,
    tenantSlug: user.tenant_slug,
  };
}
