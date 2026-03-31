import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdminApiAccess } from '@/lib/auth/require-admin';
import { orchestrateLeadToClose } from '@/lib/ai-sales-agent/flow/orchestration';
import { AgentFlowStageKeySchema } from '@/lib/ai-sales-agent/contracts';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const FlowOrchestrationRequestSchema = z.object({
  leadId: z.string().uuid().optional(),
  dealId: z.string().uuid().optional(),
  mode: z.enum(['single', 'sequence']).optional().default('single'),
  maxSteps: z.number().int().min(1).max(6).optional(),
  manualOverride: z
    .object({
      enabled: z.boolean().default(false),
      stageKey: AgentFlowStageKeySchema,
      reason: z.string().max(800),
      force: z.boolean().optional().default(false),
      ownerUserId: z.string().uuid().optional(),
    })
    .optional(),
});

export async function POST(request: NextRequest) {
  const requestId = request.headers.get('x-request-id');

  try {
    const sessionOrResponse = await requireAdminApiAccess(request);
    if (sessionOrResponse instanceof NextResponse) {
      return sessionOrResponse;
    }
    const session = sessionOrResponse;

    const body = await request.json();
    const parsed = FlowOrchestrationRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          message: 'Invalid flow orchestration payload.',
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

    const result = await orchestrateLeadToClose(parsed.data, {
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
    const message =
      error instanceof Error ? error.message : 'Failed to orchestrate lead-to-close flow.';

    return NextResponse.json(
      { ok: false, message, requestId },
      { status: 500 }
    );
  }
}
