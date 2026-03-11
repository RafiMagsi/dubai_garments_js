import { ReactNode } from 'react';

type EmptyStateCardProps = {
  title: string;
  description: string;
  action?: ReactNode;
};

export default function EmptyStateCard({ title, description, action }: EmptyStateCardProps) {
  return (
    <div className="dg-card dg-info-card">
      <h3 className="dg-title-sm">{title}</h3>
      <p className="dg-muted-sm">{description}</p>
      {action ? <div className="dg-hero-actions">{action}</div> : null}
    </div>
  );
}
