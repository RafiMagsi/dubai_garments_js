import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApiAccess } from '@/lib/auth/require-admin';
import { getAgentPipelineBoard } from '@/lib/ai-sales-agent/agent-pipeline';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function toInt(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.max(0, Math.floor(parsed));
}

export async function GET(request: NextRequest) {
  const requestId = request.headers.get('x-request-id');
  try {
    const sessionOrResponse = await requireAdminApiAccess(request);
    if (sessionOrResponse instanceof NextResponse) return sessionOrResponse;
    const session = sessionOrResponse;

    const { searchParams } = new URL(request.url);
    const result = await getAgentPipelineBoard(
      {
        userId: session.sub,
        role: session.role,
        requestId,
      },
      {
        team: searchParams.get('team') || 'all',
        stage: searchParams.get('stage') || 'all',
        urgency: searchParams.get('urgency') || 'all',
        inactiveDays: toInt(searchParams.get('inactiveDays')),
        ownerUserId: searchParams.get('ownerUserId'),
      }
    );

    return NextResponse.json({
      ok: true,
      requestId,
      ...result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load agent pipeline board.';
    return NextResponse.json({ ok: false, message, requestId }, { status: 500 });
  }
}
