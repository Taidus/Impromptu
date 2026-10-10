import Image from "next/image";

/**
 * `title`: "reveal." / "make." / "reflect." — the last (only) word renders vermilion italic.
 * `src`: poster artwork under public/decor/artwork/; omit to keep the paper-fill fallback.
 * `alt`: required alongside `src`.
 */
export type PosterCardProps = { title: string; className?: string } & (
  | { src: string; alt: string }
  | { src?: undefined; alt?: undefined }
);

// A staggered poster card on 03 (paper): the 3:4 artwork (or, while absent,
// a decorative paper fill) above a figcaption naming the poster.
export function PosterCard({ title, src, alt, className = "" }: PosterCardProps) {
  return (
    <figure className={`w-full rounded-scrap border-2 border-ink bg-cream p-3 shadow-poster ${className}`}>
      <div className="relative aspect-3/4 w-full overflow-hidden bg-paper" aria-hidden={src ? undefined : "true"}>
        {/* max-w-64 (on the caller's wrapper) = 16rem, the figure's only width at any viewport it's visible at (desktop-only). */}
        {src && <Image src={src} alt={alt} fill sizes="16rem" className="object-cover" />}
      </div>
      <figcaption className="pt-3 text-card-title text-vermilion italic">{title}</figcaption>
    </figure>
  );
}
