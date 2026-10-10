// Pure Reveal motion decisions (Story 4.1): the shuffle/landing state
// machine and the aria-hidden flick candidate pool. Kept out of the
// `useRevealMotion` hook (which owns the real timers and the store
// dispatch) so the sequencing rules are unit-testable without mounting
// React or faking `setTimeout`. AD-18: this never changes `revealed`
// itself -- `useRevealMotion` dispatches the existing `reveal_next` event
// only when a piece's landing phase completes (see that file).
import type { ComposeLibrary } from "@/domain/compose/compose";
import type { Medium, Skill, Template } from "@/domain/library/schema";
import type { Challenge, RevealedKind, Setup } from "@/domain/session/schema";
import { config } from "@/config/app";

export type MotionState =
  | { status: "idle" }
  | { status: "shuffling"; kind: RevealedKind }
  | { status: "landing"; kind: RevealedKind };

export const idleMotion: MotionState = { status: "idle" };

/** UX-DR22: scrap and tabs land slower than the foil, which lands slower than the stamp; the Brief is a plain fade. */
export function landDurationMs(kind: RevealedKind): number {
  return config.reveal.motion.landMs[kind];
}

/** Starts animating `kind`; `shuffle: false` (a single candidate, or the Brief) skips straight to landing. */
export function startMotion(kind: RevealedKind, shuffle: boolean): MotionState {
  return shuffle ? { status: "shuffling", kind } : { status: "landing", kind };
}

/** The shuffle timer fired: move to landing. A no-op if the state has already moved on (a stale timer from a force-completed piece). */
export function shuffleElapsed(state: MotionState, kind: RevealedKind): MotionState {
  if (state.status !== "shuffling" || state.kind !== kind) return state;
  return { status: "landing", kind };
}

export interface PressResult {
  state: MotionState;
  /** Non-null when the caller must dispatch `reveal_next` for this kind right now (a fresh landing timer elapsed, or this press force-completed one in flight). */
  completeKind: RevealedKind | null;
}

/**
 * A "Reveal next" press, or a landing timer elapsing on its own.
 * Idle + a kind to reveal: starts animating it (no dispatch yet -- that
 * waits for `landingDone`, below). Idle + nothing left: a no-op. Mid-animation
 * (shuffling or landing): the press force-completes the current piece at
 * once and returns to idle -- the AC's "no skipped step": the next piece
 * never starts until the *following* press.
 */
export function press(state: MotionState, nextKind: RevealedKind | null, shuffle: boolean): PressResult {
  if (state.status !== "idle") return { state: idleMotion, completeKind: state.kind };
  if (nextKind === null) return { state, completeKind: null };
  return { state: startMotion(nextKind, shuffle), completeKind: null };
}

/** A landing phase's own timer elapsed (no intervening press): commit it and return to idle. A no-op if a press already force-completed it. */
export function landingDone(state: MotionState, kind: RevealedKind): PressResult {
  if (state.status !== "landing" || state.kind !== kind) return { state, completeKind: null };
  return { state: idleMotion, completeKind: kind };
}

// --- Flick candidates (AD-18 "only values the user's setup allows") -------

type Fill = { id: string; revealText: string; tags: readonly string[]; retired?: boolean };

function fillsFor(kind: "topic" | "style" | "constraint", library: ComposeLibrary): Fill[] {
  switch (kind) {
    case "topic":
      return library.topics;
    case "style":
      return library.styles;
    case "constraint":
      return library.constraints;
  }
}

function templateTagsFor(kind: "topic" | "style" | "constraint", template: Template): readonly string[] {
  switch (kind) {
    case "topic":
      return template.topicTags;
    case "style":
      return template.styleTags;
    case "constraint":
      return template.constraintTags;
  }
}

function skillPool(library: ComposeLibrary, setup: Pick<Setup, "skillFocus">): Skill[] {
  if (setup.skillFocus === "random") return library.skills;
  const pinned = library.skills.find((s) => s.id === setup.skillFocus);
  return pinned ? [pinned] : library.skills;
}

function mediumPool(challenge: Challenge, library: ComposeLibrary, setup: Pick<Setup, "medium" | "enabledMediums">): Medium[] {
  if (setup.medium !== "random") {
    const pinned = library.mediums.find((m) => m.id === setup.medium);
    if (pinned) return [pinned];
  }
  const enabled = library.mediums.filter((m) => setup.enabledMediums.includes(m.id));
  const template = library.templates.find((t) => t.id === challenge.templateId);
  const compatible = template ? enabled.filter((m) => template.mediums.includes(m.id)) : enabled;
  return compatible.length > 0 ? compatible : enabled;
}

function fillPool(kind: "topic" | "style" | "constraint", challenge: Challenge, library: ComposeLibrary): Fill[] {
  const all = fillsFor(kind, library).filter((f) => f.retired !== true);
  const template = library.templates.find((t) => t.id === challenge.templateId);
  if (!template) return all;
  const tags = templateTagsFor(kind, template);
  const compatible = all.filter((f) => f.tags.some((t) => tags.includes(t)) && !template.incompatible.includes(f.id));
  return compatible.length > 0 ? compatible : all;
}

/**
 * The decorative candidate values an in-progress flick may show for `kind`
 * -- "compatible with the held Template where feasible, else the same-kind
 * values" (AD-18). Skill/Medium are instead gated by the setup fields that
 * actually restrict them (`skillFocus`, `medium`/`enabledMediums`); Topic,
 * Style, and Constraint have no such setup field, so they fall back to
 * every non-retired fill of that kind. Never empty -- a pool that would
 * otherwise be empty falls back to the Challenge's own landed value, so
 * `shouldShuffle` always sees at least one candidate.
 */
export function flickPool(
  kind: Exclude<RevealedKind, "brief">,
  challenge: Challenge,
  library: ComposeLibrary,
  setup: Pick<Setup, "enabledMediums" | "medium" | "skillFocus">,
): string[] {
  const fallback = [challenge.inputs[kind]?.revealText ?? ""];
  const pool =
    kind === "skill"
      ? skillPool(library, setup)
      : kind === "medium"
        ? mediumPool(challenge, library, setup)
        : fillPool(kind, challenge, library);
  const texts = pool.map((p) => p.revealText);
  return texts.length > 0 ? texts : fallback;
}

/** UX-DR22 "a single-value Input lands without a shuffle". */
export function shouldShuffle(pool: readonly string[]): boolean {
  return pool.length > 1;
}
