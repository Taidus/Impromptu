import { describe, expect, it } from "vitest";
import { isCompatible } from "./compat";
import type { Constraint, Medium, Style, Template, Topic } from "./schema";

const tpl = (over: Partial<Template> = {}): Template => ({
  id: "tpl.expression.experiment.two-moods",
  skill: "skl.expression",
  level: "experiment",
  mediums: ["med.alpha", "med.beta"],
  briefPattern: "{topic} {style} {constraint}",
  topicTags: ["place"],
  styleTags: ["visual"],
  constraintTags: ["person"],
  incompatible: [],
  tags: [],
  ...over,
});
const med = (over: Partial<Medium> = {}): Medium => ({
  id: "med.alpha",
  revealText: "Alpha",
  info: "Alpha medium.",
  tags: ["visual"],
  ...over,
});
// Topic, Style and Constraint share one shape.
const fill = (id: string, tags: string[], over: Partial<Topic>): Topic & Style & Constraint => ({
  id, revealText: id, briefText: id, tags, requires: [], excludes: [], ...over,
});

const topic = (over: Partial<Topic> = {}) => fill("top.coming-home", ["place"], over);
const style = (over: Partial<Style> = {}) => fill("sty.minimalist", ["visual"], over);
const constraint = (over: Partial<Constraint> = {}) => fill("con.no-people", ["person"], over);

describe("isCompatible", () => {
  it("accepts a valid full combination", () => {
    expect(isCompatible(tpl(), med(), topic(), style(), constraint())).toBe(true);
  });

  it("rejects a Topic requiring person when the Constraint excludes person", () => {
    expect(
      isCompatible(tpl(), med(), topic({ tags: ["place", "person"] }), style(), constraint({ excludes: ["person"] })),
    ).toBe(false);
  });

  it("rejects a Topic requiring person when the Constraint excludes person (person from the Template)", () => {
    const t = tpl({ constraintTags: ["object"], tags: ["person"] });
    const top = topic({ requires: ["person"] });
    expect(isCompatible(t, med(), top, style(), constraint({ tags: ["object"] }))).toBe(true);
    expect(isCompatible(t, med(), top, style(), constraint({ tags: ["object"], excludes: ["person"] }))).toBe(false);
  });

  it("rejects an excludes tag carried by the Medium or the Template", () => {
    expect(isCompatible(tpl(), med({ tags: ["camera"] }), topic(), style(), constraint({ excludes: ["camera"] }))).toBe(
      false,
    );
    expect(isCompatible(tpl({ tags: ["indoor"] }), med(), topic({ excludes: ["indoor"] }), style(), constraint())).toBe(
      false,
    );
  });

  it("accepts a requirement satisfied by another fill", () => {
    expect(isCompatible(tpl(), med({ tags: [] }), topic({ requires: ["visual"] }), style(), constraint())).toBe(true);
  });

  it("accepts a requirement satisfied by a Medium tag, rejects when unsatisfied", () => {
    const t = topic({ requires: ["camera"] });
    expect(isCompatible(tpl(), med({ tags: ["camera", "visual"] }), t, style(), constraint())).toBe(true);
    expect(isCompatible(tpl(), med(), t, style(), constraint())).toBe(false);
  });

  it("rejects a requirement met only by the fill itself", () => {
    expect(isCompatible(tpl(), med(), topic({ requires: ["place"] }), style(), constraint())).toBe(false);
  });

  it("counts Template tags as parts", () => {
    const t = topic({ requires: ["indoor"] });
    expect(isCompatible(tpl({ tags: ["indoor"] }), med(), t, style(), constraint())).toBe(true);
  });

  it("rejects a fill listed in incompatible by id", () => {
    expect(isCompatible(tpl({ incompatible: ["sty.minimalist"] }), med(), topic(), style(), constraint())).toBe(false);
  });

  it("rejects a tag listed in incompatible (fill or Medium)", () => {
    expect(isCompatible(tpl({ incompatible: ["place"] }), med(), topic(), style(), constraint())).toBe(false);
    expect(
      isCompatible(tpl({ styleTags: [], incompatible: ["camera"] }), med({ tags: ["camera"] }), topic(), null, constraint()),
    ).toBe(false);
  });

  it("accepts an omitted Style slot with null", () => {
    expect(isCompatible(tpl({ styleTags: [] }), med(), topic(), null, constraint())).toBe(true);
  });

  it("rejects a Style given for an omitted slot", () => {
    expect(isCompatible(tpl({ styleTags: [] }), med(), topic(), style(), constraint())).toBe(false);
  });

  it("accepts an omitted Constraint slot with null, rejects a Constraint given for it", () => {
    expect(isCompatible(tpl({ constraintTags: [] }), med(), topic(), style(), null)).toBe(true);
    expect(isCompatible(tpl({ constraintTags: [] }), med(), topic(), style(), constraint())).toBe(false);
  });

  it("rejects a present slot with null", () => {
    expect(isCompatible(tpl(), med(), topic(), null, constraint())).toBe(false);
    expect(isCompatible(tpl(), med(), topic(), style(), null)).toBe(false);
  });

  it("rejects a fill sharing no tag with its slot list", () => {
    expect(isCompatible(tpl(), med(), topic({ tags: ["object"] }), style(), constraint())).toBe(false);
  });

  it("rejects a Medium not in template.mediums", () => {
    expect(isCompatible(tpl(), med({ id: "med.gamma" }), topic(), style(), constraint())).toBe(false);
  });
});
