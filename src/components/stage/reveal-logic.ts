// Pure Reveal decisions (Story 3.10): which pieces a Challenge actually has,
// which one lands next, and what the aria-live region says. Kept out of the
// React components so they're unit-testable without rendering anything.
import { copy } from "@/components/copy";
import { config } from "@/config/app";
import type { Challenge, RevealedKind } from "@/domain/session/schema";

/** Kinds this Challenge actually has, in config.reveal.order, with "brief" always last and always present. Mirrors the session reducer's own private helper (Story 3.4) -- kept separate because the UI needs it without a Session. */
export function presentKinds(challenge: Challenge): RevealedKind[] {
  return config.reveal.order.filter((kind) => isPresent(challenge, kind));
}

function isPresent(challenge: Challenge, kind: RevealedKind): boolean {
  if (kind === "brief") return true;
  return challenge.inputs[kind] !== undefined;
}

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

/** EXPERIENCE.md -> Component Patterns, Empty slot: "Topic, not revealed yet." */
export function emptySlotLabel(kind: Exclude<RevealedKind, "brief">): string {
  return `${copy.stage.piece[kind]}, ${copy.stage.notRevealedYet}`;
}
