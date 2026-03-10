type TestimonialCardProps = {
  quote: string;
  name: string;
  role: string;
};

export default function TestimonialCard({ quote, name, role }: TestimonialCardProps) {
  return (
    <blockquote className="dg-testimonial">
      &ldquo;{quote}&rdquo;
      <footer className="dg-testimonial-meta">
        {name} · {role}
      </footer>
    </blockquote>
  );
}
