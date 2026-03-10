import { ReactNode } from 'react';

type SectionHeaderProps = {
  title: string;
  subtitle?: string;
  action?: ReactNode;
};

export function SectionHeader({ title, subtitle, action }: SectionHeaderProps) {
  return (
    <div className="dg-section-head">
      <div>
        <h2 className="dg-section-title">{title}</h2>
        {subtitle ? <p className="dg-section-copy">{subtitle}</p> : null}
      </div>
      {action ? <div>{action}</div> : null}
    </div>
  );
}
