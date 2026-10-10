import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { config } from "@/config/app";
import type { Constraint, Medium, Skill, Style, Template, Topic } from "@/domain/library/schema";
import type { ComposeLibrary } from "@/domain/compose/compose";
import { baseChallenge, fullChallenge } from "@/domain/session/session-fixture";
import type { Challenge, Setup } from "@/domain/session/schema";
import { ScrapGroup } from "./pieces";
import { emptySlotLabel, nextKind } from "./reveal-logic";
import {
  createMotionDriver,
  flickPool,
  idleMotion,
  landDurationMs,
  landingDone,
  press,
  shouldShuffle,
  shuffleElapsed,
  startMotion,
  type MotionSnapshot,
  type MotionState,
} from "./reveal-motion";

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

// A Challenge whose every held Input exists in the synthetic library.
const held = {
  ...fullChallenge,
  inputs: {
    skill: { id: "skl.observation", revealText: "skl.observation" },
    medium: { id: "med.drawing", revealText: "med.drawing" },
    topic: { id: "top.one", revealText: "top.one" },
    style: { id: "sty.one", revealText: "sty.one" },
    constraint: { id: "con.one", revealText: "con.one" },
  },
} as Challenge;

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

  it("skill: only Skills with a non-retired Template at the held Level for an enabled Medium", () => {
    const lib = library({
      skills: [skill("skl.observation"), skill("skl.photography"), skill("skl.revision"), skill("skl.connection"), skill("skl.expression")],
      templates: [
        tpl(),
        tpl({ id: "tpl.photography.explore.a", skill: "skl.photography" }),
        tpl({ id: "tpl.revision.develop.a", skill: "skl.revision", level: "develop" }), // wrong Level
        tpl({ id: "tpl.connection.explore.a", skill: "skl.connection", mediums: ["med.writing"] }), // Medium not enabled
        tpl({ id: "tpl.expression.explore.a", skill: "skl.expression", retired: true }), // retired
      ],
    });
    const pool = flickPool("skill", held, lib, setup({ enabledMediums: ["med.drawing"] }));
    expect(pool.sort()).toEqual(["skl.observation", "skl.photography"]);
  });

  it("skill: a single reachable Skill lands without a shuffle", () => {
    const lib = library({ templates: [tpl()] });
    const pool = flickPool("skill", held, lib, setup());
    expect(pool).toEqual(["skl.observation"]);
    expect(shouldShuffle(pool)).toBe(false);
  });

  it("skill: a pinned Skill focus is a singleton", () => {
    const pool = flickPool("skill", held, library(), setup({ skillFocus: "skl.photography" }));
    expect(pool).toEqual(["skl.photography"]);
  });

  it("topic: fills isCompatible with the held Template, Medium, and other held fills", () => {
    const lib = library({
      topics: [
        topic("top.one", ["place"]),
        topic("top.two", ["place"]),
        topic("top.other-tag", ["other"]),
        topic("top.needs", ["place"], { requires: ["loud"] }), // nothing held carries "loud"
        topic("top.clashes", ["place"], { excludes: ["time"] }), // the held constraint is tagged "time"
      ],
    });
    expect(flickPool("topic", held, lib, setup()).sort()).toEqual(["top.one", "top.two"]);
  });

  it("style: retired fills are excluded", () => {
    const lib = library({ styles: [style("sty.one", ["calm"]), style("sty.two", ["calm"], { retired: true })] });
    expect(flickPool("style", held, lib, setup())).toEqual(["sty.one"]);
  });

  it("falls back to the Challenge's own value when nothing compatible remains", () => {
    const lib = library({ constraints: [constraint("con.x", ["other"])] });
    expect(flickPool("constraint", held, lib, setup())).toEqual(["con.one"]);
  });

  it("never yields an empty-string candidate", () => {
    const lib = library({ constraints: [] });
    expect(flickPool("constraint", baseChallenge, lib, setup())).toEqual([]);
  });
});

// --- the driver: real timers, the one commit ---------------------------------

describe("createMotionDriver", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  // A two-Skill library, so Skill shuffles; everything else is single-value.
  const lib = library({ templates: [tpl(), tpl({ id: "tpl.photography.explore.a", skill: "skl.photography" })] });

  function harness(over: Partial<MotionSnapshot> = {}) {
    const world: MotionSnapshot = { challenge: held, revealed: [], library: lib, setup: setup(), reduced: false, ...over };
    const states: MotionState[] = [];
    const commit = vi.fn(() => {
      // Mirrors the reducer: `reveal_next` lands the next kind.
      const next = world.challenge && nextKind(world.challenge, world.revealed);
      if (next) world.revealed = [...world.revealed, next];
    });
    const driver = createMotionDriver({ read: () => world, commit, onState: (s) => states.push(s) });
    const last = () => states.at(-1) ?? idleMotion;
    return { world, driver, commit, last };
  }

  it("shuffles, lands, then commits once when the landing elapses", () => {
    const h = harness();
    h.driver.press();
    expect(h.last()).toEqual({ status: "shuffling", kind: "skill" });
    vi.advanceTimersByTime(config.reveal.motion.shuffleMs);
    expect(h.last()).toEqual({ status: "landing", kind: "skill" });
    expect(h.commit).not.toHaveBeenCalled();
    vi.advanceTimersByTime(config.reveal.motion.landMs.skill);
    expect(h.last()).toEqual(idleMotion);
    expect(h.commit).toHaveBeenCalledTimes(1);
  });

  it("a press during the shuffle completes that piece exactly once and starts nothing", () => {
    const h = harness();
    h.driver.press();
    h.driver.press();
    expect(h.commit).toHaveBeenCalledTimes(1);
    expect(h.world.revealed).toEqual(["skill"]);
    vi.advanceTimersByTime(10_000);
    expect(h.commit).toHaveBeenCalledTimes(1);
    expect(h.last()).toEqual(idleMotion);
  });

  it("an external `revealed` change mid-motion cancels it and never commits a different piece", () => {
    const h = harness();
    h.driver.press(); // shuffling skill
    h.world.revealed = ["skill"]; // another tab landed it
    h.driver.reconcile();
    expect(h.last()).toEqual(idleMotion);
    vi.advanceTimersByTime(10_000);
    expect(h.commit).not.toHaveBeenCalled();
  });

  it("a stale timer that fires before reconcile still won't commit a piece that's no longer next", () => {
    const h = harness();
    h.driver.press();
    h.world.revealed = ["skill"];
    vi.advanceTimersByTime(10_000); // no reconcile in between
    expect(h.commit).not.toHaveBeenCalled();
  });

  it("a new Challenge resets motion to idle with no stale timer", () => {
    const h = harness();
    h.driver.press();
    h.world.challenge = { ...held, id: "223e4567-e89b-42d3-a456-426614174000" };
    h.driver.reconcile();
    expect(h.last()).toEqual(idleMotion);
    vi.advanceTimersByTime(10_000);
    expect(h.commit).not.toHaveBeenCalled();
  });

  it("reduced motion skips the shuffle and commits after the fade budget", () => {
    const h = harness({ reduced: true });
    h.driver.press();
    expect(h.last()).toEqual({ status: "landing", kind: "skill" });
    vi.advanceTimersByTime(config.reveal.motion.reducedLandMs);
    expect(h.commit).toHaveBeenCalledTimes(1);
  });

  it("unmounting mid-landing commits the shown piece; mid-shuffle it doesn't", () => {
    const landing = harness({ revealed: ["skill"], setup: setup({ enabledMediums: ["med.drawing"] }) }); // medium: single value, lands straight away
    landing.driver.press();
    expect(landing.last()).toEqual({ status: "landing", kind: "medium" });
    landing.driver.dispose();
    expect(landing.commit).toHaveBeenCalledTimes(1);

    const shuffling = harness();
    shuffling.driver.press();
    shuffling.driver.dispose();
    vi.advanceTimersByTime(10_000);
    expect(shuffling.commit).not.toHaveBeenCalled();
  });
});

// --- ScrapGroup's shuffling render ------------------------------------------

describe("ScrapGroup (shuffling)", () => {
  const piece = (over: Partial<Parameters<typeof ScrapGroup>[0]["topic"]> = {}) => ({
    present: true,
    revealed: false,
    landing: false,
    shufflingText: null,
    value: "real",
    ...over,
  });
  const render = (props: Parameters<typeof ScrapGroup>[0]) => renderToStaticMarkup(createElement(ScrapGroup, props));

  it("hides the flick from assistive tech, keeps the empty label, and shimmers the foil only while shuffling", () => {
    const html = render({ topic: piece(), style: piece({ shufflingText: "Flick" }), constraint: piece() });
    expect(html).toMatch(/<div aria-hidden="true">(?:(?!<\/div><\/div><\/div>).)*Flick/);
    expect(html).toContain(`<span class="sr-only">${emptySlotLabel("style")}</span>`);
    expect(html).toContain("animate-foil-shimmer");
    expect(html).toContain(`--motion-ms:${config.reveal.motion.shuffleMs}ms`);

    const landed = render({ topic: piece(), style: piece({ revealed: true }), constraint: piece() });
    expect(landed).not.toContain("animate-foil-shimmer");
  });

  it("landing pieces keep their tilt and take their duration from config", () => {
    const html = render({ topic: piece(), style: piece({ landing: true }), constraint: piece({ landing: true }) });
    expect(html).toContain(`--motion-ms:${config.reveal.motion.landMs.style}ms;transform:rotate(4deg)`);
    expect(html).toContain(`--motion-ms:${config.reveal.motion.landMs.constraint}ms;transform:rotate(-7deg)`);
  });
});
