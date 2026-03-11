import { FormEventHandler } from 'react';
import { Product } from '@/features/products';
import { FieldLabel, SelectField, TextAreaField, TextField } from '@/components/ui';
import { getStartingUnitPriceAED } from '@/features/products/utils/product-pricing';
import { productPriceLabel } from '@/features/storefront/utils/product-labels';

type QuoteRequestFormProps = {
  products: Product[];
  selectedProductId: string | null;
  errors: string[];
  isSubmitting: boolean;
  onSubmit: FormEventHandler<HTMLFormElement>;
  onClearSelection: () => void;
};

export default function QuoteRequestForm({
  products,
  selectedProductId,
  errors,
  isSubmitting,
  onSubmit,
  onClearSelection,
}: QuoteRequestFormProps) {
  return (
    <>
      <h1 className="dg-section-title">Request Bulk Quote</h1>
      <p className="dg-section-copy">Share your product and delivery requirements. Our sales team will prepare a tailored quotation.</p>

      {errors.length > 0 ? (
        <div className="dg-alert-error">
          <ul className="dg-error-list">
            {errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <form onSubmit={onSubmit} className="dg-config-form" encType="multipart/form-data">
        <div className="dg-config-grid">
          <div className="dg-field">
            <FieldLabel htmlFor="name">Full Name</FieldLabel>
            <TextField id="name" name="name" required />
          </div>

          <div className="dg-field">
            <FieldLabel htmlFor="company">Company Name</FieldLabel>
            <TextField id="company" name="company" required />
          </div>

          <div className="dg-field">
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <TextField id="email" name="email" type="email" required />
          </div>

          <div className="dg-field">
            <FieldLabel htmlFor="quantity">Quantity</FieldLabel>
            <TextField id="quantity" type="number" name="quantity" min={1} required />
          </div>

          <div className="dg-field">
            <FieldLabel htmlFor="product">Product</FieldLabel>
            <SelectField id="product" name="product" defaultValue={selectedProductId ?? ''} required>
              <option value="">Select product</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {productPriceLabel(product.name, product.category, getStartingUnitPriceAED(product))}
                </option>
              ))}
            </SelectField>
          </div>

          <div className="dg-field">
            <FieldLabel htmlFor="delivery_date">Required Delivery Date</FieldLabel>
            <TextField id="delivery_date" type="date" name="delivery_date" />
          </div>

          <div className="dg-field">
            <FieldLabel htmlFor="file_upload">Logo / Design File</FieldLabel>
            <TextField id="file_upload" type="file" name="file_upload" />
            <p className="dg-help">Accepted: PDF, PNG, JPG, JPEG, SVG, AI, EPS (max 10MB)</p>
          </div>
        </div>

        <div className="dg-field">
          <FieldLabel htmlFor="message">Project Details</FieldLabel>
          <TextAreaField
            id="message"
            name="message"
            rows={5}
            placeholder="Example: We need 500 event hoodies in black/navy with embroidered chest logo and front print..."
            required
          />
        </div>

        <div className="dg-hero-actions">
          <button type="submit" className="dg-btn-primary" disabled={isSubmitting}>
            {isSubmitting ? 'Submitting...' : 'Submit Quote Request'}
          </button>
          <button type="button" className="dg-btn-secondary" onClick={onClearSelection}>
            Clear Selection
          </button>
        </div>
      </form>
    </>
  );
}
