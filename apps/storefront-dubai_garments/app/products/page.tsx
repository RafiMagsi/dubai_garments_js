'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import StorefrontShell from '@/components/layout/storefront-shell';
import {
  Button,
  Card,
  CardText,
  CardTitle,
  SelectField,
  TextField,
} from '@/components/ui';
import { ProductCategory, useProducts } from '@/features/products';

const categoryOptions: Array<{ label: string; value: ProductCategory | 'all' }> = [
  { label: 'All Categories', value: 'all' },
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
          <div className="dg-container space-y-6">
          <div className="space-y-3">
            <span className="dg-badge">Catalog</span>
            <h1 className="dg-section-title">Products Catalog</h1>
            <p className="dg-section-copy max-w-3xl">
              Browse production-ready garments, filter by category, and shortlist items for quote
              requests and procurement planning.
            </p>
          </div>

          <Card className="space-y-4">
            <div className="grid gap-3 md:grid-cols-[2fr_1fr_auto] md:items-end">
              <div>
                <label className="ui-field-label" htmlFor="productSearch">Search</label>
                <TextField
                  id="productSearch"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search by product, tag, material, branding..."
                />
              </div>

              <div>
                <label className="ui-field-label" htmlFor="categoryFilter">Category</label>
                <SelectField
                  id="categoryFilter"
                  value={category}
                  onChange={(event) => setCategory(event.target.value as ProductCategory | 'all')}
                >
                  {categoryOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </SelectField>
              </div>

              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setSearchTerm('');
                  setCategory('all');
                }}
              >
                Reset Filters
              </Button>
            </div>
          </Card>

          {isLoading ? (
            <Card>
              <p className="text-sm text-[var(--color-text-muted)]">Loading catalog...</p>
            </Card>
          ) : products.length === 0 ? (
            <Card>
              <CardTitle>No matching products</CardTitle>
              <CardText>Try different filters or clear the search to view the full catalog.</CardText>
              <div className="mt-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setSearchTerm('');
                    setCategory('all');
                  }}
                >
                  Show All Products
                </Button>
              </div>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {products.map((product) => (
                <Card key={product.id} className="flex h-full flex-col">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="dg-chip">{product.category}</span>
                    {product.featured && <span className="dg-chip">Featured</span>}
                  </div>

                  <CardTitle className="mt-3">{product.name}</CardTitle>
                  <CardText className="mt-2">{product.shortDescription}</CardText>

                  <div className="mt-4 space-y-1 text-sm text-[var(--color-text-muted)]">
                    <p>MOQ: {product.minOrderQty}</p>
                    <p>Lead Time: {product.leadTimeDays} days</p>
                    <p>
                      {product.priceTiers.length > 0
                        ? `From AED ${product.priceTiers[0].unitPriceAED}/unit`
                        : 'Price on request'}
                    </p>
                  </div>

                  <div className="mt-auto flex flex-wrap gap-2 pt-5">
                    <Link href={`/products/${product.slug}`}>
                      <Button variant="secondary" size="sm">View Details</Button>
                    </Link>
                    <Link href="/quote">
                      <Button size="sm">Request Quote</Button>
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          )}
          </div>
        </section>
      </main>
    </StorefrontShell>
  );
}
