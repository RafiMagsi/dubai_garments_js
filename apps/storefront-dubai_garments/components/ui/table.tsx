import { HTMLAttributes, TableHTMLAttributes, ThHTMLAttributes, TdHTMLAttributes } from 'react';
import clsx from 'clsx';

type DataTableProps = TableHTMLAttributes<HTMLTableElement> & {
  density?: 'compact' | 'comfortable';
};

export function DataTable({ className, density, ...props }: DataTableProps) {
  return (
    <div className="ui-table-wrap">
      <table
        className={clsx(
          'ui-table',
          density === 'compact' && 'ui-table-density-compact',
          density === 'comfortable' && 'ui-table-density-comfortable',
          className
        )}
        {...props}
      />
    </div>
  );
}

export function TableHeadRow({ className, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={clsx('ui-table-head-row', className)} {...props} />;
}

export function TableRow({ className, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={clsx('ui-table-row', className)} {...props} />;
}

export function TableHeadCell({ className, ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return <th className={clsx('ui-table-head-cell', className)} {...props} />;
}

export function TableCell({ className, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={clsx('ui-table-cell', className)} {...props} />;
}
