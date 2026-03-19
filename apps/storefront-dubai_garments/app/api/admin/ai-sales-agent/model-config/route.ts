import { NextRequest, NextResponse } from 'next/server';
import {
  AiModelConfigUpdateRequestSchema,
  AiModelConfigSchema,
} from '@/lib/ai-sales-agent/contracts';
import {
  getAiModelConfig,
  updateAiModelConfig,
} from '@/lib/ai-sales-agent/model-config';
import { getAiPayloadValidationMessage } from '@/lib/ai-sales-agent/validation-messages';
import { requireAdminSession } from '@/lib/auth/require-admin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const requestId = request.headers.get('x-request-id');

  try {
    const sessionOrResponse = await requireAdminSession();
    if (sessionOrResponse instanceof NextResponse) {
      return sessionOrResponse;
    }

    const result = await getAiModelConfig();
    return NextResponse.json({
      ok: true,
      config: result.config,
      providerChecks: result.providerChecks,
      strictEnvChecksPassed: result.strictEnvChecksPassed,
      requestId,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to load AI model config.';
    return NextResponse.json({ ok: false, message, requestId }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const requestId = request.headers.get('x-request-id');

  try {
    const sessionOrResponse = await requireAdminSession();
    if (sessionOrResponse instanceof NextResponse) {
      return sessionOrResponse;
    }
    const session = sessionOrResponse;

    const body = await request.json();
    const parsed = AiModelConfigUpdateRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          message: getAiPayloadValidationMessage(
            parsed.error,
            'Invalid model settings payload.'
          ),
          issues: parsed.error.flatten(),
          requestId,
        },
        { status: 400 }
      );
    }

    const config = AiModelConfigSchema.parse(parsed.data);
    const updated = await updateAiModelConfig({
      config,
      updatedByUserId: session.sub,
    });

    return NextResponse.json({
      ok: true,
      config: updated.config,
      strictEnvChecksPassed: updated.strictEnvChecksPassed,
      requestId,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Failed to update AI model config.';

    const status = message.includes('Strict env check failed') ? 400 : 500;
    return NextResponse.json({ ok: false, message, requestId }, { status });
  }
}
