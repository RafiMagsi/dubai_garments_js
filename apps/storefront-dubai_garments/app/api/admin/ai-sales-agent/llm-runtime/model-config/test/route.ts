import { NextRequest, NextResponse } from 'next/server';
import { AiPromptTestRequestSchema } from '@/lib/ai-sales-agent/contracts';
import { runAiPromptTest } from '@/lib/ai-sales-agent/model-prompt-test';
import { classifyPromptTestErrorStatus } from '@/lib/ai-sales-agent/model-prompt-test-errors';
import { getAiPayloadValidationMessage } from '@/lib/ai-sales-agent/validation-messages';
import { requireAdminSession } from '@/lib/auth/require-admin';
import { acquireApiRateLimitSlot } from '@/lib/ai-sales-agent/llm-runtime/rate-limit';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: NextRequest) {
  const requestId = request.headers.get('x-request-id');

  try {
    const sessionOrResponse = await requireAdminSession();
    if (sessionOrResponse instanceof NextResponse) {
      return sessionOrResponse;
    }

    const body = await request.json();
    const parsed = AiPromptTestRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          message: getAiPayloadValidationMessage(
            parsed.error,
            'Invalid prompt test payload.'
          ),
          issues: parsed.error.flatten(),
          requestId,
        },
        { status: 400 }
      );
    }

    const limiter = acquireApiRateLimitSlot({
      endpoint: 'model-config-test',
      identity: sessionOrResponse.sub,
      maxPerMinute: Number(process.env.AI_RUNTIME_RATE_LIMIT_PER_MINUTE ?? 20),
      maxInFlight: Number(process.env.AI_RUNTIME_MAX_INFLIGHT ?? 2),
      requestId,
    });
    if (!limiter.ok) {
      return limiter.response;
    }

    let result;
    try {
      result = await runAiPromptTest(parsed.data, { requestId });
    } finally {
      limiter.release();
    }

    return NextResponse.json({
      ok: true,
      feature: result.feature,
      source: result.source,
      provider: result.provider,
      model: result.model,
      fallbackUsed: result.fallbackUsed,
      schemaValid: result.schemaValid,
      parsed: result.parsed,
      parseIssues: result.parseIssues,
      rawOutput: result.rawOutput,
      latencyMs: result.latencyMs,
      requestId,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to run prompt test.';
    const status = classifyPromptTestErrorStatus(error);
    return NextResponse.json({ ok: false, message, requestId }, { status });
  }
}
