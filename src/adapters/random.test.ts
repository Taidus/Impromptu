import { describe, expect, it } from "vitest";
import { cryptoRandom } from "./random";

const V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe("cryptoRandom", () => {
  it("next() is in [0, 1)", () => {
    for (let i = 0; i < 100; i++) {
      const n = cryptoRandom.next();
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThan(1);
    }
  });

  it("uuid() is v4-shaped and not repeated", () => {
    const a = cryptoRandom.uuid();
    expect(a).toMatch(V4);
    expect(cryptoRandom.uuid()).not.toBe(a);
  });
});
