import { prisma } from '@/lib/prisma';

function normalizeRunStatus(value: string): 'success' | 'failed' | 'pending' {
  const status = value.toLowerCase();
  if (status === 'success') return 'success';
  if (status === 'failed') return 'failed';
  return 'pending';
}

export async function getAutomationRunDetails(input: {
  page: number;
  pageSize: number;
  workflowName?: string;
  status?: 'success' | 'failed' | 'pending';
}) {
  const skip = (input.page - 1) * input.pageSize;

  const where = {
    ...(input.workflowName ? { workflow_name: input.workflowName } : {}),
    ...(input.status
      ? input.status === 'pending'
        ? { status: { in: ['pending', 'queued', 'running'] } }
        : { status: input.status }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.automation_runs.findMany({
      where,
      orderBy: { created_at: 'desc' },
      skip,
      take: input.pageSize,
    }),
    prisma.automation_runs.count({ where }),
  ]);

  return {
    page: input.page,
    pageSize: input.pageSize,
    total,
    items: items.map((item) => ({
      id: item.id,
      workflowName: item.workflow_name,
      status: normalizeRunStatus(item.status),
      triggerSource: item.trigger_source ?? null,
      inputSummary: item.request_payload
        ? JSON.stringify(item.request_payload).slice(0, 180)
        : 'No input payload.',
      outputSummary: item.response_payload
        ? JSON.stringify(item.response_payload).slice(0, 180)
        : 'No output payload.',
      failureMetadata: item.error_message ?? null,
      createdAt: item.created_at.toISOString(),
    })),
  };
}
