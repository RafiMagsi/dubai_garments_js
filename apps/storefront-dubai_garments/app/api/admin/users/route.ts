import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { requireAdminSession } from '@/lib/auth/require-admin';

const ALLOWED_ROLES = new Set(['admin', 'sales_manager', 'sales_rep', 'ops', 'customer']);

export async function GET() {
  const sessionOrResponse = await requireAdminSession();
  if (sessionOrResponse instanceof Response) {
    return sessionOrResponse;
  }

  try {
    const users = await prisma.users.findMany({
      select: {
        id: true,
        full_name: true,
        email: true,
        role: true,
        is_active: true,
        last_login_at: true,
        created_at: true,
        updated_at: true,
      },
      orderBy: [{ created_at: 'desc' }],
    });
    return NextResponse.json({ items: users });
  } catch {
    // Fallback for environments where Prisma schema and DB are temporarily out of sync.
    try {
      type RawUser = {
        id: string;
        full_name: string;
        email: string;
        role: string;
        is_active: boolean;
        last_login_at: Date | null;
        created_at: Date;
        updated_at: Date;
      };

      const hasLastLoginColumn = await prisma.$queryRaw<{ present: boolean }[]>`
        SELECT EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'users'
            AND column_name = 'last_login_at'
        ) AS present
      `;

      const includeLastLogin = Boolean(hasLastLoginColumn?.[0]?.present);
      const rows = includeLastLogin
        ? await prisma.$queryRaw<RawUser[]>(Prisma.sql`
            SELECT
              id::text,
              full_name,
              email,
              role,
              is_active,
              last_login_at,
              created_at,
              updated_at
            FROM users
            ORDER BY created_at DESC
          `)
        : await prisma.$queryRaw<RawUser[]>(Prisma.sql`
            SELECT
              id::text,
              full_name,
              email,
              role,
              is_active,
              NULL::timestamptz AS last_login_at,
              created_at,
              updated_at
            FROM users
            ORDER BY created_at DESC
          `);

      return NextResponse.json({ items: rows });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load users.';
      return NextResponse.json({ message }, { status: 500 });
    }
  }
}

export async function POST(request: Request) {
  const sessionOrResponse = await requireAdminSession();
  if (sessionOrResponse instanceof Response) {
    return sessionOrResponse;
  }

  const body = await request.json().catch(() => null);
  const fullName = String(body?.full_name || '').trim();
  const email = String(body?.email || '').trim().toLowerCase();
  const role = String(body?.role || '').trim();
  const newPassword = String(body?.new_password || '');
  const isActive = body?.is_active === undefined ? true : Boolean(body.is_active);

  if (!fullName || !email || !role || !newPassword) {
    return NextResponse.json(
      { message: 'full_name, email, role, and new_password are required.' },
      { status: 422 }
    );
  }
  if (!ALLOWED_ROLES.has(role)) {
    return NextResponse.json({ message: 'Invalid role.' }, { status: 422 });
  }
  if (newPassword.trim().length < 8) {
    return NextResponse.json({ message: 'Password must be at least 8 characters.' }, { status: 422 });
  }

  const existing = await prisma.users.findUnique({
    where: { email },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json({ message: 'Email already exists.' }, { status: 409 });
  }

  try {
    const hashResult = await prisma.$queryRaw<{ hash: string }[]>`
      SELECT crypt(${newPassword}, gen_salt('bf')) AS hash
    `;
    const passwordHash = hashResult[0]?.hash;
    if (!passwordHash) {
      return NextResponse.json({ message: 'Failed to generate password hash.' }, { status: 500 });
    }

    const created = await prisma.users.create({
      data: {
        full_name: fullName,
        email,
        role,
        is_active: isActive,
        password_hash: passwordHash,
      },
      select: {
        id: true,
        full_name: true,
        email: true,
        role: true,
        is_active: true,
        last_login_at: true,
        created_at: true,
        updated_at: true,
      },
    });

    return NextResponse.json({ item: created }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error && error.message.toLowerCase().includes('gen_salt')
        ? 'pgcrypto extension is required for password creation.'
        : error instanceof Error && error.message.toLowerCase().includes('unique')
          ? 'Email already exists.'
          : 'Failed to create user.';
    return NextResponse.json({ message }, { status: 409 });
  }
}
