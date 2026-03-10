'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import StorefrontShell from '@/components/layout/storefront-shell';
import {
  Button,
  Card,
  CardText,
  CardTitle,
  DataTable,
  TableCell,
  TableHeadCell,
  TableHeadRow,
  TableRow,
} from '@/components/ui';
import { useProductBySlug } from '@/features/products';
import { useQuoteStore } from '@/features/quote';

export default function ProductDetailPage() {
  const params = useParams<{ slug: string }>();
  const slug = typeof params.slug === 'string' ? params.slug : '';
  const setSelectedProduct = useQuoteStore((state) => state.setSelectedProduct);
  const { data: product, isLoading } = useProductBySlug(slug);

  return (
    <StorefrontShell>
      <section className="dg-section">
        <div className="dg-container">
          {isLoading ? (
            <Card>
              <p className="text-sm text-[var(--color-text-muted)]">Loading product details...</p>
            </Card>
          ) : !product ? (
            <Card className="text-center">
              <h1 className="text-2xl font-semibold text-[var(--color-text)]">Product not found</h1>
              <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                The requested product may have been removed or its URL changed.
              </p>
              <div className="mt-5">
                <Link href="/products">
                  <Button variant="secondary">Back to catalog</Button>
                </Link>
              </div>
            </Card>
          ) : (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--color-text-muted)]">
                <Link href="/products" className="dg-nav-link">Products</Link>
                <span>/</span>
                <span className="text-[var(--color-text)]">{product.name}</span>
              </div>

              <div className="grid gap-5 lg:grid-cols-12 lg:items-start">
                <div className="space-y-5 lg:col-span-7">
                  <Card>
                    <div className="h-64 rounded-xl border border-[var(--color-border)] bg-gradient-to-br from-blue-100 via-slate-50 to-indigo-100" />
                    <div className="mt-5 space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="dg-chip">{product.category}</span>
                        <span className="dg-chip">MOQ {product.minOrderQty}</span>
                        <span className="dg-chip">{product.leadTimeDays} Day Lead Time</span>
                      </div>
                      <h1 className="dg-section-title">{product.name}</h1>
                      <p className="dg-section-copy">{product.description}</p>
                    </div>
                  </Card>

                  <Card>
                    <CardTitle>Specifications</CardTitle>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-brand-50)] px-3 py-3 text-sm text-[var(--color-text-muted)]">
                        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-500)]">Material</p>
                        <p className="mt-1 font-semibold text-[var(--color-text)]">{product.material}</p>
                      </div>
                      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-brand-50)] px-3 py-3 text-sm text-[var(--color-text-muted)]">
                        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-500)]">Branding</p>
                        <p className="mt-1 font-semibold text-[var(--color-text)]">{product.brandingOptions.join(', ')}</p>
                      </div>
                      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-brand-50)] px-3 py-3 text-sm text-[var(--color-text-muted)]">
                        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-500)]">Sizes</p>
                        <p className="mt-1 font-semibold text-[var(--color-text)]">{product.sizes.join(', ')}</p>
                      </div>
                      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-brand-50)] px-3 py-3 text-sm text-[var(--color-text-muted)]">
                        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-500)]">Colors</p>
                        <p className="mt-1 font-semibold text-[var(--color-text)]">{product.colors.join(', ')}</p>
                      </div>
                    </div>
                  </Card>

                  <Card>
                    <CardTitle>Price Tiers (AED / unit)</CardTitle>
                    <div className="mt-4">
                      <DataTable>
                        <thead>
                          <TableHeadRow>
                            <TableHeadCell>Quantity Range</TableHeadCell>
                            <TableHeadCell>Unit Price</TableHeadCell>
                          </TableHeadRow>
                        </thead>
                        <tbody>
                          {product.priceTiers.map((tier) => (
                            <TableRow key={`${tier.minQty}-${tier.maxQty ?? 'plus'}`}>
                              <TableCell>{tier.minQty}{tier.maxQty ? ` - ${tier.maxQty}` : '+'}</TableCell>
                              <TableCell>AED {tier.unitPriceAED}</TableCell>
                            </TableRow>
                          ))}
                        </tbody>
                      </DataTable>
                    </div>
                  </Card>
                </div>

                <div className="lg:col-span-5 lg:sticky lg:top-24">
                  <Card className="space-y-4">
                    <p className="dg-eyebrow">Quote Workflow</p>
                    <CardTitle>Ready to request pricing?</CardTitle>
                    <CardText>
                      Save this product into your quote request and include quantities,
                      branding preferences, and delivery date.
                    </CardText>

                    <div className="flex flex-wrap gap-2 pt-1">
                      <Link href="/quote" onClick={() => setSelectedProduct(product.id, product.name)}>
                        <Button size="lg">Request Quote</Button>
                      </Link>
                      <Link href="/products">
                        <Button variant="secondary" size="lg">Back to Catalog</Button>
                      </Link>
                    </div>

                    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-brand-50)] px-3 py-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-500)]">
                        Suggested Next Step
                      </p>
                      <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                        Submit the quote with your target quantity for the best tier pricing.
                      </p>
                    </div>
                  </Card>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </StorefrontShell>
  );
}
