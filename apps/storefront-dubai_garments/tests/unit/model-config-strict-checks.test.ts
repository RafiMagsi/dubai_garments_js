import { describe, expect, it } from 'vitest';
import { AiModelConfigSchema } from '../../lib/ai-sales-agent/contracts';
import { computeStrictEnvChecksPassed } from '../../lib/ai-sales-agent/model-config-strict-checks';

describe('model config strict env checks', () => {
  it('passes when primary is present and fallback is disabled', () => {
    const config = AiModelConfigSchema.parse({
      ...AiModelConfigSchema.parse({
        prompts: {},
      }),
      provider: 'openai',
      fallbackEnabled: false,
      fallbackProvider: 'openai',
    });

    const passed = computeStrictEnvChecksPassed(config, [
      {
        provider: 'openai',
        requiredKey: 'OPENAI_API_KEY',
        present: true,
        source: 'env',
        message: 'ok',
      },
      {
        provider: 'openai',
        requiredKey: 'OPENAI_API_KEY',
        present: false,
        source: 'missing',
        message: 'missing',
      },
    ]);

    expect(passed).toBe(true);
  });

  it('fails when fallback is enabled and fallback key is missing', () => {
    const config = AiModelConfigSchema.parse({
      ...AiModelConfigSchema.parse({
        prompts: {},
      }),
      provider: 'openai',
      fallbackEnabled: true,
      fallbackProvider: 'openai',
    });

    const passed = computeStrictEnvChecksPassed(config, [
      {
        provider: 'openai',
        requiredKey: 'OPENAI_API_KEY',
        present: true,
        source: 'env',
        message: 'ok',
      },
      {
        provider: 'openai',
        requiredKey: 'OPENAI_API_KEY',
        present: false,
        source: 'missing',
        message: 'missing',
      },
    ]);

    expect(passed).toBe(false);
  });
});
