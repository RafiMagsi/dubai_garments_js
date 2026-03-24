export type CopilotIntent = 'followups_today' | 'draft_reply' | 'at_risk_deals';
export type CopilotAction = 'draft_reply' | 'schedule_followup' | 'mark_deal_at_risk';

export type CopilotRequest = {
  intent: CopilotIntent;
  leadId?: string;
  dealId?: string;
  channel?: 'email' | 'whatsapp';
  context?: {
    tone?: 'professional' | 'friendly' | 'persuasive';
    userNotes?: string;
  };
};

export type CopilotExecuteRequest = {
  action: CopilotAction;
  leadId?: string;
  dealId?: string;
  channel?: 'email' | 'whatsapp';
  dry_run?: boolean;
  payload?: {
    tone?: 'professional' | 'friendly' | 'persuasive';
    userNotes?: string;
    followupDate?: string;
    reason?: string;
  };
};

export type CopilotEnvelope = {
  ok: boolean;
  intent?: CopilotIntent;
  action?: CopilotAction;
  source?: 'model' | 'fallback';
  schemaValid?: boolean;
  provider?: string;
  model?: string;
  fallbackUsed?: boolean;
  processingMs?: number;
  dryRun?: boolean;
  executed?: boolean;
  data?: unknown;
  result?: Record<string, unknown>;
  fallbackReason?: string | null;
  auditId?: string | null;
  requestId?: string | null;
  message?: string;
};

export type LeadTriageOutput = {
  summary: string;
  intent:
    | 'quotation_request'
    | 'product_inquiry'
    | 'bulk_order'
    | 'followup_request'
    | 'general_sales'
    | 'unknown';
  urgency: 'high' | 'medium' | 'low';
  complexity: 'high' | 'medium' | 'low';
  quantity: number | null;
  confidence: number;
  score: number;
  classification: 'hot' | 'warm' | 'cold';
  nextBestAction: string;
};

export type LeadTriageEnvelope = {
  ok: boolean;
  dryRun: boolean;
  source: 'model' | 'fallback';
  provider?: string;
  model?: string;
  fallbackUsed?: boolean;
  schemaValid?: boolean;
  processingMs?: number;
  failureReason?: string | null;
  persisted: boolean;
  leadId: string;
  data: LeadTriageOutput;
  requestId?: string | null;
  message?: string;
};

export type AiSalesAgentEnvelope = CopilotEnvelope | LeadTriageEnvelope;

export type AgentFlowStageKey =
  | 'lead_new'
  | 'triaged'
  | 'qualified'
  | 'reply_sent'
  | 'deal_open'
  | 'quote_ready'
  | 'quote_sent'
  | 'negotiation'
  | 'won_lost'
  | 'post_outcome';

export type AgentFlowStageStatus = 'completed' | 'active' | 'pending' | 'blocked';

export type AgentFlowStage = {
  key: AgentFlowStageKey;
  order: number;
  label: string;
  description: string;
  status: AgentFlowStageStatus;
  completed: boolean;
  evidence: string[];
  blockerReason?: string | null;
};

export type AgentFlowMarker = {
  type: 'ai_action' | 'automation_action' | 'human_checkpoint' | 'pending_approval';
  label: string;
  stageKey: AgentFlowStageKey;
  details: string;
};

export type AgentFlowResponse = {
  ok: true;
  leadId?: string | null;
  dealId?: string | null;
  quoteId?: string | null;
  stages: AgentFlowStage[];
  activeStageKey: AgentFlowStageKey;
  completionPercent: number;
  summary: string;
  blockers: string[];
  recommendedNextMove: string;
  markers: AgentFlowMarker[];
  humanCheckpoints: string[];
  pendingApprovals: string[];
  confidenceTrend: Array<{
    label: string;
    value: number;
  }>;
  riskHints: string[];
  stageSlaAlerts: Array<{
    stageKey: AgentFlowStageKey;
    stageLabel: string;
    elapsedHours: number;
    slaHours: number;
    severity: 'warning' | 'critical';
    message: string;
  }>;
  transitionGuardrails: Array<{
    stageKey: AgentFlowStageKey;
    rule: string;
    passed: boolean;
    message: string;
  }>;
  closeLoopSummary: {
    aiActions: string[];
    humanChanges: string[];
    result: string;
  };
  requestId?: string | null;
};

export type FlowOrchestrationActionResult = {
  stageKey: AgentFlowStageKey;
  status: 'executed' | 'skipped' | 'blocked' | 'failed';
  message: string;
  auditActivityId?: string | null;
  timelineActivityId?: string | null;
  validation: {
    entry: string[];
    exit: string[];
    passed: boolean;
  };
};

export type FlowOrchestrationRequest = {
  leadId?: string;
  dealId?: string;
  mode?: 'single' | 'sequence';
  maxSteps?: number;
  manualOverride?: {
    enabled: boolean;
    stageKey: AgentFlowStageKey;
    reason: string;
    force?: boolean;
  };
};

export type FlowOrchestrationEnvelope = {
  ok: true;
  requestId?: string | null;
  leadId?: string | null;
  dealId?: string | null;
  quoteId?: string | null;
  startStageKey: AgentFlowStageKey;
  endStageKey: AgentFlowStageKey;
  mode: 'single' | 'sequence';
  manualOverrideApplied: boolean;
  actions: FlowOrchestrationActionResult[];
  flow: AgentFlowResponse;
};

export type ReplyStudioMode =
  | 'first_reply'
  | 'followup_reply'
  | 'clarification_questions';

export type ReplyStudioTone =
  | 'concise'
  | 'formal'
  | 'persuasive';

export type ReplyStudioRequest = {
  leadId: string;
  dealId?: string;
  quoteId?: string;
  mode: ReplyStudioMode;
  tone?: ReplyStudioTone;
  channel?: 'email' | 'whatsapp';
  userNotes?: string;
  dry_run?: boolean;
};

export type ReplyStudioDraft = {
  mode: ReplyStudioMode;
  tone: ReplyStudioTone;
  channel: 'email' | 'whatsapp';
  subject: string | null;
  message: string;
  rationale: string;
  suggestedNextAction: string;
  confidence: number;
  questions: string[];
};

export type AssignmentMode =
  | 'round_robin'
  | 'weighted_capacity'
  | 'skill_tag_based'
  | 'manual_override';

export type AssignmentPolicyConfig = {
  mode: AssignmentMode;
  fallbackAssigneeUserId: string | null;
  capacityByUserId: Record<string, number>;
  skillsByUserId: Record<string, string[]>;
  weightedDealMultiplier: number;
  weightedLeadMultiplier: number;
};

export type AssignmentPolicyAgent = {
  id: string;
  fullName: string;
  email: string;
  role: string;
  isActive: boolean;
  openLeadCount: number;
  openDealCount: number;
  weightedLoad: number;
  skillTags: string[];
  capacityWeight: number;
};

export type AssignmentPolicyEnvelope = {
  ok: true;
  config: AssignmentPolicyConfig;
  availableAgents: AssignmentPolicyAgent[];
  requestId?: string | null;
};

export type AssignmentPolicyExecuteRequest = {
  leadId?: string;
  dealId?: string;
  manualAssigneeUserId?: string;
  reason?: string;
  dry_run?: boolean;
};

export type AssignmentPolicyExecuteEnvelope = {
  ok: true;
  requestId?: string | null;
  dryRun: boolean;
  mode: AssignmentMode;
  leadId: string | null;
  dealId: string | null;
  selectedAssigneeUserId: string | null;
  selectedAssigneeName: string | null;
  assignmentApplied: boolean;
  fallbackUsed: boolean;
  reasoning: string[];
};

export type AgentWorkloadStageDistribution = {
  stage: string;
  count: number;
};

export type AgentWorkloadItem = {
  userId: string;
  fullName: string;
  email: string;
  role: string;
  activeLeads: number;
  activeDeals: number;
  stageDistribution: AgentWorkloadStageDistribution[];
  overdueFollowups: number;
  slaRiskCount: number;
  wonDeals: number;
  closedDeals: number;
  conversionRatePct: number;
  respondedLeadCount: number;
  responseRatePct: number;
  avgFirstResponseHours: number;
};

export type AgentWorkloadEnvelope = {
  ok: true;
  requestId?: string | null;
  generatedAt: string;
  slaRules: {
    leadResponseHours: number;
    dealAgingHours: number;
  };
  agents: AgentWorkloadItem[];
};

export type ReplyStudioEnvelope = {
  ok: true;
  leadId: string;
  source: 'model' | 'fallback';
  provider: string;
  model?: string;
  fallbackUsed: boolean;
  schemaValid?: boolean;
  failureReason: string | null;
  dryRun: boolean;
  processingMs?: number;
  data: ReplyStudioDraft;
  requestId?: string | null;
};

export type QuoteRecommendationRequest = {
  leadId: string;
  dealId?: string;
  quoteId?: string;
  dry_run?: boolean;
};

export type QuoteRecommendationItem = {
  productId: string | null;
  productName: string;
  suggestedQuantity: number | null;
  suggestedVariant: string | null;
  rationale: string;
};

export type QuoteRecommendationMissingField = {
  field: string;
  reason: string;
};

export type QuoteRecommendationEnvelope = {
  ok: true;
  leadId: string;
  dealId: string | null;
  quoteId: string | null;
  source: 'model' | 'fallback';
  provider: string;
  model?: string;
  fallbackUsed: boolean;
  schemaValid?: boolean;
  failureReason: string | null;
  dryRun: boolean;
  processingMs?: number;
  data: {
    summary: string;
    recommendations: QuoteRecommendationItem[];
    missingData: QuoteRecommendationMissingField[];
    canCreateQuote: boolean;
    suggestedNextAction: string;
    confidence: number;
  };
  requestId?: string | null;
};

export type QuoteCopilotAcceptedItem = {
  productId: string | null;
  productName: string;
  suggestedQuantity: number | null;
  suggestedVariant: string | null;
};

export type QuoteCopilotRequest = {
  leadId: string;
  dealId?: string;
  quoteId?: string;
  acceptedRecommendations: QuoteCopilotAcceptedItem[];
  dry_run?: boolean;
};

export type QuoteCopilotUpsell = {
  title: string;
  type: 'upsell' | 'cross_sell';
  rationale: string;
};

export type QuoteCopilotEnvelope = {
  ok: true;
  leadId: string;
  dealId: string | null;
  quoteId: string | null;
  source: 'model' | 'fallback';
  provider: string;
  model?: string;
  fallbackUsed: boolean;
  schemaValid?: boolean;
  failureReason: string | null;
  dryRun: boolean;
  processingMs?: number;
  data: {
    summary: {
      summaryTitle: string;
      summaryText: string;
      acceptedCount: number;
      acceptedItems: string[];
      generationMode: 'selected_recommendations' | 'lead_context_only';
      canProceed: boolean;
      suggestedNextAction: string;
    };
    upsellSuggestions: QuoteCopilotUpsell[];
    quoteIntelligence: {
      estimatedSubtotalAED: number | null;
      marginSafety: {
        status: 'safe' | 'watch' | 'risk';
        estimatedGrossMarginPct: number | null;
        guidance: string;
      };
      discountGuidance: {
        requestedDiscountPct: number | null;
        suggestedDiscountPct: number | null;
        maxSafeDiscountPct: number | null;
        reason: string;
      };
      pricingRiskHints: string[];
    };
  };
  requestId?: string | null;
};

export type PipelineInsightReason = {
  label: string;
  impact: 'low' | 'medium' | 'high';
};

export type PipelineInsightQueueItem = {
  title: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  reason: string;
};

export type PipelineInsightEnvelope = {
  ok: true;
  leadId: string | null;
  dealId: string | null;
  source: 'model' | 'fallback';
  provider: string;
  model?: string;
  fallbackUsed: boolean;
  schemaValid?: boolean;
  failureReason: string | null;
  dryRun: boolean;
  processingMs?: number;
  data: {
    summary: string;
    stalled: boolean;
    stageAgeDays: number;
    inactivityDays: number;
    riskScore: number;
    riskReasons: PipelineInsightReason[];
    urgencyQueue: PipelineInsightQueueItem[];
    nextAction: string;
  };
  requestId?: string | null;
};

export type PipelineInsightExecuteAction =
  | 'draft_followup'
  | 'assign_owner'
  | 'move_stage_suggestion';

export type PipelineInsightExecuteEnvelope = {
  ok: true;
  action: PipelineInsightExecuteAction;
  leadId: string | null;
  dealId: string | null;
  dryRun: boolean;
  outcome: string;
  requestId?: string | null;
};

export type NextBestActionCard = {
  title: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  reason: string;
  leadId?: string | null;
  dealId?: string | null;
};

export type AutomationRunDetailItem = {
  id: string;
  workflowName: string;
  status: 'success' | 'failed' | 'pending';
  triggerSource: string | null;
  inputSummary: string;
  outputSummary: string;
  failureMetadata: string | null;
  createdAt: string;
};

export type AutomationRunDetailEnvelope = {
  ok: true;
  page: number;
  pageSize: number;
  total: number;
  items: AutomationRunDetailItem[];
  processingMs?: number;
  requestId?: string | null;
};

export type SmartRoutingSlaEnvelope = {
  ok: true;
  leadId: string | null;
  dealId: string | null;
  source: 'model' | 'fallback';
  provider: string;
  model?: string;
  fallbackUsed: boolean;
  schemaValid?: boolean;
  failureReason: string | null;
  dryRun: boolean;
  data: {
    recommendedOwner: string | null;
    routingReason: string;
    slaBucket: 'on_track' | 'at_risk' | 'breached';
    slaReason: string;
    recommendedAction: string;
  };
  processingMs?: number;
  requestId?: string | null;
};

export type AutomationRunRerunEnvelope = {
  ok: true;
  runId: string;
  dryRun: boolean;
  guardrailPassed: boolean;
  outcome: string;
  requestId?: string | null;
};

export type AutomationTemplateItem = {
  key: string;
  name: string;
  category: string;
  description: string;
  inputs: string[];
  outputs: string[];
  guardrails: string[];
  enabled: boolean;
};

export type AutomationTemplateLibraryEnvelope = {
  ok: true;
  templates: AutomationTemplateItem[];
  requestId?: string | null;
};

export type AutomationTemplateToggleEnvelope = {
  ok: true;
  key: string;
  enabled: boolean;
  requestId?: string | null;
};

export type AiModelProvider = 'openai' | 'deterministic';
export type AiModelStylePreset = 'balanced' | 'concise' | 'persuasive';
export type AiRuntimeMode = 'auto' | 'llm_only' | 'fallback_only';

export type AiModelConfig = {
  runtimeMode: AiRuntimeMode;
  provider: AiModelProvider;
  model: string;
  fallbackEnabled: boolean;
  fallbackProvider: AiModelProvider;
  fallbackModel: string;
  stylePreset: AiModelStylePreset;
  temperature: number;
  maxOutputTokens: number;
  requestTimeoutMs: number;
  maxRetries: number;
  retryBackoffMs: number;
  featureFlags: {
    copilot: boolean;
    triage: boolean;
    replyStudio: boolean;
    quote: boolean;
    pipeline: boolean;
    smartRoutingSla: boolean;
    fastapiLeadAi: boolean;
    fastapiEmailDraft: boolean;
  };
  prompts: {
    copilotSystem: string;
    replyStudioSystem: string;
    quoteCopilotSystem: string;
  };
};

export type AiModelProviderCheck = {
  provider: AiModelProvider;
  requiredKey: string;
  present: boolean;
  source: 'env' | 'db' | 'missing';
  message: string;
};

export type AiModelConfigEnvelope = {
  ok: true;
  config: AiModelConfig;
  providerChecks: AiModelProviderCheck[];
  strictEnvChecksPassed: boolean;
  requestId?: string | null;
};

export type AiModelConfigUpdateEnvelope = {
  ok: true;
  config: AiModelConfig;
  strictEnvChecksPassed: boolean;
  requestId?: string | null;
};

export type AiModelSecretsUpdate = {
  openaiApiKey?: string;
};

export type AiPromptTestFeature = 'copilot' | 'reply_studio' | 'quote_copilot';

export type AiPromptTestRequest = {
  feature: AiPromptTestFeature;
  input: string;
  context?: {
    leadId?: string;
    dealId?: string;
    channel?: 'email' | 'whatsapp';
    tone?: 'professional' | 'friendly' | 'persuasive';
  };
  configOverride?: Partial<AiModelConfig> & {
    prompts?: Partial<AiModelConfig['prompts']>;
  };
};

export type AiPromptTestEnvelope = {
  ok: true;
  feature: AiPromptTestFeature;
  source: 'model' | 'fallback';
  provider: string;
  model: string;
  fallbackUsed: boolean;
  schemaValid: boolean;
  parsed: unknown | null;
  parseIssues: string[];
  rawOutput: string;
  latencyMs: number;
  requestId?: string | null;
};

export type AiImpactMetric = {
  value: number;
  today: number;
  last7d: number;
  denominator7d: number;
  deltaPct: number;
};

export type AiImpactKpiEnvelope = {
  ok: true;
  generatedAt: string;
  window: {
    todayStart: string;
    last7dStart: string;
  };
  timeSavedEstimate: AiImpactMetric & {
    hoursSaved7d: number;
  };
  suggestionsAccepted: AiImpactMetric & {
    acceptanceRate7d: number;
  };
  riskAlertsResolved: AiImpactMetric & {
    resolutionRate7d: number;
  };
  requestId?: string | null;
};
