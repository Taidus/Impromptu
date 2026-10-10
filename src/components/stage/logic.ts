// Pure decisions the Stage shell makes from store state (Story 3.9). Kept
// out of StagePage.tsx so the branches below are unit-testable without
// rendering React or mounting the Next.js router.
import { copy } from "@/components/copy";
import type { DecorMode } from "@/decor";
import type { Challenge, Session, SessionState } from "@/domain/session/schema";
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

export type KeyLike = Pick<
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

/**
 * Story 3.10 / EXPERIENCE.md -> Interaction Primitives: "the Stage key
 * handler (AD-7) handles only Esc, plus Space/Enter when no control has
 * focus; with focus on a control, keys keep their native behavior." Focus
 * normally sits on the sun button itself, whose native button activation
 * already handles Space/Enter -- this guard is only for the no-control-
 * focused fallback, with the same bare-first-press guards as isPlainEscape.
 */
export function isPlainActivationKey(event: KeyLike): boolean {
  return (
    (event.key === " " || event.key === "Enter") &&
    !event.repeat &&
    !event.defaultPrevented &&
    !event.isComposing &&
    !event.altKey &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.shiftKey
  );
}

export interface StageDecorInput {
  sessionState: SessionState;
  revealComplete: boolean;
  shuffling: boolean;
  frozenThisVisit: boolean;
}

/**
 * Story 8.5 / AD-12's freeze rule: the 3D shuffle layer behind the Stage
 * animates only while a held, incomplete Challenge has a piece actually
 * shuffling (Story 4.1's `useRevealMotion`) and the visit has not frozen
 * yet; between presses on that same Stage it is `idle` (chunk warm, loop
 * stopped) so the first shuffle can be 3D. Once frozen (see
 * `shouldFreezeVisit`), Reroll (4.3) and Variation (5.8) piece shuffles stay
 * DOM-only -- `frozenThisVisit` already latched true by then, so this never
 * needs a special case for either.
 */
export function stageDecorMode(input: StageDecorInput): Extract<DecorMode, "shuffle" | "idle" | "frozen"> {
  const { sessionState, revealComplete, shuffling, frozenThisVisit } = input;
  if (sessionState !== "held" || revealComplete || frozenThisVisit) return "frozen";
  return shuffling ? "shuffle" : "idle";
}

/**
 * True once this Stage visit must never animate the shuffle layer again:
 * the Brief has landed, or the session left `held` for an Attempt or later.
 * `none` is not "has been held": it is also the pre-hydration snapshot on
 * every full load, and `stageDecorMode` already freezes it on its own.
 */
export function shouldFreezeVisit(sessionState: SessionState, revealComplete: boolean): boolean {
  return sessionState === "held" ? revealComplete : sessionState !== "none";
}
