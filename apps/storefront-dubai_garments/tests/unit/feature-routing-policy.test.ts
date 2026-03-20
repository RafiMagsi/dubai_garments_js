import { describe, expect, it } from 'vitest';
import { isFeatureLlmEnabled } from '../../lib/ai-sales-agent/feature-routing';

describe('LLM feature routing policy (P2 selective deterministic)', () => {
  it('keeps deterministic-only intents disabled for LLM', () => {
    expect(isFeatureLlmEnabled('copilot_followups_today')).toBe(false);
    expect(isFeatureLlmEnabled('copilot_at_risk_deals')).toBe(false);
    expect(isFeatureLlmEnabled('lead_triage')).toBe(false);
  });

  it('keeps high-impact draft workflows model-enabled', () => {
    expect(isFeatureLlmEnabled('copilot_draft_reply')).toBe(true);
    expect(isFeatureLlmEnabled('reply_studio')).toBe(true);
  });

  it('enables revenue/operations endpoints in P3 rollout', () => {
    expect(isFeatureLlmEnabled('quote_recommendation')).toBe(true);
    expect(isFeatureLlmEnabled('quote_copilot_summary')).toBe(true);
    expect(isFeatureLlmEnabled('pipeline_insights')).toBe(true);
    expect(isFeatureLlmEnabled('smart_routing_sla')).toBe(true);
  });
});
