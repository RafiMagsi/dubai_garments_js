'use client';

import { useMemo, useState } from 'react';
import StorefrontShell from '@/components/layout/storefront-shell';
import ProductCard from '@/components/store/product-card';
import { SectionHeader } from '@/components/ui';
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
      <main className="dg-main">
        <section className="dg-section">
          <div className="dg-container">
            <SectionHeader
              title="Product Catalog"
              subtitle="Browse garments by category and request bulk quotations with customization details."
              action={<span className="dg-badge">{products.length} Products</span>}
            />

            <div className="dg-card dg-filter-card">
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
                  placeholder="Search products..."
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
                  <div className="dg-card dg-info-card">
                    <h3 className="dg-title-sm">No products found</h3>
                    <p className="dg-muted-sm">Try another search term or clear the category filter.</p>
                    <div className="dg-hero-actions">
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
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </main>
    </StorefrontShell>
  );
}
