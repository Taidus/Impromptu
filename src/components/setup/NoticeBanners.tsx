"use client";

import { useRouter } from "next/navigation";
import { copy } from "@/components/copy";
import { InkButton } from "@/components/InkButton";
import type { StoreState } from "@/store";
import { activeNoticeBanners, type NoticeBannerKind } from "./notice-banners";

/**
 * DESIGN.md -> Components -> Notice banner: a cream panel with a 1px ink
 * border, under the header, that never dismisses itself and is never a
 * modal (same card shell as `EmailSignup`'s lilac variant). More than one
 * can apply at once (a held Challenge and a storage problem are
 * independent) -- each stacks as its own panel. AD-10: gated on `status`
 * like the rest of Setup's controls, so it never flashes a stale value
 * before hydration resolves.
 */
export function NoticeBanners({ state }: { state: StoreState }) {
  if (state.status === "loading") return null;
  const banners = activeNoticeBanners({
    sessionState: state.session.state,
    storageAvailable: state.storageAvailable,
    migrationFailed: state.migrationFailed,
  });
  if (banners.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      {banners.map((kind) => (
        <NoticeBanner key={kind} kind={kind} />
      ))}
    </div>
  );
}

function NoticeBanner({ kind }: { kind: NoticeBannerKind }) {
  const router = useRouter();
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-scrap border border-ink bg-cream px-4 py-3 text-ink">
      <p className="text-body">{copy.notice[kind]}</p>
      {kind === "challengeWaiting" ? (
        // The Challenge is already held -- /stage finds it without composing again.
        <InkButton ground="night" onClick={() => router.push("/stage")}>
          {copy.button.backToYourChallenge}
        </InkButton>
      ) : null}
    </div>
  );
}
