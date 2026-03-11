'use client';

import Link from 'next/link';
import StorefrontShell from '@/components/layout/storefront-shell';
import CategoryCard from '@/components/store/category-card';
import ProductCard from '@/components/store/product-card';
import TestimonialCard from '@/components/store/testimonial-card';
import TrustItem from '@/components/store/trust-item';
import { HeroSection, WorkflowTimeline } from '@/components/shared/sections';
import { StoreSection } from '@/components/storefront/common';
import { useFeaturedProducts } from '@/features/products';
import {
  homeCategories,
  homeIndustries,
  homeProcess,
  homeTestimonials,
} from '@/features/storefront/content/home-content';

export default function HomePage() {
  const { data: featuredProducts = [] } = useFeaturedProducts();

  return (
    <StorefrontShell>
      <main className="dg-main">
        <HeroSection
          badge="B2B Custom Garments"
          title="Order Branded Apparel in Bulk with Faster Quotations"
          subtitle="Browse production-ready garments, submit your quantity and branding requirements, and get a clear quote with timeline, pricing, and follow-up support."
          actions={
            <>
              <Link href="/quote" className="dg-btn-primary">Start Quote Request</Link>
              <Link href="/products" className="dg-btn-secondary">Browse Catalog</Link>
            </>
          }
          aside={
            <div className="dg-card dg-quick-card">
              <p className="dg-eyebrow">Quick Request</p>
              <h2 className="dg-title-md">Get Quote in Minutes</h2>
              <div className="dg-quick-list">
                <p className="dg-quick-item">1. Select product category</p>
                <p className="dg-quick-item">2. Upload logo or design file</p>
                <p className="dg-quick-item">3. Share quantity and deadline</p>
              </div>
              <Link href="/quote" className="dg-btn-primary dg-btn-block">Submit Bulk Quote</Link>
            </div>
          }
        />

        <StoreSection
          title="Shop by category"
          subtitle="Choose a category and request a tailored quote for your bulk order."
        >
            <div className="dg-category-grid">
              {homeCategories.map((category) => (
                <CategoryCard key={category.slug} {...category} />
              ))}
            </div>
        </StoreSection>

        <StoreSection
          title="Featured products"
          subtitle="Production-ready garments with clear MOQs, lead times, and customization options."
          action={<Link href="/products" className="dg-btn-secondary">View All Products</Link>}
        >
            <div className="dg-product-grid">
              {featuredProducts.map((product) => <ProductCard key={product.id} product={product} />)}
            </div>
        </StoreSection>

        <StoreSection>
            <h2 className="dg-section-title">How bulk ordering works</h2>
            <WorkflowTimeline
              className="dg-process-grid"
              steps={homeProcess.map((step) => ({ title: step.title, description: step.description }))}
            />
        </StoreSection>

        <StoreSection containerClassName="dg-container dg-two-col-grid">
            <div className="dg-card dg-info-card">
              <h2 className="dg-section-title">Industries served</h2>
              <p className="dg-section-copy">Built for organizations ordering custom garments at scale.</p>
              <div className="dg-chip-cloud">
                {homeIndustries.map((industry) => (
                  <span key={industry} className="dg-chip">{industry}</span>
                ))}
              </div>
            </div>

            <div className="dg-card dg-info-card">
              <h2 className="dg-section-title">Trusted by teams</h2>
              <div className="dg-testimonials">
                {homeTestimonials.map((testimonial) => (
                  <TestimonialCard key={testimonial.name} {...testimonial} />
                ))}
              </div>
            </div>
        </StoreSection>

        <section className="dg-section">
          <div className="dg-container">
            <div className="dg-card dg-cta-card">
              <div className="dg-cta-grid">
                <div>
                  <h2 className="dg-title-lg">Ready to place your bulk garment order?</h2>
                  <p className="dg-muted-sm">Send your requirements and get a quotation with timeline and production plan.</p>
                </div>
                <div className="dg-actions-wrap">
                  <Link href="/quote" className="dg-btn-primary">Request Bulk Quote</Link>
                  <a href="#" className="dg-btn-secondary">Talk to Sales</a>
                </div>
              </div>
              <div className="dg-trust-grid">
                <TrustItem text="Secure Payments" />
                <TrustItem text="Quality Checked Production" />
                <TrustItem text="On-Time Bulk Delivery" />
              </div>
            </div>
          </div>
        </section>
      </main>
    </StorefrontShell>
  );
}
