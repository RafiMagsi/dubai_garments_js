import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

type AuditInput = {
  userId?: string | null;
  leadId?: string | null;
  dealId?: string | null;
  quoteId?: string | null;
  title: string;
  details?: string | null;
  metadata?: Prisma.InputJsonValue;
};

export async function writeCopilotAuditLog(input: AuditInput) {
  const record = await prisma.activities.create({
    data: {
      user_id: input.userId ?? null,
      lead_id: input.leadId ?? null,
      deal_id: input.dealId ?? null,
      quote_id: input.quoteId ?? null,
      activity_type: 'ai_copilot_action',
      title: input.title,
      details: input.details ?? null,
      metadata: input.metadata ?? {},
    },
  });

  return record.id;
}