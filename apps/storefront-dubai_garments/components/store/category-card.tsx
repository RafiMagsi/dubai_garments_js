import Link from 'next/link';

type CategoryCardProps = {
  name: string;
  description: string;
  slug: string;
};

export default function CategoryCard({ name, description, slug }: CategoryCardProps) {
  return (
    <div className="dg-card dg-category-card">
      <h3 className="dg-title-sm">{name}</h3>
      <p className="dg-muted-sm">{description}</p>
      <div className="dg-card-links">
        <Link href={`/products?category=${slug}`} className="dg-link-primary">
          Explore
        </Link>
        <Link href="/quote" className="dg-link-muted">
          Request Quote
        </Link>
      </div>
    </div>
  );
}
