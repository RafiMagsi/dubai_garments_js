'use client';

import { useMemo, useState } from 'react';
import StorefrontShell from '@/components/layout/storefront-shell';
import ProductCard from '@/components/store/product-card';
import { EmptyStateCard, StoreSection } from '@/components/storefront/common';
import { ProductCategory, useProducts } from '@/features/products';

const categoryOptions: Array<{ label: string; value: ProductCategory | 'all' }> = [
  { label: 'All', value: 'all' },
  { label: 'T-Shirts', value: 'tshirts' },
  { label: 'Hoodies', value: 'hoodies' },
  { label: 'Uniforms', value: 'uniforms' },
  { label: 'Jerseys', value: 'jerseys' },
  { label: 'Caps', value: 'caps' },
  { label: 'Jackets', value: 'jackets' },
];

export default function ProductsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState<ProductCategory | 'all'>('all');

  const filters = useMemo(
    () => ({
      search: searchTerm || undefined,
      category,
    }),
    [searchTerm, category]
  );

  const { data: products = [], isLoading } = useProducts(filters);

  return (
    <StorefrontShell>
      <main className="dg-main dgx-home">
        <StoreSection
          title="Catalog Built For Qualification"
          subtitle="Filter by category, compare production constraints, and move directly into quote capture."
          action={<span className="dg-badge">{products.length} Products</span>}
          className="dg-section dgx-surface-section"
        >
            <div className="dg-card dg-filter-card dgx-filter-card">
              <div className="dg-filter-row">
                {categoryOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`dg-chip ${category === option.value ? 'dg-chip-active' : ''}`}
                    onClick={() => setCategory(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
                <input
                  className="dg-input dg-col-fill"
                  placeholder="Search product, use-case, or material..."
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
              </div>
            </div>

            {isLoading ? (
              <div className="dg-card dg-info-card">
                <p className="dg-muted-sm">Loading catalog...</p>
              </div>
            ) : (
              <div className="dg-product-grid">
                {products.map((product) => <ProductCard key={product.id} product={product} />)}

                {products.length === 0 && (
                  <EmptyStateCard
                    title="No products found"
                    description="Try another search term or clear the category filter."
                    action={
                      <button
                        type="button"
                        className="dg-btn-primary"
                        onClick={() => {
                          setSearchTerm('');
                          setCategory('all');
                        }}
                      >
                        Clear Filters
                      </button>
                    }
                  />
                )}
              </div>
            )}
        </StoreSection>
      </main>
    </StorefrontShell>
  );
}
