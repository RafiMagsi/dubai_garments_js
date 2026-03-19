import type { AiModelStylePreset } from '@/lib/ai-sales-agent/contracts';

export function getTemperatureForStylePreset(stylePreset: AiModelStylePreset) {
  if (stylePreset === 'concise') return 0.1;
  if (stylePreset === 'persuasive') return 0.4;
  return 0.2;
}
