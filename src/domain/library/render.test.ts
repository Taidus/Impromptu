import { describe, expect, it } from "vitest";
import { render } from "./render";
import type { Constraint, Medium, Style, Template, Topic } from "./schema";

const tpl = (over: Partial<Template> = {}): Template => ({
  id: "tpl.observation.explore.near-object",
  skill: "skl.observation",
  level: "explore",
  mediums: ["med.alpha", "med.beta"],
  briefPattern: "Make {topic}. {constraint}",
  topicTags: ["object"],
  styleTags: [],
  constraintTags: ["visual"],
  incompatible: [],
  tags: [],
  ...over,
});
const med = (id = "med.alpha"): Medium => ({ id, revealText: "A", info: "A.", tags: [] });
// Topic, Style and Constraint share one shape.
const f = (id: string, briefText: string): Topic & Style & Constraint => ({
  id, revealText: id, briefText, tags: [], requires: [], excludes: [],
});

const topic = f("top.near", "an object near you");
const style = f("sty.calm", "in a calm way");
const constraint = f("con.details", "Include three details you have never paid attention to.");
const fills = { topic, style: null, constraint };

describe("render", () => {
  it("renders a string pattern verbatim", () => {
    expect(render(tpl(), med(), fills)).toEqual({
      ok: true,
      brief: "Make an object near you. Include three details you have never paid attention to.",
      guidance: null,
    });
  });

  it("renders a pattern without {constraint} when constraint is null", () => {
    expect(render(tpl({ briefPattern: "Draw {topic}." }), med(), { topic, style: null, constraint: null })).toEqual({
      ok: true,
      brief: "Draw an object near you.",
      guidance: null,
    });
  });

  it("chooses the per-Medium pattern", () => {
    const t = tpl({ briefPattern: { "med.alpha": "Alpha {topic}. {constraint}", "med.beta": "Beta {topic}. {constraint}" } });
    const r = render(t, med("med.beta"), fills);
    expect(r.ok && r.brief).toBe("Beta an object near you. Include three details you have never paid attention to.");
  });

  it("replaces repeated placeholders everywhere", () => {
    const r = render(tpl({ briefPattern: "{topic}, {topic}. {constraint}" }), med(), fills);
    expect(r.ok && r.brief).toBe(
      "an object near you, an object near you. Include three details you have never paid attention to.",
    );
  });

  it("does not re-substitute placeholders inside fill text", () => {
    const r = render(tpl(), med(), { ...fills, topic: f("top.x", "{constraint}") });
    expect(r.ok && r.brief).toBe("Make {constraint}. Include three details you have never paid attention to.");
  });

  it("returns guidance separately and never in the brief", () => {
    const r = render(tpl({ guidance: "Look slowly." }), med(), fills);
    expect(r.ok && r.guidance).toBe("Look slowly.");
    expect(r.ok && r.brief).not.toContain("Look slowly.");
  });

  it("fails with no_pattern_for_medium", () => {
    const t = tpl({ briefPattern: { "med.alpha": "{topic}. {constraint}" } });
    expect(render(t, med("med.beta"), fills)).toEqual({ ok: false, reason: "no_pattern_for_medium" });
  });

  it("fails with unknown_slot", () => {
    expect(render(tpl({ briefPattern: "{topic} {mood} {constraint}" }), med(), fills)).toEqual({
      ok: false,
      reason: "unknown_slot",
    });
  });

  it("fails with missing_fill", () => {
    expect(render(tpl({ briefPattern: "{topic} {style} {constraint}" }), med(), fills)).toEqual({
      ok: false,
      reason: "missing_fill",
      slot: "style",
    });
  });

  it("fails with unused_fill", () => {
    expect(render(tpl(), med(), { ...fills, style })).toEqual({ ok: false, reason: "unused_fill", slot: "style" });
  });
});
