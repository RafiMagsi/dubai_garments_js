import clsx from 'clsx';
import { HTMLAttributes } from 'react';

type PageShellProps = HTMLAttributes<HTMLDivElement> & {
  density?: 'comfortable' | 'compact';
  motion?: 'none' | 'stagger';
};

type PanelProps = HTMLAttributes<HTMLElement> & {
  as?: 'section' | 'article' | 'div';
};

export function PageShell({
  density = 'comfortable',
  motion = 'stagger',
  className,
  ...props
}: PageShellProps) {
  return (
    <div
      className={clsx(
        'ui-page-shell',
        density === 'compact' && 'ui-page-shell-compact',
        motion === 'stagger' && 'dg-motion-stagger',
        className
      )}
      {...props}
    />
  );
}

export function Panel({ as = 'section', className, ...props }: PanelProps) {
  const Component = as;
  return <Component className={clsx('ui-panel', className)} {...props} />;
}

export function Toolbar({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={clsx('ui-toolbar', className)} {...props} />;
}
