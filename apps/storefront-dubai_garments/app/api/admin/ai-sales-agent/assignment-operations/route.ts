import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApiAccess } from '@/lib/auth/require-admin';
import { AssignmentOperationsRequestSchema } from '@/lib/ai-sales-agent/contracts';
import { runAssignmentOperation } from '@/lib/ai-sales-agent/assignment-operations';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: NextRequest) {
  const requestId = request.headers.get('x-request-id');
  try {
    const sessionOrResponse = await requireAdminApiAccess(request);
    if (sessionOrResponse instanceof NextResponse) return sessionOrResponse;
    const session = sessionOrResponse;

    const body = await request.json();
    const parsed = AssignmentOperationsRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          message: 'Invalid assignment operations payload.',
          issues: parsed.error.flatten(),
          requestId,
        },
        { status: 400 }
      );
    }

    const result = await runAssignmentOperation(parsed.data, {
      userId: session.sub,
      role: session.role,
      requestId,
    });

    return NextResponse.json({
      ok: true,
      requestId,
      ...result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to run assignment operation.';
    return NextResponse.json({ ok: false, message, requestId }, { status: 500 });
  }
}
