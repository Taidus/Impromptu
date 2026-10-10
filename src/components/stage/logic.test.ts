import { describe, expect, it } from "vitest";
import { baseChallenge } from "@/domain/session/session-fixture";
import type { SessionState } from "@/domain/session/schema";
import type { Status } from "@/store";
import {
  canHandleEscape,
  isPlainActivationKey,
  isPlainEscape,
  isStageError,
  shouldFreezeVisit,
  shouldRequestNewChallenge,
  stageDecorMode,
  stageMeta,
} from "./logic";

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

describe("stageDecorMode", () => {
  const base = { sessionState: "held" as SessionState, revealComplete: false, shuffling: true, frozenThisVisit: false };

  it("is shuffle when held, incomplete, shuffling, and not yet frozen", () => {
    expect(stageDecorMode(base)).toBe("shuffle");
  });

  it("is idle between presses (not shuffling): chunk warm, loop stopped", () => {
    expect(stageDecorMode({ ...base, shuffling: false })).toBe("idle");
  });

  it("is frozen once the reveal is complete, even while shuffling", () => {
    expect(stageDecorMode({ ...base, revealComplete: true })).toBe("frozen");
  });

  it("is frozen once the visit has frozen, even while shuffling", () => {
    expect(stageDecorMode({ ...base, frozenThisVisit: true })).toBe("frozen");
  });

  for (const sessionState of ["none", "attempt", "finished", "saved"] as const) {
    it(`is frozen for sessionState=${sessionState}`, () => {
      expect(stageDecorMode({ ...base, sessionState })).toBe("frozen");
    });
  }
});

describe("shouldFreezeVisit", () => {
  it("is false while held with an incomplete reveal", () => {
    expect(shouldFreezeVisit("held", false)).toBe(false);
  });

  it("is true once held with a complete reveal", () => {
    expect(shouldFreezeVisit("held", true)).toBe(true);
  });

  it("is true outside held, even with an incomplete reveal", () => {
    expect(shouldFreezeVisit("attempt", false)).toBe(true);
  });

  it("is false for none (the pre-hydration snapshot is not 'has been held')", () => {
    expect(shouldFreezeVisit("none", false)).toBe(false);
  });

  it("never latches across a full load's none -> held(incomplete) walk", () => {
    let frozen = false;
    for (const [state, complete] of [["none", false], ["held", false]] as const) {
      frozen ||= shouldFreezeVisit(state, complete);
    }
    expect(frozen).toBe(false);
    expect(stageDecorMode({ sessionState: "held", revealComplete: false, shuffling: false, frozenThisVisit: frozen })).toBe(
      "idle",
    );
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
