import { Card } from '@/components/ui';
import { AdminQuoteItem } from '@/features/admin/quotes/types/quote.types';

function money(currency: string, value: number | null) {
  return value === null ? 'n/a' : `${currency} ${value.toFixed(2)}`;
}

interface QuoteItemsSummarySectionProps {
  currency: string;
  items: AdminQuoteItem[];
}

export default function QuoteItemsSummarySection({ currency, items }: QuoteItemsSummarySectionProps) {
  if (items.length === 0) {
    return (
      <div className="dg-alert-error">
        No quote items found. Create/rebuild quote items from deal detail to continue.
      </div>
    );
  }

  return (
    <div className="dg-side-stack dg-gap-3">
      {items.map((item, index) => (
        <Card key={item.id} className="dg-summary-card">
          <h3 className="dg-title-sm dg-mb-2">
            Item {index + 1}: {item.item_name}
          </h3>

          <div className="dg-detail-list">
            <div className="dg-detail-item">
              <span>Item</span>
              <strong>{item.item_name}</strong>
            </div>
            <div className="dg-detail-item">
              <span>Qty</span>
              <strong>{item.quantity}</strong>
            </div>
            <div className="dg-detail-item">
              <span>Unit Price</span>
              <strong>{money(currency, item.unit_price)}</strong>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
