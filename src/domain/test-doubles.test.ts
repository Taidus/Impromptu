import { describe, expect, it } from "vitest";
import { fakeClock, seededRandom } from "./test-doubles";

const V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe("seededRandom", () => {
  it("is reproducible for the same seed and in [0, 1)", () => {
    const a = seededRandom(42);
    const b = seededRandom(42);
    const seq = Array.from({ length: 5 }, () => a.next());
    expect(seq).toEqual(Array.from({ length: 5 }, () => b.next()));
    for (const n of seq) expect(n).toBeGreaterThanOrEqual(0);
    for (const n of seq) expect(n).toBeLessThan(1);
    expect(seededRandom(43).next()).not.toBe(seq[0]);
  });

  it("produces v4-shaped, deterministic uuids", () => {
    const uuid = seededRandom(7).uuid();
    expect(uuid).toMatch(V4);
    expect(seededRandom(7).uuid()).toBe(uuid);
  });
});

describe("fakeClock", () => {
  it("starts at startMs and advances", () => {
    const clock = fakeClock(1000);
    expect(clock.now()).toBe(1000);
    clock.advance(250);
    expect(clock.now()).toBe(1250);
  });
});
