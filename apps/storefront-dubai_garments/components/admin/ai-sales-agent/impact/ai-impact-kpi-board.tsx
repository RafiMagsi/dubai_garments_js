'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, CardText, CardTitle } from '@/components/ui';
import { AisBadge, AisSectionEyebrow } from '@/components/admin/ai-sales-agent/reusable';
import { getAiImpactKpis } from '@/features/admin/ai-sales-agent/api';
import type { AiImpactKpiEnvelope } from '@/features/admin/ai-sales-agent/types';

type Props = {
  compact?: boolean;
  title?: string;
  subtitle?: string;
  className?: string;
};

export default function AiImpactKpiBoard({
  compact = false,
  title = 'AI Impact KPI Board',
  subtitle = 'Track measurable AI impact on speed, acceptance, and risk resolution.',
  className = '',
}: Props) {
  const [data, setData] = useState<AiImpactKpiEnvelope | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);

    void getAiImpactKpis()
      .then((result) => {
        if (!mounted) return;
        setData(result);
      })
      .catch((err: unknown) => {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : 'Failed to load AI impact metrics.');
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const cards = useMemo(() => {
    if (!data) return [];
    return [
      {
        key: 'time_saved',
        label: 'Time Saved',
        value: `${data.timeSavedEstimate.hoursSaved7d}h`,
        meta: `${data.timeSavedEstimate.last7d} min / 7d`,
        stat: `${data.timeSavedEstimate.today} min today`,
        tone:
          data.timeSavedEstimate.deltaPct >= 0
            ? (`green` as const)
            : (`amber` as const),
        delta: `${data.timeSavedEstimate.deltaPct >= 0 ? '+' : ''}${data.timeSavedEstimate.deltaPct}%`,
      },
      {
        key: 'accepted',
        label: 'Suggestions Accepted',
        value: String(data.suggestionsAccepted.last7d),
        meta: `${data.suggestionsAccepted.acceptanceRate7d}% acceptance`,
        stat: `${data.suggestionsAccepted.today} accepted today`,
        tone:
          data.suggestionsAccepted.acceptanceRate7d >= 60
            ? (`green` as const)
            : (`amber` as const),
        delta: `${data.suggestionsAccepted.deltaPct >= 0 ? '+' : ''}${data.suggestionsAccepted.deltaPct}%`,
      },
      {
        key: 'risk_resolved',
        label: 'Risk Alerts Resolved',
        value: String(data.riskAlertsResolved.last7d),
        meta: `${data.riskAlertsResolved.resolutionRate7d}% resolved`,
        stat: `${data.riskAlertsResolved.today} resolved today`,
        tone:
          data.riskAlertsResolved.resolutionRate7d >= 70
            ? (`green` as const)
            : (`amber` as const),
        delta: `${data.riskAlertsResolved.deltaPct >= 0 ? '+' : ''}${data.riskAlertsResolved.deltaPct}%`,
      },
    ];
  }, [data]);

  return (
    <Card
      className={['pins-card', className].filter(Boolean).join(' ')}
      data-testid={compact ? 'ai-impact-kpi-board-compact' : 'ai-impact-kpi-board'}
    >
      <div className="dg-grid dg-gap-3">
        <div>
          <AisSectionEyebrow>AI Impact</AisSectionEyebrow>
          <CardTitle>{title}</CardTitle>
          <CardText>{subtitle}</CardText>
        </div>

        {loading ? <p className="pins-muted">Loading AI impact metrics...</p> : null}
        {error ? <p className="pins-card-error">{error}</p> : null}

        {!loading && !error && cards.length === 0 ? (
          <p className="pins-muted">No AI impact data available yet.</p>
        ) : null}

        {!loading && !error && cards.length > 0 ? (
          <div className={compact ? 'dg-kpi-grid dg-kpi-grid-compact' : 'dg-kpi-grid'}>
            {cards.map((card) => (
              <article
                key={card.key}
                className="dg-card dg-kpi-card"
                data-testid={`ai-impact-kpi-${card.key}`}
              >
                <div className="dg-flex dg-items-center dg-justify-between dg-gap-2">
                  <p className="dg-kpi-label">{card.label}</p>
                  <AisBadge tone={card.tone}>{card.delta}</AisBadge>
                </div>
                <p className="dg-kpi-value">{card.value}</p>
                <p className="dg-kpi-meta">{card.meta}</p>
                <p className="dg-kpi-meta">{card.stat}</p>
              </article>
            ))}
          </div>
        ) : null}
      </div>
    </Card>
  );
}

