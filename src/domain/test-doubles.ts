import type { Clock, Random } from "./ports";
import { uuidFromBytes } from "./uuid";

export function fakeClock(startMs = 0): Clock & { advance(ms: number): void } {
  let nowMs = startMs;
  return {
    now: () => nowMs,
    advance(ms) {
      nowMs += ms;
    },
  };
}

/** mulberry32: deterministic 32-bit PRNG. */
export function seededRandom(seed: number): Random {
  let state = seed >>> 0;
  const next = () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const uuid = () => uuidFromBytes(Array.from({ length: 16 }, () => Math.floor(next() * 256)));
  return { next, uuid };
}
