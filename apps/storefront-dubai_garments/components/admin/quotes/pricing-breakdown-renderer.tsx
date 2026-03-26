type PricingBreakdownValue = string | number | boolean | null | undefined;

function toLabel(key: string) {
  return key
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^./, (char) => char.toUpperCase());
}

function isTotalLike(key: string) {
  return /(total|grand|final|payable)/i.test(key);
}

function isPercentLike(key: string) {
  return /(pct|percent|percentage|margin_pct|tax_pct|discount_pct)/i.test(key);
}

function isQuantityLike(key: string) {
  return /(quantity|qty|units?)/i.test(key);
}

function isMoneyLike(key: string) {
  return /(price|amount|cost|subtotal|tax|discount|total|margin|fee)/i.test(key);
}

function formatValue(key: string, value: PricingBreakdownValue, currency: string) {
  if (value === null || value === undefined || value === '') return 'n/a';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') {
    if (isPercentLike(key)) return `${value}%`;
    if (isQuantityLike(key)) return String(value);
    if (isMoneyLike(key)) return `${currency} ${value.toFixed(2)}`;
    return String(value);
  }
  return String(value);
}

interface PricingBreakdownRendererProps {
  currency: string;
  breakdown: Record<string, unknown> | null | undefined;
  lineTotal: number;
}

export default function PricingBreakdownRenderer({
  currency,
  breakdown,
  lineTotal,
}: PricingBreakdownRendererProps) {
  const objectBreakdown =
    breakdown && typeof breakdown === 'object' && !Array.isArray(breakdown)
      ? (breakdown as Record<string, unknown>)
      : {};

  const entries = Object.entries(objectBreakdown).filter(([, value]) => {
    return ['string', 'number', 'boolean'].includes(typeof value) || value === null;
  });

  const totalEntry = entries.find(([key]) => isTotalLike(key));
  const topEntries = entries.filter(([key]) => !isTotalLike(key)).slice(0, 6);

  return (
    <div className="dg-overflow-hidden dg-rounded-md dg-border dg-border-[var(--color-border)]">
      {topEntries.length > 0 ? (
        topEntries.map(([key, value], index) => (
          <div
            key={key}
            className={`dg-flex dg-items-center dg-justify-between dg-gap-2 dg-px-2.5 dg-py-1.5 ${
              index < topEntries.length - 1 ? 'dg-border-b dg-border-[var(--color-border)]' : ''
            }`}
          >
            <span className="dg-help">{toLabel(key)}</span>
            <span className="dg-help dg-font-semibold">{formatValue(key, value as PricingBreakdownValue, currency)}</span>
          </div>
        ))
      ) : (
        <div className="dg-px-2.5 dg-py-1.5">
          <span className="dg-help">Base line pricing</span>
        </div>
      )}
      <div className="dg-flex dg-items-center dg-justify-between dg-gap-2 dg-bg-slate-50 dg-px-2.5 dg-py-1.5">
        <span className="dg-text-xs dg-font-semibold">Total</span>
        <span className="dg-text-xs dg-font-semibold">
          {totalEntry
            ? formatValue(totalEntry[0], totalEntry[1] as PricingBreakdownValue, currency)
            : `${currency} ${lineTotal.toFixed(2)}`}
        </span>
      </div>
    </div>
  );
}
