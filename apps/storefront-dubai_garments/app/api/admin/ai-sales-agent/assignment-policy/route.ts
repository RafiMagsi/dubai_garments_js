import { NextRequest, NextResponse } from 'next/server';
import {
  AssignmentPolicyUpdateRequestSchema,
} from '@/lib/ai-sales-agent/contracts';
import {
  getAssignmentPolicyEngineState,
  updateAssignmentPolicyEngineConfig,
} from '@/lib/ai-sales-agent/assignment-policy';
import { requireAdminApiAccess } from '@/lib/auth/require-admin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const requestId = request.headers.get('x-request-id');
  try {
    const sessionOrResponse = await requireAdminApiAccess(request);
    if (sessionOrResponse instanceof NextResponse) return sessionOrResponse;

    const result = await getAssignmentPolicyEngineState();
    return NextResponse.json({
      ok: true,
      config: result.config,
      availableAgents: result.availableAgents,
      requestId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load assignment policy.';
    return NextResponse.json({ ok: false, message, requestId }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const requestId = request.headers.get('x-request-id');
  try {
    const sessionOrResponse = await requireAdminApiAccess(request);
    if (sessionOrResponse instanceof NextResponse) return sessionOrResponse;
    const session = sessionOrResponse;

    const body = await request.json();
    const parsed = AssignmentPolicyUpdateRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          message: 'Invalid assignment policy payload.',
          issues: parsed.error.flatten(),
          requestId,
        },
        { status: 400 }
      );
    }

    const result = await updateAssignmentPolicyEngineConfig({
      config: parsed.data.config,
      updatedByUserId: session.sub,
    });

    return NextResponse.json({
      ok: true,
      config: result.config,
      availableAgents: result.availableAgents,
      requestId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update assignment policy.';
    return NextResponse.json({ ok: false, message, requestId }, { status: 500 });
  }
}

