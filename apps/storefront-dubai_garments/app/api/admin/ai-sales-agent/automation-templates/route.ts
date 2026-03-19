import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApiAccess } from '@/lib/auth/require-admin';
import {
  getAutomationTemplateLibrary,
  setAutomationTemplateEnabled,
} from '@/lib/ai-sales-agent/automation-template-library';
import { prisma } from '@/lib/prisma';
import { AutomationTemplateToggleRequestSchema } from '@/lib/ai-sales-agent/contracts';
import { getAiPayloadValidationMessage } from '@/lib/ai-sales-agent/validation-messages';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const requestId = request.headers.get('x-request-id');

  try {
    const sessionOrResponse = await requireAdminApiAccess(request);
    if (sessionOrResponse instanceof NextResponse) {
      return sessionOrResponse;
    }

    const result = await getAutomationTemplateLibrary();

    return NextResponse.json({
      ok: true,
      templates: result.templates,
      requestId,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to load automation templates.';

    return NextResponse.json(
      { ok: false, message, requestId },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const requestId = request.headers.get('x-request-id');

  try {
    const sessionOrResponse = await requireAdminApiAccess(request);
    if (sessionOrResponse instanceof NextResponse) {
      return sessionOrResponse;
    }
    const session = sessionOrResponse;

    const body = await request.json();
    const parsed = AutomationTemplateToggleRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          message: getAiPayloadValidationMessage(parsed.error, 'Invalid automation template toggle payload.'),
          issues: parsed.error.flatten(),
          requestId,
        },
        { status: 400 }
      );
    }

    const result = await setAutomationTemplateEnabled({
      key: parsed.data.key,
      enabled: parsed.data.enabled,
      updatedByUserId: session.sub,
    });

    await prisma.activities.create({
      data: {
        user_id: session.sub,
        activity_type: 'ai_automation_template_toggle',
        title: `Automation Template ${result.enabled ? 'Enabled' : 'Disabled'}`,
        details: `${result.key} has been ${result.enabled ? 'enabled' : 'disabled'}.`,
        metadata: {
          templateKey: result.key,
          enabled: result.enabled,
          requestId,
        },
      },
    });

    return NextResponse.json({
      ok: true,
      key: result.key,
      enabled: result.enabled,
      requestId,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to toggle automation template.';
    const status = message === 'Unknown automation template key.' ? 400 : 500;

    return NextResponse.json(
      { ok: false, message, requestId },
      { status }
    );
  }
}
