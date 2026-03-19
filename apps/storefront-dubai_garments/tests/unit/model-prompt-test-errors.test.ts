import { describe, expect, it } from 'vitest';
import {
  classifyPromptTestErrorStatus,
  PromptTestConfigError,
  PromptTestUpstreamError,
} from '../../lib/ai-sales-agent/model-prompt-test-errors';

describe('model prompt test error status mapping', () => {
  it('maps config errors to 400', () => {
    expect(
      classifyPromptTestErrorStatus(
        new PromptTestConfigError('Missing OPENAI_API_KEY for selected provider.')
      )
    ).toBe(400);
  });

  it('maps upstream errors to 502', () => {
    expect(
      classifyPromptTestErrorStatus(
        new PromptTestUpstreamError('OpenAI request failed (500): upstream error')
      )
    ).toBe(502);
  });

  it('maps unknown errors to 500', () => {
    expect(classifyPromptTestErrorStatus(new Error('unknown'))).toBe(500);
  });
});
