import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminSession } from '@/lib/auth/require-admin';

const ALLOWED_ROLES = new Set(['admin', 'sales_manager', 'sales_rep', 'ops', 'customer']);

export async function PATCH(
  request: Request,
  context: { params: Promise<{ userId: string }> }
) {
  const sessionOrResponse = await requireAdminSession();
  if (sessionOrResponse instanceof Response) {
    return sessionOrResponse;
  }

  const { userId } = await context.params;
  const body = await request.json().catch(() => null);

  const fullName = body?.full_name !== undefined ? String(body.full_name).trim() : undefined;
  const email = body?.email !== undefined ? String(body.email).trim().toLowerCase() : undefined;
  const role = body?.role !== undefined ? String(body.role).trim() : undefined;
  const isActive = body?.is_active !== undefined ? Boolean(body.is_active) : undefined;
  const newPassword = body?.new_password !== undefined ? String(body.new_password) : undefined;

  if (role !== undefined && !ALLOWED_ROLES.has(role)) {
    return NextResponse.json({ message: 'Invalid role.' }, { status: 422 });
  }

  const existing = await prisma.users.findUnique({
    where: { id: userId },
    select: { id: true, role: true },
  });

  if (!existing) {
    return NextResponse.json({ message: 'User not found.' }, { status: 404 });
  }

  if (existing.id === sessionOrResponse.sub && role && role !== 'admin') {
    return NextResponse.json({ message: 'You cannot remove your own admin role.' }, { status: 422 });
  }

  if (existing.id === sessionOrResponse.sub && isActive === false) {
    return NextResponse.json({ message: 'You cannot deactivate your own account.' }, { status: 422 });
  }

  const nextData: Record<string, unknown> = {};
  if (fullName !== undefined) nextData.full_name = fullName;
  if (email !== undefined) nextData.email = email;
  if (role !== undefined) nextData.role = role;
  if (isActive !== undefined) nextData.is_active = isActive;
  const shouldChangePassword = newPassword !== undefined && newPassword.trim().length > 0;

  if (!shouldChangePassword && Object.keys(nextData).length === 0) {
    return NextResponse.json({ message: 'No valid fields to update.' }, { status: 422 });
  }

  if (shouldChangePassword && newPassword && newPassword.trim().length < 8) {
    return NextResponse.json({ message: 'Password must be at least 8 characters.' }, { status: 422 });
  }

  if (existing.role === 'admin' && (role && role !== 'admin')) {
    const totalAdmins = await prisma.users.count({
      where: { role: 'admin', is_active: true },
    });
    if (totalAdmins <= 1) {
      return NextResponse.json(
        { message: 'Cannot demote the last active admin.' },
        { status: 422 }
      );
    }
  }

  try {
    if (Object.keys(nextData).length > 0) {
      await prisma.users.update({
        where: { id: userId },
        data: nextData,
      });
    }

    if (shouldChangePassword && newPassword) {
      await prisma.$executeRaw`
        UPDATE users
        SET password_hash = crypt(${newPassword}, gen_salt('bf')), updated_at = NOW()
        WHERE id = ${userId}::uuid
      `;
    }

    const updated = await prisma.users.findUnique({
      where: { id: userId },
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

    if (!updated) {
      return NextResponse.json({ message: 'User not found after update.' }, { status: 404 });
    }

    return NextResponse.json({ item: updated });
  } catch (error) {
    const message =
      error instanceof Error && error.message.toLowerCase().includes('unique')
        ? 'Email already exists.'
        : error instanceof Error && error.message.toLowerCase().includes('gen_salt')
          ? 'pgcrypto extension is required for password updates.'
          : 'Failed to update user.';
    return NextResponse.json({ message }, { status: 409 });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ userId: string }> }
) {
  const sessionOrResponse = await requireAdminSession();
  if (sessionOrResponse instanceof Response) {
    return sessionOrResponse;
  }

  const { userId } = await context.params;

  if (sessionOrResponse.sub === userId) {
    return NextResponse.json({ message: 'You cannot delete your own account.' }, { status: 422 });
  }

  const existing = await prisma.users.findUnique({
    where: { id: userId },
    select: { id: true, role: true },
  });

  if (!existing) {
    return NextResponse.json({ message: 'User not found.' }, { status: 404 });
  }

  if (existing.role === 'admin') {
    const totalAdmins = await prisma.users.count({
      where: { role: 'admin', is_active: true },
    });
    if (totalAdmins <= 1) {
      return NextResponse.json(
        { message: 'Cannot delete the last active admin.' },
        { status: 422 }
      );
    }
  }

  await prisma.users.delete({ where: { id: userId } });
  return NextResponse.json({ ok: true });
}
