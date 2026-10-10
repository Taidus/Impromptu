import Link from "next/link";
import { copy } from "@/components/copy";
import { FOCUS_RING_BASE, focusRingClassName } from "@/components/ground";
import { BrandMark } from "@/components/journey/BrandMark";
import { MotionToggle } from "@/components/MotionToggle";

const { journey } = copy;
const linkClass = `${FOCUS_RING_BASE} ${focusRingClassName("night")} rounded-sm`;

/**
 * The Setup page's own header band (Story 8.3): split out of SetupHero's
 * `Header` so the Motion toggle can sit beside the Practice link without
 * crowding the hero's headline. Rendered once, above `<SetupHero />`, from
 * page.tsx -- the brand mark link on the left, the Practice link and the
 * Motion toggle on the right.
 */
export function SetupHeader() {
  return (
    <header className="bg-night px-gutter-phone py-6 text-cream desktop:px-14 desktop:py-8">
      <div className="relative z-10 mx-auto flex max-w-content-max flex-col items-start gap-4 desktop:flex-row desktop:items-center desktop:justify-between">
        <BrandMark />
        <div className="flex items-center gap-4">
          <Link href="/practice" className={`text-meta uppercase ${linkClass}`}>
            {journey.footer.practice}
          </Link>
          <MotionToggle />
        </div>
      </div>
    </header>
  );
}
