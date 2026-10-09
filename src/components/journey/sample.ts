// Resolves the static Setup (02) sample — CL-5 anchor 2 (Expression /
// Photography / "Coming home" / No people, no Style) — and the six Skills
// list, from the library's static JSON content.
//
// content/library/ lives outside src/ and has no @/ alias, and the
// cross-directory import boundary (eslint.config.mjs) bans any "../"
// import from src/, so this reads the files from disk at module-load time
// instead of a static `import … from ".json"`. It is still build-time
// only: this module is read only by Server Components (never a Client
// Component), so the read happens once during `next build`.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { render } from "@/domain/library/render";
import { copy } from "@/components/copy";
import type { Constraint, Medium, Skill, Style, Template, Topic } from "@/domain/library/schema";

interface AnchorRow {
  templateId: string;
  mediumId: string;
  topicId: string;
  styleId: string | null;
  constraintId: string | null;
  expectedBrief: string;
}

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const readJson = <T>(relativePath: string): T => JSON.parse(readFileSync(join(ROOT, relativePath), "utf8")) as T;

const anchors = readJson<AnchorRow[]>("content/library/anchors/anchors.json");
const templates = readJson<Template[]>("content/library/anchors/templates.json");
const topics = readJson<Topic[]>("content/library/anchors/topics.json");
const constraints = readJson<Constraint[]>("content/library/anchors/constraints.json");
const styles = readJson<Style[]>("content/library/anchors/styles.json");
const mediums = readJson<Medium[]>("content/library/mediums.json");
const skills = readJson<Skill[]>("content/library/skills.json");

function find<T extends { id: string }>(list: T[], id: string): T {
  const found = list.find((item) => item.id === id);
  if (!found) throw new Error(`Setup sample: no library entry for id "${id}"`);
  return found;
}

export interface SetupSample {
  skill: string;
  medium: string;
  topic: string;
  constraint: string;
  brief: string;
}

// Anchor index 1 is CL-5 anchor 2 (anchors.json's second row). Its Style is
// null today, so SetupSample has no Style field, but a non-null styleId is
// still resolved and rendered.
export function resolveSetupSample(): SetupSample {
  const anchor = anchors[1];
  if (!anchor) throw new Error("Setup sample: anchors.json has no second row (CL-5 anchor 2)");
  if (anchor.constraintId === null) throw new Error("Setup sample: CL-5 anchor 2 has no constraintId");
  const template = find(templates, anchor.templateId);
  const medium = find(mediums, anchor.mediumId);
  const topic = find(topics, anchor.topicId);
  const constraint = find(constraints, anchor.constraintId);
  const style = anchor.styleId === null ? null : find(styles, anchor.styleId);
  const skill = find(skills, template.skill);

  const rendered = render(template, medium, { topic, style, constraint });
  if (!rendered.ok) throw new Error(`Setup sample failed to render: ${rendered.reason}`);

  return {
    skill: skill.revealText,
    medium: medium.revealText,
    topic: topic.revealText,
    constraint: constraint.revealText,
    brief: rendered.brief,
  };
}

export interface SkillListing {
  id: string;
  name: string;
  description: string;
}

/** The six Skills in content/library/skills.json order, each with its copy.skill description. */
export function listSkills(): SkillListing[] {
  return skills.map((s) => {
    // "skl.idea-generation" -> "ideaGeneration", matching copy.skill's keys.
    const key = s.id.replace(/^skl\./, "").replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
    const description = (copy.skill as Record<string, string | undefined>)[key];
    if (description === undefined) throw new Error(`Setup sample: no copy.skill description for "${s.id}"`);
    return { id: s.id, name: s.revealText, description };
  });
}
