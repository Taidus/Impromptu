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

/** The given kinds' announcements, in reveal order; `null` when none of them is present. */
function landedAnnouncement(challenge: Challenge, kinds: readonly RevealedKind[]): string | null {
  const landed = presentKinds(challenge).filter((kind) => kinds.includes(kind));
  return landed.length === 0 ? null : landed.map((kind) => announcementFor(kind, challenge)).join(" ");
}

/**
 * Reroll's own live-region lead-in (EXPERIENCE.md -> Rerolling; Story 4.3).
 * While the commit left changed kinds un-landed (Quick reveal off), there is
 * nothing yet to add -- each one is announced on its own as it lands, same
 * as any other Reveal step. When the commit already landed everything
 * (nothing changed, or Quick reveal is on), it reads out together with the
 * full current Challenge, the same shape `quickRevealAnnouncement` uses.
 */
function rerollAnnouncement(challenge: Challenge, revealed: readonly RevealedKind[]): string {
  if (!isFullyRevealed(challenge, revealed)) return copy.stage.rerolled;
  const landed = landedAnnouncement(challenge, revealed);
  return landed === null ? copy.stage.rerolled : `${copy.stage.rerolled} ${landed}`;
}

/**
 * What the Stage's live region should say after a session change, or `null`
 * to leave it as is. `prevChallengeId`/`prevRevealed` are what the region
 * last saw; the caller seeds them with the restored state on its first
 * hydrated render, so whatever a fresh mount already finds held is never
 * "new" here -- `restoreAnnouncement` (below) speaks for it instead.
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
  if (isNew && challenge.origin.kind === "reroll") return rerollAnnouncement(challenge, revealed);
  if (isNew && quickReveal && isFullyRevealed(challenge, revealed)) return quickRevealAnnouncement(challenge);
  const text = landedAnnouncement(challenge, isNew ? revealed : revealed.filter((kind) => !prevRevealed.includes(kind)));
  return text ?? (isNew ? "" : null);
}

/**
 * Story 3.11 / EXPERIENCE.md -> State Patterns, "Reload or Resume in any
 * state": the one-shot announcement for whatever a fresh `/stage` mount
 * (reload, resume, or a Setup round trip) already finds held. `null` when
 * nothing present has landed yet -- a held Challenge with nothing revealed
 * reads the same whether it was just composed or just restored. Otherwise
 * the landed pieces (and the Brief, once it has), in reveal order; the
 * "Challenge ready." lead-in only when Quick reveal landed it all at once.
 */
export function restoreAnnouncement(
  challenge: Challenge,
  revealed: readonly RevealedKind[],
  quickReveal: boolean,
): string | null {
  if (quickReveal && isFullyRevealed(challenge, revealed)) return quickRevealAnnouncement(challenge);
  return landedAnnouncement(challenge, revealed);
}

/** DESIGN.md -> Typography fit rule: the desktop Topic drops to `topic-stage-long` once it runs past two lines. */
export function isPastTwoLines(heightPx: number, lineHeightPx: number): boolean {
  return heightPx > lineHeightPx * 2 + 1; // +1: sub-pixel rounding
}

/** EXPERIENCE.md -> Component Patterns, Empty slot: "Topic, not revealed yet." */
export function emptySlotLabel(kind: Exclude<RevealedKind, "brief">): string {
  return `${copy.stage.piece[kind]}, ${copy.stage.notRevealedYet}`;
}
