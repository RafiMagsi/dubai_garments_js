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
    <article className="dg-product-card">
      <div className="dg-product-image dg-quick-card">
        <span className="dg-product-tag">{formatBadgeLabel(product.category)}</span>
      </div>
      <div className="dg-product-body">
        <h3 className="dg-product-name">{product.name}</h3>
        <p className="dg-product-meta">
          Price: {startingPrice !== null ? `${formatAed(startingPrice)} / unit` : 'On request'}
        </p>
        <p className="dg-product-meta">MOQ: {product.minOrderQty} pcs</p>
        <p className="dg-product-meta">Lead Time: {product.leadTimeDays} days</p>
        <p className="dg-product-meta">Fabric: {product.material || '-'}</p>
        <p className="dg-product-meta">
          Customization: {product.brandingOptions.length > 0 ? product.brandingOptions.join(', ') : '-'}
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
