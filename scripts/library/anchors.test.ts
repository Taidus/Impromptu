import { describe, expect, it } from "vitest";
import { z } from "zod";
import { isCompatible } from "../../src/domain/library/compat";
import { render } from "../../src/domain/library/render";
import { Anchor, Constraint, Medium, Style, Tag, Template, Topic } from "../../src/domain/library/schema";
import anchorsJson from "../../content/library/anchors/anchors.json";
import constraintsJson from "../../content/library/anchors/constraints.json";
import stylesJson from "../../content/library/anchors/styles.json";
import templatesJson from "../../content/library/anchors/templates.json";
import topicsJson from "../../content/library/anchors/topics.json";
import mediumsJson from "../../content/library/mediums.json";
import tagsJson from "../../content/library/tags.json";

const tags = z.array(Tag).parse(tagsJson);
const mediums = z.array(Medium).parse(mediumsJson);
const templates = z.array(Template).parse(templatesJson);
const topics = z.array(Topic).parse(topicsJson);
const styles = z.array(Style).parse(stylesJson);
const constraints = z.array(Constraint).parse(constraintsJson);
const anchors = z.array(Anchor).parse(anchorsJson);

function byId<T extends { id: string }>(list: T[], id: string): T {
  const found = list.find((e) => e.id === id);
  if (!found) throw new Error(`missing id ${id}`);
  return found;
}

function anchorForTemplate(templateId: string) {
  const found = anchors.find((a) => a.templateId === templateId);
  if (!found) throw new Error(`no anchor for ${templateId}`);
  return found;
}

// Founder's Always list, pinned here so a matching typo in anchors.json can't pass silently.
const EXPECTED = {
  "tpl.observation.explore.nearby-object": {
    mediumId: "med.drawing",
    timeLimitSec: undefined,
    brief: "Draw an object near you. Include three details you have never paid attention to.",
  },
  "tpl.expression.experiment.coming-home": {
    mediumId: "med.photography",
    timeLimitSec: undefined,
    brief: "Take two photos of coming home. Make one feel comforting and the other lonely. Keep people out of both.",
  },
  "tpl.idea-generation.perform.first-date-horror": {
    mediumId: "med.writing",
    timeLimitSec: 300,
    brief: "Write three premises for a first date that feels like horror, even though nothing bad happens.",
  },
} as const;

describe("CL-5 anchors", () => {
  it("has exactly the three founder anchors", () => {
    expect(anchors).toHaveLength(3);
  });

  for (const [templateId, expected] of Object.entries(EXPECTED)) {
    it(`renders ${templateId} to the founder's literal Brief and is compatible`, () => {
      const anchor = anchorForTemplate(templateId);
      const template = byId(templates, templateId);
      expect(anchor.mediumId).toBe(expected.mediumId);
      expect(template.timeLimitSec).toBe(expected.timeLimitSec);

      const medium = byId(mediums, anchor.mediumId);
      const topic = byId(topics, anchor.topicId);
      const style = anchor.styleId === null ? null : byId(styles, anchor.styleId);
      const constraint = anchor.constraintId === null ? null : byId(constraints, anchor.constraintId);

      expect(isCompatible(template, medium, topic, style, constraint)).toBe(true);
      expect(render(template, medium, { topic, style, constraint })).toEqual({
        ok: true,
        brief: expected.brief,
        guidance: null,
      });
      expect(expected.brief.length).toBeLessThanOrEqual(160);
    });
  }

  it("gives anchors 1 and 2 no Style", () => {
    expect(anchorForTemplate("tpl.observation.explore.nearby-object").styleId).toBeNull();
    expect(anchorForTemplate("tpl.expression.experiment.coming-home").styleId).toBeNull();
  });

  it("has unique ids within each anchors file", () => {
    for (const list of [templates, topics, styles, constraints]) {
      const ids = list.map((e) => e.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("has no retired anchor entity", () => {
    const all = [...templates, ...topics, ...styles, ...constraints];
    expect(all.filter((e) => e.retired).map((e) => e.id)).toEqual([]);
  });

  it("resolves every tag-shaped entry in template.incompatible in tags.json", () => {
    const known = new Set(tags.map((t) => t.id));
    const idPrefixes = ["top.", "sty.", "con."];
    const unknown = templates.flatMap((t) =>
      t.incompatible.filter((entry) => !idPrefixes.some((p) => entry.startsWith(p)) && !known.has(entry)),
    );
    expect(unknown).toEqual([]);
  });

  it("resolves every tag used by anchor Templates, fills, and Mediums in tags.json", () => {
    const known = new Set(tags.map((t) => t.id));
    const used = [
      ...templates.flatMap((t) => [...t.topicTags, ...t.styleTags, ...t.constraintTags, ...t.tags]),
      ...[...topics, ...styles, ...constraints].flatMap((f) => [...f.tags, ...f.requires, ...f.excludes]),
      ...mediums.flatMap((m) => m.tags),
    ];
    const unknown = used.filter((t) => !known.has(t));
    expect(unknown).toEqual([]);
  });

  it("rejects con.no-people when the Topic carries the person trait", () => {
    const template = byId(templates, "tpl.expression.experiment.coming-home");
    const medium = byId(mediums, "med.photography");
    const constraint = byId(constraints, "con.no-people");
    const topicWithPerson = { ...byId(topics, "top.coming-home"), tags: ["place", "person"] };
    expect(isCompatible(template, medium, topicWithPerson, null, constraint)).toBe(false);
  });
});
