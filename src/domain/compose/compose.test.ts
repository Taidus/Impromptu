import { describe, expect, it } from "vitest";
import { isCompatible } from "@/domain/library/compat";
import type { Constraint, Medium, Skill, Style, Template, Topic } from "@/domain/library/schema";
import { fakeClock, seededRandom } from "@/domain/test-doubles";
import type { ComposeLibrary, ComposeRequest } from "./compose";
import { compose, recentKeyFor } from "./compose";

const skill = (id: string): Skill => ({ id, revealText: id, info: id, tags: [] });
const medium = (id: string, tags: string[] = []): Medium => ({ id, revealText: id, info: id, tags });

/** Topic/Style/Constraint share one shape; typed once here, no `as unknown as` needed. */
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

  it("Skill focus without a Lock: only matching-Skill Templates are candidates", () => {
    const alpha = tpl({ id: "tpl.alpha.explore.one", skill: "skl.alpha" });
    const beta = tpl({ id: "tpl.beta.explore.one", skill: "skl.beta" });
    const lib = library({ templates: [alpha, beta] });
    const result = compose(request({ skillFocus: "skl.beta" }), lib, [], clock, rand());
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.challenge.templateId).toBe(beta.id);
  });

  it("a specific request.medium without a Lock: only that Medium is produced", () => {
    const t = tpl({ mediums: ["med.a", "med.b"] });
    const lib = library({ templates: [t] });
    const result = compose(request({ medium: "med.b" }), lib, [], clock, rand());
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.challenge.inputs.medium.id).toBe("med.b");
  });

  it("mustDiffer.skill excludes Templates of that Skill; mustDiffer.medium excludes that Medium", () => {
    const alpha = tpl({ id: "tpl.alpha.explore.one", skill: "skl.alpha", mediums: ["med.a", "med.b"] });
    const beta = tpl({ id: "tpl.beta.explore.one", skill: "skl.beta", mediums: ["med.a", "med.b"] });
    const lib = library({ templates: [alpha, beta] });

    const skillResult = compose(request({ mustDiffer: { skill: "skl.alpha" } }), lib, [], clock, rand());
    expect(skillResult.ok).toBe(true);
    if (skillResult.ok) expect(skillResult.challenge.templateId).toBe(beta.id);

    const mediumResult = compose(request({ mustDiffer: { medium: "med.a" } }), lib, [], clock, rand());
    expect(mediumResult.ok).toBe(true);
    if (mediumResult.ok) expect(mediumResult.challenge.inputs.medium.id).toBe("med.b");
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

  it("retired Style and Constraint are never chosen; locking a retired Style fails", () => {
    const t = tpl({
      id: "tpl.alpha.explore.fills",
      briefPattern: "{topic} {style} {constraint}",
      styleTags: ["visual"],
      constraintTags: ["visual"],
    });
    const lib = library({
      templates: [t],
      styles: [style("sty.retired", ["visual"], { retired: true }), style("sty.live", ["visual"])],
      constraints: [constraint("con.retired", ["visual"], { retired: true }), constraint("con.live", ["visual"])],
    });

    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
      const result = compose(request(), lib, [], clock, seededRandom(seed));
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.challenge.inputs.style?.id).toBe("sty.live");
        expect(result.challenge.inputs.constraint?.id).toBe("con.live");
      }
    }

    const lockedRetired = compose(request({ locks: { style: "sty.retired" } }), lib, [], clock, rand());
    expect(lockedRetired.ok).toBe(false);
  });

  it("a style lock with a slotless Template also in the library always returns the locked Style", () => {
    const slotless = tpl({ id: "tpl.alpha.explore.slotless" });
    const withStyle = tpl({ id: "tpl.alpha.explore.styled", briefPattern: "{topic} {style}", styleTags: ["visual"] });
    const lib = library({ templates: [slotless, withStyle], styles: [style("sty.a", ["visual"])] });

    for (const seed of [1, 2, 3, 4, 5]) {
      const result = compose(request({ locks: { style: "sty.a" } }), lib, [], clock, seededRandom(seed));
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.challenge.inputs.style?.id).toBe("sty.a");
    }
  });

  it("requires/excludes on a fill: one Style is accepted, the other rejected", () => {
    const t = tpl({
      id: "tpl.alpha.explore.reqex",
      briefPattern: "{topic} {style}",
      styleTags: ["visual"],
      tags: ["lit"],
    });
    const lib = library({
      templates: [t],
      styles: [style("sty.ok", ["visual"], { requires: ["lit"] }), style("sty.bad", ["visual"], { requires: ["unlit"] })],
    });
    for (const seed of [1, 2, 3, 4, 5]) {
      const result = compose(request(), lib, [], clock, seededRandom(seed));
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.challenge.inputs.style?.id).toBe("sty.ok");
    }
  });

  it("recent window: avoiding the one combo the RNG would otherwise pick lands on the other", () => {
    const t = tpl();
    const lib = library({ templates: [t] });
    for (const seed of [1, 2, 3, 4, 5]) {
      const freeResult = compose(request(), lib, [], clock, seededRandom(seed));
      expect(freeResult.ok).toBe(true);
      if (!freeResult.ok) continue;
      const avoidedTopic = freeResult.challenge.inputs.topic!.id;
      const recent = [recentKeyFor(t.id, avoidedTopic)];
      const avoidedResult = compose(request(), lib, recent, clock, seededRandom(seed));
      expect(avoidedResult.ok).toBe(true);
      if (avoidedResult.ok) expect(avoidedResult.challenge.inputs.topic?.id).not.toBe(avoidedTopic);
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

  it("the same seed produces an identical result", () => {
    const lib = library();
    const a = compose(request(), lib, [], clock, seededRandom(42));
    const b = compose(request(), lib, [], clock, seededRandom(42));
    expect(a).toEqual(b);
  });

  it("weighting: a 1-combo Template is chosen about as often as a 50-combo Template", () => {
    const small = tpl({ id: "tpl.alpha.explore.small", topicTags: ["place"] });
    const big = tpl({
      id: "tpl.alpha.explore.big",
      briefPattern: "{topic} {style}",
      topicTags: ["mood"],
      styleTags: ["mood"],
    });
    const bigTopics = Array.from({ length: 5 }, (_, i) => topic(`top.big${i}`, ["mood"]));
    const bigStyles = Array.from({ length: 10 }, (_, i) => style(`sty.big${i}`, ["mood"]));
    const lib = library({
      templates: [small, big],
      topics: [topic("top.one", ["place"]), ...bigTopics],
      styles: bigStyles,
    });

    const seeds = 400;
    let smallCount = 0;
    for (let seed = 1; seed <= seeds; seed++) {
      const result = compose(request(), lib, [], clock, seededRandom(seed));
      expect(result.ok).toBe(true);
      if (result.ok && result.challenge.templateId === small.id) smallCount++;
    }
    const ratio = smallCount / seeds;
    expect(ratio).toBeGreaterThan(0.35);
    expect(ratio).toBeLessThan(0.65);
  });

  it("Locks: every locked Input in the result equals the lock, overriding enabled/focus filters", () => {
    const alpha = tpl({ id: "tpl.alpha.explore.one", skill: "skl.alpha", mediums: ["med.a", "med.b"] });
    const beta = tpl({ id: "tpl.beta.explore.one", skill: "skl.beta", mediums: ["med.a", "med.b"] });
    const lib = library({
      templates: [alpha, beta],
      styles: [style("sty.a", ["visual"]), style("sty.b", ["visual"])],
      constraints: [constraint("con.a", ["visual"]), constraint("con.b", ["visual"])],
    });

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

  it("FR-2: a Medium Lock must also be enabled, else no_compatible with blockingLock 'medium'", () => {
    const alpha = tpl({ id: "tpl.alpha.explore.one", skill: "skl.alpha", mediums: ["med.a", "med.b"] });
    const beta = tpl({ id: "tpl.beta.explore.one", skill: "skl.beta", mediums: ["med.a", "med.b"] });
    const lib = library({ templates: [alpha, beta] });

    const mediumLocked = compose(request({ enabledMediums: ["med.a"], locks: { medium: "med.b" } }), lib, [], clock, rand());
    expect(mediumLocked).toEqual({ ok: false, reason: "no_compatible", blockingLock: "medium" });
  });

  it("FR-2: a Skill Lock outside a non-random focus is no_compatible with blockingLock 'skill'", () => {
    const alpha = tpl({ id: "tpl.alpha.explore.one", skill: "skl.alpha", mediums: ["med.a", "med.b"] });
    const beta = tpl({ id: "tpl.beta.explore.one", skill: "skl.beta", mediums: ["med.a", "med.b"] });
    const lib = library({ templates: [alpha, beta] });

    const skillLocked = compose(request({ skillFocus: "skl.alpha", locks: { skill: "skl.beta" } }), lib, [], clock, rand());
    expect(skillLocked).toEqual({ ok: false, reason: "no_compatible", blockingLock: "skill" });
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

  it("two Locks that only block together (neither release alone unblocks it) return blockingLock: null", () => {
    const t = tpl({ skill: "skl.alpha", mediums: ["med.a"] });
    const lib = library({ templates: [t] });
    // Releasing `skill` alone still leaves the (nonexistent) medium blocking; releasing
    // `medium` alone still leaves the mismatched skill blocking. Neither release helps alone.
    const result = compose(
      request({ locks: { skill: "skl.beta", medium: "med.ghost" } }),
      lib,
      [],
      clock,
      rand(),
    );
    expect(result).toEqual({ ok: false, reason: "no_compatible", blockingLock: null });
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

  it("a Lock referencing a removed/retired id can never be satisfied: blockingLock names 'topic'", () => {
    const t = tpl();
    const lib = library({
      templates: [t],
      topics: [topic("top.one", ["place"], { retired: true }), topic("top.two", ["place"])],
    });
    const result = compose(request({ locks: { topic: "top.one" } }), lib, [], clock, rand());
    expect(result).toEqual({ ok: false, reason: "no_compatible", blockingLock: "topic" });
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

  it("totality: a non-finite Clock returns no_compatible with blockingLock null instead of throwing", () => {
    const lib = library();
    const brokenClock = { now: () => NaN };
    expect(() => compose(request(), lib, [], brokenClock, rand())).not.toThrow();
    const result = compose(request(), lib, [], brokenClock, rand());
    expect(result).toEqual({ ok: false, reason: "no_compatible", blockingLock: null });
  });

  it("totality: Random.next() at or past 1 never indexes past the pool", () => {
    const lib = library();
    const maxRandom = { next: () => 1, uuid: () => "11111111-1111-4111-8111-111111111111" };
    expect(() => compose(request(), lib, [], clock, maxRandom)).not.toThrow();
    const result = compose(request(), lib, [], clock, maxRandom);
    expect(result.ok).toBe(true);
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
