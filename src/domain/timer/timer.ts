import type { Attempt } from "@/domain/session/schema";

/**
 * AD-8: wall-clock elapsed time, minus any paused time (completed spans plus
 * the still-open one while paused). Pure and Clock-free -- callers pass
 * `nowMs`. Never negative: a clock skew or a `nowMs` read before `startedAt`
 * (shouldn't happen, but backgrounding makes "shouldn't" cheap to get wrong)
 * clamps to 0 rather than letting the countdown run backwards.
 */
export function elapsedMs(attempt: Attempt, nowMs: number): number {
  const pausedMs = attempt.pausedTotalMs + (attempt.pausedAt !== null ? nowMs - attempt.pausedAt : 0);
  return Math.max(0, nowMs - attempt.startedAt - pausedMs);
}

/** Seconds left, floored; `null` when the Attempt is untimed. Never negative. */
export function remainingSec(attempt: Attempt, nowMs: number): number | null {
  if (attempt.timeLimitSec === null) return null;
  return Math.max(0, attempt.timeLimitSec - Math.floor(elapsedMs(attempt, nowMs) / 1000));
}

/** Always false when untimed; true once `remainingSec` reaches 0. No failure state -- just a flag. */
export function timeUp(attempt: Attempt, nowMs: number): boolean {
  const remaining = remainingSec(attempt, nowMs);
  return remaining !== null && remaining <= 0;
}

/** Elapsed whole seconds; capped at `timeLimitSec` when timed (AD-8), uncapped when untimed. */
export function timeUsedSec(attempt: Attempt, nowMs: number): number {
  const usedSec = Math.floor(elapsedMs(attempt, nowMs) / 1000);
  return attempt.timeLimitSec === null ? usedSec : Math.min(usedSec, attempt.timeLimitSec);
}

/** `sec` as "mm:ss", zero-padded on both sides. Negative or non-finite input renders as 0. */
export function formatCountdown(sec: number): string {
  const total = Number.isFinite(sec) ? Math.max(0, Math.floor(sec)) : 0;
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
