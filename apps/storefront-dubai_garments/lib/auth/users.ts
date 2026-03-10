import { AppRole } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';

export type AppUser = {
  id: string;
  email: string;
  role: AppRole;
  displayName: string;
};

type DbUser = {
  id: string;
  email: string;
  full_name: string;
  role: string;
};

export async function findUserByCredentials(
  role: AppRole,
  email: string,
  password: string
): Promise<AppUser | null> {
  const normalizedEmail = email.trim().toLowerCase();

  const users = await prisma.$queryRaw<DbUser[]>`
    SELECT id::text, email, full_name, role
    FROM users
    WHERE LOWER(email) = ${normalizedEmail}
      AND role = ${role}
      AND is_active = TRUE
      AND password_hash = crypt(${password}, password_hash)
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
  };
}
