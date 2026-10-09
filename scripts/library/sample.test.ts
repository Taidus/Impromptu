import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { Constraint, Medium, Style, Template, Topic } from "../../src/domain/library/schema";
import { buildCombos, detectKind, findBatchFolder, loadActiveLibrary, toMarkdown, type Active } from "./sample";

const tpl = (over: Partial<Template> = {}): Template => ({
  id: "tpl.observation.explore.t1",
  skill: "skl.observation",
  level: "explore",
  mediums: ["med.alpha"],
  briefPattern: "Make {topic}.",
  topicTags: ["object"],
  styleTags: [],
  constraintTags: [],
  incompatible: [],
  tags: [],
  ...over,
});
const med = (over: Partial<Medium> = {}): Medium => ({ id: "med.alpha", revealText: "A", info: "A.", tags: [], ...over });
const fill = (id: string, briefText: string, tags: string[] = ["object"]): Topic & Style & Constraint => ({
  id,
  revealText: id,
  briefText,
  tags,
  requires: [],
  excludes: [],
});

const emptyActive = (): Active => ({ mediums: [], templates: [], topics: [], styles: [], constraints: [] });

describe("detectKind", () => {
  it("finds the one kind file present", () => {
    expect(detectKind(["manifest.json", "topics.json"])).toBe("topics");
  });

  it("throws when none or more than one is present", () => {
    expect(() => detectKind(["manifest.json"])).toThrow();
    expect(() => detectKind(["topics.json", "styles.json"])).toThrow();
  });
});

describe("findBatchFolder", () => {
  const folders = ["2026-10-09-topics-general-01", "2026-10-09-styles-general-01"];

  it("matches an exact folder name", () => {
    expect(findBatchFolder(folders, "2026-10-09-topics-general-01")).toBe(folders[0]);
  });

  it("matches a unique suffix", () => {
    expect(findBatchFolder(folders, "topics-general-01")).toBe(folders[0]);
  });

  it("throws on zero or ambiguous matches", () => {
    expect(() => findBatchFolder(folders, "general-01")).toThrow();
    expect(() => findBatchFolder(folders, "nope")).toThrow();
  });
});

describe("buildCombos", () => {
  it("renders one combo per new topic that matches the template's slot", () => {
    const active: Active = { ...emptyActive(), mediums: [med()], templates: [tpl()] };
    const topics = [fill("top.a", "thing a"), fill("top.b", "thing b")];
    const { combos, renderFailures } = buildCombos(active, { kind: "topics", entries: topics });
    expect(combos.map((c) => c.brief).sort()).toEqual(["Make thing a.", "Make thing b."]);
    expect(combos.every((c) => c.styleId === null && c.constraintId === null)).toBe(true);
    expect(renderFailures).toEqual([]);
  });

  it("skips a template whose medium isn't active", () => {
    const active: Active = { ...emptyActive(), templates: [tpl()] }; // no mediums
    const { combos } = buildCombos(active, { kind: "topics", entries: [fill("top.a", "thing a")] });
    expect(combos).toEqual([]);
  });

  it("uses active templates (not new ones) when sampling a fill batch", () => {
    const active: Active = { ...emptyActive(), mediums: [med()], templates: [tpl()], topics: [fill("top.old", "old thing")] };
    // new constraint, but the template has no constraintTags -- never renders
    const { combos } = buildCombos(active, { kind: "constraints", entries: [fill("con.new", "a new rule", ["tone"])] });
    expect(combos).toEqual([]);
  });

  it("uses only the new template's id (not active templates) when sampling a Template batch", () => {
    const activeTemplate = tpl({ id: "tpl.observation.explore.old", briefPattern: "Old {topic}." });
    const active: Active = { ...emptyActive(), mediums: [med()], templates: [activeTemplate], topics: [fill("top.a", "thing a")] };
    const newTemplate = tpl({ id: "tpl.observation.explore.new", briefPattern: "New {topic}." });
    const { combos } = buildCombos(active, { kind: "templates", entries: [newTemplate] });
    expect(combos.map((c) => c.templateId)).toEqual(["tpl.observation.explore.new"]);
  });

  it("reports a combination that passes isCompatible but fails render as a render failure", () => {
    // topicTags says a topic slot exists, but the pattern has no {topic} token: isCompatible
    // passes (slot presence matches), render fails with "unused_fill".
    const brokenTemplate = tpl({ briefPattern: "Make it." });
    const active: Active = { ...emptyActive(), mediums: [med()], templates: [brokenTemplate] };
    const { combos, renderFailures } = buildCombos(active, { kind: "topics", entries: [fill("top.a", "thing a")] });
    expect(combos).toEqual([]);
    expect(renderFailures).toEqual([
      {
        templateId: "tpl.observation.explore.t1",
        mediumId: "med.alpha",
        topicId: "top.a",
        styleId: null,
        constraintId: null,
        reason: "unused_fill (topic)",
      },
    ]);
  });
});

describe("toMarkdown", () => {
  const combo = (n: number) => ({
    templateId: `tpl.${n}`,
    mediumId: "med.alpha",
    topicId: null,
    styleId: null,
    constraintId: null,
    skill: "skl.observation",
    level: "explore",
    brief: `Brief ${n}`,
    guidance: null,
  });

  it("lists the full judge pass and caps the founder skim at sampleSize", () => {
    const combos = [1, 2, 3].map(combo);
    const md = toMarkdown("batch-1", combos, [], { sampleSize: 2, rng: () => 0.5 });
    expect(md).toContain("Judge pass: 3 rendered Challenge(s).");
    expect(md).toContain("Founder skim: 2 random.");
    const [judgeSection, skimSection] = md.split("## Founder skim (random)");
    expect(judgeSection.match(/\*\*Brief:\*\*/g)).toHaveLength(3);
    expect(skimSection.match(/\*\*Brief:\*\*/g)).toHaveLength(2);
  });

  it("caps the founder skim at 20 by default when there are 21+ combos", () => {
    const combos = Array.from({ length: 21 }, (_, i) => combo(i + 1));
    const md = toMarkdown("batch-1", combos);
    expect(md).toContain("Founder skim: 20 random.");
  });

  it("handles zero combos without throwing", () => {
    const md = toMarkdown("batch-empty", [], []);
    expect(md).toContain("Judge pass: 0 rendered Challenge(s).");
    expect(md).toContain("no compatible combination renders yet");
  });

  it("lists render failures in their own section", () => {
    const md = toMarkdown("batch-1", [], [
      { templateId: "tpl.x", mediumId: "med.alpha", topicId: "top.a", styleId: null, constraintId: null, reason: "unused_fill (topic)" },
    ]);
    const section = md.split("## Render failures")[1].split("## Founder skim")[0];
    expect(section).toContain("tpl.x");
    expect(section).toContain("unused_fill (topic)");
  });

  it("says 'none' when there are no render failures", () => {
    const md = toMarkdown("batch-1", [combo(1)], []);
    const section = md.split("## Render failures")[1].split("## Founder skim")[0];
    expect(section).toContain("none");
  });
});

describe("loadActiveLibrary (integration)", () => {
  let dir: string;

  afterEach(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
  });

  function setupLibrary() {
    dir = mkdtempSync(join(tmpdir(), "library-sample-"));
    const anchorsDir = join(dir, "anchors");
    mkdirSync(anchorsDir, { recursive: true });
    writeFileSync(join(dir, "mediums.json"), JSON.stringify([med()]));
    writeFileSync(join(anchorsDir, "templates.json"), JSON.stringify([tpl()]));
    writeFileSync(join(anchorsDir, "topics.json"), JSON.stringify([fill("top.anchor", "anchor thing")]));
    writeFileSync(join(anchorsDir, "styles.json"), JSON.stringify([]));
    writeFileSync(join(anchorsDir, "constraints.json"), JSON.stringify([]));
    const batchesDir = join(dir, "batches");
    mkdirSync(batchesDir, { recursive: true });
    return { anchorsDir, baseDir: dir, batchesDir };
  }

  function writeManifest(folderPath: string, over: Record<string, unknown>) {
    writeFileSync(
      join(folderPath, "manifest.json"),
      JSON.stringify({
        status: "draft",
        generator: { tool: "t", model: "m", promptVersion: "1.0.0" },
        rubricVersion: "1.0.0",
        review: null,
        edits: [],
        retire: [],
        ...over,
      }),
    );
  }

  it("merges anchors with accepted batches and excludes ids retired by an accepted batch", () => {
    const { anchorsDir, baseDir, batchesDir } = setupLibrary();
    const acceptedDir = join(batchesDir, "2026-10-09-topics-general-01");
    mkdirSync(acceptedDir, { recursive: true });
    writeManifest(acceptedDir, { status: "accepted", review: { judge: "j", founderSample: 1, rejectedIds: [], date: "2026-10-09" }, retire: ["top.anchor"] });
    writeFileSync(join(acceptedDir, "topics.json"), JSON.stringify([fill("top.accepted", "accepted thing")]));

    const active = loadActiveLibrary({ anchorsDir, baseDir, batchesDir });
    expect(active.topics.map((t) => t.id)).toEqual(["top.accepted"]);
    expect(active.templates.map((t) => t.id)).toEqual(["tpl.observation.explore.t1"]);
  });

  it("excludes an entry whose own `retired: true` flag is set, even with no batch retire[]", () => {
    const { anchorsDir, baseDir, batchesDir } = setupLibrary();
    const acceptedDir = join(batchesDir, "2026-10-09-topics-general-01");
    mkdirSync(acceptedDir, { recursive: true });
    writeManifest(acceptedDir, { status: "accepted", review: { judge: "j", founderSample: 1, rejectedIds: [], date: "2026-10-09" } });
    writeFileSync(
      join(acceptedDir, "topics.json"),
      JSON.stringify([{ ...fill("top.old", "old thing"), retired: true }, fill("top.new", "new thing")]),
    );

    const active = loadActiveLibrary({ anchorsDir, baseDir, batchesDir });
    expect(active.topics.map((t) => t.id)).toEqual(["top.anchor", "top.new"]);
  });

  it("keeps a draft batch's entries and its retire[] out of active unless it is the batch being sampled", () => {
    const { anchorsDir, baseDir, batchesDir } = setupLibrary();
    const draftDir = join(batchesDir, "2026-10-09-topics-general-02");
    mkdirSync(draftDir, { recursive: true });
    writeManifest(draftDir, { retire: ["top.anchor"] }); // draft, retires the anchor topic
    writeFileSync(join(draftDir, "topics.json"), JSON.stringify([fill("top.draft", "draft thing")]));

    const activeIgnoringDraft = loadActiveLibrary({ anchorsDir, baseDir, batchesDir });
    expect(activeIgnoringDraft.topics.map((t) => t.id)).toEqual(["top.anchor"]); // draft's retire not applied, entry not merged

    const activeSamplingDraft = loadActiveLibrary({ anchorsDir, baseDir, batchesDir, sampledBatchFolder: "2026-10-09-topics-general-02" });
    expect(activeSamplingDraft.topics.map((t) => t.id)).toEqual([]); // its own retire[] does apply when it's the one being sampled
  });

  it("throws, naming the folder, when manifest.json exists but fails to parse", () => {
    const { anchorsDir, baseDir, batchesDir } = setupLibrary();
    const badDir = join(batchesDir, "2026-10-09-topics-general-03");
    mkdirSync(badDir, { recursive: true });
    writeFileSync(join(badDir, "manifest.json"), "{ not json");

    expect(() => loadActiveLibrary({ anchorsDir, baseDir, batchesDir })).toThrow(/2026-10-09-topics-general-03/);
  });

  it("skips a folder with no manifest.json at all", () => {
    const { anchorsDir, baseDir, batchesDir } = setupLibrary();
    mkdirSync(join(batchesDir, "scratch"), { recursive: true });

    const active = loadActiveLibrary({ anchorsDir, baseDir, batchesDir });
    expect(active.topics.map((t) => t.id)).toEqual(["top.anchor"]);
  });
});
