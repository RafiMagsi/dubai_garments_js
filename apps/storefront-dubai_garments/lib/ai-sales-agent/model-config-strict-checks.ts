import type { AiModelConfig, AiModelProvider } from '@/lib/ai-sales-agent/contracts';

export type ProviderCheck = {
  provider: AiModelProvider;
  requiredKey: string;
  present: boolean;
  source: 'env' | 'db' | 'missing';
  message: string;
};

export function computeStrictEnvChecksPassed(
  config: AiModelConfig,
  providerChecks: ProviderCheck[]
) {
  const primaryCheck =
    providerChecks[0] ??
    providerChecks.find((item) => item.provider === config.provider);

  if (!primaryCheck?.present) return false;
  if (!config.fallbackEnabled) return true;

  const fallbackCheck =
    providerChecks[1] ??
    providerChecks.find((item) => item.provider === config.fallbackProvider);
  return Boolean(fallbackCheck?.present);
}
