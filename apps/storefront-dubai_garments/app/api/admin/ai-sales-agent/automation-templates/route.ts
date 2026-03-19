import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApiAccess } from '@/lib/auth/require-admin';
import { getAutomationTemplateLibrary } from '@/lib/ai-sales-agent/automation-template-library';

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