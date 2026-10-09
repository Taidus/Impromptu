import { z } from "zod";

// Lowercase kebab slug: "a", "a-b", "a1-b2".
const SLUG = "[a-z0-9]+(?:-[a-z0-9]+)*";
const LEVEL = "explore|experiment|develop|perform";

const idSchema = (pattern: string, kind: string) =>
  z.string().regex(new RegExp(`^${pattern}$`), `Invalid ${kind} id`);

export const Level = z.enum(["explore", "experiment", "develop", "perform"]);
export type Level = z.infer<typeof Level>;

export const SkillId = idSchema(`skl\\.${SLUG}`, "Skill");
export const MediumId = idSchema(`med\\.${SLUG}`, "Medium");
export const TemplateId = idSchema(`tpl\\.${SLUG}\\.(?:${LEVEL})\\.${SLUG}`, "Template");
export const TopicId = idSchema(`top\\.${SLUG}`, "Topic");
export const StyleId = idSchema(`sty\\.${SLUG}`, "Style");
export const ConstraintId = idSchema(`con\\.${SLUG}`, "Constraint");
export const TagId = idSchema(SLUG, "Tag");
export type SkillId = z.infer<typeof SkillId>;
export type MediumId = z.infer<typeof MediumId>;
export type TemplateId = z.infer<typeof TemplateId>;
export type TopicId = z.infer<typeof TopicId>;
export type StyleId = z.infer<typeof StyleId>;
export type ConstraintId = z.infer<typeof ConstraintId>;
export type TagId = z.infer<typeof TagId>;

/** Ids a batch can declare (manifest retire, edits, rejectedIds). Skills and Mediums are base data, never in batches. */
export const EntityId = z.union([TemplateId, TopicId, StyleId, ConstraintId]);
export type EntityId = z.infer<typeof EntityId>;

const text = z.string().trim().min(1);
const tagList = z.array(TagId).default([]);

export const Tag = z.object({ id: TagId, description: text }).strict();
export type Tag = z.infer<typeof Tag>;

export const Skill = z.object({ id: SkillId, revealText: text, info: text, tags: tagList }).strict();
export type Skill = z.infer<typeof Skill>;

export const Medium = z.object({ id: MediumId, revealText: text, info: text, tags: tagList }).strict();
export type Medium = z.infer<typeof Medium>;

const fill = <T extends z.ZodString>(id: T) =>
  z
    .object({
      id,
      revealText: text,
      briefText: text,
      tags: tagList,
      requires: tagList,
      excludes: tagList,
      retired: z.boolean().optional(),
    })
    .strict();

export const Topic = fill(TopicId);
export const Style = fill(StyleId);
export const Constraint = fill(ConstraintId);
export type Topic = z.infer<typeof Topic>;
export type Style = z.infer<typeof Style>;
export type Constraint = z.infer<typeof Constraint>;

export const Template = z
  .object({
    id: TemplateId,
    skill: SkillId,
    level: Level,
    mediums: z.array(MediumId).min(1),
    briefPattern: z.union([text, z.record(MediumId, text)]),
    topicTags: z.array(TagId),
    styleTags: z.array(TagId),
    constraintTags: z.array(TagId),
    incompatible: z.array(z.union([TopicId, StyleId, ConstraintId, TagId])).default([]),
    tags: tagList,
    timeLimitSec: z.number().int().positive().optional(),
    guidance: text.optional(),
    retired: z.boolean().optional(),
  })
  .strict()
  .superRefine((t, ctx) => {
    const fail = (path: string, message: string) =>
      ctx.addIssue({ code: "custom", path: [path], message: `${t.id}: ${message}` });
    const [, skillSlug, level] = t.id.split(".");
    if (TemplateId.safeParse(t.id).success) {
      if (`skl.${skillSlug}` !== t.skill) fail("id", `id skill segment does not match skill "${t.skill}"`);
      if (level !== t.level) fail("id", `id level segment does not match level "${t.level}"`);
    }
    if (t.timeLimitSec !== undefined && t.level !== "perform")
      fail("timeLimitSec", "timeLimitSec is only allowed at the perform level");
    if (t.guidance !== undefined && t.level !== "explore")
      fail("guidance", "guidance is only allowed at the explore level");
    if (typeof t.briefPattern === "object")
      for (const key of Object.keys(t.briefPattern))
        if (!t.mediums.includes(key)) fail("briefPattern", `briefPattern key "${key}" is not in mediums`);
  });
export type Template = z.infer<typeof Template>;

export const Anchor = z
  .object({
    templateId: TemplateId,
    mediumId: MediumId,
    topicId: TopicId,
    styleId: StyleId.nullable(),
    constraintId: ConstraintId.nullable(),
    expectedBrief: text,
  })
  .strict();
export type Anchor = z.infer<typeof Anchor>;

export const BatchManifest = z
  .object({
    status: z.enum(["draft", "accepted"]),
    generator: z.object({ tool: text, model: text, promptVersion: text }).strict(),
    rubricVersion: text,
    review: z
      .object({
        judge: text,
        founderSample: z.number().int().nonnegative(),
        rejectedIds: z.array(EntityId),
        date: z.iso.date(),
      })
      .strict()
      .nullable(),
    edits: z.array(z.object({ id: EntityId, note: text }).strict()).default([]),
    retire: z.array(EntityId).default([]),
  })
  .strict()
  .refine((m) => (m.status === "accepted") === (m.review !== null), {
    path: ["review"],
    message: "review is required when accepted and must be null when draft",
  });
export type BatchManifest = z.infer<typeof BatchManifest>;
