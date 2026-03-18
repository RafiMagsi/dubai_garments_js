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

