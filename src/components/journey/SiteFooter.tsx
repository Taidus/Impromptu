import Link from "next/link";
import { EmailSignup } from "@/components/EmailSignup";
import { copy } from "@/components/copy";
import { FOCUS_RING_BASE, focusRingClassName } from "@/components/ground";

const { journey, state } = copy;
const linkClass = `text-meta uppercase ${FOCUS_RING_BASE} ${focusRingClassName("night")}`;

// The night footer: shared by "/" and "/privacy" (and, later, "/practice").
export function SiteFooter() {
  return (
    <footer className="bg-night px-gutter-phone py-16 text-cream desktop:px-14 desktop:py-20">
      <div className="relative z-10 mx-auto flex max-w-content-max flex-col gap-12">
        <div className="flex flex-col gap-10 desktop:flex-row desktop:items-start desktop:justify-between">
          <EmailSignup variant="night" className="max-w-sm" />
          <div className="flex flex-col items-start gap-4 desktop:items-end">
            <nav aria-label="Footer" className="flex flex-col items-start gap-4 desktop:items-end">
              <Link href="/practice" className={linkClass}>
                {journey.footer.practice}
              </Link>
              <Link href="/privacy" className={linkClass}>
                {journey.footer.privacy}
              </Link>
            </nav>
            <p className="[overflow-wrap:anywhere] text-meta text-cream-dim">{state.progressSavedInBrowserOnly}</p>
          </div>
        </div>
        <p className="w-full text-display-phone desktop:text-display">{journey.footer.wordmark}</p>
      </div>
    </footer>
  );
}
