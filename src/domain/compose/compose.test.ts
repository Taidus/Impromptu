import { describe, expect, it } from "vitest";
import { isCompatible } from "@/domain/library/compat";
import type { Constraint, Medium, Skill, Style, Template, Topic } from "@/domain/library/schema";
import { fakeClock, seededRandom } from "@/domain/test-doubles";
import type { ComposeLibrary, ComposeRequest } from "./compose";
import { compose, recentKeyFor } from "./compose";

const skill = (id: string): Skill => ({ id, revealText: id, info: id, tags: [] });
const medium = (id: string, tags: string[] = []): Medium => ({ id, revealText: id, info: id, tags });
const fill = <T extends { id: string }>(id: string, tags: string[], over: Partial<T> = {}) =>
  ({ id, revealText: id, briefText: id, tags, requires: [], excludes: [], ...over }) as unknown as T;
const topic = (id: string, tags: string[], over: Partial<Topic> = {}) => fill<Topic>(id, tags, over);
const style = (id: string, tags: string[], over: Partial<Style> = {}) => fill<Style>(id, tags, over);
const constraint = (id: string, tags: string[], over: Partial<Constraint> = {}) => fill<Constraint>(id, tags, over);

const tpl = (over: Partial<Template> = {}): Template => ({
  id: "tpl.alpha.explore.one",
  skill: "skl.alpha",
  level: "explore",
  mediums: ["med.a"],
  briefPattern: "{topic}",
  topicTags: ["place"],
  styleTags: [],
  constraintTags: [],
  incompatible: [],
  tags: [],
  ...over,
});

const library = (over: Partial<ComposeLibrary> = {}): ComposeLibrary => ({
  libraryVersion: "test-1",
  skills: [skill("skl.alpha"), skill("skl.beta")],
  mediums: [medium("med.a", ["visual"]), medium("med.b")],
  templates: [tpl()],
  topics: [topic("top.one", ["place"]), topic("top.two", ["place"])],
  styles: [],
  constraints: [],
  ...over,
});

const request = (over: Partial<ComposeRequest> = {}): ComposeRequest => ({
  level: "explore",
  performTiming: "either",
  enabledMediums: ["med.a", "med.b"],
  medium: "random",
  skillFocus: "random",
  locks: {},
  mustDiffer: {},
  origin: { kind: "new", fromRepId: null },
  ...over,
});

const clock = fakeClock(1_700_000_000_000);
const rand = () => seededRandom(1);

describe("compose", () => {
  it("filters by Level, Skill focus, and enabled Mediums", () => {
    const explore = tpl({ id: "tpl.alpha.explore.one" });
    const experiment = tpl({ id: "tpl.alpha.experiment.two", level: "experiment" });
    const lib = library({ templates: [explore, experiment] });
    const result = compose(request(), lib, [], clock, rand());
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.challenge.templateId).toBe(explore.id);
  });

  it("Perform timing: 'timed' keeps only Templates with a Time Limit, 'untimed' only those without", () => {
    const timed = tpl({ id: "tpl.alpha.perform.timed", level: "perform", timeLimitSec: 300 });
    const untimed = tpl({ id: "tpl.alpha.perform.untimed", level: "perform" });
    const lib = library({ templates: [timed, untimed] });

    const timedResult = compose(request({ level: "perform", performTiming: "timed" }), lib, [], clock, rand());
    expect(timedResult.ok).toBe(true);
    if (timedResult.ok) {
      expect(timedResult.challenge.templateId).toBe(timed.id);
      expect(timedResult.challenge.timeLimitSec).toBe(300);
    }

    const untimedResult = compose(request({ level: "perform", performTiming: "untimed" }), lib, [], clock, rand());
    expect(untimedResult.ok).toBe(true);
    if (untimedResult.ok) {
      expect(untimedResult.challenge.templateId).toBe(untimed.id);
      expect(untimedResult.challenge.timeLimitSec).toBeNull();
    }
  });

  it("the generator never selects a Medium that is not enabled", () => {
    const t = tpl({ mediums: ["med.a", "med.b"] });
    const lib = library({ templates: [t] });
    const result = compose(request({ enabledMediums: ["med.b"] }), lib, [], clock, rand());
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.challenge.inputs.medium.id).toBe("med.b");
  });

  it("skips retired Templates, Topics, Styles, and Constraints", () => {
    const active = tpl({ id: "tpl.alpha.explore.active" });
    const retiredTpl = tpl({ id: "tpl.alpha.explore.retired", retired: true });
    const lib = library({
      templates: [retiredTpl, active],
      topics: [topic("top.retired", ["place"], { retired: true }), topic("top.live", ["place"])],
    });
    const result = compose(request(), lib, [], clock, rand());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.challenge.templateId).toBe(active.id);
      expect(result.challenge.inputs.topic?.id).toBe("top.live");
    }
  });

  it("excludes a recent key whenever an alternative exists", () => {
    const t = tpl();
    const lib = library({ templates: [t] });
    const recent = [recentKeyFor(t.id, "top.one")];
    for (const seed of [1, 2, 3, 4, 5]) {
      const result = compose(request(), lib, recent, clock, seededRandom(seed));
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.challenge.inputs.topic?.id).toBe("top.two");
    }
  });

  it("allows a repeat when every alternative is in the recent ring", () => {
    const t = tpl();
    const lib = library({ templates: [t] });
    const recent = [recentKeyFor(t.id, "top.one"), recentKeyFor(t.id, "top.two")];
    const result = compose(request(), lib, recent, clock, rand());
    expect(result.ok).toBe(true);
    if (result.ok) expect(["top.one", "top.two"]).toContain(result.challenge.inputs.topic?.id);
  });

  it("Locks: every locked Input in the result equals the lock, overriding enabled/focus filters", () => {
    const alpha = tpl({ id: "tpl.alpha.explore.one", skill: "skl.alpha", mediums: ["med.a", "med.b"] });
    const beta = tpl({ id: "tpl.beta.explore.one", skill: "skl.beta", mediums: ["med.a", "med.b"] });
    const lib = library({
      templates: [alpha, beta],
      styles: [style("sty.a", ["visual"]), style("sty.b", ["visual"])],
      constraints: [constraint("con.a", ["visual"]), constraint("con.b", ["visual"])],
    });

    const mediumLocked = compose(
      request({ enabledMediums: ["med.a"], locks: { medium: "med.b" } }),
      lib,
      [],
      clock,
      rand(),
    );
    expect(mediumLocked.ok).toBe(true);
    if (mediumLocked.ok) expect(mediumLocked.challenge.inputs.medium.id).toBe("med.b");

    const skillLocked = compose(request({ skillFocus: "skl.alpha", locks: { skill: "skl.beta" } }), lib, [], clock, rand());
    expect(skillLocked.ok).toBe(true);
    if (skillLocked.ok) expect(skillLocked.challenge.templateId).toBe(beta.id);

    const topicLocked = compose(request({ locks: { topic: "top.two" } }), lib, [], clock, rand());
    expect(topicLocked.ok).toBe(true);
    if (topicLocked.ok) expect(topicLocked.challenge.inputs.topic?.id).toBe("top.two");

    const styleTpl = tpl({ id: "tpl.alpha.explore.style", briefPattern: "{topic} {style}", styleTags: ["visual"] });
    const styleLocked = compose(request({ locks: { style: "sty.a" } }), { ...lib, templates: [styleTpl] }, [], clock, rand());
    expect(styleLocked.ok).toBe(true);
    if (styleLocked.ok) expect(styleLocked.challenge.inputs.style?.id).toBe("sty.a");

    const constraintTpl = tpl({ id: "tpl.alpha.explore.constraint", briefPattern: "{topic} {constraint}", constraintTags: ["visual"] });
    const constraintLocked = compose(
      request({ locks: { constraint: "con.a" } }),
      { ...lib, templates: [constraintTpl] },
      [],
      clock,
      rand(),
    );
    expect(constraintLocked.ok).toBe(true);
    if (constraintLocked.ok) expect(constraintLocked.challenge.inputs.constraint?.id).toBe("con.a");
  });

  it("mustDiffer: the result never has that kind's current value", () => {
    const t = tpl();
    const lib = library({ templates: [t] });
    const result = compose(request({ mustDiffer: { topic: "top.one" } }), lib, [], clock, rand());
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.challenge.inputs.topic?.id).toBe("top.two");
  });

  it("no compatible Challenge with Locks: blockingLock names the Lock whose release alone unblocks it", () => {
    const t = tpl({ skill: "skl.alpha", mediums: ["med.a"] });
    const lib = library({ templates: [t] });
    // Releasing `skill` alone still leaves the bogus medium lock blocking; releasing
    // `medium` alone (keeping the valid skill lock) unblocks it — LOCK_ORDER tries
    // skill first, so this also proves the search doesn't stop on the first lock tried.
    const result = compose(
      request({ locks: { skill: "skl.alpha", medium: "med.ghost" } }),
      lib,
      [],
      clock,
      rand(),
    );
    expect(result).toEqual({ ok: false, reason: "no_compatible", blockingLock: "medium" });
  });

  it("no compatible Challenge with no Locks: blockingLock is null (no Lock to name)", () => {
    const lib = library({ templates: [tpl({ level: "explore" })] });
    const result = compose(request({ level: "develop" }), lib, [], clock, rand());
    expect(result).toEqual({ ok: false, reason: "no_compatible", blockingLock: null });
  });

  it("a mustDiffer-only block is not misreported as a Lock: blockingLock is null", () => {
    const t = tpl();
    const lib = library({ templates: [t], topics: [topic("top.one", ["place"])] });
    const result = compose(request({ mustDiffer: { topic: "top.one" } }), lib, [], clock, rand());
    expect(result).toEqual({ ok: false, reason: "no_compatible", blockingLock: null });
  });

  it("a Lock referencing a removed/retired id can never be satisfied", () => {
    const t = tpl();
    const lib = library({ templates: [t], topics: [topic("top.one", ["place"], { retired: true })] });
    const result = compose(request({ locks: { topic: "top.one" } }), lib, [], clock, rand());
    expect(result.ok).toBe(false);
  });

  it("returns a full AD-5 snapshot and never a partial Challenge", () => {
    const origin: ComposeRequest["origin"] = { kind: "reroll", fromRepId: null };
    const lib = library();
    const result = compose(request({ origin }), lib, [], clock, rand());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const c = result.challenge;
    expect(typeof c.id).toBe("string");
    expect(c.createdAt).toBe(new Date(clock.now()).toISOString());
    expect(c.libraryVersion).toBe("test-1");
    expect(c.templateId).toBe("tpl.alpha.explore.one");
    expect(c.level).toBe("explore");
    expect(c.timeLimitSec).toBeNull();
    expect(c.brief.length).toBeGreaterThan(0);
    expect(c.guidance).toBeNull();
    expect(c.inputs.skill.id).toBe("skl.alpha");
    expect(c.inputs.medium).toBeDefined();
    expect(c.inputs.style).toBeUndefined();
    expect(c.inputs.constraint).toBeUndefined();
    expect(c.origin).toEqual(origin);
  });

  it("every ok:true result satisfies isCompatible() for its own Inputs", () => {
    const lib = library({
      styles: [style("sty.a", ["place"])],
      templates: [tpl({ briefPattern: "{topic} {style}", styleTags: ["place"] })],
    });
    const result = compose(request(), lib, [], clock, rand());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const { inputs, templateId } = result.challenge;
    const template = lib.templates.find((t) => t.id === templateId)!;
    const med = lib.mediums.find((m) => m.id === inputs.medium.id)!;
    const top = lib.topics.find((t) => t.id === inputs.topic?.id) ?? null;
    const sty = lib.styles.find((s) => s.id === inputs.style?.id) ?? null;
    const con = lib.constraints.find((c) => c.id === inputs.constraint?.id) ?? null;
    expect(isCompatible(template, med, top, sty, con)).toBe(true);
  });

  it("never throws and never mutates its inputs", () => {
    function deepFreeze<T>(value: T): T {
      if (value && typeof value === "object" && !Object.isFrozen(value)) {
        Object.values(value).forEach(deepFreeze);
        Object.freeze(value);
      }
      return value;
    }
    const req = deepFreeze(structuredClone(request({ locks: { topic: "top.one" } })));
    const lib = deepFreeze(structuredClone(library()));
    const recent = deepFreeze(structuredClone([recentKeyFor("tpl.alpha.explore.one", "top.one")]));
    expect(() => compose(req, lib, recent, clock, rand())).not.toThrow();
    expect(req).toEqual(request({ locks: { topic: "top.one" } }));
    expect(lib).toEqual(library());
  });
});
