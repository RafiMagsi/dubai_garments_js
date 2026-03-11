import { ReactNode } from 'react';
import { SectionHeader } from '@/components/ui';

type StoreSectionProps = {
  children: ReactNode;
  className?: string;
  containerClassName?: string;
  title?: string;
  subtitle?: string;
  action?: ReactNode;
};

export default function StoreSection({
  children,
  className = 'dg-section',
  containerClassName = 'dg-container',
  title,
  subtitle,
  action,
}: StoreSectionProps) {
  return (
    <section className={className}>
      <div className={containerClassName}>
        {title ? <SectionHeader title={title} subtitle={subtitle} action={action} /> : null}
        {children}
      </div>
    </section>
  );
}
