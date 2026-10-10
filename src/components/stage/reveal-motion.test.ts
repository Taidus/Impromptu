import { describe, expect, it } from "vitest";
import type { Constraint, Medium, Skill, Style, Template, Topic } from "@/domain/library/schema";
import type { ComposeLibrary } from "@/domain/compose/compose";
import { baseChallenge, fullChallenge } from "@/domain/session/session-fixture";
import type { Setup } from "@/domain/session/schema";
import { flickPool, idleMotion, landDurationMs, landingDone, press, shouldShuffle, shuffleElapsed, startMotion } from "./reveal-motion";

// --- the idle -> shuffling -> landing -> idle state machine ---------------

describe("startMotion / press / shuffleElapsed / landingDone", () => {
  it("idle + a kind to reveal, with multiple candidates: starts shuffling, no dispatch yet", () => {
    const result = press(idleMotion, "topic", true);
    expect(result).toEqual({ state: { status: "shuffling", kind: "topic" }, completeKind: null });
  });

  it("idle + a single-candidate kind: skips straight to landing (no shuffle)", () => {
    const result = press(idleMotion, "medium", false);
    expect(result).toEqual({ state: { status: "landing", kind: "medium" }, completeKind: null });
  });

  it("idle + nothing left: a no-op", () => {
    const result = press(idleMotion, null, true);
    expect(result).toEqual({ state: idleMotion, completeKind: null });
  });

  it("a press mid-shuffle force-completes the current piece and starts nothing else", () => {
    const shuffling = startMotion("style", true);
    const result = press(shuffling, "style", true);
    expect(result).toEqual({ state: idleMotion, completeKind: "style" });
  });

  it("a press mid-landing force-completes the current piece too", () => {
    const landing = startMotion("constraint", false);
    const result = press(landing, "constraint", false);
    expect(result).toEqual({ state: idleMotion, completeKind: "constraint" });
  });

  it("the shuffle timer elapsing moves shuffling to landing for the same kind", () => {
    const shuffling = startMotion("skill", true);
    expect(shuffleElapsed(shuffling, "skill")).toEqual({ status: "landing", kind: "skill" });
  });

  it("a stale shuffle timer (state already moved on) is a no-op", () => {
    expect(shuffleElapsed(idleMotion, "skill")).toBe(idleMotion);
    const landing = startMotion("skill", false);
    expect(shuffleElapsed(landing, "skill")).toBe(landing);
  });

  it("the landing timer elapsing commits the piece and returns to idle", () => {
    const landing = startMotion("brief", false);
    expect(landingDone(landing, "brief")).toEqual({ state: idleMotion, completeKind: "brief" });
  });

  it("a stale landing timer (already force-completed by a press) is a no-op", () => {
    expect(landingDone(idleMotion, "brief")).toEqual({ state: idleMotion, completeKind: null });
  });

  it("no skipped step: force-completing one piece never starts the next without another press", () => {
    const afterFirstPress = press(idleMotion, "skill", true); // shuffling skill
    const afterSecondPress = press(afterFirstPress.state, "skill", true); // force-completes skill
    expect(afterSecondPress.completeKind).toBe("skill");
    expect(afterSecondPress.state).toEqual(idleMotion); // medium has NOT started
  });
});

describe("landDurationMs", () => {
  it("differs per material (UX-DR22)", () => {
    expect(landDurationMs("skill")).toBe(550);
    expect(landDurationMs("medium")).toBe(550);
    expect(landDurationMs("topic")).toBe(550);
    expect(landDurationMs("style")).toBe(420);
    expect(landDurationMs("constraint")).toBe(320);
    expect(landDurationMs("brief")).toBe(250);
  });
});

// --- flick candidate pools --------------------------------------------------

const skill = (id: string): Skill => ({ id, revealText: id, info: id, tags: [] });
const medium = (id: string, tags: string[] = []): Medium => ({ id, revealText: id, info: id, tags });
const fill = (id: string, tags: string[], over: Partial<Topic> = {}): Topic => ({
  id,
  revealText: id,
  briefText: id,
  tags,
  requires: [],
  excludes: [],
  ...over,
});
const topic = (id: string, tags: string[], over: Partial<Topic> = {}): Topic => fill(id, tags, over);
const style = (id: string, tags: string[], over: Partial<Style> = {}): Style => fill(id, tags, over);
const constraint = (id: string, tags: string[], over: Partial<Constraint> = {}): Constraint => fill(id, tags, over);

const tpl = (over: Partial<Template> = {}): Template => ({
  id: "tpl.observation.explore.near-object",
  skill: "skl.observation",
  level: "explore",
  mediums: ["med.drawing", "med.photography"],
  briefPattern: "{topic}",
  topicTags: ["place"],
  styleTags: ["calm"],
  constraintTags: ["time"],
  incompatible: [],
  tags: [],
  ...over,
});

const library = (over: Partial<ComposeLibrary> = {}): ComposeLibrary => ({
  libraryVersion: "test-1",
  skills: [skill("skl.observation"), skill("skl.photography")],
  mediums: [medium("med.drawing"), medium("med.photography"), medium("med.writing")],
  templates: [tpl()],
  topics: [topic("top.one", ["place"]), topic("top.two", ["place"])],
  styles: [style("sty.one", ["calm"]), style("sty.two", ["calm"])],
  constraints: [constraint("con.one", ["time"]), constraint("con.two", ["time"])],
  ...over,
});

const setup = (over: Partial<Setup> = {}): Setup => ({
  level: "explore",
  performTiming: "either",
  enabledMediums: ["med.drawing", "med.photography", "med.writing"],
  medium: "random",
  skillFocus: "random",
  quickReveal: false,
  sound: false,
  ambientMotion: true,
  ...over,
});

describe("flickPool", () => {
  it("medium: the full enabled set, intersected with the held Template's mediums where feasible", () => {
    const pool = flickPool("medium", baseChallenge, library(), setup());
    expect(pool.sort()).toEqual(["med.drawing", "med.photography"]);
  });

  it("medium: a single enabled Medium lands without a shuffle", () => {
    const pool = flickPool("medium", baseChallenge, library(), setup({ enabledMediums: ["med.drawing"] }));
    expect(pool).toEqual(["med.drawing"]);
    expect(shouldShuffle(pool)).toBe(false);
  });

  it("medium: a pinned 'This time' choice is a singleton", () => {
    const pool = flickPool("medium", baseChallenge, library(), setup({ medium: "med.writing" }));
    expect(pool).toEqual(["med.writing"]);
  });

  it("medium: enabled set incompatible with the Template falls back to the enabled set itself", () => {
    const lib = library({ templates: [tpl({ mediums: ["med.sculpture"] })] });
    const pool = flickPool("medium", baseChallenge, lib, setup());
    expect(pool.sort()).toEqual(["med.drawing", "med.photography", "med.writing"]);
  });

  it("skill: every Skill when Skill focus is random", () => {
    const pool = flickPool("skill", baseChallenge, library(), setup());
    expect(pool.sort()).toEqual(["skl.observation", "skl.photography"]);
  });

  it("skill: a pinned Skill focus is a singleton", () => {
    const pool = flickPool("skill", baseChallenge, library(), setup({ skillFocus: "skl.photography" }));
    expect(pool).toEqual(["skl.photography"]);
  });

  it("topic: fills tag-compatible with the held Template", () => {
    const lib = library({ topics: [topic("top.one", ["place"]), topic("top.two", ["other"])] });
    expect(flickPool("topic", baseChallenge, lib, setup())).toEqual(["top.one"]);
  });

  it("topic: no tag-compatible fill falls back to every non-retired fill of that kind", () => {
    const lib = library({ topics: [topic("top.one", ["other"]), topic("top.two", ["other"])] });
    expect(flickPool("topic", baseChallenge, lib, setup()).sort()).toEqual(["top.one", "top.two"]);
  });

  it("style: retired fills are excluded", () => {
    const lib = library({ styles: [style("sty.one", ["calm"]), style("sty.two", ["calm"], { retired: true })] });
    expect(flickPool("style", baseChallenge, lib, setup())).toEqual(["sty.one"]);
  });

  it("falls back to the Challenge's own value when a kind's pool would otherwise be empty", () => {
    const lib = library({ constraints: [] });
    expect(flickPool("constraint", fullChallenge, lib, setup())).toEqual(["One color only"]);
  });
});
