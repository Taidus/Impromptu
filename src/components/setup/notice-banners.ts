// Pure Notice-banner selection (Story 3.11): which banners Setup shows, kept
// out of React so the combination logic is unit-testable without rendering
// anything. DESIGN.md -> Components -> Notice banner: "used for 'challenge
// in progress', 'challenge waiting', and 'history not kept'" -- these are
// independent conditions, not alternative states of one flag, so more than
// one can be true at once; this returns every banner that applies, in
// display order.
import type { Session } from "@/domain/session/schema";

export type NoticeBannerKind = "challengeWaiting" | "storageUnavailable" | "migrationFailed";

export function activeNoticeBanners(input: {
  sessionState: Session["state"];
  storageAvailable: boolean;
  migrationFailed: boolean;
}): NoticeBannerKind[] {
  const banners: NoticeBannerKind[] = [];
  // UX-DR26: a held, not-started Challenge. Attempt in progress is Story
  // 5.4's own banner (out of scope) -- "attempt" never reaches here.
  if (input.sessionState === "held") banners.push("challengeWaiting");
  if (!input.storageAvailable) banners.push("storageUnavailable");
  if (input.migrationFailed) banners.push("migrationFailed");
  return banners;
}
