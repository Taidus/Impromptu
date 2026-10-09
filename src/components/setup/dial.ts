import type { Level } from "@/domain/library/schema";

// The Difficulty Dial's four stops (DESIGN.md -> Components -> Difficulty
// Dial), in the same order copy.ts and FourLevels.tsx use.
export const LEVELS: readonly Level[] = ["explore", "experiment", "develop", "perform"];

export function levelIndex(level: Level): number {
  return LEVELS.indexOf(level);
}

export function levelDisplayName(level: Level): string {
  return level.charAt(0).toUpperCase() + level.slice(1);
}

/**
 * EXPERIENCE.md -> Component Patterns -> Difficulty Dial: "the value text
 * joins the Level name and its one-liner" — e.g. "Experiment. Try more than
 * one way in."
 */
export function levelValueText(level: Level, oneLiner: string): string {
  return `${levelDisplayName(level)}. ${oneLiner}`;
}

const STEP_KEYS: Record<string, 1 | -1> = {
  ArrowRight: 1,
  ArrowUp: 1,
  ArrowLeft: -1,
  ArrowDown: -1,
};

/**
 * Arrow keys step by one stop, clamped at either end (no wraparound — "all
 * four Levels are always selectable" never means cycling past Perform back
 * to Explore). Home/End jump to an end. Any other key is a no-op (`null`),
 * so the caller never dispatches an event for it.
 */
export function levelFromKey(current: Level, key: string): Level | null {
  if (key === "Home") return LEVELS[0];
  if (key === "End") return LEVELS[LEVELS.length - 1];
  const step = STEP_KEYS[key];
  if (step === undefined) return null;
  const nextIndex = Math.min(Math.max(levelIndex(current) + step, 0), LEVELS.length - 1);
  return LEVELS[nextIndex];
}

/**
 * A click, drag, or touch position along the dial's track, expressed as a
 * 0..1 ratio of its width, snaps to the nearest of the four stops. Out-of-
 * range ratios (a drag past either end) clamp first.
 */
export function levelFromPointerRatio(ratio: number): Level {
  const clamped = Math.min(Math.max(ratio, 0), 1);
  const index = Math.round(clamped * (LEVELS.length - 1));
  return LEVELS[index];
}
