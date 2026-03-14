import clsx from 'clsx';
import { HTMLAttributes } from 'react';
import { statusBadgeClass } from '@/lib/ui/status-badge';

type StatusBadgeProps = HTMLAttributes<HTMLSpanElement> & {
  status?: string | null;
};

export function StatusBadge({ status, className, children, ...props }: StatusBadgeProps) {
  return (
    <span className={clsx(statusBadgeClass(status), className)} {...props}>
      {children ?? status ?? 'Unknown'}
    </span>
  );
}
