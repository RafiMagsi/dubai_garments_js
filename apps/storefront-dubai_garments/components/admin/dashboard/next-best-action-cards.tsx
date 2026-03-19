'use client';

import Link from 'next/link';
import { Card, CardText, CardTitle } from '@/components/ui';
import type { NextBestActionCard } from '@/features/admin/ai-sales-agent/types';

type Props = {
  items: NextBestActionCard[];
};

export default function NextBestActionCards({ items }: Props) {
  return (
    <div className="dg-grid dg-grid-cols-3 dg-gap-4">
      {items.map((item, index) => (
        <Card key={`${item.title}-${index}`}>
          <CardTitle>{item.title}</CardTitle>
          <CardText>{item.reason}</CardText>

          <div className="dg-mt-4 dg-flex dg-flex-wrap dg-gap-2">
            <span className="dg-badge">Urgency: {item.urgency.toUpperCase()}</span>
            {item.leadId ? (
              <Link href={`/admin/leads/${item.leadId}`} className="ui-btn ui-btn-secondary ui-btn-sm">
                Open Lead
              </Link>
            ) : null}
            {item.dealId ? (
              <Link href={`/admin/deals/${item.dealId}`} className="ui-btn ui-btn-secondary ui-btn-sm">
                Open Deal
              </Link>
            ) : null}
          </div>
        </Card>
      ))}
    </div>
  );
}