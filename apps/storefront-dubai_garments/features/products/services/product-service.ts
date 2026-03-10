import { apiClient } from '@/lib/api/axios';
import { Product, ProductFilters } from '@/features/products/types/product.types';

export async function getProducts(filters?: ProductFilters): Promise<Product[]> {
  const response = await apiClient.get<Product[]>('/products', {
    params: {
      search: filters?.search,
      category: filters?.category,
      minQty: filters?.minQty,
      featuredOnly: filters?.featuredOnly,
    },
  });

  return response.data;
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  try {
    const response = await apiClient.get<Product>(`/products/${slug}`);
    return response.data;
  } catch {
    return null;
  }
}
