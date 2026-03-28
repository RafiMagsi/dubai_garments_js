'use client';

import type { ReactNode } from 'react';

type LeadZoneSectionProps = {
  zone: string;
  title: string;
  description: string;
  children: ReactNode;
  testId?: string;
};

export default function LeadZoneSection({
  zone,
  title,
  description,
  children,
  testId,
}: LeadZoneSectionProps) {
  return (
    <section className="dg-lead-zone" data-testid={testId}>
      <div className="dg-lead-detail-section-head">
        <p className="dg-eyebrow">{zone}</p>
        <h2 className="dg-title-sm">{title}</h2>
        <p className="dg-muted-sm">{description}</p>
      </div>
      {children}
    </section>
  );
}

