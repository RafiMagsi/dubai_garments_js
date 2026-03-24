import { NextRequest, NextResponse } from 'next/server';
import { AssignmentPolicyExecuteRequestSchema } from '@/lib/ai-sales-agent/contracts';
import { executeAssignmentPolicyEngine } from '@/lib/ai-sales-agent/assignment-policy';
import { requireAdminApiAccess } from '@/lib/auth/require-admin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: NextRequest) {
  const requestId = request.headers.get('x-request-id');
  try {
    const sessionOrResponse = await requireAdminApiAccess(request);
    if (sessionOrResponse instanceof NextResponse) return sessionOrResponse;
    const session = sessionOrResponse;

    const body = await request.json();
    const parsed = AssignmentPolicyExecuteRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          message: 'Invalid assignment execute payload.',
          issues: parsed.error.flatten(),
          requestId,
        },
        { status: 400 }
      );
    }

    if (!parsed.data.leadId && !parsed.data.dealId) {
      return NextResponse.json(
        { ok: false, message: 'leadId or dealId is required.', requestId },
        { status: 400 }
      );
    }

    const result = await executeAssignmentPolicyEngine(parsed.data, {
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
    const message = error instanceof Error ? error.message : 'Failed to execute assignment policy.';
    return NextResponse.json({ ok: false, message, requestId }, { status: 500 });
  }
}

