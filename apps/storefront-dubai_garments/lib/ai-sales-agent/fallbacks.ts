import { prisma } from '@/lib/prisma';
import type {
  AtRiskDealsResponse,
  CopilotRequest,
  DraftReplyResponse,
  FollowupsTodayResponse,
} from './contracts';

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function endOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
}

export async function fallbackFollowupsToday(): Promise<FollowupsTodayResponse> {
  const todayStart = startOfToday();
  const todayEnd = endOfToday();

  const leads = await prisma.leads.findMany({
    where: {
      OR: [
        { timeline_date: { gte: todayStart, lte: todayEnd } },
        { status: { in: ['new', 'qualified', 'quoted'] } },
      ],
    },
    orderBy: { created_at: 'desc' },
    take: 10,
  });

  return {
    summary: `Found ${leads.length} lead follow-ups requiring attention today.`,
    items: leads.map((lead) => ({
      type: 'lead',
      id: lead.id,
      title: lead.company_name || lead.contact_name || 'Untitled lead',
      reason: lead.timeline_date
        ? 'Timeline date is due today.'
        : `Lead is currently in status "${lead.status}".`,
      priority:
        lead.status === 'quoted' || lead.status === 'qualified' ? 'high' : 'medium',
      suggestedAction:
        lead.status === 'quoted'
          ? 'Follow up on quote and ask for decision blockers.'
          : 'Send a reply and move the lead forward.',
    })),
  };
}

export async function fallbackDraftReply(input: CopilotRequest): Promise<DraftReplyResponse> {
  if (!input.leadId) {
    return {
      channel: input.channel ?? 'email',
      subject: 'Thanks for your inquiry',
      message:
        'Thank you for your inquiry. We reviewed your request and would be happy to assist you. Please share any missing details such as quantity, timeline, and preferred product specifications so we can prepare the best next step.',
      rationale: 'Fallback generic response because no leadId was provided.',
      suggestedNextAction: 'Collect missing details before moving to quote.',
    };
  }

  const lead = await prisma.leads.findUnique({
    where: { id: input.leadId },
  });

  if (!lead) {
    return {
      channel: input.channel ?? 'email',
      subject: 'Thanks for reaching out',
      message:
        'Thank you for contacting us. We are reviewing your request and will get back to you shortly with the best next step.',
      rationale: 'Fallback response because lead record was not found.',
      suggestedNextAction: 'Verify lead record and resend.',
    };
  }

  const name = lead.contact_name || 'there';
  const company = lead.company_name ? ` from ${lead.company_name}` : '';
  const product = lead.ai_product || 'your requested products';
  const qty = lead.ai_quantity ? ` around ${lead.ai_quantity} units` : '';

  return {
    channel: input.channel ?? 'email',
    subject: `Re: Your inquiry about ${product}`,
    message: `Hi ${name},\n\nThank you for your inquiry${company}. We reviewed your request for ${product}${qty}. We can help you with the next step and prepare the right recommendation or quote based on your requirements.\n\nPlease confirm any missing preferences such as sizes, branding, quantity split, delivery timeline, or artwork requirements so we can move faster.\n\nBest regards,`,
    rationale: 'Deterministic fallback built from lead fields because model output was unavailable or invalid.',
    suggestedNextAction: 'Collect missing quote inputs and prepare a quote starter.',
  };
}

export async function fallbackAtRiskDeals(): Promise<AtRiskDealsResponse> {
  const deals = await prisma.deals.findMany({
    where: {
      stage: { in: ['qualified', 'proposal_sent', 'negotiation'] },
    },
    orderBy: { updated_at: 'asc' },
    take: 10,
  });

  return {
    summary: `Found ${deals.length} deals that may need attention.`,
    deals: deals.map((deal) => ({
      id: deal.id,
      stage: deal.stage,
      riskReason: 'Deal is in an active commercial stage and should be reviewed for inactivity.',
      suggestedAction:
        deal.stage === 'proposal_sent'
          ? 'Follow up on the proposal and ask for objections.'
          : deal.stage === 'negotiation'
          ? 'Address blockers and move toward close.'
          : 'Reconfirm requirements and push toward proposal.',
      priority:
        deal.stage === 'negotiation' || deal.stage === 'proposal_sent' ? 'high' : 'medium',
    })),
  };
}