import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { runStructuredWithRuntime } from '@/lib/ai-sales-agent/llm-runtime';
import { type AiFeatureRoutingKey } from '@/lib/ai-sales-agent/feature-routing';
import { acquireApiRateLimitSlot } from '@/lib/ai-sales-agent/llm-runtime/rate-limit';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const InternalLlmRuntimeRequestSchema = z.object({
  feature: z.custom<AiFeatureRoutingKey>((val) => typeof val === 'string'),
  systemPrompt: z.string().min(1).max(16000),
  userInput: z.string().min(1).max(24000),
  schemaLabel: z.string().min(1).max(200).default('GenericObject'),
  schemaHint: z.string().min(1).max(8000).default('{"key":"value"}'),
  fallbackReasonPrefix: z.string().min(1).max(200).default('InternalLLMRuntime:'),
  fallbackData: z.record(z.string(), z.any()).optional(),
});

export async function POST(request: NextRequest) {
  const requestId = request.headers.get('x-request-id');
  const providedSecret = request.headers.get('x-automation-secret');
  const configuredSecret = process.env.AUTOMATION_SHARED_SECRET;

  if (!configuredSecret || !providedSecret || providedSecret !== configuredSecret) {
    return NextResponse.json(
      {
        ok: false,
        message: 'Unauthorized automation request.',
        requestId,
      },
      { status: 401 }
    );
  }

  try {
    const rawBody = await request.json();
    const parsed = InternalLlmRuntimeRequestSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          message: 'Invalid internal llm-runtime payload.',
          issues: parsed.error.flatten(),
          requestId,
        },
        { status: 400 }
      );
    }

    const limiter = acquireApiRateLimitSlot({
      endpoint: 'internal-llm-runtime',
      identity: 'automation',
      maxPerMinute: Number(process.env.AI_RUNTIME_RATE_LIMIT_PER_MINUTE ?? 30),
      maxInFlight: Number(process.env.AI_RUNTIME_MAX_INFLIGHT ?? 4),
      requestId,
    });
    if (!limiter.ok) {
      return limiter.response;
    }

    let result;
    try {
      result = await runStructuredWithRuntime({
        requestId,
        feature: parsed.data.feature,
        systemPrompt: parsed.data.systemPrompt,
        userInput: parsed.data.userInput,
        schemaLabel: parsed.data.schemaLabel,
        schemaHint: parsed.data.schemaHint,
        outputSchema: z.record(z.string(), z.any()),
        fallbackReasonPrefix: parsed.data.fallbackReasonPrefix,
        fallback: () => parsed.data.fallbackData ?? {},
      });
    } finally {
      limiter.release();
    }

    return NextResponse.json({
      ok: true,
      source: result.source,
      provider: result.provider,
      model: result.model,
      fallbackUsed: result.fallbackUsed,
      failureReason: result.failureReason,
      schemaValid: result.schemaValid,
      data: result.data,
      rawOutput: result.rawOutput,
      parseIssues: result.parseIssues,
      processingMs: result.processingMs,
      requestId,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to run internal llm-runtime request.';
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
