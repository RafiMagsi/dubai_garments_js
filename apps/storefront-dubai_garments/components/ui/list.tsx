import { HTMLAttributes } from 'react';
import clsx from 'clsx';

type ListProps = HTMLAttributes<HTMLUListElement> & {
  density?: 'compact' | 'comfortable';
};

export function List({ className, density, ...props }: ListProps) {
  return (
    <ul
      className={clsx(
        'ui-list',
        density === 'compact' && 'ui-list-density-compact',
        density === 'comfortable' && 'ui-list-density-comfortable',
        className
      )}
      {...props}
    />
  );
}

export function ListItem({ className, ...props }: HTMLAttributes<HTMLLIElement>) {
  return <li className={clsx('ui-list-item', className)} {...props} />;
}
