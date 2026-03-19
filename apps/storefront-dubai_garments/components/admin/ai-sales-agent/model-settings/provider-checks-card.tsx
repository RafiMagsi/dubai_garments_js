'use client';

import { Card, CardText, CardTitle } from '@/components/ui';
import { AisBadge } from '@/components/admin/ai-sales-agent/reusable';
import type {
  AiModelConfig,
  AiModelConfigEnvelope,
} from '@/features/admin/ai-sales-agent/types';

type Props = {
  checks: AiModelConfigEnvelope['providerChecks'];
  config: AiModelConfig;
};

export default function ProviderChecksCard({ checks, config }: Props) {
  const scopedChecks = checks.filter((_, index) =>
    config.fallbackEnabled ? true : index === 0
  );

  const normalized = scopedChecks.reduce<
    Array<AiModelConfigEnvelope['providerChecks'][number] & { usedBy: string[] }>
  >((acc, check, index) => {
    const role = index === 0 ? 'primary' : 'fallback';
    const existing = acc.find(
      (item) =>
        item.provider === check.provider && item.requiredKey === check.requiredKey
    );
    if (existing) {
      if (!existing.usedBy.includes(role)) existing.usedBy.push(role);
      return acc;
    }

    acc.push({
      ...check,
      usedBy: [role],
    });
    return acc;
  }, []);

  return (
    <Card className="pins-card" data-testid="model-settings-provider-check-card">
      <CardTitle>Provider Key Checks</CardTitle>
      <CardText className="pins-muted">
        Save and live prompt tests require provider keys for selected provider paths.
      </CardText>
      <div className="pins-list">
        {normalized.length === 0 ? (
          <p className="pins-muted">No provider checks available.</p>
        ) : (
          normalized.map((item, index) => (
            <div key={`${item.provider}-${index}`} className="pins-item">
              <div className="pins-item-head">
                <div className="pins-item-title">
                  {item.provider} - {item.requiredKey}
                </div>
                <AisBadge tone={item.present ? 'green' : 'amber'}>
                  {item.present ? 'Available' : 'Missing'}
                </AisBadge>
              </div>
              <div className="pins-item-text">{item.message}</div>
              <div className="pins-item-text">Source: {item.source}</div>
              <div className="pins-item-text">Used by: {item.usedBy.join(' + ')}</div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
