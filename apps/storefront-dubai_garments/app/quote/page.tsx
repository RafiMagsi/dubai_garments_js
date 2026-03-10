'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import StorefrontShell from '@/components/layout/storefront-shell';
import { FieldLabel, SelectField, TextAreaField, TextField } from '@/components/ui';
import { useProducts } from '@/features/products';
import { useQuoteStore } from '@/features/quote';

type SubmittedSummary = {
  name: string;
  email: string;
  company: string;
  productLabel: string;
  quantity: number;
  deliveryDate: string;
  message: string;
  hasFile: boolean;
};

export default function QuotePage() {
  const { data: products = [] } = useProducts();
  const selectedProductId = useQuoteStore((state) => state.selectedProductId);
  const clearSelectedProduct = useQuoteStore((state) => state.clearSelectedProduct);

  const [submitted, setSubmitted] = useState(false);
  const [submittedLeadCode, setSubmittedLeadCode] = useState<string | null>(null);
  const [submittedSummary, setSubmittedSummary] = useState<SubmittedSummary | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const formData = new FormData(formElement);

    const name = String(formData.get('name') || '').trim();
    const company = String(formData.get('company') || '').trim();
    const email = String(formData.get('email') || '').trim();
    const product = String(formData.get('product') || '').trim();
    const quantity = Number(formData.get('quantity'));
    const deliveryDate = String(formData.get('delivery_date') || '').trim();
    const message = String(formData.get('message') || '').trim();
    const fileUpload = formData.get('file_upload');

    const nextErrors: string[] = [];
    if (!name) nextErrors.push('Name is required.');
    if (!company) nextErrors.push('Company is required.');
    if (!email || !email.includes('@')) nextErrors.push('A valid email is required.');
    if (!product) nextErrors.push('Product is required.');
    if (!Number.isFinite(quantity) || quantity <= 0) nextErrors.push('Quantity must be greater than 0.');

    setErrors(nextErrors);
    if (nextErrors.length > 0) return;

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/quote-requests', { method: 'POST', body: formData });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        const message = payload?.detail || payload?.message || 'Failed to submit quote request.';
        setErrors([String(message)]);
        return;
      }

      const payload = await response.json();
      const productLabel = products.find((item) => item.id === product)?.name || product;

      setSubmitted(true);
      setSubmittedLeadCode(payload?.leadCode ?? null);
      setSubmittedSummary({
        name,
        email,
        company,
        productLabel,
        quantity,
        deliveryDate,
        message,
        hasFile: fileUpload instanceof File && fileUpload.size > 0,
      });
      setErrors([]);
      formElement.reset();
      clearSelectedProduct();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to connect to quote API backend. Check FastAPI server status.';
      setErrors([message]);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <StorefrontShell>
      <main className="dg-main">
        <section className="dg-section">
          <div className="dg-container">
            <div className="dg-card dg-config-card">
              {submitted ? (
                <>
                  <span className="dg-badge">Request Submitted</span>
                  <h1 className="dg-title-lg">Your quote request has been submitted successfully.</h1>
                  <p className="dg-section-copy">Our team will contact you soon.</p>

                  {submittedLeadCode && (
                    <div className="dg-card dg-summary-card">
                      <h2 className="dg-title-sm">Tracking Code</h2>
                      <p className="dg-muted-sm">{submittedLeadCode}</p>
                      <p className="dg-help">Use this with your email in Customer Portal to track progress.</p>
                    </div>
                  )}

                  {submittedSummary && (
                    <div className="dg-card dg-summary-card">
                      <h3 className="dg-title-sm">Request Summary</h3>
                      <div className="dg-summary-list">
                        <p><strong>Name:</strong> {submittedSummary.name}</p>
                        <p><strong>Email:</strong> {submittedSummary.email}</p>
                        <p><strong>Company:</strong> {submittedSummary.company}</p>
                        <p><strong>Product:</strong> {submittedSummary.productLabel}</p>
                        <p><strong>Quantity:</strong> {submittedSummary.quantity}</p>
                        <p><strong>Delivery Date:</strong> {submittedSummary.deliveryDate || '-'}</p>
                        <p><strong>Message:</strong> {submittedSummary.message || '-'}</p>
                        <p><strong>File:</strong> {submittedSummary.hasFile ? 'Attached' : 'Not attached'}</p>
                      </div>
                    </div>
                  )}

                  <div className="dg-card dg-summary-card">
                    <h2 className="dg-title-sm">Want to review other products?</h2>
                    <p className="dg-muted-sm">You can continue browsing the catalog while our sales team prepares your quotation.</p>
                    <div className="dg-hero-actions">
                      <Link href="/products" className="dg-btn-primary">Review Products</Link>
                      <Link href="/customer/dashboard" className="dg-btn-secondary">Open Customer Portal</Link>
                      <button
                        type="button"
                        className="dg-btn-secondary"
                        onClick={() => {
                          setSubmitted(false);
                          setSubmittedSummary(null);
                          setSubmittedLeadCode(null);
                        }}
                      >
                        Submit Another
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <h1 className="dg-section-title">Request Bulk Quote</h1>
                  <p className="dg-section-copy">Share your product and delivery requirements. Our sales team will prepare a tailored quotation.</p>

                  {errors.length > 0 && (
                    <div className="dg-alert-error">
                      <ul className="dg-error-list">
                        {errors.map((error) => (
                          <li key={error}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="dg-config-form" encType="multipart/form-data">
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
                              {product.name} ({product.category})
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
                      <button type="button" className="dg-btn-secondary" onClick={clearSelectedProduct}>
                        Clear Selection
                      </button>
                    </div>
                  </form>
                </>
              )}
            </div>
          </div>
        </section>
      </main>
    </StorefrontShell>
  );
}
