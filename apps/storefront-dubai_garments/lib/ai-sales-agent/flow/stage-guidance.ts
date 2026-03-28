import type { AgentFlowResponse } from '@/features/admin/ai-sales-agent/types';

type StageKey = AgentFlowResponse['activeStageKey'];
type StageStatus = AgentFlowResponse['stages'][number]['status'];

export type FlowStageGuidance = {
  headline: string;
  actionHint: string;
  expectedResult: string;
  completionSignal: string;
  scenarios: string[];
  theme: 'default' | 'quote';
  playbook: string[];
};

type GuidanceContext = {
  hasDeal: boolean;
  hasQuote: boolean;
};

const STAGE_GUIDANCE: Record<
  StageKey,
  Omit<FlowStageGuidance, 'scenarios' | 'theme' | 'playbook'> & {
    scenarios?: string[];
    theme?: FlowStageGuidance['theme'];
    playbook?: string[];
  }
> = {
  lead_new: {
    headline: 'Confirm intake quality before AI processing.',
    actionHint: 'Validate lead profile fields (contact, quantity, product, and timeline), then run next move to begin triage.',
    expectedResult: 'The lead enters AI triage and intelligence scoring is generated.',
    completionSignal: 'Triaged stage becomes active/completed with AI evidence.',
    scenarios: [
      'If key intake fields are missing, update the lead first to avoid weak triage output.',
    ],
    theme: 'default',
    playbook: [],
  },
  triaged: {
    headline: 'Generate lead intelligence and persist it.',
    actionHint: 'Click Run Lead Triage from this panel to score and classify the lead.',
    expectedResult: 'AI score, classification, intent, and next-best-action are saved on the lead.',
    completionSignal: 'Lead shows ai_processed_at and triage evidence is visible.',
    scenarios: [
      'If triage fails, check model/runtime settings and retry.',
      'After success, review intelligence card and proceed to qualification.',
    ],
    theme: 'default',
    playbook: [],
  },
  qualified: {
    headline: 'Confirm commercial readiness.',
    actionHint: 'Click Mark Qualified when budget, fit, and timeline are acceptable.',
    expectedResult: 'Lead status is moved to qualified and lifecycle advances toward reply/deal actions.',
    completionSignal: 'Qualified shows completed and lead status = qualified.',
    scenarios: [
      'If qualification is not ready, keep stage active and capture missing details.',
    ],
    theme: 'default',
    playbook: [],
  },
  reply_sent: {
    headline: 'Send the first customer-facing reply.',
    actionHint: 'Open Reply Studio, generate/draft, then approve/send to log outreach evidence.',
    expectedResult: 'A sent communication event is recorded for follow-up tracking.',
    completionSignal: 'Reply Sent becomes completed with email/reply evidence.',
    scenarios: [
      'If message needs edits, regenerate draft with clearer notes and tone.',
    ],
    theme: 'default',
    playbook: [],
  },
  deal_open: {
    headline: 'Create or continue the sales opportunity record.',
    actionHint: 'Create Deal when no deal exists; otherwise open deal and keep an active deal stage.',
    expectedResult: 'Deal ownership/value context is captured and opportunity tracking starts.',
    completionSignal: 'Deal exists and stage is not closed (won/lost).',
    scenarios: [
      'If the deal already exists, use Open Deal and maintain clean stage progression.',
    ],
    theme: 'default',
    playbook: [],
  },
  quote_ready: {
    headline: 'Prepare commercial quote details.',
    actionHint: 'Create quote or quote recommendation with valid line items and pricing.',
    expectedResult: 'Quote draft is available for review and outbound sending.',
    completionSignal: 'Quote exists with at least one quote item.',
    scenarios: [
      'If quote exists but items are incomplete, update line items before sending.',
    ],
    theme: 'quote',
    playbook: [
      'Generate quote recommendation from lead/deal context.',
      'Create quote with product, quantity, and pricing lines.',
      'Review totals/discount/tax before moving to send.',
    ],
  },
  quote_sent: {
    headline: 'Deliver quote to the customer.',
    actionHint: 'Open quote details, send the quote/email, and set quote status to sent.',
    expectedResult: 'Customer handoff is recorded with traceable sent evidence.',
    completionSignal: 'Quote status is sent and quote_sent activity exists.',
    scenarios: [
      'If message is pending approval, complete send action first before moving stages.',
    ],
    theme: 'quote',
    playbook: [
      'Finalize quote draft and confirm all line items.',
      'Send quote via email/composer and capture delivery evidence.',
      'Verify quote status changed to sent.',
    ],
  },
  negotiation: {
    headline: 'Track back-and-forth commercial negotiation.',
    actionHint: 'Open Deal, update deal stage/notes as customer counter-offers are handled.',
    expectedResult: 'Negotiation progress stays visible and auditable in the deal timeline.',
    completionSignal: 'Deal is in negotiation or advanced to won/lost.',
    scenarios: [
      'If negotiation is complete, move to won/lost instead of leaving this stage active.',
    ],
    theme: 'default',
    playbook: [],
  },
  won_lost: {
    headline: 'Record final commercial outcome.',
    actionHint: 'Use Mark Won or Mark Lost in the execution panel to record the final business outcome.',
    expectedResult: 'Revenue outcome is finalized and downstream reporting becomes accurate.',
    completionSignal: 'Deal stage is won or lost.',
    scenarios: [
      'If outcome is undecided, keep negotiation active and capture blockers clearly.',
    ],
    theme: 'default',
    playbook: [],
  },
  post_outcome: {
    headline: 'Finalize and close the lifecycle.',
    actionHint: 'Use Mark Closed to capture the post-outcome checkpoint.',
    expectedResult: 'Lifecycle closes with auditable post-outcome evidence.',
    completionSignal: 'Post-Outcome stage is completed and close-loop summary is available.',
    scenarios: [
      'After closure, use Open Activities for full audit trail and handoff review.',
    ],
    theme: 'default',
    playbook: [],
  },
};

export function getFlowStageGuidance(
  stageKey: StageKey,
  status: StageStatus,
  context: GuidanceContext,
): FlowStageGuidance {
  const base = STAGE_GUIDANCE[stageKey];
  const scenarios = [...(base.scenarios ?? [])];

  if (stageKey === 'deal_open' && !context.hasDeal) {
    scenarios.unshift('No deal exists yet: use Create Deal in this panel to advance immediately.');
  }

  if ((stageKey === 'quote_ready' || stageKey === 'quote_sent') && !context.hasQuote) {
    scenarios.unshift('No quote exists yet: create a quote first, then continue this stage.');
  }

  if (status === 'completed') {
    scenarios.unshift('Stage already completed: review evidence below or open the related record for audit.');
  }

  return {
    headline: base.headline,
    actionHint: base.actionHint,
    expectedResult: base.expectedResult,
    completionSignal: base.completionSignal,
    scenarios,
    theme: base.theme ?? 'default',
    playbook: base.playbook ?? [],
  };
}

export type NextMoveGuidance = {
  title: string;
  points: string[];
  theme: 'default' | 'quote';
  playbook: string[];
};

export function getNextMoveGuidance(params: {
  activeStageKey: StageKey | null;
  activeStageStatus: StageStatus | null;
  allStagesCompleted: boolean;
  hasDeal: boolean;
  hasQuote: boolean;
  nextMoveLabel: string;
}): NextMoveGuidance {
  if (params.allStagesCompleted) {
    return {
      title: 'Lifecycle complete',
      points: [
        'All stages are completed for this lead-to-close flow.',
        `Use ${params.nextMoveLabel} to review scoped activities and final audit evidence.`,
      ],
      theme: 'default',
      playbook: [],
    };
  }

  if (!params.activeStageKey || !params.activeStageStatus) {
    return {
      title: 'Manual verification required',
      points: [
        'No active stage was detected.',
        'Review records and run flow again to sync stage state.',
      ],
      theme: 'default',
      playbook: [],
    };
  }

  const stageGuidance = getFlowStageGuidance(params.activeStageKey, params.activeStageStatus, {
    hasDeal: params.hasDeal,
    hasQuote: params.hasQuote,
  });
  const stageTitle = params.activeStageKey
    .split('_')
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : part))
    .join(' ');

  return {
    title: `Current stage: ${stageTitle}`,
    points: [
      `When you click ${params.nextMoveLabel}: ${stageGuidance.actionHint}`,
      `Expected result: ${stageGuidance.expectedResult}`,
      `Done when: ${stageGuidance.completionSignal}`,
    ],
    theme: stageGuidance.theme,
    playbook: stageGuidance.playbook,
  };
}
