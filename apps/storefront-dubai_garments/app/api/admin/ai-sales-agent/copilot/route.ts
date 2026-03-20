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
import { runStructuredWithRuntime } from '@/lib/ai-sales-agent/llm-runtime';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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

    let runtimeResult: Awaited<ReturnType<typeof runStructuredWithRuntime<any>>>;

    if (input.intent === 'followups_today') {
      runtimeResult = await runStructuredWithRuntime({
        feature: 'copilot_followups_today',
        systemPrompt:
          'You are an AI sales copilot. Generate follow-up items that sales users should execute today.',
        userInput: JSON.stringify(input),
        schemaLabel: 'FollowupsTodayResponse',
        schemaHint:
          '{"summary":"string","items":[{"type":"lead|deal|quote","id":"string","title":"string","reason":"string","priority":"high|medium|low","suggestedAction":"string"}]}',
        outputSchema: FollowupsTodayResponseSchema,
        fallbackReasonPrefix: 'FollowupsToday:',
        fallback: () => fallbackFollowupsToday(requestCtx),
      });
    } else if (input.intent === 'draft_reply') {
      runtimeResult = await runStructuredWithRuntime({
        feature: 'copilot_draft_reply',
        systemPrompt:
          'You are an AI sales copilot. Draft a targeted response for the lead context and include next action.',
        userInput: JSON.stringify(input),
        schemaLabel: 'DraftReplyResponse',
        schemaHint:
          '{"channel":"email|whatsapp","subject":"string?","message":"string","rationale":"string","suggestedNextAction":"string"}',
        outputSchema: DraftReplyResponseSchema,
        fallbackReasonPrefix: 'DraftReply:',
        fallback: () => fallbackDraftReply(input, requestCtx),
      });
    } else {
      runtimeResult = await runStructuredWithRuntime({
        feature: 'copilot_at_risk_deals',
        systemPrompt:
          'You are an AI sales copilot. Identify at-risk deals and provide intervention actions.',
        userInput: JSON.stringify(input),
        schemaLabel: 'AtRiskDealsResponse',
        schemaHint:
          '{"summary":"string","deals":[{"id":"string","stage":"string","riskReason":"string","suggestedAction":"string","priority":"high|medium|low"}]}',
        outputSchema: AtRiskDealsResponseSchema,
        fallbackReasonPrefix: 'AtRiskDeals:',
        fallback: () => fallbackAtRiskDeals(requestCtx),
      });
    }

    return NextResponse.json(
      {
        ok: true,
        intent: input.intent,
        source: runtimeResult.source,
        schemaValid: runtimeResult.schemaValid,
        data: runtimeResult.data,
        fallbackReason: runtimeResult.failureReason,
        provider: runtimeResult.provider,
        model: runtimeResult.model,
        fallbackUsed: runtimeResult.fallbackUsed,
        processingMs: runtimeResult.processingMs,
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
