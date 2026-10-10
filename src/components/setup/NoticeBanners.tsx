"use client";

import Link from "next/link";
import { copy } from "@/components/copy";
import { inkButtonClassName } from "@/components/InkButton";
import type { StoreState } from "@/store";
import { activeNoticeBanners, type NoticeBannerKind } from "./notice-banners";

/**
 * DESIGN.md -> Components -> Notice banner: a cream panel with a 1px ink
 * border, under the header, that never dismisses itself and is never a
 * modal (same card shell as `EmailSignup`'s lilac variant). More than one
 * can apply at once (a held Challenge and a storage problem are
 * independent) -- each stacks as its own panel. AD-10: gated on `status`
 * like the rest of Setup's controls, so it never flashes a stale value
 * before hydration resolves. The polite status region is always mounted
 * (empty while loading), so banners that appear after hydration are
 * announced. It adds its own bottom margin only when it holds a banner.
 */
export function NoticeBanners({ state }: { state: StoreState }) {
  const banners =
    state.status === "loading"
      ? []
      : activeNoticeBanners({
          sessionState: state.session.state,
          storageAvailable: state.storageAvailable,
          migrationFailed: state.migrationFailed,
        });

  return (
    <div role="status" className="flex flex-col gap-3 not-empty:mb-10">
      {banners.map((kind) => (
        <NoticeBanner key={kind} kind={kind} />
      ))}
    </div>
  );
}

function NoticeBanner({ kind }: { kind: NoticeBannerKind }) {
  return (
    // tabIndex -1 + data-notice-banner: ReturnFocus lands here on Back from /stage
    // (EXPERIENCE.md -> Focus targets, "or the notice banner when one is shown").
    <div
      data-notice-banner=""
      tabIndex={-1}
      className="flex flex-wrap items-center justify-between gap-3 rounded-scrap border border-ink bg-cream px-4 py-3 text-ink"
    >
      <p className="text-body">{copy.notice[kind]}</p>
      {kind === "challengeWaiting" ? (
        // The Challenge is already held -- /stage finds it without composing again.
        // "paper": cream sits a shade off paper and takes the same grape focus ring.
        <Link href="/stage" className={inkButtonClassName("paper")}>
          {copy.button.backToYourChallenge}
        </Link>
      ) : null}
    </div>
  );
}
