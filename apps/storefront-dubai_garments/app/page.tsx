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
      <main className="dg-main dgx-home">
        <HeroSection
          className="dgx-hero-section"
          badge="AI SALES AUTOMATION"
          title="Turn Bulk Garment Inquiries Into Closed Deals Faster"
          subtitle="Deploy a conversion-focused storefront that captures qualified leads, scores intent with AI, and routes opportunities to your sales team with zero manual handoffs."
          actions={
            <>
              <Link href="/quote" className="dg-btn-primary">Start Free Demo Flow</Link>
              <Link href="/products" className="dg-btn-secondary">Explore Product Catalog</Link>
            </>
          }
          aside={
            <div className="dg-card dg-quick-card dgx-hero-aside">
              <p className="dg-eyebrow">Pipeline Snapshot</p>
              <h2 className="dg-title-md">Live Sales Workflow</h2>
              <div className="dg-quick-list">
                <p className="dg-quick-item">Lead Captured from storefront form</p>
                <p className="dg-quick-item">AI scored as HOT with urgency tags</p>
                <p className="dg-quick-item">Quote + automated follow-up sent</p>
              </div>
              <Link href="/admin/dashboard" className="dg-btn-primary dg-btn-block">View Sales Console</Link>
            </div>
          }
        />

        <StoreSection
          title="Shop by category"
          subtitle="Launch with production-ready category pages and map each inquiry directly to your quote workflow."
          className="dg-section dgx-surface-section"
        >
            <div className="dg-category-grid">
              {homeCategories.map((category) => (
                <CategoryCard key={category.slug} {...category} />
              ))}
            </div>
        </StoreSection>

        <StoreSection
          title="Featured products"
          subtitle="High-intent catalog cards built for discovery, qualification, and rapid quote conversion."
          action={<Link href="/products" className="dg-btn-secondary">View All Products</Link>}
          className="dg-section dgx-surface-section"
        >
            <div className="dg-product-grid">
              {featuredProducts.map((product) => <ProductCard key={product.id} product={product} />)}
            </div>
        </StoreSection>

        <StoreSection className="dg-section dgx-surface-section">
            <h2 className="dg-section-title">How bulk ordering works</h2>
            <WorkflowTimeline
              className="dg-process-grid"
              steps={homeProcess.map((step) => ({ title: step.title, description: step.description }))}
            />
        </StoreSection>

        <StoreSection className="dg-section dgx-surface-section" containerClassName="dg-container dg-two-col-grid">
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

        <section className="dg-section dgx-surface-section">
          <div className="dg-container">
            <div className="dg-card dg-cta-card dgx-home-cta">
              <div className="dg-cta-grid">
                <div>
                  <h2 className="dg-title-lg">Build your AI-enabled quote-to-close motion</h2>
                  <p className="dg-muted-sm">Deploy storefront + admin + automation modules and integrate into your existing sales system.</p>
                </div>
                <div className="dg-actions-wrap">
                  <Link href="/quote" className="dg-btn-primary">Book Implementation Call</Link>
                  <Link href="/admin/design-system" className="dg-btn-secondary">Open Design System</Link>
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
