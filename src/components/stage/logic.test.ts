import { describe, expect, it } from "vitest";
import { baseChallenge } from "@/domain/session/session-fixture";
import type { Status } from "@/store";
import { canHandleEscape, isPlainActivationKey, isPlainEscape, isStageError, shouldRequestNewChallenge, stageMeta } from "./logic";

const STATUSES: Status[] = ["loading", "ready", "error"];

describe("shouldRequestNewChallenge", () => {
  it("is true only once the library is ready and nothing is held", () => {
    expect(shouldRequestNewChallenge("ready", "none")).toBe(true);
  });

  for (const libraryStatus of STATUSES) {
    for (const sessionState of ["none", "held", "attempt", "finished", "saved"] as const) {
      if (libraryStatus === "ready" && sessionState === "none") continue;
      it(`is false for libraryStatus=${libraryStatus}, sessionState=${sessionState}`, () => {
        expect(shouldRequestNewChallenge(libraryStatus, sessionState)).toBe(false);
      });
    }
  }
});

describe("isStageError", () => {
  it("is false when both are ready", () => {
    expect(isStageError("ready", "ready")).toBe(false);
  });
  it("is true when status failed", () => {
    expect(isStageError("error", "ready")).toBe(true);
  });
  it("is true when the library failed", () => {
    expect(isStageError("ready", "error")).toBe(true);
  });
  it("is false while still loading", () => {
    expect(isStageError("loading", "loading")).toBe(false);
  });
});

describe("stageMeta", () => {
  it("is null before a Challenge is held", () => {
    expect(stageMeta(null)).toBeNull();
  });

  it("joins the Level name and UNTIMED for a Challenge with no time limit", () => {
    expect(stageMeta(baseChallenge)).toBe("Explore · UNTIMED");
  });

  it("reads TIMED for a Challenge with a time limit", () => {
    expect(stageMeta({ ...baseChallenge, timeLimitSec: 300 })).toBe("Explore · TIMED");
  });

  it("reads every Level name correctly", () => {
    const names = { explore: "Explore", experiment: "Experiment", develop: "Develop", perform: "Perform" } as const;
    for (const [level, name] of Object.entries(names) as [keyof typeof names, string][]) {
      expect(stageMeta({ ...baseChallenge, level })).toBe(`${name} · UNTIMED`);
    }
  });
});

describe("canHandleEscape", () => {
  it("is false during an Attempt", () => {
    expect(canHandleEscape({ state: "attempt" })).toBe(false);
  });

  for (const state of ["none", "held", "finished", "saved"] as const) {
    it(`is true for state=${state}`, () => {
      expect(canHandleEscape({ state })).toBe(true);
    });
  }
});

describe("isPlainEscape", () => {
  const plain = {
    key: "Escape",
    repeat: false,
    defaultPrevented: false,
    isComposing: false,
    altKey: false,
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
  };

  it("is true for a bare first-press Escape", () => {
    expect(isPlainEscape(plain)).toBe(true);
  });

  for (const flag of ["repeat", "defaultPrevented", "isComposing", "altKey", "ctrlKey", "metaKey", "shiftKey"] as const) {
    it(`is false with ${flag}`, () => {
      expect(isPlainEscape({ ...plain, [flag]: true })).toBe(false);
    });
  }

  it("is false for other keys", () => {
    expect(isPlainEscape({ ...plain, key: "Enter" })).toBe(false);
  });
});

describe("isPlainActivationKey", () => {
  const plain = {
    key: "Enter",
    repeat: false,
    defaultPrevented: false,
    isComposing: false,
    altKey: false,
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
  };

  it("is true for a bare first-press Enter", () => {
    expect(isPlainActivationKey(plain)).toBe(true);
  });

  it("is true for a bare first-press Space", () => {
    expect(isPlainActivationKey({ ...plain, key: " " })).toBe(true);
  });

  for (const flag of ["repeat", "defaultPrevented", "isComposing", "altKey", "ctrlKey", "metaKey", "shiftKey"] as const) {
    it(`is false with ${flag}`, () => {
      expect(isPlainActivationKey({ ...plain, [flag]: true })).toBe(false);
    });
  }

  it("is false for other keys", () => {
    expect(isPlainActivationKey({ ...plain, key: "Escape" })).toBe(false);
  });
});
