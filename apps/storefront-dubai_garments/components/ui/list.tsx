import { HTMLAttributes } from 'react';
import clsx from 'clsx';

export function List({ className, ...props }: HTMLAttributes<HTMLUListElement>) {
  return <ul className={clsx('ui-list', className)} {...props} />;
}

export function ListItem({ className, ...props }: HTMLAttributes<HTMLLIElement>) {
  return <li className={clsx('ui-list-item', className)} {...props} />;
}
