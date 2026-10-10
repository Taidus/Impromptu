// Pure decisions the Stage shell makes from store state (Story 3.9). Kept
// out of StagePage.tsx so the branches below are unit-testable without
// rendering React or mounting the Next.js router.
import { copy } from "@/components/copy";
import type { Challenge, Session } from "@/domain/session/schema";
import type { Status } from "@/store";

/**
 * AD-7 + the store's own queuing rule: a brand-new `/stage` visit (nothing
 * held) asks for a Challenge once the library can resolve "This time"/"all
 * Mediums" into real ids -- which is exactly `libraryStatus === 'ready'`
 * (Story 3.6 Design Notes: by then `status` is already 'ready' too, for
 * both first-time and returning visitors).
 */
export function shouldRequestNewChallenge(libraryStatus: Status, sessionState: Session["state"]): boolean {
  return libraryStatus === "ready" && sessionState === "none";
}

/** The short load-error copy shows whenever hydration or the library failed. */
export function isStageError(status: Status, libraryStatus: Status): boolean {
  return status === "error" || libraryStatus === "error";
}

/**
 * The Level/mode meta line (DESIGN.md -> Layout & Spacing -> Challenge
 * Stage). `null` before a Challenge is held -- the caller renders a
 * same-height placeholder instead of this text, so the meta row never
 * reflows once the real value lands.
 */
export function stageMeta(challenge: Challenge | null): string | null {
  if (challenge === null) return null;
  const level = copy.stage.levelName[challenge.level];
  const mode = challenge.timeLimitSec === null ? copy.stage.mode.untimed : copy.stage.mode.timed;
  return `${level} · ${mode}`;
}

/**
 * AD-7 / EXPERIENCE.md -> Interaction Primitives: Esc does nothing during a
 * running Attempt. (Back is unconditional -- EXPERIENCE.md -> Component
 * Patterns: "With an Attempt running, returns to Setup and the Attempt
 * keeps running" -- so it never calls this guard.)
 */
export function canHandleEscape(session: Pick<Session, "state">): boolean {
  return session.state !== "attempt";
}

type KeyLike = Pick<
  KeyboardEvent,
  "key" | "repeat" | "defaultPrevented" | "isComposing" | "altKey" | "ctrlKey" | "metaKey" | "shiftKey"
>;

/**
 * A bare, first-press Escape nobody else handled: a held key's auto-repeat,
 * an IME composition, a modifier chord, or an event a popover/dialog
 * already consumed (EXPERIENCE.md: "Esc closes an open popover or dialog
 * first") never reaches the Stage's Esc behavior.
 */
export function isPlainEscape(event: KeyLike): boolean {
  return (
    event.key === "Escape" &&
    !event.repeat &&
    !event.defaultPrevented &&
    !event.isComposing &&
    !event.altKey &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.shiftKey
  );
}
