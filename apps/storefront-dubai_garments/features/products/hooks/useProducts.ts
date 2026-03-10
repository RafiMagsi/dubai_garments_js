import { useQuery } from '@tanstack/react-query';
import { getProductBySlug, getProducts } from '@/features/products/services/product-service';
import { ProductFilters } from '@/features/products/types/product.types';

export function useProducts(filters?: ProductFilters) {
  return useQuery({
    queryKey: ['products', filters],
    queryFn: () => getProducts(filters),
  });
}

export function useFeaturedProducts() {
  return useProducts({ featuredOnly: true });
}

export function useProductBySlug(slug: string) {
  return useQuery({
    queryKey: ['product', slug],
    queryFn: () => getProductBySlug(slug),
    enabled: Boolean(slug),
  });
}
