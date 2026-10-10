import { describe, expect, it } from "vitest";
import type { Attempt } from "@/domain/session/schema";
import { elapsedMs, formatCountdown, remainingSec, timeUp, timeUsedSec } from "./timer";

const timed = (over: Partial<Attempt> = {}): Attempt => ({
  startedAt: 0,
  pausedAt: null,
  pausedTotalMs: 0,
  timeLimitSec: 300,
  ...over,
});

describe("elapsedMs", () => {
  it("is wall-clock minus startedAt while running", () => {
    expect(elapsedMs(timed(), 10_000)).toBe(10_000);
  });

  it("subtracts completed paused spans", () => {
    expect(elapsedMs(timed({ pausedTotalMs: 4_000 }), 10_000)).toBe(6_000);
  });

  it("also subtracts the still-open paused span while paused", () => {
    // 10s since start, but 2s of that (since pausedAt) hasn't counted yet.
    expect(elapsedMs(timed({ pausedAt: 8_000 }), 10_000)).toBe(8_000);
  });

  it("never goes below 0 (clock skew / backgrounding guard)", () => {
    expect(elapsedMs(timed({ startedAt: 10_000 }), 0)).toBe(0);
  });
});

describe("remainingSec", () => {
  it("counts down from the time limit", () => {
    expect(remainingSec(timed(), 1_000)).toBe(299);
  });

  it("is null when untimed", () => {
    expect(remainingSec(timed({ timeLimitSec: null }), 1_000)).toBeNull();
  });

  it("is exactly 0 at the limit, and stays at 0 after a large backgrounded jump past it", () => {
    expect(remainingSec(timed(), 300_000)).toBe(0);
    expect(remainingSec(timed(), 999_000)).toBe(0);
  });

  it("accounts for a currently-open paused span", () => {
    // Only 100s of wall-clock time have actually counted as elapsed.
    expect(remainingSec(timed({ pausedAt: 100_000 }), 150_000)).toBe(200);
  });

  it("matches a rehydrated Attempt reconstructed from stored numbers", () => {
    const stored: Attempt = JSON.parse(JSON.stringify(timed({ startedAt: 5_000, pausedTotalMs: 2_000 })));
    expect(remainingSec(stored, 10_000)).toBe(297);
  });
});

describe("timeUp", () => {
  it("is false while time remains", () => {
    expect(timeUp(timed(), 1_000)).toBe(false);
  });

  it("is true once remaining hits 0, and stays true after it", () => {
    expect(timeUp(timed(), 300_000)).toBe(true);
    expect(timeUp(timed(), 999_000)).toBe(true);
  });

  it("is always false when untimed, no matter how long it runs", () => {
    expect(timeUp(timed({ timeLimitSec: null }), 999_000)).toBe(false);
  });
});

describe("timeUsedSec", () => {
  it("is elapsed whole seconds when timed and under the limit", () => {
    expect(timeUsedSec(timed(), 250_500)).toBe(250);
  });

  it("is capped at the time limit when timed and over it", () => {
    expect(timeUsedSec(timed(), 999_000)).toBe(300);
  });

  it("is uncapped elapsed seconds when untimed", () => {
    expect(timeUsedSec(timed({ timeLimitSec: null }), 999_000)).toBe(999);
  });
});

describe("formatCountdown", () => {
  it.each([
    [0, "00:00"],
    [5, "00:05"],
    [65, "01:05"],
    [300, "05:00"],
    [3_661, "61:01"],
  ])("formats %i seconds as %s", (sec, expected) => {
    expect(formatCountdown(sec)).toBe(expected);
  });

  it("never renders negative", () => {
    expect(formatCountdown(-5)).toBe("00:00");
  });

  it("renders non-finite input as zero", () => {
    for (const sec of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) expect(formatCountdown(sec)).toBe("00:00");
  });
});
