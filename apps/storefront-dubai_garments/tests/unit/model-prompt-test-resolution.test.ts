import { describe, expect, it } from 'vitest';
import { resolveSystemPrompt } from '../../lib/ai-sales-agent/llm-runtime/prompt-resolution';

const savedPrompts = {
  copilotSystem: 'Saved Copilot Prompt',
  replyStudioSystem: 'Saved Reply Studio Prompt',
  quoteCopilotSystem: 'Saved Quote Prompt',
};

describe('prompt test system prompt resolution', () => {
  it('uses saved prompts when no override is provided', () => {
    expect(resolveSystemPrompt('copilot', savedPrompts)).toBe(savedPrompts.copilotSystem);
    expect(resolveSystemPrompt('reply_studio', savedPrompts)).toBe(
      savedPrompts.replyStudioSystem
    );
    expect(resolveSystemPrompt('quote_copilot', savedPrompts)).toBe(
      savedPrompts.quoteCopilotSystem
    );
  });

  it('prefers override prompt keys when provided', () => {
    expect(
      resolveSystemPrompt('copilot', savedPrompts, {
        prompts: { copilotSystem: 'Override Copilot Prompt' },
      })
    ).toBe('Override Copilot Prompt');

    expect(
      resolveSystemPrompt('reply_studio', savedPrompts, {
        prompts: { replyStudioSystem: 'Override Reply Prompt' },
      })
    ).toBe('Override Reply Prompt');
  });
});
