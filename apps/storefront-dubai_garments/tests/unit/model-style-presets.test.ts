import { describe, expect, it } from 'vitest';
import { getTemperatureForStylePreset } from '../../lib/ai-sales-agent/model-style-presets';

describe('model style presets', () => {
  it('maps presets to expected temperatures', () => {
    expect(getTemperatureForStylePreset('balanced')).toBe(0.2);
    expect(getTemperatureForStylePreset('concise')).toBe(0.1);
    expect(getTemperatureForStylePreset('persuasive')).toBe(0.4);
  });
});
