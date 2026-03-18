import type { ReactNode } from 'react';
import { Card, CardText, CardTitle } from '@/components/ui';

export function AisSectionEyebrow({ children }: { children: string }) {
  return (
    <p
      style={{
        margin: 0,
        fontSize: 11,
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        color: '#64748b',
        fontWeight: 700,
      }}
    >
      {children}
    </p>
  );
}

export function AisKpiPill({
  label,
  value,
  delta,
  border,
  bg,
  fg,
}: {
  label: string;
  value: string;
  delta: string;
  border: string;
  bg: string;
  fg: string;
}) {
  return (
    <div
      style={{
        border: `1px solid ${border}`,
        background: bg,
        color: fg,
        borderRadius: 10,
        padding: '10px 12px',
        minWidth: 140,
      }}
    >
      <AisSectionEyebrow>{label}</AisSectionEyebrow>
      <p style={{ margin: '6px 0 0', fontSize: 20, fontWeight: 700, lineHeight: 1 }}>{value}</p>
      <p style={{ margin: '6px 0 0', fontSize: 12, color: '#475569' }}>{delta}</p>
    </div>
  );
}

export function AisFeatureCard({ title, text }: { title: string; text: string }) {
  return (
    <Card className="ais-feature-card">
      <CardTitle>{title}</CardTitle>
      <CardText>{text}</CardText>
    </Card>
  );
}

export function AisEmptyState({ message }: { message: string }) {
  return (
    <div
      style={{
        border: '1px dashed var(--color-border)',
        borderRadius: 12,
        padding: 14,
        fontSize: 13,
        color: '#64748b',
        background: '#f8fafc',
      }}
    >
      {message}
    </div>
  );
}

type FieldLabelProps = {
  children: string;
  htmlFor?: string;
};

export function AisFieldLabel({ children, htmlFor }: FieldLabelProps) {
  return (
    <label
      htmlFor={htmlFor}
      className="dg-text-xs dg-font-semibold dg-uppercase dg-tracking-wide dg-text-neutral-500"
    >
      {children}
    </label>
  );
}

type AisBadgeTone = 'blue' | 'green' | 'amber' | 'red' | 'violet' | 'slate';

type AisBadgeProps = {
  children: ReactNode;
  tone?: AisBadgeTone;
  className?: string;
};

export function AisBadge({ children, tone = 'slate', className }: AisBadgeProps) {
  const toneClass = `dg-ai-badge-${tone}`;
  return (
    <span className={['dg-ai-badge', toneClass, className].filter(Boolean).join(' ')}>
      {children}
    </span>
  );
}

type AisTrustBadgesProps = {
  processingMs?: number;
  fallbackUsed: boolean;
  provider?: string | null;
  source?: string | null;
  className?: string;
};

export function AisTrustBadges({
  processingMs,
  fallbackUsed,
  provider,
  source,
  className,
}: AisTrustBadgesProps) {
  return (
    <div className={['ars-badges', className].filter(Boolean).join(' ')}>
      <AisBadge tone="blue">Latency: {processingMs ?? 0}ms</AisBadge>
      <AisBadge tone={fallbackUsed ? 'amber' : 'green'}>
        {fallbackUsed ? 'Fallback Active' : 'Primary Path'}
      </AisBadge>
      {provider ? <AisBadge tone="slate">Provider: {provider}</AisBadge> : null}
      {source ? <AisBadge tone="slate">Source: {source}</AisBadge> : null}
    </div>
  );
}
