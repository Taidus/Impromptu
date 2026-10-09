import { describe, expect, it } from "vitest";
import { gateConfig } from "./gate-config";
import { runGate, type GateInput } from "./gate";
import type { Sourced } from "./load";
import type { Anchor, BatchManifest, Constraint, Medium, Skill, Style, Tag, Template, Topic } from "../../src/domain/library/schema";

const tag = (id: string): Tag => ({ id, description: id });
const skill = (id: string, tags: string[] = []): Skill => ({ id, revealText: id, info: id, tags });
const medium = (id: string, tags: string[] = []): Medium => ({ id, revealText: id, info: id, tags });

// Topic, Style and Constraint share one shape (compat.test.ts uses the same trick).
const fillEntry = (id: string, tags: string[], over: Partial<Topic> = {}): Topic & Style & Constraint => ({
  id,
  revealText: id,
  briefText: id,
  tags,
  requires: [],
  excludes: [],
  ...over,
});

const template = (over: Partial<Template> = {}): Template => ({
  id: "tpl.observation.explore.x",
  skill: "skl.observation",
  level: "explore",
  mediums: ["med.alpha"],
  briefPattern: "Do {topic}. {style} {constraint}.",
  topicTags: ["t"],
  styleTags: ["s"],
  constraintTags: ["c"],
  incompatible: [],
  tags: [],
  ...over,
});

const sourced = <T>(value: T, source = "anchors"): Sourced<T> => ({ value, source });

const topic = fillEntry("top.a", ["t"], { briefText: "a nearby chair" });
const style = fillEntry("sty.a", ["s"], { briefText: "a warm tone" });
const constraint = fillEntry("con.a", ["c"], { briefText: "that stays indoors" });

function baseLib(over: Partial<GateInput> = {}): GateInput {
  return {
    tags: [tag("t"), tag("s"), tag("c")],
    skills: [skill("skl.observation")],
    mediums: [medium("med.alpha")],
    templates: [sourced(template())],
    topics: [sourced(topic)],
    styles: [sourced(style)],
    constraints: [sourced(constraint)],
    anchors: [],
    manifests: [],
    issues: [],
    ...over,
  };
}

const rulesOf = (report: ReturnType<typeof runGate>) => report.failures.map((f) => f.rule);

describe("runGate — integrity", () => {
  it("passes a well-formed library with zero failures", () => {
    const report = runGate(baseLib(), gateConfig);
    expect(report.ok).toBe(true);
    expect(report.failures).toEqual([]);
    expect(report.counts).toMatchObject({ templates: 1, topics: 1, styles: 1, constraints: 1, retired: 0 });
  });

  it("surfaces a loader parse issue as a failure", () => {
    const report = runGate(baseLib({ issues: [{ source: "x.json", message: "bad" }] }), gateConfig);
    expect(report.ok).toBe(false);
    expect(rulesOf(report)).toContain("integrity.parse");
  });

  it("flags a duplicate id across two sources", () => {
    const dup = sourced(fillEntry("top.a", ["t"]), "batch-2");
    const report = runGate(baseLib({ topics: [sourced(topic), dup] }), gateConfig);
    expect(rulesOf(report)).toContain("integrity.duplicate-id");
  });

  it("flags an unknown tag", () => {
    const bad = sourced(fillEntry("top.b", ["bogus"]), "anchors");
    const report = runGate(baseLib({ topics: [sourced(topic), bad] }), gateConfig);
    expect(rulesOf(report)).toContain("integrity.unknown-tag");
  });

  it("flags an unresolved template.skill and template.mediums entry", () => {
    const t = template({ skill: "skl.missing", mediums: ["med.missing"] });
    const report = runGate(baseLib({ templates: [sourced(t)] }), gateConfig);
    const unresolved = report.failures.filter((f) => f.rule === "integrity.unresolved");
    expect(unresolved.length).toBeGreaterThanOrEqual(2);
  });

  it("flags an unresolved incompatible[] reference", () => {
    const t = template({ incompatible: ["top.ghost"] });
    const report = runGate(baseLib({ templates: [sourced(t)] }), gateConfig);
    expect(rulesOf(report)).toContain("integrity.unresolved");
  });

  it("flags an unresolved manifest retire[] reference", () => {
    const manifest: BatchManifest = {
      status: "accepted",
      generator: { tool: "cli", model: "m", promptVersion: "1" },
      rubricVersion: "1",
      review: { judge: "m", founderSample: 1, rejectedIds: [], date: "2026-10-09" },
      edits: [],
      retire: ["top.ghost"],
    };
    const report = runGate(baseLib({ manifests: [sourced(manifest, "batch-1")] }), gateConfig);
    expect(rulesOf(report)).toContain("integrity.unresolved");
  });

  it("flags an unresolved anchor reference", () => {
    const anchor: Anchor = {
      templateId: "tpl.observation.explore.x",
      mediumId: "med.alpha",
      topicId: "top.ghost",
      styleId: null,
      constraintId: null,
      expectedBrief: "whatever",
    };
    const report = runGate(baseLib({ anchors: [anchor] }), gateConfig);
    expect(rulesOf(report)).toContain("integrity.unresolved");
  });

  it("keeps a retired entity resolvable via retire[] but excludes it from the Brief enumeration", () => {
    // The retired Topic's text is deliberately malformed (braces); if the gate still
    // enumerated it, this would fail. The active Topic's text is clean.
    const badTopic = fillEntry("top.bad", ["t"], { briefText: "a {ruined} thing" });
    const manifest: BatchManifest = {
      status: "accepted",
      generator: { tool: "cli", model: "m", promptVersion: "1" },
      rubricVersion: "1",
      review: { judge: "m", founderSample: 1, rejectedIds: [], date: "2026-10-09" },
      edits: [],
      retire: ["top.bad"],
    };
    const report = runGate(
      baseLib({ topics: [sourced(topic), sourced(badTopic, "batch-1")], manifests: [sourced(manifest, "batch-1")] }),
      gateConfig,
    );
    expect(report.ok).toBe(true);
    expect(report.counts.retired).toBe(1);
  });
});

describe("runGate — Brief rules", () => {
  it("flags leftover braces from a fill's own text", () => {
    const t = template({ briefPattern: "Draw {topic}.", styleTags: [], constraintTags: [] });
    const badTopic = fillEntry("top.a", ["t"], { briefText: "a {ruined} thing" });
    const report = runGate(baseLib({ templates: [sourced(t)], topics: [sourced(badTopic)] }), gateConfig);
    expect(rulesOf(report)).toContain("brief.braces");
  });

  it("flags too many sentences", () => {
    const t = template({ briefPattern: "One. Two. Three. {topic}.", styleTags: [], constraintTags: [] });
    const report = runGate(baseLib({ templates: [sourced(t)] }), gateConfig);
    expect(rulesOf(report)).toContain("brief.sentences");
  });

  it("flags zero sentences (no terminal punctuation)", () => {
    const t = template({ briefPattern: "{topic}", styleTags: [], constraintTags: [] });
    const report = runGate(baseLib({ templates: [sourced(t)] }), gateConfig);
    expect(rulesOf(report)).toContain("brief.sentences");
  });

  it("flags a Brief over the 160-char cap", () => {
    const t = template({ briefPattern: "{topic}.", styleTags: [], constraintTags: [] });
    const longTopic = fillEntry("top.a", ["t"], { briefText: "x".repeat(170) });
    const report = runGate(baseLib({ templates: [sourced(t)], topics: [sourced(longTopic)] }), gateConfig);
    expect(rulesOf(report)).toContain("brief.length");
  });

  it("does not fail when a compatible combination's render fails (reachability is Story 1.7)", () => {
    // topicTags non-empty but the pattern has no {topic} token -> render returns unused_fill.
    const t = template({ briefPattern: "{style} {constraint}.", topicTags: ["t"] });
    const report = runGate(baseLib({ templates: [sourced(t)] }), gateConfig);
    expect(report.ok).toBe(true);
  });
});

describe("runGate — anchors", () => {
  const anchorBase: Anchor = {
    templateId: "tpl.observation.explore.x",
    mediumId: "med.alpha",
    topicId: "top.a",
    styleId: "sty.a",
    constraintId: "con.a",
    expectedBrief: "Do a nearby chair. a warm tone that stays indoors.",
  };

  it("passes when the render string-equals expectedBrief", () => {
    const report = runGate(baseLib({ anchors: [anchorBase] }), gateConfig);
    expect(report.ok).toBe(true);
  });

  it("fails naming the template id when expectedBrief does not match", () => {
    const report = runGate(baseLib({ anchors: [{ ...anchorBase, expectedBrief: "Nope." }] }), gateConfig);
    const failure = report.failures.find((f) => f.rule === "anchor.mismatch");
    expect(failure?.id).toBe("tpl.observation.explore.x");
  });
});

describe("runGate — CL-4 lint", () => {
  it("flags a Style phrased as a rule (leading rule word)", () => {
    const badStyle = fillEntry("sty.a", ["s"], { briefText: "No bright colors" });
    const report = runGate(baseLib({ styles: [sourced(badStyle)] }), gateConfig);
    expect(rulesOf(report)).toContain("lint.style-rule");
  });

  it("flags a Style phrased as a rule (naming a count)", () => {
    const badStyle = fillEntry("sty.a", ["s"], { briefText: "three tones" });
    const report = runGate(baseLib({ styles: [sourced(badStyle)] }), gateConfig);
    expect(rulesOf(report)).toContain("lint.style-count");
  });

  it("flags a Constraint phrased as a bare mood/treatment word", () => {
    const badConstraint = fillEntry("con.a", ["c"], { briefText: "moody" });
    const report = runGate(baseLib({ constraints: [sourced(badConstraint)] }), gateConfig);
    expect(rulesOf(report)).toContain("lint.constraint-mood");
  });

  it("does not flag an ordinary Constraint phrase", () => {
    const report = runGate(baseLib(), gateConfig);
    expect(rulesOf(report)).not.toContain("lint.constraint-mood");
  });
});
