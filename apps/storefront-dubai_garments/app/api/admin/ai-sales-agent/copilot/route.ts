import { NextRequest, NextResponse } from 'next/server';
import {
  AtRiskDealsResponseSchema,
  CopilotRequestSchema,
  DraftReplyResponseSchema,
  FollowupsTodayResponseSchema,
} from '@/lib/ai-sales-agent/contracts';
import {
  fallbackAtRiskDeals,
  fallbackDraftReply,
  fallbackFollowupsToday,
} from '@/lib/ai-sales-agent/fallbacks';
import { getAiPayloadValidationMessage } from '@/lib/ai-sales-agent/validation-messages';
import { requireAdminApiAccess } from '@/lib/auth/require-admin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function runModelIntent(_input: unknown): Promise<unknown> {
  // Day 2 stub:
  // Replace this later with OpenAI / AI service call.
  // Return null for now to force fallback until model integration is added.
  return null;
}

export async function POST(request: NextRequest) {
  const requestId = request.headers.get('x-request-id');
  const sessionOrResponse = await requireAdminApiAccess(request);
  if (sessionOrResponse instanceof NextResponse) {
    return sessionOrResponse;
  }
  const session = sessionOrResponse;
  const requestCtx = {
    userId: session.sub,
    role: session.role,
  };


  try {
    const rawBody = await request.json();
    const parsed = CopilotRequestSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          message: getAiPayloadValidationMessage(parsed.error, 'Invalid copilot request payload.'),
          issues: parsed.error.flatten(),
          requestId,
        },
        { status: 400 }
      );
    }

    const input = parsed.data;

    let modelPayload: unknown = null;
    let schemaValid = false;
    let fallbackReason: string | null = null;
    let source: 'model' | 'fallback' = 'fallback';
    let data: unknown;

    try {
      modelPayload = await runModelIntent(input);
    } catch {
      fallbackReason = 'Model call failed.';
    }

    if (input.intent === 'followups_today') {
      const validated = FollowupsTodayResponseSchema.safeParse(modelPayload);
      if (validated.success) {
        schemaValid = true;
        source = 'model';
        data = validated.data;
      } else {
        fallbackReason = fallbackReason ?? 'Model output failed FollowupsToday schema validation.';
        data = await fallbackFollowupsToday(requestCtx);
      }
    } else if (input.intent === 'draft_reply') {
      const validated = DraftReplyResponseSchema.safeParse(modelPayload);
      if (validated.success) {
        schemaValid = true;
        source = 'model';
        data = validated.data;
      } else {
        fallbackReason = fallbackReason ?? 'Model output failed DraftReply schema validation.';
        data = await fallbackDraftReply(input, requestCtx);
      }
    } else {
      const validated = AtRiskDealsResponseSchema.safeParse(modelPayload);
      if (validated.success) {
        schemaValid = true;
        source = 'model';
        data = validated.data;
      } else {
        fallbackReason = fallbackReason ?? 'Model output failed AtRiskDeals schema validation.';
        data = await fallbackAtRiskDeals(requestCtx);
      }
    }

    return NextResponse.json(
      {
        ok: true,
        intent: input.intent,
        source,
        schemaValid,
        data,
        fallbackReason,
        requestId,
      },
      { status: 200 }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to process copilot request.';

    return NextResponse.json(
      {
        ok: false,
        message,
        requestId,
      },
      { status: 500 }
    );
  }
}
