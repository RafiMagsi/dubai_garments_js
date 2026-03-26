import { AdminQuoteItem } from '@/features/admin/quotes/types/quote.types';

function getNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return null;
}

function getString(value: unknown): string | null {
  if (typeof value === 'string' && value.trim() !== '') return value.trim();
  return null;
}

function money(currency: string, value: number | null) {
  return value === null ? 'n/a' : `${currency} ${value.toFixed(2)}`;
}

function percent(value: number | null) {
  return value === null ? 'n/a' : `${value}%`;
}

function extract(item: AdminQuoteItem, defaultCurrency: string) {
  const source =
    item.pricing_breakdown && typeof item.pricing_breakdown === 'object' && !Array.isArray(item.pricing_breakdown)
      ? item.pricing_breakdown
      : {};

  const sourceCurrency = getString((source as Record<string, unknown>).currency) ?? defaultCurrency;
  const quantity = getNumber((source as Record<string, unknown>).quantity) ?? item.quantity;
  const unitPrice = getNumber((source as Record<string, unknown>).unit_price) ?? item.unit_price;
  const discountAmount = getNumber((source as Record<string, unknown>).discount_amount) ?? item.discount_amount;
  const marginPct = getNumber((source as Record<string, unknown>).margin_pct);
  const taxPct = getNumber((source as Record<string, unknown>).tax_pct);
  const total =
    getNumber((source as Record<string, unknown>).total) ??
    getNumber((source as Record<string, unknown>).line_total) ??
    item.line_total;

  return {
    sourceCurrency,
    quantity,
    unitPrice,
    discountAmount,
    marginPct,
    taxPct,
    total,
  };
}

interface PricingBreakdownTableProps {
  currency: string;
  items: AdminQuoteItem[];
}

export default function PricingBreakdownTable({ currency, items }: PricingBreakdownTableProps) {
  return (
    <div className="ui-table-wrap max-w-full dg-quote-table-wrap">
      <table className="ui-table ui-table-density-compact dg-quote-pricing-table">
        <thead>
          <tr>
            <th>Item</th>
            <th>Qty</th>
            <th>Unit Price</th>
            <th>Adjustments</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const row = extract(item, currency);
            return (
              <tr key={`pricing:${item.id}`}>
                <td>{item.item_name}</td>
                <td>{row.quantity}</td>
                <td>{money(row.sourceCurrency, row.unitPrice)}</td>
                <td>
                  <span className="dg-help">
                    Disc {money(row.sourceCurrency, row.discountAmount)} • Margin {percent(row.marginPct)} • Tax{' '}
                    {percent(row.taxPct)}
                  </span>
                </td>
                <td>{money(row.sourceCurrency, row.total)}</td>
              </tr>
            );
          })}
          {items.length === 0 && (
            <tr>
              <td colSpan={5}>No pricing breakdown available yet.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
