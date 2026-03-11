import { formatAed } from '@/features/products/utils/product-pricing';

export function productPriceLabel(name: string, category: string, startingPrice: number | null) {
  const priceText = startingPrice !== null ? `${formatAed(startingPrice)} / unit` : 'On request';
  return `${name} (${category}) - ${priceText}`;
}

export function productPriceLabelWithoutCategory(name: string, startingPrice: number | null) {
  const priceText = startingPrice !== null ? `${formatAed(startingPrice)} / unit` : 'On request';
  return `${name} - ${priceText}`;
}
