import { describe, expect, it } from "vitest";
import { z } from "zod";
import { Medium, Skill, Tag } from "../../src/domain/library/schema";
import mediumsJson from "../../content/library/mediums.json";
import skillsJson from "../../content/library/skills.json";
import tagsJson from "../../content/library/tags.json";

const tags = z.array(Tag).parse(tagsJson);
const skills = z.array(Skill).parse(skillsJson);
const mediums = z.array(Medium).parse(mediumsJson);

describe("base library data", () => {
  it("has six Skills and four Mediums", () => {
    expect(skills).toHaveLength(6);
    expect(mediums).toHaveLength(4);
  });

  it("has unique ids across tags, Skills, and Mediums", () => {
    const ids = [...tags, ...skills, ...mediums].map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("resolves every Skill and Medium tag to tags.json", () => {
    const known = new Set(tags.map((t) => t.id));
    const unknown = [...skills, ...mediums].flatMap((e) =>
      e.tags.filter((t) => !known.has(t)).map((t) => `${e.id}: ${t}`),
    );
    expect(unknown).toEqual([]);
  });
});
