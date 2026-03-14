'use client';
/* eslint-disable @next/next/no-img-element */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { TextField } from '@/components/ui';

const categories = [
  { name: 'Corporate T-Shirts', slug: 'corporate-tshirts' },
  { name: 'Event Hoodies', slug: 'event-hoodies' },
  { name: 'Staff Uniforms', slug: 'staff-uniforms' },
  { name: 'Sports Jerseys', slug: 'sports-jerseys' },
];

export default function Header() {
  const pathname = usePathname();
  const [search, setSearch] = useState('');
  const [branding, setBranding] = useState({
    brandName: 'Dubai Garments',
    brandTagline: 'RevenueOS Storefront',
    logoUrl: '',
  });

  useEffect(() => {
    let mounted = true;
    async function loadBranding() {
      try {
        const response = await fetch('/api/branding', { cache: 'no-store' });
        const payload = (await response.json()) as {
          brandName?: string;
          brandTagline?: string;
          logoUrl?: string;
        };
        if (!mounted) return;
        setBranding({
          brandName: payload.brandName || 'Dubai Garments',
          brandTagline: payload.brandTagline || 'RevenueOS Storefront',
          logoUrl: payload.logoUrl || '',
        });
      } catch {
        if (!mounted) return;
      }
    }
    void loadBranding();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <>
      <div className="dgx-topbar">
        <div className="dg-container dgx-topbar-inner">
          <p>AI Sales Automation for B2B Apparel Teams</p>
          <p>UAE · KSA · Pakistan</p>
        </div>
      </div>

      <header className="dgx-header">
        <div className="dg-container">
          <div className="dgx-header-shell">
            <div className="dgx-brand-wrap">
              {branding.logoUrl ? (
                <img
                  src={branding.logoUrl}
                  alt={`${branding.brandName} logo`}
                  className="mb-1 h-9 w-auto rounded border border-[var(--color-border)] bg-white p-1"
                />
              ) : null}
              <p className="dgx-brand-kicker">{branding.brandName}</p>
              <Link href="/" className="dgx-brand-title">
                {branding.brandTagline}
              </Link>
            </div>

            <nav className="dgx-nav">
              <Link href="/" className={`dgx-nav-link ${pathname === '/' ? 'is-active' : ''}`}>
                Home
              </Link>
              <Link href="/products" className={`dgx-nav-link ${pathname.startsWith('/products') ? 'is-active' : ''}`}>
                Products
              </Link>
              <Link href="/quote" className={`dgx-nav-link ${pathname.startsWith('/quote') ? 'is-active' : ''}`}>
                Quotes
              </Link>
              <a href="#" className="dgx-nav-link">How It Works</a>
            </nav>

            <div className="dgx-header-actions">
              <Link href="/customer/dashboard" className="dg-btn-secondary">Client Portal</Link>
              <Link href="/quote" className="dg-btn-primary">Book Demo</Link>
            </div>
          </div>

          <div className="dgx-search-band">
            <form action="/products" method="GET" className="dg-search-wrap">
              <TextField
                type="search"
                name="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search products, fabrics, categories, and use-cases..."
              />
            </form>
          </div>
        </div>
        <div className="dgx-category-strip">
          <div className="dg-container dgx-category-inner">
            {categories.map((category) => (
              <Link
                key={category.slug}
                href={`/products?category=${category.slug}`}
                className="dgx-category-pill"
              >
                {category.name}
              </Link>
            ))}
          </div>
        </div>
      </header>
    </>
  );
}
