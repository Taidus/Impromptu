import Link from "next/link";
import { copy } from "@/components/copy";
import { FOCUS_RING_BASE, focusRingClassName } from "@/components/ground";

const linkFocus = `${FOCUS_RING_BASE} ${focusRingClassName("night")}`;

// Story 6.1: the night header band -- brand mark, back-to-setup link, and the h1.
// Simplified: DESIGN's Stage mark (14px grape star beside the wordmark) and the
// mark-left/links-right layout are deferred to the Epic 8 furniture stories.
export function PracticeHeader() {
  return (
    <header className="bg-night p-header-inset text-cream">
      <div className="mx-auto flex max-w-content-max flex-col gap-6">
        <Link href="/" className={`text-stage-mark self-start ${linkFocus}`}>
          {copy.journey.footer.wordmark}
        </Link>
        <Link href="/" className={`self-start text-meta text-cream ${linkFocus}`}>
          {copy.stage.back}
        </Link>
        <h1 className="text-display-phone desktop:text-display-setup">{copy.practice.title}</h1>
      </div>
    </header>
  );
}
