import { ReactNode } from 'react';

type HeroSectionProps = {
  badge?: string;
  title: string;
  subtitle: string;
  actions?: ReactNode;
  aside?: ReactNode;
  className?: string;
};

export function HeroSection({ badge, title, subtitle, actions, aside, className = '' }: HeroSectionProps) {
  return (
    <section className={`dg-section ${className}`.trim()}>
      <div className="dg-container dg-hero-grid dg-motion-stagger">
        <div className="dg-card dg-hero-card dg-motion-fade-up">
          {badge ? <span className="dg-badge">{badge}</span> : null}
          <h1 className="dg-hero-title">{title}</h1>
          <p className="dg-section-copy">{subtitle}</p>
          {actions ? <div className="dg-hero-actions">{actions}</div> : null}
        </div>
        {aside ? <div className="dg-motion-fade-up">{aside}</div> : null}
      </div>
    </section>
  );
}
