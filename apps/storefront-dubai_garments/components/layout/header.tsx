'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
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

  return (
    <>
      <div className="dg-topbar">
        <div className="dg-container dg-topbar-inner">
          <p>Bulk Orders Support: +92 300 0000000</p>
          <p>Email: sales@dubaigarments.ai | Delivery: UAE, KSA, Pakistan</p>
        </div>
      </div>

      <header className="dg-header">
        <div className="dg-container">
          <div className="dg-card dg-header-inner">
            <div>
              <p className="dg-brand-subtitle">Dubai Garments</p>
              <Link href="/" className="dg-brand-title">
                Bulk Garment Store
              </Link>
            </div>

            <form action="/products" method="GET" className="dg-search-wrap">
              <TextField
                type="search"
                name="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search products, categories, fabrics..."
              />
            </form>

            <div className="dg-header-actions">
              <Link href="/customer/dashboard" className="dg-btn-secondary">Customer Portal</Link>
              <Link href="/quote" className="dg-btn-primary">Request Bulk Quote</Link>
            </div>
          </div>

          <nav className="dg-card dg-nav">
            <div className="dg-nav-inner">
              {categories.map((category) => (
                <Link
                  key={category.slug}
                  href={`/products?category=${category.slug}`}
                  className="dg-nav-link"
                >
                  {category.name}
                </Link>
              ))}
              <Link href="/products" className={`dg-nav-link ${pathname === '/products' ? 'is-active' : ''}`}>
                All Products
              </Link>
              <a href="#" className="dg-nav-link">Contact</a>
            </div>
          </nav>
        </div>
      </header>
    </>
  );
}
