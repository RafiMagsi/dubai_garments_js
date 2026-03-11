'use client';

import Link from 'next/link';
import { FormEvent, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import ProductCard from '@/components/store/product-card';
import StorefrontShell from '@/components/layout/storefront-shell';
import { EmptyStateCard, StoreSection } from '@/components/storefront/common';
import { useProductBySlug, useProducts } from '@/features/products';
import {
  formatBadgeLabel,
  getStartingUnitPriceAED,
} from '@/features/products/utils/product-pricing';
import { productPriceLabelWithoutCategory } from '@/features/storefront/utils/product-labels';
import { useQuoteStore } from '@/features/quote';

type ProductConfig = {
  color: string;
  printMethod: string;
  quantity: number;
  deliveryOption: string;
  sizes: string[];
  notes: string;
};

const printMethods = ['Screen Print', 'Embroidery', 'Heat Transfer', 'Sublimation'];
const deliveryOptions = [
  { value: 'standard', label: 'Standard Production' },
  { value: 'priority', label: 'Priority Production' },
  { value: 'rush', label: 'Rush Production' },
];

export default function ProductDetailPage() {
  const params = useParams<{ slug: string }>();
  const slug = typeof params.slug === 'string' ? params.slug : '';
  const { data: product, isLoading } = useProductBySlug(slug);
  const { data: relatedByCategory = [] } = useProducts(
    product ? { category: product.category } : undefined
  );
  const { data: allProducts = [] } = useProducts();
  const setSelectedProduct = useQuoteStore((state) => state.setSelectedProduct);

  const [savedConfig, setSavedConfig] = useState<ProductConfig | null>(null);
  const [formStatus, setFormStatus] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const defaultQuantity = product?.minOrderQty ?? 1;
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);

  const related = useMemo(() => {
    if (!product) return [];

    const categoryMatches = relatedByCategory.filter((item) => item.id !== product.id);
    const fallbackProducts = allProducts.filter(
      (item) =>
        item.id !== product.id &&
        !categoryMatches.some((categoryItem) => categoryItem.id === item.id)
    );

    return [...categoryMatches, ...fallbackProducts].slice(0, 4);
  }, [allProducts, product, relatedByCategory]);
  const startingPrice = product ? getStartingUnitPriceAED(product) : null;

  function toggleSize(size: string) {
    setSelectedSizes((prev) =>
      prev.includes(size) ? prev.filter((item) => item !== size) : [...prev, size]
    );
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!product) return;

    const formData = new FormData(event.currentTarget);
    const color = String(formData.get('color') || '');
    const printMethod = String(formData.get('print_method') || '');
    const quantity = Number(formData.get('quantity') || 0);
    const deliveryOption = String(formData.get('delivery_option') || '');
    const notes = String(formData.get('notes') || '');

    if (!color || !printMethod || !deliveryOption || quantity < product.minOrderQty) {
      setFormError(`Please complete all required fields. Minimum quantity is ${product.minOrderQty}.`);
      setFormStatus(null);
      return;
    }

    setSavedConfig({
      color,
      printMethod,
      quantity,
      deliveryOption,
      sizes: selectedSizes,
      notes,
    });
    setFormError(null);
    setFormStatus('Configuration saved successfully.');
  }

  return (
    <StorefrontShell>
      <main className="dg-main">
        <section className="dg-section">
          <div className="dg-container dg-detail-grid">
            <div className="dg-card dg-detail-media">
              <div className="dg-product-image" />
            </div>

            <div className="dg-card dg-info-card">
              {isLoading && <p className="dg-muted-sm">Loading product...</p>}
              {!isLoading && !product && <p className="dg-muted-sm">Product not found.</p>}
              {product && (
                <>
                  <span className="dg-badge">{formatBadgeLabel(product.category)}</span>
                  <p className="dg-muted-sm">
                    {productPriceLabelWithoutCategory('Starting Price', startingPrice)}
                  </p>
                  <h1 className="dg-title-lg">{product.name}</h1>
                  <p className="dg-muted-sm">MOQ: {product.minOrderQty} pcs</p>
                  <p className="dg-muted-sm">Lead Time: {product.leadTimeDays} days</p>
                  <p className="dg-muted-sm">Fabric: {product.material || '-'}</p>
                  <p className="dg-muted-sm">
                    Customization: {product.brandingOptions.length > 0 ? product.brandingOptions.join(', ') : '-'}
                  </p>
                  <div className="dg-hero-actions">
                    <Link
                      href="/quote"
                      className="dg-btn-primary"
                      onClick={() => setSelectedProduct(product.id, product.name)}
                    >
                      Request Quote
                    </Link>
                    <Link
                      href={`/products?category=${encodeURIComponent(product.category)}`}
                      className="dg-btn-secondary"
                    >
                      More {formatBadgeLabel(product.category)}
                    </Link>
                  </div>
                </>
              )}
            </div>
          </div>
        </section>

        {product && (
          <StoreSection>
              <div className="dg-card dg-config-card">
                <h2 className="dg-section-title">Product Configuration</h2>
                <p className="dg-section-copy">
                  Select product preferences to prepare an accurate quote.
                </p>

                {formStatus ? <div className="dg-alert-success">{formStatus}</div> : null}
                {formError ? <div className="dg-alert-error">{formError}</div> : null}

                <form onSubmit={handleSubmit} className="dg-config-form">
                  <div className="dg-config-grid">
                    <div className="dg-field">
                      <label className="dg-label" htmlFor="color">
                        Color
                      </label>
                      <select id="color" name="color" className="dg-select" required>
                        <option value="">Select color</option>
                        {product.colors.map((color) => (
                          <option key={color} value={color}>
                            {color}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="dg-field">
                      <label className="dg-label" htmlFor="print_method">
                        Print Method
                      </label>
                      <select id="print_method" name="print_method" className="dg-select" required>
                        <option value="">Select method</option>
                        {printMethods.map((method) => (
                          <option key={method} value={method}>
                            {method}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="dg-field">
                      <label className="dg-label" htmlFor="quantity">
                        Quantity
                      </label>
                      <input
                        id="quantity"
                        name="quantity"
                        type="number"
                        className="dg-input"
                        defaultValue={defaultQuantity}
                        min={product.minOrderQty}
                        required
                      />
                    </div>

                    <div className="dg-field">
                      <label className="dg-label" htmlFor="delivery_option">
                        Production Priority
                      </label>
                      <select
                        id="delivery_option"
                        name="delivery_option"
                        className="dg-select"
                        required
                      >
                        <option value="">Select option</option>
                        {deliveryOptions.map((delivery) => (
                          <option key={delivery.value} value={delivery.value}>
                            {delivery.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <p className="dg-help">Minimum quantity for this item: {product.minOrderQty} pcs</p>

                  <div className="dg-field">
                    <label className="dg-label">Sizes</label>
                    <div className="dg-checkbox-group">
                      {product.sizes.map((size) => (
                        <label key={size} className="dg-checkbox-item">
                          <input
                            type="checkbox"
                            checked={selectedSizes.includes(size)}
                            onChange={() => toggleSize(size)}
                          />
                          <span>{size}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="dg-field">
                    <label className="dg-label" htmlFor="notes">
                      Additional Notes
                    </label>
                    <textarea
                      id="notes"
                      name="notes"
                      className="dg-textarea"
                      rows={4}
                      placeholder="Share logo placement, packaging, or special production notes..."
                    />
                  </div>

                  <div className="dg-hero-actions">
                    <button type="submit" className="dg-btn-primary">
                      Save Configuration
                    </button>
                    <Link href="/products" className="dg-btn-secondary">
                      Back to Catalog
                    </Link>
                  </div>
                </form>

                {savedConfig ? (
                  <div className="dg-card dg-summary-card">
                    <h3 className="dg-title-sm">Saved Configuration</h3>
                    <div className="dg-summary-list">
                      <p>
                        <strong>Color:</strong> {savedConfig.color || '-'}
                      </p>
                      <p>
                        <strong>Sizes:</strong> {savedConfig.sizes.length ? savedConfig.sizes.join(', ') : '-'}
                      </p>
                      <p>
                        <strong>Print Method:</strong> {savedConfig.printMethod || '-'}
                      </p>
                      <p>
                        <strong>Quantity:</strong> {savedConfig.quantity} pcs
                      </p>
                      <p>
                        <strong>Production Priority:</strong> {savedConfig.deliveryOption || '-'}
                      </p>
                      <p>
                        <strong>Notes:</strong> {savedConfig.notes || '-'}
                      </p>
                    </div>
                  </div>
                ) : null}
              </div>
          </StoreSection>
        )}

        {product && (
          <StoreSection
            title="Related Products"
            subtitle="Similar options available for your bulk order requirements."
          >
              <div className="dg-product-grid">
                {related.map((item) => (
                  <ProductCard key={item.id} product={item} />
                ))}
              </div>
              {related.length === 0 ? (
                <EmptyStateCard
                  title="No related products available"
                  description="Browse the full catalog for more options."
                />
              ) : null}
          </StoreSection>
        )}
      </main>
    </StorefrontShell>
  );
}
