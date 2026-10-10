"use client";

// Story 4.1: owns the real timers behind the Reveal's shuffle/landing
// motion and the one place that dispatches `reveal_next` for it. The
// state machine and candidate-pool rules themselves live in
// `reveal-motion.ts` (pure, unit-tested); this hook is the thin,
// untested-by-design wiring (timers + the store) shared by the sun
// button (RevealComposition) and the Stage's keyboard fallback
// (StagePage), so a press from either place goes through the same
// sequencing.
import { useEffect, useState } from "react";
import { config } from "@/config/app";
import { usePrefersReducedMotion } from "@/components/motion";
import type { ComposeLibrary } from "@/domain/compose/compose";
import type { Challenge, RevealedKind, Setup } from "@/domain/session/schema";
import { getAppStore } from "@/store";
import { nextKind } from "./reveal-logic";
import { flickPool, idleMotion, landDurationMs, landingDone, press as pressMotion, shouldShuffle, shuffleElapsed, type MotionState } from "./reveal-motion";

export interface RevealMotion {
  state: MotionState;
  /** The current flick text while `state.status === "shuffling"`, else `null`. aria-hidden by the caller. */
  flickText: string | null;
  /** Whether there's anything a press could do right now (starts a piece, or force-completes one in flight) -- lets callers decide whether to `preventDefault` a keyboard fallback. */
  canPress: boolean;
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
  const [state, setState] = useState<MotionState>(idleMotion);
  const [tick, setTick] = useState(0);
  const reduced = usePrefersReducedMotion();

  // A fresh Challenge (a future Reroll, a brand-new one) never inherits a
  // stale in-flight animation from the one before it. The "store
  // information from previous renders" pattern (compare + conditionally
  // set during render, not inside an effect body) -- this codebase's lint
  // config rejects `setState` directly in an effect (3.10's own
  // precedent, StagePage's `live` seed).
  const challengeId = challenge?.id ?? null;
  const [lastChallengeId, setLastChallengeId] = useState(challengeId);
  if (challengeId !== lastChallengeId) {
    setLastChallengeId(challengeId);
    setState(idleMotion);
  }

  const next = challenge !== null ? nextKind(challenge, revealed) : null;
  const pool =
    state.status === "shuffling" && state.kind !== "brief" && challenge !== null && library !== null && setup !== null
      ? flickPool(state.kind, challenge, library, setup)
      : null;
  const flickText = pool !== null && pool.length > 0 ? pool[tick % pool.length] : null;

  // The flick tick resets the same render-time way, whenever a new piece
  // starts shuffling.
  const shufflingKind = state.status === "shuffling" ? state.kind : null;
  const [lastShufflingKind, setLastShufflingKind] = useState<RevealedKind | null>(null);
  if (shufflingKind !== lastShufflingKind) {
    setLastShufflingKind(shufflingKind);
    if (shufflingKind !== null) setTick(0);
  }

  // The shuffle phase's timer: flips to landing. The landing phase's timer:
  // the piece is done -- AD-18's one `reveal_next` dispatch, and only here,
  // never from a plain press (see `press`, below). `setState` here runs
  // inside the timer's own callback, not the effect body itself.
  useEffect(() => {
    if (state.status === "idle") return;
    const kind = state.kind;
    const delay = state.status === "shuffling" ? config.reveal.motion.shuffleMs : landDurationMs(kind);
    const id = setTimeout(() => {
      if (state.status === "shuffling") {
        setState(shuffleElapsed(state, kind));
        return;
      }
      const result = landingDone(state, kind);
      setState(result.state);
      if (result.completeKind !== null) getAppStore().dispatchSession({ type: "reveal_next" });
    }, delay);
    return () => clearTimeout(id);
  }, [state]);

  // The decorative flick tick's own interval, only while actually
  // shuffling; `setTick` runs inside the interval's callback, not here.
  useEffect(() => {
    if (state.status !== "shuffling") return;
    const id = setInterval(() => setTick((t) => t + 1), config.reveal.motion.flickIntervalMs);
    return () => clearInterval(id);
  }, [state]);

  function press() {
    const shuffle =
      next !== null && next !== "brief" && challenge !== null && library !== null && setup !== null && !reduced
        ? shouldShuffle(flickPool(next, challenge, library, setup))
        : false;
    const result = pressMotion(state, next, shuffle);
    setState(result.state);
    if (result.completeKind !== null) getAppStore().dispatchSession({ type: "reveal_next" });
  }

  return { state, flickText, canPress: next !== null || state.status !== "idle", press };
}
