'use client';

import { FormEvent, useState } from 'react';
import StorefrontShell from '@/components/layout/storefront-shell';
import { StoreSection } from '@/components/storefront/common';
import {
  QuoteRequestForm,
  QuoteSuccessView,
  SubmittedSummary,
} from '@/components/storefront/quote';
import { useProducts } from '@/features/products';
import { useQuoteStore } from '@/features/quote';

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
        <StoreSection>
            <div className="dg-card dg-config-card">
              {submitted ? (
                <QuoteSuccessView
                  leadCode={submittedLeadCode}
                  summary={submittedSummary}
                  onSubmitAnother={() => {
                    setSubmitted(false);
                    setSubmittedSummary(null);
                    setSubmittedLeadCode(null);
                  }}
                />
              ) : (
                <QuoteRequestForm
                  products={products}
                  selectedProductId={selectedProductId}
                  errors={errors}
                  isSubmitting={isSubmitting}
                  onSubmit={handleSubmit}
                  onClearSelection={clearSelectedProduct}
                />
              )}
            </div>
        </StoreSection>
      </main>
    </StorefrontShell>
  );
}
