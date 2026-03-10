import Link from 'next/link';
import { Product } from '@/features/products';

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
  return (
    <article className="dg-product-card">
      <div className="dg-product-image dg-quick-card">
        <span className="dg-product-tag">{product.category}</span>
      </div>
      <div className="dg-product-body">
        <h3 className="dg-product-name">{product.name}</h3>
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
