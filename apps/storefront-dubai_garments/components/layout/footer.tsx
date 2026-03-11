import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="dgx-footer">
      <div className="dg-container">
        <div className="dgx-footer-cta">
          <div>
            <p className="dg-eyebrow">RevenueOS for Apparel Teams</p>
            <h3 className="dg-title-lg">Launch your AI-powered sales workflow in days</h3>
            <p className="dg-section-copy">Capture leads, qualify with AI, send quotes, and automate follow-ups in one pipeline.</p>
          </div>
          <div className="dg-actions-wrap">
            <Link href="/quote" className="dg-btn-primary">Request Demo</Link>
            <Link href="/products" className="dg-btn-secondary">Browse Catalog</Link>
          </div>
        </div>

        <div className="dgx-footer-grid">
          <div>
            <h3 className="dg-title-sm">Dubai Garments</h3>
            <p className="dg-muted-sm">Plug-and-play AI sales storefront and admin platform for garment businesses.</p>
          </div>
          <div>
            <h4 className="dg-footer-heading">Product</h4>
            <ul className="dg-footer-list">
              <li><Link href="/products">Catalog</Link></li>
              <li><Link href="/quote">Quote Requests</Link></li>
              <li><Link href="/admin/dashboard">Sales Dashboard</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="dg-footer-heading">Solutions</h4>
            <ul className="dg-footer-list">
              <li><a href="#">Lead Automation</a></li>
              <li><a href="#">Pipeline Management</a></li>
              <li><a href="#">Quote Ops</a></li>
            </ul>
          </div>
          <div>
            <h4 className="dg-footer-heading">Contact</h4>
            <p className="dg-muted-sm">sales@dubaigarments.ai</p>
            <p className="dg-muted-sm">+92 300 0000000</p>
          </div>
        </div>
        <div className="dgx-footer-bottom">
          <p>© {new Date().getFullYear()} Dubai Garments RevenueOS.</p>
          <p>Built for high-conversion B2B sales teams.</p>
        </div>
      </div>
    </footer>
  );
}
