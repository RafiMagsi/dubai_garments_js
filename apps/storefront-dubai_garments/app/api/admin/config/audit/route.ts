import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminSession } from '@/lib/auth/require-admin';

export async function GET(request: NextRequest) {
  const sessionOrResponse = await requireAdminSession();
  if (sessionOrResponse instanceof NextResponse) {
    return sessionOrResponse;
  }

  const limit = Number(request.nextUrl.searchParams.get('limit') || '50');
  const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.min(200, limit)) : 50;

  try {
    const items = await prisma.$queryRaw<
      Array<{
        id: string;
        user_id: string | null;
        user_email: string | null;
        execution_type: string;
        command_key: string;
        command_label: string;
        input_payload: Record<string, unknown>;
        status: string;
        output_log: string | null;
        error_message: string | null;
        started_at: string;
        finished_at: string | null;
        created_at: string;
        updated_at: string;
      }>
    >`
      SELECT
        id::text,
        user_id::text,
        user_email,
        execution_type,
        command_key,
        command_label,
        input_payload,
        status,
        output_log,
        error_message,
        started_at::text,
        finished_at::text,
        created_at::text,
        updated_at::text
      FROM admin_config_command_runs
      ORDER BY started_at DESC
      LIMIT ${safeLimit}
    `;

    return NextResponse.json({ items });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load configuration audit.';
    return NextResponse.json({
      items: [],
      warning: message,
    });
  }
}
