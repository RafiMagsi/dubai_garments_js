import Link from 'next/link';
import { Product } from '@/features/products';
import {
  formatAed,
  formatBadgeLabel,
  getStartingUnitPriceAED,
} from '@/features/products/utils/product-pricing';

type ProductCardProps = {
  product: Product;
  detailsHref?: string;
  quoteHref?: string;
};

export default function ProductCard({
  product,
  detailsHref = `/products/${product.slug}`,
  quoteHref = '/quote',
}: ProductCardProps) {
  const startingPrice = getStartingUnitPriceAED(product);

  return (
    <article className="dg-product-card dgx-product-card">
      <div className="dg-product-image dg-quick-card dgx-product-media">
        <span className="dg-product-tag">{formatBadgeLabel(product.category)}</span>
      </div>
      <div className="dg-product-body">
        <h3 className="dg-product-name">{product.name}</h3>
        <div className="dgx-product-meta-grid">
          <p className="dg-product-meta">
            <strong>Price:</strong> {startingPrice !== null ? `${formatAed(startingPrice)} / unit` : 'On request'}
          </p>
          <p className="dg-product-meta"><strong>MOQ:</strong> {product.minOrderQty} pcs</p>
          <p className="dg-product-meta"><strong>Lead Time:</strong> {product.leadTimeDays} days</p>
          <p className="dg-product-meta"><strong>Fabric:</strong> {product.material || '-'}</p>
        </div>
        <p className="dg-product-meta">
          <strong>Customization:</strong> {product.brandingOptions.length > 0 ? product.brandingOptions.join(', ') : '-'}
        </p>
        <div className="dg-product-actions">
          <Link href={detailsHref} className="dg-col-fill">
            <span className="dg-btn-secondary w-full">Details</span>
          </Link>
          <Link href={quoteHref} className="dg-col-fill">
            <span className="dg-btn-primary w-full">Quote</span>
          </Link>
        </div>
      </div>
    </article>
  );
}
