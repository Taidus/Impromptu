import { describe, expect, it } from "vitest";
import {
  Anchor,
  BatchManifest,
  ConstraintId,
  MediumId,
  SkillId,
  StyleId,
  TagId,
  Template,
  TemplateId,
  Topic,
  TopicId,
} from "./schema";

const tpl = {
  id: "tpl.observation.explore.near-object",
  skill: "skl.observation",
  level: "explore",
  mediums: ["med.alpha", "med.beta"],
  briefPattern: "Make {topic}. {constraint}",
  topicTags: ["object"],
  styleTags: [],
  constraintTags: ["visual"],
};

const issues = (input: unknown) => {
  const r = Template.safeParse(input);
  return r.success ? [] : r.error.issues.map((i) => i.message);
};

describe("ids", () => {
  it.each([
    ["skl.idea-generation", SkillId, "skl.idea-generation"],
    ["med.spoken-word", MediumId, "med.spoken-word"],
    ["tpl.idea-generation.perform.first-date", TemplateId, "tpl.idea-generation.perform.first-date"],
    ["top.coming-home", TopicId, "top.coming-home"],
    ["sty.minimalist", StyleId, "sty.minimalist"],
    ["con.no-people", ConstraintId, "con.no-people"],
    ["camera", TagId, "camera"],
  ])("accepts %s", (_name, schema, id) => expect(schema.safeParse(id).success).toBe(true));

  it.each([
    ["Skill", SkillId, "skl.Observation"],
    ["Skill", SkillId, "observation"],
    ["Medium", MediumId, "med.spoken_word"],
    ["Medium", MediumId, "skl.alpha"],
    ["Template", TemplateId, "tpl.observation.beginner.x"],
    ["Template", TemplateId, "tpl.observation.explore"],
    ["Topic", TopicId, "top.-x"],
    ["Style", StyleId, "sty.a--b"],
    ["Constraint", ConstraintId, "con."],
    ["Tag", TagId, "med.camera"],
    ["Tag", TagId, "Camera"],
  ])("rejects %s id %s", (kind, schema, id) => {
    const r = schema.safeParse(id);
    expect(r.success).toBe(false);
    expect(r.error?.issues.map((i) => i.message)).toEqual([`Invalid ${kind} id`]);
  });
});

describe("Template", () => {
  it("parses a valid template and applies defaults", () => {
    const t = Template.parse(tpl);
    expect(t.incompatible).toEqual([]);
    expect(t.tags).toEqual([]);
  });

  it("accepts timeLimitSec at perform and guidance at explore", () => {
    expect(issues({ ...tpl, guidance: "Look closer." })).toEqual([]);
    expect(
      issues({ ...tpl, id: "tpl.observation.perform.x", level: "perform", timeLimitSec: 300 }),
    ).toEqual([]);
  });

  it("accepts a per-medium briefPattern keyed by its mediums", () => {
    expect(issues({ ...tpl, briefPattern: { "med.alpha": "A {topic}." } })).toEqual([]);
  });

  it("rejects timeLimitSec below perform, naming the id", () => {
    expect(issues({ ...tpl, timeLimitSec: 300 })).toEqual([
      "tpl.observation.explore.near-object: timeLimitSec is only allowed at the perform level",
    ]);
  });

  it("rejects non-positive or fractional timeLimitSec", () => {
    const perform = { ...tpl, id: "tpl.observation.perform.x", level: "perform" };
    expect(issues({ ...perform, timeLimitSec: 0 })).not.toEqual([]);
    expect(issues({ ...perform, timeLimitSec: 1.5 })).not.toEqual([]);
  });

  it("rejects guidance outside explore, naming the id", () => {
    expect(
      issues({ ...tpl, id: "tpl.observation.develop.x", level: "develop", guidance: "Hint." }),
    ).toEqual(["tpl.observation.develop.x: guidance is only allowed at the explore level"]);
  });

  it("rejects briefPattern keys outside mediums, naming the id", () => {
    expect(issues({ ...tpl, briefPattern: { "med.gamma": "x" } })).toEqual([
      'tpl.observation.explore.near-object: briefPattern key "med.gamma" is not in mediums',
    ]);
  });

  it("rejects id/skill and id/level mismatches, naming the id", () => {
    expect(issues({ ...tpl, skill: "skl.revision" })).toEqual([
      'tpl.observation.explore.near-object: id skill segment does not match skill "skl.revision"',
    ]);
    expect(issues({ ...tpl, level: "experiment" })).toEqual([
      'tpl.observation.explore.near-object: id level segment does not match level "experiment"',
    ]);
  });

  it("reports only the id error for a malformed id", () => {
    expect(issues({ ...tpl, id: "tpl.Bad" })).toEqual(["Invalid Template id"]);
  });

  it("rejects unknown keys and empty mediums", () => {
    expect(issues({ ...tpl, extra: 1 })).not.toEqual([]);
    expect(issues({ ...tpl, mediums: [] })).not.toEqual([]);
  });
});

describe("fills, anchors, manifests", () => {
  it("parses a Topic with defaults", () => {
    const t = Topic.parse({ id: "top.home", revealText: "Home", briefText: "coming home" });
    expect(t).toMatchObject({ tags: [], requires: [], excludes: [] });
    expect(Topic.safeParse({ id: "sty.home", revealText: "x", briefText: "x" }).success).toBe(false);
    expect(Topic.safeParse({ id: "top.home", revealText: "x", briefText: "x", extra: 1 }).success).toBe(false);
    expect(Topic.safeParse({ id: "top.home", revealText: "  ", briefText: "x" }).success).toBe(false);
  });

  it("parses an Anchor with null slots and rejects unknown keys", () => {
    const anchor = {
      templateId: "tpl.observation.explore.near-object",
      mediumId: "med.alpha",
      topicId: "top.near-object",
      styleId: null,
      constraintId: "con.three-details",
      expectedBrief: "Do the thing.",
    };
    expect(Anchor.safeParse(anchor).success).toBe(true);
    expect(Anchor.safeParse({ ...anchor, extra: 1 }).success).toBe(false);
  });

  it("parses draft and accepted manifests", () => {
    const base = {
      generator: { tool: "cli", model: "m", promptVersion: "1" },
      rubricVersion: "1",
    };
    expect(BatchManifest.parse({ ...base, status: "draft", review: null })).toMatchObject({
      edits: [],
      retire: [],
    });
    const accepted = {
      ...base,
      status: "accepted",
      review: { judge: "m", founderSample: 20, rejectedIds: ["top.x"], date: "2026-10-09" },
      retire: ["sty.old"],
    };
    expect(BatchManifest.safeParse(accepted).success).toBe(true);
    expect(BatchManifest.safeParse({ ...accepted, status: "done" }).success).toBe(false);
    expect(BatchManifest.safeParse({ ...accepted, retire: ["nope"] }).success).toBe(false);
    expect(BatchManifest.safeParse({ ...accepted, retire: ["skl.observation"] }).success).toBe(false);
    expect(BatchManifest.safeParse({ ...accepted, review: null }).success).toBe(false);
    expect(BatchManifest.safeParse({ ...accepted, status: "draft" }).success).toBe(false);
  });
});
