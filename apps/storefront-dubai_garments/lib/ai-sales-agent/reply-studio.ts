import { prisma } from '@/lib/prisma';
import type {
  ReplyStudioDraft,
  ReplyStudioMode,
  ReplyStudioTone,
} from './contracts';

type ReplyStudioContext = {
  userId: string;
  role: string;
};

function normalizeText(value: string | null | undefined) {
  return (value || '').trim();
}

function buildLeadContext(lead: any) {
  return [
    normalizeText(lead.company_name),
    normalizeText(lead.contact_name),
    normalizeText(lead.email),
    normalizeText(lead.notes),
    normalizeText(lead.ai_product),
  ]
    .filter(Boolean)
    .join(' | ');
}

function buildFirstReply(contextText: string, tone: ReplyStudioTone, channel: 'email' | 'whatsapp'): ReplyStudioDraft {
  const subject =
    channel === 'email' ? 'Re: Your inquiry' : null;

  const messageByTone = {
    concise: `Hi, thanks for your inquiry. We reviewed your request and can help. Please confirm your required quantity, target timeline, and any branding/customization needs so we can guide you properly.`,
    formal: `Hello,\n\nThank you for your inquiry. We have reviewed the available details and would be glad to assist further. Kindly confirm your required quantity, target timeline, and any branding or customization requirements so we can proceed accurately.\n\nBest regards,`,
    persuasive: `Hello,\n\nThank you for reaching out. Based on your request, we can move this forward quickly. If you confirm the quantity, timeline, and branding/customization requirements, we can prepare the best next option for you without delay.\n\nBest regards,`,
  };

  return {
    mode: 'first_reply',
    tone,
    channel,
    subject,
    message: messageByTone[tone],
    rationale: `Generated first response from lead context: ${contextText || 'limited lead context available.'}`,
    suggestedNextAction: 'Send first reply and collect missing commercial details.',
    confidence: 78,
    questions: [],
  };
}

function buildFollowupReply(contextText: string, tone: ReplyStudioTone, channel: 'email' | 'whatsapp'): ReplyStudioDraft {
  const subject =
    channel === 'email' ? 'Following up on your inquiry' : null;

  const messageByTone = {
    concise: `Hi, following up on your inquiry. Please let us know if you would like us to proceed with quantity, pricing, or customization details.`,
    formal: `Hello,\n\nI am following up regarding your inquiry. Kindly let us know if you would like us to proceed with quantity confirmation, pricing, or customization details.\n\nBest regards,`,
    persuasive: `Hello,\n\nJust following up so we can move this forward efficiently. Once you confirm the remaining details, we can help you progress without unnecessary delay.\n\nBest regards,`,
  };

  return {
    mode: 'followup_reply',
    tone,
    channel,
    subject,
    message: messageByTone[tone],
    rationale: `Generated follow-up response from lead context: ${contextText || 'limited lead context available.'}`,
    suggestedNextAction: 'Send follow-up and escalate to manual review if still no response.',
    confidence: 74,
    questions: [],
  };
}

function buildClarificationQuestions(
  contextText: string,
  tone: ReplyStudioTone,
  channel: 'email' | 'whatsapp'
): ReplyStudioDraft {
  const questions = [
    'What quantity do you need?',
    'What is your required delivery timeline?',
    'Do you need branding, logo printing, or embroidery?',
    'Are there size, color, or product variant preferences?',
  ];

  const messageByTone = {
    concise: `To move forward, please confirm:\n- ${questions.join('\n- ')}`,
    formal: `To proceed accurately, could you please confirm the following:\n- ${questions.join('\n- ')}`,
    persuasive: `To prepare the best option quickly, please confirm the following:\n- ${questions.join('\n- ')}`,
  };

  return {
    mode: 'clarification_questions',
    tone,
    channel,
    subject: channel === 'email' ? 'A few details needed to proceed' : null,
    message: messageByTone[tone],
    rationale: `Generated clarification questions from lead context: ${contextText || 'limited lead context available.'}`,
    suggestedNextAction: 'Collect missing details, then generate quote or next reply.',
    confidence: 82,
    questions,
  };
}

export async function runReplyStudio(input: {
  leadId: string;
  mode: ReplyStudioMode;
  tone: ReplyStudioTone;
  channel: 'email' | 'whatsapp';
  userNotes?: string;
  dryRun?: boolean;
  context: ReplyStudioContext;
}) {
  const lead = await prisma.leads.findFirst({
    where:
      input.context.role === 'sales_rep'
        ? { id: input.leadId, assigned_to_user_id: input.context.userId }
        : { id: input.leadId },
  });

  if (!lead) {
    throw new Error('Lead not found or not accessible.');
  }

  const contextText = buildLeadContext(lead);
  let data: ReplyStudioDraft;

  switch (input.mode) {
    case 'first_reply':
      data = buildFirstReply(contextText, input.tone, input.channel);
      break;
    case 'followup_reply':
      data = buildFollowupReply(contextText, input.tone, input.channel);
      break;
    case 'clarification_questions':
      data = buildClarificationQuestions(contextText, input.tone, input.channel);
      break;
    default:
      throw new Error('Unsupported reply studio mode.');
  }

  const source: 'model' | 'fallback' = 'fallback';
  const provider = 'deterministic';
  const fallbackUsed = true;
  const failureReason = 'Reply Studio is currently using deterministic generation.';

  if (!input.dryRun) {
    await prisma.activities.create({
      data: {
        user_id: input.context.userId,
        lead_id: input.leadId,
        activity_type: 'ai_reply_studio',
        title: `AI Reply Studio: ${input.mode}`,
        details: `Generated ${input.mode} draft with ${input.tone} tone.`,
        metadata: {
          source,
          provider,
          fallbackUsed,
          failureReason,
          mode: input.mode,
          tone: input.tone,
          channel: input.channel,
          confidence: data.confidence,
        },
      },
    });
  }

  return {
    source,
    provider,
    fallbackUsed,
    failureReason,
    dryRun: !!input.dryRun,
    data,
  };
}