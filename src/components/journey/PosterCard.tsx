export interface PosterCardProps {
  /** "reveal." / "make." / "reflect." — the last (only) word renders vermilion italic. */
  title: string;
  className?: string;
}

// A staggered poster card on 03 (paper). Until Story 8.2 supplies artwork,
// the image slot is a decorative paper fill; the figcaption names the poster.
export function PosterCard({ title, className = "" }: PosterCardProps) {
  return (
    <figure className={`w-full max-w-64 rounded-scrap border-2 border-ink bg-cream p-3 shadow-poster ${className}`}>
      <div aria-hidden="true" className="aspect-3/4 w-full bg-paper" />
      <figcaption className="pt-3 text-card-title text-vermilion italic">{title}</figcaption>
    </figure>
  );
}
