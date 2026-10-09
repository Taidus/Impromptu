import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadLibrary, prefetchOnIdle } from "./index";

function validLibraryJson() {
  return {
    libraryVersion: "v1",
    skills: [{ id: "skl.observation", revealText: "Observation", info: "Notice things.", tags: [] }],
    mediums: [{ id: "med.drawing", revealText: "Drawing", info: "Draw it.", tags: [] }],
    templates: [
      {
        id: "tpl.observation.explore.near-object",
        skill: "skl.observation",
        level: "explore",
        mediums: ["med.drawing"],
        briefPattern: "Draw {topic}.",
        topicTags: ["object"],
        styleTags: [],
        constraintTags: [],
        incompatible: [],
        tags: [],
      },
    ],
    topics: [
      {
        id: "top.near-object",
        revealText: "An object near you",
        briefText: "an object near you",
        tags: ["object"],
        requires: [],
        excludes: [],
      },
    ],
    styles: [],
    constraints: [],
  };
}

describe("loadLibrary", () => {
  it("returns {ok:true, library} for a valid source", async () => {
    const result = await loadLibrary(async () => validLibraryJson());
    expect(result).toEqual({ ok: true, library: validLibraryJson() });
  });

  it("returns {ok:false, reason:'invalid'} for a shape that fails validation", async () => {
    const result = await loadLibrary(async () => ({ libraryVersion: "v1" })); // missing every array
    expect(result).toEqual({ ok: false, reason: "invalid" });
  });

  it("returns {ok:false, reason:'fetch_failed'} when the source rejects, never throwing", async () => {
    const result = await loadLibrary(async () => {
      throw new Error("network down");
    });
    expect(result).toEqual({ ok: false, reason: "fetch_failed" });
  });
});

describe("prefetchOnIdle", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("runs the callback (via the setTimeout fallback in this non-browser test env) and swallows its rejection", async () => {
    const run = vi.fn().mockRejectedValue(new Error("boom"));
    prefetchOnIdle(run);
    await vi.runAllTimersAsync();
    expect(run).toHaveBeenCalledTimes(1);
  });

  it("uses requestIdleCallback with a 2s timeout when available", () => {
    const ric = vi.fn((cb: () => void) => cb());
    vi.stubGlobal("requestIdleCallback", ric);
    const run = vi.fn().mockResolvedValue(undefined);
    prefetchOnIdle(run);
    expect(ric).toHaveBeenCalledWith(expect.any(Function), { timeout: 2000 });
    expect(run).toHaveBeenCalledTimes(1);
  });
});
