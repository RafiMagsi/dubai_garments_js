import Link from 'next/link';

export type SubmittedSummary = {
  name: string;
  email: string;
  company: string;
  productLabel: string;
  quantity: number;
  deliveryDate: string;
  message: string;
  hasFile: boolean;
};

type QuoteSuccessViewProps = {
  leadCode: string | null;
  summary: SubmittedSummary | null;
  onSubmitAnother: () => void;
};

export default function QuoteSuccessView({ leadCode, summary, onSubmitAnother }: QuoteSuccessViewProps) {
  return (
    <>
      <span className="dg-badge">Request Submitted</span>
      <h1 className="dg-title-lg">Your quote request has been submitted successfully.</h1>
      <p className="dg-section-copy">Our team will contact you soon.</p>

      {leadCode ? (
        <div className="dg-card dg-summary-card">
          <h2 className="dg-title-sm">Tracking Code</h2>
          <p className="dg-muted-sm">{leadCode}</p>
          <p className="dg-help">Use this with your email in Customer Portal to track progress.</p>
        </div>
      ) : null}

      {summary ? (
        <div className="dg-card dg-summary-card">
          <h3 className="dg-title-sm">Request Summary</h3>
          <div className="dg-summary-list">
            <p><strong>Name:</strong> {summary.name}</p>
            <p><strong>Email:</strong> {summary.email}</p>
            <p><strong>Company:</strong> {summary.company}</p>
            <p><strong>Product:</strong> {summary.productLabel}</p>
            <p><strong>Quantity:</strong> {summary.quantity}</p>
            <p><strong>Delivery Date:</strong> {summary.deliveryDate || '-'}</p>
            <p><strong>Message:</strong> {summary.message || '-'}</p>
            <p><strong>File:</strong> {summary.hasFile ? 'Attached' : 'Not attached'}</p>
          </div>
        </div>
      ) : null}

      <div className="dg-card dg-summary-card">
        <h2 className="dg-title-sm">Want to review other products?</h2>
        <p className="dg-muted-sm">You can continue browsing the catalog while our sales team prepares your quotation.</p>
        <div className="dg-hero-actions">
          <Link href="/products" className="dg-btn-primary">Review Products</Link>
          <Link href="/customer/dashboard" className="dg-btn-secondary">Open Customer Portal</Link>
          <button type="button" className="dg-btn-secondary" onClick={onSubmitAnother}>
            Submit Another
          </button>
        </div>
      </div>
    </>
  );
}
