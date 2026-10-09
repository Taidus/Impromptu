import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { gateConfig } from "./gate-config";
import { runGate, type GateInput } from "./gate";
import { loadLibrary } from "./load";
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

// The default anchor: matches the default template/topic/style/constraint above exactly,
// so most tests (which aren't about anchors at all) stay anchor-clean by default, while
// the "runGate — anchors" tests below exercise it directly.
const defaultAnchor: Anchor = {
  templateId: "tpl.observation.explore.x",
  mediumId: "med.alpha",
  topicId: "top.a",
  styleId: "sty.a",
  constraintId: "con.a",
  expectedBrief: "Do a nearby chair. a warm tone that stays indoors.",
};

function baseLib(over: Partial<GateInput> = {}): GateInput {
  return {
    tags: [tag("t"), tag("s"), tag("c")],
    skills: [skill("skl.observation")],
    mediums: [medium("med.alpha")],
    templates: [sourced(template())],
    topics: [sourced(topic)],
    styles: [sourced(style)],
    constraints: [sourced(constraint)],
    anchors: [defaultAnchor],
    manifests: [],
    issues: [],
    ...over,
  };
}

const draftManifest = (over: Partial<BatchManifest> = {}): BatchManifest => ({
  status: "draft",
  generator: { tool: "cli", model: "m", promptVersion: "1" },
  rubricVersion: "1",
  review: null,
  edits: [],
  retire: [],
  ...over,
});

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
    // Both problems share (rule, id) and so merge into one de-duplicated entry (see
    // "one bad fill floods the report" below) — check the merged message names both.
    const t = template({ skill: "skl.missing", mediums: ["med.missing"] });
    const report = runGate(baseLib({ templates: [sourced(t)] }), gateConfig);
    const unresolved = report.failures.find((f) => f.rule === "integrity.unresolved" && f.id === t.id);
    expect(unresolved?.message).toContain("skl.missing");
    expect(unresolved?.message).toContain("med.missing");
  });

  it("flags an unresolved incompatible[] reference", () => {
    const t = template({ incompatible: ["top.ghost"] });
    const report = runGate(baseLib({ templates: [sourced(t)] }), gateConfig);
    expect(rulesOf(report)).toContain("integrity.unresolved");
  });

  it("fails a non-Perform Template carrying a timeLimitSec", () => {
    const t = template({ level: "explore", timeLimitSec: 60 });
    const report = runGate(baseLib({ templates: [sourced(t)] }), gateConfig);
    const failure = report.failures.find((f) => f.rule === "integrity.time-limit");
    expect(failure?.id).toBe(t.id);
  });

  it("flags an unresolved manifest retire[] reference", () => {
    const manifest = draftManifest({
      status: "accepted",
      review: { judge: "m", founderSample: 1, rejectedIds: [], date: "2026-10-09" },
      retire: ["top.ghost"],
    });
    const report = runGate(baseLib({ manifests: [sourced(manifest, "batch-1")] }), gateConfig);
    expect(rulesOf(report)).toContain("integrity.unresolved");
  });

  it("flags an unresolved manifest edits[].id and review.rejectedIds", () => {
    const manifest = draftManifest({
      status: "accepted",
      review: { judge: "m", founderSample: 1, rejectedIds: ["top.ghost-2"], date: "2026-10-09" },
      edits: [{ id: "top.ghost-1", note: "typo" }],
    });
    const report = runGate(baseLib({ manifests: [sourced(manifest, "batch-1")] }), gateConfig);
    const messages = report.failures.filter((f) => f.rule === "integrity.unresolved").map((f) => f.message);
    expect(messages.some((m) => m.includes("top.ghost-1"))).toBe(true);
    expect(messages.some((m) => m.includes("top.ghost-2"))).toBe(true);
  });

  it("flags an unresolved anchor reference", () => {
    const anchor: Anchor = { ...defaultAnchor, topicId: "top.ghost" };
    const report = runGate(baseLib({ anchors: [anchor] }), gateConfig);
    expect(rulesOf(report)).toContain("integrity.unresolved");
  });

  it("flags an anchor field pointing at the wrong kind of entity instead of silently skipping it", () => {
    // styleId set to an existing TOPIC id — a real id, but the wrong kind for this field.
    const anchor: Anchor = { ...defaultAnchor, styleId: "top.a" };
    const report = runGate(baseLib({ anchors: [anchor] }), gateConfig);
    const failure = report.failures.find((f) => f.rule === "integrity.unresolved");
    expect(failure?.message).toContain("styleId");
  });

  it("fails the gate when zero anchors load", () => {
    const report = runGate(baseLib({ anchors: [] }), gateConfig);
    expect(rulesOf(report)).toContain("anchor.missing");
  });

  it("fails an anchor that resolves but references a retired id", () => {
    const manifest = draftManifest({
      status: "accepted",
      review: { judge: "m", founderSample: 1, rejectedIds: [], date: "2026-10-09" },
      retire: ["top.a"],
    });
    const report = runGate(baseLib({ manifests: [sourced(manifest, "batch-1")] }), gateConfig);
    expect(rulesOf(report)).toContain("anchor.retired");
  });

  it("keeps a retired entity resolvable via retire[] but excludes it from the Brief enumeration", () => {
    // The retired Topic's text is deliberately malformed (braces); if the gate still
    // enumerated it, this would fail. The active Topic's text is clean.
    const badTopic = fillEntry("top.bad", ["t"], { briefText: "a {ruined} thing" });
    const manifest = draftManifest({
      status: "accepted",
      review: { judge: "m", founderSample: 1, rejectedIds: [], date: "2026-10-09" },
      retire: ["top.bad"],
    });
    const report = runGate(
      baseLib({ topics: [sourced(topic), sourced(badTopic, "batch-1")], manifests: [sourced(manifest, "batch-1")] }),
      gateConfig,
    );
    expect(report.ok).toBe(true);
    expect(report.counts.retired).toBe(1);
    expect(report.retiredIds).toEqual(["top.bad"]); // consumed by build.ts to exclude retired entries.
  });

  it("does not throw on malformed JSON or a missing required file; both surface as issues", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "gate-load-test-"));
    try {
      const libDir = path.join(root, "content", "library");
      fs.mkdirSync(path.join(libDir, "anchors"), { recursive: true });
      fs.writeFileSync(path.join(libDir, "mediums.json"), "[not valid json");
      fs.writeFileSync(path.join(libDir, "skills.json"), JSON.stringify([]));
      // tags.json (required) is missing entirely.
      fs.writeFileSync(path.join(libDir, "anchors", "anchors.json"), JSON.stringify([]));

      let lib: ReturnType<typeof loadLibrary> | undefined;
      expect(() => {
        lib = loadLibrary(root);
      }).not.toThrow();
      expect(lib!.issues.length).toBeGreaterThanOrEqual(2);

      let report: ReturnType<typeof runGate> | undefined;
      expect(() => {
        report = runGate(lib!, gateConfig);
      }).not.toThrow();
      expect(report!.ok).toBe(false);
      expect(rulesOf(report!)).toContain("integrity.parse");
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});

describe("runGate — Brief rules", () => {
  it("flags leftover braces from a fill's own text", () => {
    const t = template({ briefPattern: "Draw {topic}.", styleTags: [], constraintTags: [] });
    const badTopic = fillEntry("top.a", ["t"], { briefText: "a {ruined} thing" });
    const report = runGate(baseLib({ templates: [sourced(t)], topics: [sourced(badTopic)] }), gateConfig);
    const failure = report.failures.find((f) => f.rule === "brief.braces");
    expect(failure?.id).toBe("top.a"); // names the offending fill, not the Template.
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

  it("does not treat a decimal point as a sentence break", () => {
    const t = template({ briefPattern: "{topic}", styleTags: [], constraintTags: [] });
    const decimalTopic = fillEntry("top.a", ["t"], { briefText: "exactly 3.5 minutes." });
    const report = runGate(baseLib({ templates: [sourced(t)], topics: [sourced(decimalTopic)] }), gateConfig);
    expect(rulesOf(report)).not.toContain("brief.sentences");
  });

  it("flags a Brief over the 160-char cap", () => {
    const t = template({ briefPattern: "{topic}.", styleTags: [], constraintTags: [] });
    const longTopic = fillEntry("top.a", ["t"], { briefText: "x".repeat(170) });
    const report = runGate(baseLib({ templates: [sourced(t)], topics: [sourced(longTopic)] }), gateConfig);
    expect(rulesOf(report)).toContain("brief.length");
  });

  it("flags an unknown token in the pattern as brief.braces", () => {
    const t = template({ briefPattern: "Draw {bogus}.", topicTags: [], styleTags: [], constraintTags: [] });
    const report = runGate(baseLib({ templates: [sourced(t)] }), gateConfig);
    expect(rulesOf(report)).toContain("brief.braces");
  });

  it("flags a medium with no briefPattern as an integrity failure", () => {
    const t = template({ briefPattern: {}, topicTags: [], styleTags: [], constraintTags: [] });
    const report = runGate(baseLib({ templates: [sourced(t)] }), gateConfig);
    expect(rulesOf(report)).toContain("integrity.no-pattern");
  });

  it("does not treat a failed render as a brief.* violation (reachability, not Brief rules, catches it)", () => {
    // A second Template, id "y": topicTags non-empty but the pattern has no {topic}
    // token -> render returns unused_fill for every combination, so it has zero valid
    // combinations. Unlike the default (anchor) Template, "y" isn't anchor-exempt, so
    // Story 1.7's reachability check fails it — but never via a brief.* rule.
    const broken = template({ id: "tpl.observation.explore.y", briefPattern: "{style} {constraint}." });
    const report = runGate(baseLib({ templates: [sourced(template()), sourced(broken)] }), gateConfig);
    expect(rulesOf(report).filter((r) => r.startsWith("brief."))).toEqual([]);
    const failure = report.failures.find((f) => f.id === "tpl.observation.explore.y");
    expect(failure?.rule).toBe("reachability.min-combinations");
  });
});

describe("runGate — reachability", () => {
  it("fails a non-anchor Template with fewer than 3 valid combinations", () => {
    // The default Template/topic/style/constraint yield exactly 1 valid combination.
    const report = runGate(baseLib({ anchors: [] }), gateConfig);
    const failure = report.failures.find((f) => f.rule === "reachability.min-combinations");
    expect(failure?.id).toBe("tpl.observation.explore.x");
  });

  it("exempts a Template referenced by an anchor from the >=3 rule", () => {
    // Same 1-combination shortfall, but defaultAnchor references this Template's id.
    const report = runGate(baseLib(), gateConfig);
    expect(rulesOf(report)).not.toContain("reachability.min-combinations");
  });

  it("passes a Template with >=3 valid combinations", () => {
    const topics = [
      sourced(fillEntry("top.a", ["t"], { briefText: "a" })),
      sourced(fillEntry("top.b", ["t"], { briefText: "b" })),
      sourced(fillEntry("top.c", ["t"], { briefText: "c" })),
    ];
    const report = runGate(baseLib({ anchors: [], topics }), gateConfig);
    expect(rulesOf(report)).not.toContain("reachability.min-combinations");
  });

  it("does not exempt a batch-sourced Template even when an anchor names its id", () => {
    const report = runGate(baseLib({ templates: [sourced(template(), "batch-1")] }), gateConfig);
    const failure = report.failures.find((f) => f.rule === "reachability.min-combinations");
    expect(failure?.id).toBe("tpl.observation.explore.x");
  });

  it("does not count a combination whose Brief fails a brief.* rule", () => {
    const topics = [
      sourced(fillEntry("top.a", ["t"], { briefText: "a" })),
      sourced(fillEntry("top.b", ["t"], { briefText: "b" })),
      sourced(fillEntry("top.c", ["t"], { briefText: "a {ruined} c" })),
    ];
    const report = runGate(baseLib({ anchors: [], topics }), gateConfig);
    expect(rulesOf(report)).toContain("brief.braces");
    const failure = report.failures.find((f) => f.rule === "reachability.min-combinations");
    expect(failure?.message).toContain("only 2");
  });
});

describe("runGate — coverage and repeat headroom", () => {
  it("warns (never fails) on a thin cell and setup when coverage.enforce is false", () => {
    const report = runGate(baseLib(), gateConfig);
    expect(report.ok).toBe(true);
    expect(report.failures).toEqual([]);
    expect(report.warnings.some((w) => w.rule === "coverage.templates")).toBe(true);
    expect(report.warnings.some((w) => w.rule === "coverage.headroom")).toBe(true);
  });

  it("fails the same shortfalls when coverage.enforce is true", () => {
    const config = { ...gateConfig, coverage: { ...gateConfig.coverage, enforce: true } };
    const report = runGate(baseLib(), config);
    expect(report.ok).toBe(false);
    expect(rulesOf(report)).toContain("coverage.templates");
    expect(rulesOf(report)).toContain("coverage.headroom");
  });

  it("always warns on a thin Skill-focused cell, even when coverage.enforce is true", () => {
    const config = { ...gateConfig, coverage: { ...gateConfig.coverage, enforce: true } };
    const report = runGate(baseLib(), config);
    expect(report.warnings.some((w) => w.rule === "coverage.headroom-focused")).toBe(true);
    expect(rulesOf(report)).not.toContain("coverage.headroom-focused");
  });
});

describe("runGate — batch sizing (AD-17)", () => {
  const acceptedManifest = draftManifest({
    status: "accepted",
    review: { judge: "m", founderSample: 1, rejectedIds: [], date: "2026-10-09" },
  });
  const twoTemplates = (over: Partial<Template> = {}) =>
    ["a", "b"].map((slug) => sourced(template({ id: `tpl.observation.explore.${slug}`, ...over }), "batch-1"));
  const sizingFailures = (lib: GateInput) => runGate(lib, gateConfig).failures.filter((f) => f.rule === "batch.sizing");

  it("fails a draft batch whose Templates give one of its own Mediums fewer than 3 Templates", () => {
    const t1 = template({ id: "tpl.observation.explore.a" });
    const t2 = template({ id: "tpl.observation.explore.b" });
    const report = runGate(
      baseLib({
        anchors: [],
        templates: [sourced(t1, "batch-1"), sourced(t2, "batch-1")],
        manifests: [sourced(draftManifest(), "batch-1")],
      }),
      gateConfig,
    );
    const failure = report.failures.find((f) => f.rule === "batch.sizing");
    expect(failure?.source).toBe("batch-1");
  });

  it("passes a batch with >=3 Templates for every Medium it declares", () => {
    const templates = ["a", "b", "c"].map((slug) => sourced(template({ id: `tpl.observation.explore.${slug}` }), "batch-1"));
    const report = runGate(
      baseLib({ anchors: [], templates, manifests: [sourced(draftManifest(), "batch-1")] }),
      gateConfig,
    );
    expect(rulesOf(report)).not.toContain("batch.sizing");
  });

  it("does not size an accepted (immutable) batch", () => {
    const lib = baseLib({ anchors: [], templates: twoTemplates(), manifests: [sourced(acceptedManifest, "batch-1")] });
    expect(sizingFailures(lib)).toEqual([]);
  });

  it("does not count a retired Template toward a draft batch's sizing", () => {
    const templates = [
      ...twoTemplates(),
      sourced(template({ id: "tpl.observation.explore.c", retired: true }), "batch-1"),
    ];
    const lib = baseLib({ anchors: [], templates, manifests: [sourced(draftManifest(), "batch-1")] });
    expect(sizingFailures(lib)[0]?.message).toContain("only 2");
  });

  it("counts a Template that lists a Medium twice only once for that Medium", () => {
    const lib = baseLib({
      anchors: [],
      templates: twoTemplates({ mediums: ["med.alpha", "med.alpha"] }),
      manifests: [sourced(draftManifest(), "batch-1")],
    });
    expect(sizingFailures(lib)[0]?.message).toContain("only 2");
  });

  it("never checks the anchors source for batch sizing", () => {
    // baseLib()'s single default Template is sourced "anchors" and alone in its Medium.
    const report = runGate(baseLib({ anchors: [] }), gateConfig);
    expect(rulesOf(report)).not.toContain("batch.sizing");
  });
});

describe("runGate — anchors", () => {
  it("passes when the render string-equals expectedBrief", () => {
    const report = runGate(baseLib(), gateConfig);
    expect(report.ok).toBe(true);
  });

  it("fails naming the template id when expectedBrief does not match", () => {
    const report = runGate(baseLib({ anchors: [{ ...defaultAnchor, expectedBrief: "Nope." }] }), gateConfig);
    const failure = report.failures.find((f) => f.rule === "anchor.mismatch");
    expect(failure?.id).toBe("tpl.observation.explore.x");
  });

  it("fails anchor.incompatible when the anchor's own fills are not isCompatible()", () => {
    // The anchor's Topic carries a tag the Template's topicTags doesn't accept.
    const incompatibleTopic = fillEntry("top.a", ["other-tag"]);
    const report = runGate(baseLib({ topics: [sourced(incompatibleTopic)] }), gateConfig);
    expect(rulesOf(report)).toContain("anchor.incompatible");
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

  it("does not flag a count glued to letters (1920s, 35mm) or a number word joined by a hyphen", () => {
    const styleA = fillEntry("sty.a", ["s"], { briefText: "1920s glamour" });
    const reportA = runGate(baseLib({ styles: [sourced(styleA)] }), gateConfig);
    expect(rulesOf(reportA)).not.toContain("lint.style-count");

    const styleB = fillEntry("sty.a", ["s"], { briefText: "shot on 35mm" });
    const reportB = runGate(baseLib({ styles: [sourced(styleB)] }), gateConfig);
    expect(rulesOf(reportB)).not.toContain("lint.style-count");

    const styleC = fillEntry("sty.a", ["s"], { briefText: "a one-point perspective" });
    const reportC = runGate(baseLib({ styles: [sourced(styleC)] }), gateConfig);
    expect(rulesOf(reportC)).not.toContain("lint.style-count");
  });

  it("flags a Constraint phrased as a bare mood/treatment word", () => {
    const badConstraint = fillEntry("con.a", ["c"], { briefText: "moody" });
    const report = runGate(baseLib({ constraints: [sourced(badConstraint)] }), gateConfig);
    expect(rulesOf(report)).toContain("lint.constraint-mood");
  });

  it("flags a mood phrase with an intensifier or a connector, not just a bare word", () => {
    const veryModdy = fillEntry("con.a", ["c"], { briefText: "very moody" });
    const reportA = runGate(baseLib({ constraints: [sourced(veryModdy)] }), gateConfig);
    expect(rulesOf(reportA)).toContain("lint.constraint-mood");

    const dreamySoft = fillEntry("con.a", ["c"], { briefText: "dreamy and soft" });
    const reportB = runGate(baseLib({ constraints: [sourced(dreamySoft)] }), gateConfig);
    expect(rulesOf(reportB)).toContain("lint.constraint-mood");
  });

  it("does not flag an ordinary Constraint phrase", () => {
    const report = runGate(baseLib(), gateConfig);
    expect(rulesOf(report)).not.toContain("lint.constraint-mood");
  });

  it("fires on revealText alone, even when briefText is clean", () => {
    const badStyle = fillEntry("sty.a", ["s"], { revealText: "No bright colors", briefText: "a warm tone" });
    const report = runGate(baseLib({ styles: [sourced(badStyle)] }), gateConfig);
    expect(rulesOf(report)).toContain("lint.style-rule");
  });

  it("does not lint a retired Style or a retired: true Constraint, and both count as retired", () => {
    const retiredStyle = fillEntry("sty.a", ["s"], { briefText: "No bright colors", retired: true });
    const retiredConstraint = fillEntry("con.a", ["c"], { briefText: "moody", retired: true });
    const report = runGate(
      baseLib({ styles: [sourced(retiredStyle)], constraints: [sourced(retiredConstraint)], anchors: [] }),
      gateConfig,
    );
    expect(rulesOf(report)).not.toContain("lint.style-rule");
    expect(rulesOf(report)).not.toContain("lint.constraint-mood");
    expect(report.counts.retired).toBe(2);
  });
});
