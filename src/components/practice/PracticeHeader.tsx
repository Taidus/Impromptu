import Link from "next/link";
import { copy } from "@/components/copy";
import { FOCUS_RING_BASE, focusRingClassName } from "@/components/ground";
import { BrandMark } from "@/components/journey/BrandMark";
import { MotionToggle } from "@/components/MotionToggle";

const linkFocus = `${FOCUS_RING_BASE} ${focusRingClassName("night")}`;

// Story 6.1: the night header band -- brand mark, back-to-setup link, and
// the h1, with the Motion toggle (Story 8.3) on the right of the band.
export function PracticeHeader() {
  return (
    <header className="bg-night p-header-inset text-cream">
      <div className="mx-auto flex max-w-content-max flex-col items-start gap-6 desktop:flex-row desktop:justify-between">
        <div className="flex flex-col gap-6">
          <BrandMark />
          <Link href="/" className={`self-start text-meta text-cream ${linkFocus}`}>
            {copy.stage.back}
          </Link>
          <h1 className="text-display-phone desktop:text-display-setup">{copy.practice.title}</h1>
        </div>
        <MotionToggle />
      </div>
    </header>
  );
}
