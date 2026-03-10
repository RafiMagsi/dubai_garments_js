'use client';

import Link from 'next/link';
import StorefrontShell from '@/components/layout/storefront-shell';
import CategoryCard from '@/components/store/category-card';
import ProductCard from '@/components/store/product-card';
import TestimonialCard from '@/components/store/testimonial-card';
import TrustItem from '@/components/store/trust-item';
import { SectionHeader } from '@/components/ui';
import { useFeaturedProducts } from '@/features/products';

const categories = [
  {
    name: 'Corporate T-Shirts',
    description: 'Breathable cotton t-shirts with branding-ready print and embroidery options.',
    slug: 'corporate-tshirts',
  },
  {
    name: 'Event Hoodies',
    description: 'Premium fleece hoodies for team events, campaigns, and winter merch drops.',
    slug: 'event-hoodies',
  },
  {
    name: 'Staff Uniforms',
    description: 'Durable uniform sets for hospitality, clinics, retail teams, and logistics crews.',
    slug: 'staff-uniforms',
  },
  {
    name: 'Sports Jerseys',
    description: 'Performance-focused jerseys with sublimation and full custom color support.',
    slug: 'sports-jerseys',
  },
];

const process = [
  {
    title: 'Share Requirements',
    description: 'Choose product type, add branding details, and mention quantity with delivery timeline.',
  },
  {
    title: 'Review Quotation',
    description: 'Receive pricing tiers, production lead time, and customization notes from our sales team.',
  },
  {
    title: 'Approve & Produce',
    description: 'Finalize design approvals and move directly into quality-controlled bulk production.',
  },
];

const industries = [
  'Corporate Teams',
  'Schools & Universities',
  'Restaurants & Cafes',
  'Healthcare Clinics',
  'Retail Franchises',
  'Sports Clubs',
  'Event Management Agencies',
  'Logistics & Field Teams',
];

const testimonials = [
  {
    quote: 'Dubai Garments helped us deliver 1,200 event shirts on schedule with excellent print quality.',
    name: 'Hassan K.',
    role: 'Events Lead, BrandVista',
  },
  {
    quote: 'Their quoting process is clear and fast. We now reorder uniforms every quarter without friction.',
    name: 'Mariam A.',
    role: 'Operations Manager, UrbanBites',
  },
  {
    quote: 'Great communication, consistent quality, and dependable lead times for school sports kits.',
    name: 'Faisal R.',
    role: 'Procurement Officer, Al Noor Academy',
  },
];

export default function HomePage() {
  const { data: featuredProducts = [] } = useFeaturedProducts();

  return (
    <StorefrontShell>
      <main className="dg-main">
        <section className="dg-section">
          <div className="dg-container dg-hero-grid">
            <div className="dg-card dg-hero-card">
              <span className="dg-badge">B2B Custom Garments</span>
              <h1 className="dg-hero-title">Order Branded Apparel in Bulk with Faster Quotations</h1>
              <p className="dg-section-copy">
                Browse production-ready garments, submit your quantity and branding requirements, and get a clear quote with timeline,
                pricing, and follow-up support.
              </p>
              <div className="dg-hero-actions">
                <Link href="/quote" className="dg-btn-primary">Start Quote Request</Link>
                <Link href="/products" className="dg-btn-secondary">Browse Catalog</Link>
              </div>
            </div>

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
          </div>
        </section>

        <section className="dg-section">
          <div className="dg-container">
            <SectionHeader
              title="Shop by category"
              subtitle="Choose a category and request a tailored quote for your bulk order."
            />

            <div className="dg-category-grid">
              {categories.map((category) => (
                <CategoryCard key={category.slug} {...category} />
              ))}
            </div>
          </div>
        </section>

        <section className="dg-section">
          <div className="dg-container">
            <SectionHeader
              title="Featured products"
              subtitle="Production-ready garments with clear MOQs, lead times, and customization options."
              action={
                <Link href="/products" className="dg-btn-secondary">View All Products</Link>
              }
            />

            <div className="dg-product-grid">
              {featuredProducts.map((product) => <ProductCard key={product.id} product={product} />)}
            </div>
          </div>
        </section>

        <section className="dg-section">
          <div className="dg-container">
            <h2 className="dg-section-title">How bulk ordering works</h2>
            <div className="dg-process-grid">
              {process.map((step, index) => (
                <div key={step.title} className="dg-card dg-category-card">
                  <h3 className="dg-title-sm">{index + 1}. {step.title}</h3>
                  <p className="dg-muted-sm">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="dg-section">
          <div className="dg-container dg-two-col-grid">
            <div className="dg-card dg-info-card">
              <h2 className="dg-section-title">Industries served</h2>
              <p className="dg-section-copy">Built for organizations ordering custom garments at scale.</p>
              <div className="dg-chip-cloud">
                {industries.map((industry) => (
                  <span key={industry} className="dg-chip">{industry}</span>
                ))}
              </div>
            </div>

            <div className="dg-card dg-info-card">
              <h2 className="dg-section-title">Trusted by teams</h2>
              <div className="dg-testimonials">
                {testimonials.map((testimonial) => (
                  <TestimonialCard key={testimonial.name} {...testimonial} />
                ))}
              </div>
            </div>
          </div>
        </section>

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
