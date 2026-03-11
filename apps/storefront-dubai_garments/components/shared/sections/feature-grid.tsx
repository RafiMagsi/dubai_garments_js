import { ReactNode } from 'react';

export type FeatureGridItem = {
  title: string;
  description: string;
  eyebrow?: string;
  action?: ReactNode;
};

type FeatureGridProps = {
  items: FeatureGridItem[];
  columns?: 2 | 3 | 4;
  className?: string;
};

export function FeatureGrid({ items, columns = 3, className = '' }: FeatureGridProps) {
  return (
    <div className={`dg-feature-grid cols-${columns} ${className}`.trim()}>
      {items.map((item) => (
        <article key={item.title} className="dg-card dg-chart-card dg-motion-fade-up">
          {item.eyebrow ? <p className="dg-kpi-label">{item.eyebrow}</p> : null}
          <h3 className="dg-title-sm mt-2">{item.title}</h3>
          <p className="dg-muted-sm">{item.description}</p>
          {item.action ? <div className="mt-3">{item.action}</div> : null}
        </article>
      ))}
    </div>
  );
}
