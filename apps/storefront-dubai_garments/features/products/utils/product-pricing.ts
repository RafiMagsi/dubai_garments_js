import { Product } from '@/features/products/types/product.types';

export function getStartingUnitPriceAED(product: Pick<Product, 'priceTiers'>): number | null {
  if (!Array.isArray(product.priceTiers) || product.priceTiers.length === 0) {
    return null;
  }

  const prices = product.priceTiers
    .map((tier) => Number(tier.unitPriceAED))
    .filter((value) => Number.isFinite(value) && value >= 0);

  if (prices.length === 0) {
    return null;
  }

  return Math.min(...prices);
}

export function formatAed(value: number): string {
  return `AED ${value.toFixed(2)}`;
}

export function formatBadgeLabel(value: string): string {
  return value
    .replace(/[_-]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}
