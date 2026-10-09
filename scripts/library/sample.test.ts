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
    const combos = buildCombos(active, { kind: "topics", entries: topics });
    expect(combos.map((c) => c.brief).sort()).toEqual(["Make thing a.", "Make thing b."]);
    expect(combos.every((c) => c.styleId === null && c.constraintId === null)).toBe(true);
  });

  it("skips a template whose medium isn't active", () => {
    const active: Active = { ...emptyActive(), templates: [tpl()] }; // no mediums
    const combos = buildCombos(active, { kind: "topics", entries: [fill("top.a", "thing a")] });
    expect(combos).toEqual([]);
  });

  it("uses active templates (not new ones) when sampling a fill batch", () => {
    const active: Active = { ...emptyActive(), mediums: [med()], templates: [tpl()], topics: [fill("top.old", "old thing")] };
    // new constraint, but the template has no constraintTags -- never renders
    const combos = buildCombos(active, { kind: "constraints", entries: [fill("con.new", "a new rule", ["tone"])] });
    expect(combos).toEqual([]);
  });
});

describe("toMarkdown", () => {
  it("lists the full judge pass and caps the founder skim at sampleSize", () => {
    const combos = [1, 2, 3].map((n) => ({
      templateId: `tpl.${n}`,
      mediumId: "med.alpha",
      topicId: null,
      styleId: null,
      constraintId: null,
      skill: "skl.observation",
      level: "explore",
      brief: `Brief ${n}`,
      guidance: null,
    }));
    const md = toMarkdown("batch-1", combos, { sampleSize: 2, rng: () => 0.5 });
    expect(md).toContain("Judge pass: 3 rendered Challenge(s).");
    expect(md).toContain("Founder skim: 2 random.");
    const [judgeSection, skimSection] = md.split("## Founder skim (random)");
    expect(judgeSection.match(/\*\*Brief:\*\*/g)).toHaveLength(3);
    expect(skimSection.match(/\*\*Brief:\*\*/g)).toHaveLength(2);
  });

  it("handles zero combos without throwing", () => {
    const md = toMarkdown("batch-empty", []);
    expect(md).toContain("Judge pass: 0 rendered Challenge(s).");
    expect(md).toContain("no compatible combination renders yet");
  });
});

describe("loadActiveLibrary (integration)", () => {
  let dir: string;

  afterEach(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
  });

  it("merges anchors with accepted batches and excludes retired ids", () => {
    dir = mkdtempSync(join(tmpdir(), "library-sample-"));
    const anchorsDir = join(dir, "anchors");
    mkdirSync(anchorsDir, { recursive: true });
    writeFileSync(join(dir, "mediums.json"), JSON.stringify([med()]));
    writeFileSync(join(anchorsDir, "templates.json"), JSON.stringify([tpl()]));
    writeFileSync(join(anchorsDir, "topics.json"), JSON.stringify([fill("top.anchor", "anchor thing")]));
    writeFileSync(join(anchorsDir, "styles.json"), JSON.stringify([]));
    writeFileSync(join(anchorsDir, "constraints.json"), JSON.stringify([]));

    const batchesDir = join(dir, "batches");
    const acceptedDir = join(batchesDir, "2026-10-09-topics-general-01");
    mkdirSync(acceptedDir, { recursive: true });
    writeFileSync(
      join(acceptedDir, "manifest.json"),
      JSON.stringify({
        status: "accepted",
        generator: { tool: "t", model: "m", promptVersion: "1.0.0" },
        rubricVersion: "1.0.0",
        review: { judge: "j", founderSample: 1, rejectedIds: [], date: "2026-10-09" },
        edits: [],
        retire: ["top.anchor"],
      }),
    );
    writeFileSync(join(acceptedDir, "topics.json"), JSON.stringify([fill("top.accepted", "accepted thing")]));

    const active = loadActiveLibrary({ anchorsDir, baseDir: dir, batchesDir });
    expect(active.topics.map((t) => t.id)).toEqual(["top.accepted"]);
    expect(active.templates.map((t) => t.id)).toEqual(["tpl.observation.explore.t1"]);
  });
});
