import Link from "next/link";
import { copy } from "@/components/copy";
import { inkButtonClassName } from "@/components/InkButton";

export interface ClosingCallProps {
  label?: string;
  href?: string;
}

// Section 04 (sun): the Y2K closing line and a second "Get a challenge".
// The Resume wiring (while an Attempt exists) comes with Story 3.6.
export function ClosingCall({ label = copy.button.getAChallenge, href = "/stage" }: ClosingCallProps) {
  return (
    <section className="bg-sun px-gutter-phone py-20 text-ink desktop:px-14 desktop:py-28">
      <div className="relative z-10 mx-auto flex max-w-content-max flex-col items-start gap-10">
        <h2 className="text-y2k-display text-grape-deep">{copy.journey.closing}</h2>
        {/* Link-shaped button: InkButton itself only renders a <button>. */}
        <Link href={href} className={inkButtonClassName("sun")}>
          {label}
        </Link>
      </div>
    </section>
  );
}
