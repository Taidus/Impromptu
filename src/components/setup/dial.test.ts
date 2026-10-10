import { describe, expect, it } from "vitest";
import { copy } from "@/components/copy";
import {
  LEVELS,
  levelAngle,
  levelDisplayName,
  levelFromAngle,
  levelFromKey,
  levelFromPointerRatio,
  levelIndex,
  levelValueText,
} from "./dial";

describe("levelFromKey", () => {
  it.each([
    ["experiment", "ArrowRight", "develop"],
    ["experiment", "ArrowUp", "develop"],
    ["develop", "ArrowLeft", "experiment"],
    ["develop", "ArrowDown", "experiment"],
  ] as const)("%s + %s -> %s", (current, key, expected) => {
    expect(levelFromKey(current, key)).toBe(expected);
  });

  it("clamps at the last stop instead of wrapping", () => {
    expect(levelFromKey("perform", "ArrowRight")).toBe("perform");
  });

  it("clamps at the first stop instead of wrapping", () => {
    expect(levelFromKey("explore", "ArrowLeft")).toBe("explore");
  });

  it.each(["explore", "experiment", "develop", "perform"] as const)(
    "Home jumps to the first stop from %s",
    (current) => {
      expect(levelFromKey(current, "Home")).toBe("explore");
    },
  );

  it.each(["explore", "experiment", "develop", "perform"] as const)(
    "End jumps to the last stop from %s",
    (current) => {
      expect(levelFromKey(current, "End")).toBe("perform");
    },
  );

  it("PageUp / PageDown step by one", () => {
    expect(levelFromKey("experiment", "PageUp")).toBe("develop");
    expect(levelFromKey("experiment", "PageDown")).toBe("explore");
  });

  it("an unhandled key is a no-op (null)", () => {
    expect(levelFromKey("explore", "a")).toBeNull();
    expect(levelFromKey("explore", "Tab")).toBeNull();
  });
});

describe("levelFromPointerRatio", () => {
  it("maps 0 and 1 to the first and last stops", () => {
    expect(levelFromPointerRatio(0)).toBe("explore");
    expect(levelFromPointerRatio(1)).toBe("perform");
  });

  it("rounds to the nearest stop in between", () => {
    expect(levelFromPointerRatio(0.5)).toBe("develop"); // 0.5 * 3 = 1.5 -> rounds to index 2
    expect(levelFromPointerRatio(1 / 3)).toBe("experiment");
  });

  it("clamps an out-of-range ratio", () => {
    expect(levelFromPointerRatio(-0.4)).toBe("explore");
    expect(levelFromPointerRatio(1.6)).toBe("perform");
  });
});

describe("levelDisplayName", () => {
  it("capitalizes each Level id", () => {
    expect(levelDisplayName("explore")).toBe("Explore");
    expect(levelDisplayName("perform")).toBe("Perform");
  });
});

describe("levelValueText", () => {
  it("joins the Level name and its one-liner", () => {
    expect(levelValueText("experiment", copy.level.experiment)).toBe(
      "Experiment. Try more than one way in.",
    );
  });
});

describe("levelIndex", () => {
  it("matches each Level's position in LEVELS", () => {
    LEVELS.forEach((level, index) => expect(levelIndex(level)).toBe(index));
  });
});

describe("levelFromAngle", () => {
  it("maps each stop's own angle back to that stop", () => {
    LEVELS.forEach((level) => expect(levelFromAngle(levelAngle(level))).toBe(level));
  });

  it("snaps to the nearest stop", () => {
    expect(levelFromAngle(-5)).toBe("experiment");
    expect(levelFromAngle(5)).toBe("develop");
    expect(levelFromAngle(-45)).toBe("explore");
  });

  it("clamps angles past the arc, including the lower half", () => {
    expect(levelFromAngle(-120)).toBe("explore");
    expect(levelFromAngle(150)).toBe("perform");
    expect(levelFromAngle(180)).toBe("perform");
    expect(levelFromAngle(-179)).toBe("explore");
  });

  it("normalizes angles outside -180..180", () => {
    expect(levelFromAngle(380)).toBe("develop");
    expect(levelFromAngle(-340)).toBe("develop");
  });
});
