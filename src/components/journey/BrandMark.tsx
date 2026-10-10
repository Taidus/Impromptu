import Link from "next/link";
import { copy } from "@/components/copy";
import { FOCUS_RING_BASE, focusRingClassName } from "@/components/ground";

/** The wordmark + grape ✦ linking home; shared by SetupHeader and PracticeHeader. */
export function BrandMark() {
  return (
    <Link
      href="/"
      className={`inline-flex items-center gap-2 self-start rounded-sm text-stage-mark ${FOCUS_RING_BASE} ${focusRingClassName("night")}`}
    >
      {copy.journey.footer.wordmark}
      <span aria-hidden="true" className="text-sm text-grape">
        ✦
      </span>
    </Link>
  );
}
