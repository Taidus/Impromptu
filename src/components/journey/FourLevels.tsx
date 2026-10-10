import { copy } from "@/components/copy";
import { Level } from "@/domain/library/schema";
import { ChromePiece } from "./ChromePiece";
import { PosterCard } from "./PosterCard";
import { SectionHeader } from "./SectionHeader";

const { journey, level } = copy;

// Poster stagger per DESIGN: reveal 0, make 90px, reflect 40px. Written as
// plain Tailwind spacing steps (0, 10 = 40px) plus one exact rem value
// (90px = 5.625rem at the 16px root) so no literal "px" ever appears in
// src/components (scripts/check-token-usage.test.ts).
const POSTERS = [
  { key: "reveal", offset: "mt-0", src: "/decor/artwork/poster-eye.webp" },
  { key: "make", offset: "desktop:mt-[5.625rem]", src: "/decor/artwork/poster-hands.webp" },
  { key: "reflect", offset: "desktop:mt-10", src: "/decor/artwork/poster-still.webp" },
] as const;

// Section 03 (paper): the four Level one-liners beside the three staggered posters.
export function FourLevels() {
  return (
    <section className="bg-paper px-gutter-phone py-20 text-ink desktop:px-14 desktop:py-28">
      <div className="relative z-10 mx-auto flex max-w-content-max flex-col gap-12">
        <SectionHeader
          ground="paper"
          eyebrow={journey.fourLevels.eyebrow}
          title={journey.fourLevels.title}
          meta={journey.fourLevels.meta}
        />
        <div className="flex flex-col gap-12 desktop:flex-row desktop:items-start desktop:gap-16">
          <ol className="flex flex-1 flex-col gap-5">
            {Level.options.map((key, index) => (
              <li key={key} className="flex flex-col gap-1">
                <p className="text-meta uppercase">
                  {String(index + 1).padStart(2, "0")} — {key}
                </p>
                <p className="[overflow-wrap:anywhere] text-lede">{level[key]}</p>
              </li>
            ))}
          </ol>
          {/* Posters: hidden on phones (below `desktop:`), never the markup's only content. */}
          <div className="hidden flex-1 desktop:flex desktop:items-start desktop:gap-6">
            {POSTERS.map(({ key, offset, src }) => (
              <div key={key} className={`relative w-full max-w-64 ${offset}`}>
                <PosterCard title={journey.posters[key].title} src={src} alt={journey.posters[key].alt} />
                {/* The one chrome piece at a poster corner (DESIGN: 2-4 chrome pieces per screen). */}
                {key === "reveal" && (
                  <ChromePiece name="chrome-sparkle" className="absolute -top-4 -right-4 w-10" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
