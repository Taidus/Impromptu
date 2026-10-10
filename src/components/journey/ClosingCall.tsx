import { copy } from "@/components/copy";
import { GetAChallengeButton } from "@/components/GetAChallengeButton";

// Section 04 (sun): the Y2K closing line and the second "Get a challenge",
// which composes a fresh Challenge (or reads Resume during an Attempt).
export function ClosingCall() {
  return (
    <section className="bg-sun px-gutter-phone py-20 text-ink desktop:px-14 desktop:py-28">
      <div className="relative z-10 mx-auto flex max-w-content-max flex-col items-start gap-10">
        <h2 className="text-y2k-display text-grape-deep">{copy.journey.closing}</h2>
        <GetAChallengeButton ground="sun" />
      </div>
    </section>
  );
}
