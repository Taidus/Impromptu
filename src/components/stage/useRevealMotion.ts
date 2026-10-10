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
import type { Challenge, RevealedKind, Setup } from "@/domain/session/schema";
import { getAppStore } from "@/store";
import { nextKind } from "./reveal-logic";
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
