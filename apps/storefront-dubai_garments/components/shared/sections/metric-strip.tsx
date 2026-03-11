import { ReactNode } from 'react';

export type MetricStripItem = {
  label: string;
  value: ReactNode;
  meta?: ReactNode;
};

type MetricStripProps = {
  items: MetricStripItem[];
  className?: string;
};

export function MetricStrip({ items, className = '' }: MetricStripProps) {
  return (
    <div className={`dg-kpi-grid dg-motion-stagger ${className}`.trim()}>
      {items.map((item) => (
        <article key={item.label} className="dg-card dg-kpi-card dg-motion-fade-up">
          <p className="dg-kpi-label">{item.label}</p>
          <p className="dg-kpi-value">{item.value}</p>
          {item.meta ? <p className="dg-kpi-meta">{item.meta}</p> : null}
        </article>
      ))}
    </div>
  );
}
