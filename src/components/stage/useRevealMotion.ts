"use client";

// Story 4.1: the React wiring for the Reveal's shuffle/landing motion. The
// state machine, candidate pools, and the timer/commit scheduler live in
// `reveal-motion.ts` (pure + unit-tested); this hook creates one driver per
// Stage, mirrors its state into React, and runs the decorative flick tick.
// Shared by the sun button (RevealComposition) and the Stage's keyboard
// fallback (StagePage), so a press from either place sequences the same way.
import { useEffect, useMemo, useState } from "react";
import { config } from "@/config/app";
import { prefersReducedMotion, usePrefersReducedMotion } from "@/components/motion";
import type { ComposeLibrary } from "@/domain/compose/compose";
import type { Challenge, InputKind, RevealedKind, Setup } from "@/domain/session/schema";
import { getAppStore } from "@/store";
import { changedInputKinds, nextKind } from "./reveal-logic";
import { createMotionDriver, flickPool, idleMotion, isStillNext, type MotionState } from "./reveal-motion";

export interface RevealMotion {
  state: MotionState;
  /** The current flick text while `state.status === "shuffling"`, else `null`. aria-hidden by the caller. */
  flickText: string | null;
  /** Whether there's anything a press could do right now (starts a piece, or force-completes one in flight) -- lets callers decide whether to `preventDefault` a keyboard fallback. */
  canPress: boolean;
  /** Story 4.2: while a piece is in flight, the reduced-motion value captured at its press (the same one its timer uses); when idle, the live `usePrefersReducedMotion()`. Callers pass it to `landingMotion`/`ScrapGroup`. */
  reduced: boolean;
  /** Stable across renders. */
  press: () => void;
}

/**
 * `challenge` is `null` before anything is held -- StagePage calls this
 * unconditionally (Rules of Hooks), since its keydown fallback needs the
 * same instance RevealComposition's button uses, and that component only
 * mounts once a Challenge is held.
 */
export function useRevealMotion(
  challenge: Challenge | null,
  revealed: readonly RevealedKind[],
  library: ComposeLibrary | null,
  setup: Setup | null,
): RevealMotion {
  const liveReduced = usePrefersReducedMotion();
  const [snap, setSnap] = useState<{ state: MotionState; challengeId: string | null; reduced: boolean }>({
    state: idleMotion,
    challengeId: null,
    reduced: false,
  });
  const [driver] = useState(() =>
    createMotionDriver({
      read: () => {
        const s = getAppStore().getState();
        return {
          challenge: s.session.state === "held" ? s.session.challenge : null,
          revealed: s.session.revealed,
          library: s.library,
          setup: s.setup,
          reduced: prefersReducedMotion(),
        };
      },
      commit: () => getAppStore().dispatchSession({ type: "reveal_next" }),
      onState: (state, challengeId, reduced) => setSnap({ state, challengeId, reduced }),
    }),
  );

  // A motion for another Challenge, or for a kind that's no longer next
  // (another tab, a restore), renders as idle at once; the effect cancels its timer.
  const state =
    snap.state.status !== "idle" && isStillNext(snap.state.kind, snap.challengeId, challenge, revealed) ? snap.state : idleMotion;
  const reduced = state.status === "idle" ? liveReduced : snap.reduced;
  const challengeId = challenge?.id ?? null;
  useEffect(() => driver.reconcile(), [driver, challengeId, revealed]);
  useEffect(() => () => driver.dispose(), [driver]);

  // The decorative flick tick: reset render-time whenever a new piece starts
  // shuffling (lint forbids setState in an effect body), then advanced by an
  // interval only while shuffling.
  const shufflingKind = state.status === "shuffling" ? state.kind : null;
  const [tick, setTick] = useState(0);
  const [lastShufflingKind, setLastShufflingKind] = useState<RevealedKind | null>(null);
  if (shufflingKind !== lastShufflingKind) {
    setLastShufflingKind(shufflingKind);
    if (shufflingKind !== null) setTick(0);
  }
  useEffect(() => {
    if (shufflingKind === null) return;
    const id = setInterval(() => setTick((t) => t + 1), config.reveal.motion.flickIntervalMs);
    return () => clearInterval(id);
  }, [shufflingKind]);

  const pool =
    shufflingKind !== null && shufflingKind !== "brief" && challenge !== null && library !== null && setup !== null
      ? flickPool(shufflingKind, challenge, library, setup)
      : null;
  const flickText = pool !== null && pool.length > 0 ? pool[tick % pool.length] : null;
  const canPress = (challenge !== null && nextKind(challenge, revealed) !== null) || state.status !== "idle";

  return useMemo(
    () => ({ state, flickText, canPress, reduced, press: driver.press }),
    [state, flickText, canPress, reduced, driver],
  );
}

/** Story 4.3: the changed pieces' one decorative reshuffle after a Reroll. */
export interface RerollShuffle {
  /** True while the reshuffle plays; Reroll ignores presses (and says so via `aria-disabled`) until it ends. */
  active: boolean;
  /** The current aria-hidden flick text per reshuffling kind; a kind with no other candidate (or under reduced motion) has none and just shows its value. */
  flickText: Partial<Record<InputKind, string>>;
}

/**
 * EXPERIENCE.md -> Rerolling: a Reroll commits fully landed (the reducer),
 * then its changed pieces "reshuffle together using Quick reveal timing"
 * while locked pieces stay still -- one flick run of at most
 * `config.reveal.quickMaxMs`, from the same Story 4.1 flick pools. Under
 * reduced motion there are no flicks: the changed pieces remount (they are
 * keyed on their value) with the Story 4.2 fade, and this only spans that
 * fade. Purely decorative: `revealed` and the announcement never wait on it.
 * Only a new `reroll`-origin Challenge seen while mounted starts one -- a
 * restore or reload never does.
 */
export function useRerollShuffle(challenge: Challenge | null, library: ComposeLibrary | null, setup: Setup | null): RerollShuffle {
  const liveReduced = usePrefersReducedMotion();
  const [seen, setSeen] = useState<{ challenge: Challenge | null; kinds: InputKind[]; reduced: boolean }>({
    challenge,
    kinds: [],
    reduced: false,
  });
  if (challenge?.id !== seen.challenge?.id) {
    const kinds =
      challenge !== null && seen.challenge !== null && challenge.origin.kind === "reroll"
        ? changedInputKinds(seen.challenge, challenge)
        : [];
    setSeen({ challenge, kinds, reduced: liveReduced });
  }

  const active = seen.kinds.length > 0;
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!active) return;
    const { motion, quickMaxMs } = config.reveal;
    const ms = seen.reduced ? motion.reducedLandMs : Math.min(motion.shuffleMs, quickMaxMs);
    const done = setTimeout(() => setSeen((prev) => ({ ...prev, kinds: [] })), ms);
    const flick = seen.reduced ? undefined : setInterval(() => setTick((t) => t + 1), motion.flickIntervalMs);
    return () => {
      clearTimeout(done);
      clearInterval(flick);
    };
  }, [active, seen.challenge, seen.reduced]);

  const flickText: Partial<Record<InputKind, string>> = {};
  if (active && !seen.reduced && challenge !== null && library !== null && setup !== null) {
    seen.kinds.forEach((kind, i) => {
      const pool = flickPool(kind, challenge, library, setup);
      if (pool.length > 1) flickText[kind] = pool[(tick + i) % pool.length];
    });
  }
  return { active, flickText };
}
