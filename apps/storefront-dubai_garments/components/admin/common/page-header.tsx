'use client';

import { ReactNode } from 'react';

type AdminPageHeaderProps = {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
};

export default function AdminPageHeader({ title, subtitle, actions }: AdminPageHeaderProps) {
  return (
    <div className="dg-admin-page-head">
      <div>
        <h1 className="dg-page-title">{title}</h1>
        {subtitle ? <p className="dg-page-subtitle">{subtitle}</p> : null}
      </div>
      {actions ? <div className="dg-admin-toolbar">{actions}</div> : null}
    </div>
  );
}
