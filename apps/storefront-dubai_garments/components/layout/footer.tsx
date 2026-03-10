import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="dg-footer">
      <div className="dg-container dg-footer-grid">
        <div>
          <h3 className="dg-title-sm">Dubai Garments</h3>
          <p className="dg-muted-sm">Bulk custom apparel for businesses, events, and institutions.</p>
        </div>
        <div>
          <h4 className="dg-footer-heading">Store</h4>
          <ul className="dg-footer-list">
            <li><Link href="/products">Products</Link></li>
            <li><Link href="/quote">Request Quote</Link></li>
            <li><Link href="/customer/dashboard">Customer Portal</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="dg-footer-heading">Company</h4>
          <ul className="dg-footer-list">
            <li><a href="#">About</a></li>
            <li><a href="#">Industries</a></li>
            <li><a href="#">Contact</a></li>
          </ul>
        </div>
        <div>
          <h4 className="dg-footer-heading">Contact</h4>
          <p className="dg-muted-sm">sales@dubaigarments.ai</p>
          <p className="dg-muted-sm">+92 300 0000000</p>
        </div>
      </div>
    </footer>
  );
}
