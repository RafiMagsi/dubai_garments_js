export type ProductCategory =
  | 'tshirts'
  | 'hoodies'
  | 'uniforms'
  | 'jerseys'
  | 'caps'
  | 'jackets';

export type OrderTier = {
  minQty: number;
  maxQty?: number;
  unitPriceAED: number;
};

export interface Product {
  id: string;
  slug: string;
  name: string;
  category: ProductCategory;
  shortDescription: string;
  description: string;
  minOrderQty: number;
  leadTimeDays: number;
  material: string;
  sizes: string[];
  colors: string[];
  brandingOptions: string[];
  tags: string[];
  priceTiers: OrderTier[];
  image: string;
  gallery?: string[];
  featured?: boolean;
}

export interface ProductFilters {
  search?: string;
  category?: ProductCategory | 'all';
  minQty?: number;
  featuredOnly?: boolean;
}
