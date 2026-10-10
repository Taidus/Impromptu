// Pure Reveal motion decisions (Story 4.1): the shuffle/landing state
// machine and the aria-hidden flick candidate pool. Kept out of the
// `useRevealMotion` hook (which owns the real timers and the store
// dispatch) so the sequencing rules are unit-testable without mounting
// React or faking `setTimeout`. AD-18: this never changes `revealed`
// itself -- `useRevealMotion` dispatches the existing `reveal_next` event
// only when a piece's landing phase completes (see that file).
import type { ComposeLibrary } from "@/domain/compose/compose";
import { isCompatible } from "@/domain/library/compat";
import type { Constraint, Medium, Skill, Style, Topic } from "@/domain/library/schema";
import type { Challenge, RevealedKind, Setup } from "@/domain/session/schema";
import { config } from "@/config/app";
import { nextKind } from "./reveal-logic";

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

type Fill = Topic | Style | Constraint;

/** The Mediums the Setup allows: a pinned "This time" Medium, else every enabled one. */
function allowedMediumIds(setup: Pick<Setup, "medium" | "enabledMediums">): readonly string[] {
  return setup.medium !== "random" ? [setup.medium] : setup.enabledMediums;
}

/** Skills that could have been composed: a pinned Skill focus, else every Skill with a non-retired Template at the held Level for an allowed Medium. */
function skillPool(challenge: Challenge, library: ComposeLibrary, setup: Pick<Setup, "skillFocus" | "medium" | "enabledMediums">): Skill[] {
  if (setup.skillFocus !== "random") return library.skills.filter((s) => s.id === setup.skillFocus);
  const mediums = allowedMediumIds(setup);
  return library.skills.filter((s) =>
    library.templates.some(
      (t) => !t.retired && t.skill === s.id && t.level === challenge.level && t.mediums.some((m) => mediums.includes(m)),
    ),
  );
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

/** Non-retired fills of `kind` that `isCompatible` accepts with the held Template, Medium, and the other held fills. */
function fillPool(kind: "topic" | "style" | "constraint", challenge: Challenge, library: ComposeLibrary): Fill[] {
  const template = library.templates.find((t) => t.id === challenge.templateId);
  const medium = library.mediums.find((m) => m.id === challenge.inputs.medium.id);
  if (!template || !medium) return [];
  const held = <F extends Fill>(fills: F[], k: "topic" | "style" | "constraint"): F | null =>
    fills.find((f) => f.id === challenge.inputs[k]?.id) ?? null;
  const topic = held(library.topics, "topic");
  const style = held(library.styles, "style");
  const constraint = held(library.constraints, "constraint");
  switch (kind) {
    case "topic":
      return library.topics.filter((f) => !f.retired && isCompatible(template, medium, f, style, constraint));
    case "style":
      return library.styles.filter((f) => !f.retired && isCompatible(template, medium, topic, f, constraint));
    case "constraint":
      return library.constraints.filter((f) => !f.retired && isCompatible(template, medium, topic, style, f));
  }
}

/**
 * The decorative candidate values an in-progress flick may show for `kind`
 * -- only values the user's setup allows (AD-18): Skills reachable at the
 * held Level with an allowed Medium, allowed Mediums, and fills compatible
 * with everything else held. An empty pool falls back to the Challenge's own
 * landed value (never `""`), so a single value lands without a shuffle.
 */
export function flickPool(
  kind: Exclude<RevealedKind, "brief">,
  challenge: Challenge,
  library: ComposeLibrary,
  setup: Pick<Setup, "enabledMediums" | "medium" | "skillFocus">,
): string[] {
  const real = challenge.inputs[kind]?.revealText;
  const fallback = real !== undefined ? [real] : [];
  const pool =
    kind === "skill"
      ? skillPool(challenge, library, setup)
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

// --- The scheduler: real timers + the one commit, store-agnostic ------------

/** What the driver reads at the moment it acts -- the live store, never a stale render's copy. */
export interface MotionSnapshot {
  challenge: Challenge | null;
  revealed: readonly RevealedKind[];
  library: ComposeLibrary | null;
  setup: Setup | null;
  reduced: boolean;
}

export interface MotionDriverDeps {
  read: () => MotionSnapshot;
  /** Dispatches `reveal_next` -- only ever called for the kind that is still `nextKind`. */
  commit: () => void;
  onState: (state: MotionState, challengeId: string | null) => void;
}

/** A motion started for `kind` on `challengeId` is still the live next step (no other tab, restore, or new Challenge moved past it). */
export function isStillNext(
  kind: RevealedKind,
  challengeId: string | null,
  challenge: Challenge | null,
  revealed: readonly RevealedKind[],
): boolean {
  return challenge !== null && challenge.id === challengeId && nextKind(challenge, revealed) === kind;
}

/** How long a phase lasts. Reduced motion never shuffles and commits after the fade budget (Story 4.2 refines the visuals). */
export function phaseMs(state: Exclude<MotionState, { status: "idle" }>, reduced: boolean): number {
  if (state.status === "shuffling") return config.reveal.motion.shuffleMs;
  return reduced ? config.reveal.motion.reducedLandMs : landDurationMs(state.kind);
}

/**
 * Owns the phase timer and the one `reveal_next` commit (AD-18), outside
 * React so it can be driven by fake timers in tests. `useRevealMotion`
 * creates one per Stage and mirrors `onState` into React state.
 */
export function createMotionDriver(deps: MotionDriverDeps) {
  let state: MotionState = idleMotion;
  let challengeId: string | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;

  function stillNext(kind: RevealedKind): boolean {
    const { challenge, revealed } = deps.read();
    return isStillNext(kind, challengeId, challenge, revealed);
  }

  function set(next: MotionState) {
    clearTimeout(timer);
    timer = undefined;
    state = next;
    if (next.status !== "idle") timer = setTimeout(elapse, phaseMs(next, deps.read().reduced));
    deps.onState(state, challengeId);
  }

  function settle(result: PressResult) {
    set(result.state);
    if (result.completeKind !== null && stillNext(result.completeKind)) deps.commit();
  }

  function elapse() {
    timer = undefined;
    if (state.status === "shuffling") set(shuffleElapsed(state, state.kind));
    else if (state.status === "landing") settle(landingDone(state, state.kind));
  }

  return {
    press() {
      const { challenge, revealed, library, setup, reduced } = deps.read();
      if (state.status === "idle") challengeId = challenge?.id ?? null;
      const next = challenge !== null ? nextKind(challenge, revealed) : null;
      const shuffle =
        next !== null && next !== "brief" && challenge !== null && library !== null && setup !== null && !reduced
          ? shouldShuffle(flickPool(next, challenge, library, setup))
          : false;
      settle(press(state, next, shuffle));
    },
    /** Call whenever the held Challenge or `revealed` changes: an in-flight piece that's no longer next is dropped, its timer cancelled. */
    reconcile() {
      if (state.status !== "idle" && !stillNext(state.kind)) set(idleMotion);
    },
    dispose() {
      clearTimeout(timer);
      timer = undefined;
      // Unmounting mid-landing (e.g. Back to Setup): the real value is already
      // on screen, so commit it rather than let it silently revert. A reload
      // never runs this, so "reload mid-animation keeps `revealed`" holds.
      if (state.status === "landing" && stillNext(state.kind)) deps.commit();
      state = idleMotion;
    },
  };
}

export type MotionDriver = ReturnType<typeof createMotionDriver>;
