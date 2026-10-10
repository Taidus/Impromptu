// Pure Reveal decisions (Story 3.10): which pieces a Challenge actually has,
// which one lands next, and what the aria-live region says. Kept out of the
// React components so they're unit-testable without rendering anything.
import { copy } from "@/components/copy";
import type { Challenge, RevealedKind } from "@/domain/session/schema";
import { presentKinds } from "@/domain/session/session-reducer";

/** The next kind to land, or `null` once every present kind (including the Brief) has. */
export function nextKind(challenge: Challenge, revealed: readonly RevealedKind[]): RevealedKind | null {
  return presentKinds(challenge).find((kind) => !revealed.includes(kind)) ?? null;
}

/** True once there is nothing left for `reveal_next` to land. */
export function isFullyRevealed(challenge: Challenge, revealed: readonly RevealedKind[]): boolean {
  return nextKind(challenge, revealed) === null;
}

/**
 * EXPERIENCE.md -> Accessibility Floor: a landing Input announces as
 * "Topic: coming home." -- the Brief announces in full, unprefixed, exactly
 * as written (it already reads as a complete sentence).
 */
export function announcementFor(kind: RevealedKind, challenge: Challenge): string {
  if (kind === "brief") return challenge.brief;
  const value = challenge.inputs[kind]?.revealText ?? "";
  return `${copy.stage.piece[kind]}: ${value}.`;
}

/** Quick reveal: "Challenge ready." followed by every present Input, then the Brief, once. */
export function quickRevealAnnouncement(challenge: Challenge): string {
  const inputLines = presentKinds(challenge)
    .filter((kind): kind is Exclude<RevealedKind, "brief"> => kind !== "brief")
    .map((kind) => announcementFor(kind, challenge));
  return [copy.stage.challengeReady, ...inputLines, challenge.brief].join(" ");
}

/**
 * What the Stage's live region should say after a session change, or `null`
 * to leave it as is. `prevChallengeId`/`prevRevealed` are what the region
 * last saw; the caller seeds them with the restored state on hydration, so a
 * reload (Story 3.11 owns its announcement) never reaches here as "new".
 * A new Challenge clears stale text, or -- Quick reveal on, fully landed --
 * announces "Challenge ready." plus the whole Challenge. Otherwise every
 * newly landed kind is announced, in reveal order (a multi-kind jump from
 * another tab announces all of them, not just the last).
 */
export function liveAnnouncement(
  prevChallengeId: string | null,
  prevRevealed: readonly RevealedKind[],
  challenge: Challenge | null,
  revealed: readonly RevealedKind[],
  quickReveal: boolean,
): string | null {
  if (challenge === null) return prevChallengeId === null ? null : "";
  const isNew = challenge.id !== prevChallengeId;
  if (isNew && quickReveal && isFullyRevealed(challenge, revealed)) return quickRevealAnnouncement(challenge);
  const landed = revealed.filter((kind) => isNew || !prevRevealed.includes(kind));
  if (landed.length === 0) return isNew ? "" : null;
  return landed.map((kind) => announcementFor(kind, challenge)).join(" ");
}

/** DESIGN.md -> Typography fit rule: the desktop Topic drops to `topic-stage-long` once it runs past two lines. */
export function isPastTwoLines(heightPx: number, lineHeightPx: number): boolean {
  return heightPx > lineHeightPx * 2 + 1; // +1: sub-pixel rounding
}

/** EXPERIENCE.md -> Component Patterns, Empty slot: "Topic, not revealed yet." */
export function emptySlotLabel(kind: Exclude<RevealedKind, "brief">): string {
  return `${copy.stage.piece[kind]}, ${copy.stage.notRevealedYet}`;
}
