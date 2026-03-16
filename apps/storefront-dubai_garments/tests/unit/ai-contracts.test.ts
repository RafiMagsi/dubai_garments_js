import { describe, expect, it } from 'vitest';
import {
  CopilotRequestSchema,
  LeadTriageRequestSchema,
} from '../../lib/ai-sales-agent/contracts';

describe('AI Sales Agent contracts', () => {
  it('accepts valid copilot draft reply request', () => {
    const parsed = CopilotRequestSchema.safeParse({
      intent: 'draft_reply',
      leadId: '550e8400-e29b-41d4-a716-446655440000',
      channel: 'email',
      context: {
        tone: 'professional',
        userNotes: 'Draft a concise first reply.',
      },
    });
    expect(parsed.success).toBe(true);
  });

  it('rejects invalid copilot payload', () => {
    const parsed = CopilotRequestSchema.safeParse({
      intent: 'draft_reply',
      leadId: 'not-a-uuid',
      channel: 'sms',
    });
    expect(parsed.success).toBe(false);
  });

  it('requires uuid for triage payload', () => {
    expect(
      LeadTriageRequestSchema.safeParse({
        leadId: '550e8400-e29b-41d4-a716-446655440001',
        dry_run: false,
      }).success
    ).toBe(true);

    expect(
      LeadTriageRequestSchema.safeParse({
        leadId: 'invalid-id',
        dry_run: false,
      }).success
    ).toBe(false);
  });
});
