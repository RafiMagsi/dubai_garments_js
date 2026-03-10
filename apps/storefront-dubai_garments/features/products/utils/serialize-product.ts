import { Product as DbProduct } from '@prisma/client';
import { Product } from '@/features/products/types/product.types';

function parsePriceTiers(value: unknown): Product['priceTiers'] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((tier) => {
      if (typeof tier !== 'object' || tier === null) {
        return null;
      }

      const candidate = tier as Record<string, unknown>;
      const minQty = Number(candidate.minQty);
      const maxQtyRaw = candidate.maxQty;
      const unitPriceAED = Number(candidate.unitPriceAED);

      if (!Number.isFinite(minQty) || !Number.isFinite(unitPriceAED)) {
        return null;
      }

      return {
        minQty,
        maxQty: typeof maxQtyRaw === 'number' ? maxQtyRaw : undefined,
        unitPriceAED,
      };
    })
    .filter((tier): tier is Product['priceTiers'][number] => tier !== null);
}

export function serializeProduct(product: DbProduct): Product {
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    category: product.category as Product['category'],
    shortDescription: product.shortDescription ?? '',
    description: product.description ?? '',
    minOrderQty: product.minOrderQty,
    leadTimeDays: product.leadTimeDays,
    material: product.material ?? '',
    sizes: product.sizes,
    colors: product.colors,
    brandingOptions: product.brandingOptions,
    tags: product.tags,
    priceTiers: parsePriceTiers(product.priceTiers),
    image: product.image,
    gallery: product.gallery,
    featured: product.featured,
  };
}
