'use client';

import { FormEvent, useState } from 'react';
import StorefrontShell from '@/components/layout/storefront-shell';
import {
  Button,
  Card,
  FieldLabel,
  SelectField,
  TextAreaField,
  TextField,
} from '@/components/ui';
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
  const selectedProductName = useQuoteStore((state) => state.selectedProductName);
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

    if (nextErrors.length > 0) {
      setSubmitted(false);
      setSubmittedLeadCode(null);
      setSubmittedSummary(null);
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/quote-requests', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        const message = payload?.detail || payload?.message || 'Failed to submit quote request.';
        setErrors([String(message)]);
        setSubmitted(false);
        setSubmittedLeadCode(null);
        setSubmittedSummary(null);
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
      const message =
        error instanceof Error
          ? error.message
          : 'Unable to connect to quote API backend. Check FastAPI server status.';
      setErrors([message]);
      setSubmitted(false);
      setSubmittedLeadCode(null);
      setSubmittedSummary(null);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <StorefrontShell>
      <main className="dg-main">
        <section className="dg-section">
          <div className="dg-container">
          <div className="mb-6 space-y-2">
            <h1 className="dg-section-title">Request a Quote</h1>
            <p className="dg-section-copy max-w-3xl">
              Submit product requirements and delivery details to receive pricing and timeline
              estimates for your bulk order.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_0.42fr] lg:items-start">
            <Card>
              {submitted ? (
                <div className="space-y-5">
                  <div className="rounded-xl border border-emerald-200 bg-[var(--color-success-bg)] p-4 text-sm text-[var(--color-success-text)]">
                    <p className="text-base font-semibold text-[var(--color-text)]">Quote Request Submitted</p>
                    <p className="mt-1">
                      Your request has been recorded successfully.
                      {submittedLeadCode ? ` Lead ID: ${submittedLeadCode}` : ''}
                    </p>
                  </div>

                  <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4">
                    <p className="text-sm text-[var(--color-text-muted)]">
                      Our sales team will review your requirements and share pricing tiers, timeline, and next steps.
                    </p>
                  </div>

                  {submittedSummary && (
                    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4">
                      <p className="text-sm font-semibold text-[var(--color-text)]">Request Summary</p>
                      <div className="mt-3 grid gap-2 text-sm text-[var(--color-text-muted)]">
                        <p><span className="font-medium text-[var(--color-text)]">Name:</span> {submittedSummary.name}</p>
                        <p><span className="font-medium text-[var(--color-text)]">Email:</span> {submittedSummary.email}</p>
                        <p><span className="font-medium text-[var(--color-text)]">Company:</span> {submittedSummary.company}</p>
                        <p><span className="font-medium text-[var(--color-text)]">Product:</span> {submittedSummary.productLabel}</p>
                        <p><span className="font-medium text-[var(--color-text)]">Quantity:</span> {submittedSummary.quantity}</p>
                        <p><span className="font-medium text-[var(--color-text)]">Delivery Date:</span> {submittedSummary.deliveryDate || 'Not provided'}</p>
                        <p><span className="font-medium text-[var(--color-text)]">Message:</span> {submittedSummary.message || 'Not provided'}</p>
                        <p><span className="font-medium text-[var(--color-text)]">File:</span> {submittedSummary.hasFile ? 'Attached' : 'Not attached'}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="lg"
                      onClick={() => {
                        setSubmitted(false);
                        setSubmittedLeadCode(null);
                        setSubmittedSummary(null);
                        setErrors([]);
                      }}
                    >
                      Submit Another Request
                    </Button>
                    <Button type="button" variant="secondary" size="lg" onClick={clearSelectedProduct}>
                      Clear Selection
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  {errors.length > 0 && (
                    <div className="mb-4 rounded-xl border border-red-200 bg-[var(--color-danger-bg)] p-4 text-sm text-[var(--color-danger-text)]">
                      {errors.map((error) => (
                        <p key={error}>{error}</p>
                      ))}
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="grid gap-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="sm:col-span-2">
                        <FieldLabel htmlFor="product">Product</FieldLabel>
                        <SelectField id="product" name="product" defaultValue={selectedProductId ?? ''}>
                          <option value="">Select a product</option>
                          {products.map((product) => (
                            <option key={product.id} value={product.id}>
                              {product.name}
                            </option>
                          ))}
                        </SelectField>
                      </div>

                      <div>
                        <FieldLabel htmlFor="name">Name</FieldLabel>
                        <TextField id="name" name="name" placeholder="Name" />
                      </div>

                      <div>
                        <FieldLabel htmlFor="company">Company</FieldLabel>
                        <TextField id="company" name="company" placeholder="Company" />
                      </div>

                      <div>
                        <FieldLabel htmlFor="email">Email Address</FieldLabel>
                        <TextField id="email" name="email" type="email" placeholder="Email Address" />
                      </div>

                      <div>
                        <FieldLabel htmlFor="quantity">Required Quantity</FieldLabel>
                        <TextField id="quantity" name="quantity" type="number" min={1} placeholder="Required Quantity" />
                      </div>

                      <div>
                        <FieldLabel htmlFor="delivery_date">Preferred Delivery Date</FieldLabel>
                        <TextField id="delivery_date" name="delivery_date" type="date" />
                      </div>

                      <div className="sm:col-span-2">
                        <FieldLabel htmlFor="message">Requirements</FieldLabel>
                        <TextAreaField
                          id="message"
                          name="message"
                          placeholder="Special requirements, branding details, colors, sizes..."
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <FieldLabel htmlFor="file_upload">Design / Logo File</FieldLabel>
                        <TextField id="file_upload" name="file_upload" type="file" />
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button type="submit" size="lg" disabled={isSubmitting}>
                        {isSubmitting ? 'Submitting...' : 'Submit Quote Request'}
                      </Button>
                      <Button type="button" variant="secondary" size="lg" onClick={clearSelectedProduct}>
                        Clear Selection
                      </Button>
                    </div>
                  </form>
                </>
              )}
            </Card>

            <div className="grid gap-4">
              <Card>
                <p className="dg-eyebrow">Selected Product</p>
                <p className="mt-2 text-lg font-semibold text-[var(--color-text)]">
                  {selectedProductName || 'No product selected yet'}
                </p>
                {selectedProductId && (
                  <p className="mt-1 text-sm text-[var(--color-text-muted)]">Product ID: {selectedProductId}</p>
                )}
              </Card>

              <Card>
                <p className="dg-eyebrow">What Happens Next</p>
                <ul className="mt-3 space-y-2 text-sm text-[var(--color-text-muted)]">
                  <li>1. We verify product and branding requirements.</li>
                  <li>2. We share pricing tiers and timeline.</li>
                  <li>3. You approve and we start production.</li>
                </ul>
              </Card>
            </div>
          </div>
          </div>
        </section>
      </main>
    </StorefrontShell>
  );
}
