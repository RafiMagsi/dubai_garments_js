import Link from 'next/link';

type CategoryCardProps = {
  name: string;
  description: string;
  slug: string;
};

export default function CategoryCard({ name, description, slug }: CategoryCardProps) {
  return (
    <div className="dg-card dg-category-card dgx-category-card">
      <p className="dg-eyebrow">Category</p>
      <h3 className="dg-title-sm">{name}</h3>
      <p className="dg-muted-sm">{description}</p>
      <div className="dg-card-links">
        <Link href={`/products?category=${slug}`} className="dg-link-primary">
          Explore Category
        </Link>
        <Link href="/quote" className="dg-link-muted">
          Start Quote
        </Link>
      </div>
    </div>
  );
}
