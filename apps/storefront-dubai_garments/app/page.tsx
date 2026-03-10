'use client';

import Link from 'next/link';
import StorefrontShell from '@/components/layout/storefront-shell';
import { Button, Card } from '@/components/ui';
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
  {
    title: 'Dispatch & Support',
    description: 'Track delivery progress and coordinate post-order support for repeat procurement cycles.',
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

function SectionHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div className="space-y-2">
      <h2 className="dg-section-title">{title}</h2>
      <p className="dg-section-copy max-w-3xl">{subtitle}</p>
    </div>
  );
}

export default function HomePage() {
  const { data: featuredProducts = [] } = useFeaturedProducts();

  return (
    <StorefrontShell>
      <main className="dg-main">
        <section className="dg-section">
          <div className="dg-container grid gap-6 lg:grid-cols-12">
            <Card className="lg:col-span-8">
              <span className="dg-badge">B2B Custom Garments</span>
              <h1 className="dg-hero-title max-w-3xl">
                Order Branded Apparel in Bulk with Faster Quotations
              </h1>
              <p className="dg-section-copy mt-4 max-w-3xl">
                Browse production-ready garments, submit your quantity and branding requirements,
                and get a clear quote with timeline, pricing, and follow-up support.
              </p>
              <div className="dg-hero-actions">
                <Link href="/quote">
                  <Button size="lg">Start Quote Request</Button>
                </Link>
                <Link href="/products">
                  <Button variant="secondary" size="lg">Browse Catalog</Button>
                </Link>
              </div>
            </Card>

            <Card className="flex h-full flex-col lg:col-span-4">
              <p className="dg-eyebrow">Quick Request</p>
              <h2 className="dg-title-md">Get Quote in Minutes</h2>
              <div className="dg-quick-list">
                <p className="dg-quick-item">1. Select product category</p>
                <p className="dg-quick-item">2. Upload logo or design file</p>
                <p className="dg-quick-item">3. Share quantity and deadline</p>
              </div>
              <div className="mt-5">
                <Link href="/quote">
                  <Button className="w-full" size="lg">Submit Bulk Quote</Button>
                </Link>
              </div>
            </Card>
          </div>
        </section>

        <section className="dg-section">
          <div className="dg-container space-y-5">
            <SectionHeader
              title="Shop by category"
              subtitle="Choose a category and request a tailored quote for your bulk order."
            />
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {categories.map((category) => (
                <Card key={category.slug} className="flex h-full flex-col">
                  <h3 className="dg-title-sm">{category.name}</h3>
                  <p className="dg-muted-sm">{category.description}</p>
                  <div className="mt-auto pt-4">
                    <Link href="/products">
                      <Button variant="ghost" size="sm">Explore</Button>
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="dg-section">
          <div className="dg-container space-y-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <SectionHeader
                title="Featured products"
                subtitle="Production-ready garments with clear MOQs, lead times, and customization options."
              />
              <Link href="/products" className="shrink-0">
                <Button variant="secondary" size="sm">View All Products</Button>
              </Link>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {featuredProducts.map((product) => (
                <Card key={product.id} className="flex h-full flex-col">
                  <p className="dg-eyebrow">{product.category}</p>
                  <h3 className="dg-title-sm mt-2">{product.name}</h3>
                  <p className="dg-muted-sm">{product.shortDescription}</p>
                  <p className="dg-muted-sm">
                    MOQ: {product.minOrderQty} | Lead Time: {product.leadTimeDays} days
                  </p>
                  <div className="mt-auto flex flex-wrap gap-2 pt-4">
                    <Link href={`/products/${product.slug}`}>
                      <Button variant="secondary" size="sm">Details</Button>
                    </Link>
                    <Link href="/quote">
                      <Button size="sm">Quote</Button>
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="dg-section">
          <div className="dg-container space-y-5">
            <SectionHeader
              title="How bulk ordering works"
              subtitle="A simple process designed for procurement teams and sales automation workflows."
            />
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {process.map((step, index) => (
                <Card key={step.title} className="h-full">
                  <h3 className="dg-title-sm">{index + 1}. {step.title}</h3>
                  <p className="dg-muted-sm">{step.description}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="dg-section">
          <div className="dg-container grid gap-4 lg:grid-cols-2">
            <Card className="h-full space-y-4">
              <SectionHeader
                title="Industries served"
                subtitle="Built for organizations ordering custom garments at scale."
              />
              <div className="flex flex-wrap gap-2">
                {industries.map((industry) => (
                  <span key={industry} className="dg-chip">{industry}</span>
                ))}
              </div>
            </Card>

            <Card className="h-full space-y-4">
              <SectionHeader
                title="Trusted by teams"
                subtitle="Feedback from repeat bulk-order customers."
              />
              <div className="space-y-3">
                {testimonials.map((testimonial) => (
                  <div
                    key={testimonial.name}
                    className="rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[#fcfcfd] px-3 py-3"
                  >
                    <p className="dg-muted-sm">&ldquo;{testimonial.quote}&rdquo;</p>
                    <p className="mt-2 text-sm font-semibold text-[var(--color-text)]">{testimonial.name}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">{testimonial.role}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </section>

        <section className="dg-section">
          <div className="dg-container">
            <Card>
              <div className="grid gap-5 lg:grid-cols-[1.35fr_0.65fr] lg:items-center">
                <div>
                  <h2 className="dg-title-lg">Ready to place your bulk garment order?</h2>
                  <p className="dg-muted-sm mt-3">
                    Send your requirements and get a quotation with timeline and production plan.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 lg:justify-end">
                  <Link href="/quote">
                    <Button size="lg">Request Bulk Quote</Button>
                  </Link>
                  <Button variant="secondary" size="lg">Talk to Sales</Button>
                </div>
              </div>
              <div className="mt-5 flex flex-wrap gap-2 border-t border-[var(--color-border)] pt-5">
                <span className="dg-chip">Secure Payments</span>
                <span className="dg-chip">Quality Checked Production</span>
                <span className="dg-chip">On-Time Bulk Delivery</span>
              </div>
            </Card>
          </div>
        </section>
      </main>
    </StorefrontShell>
  );
}
