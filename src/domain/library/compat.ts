import type { Constraint, Medium, Style, Template, Topic } from "./schema";

type Fill = Topic | Style | Constraint;

/**
 * The single AD-4 compatibility check, shared by the validator and compose().
 * A slot is present iff its `<kind>Tags` list is non-empty. All rules come from library data.
 */
export function isCompatible(
  template: Template,
  medium: Medium,
  topic: Topic | null,
  style: Style | null,
  constraint: Constraint | null,
): boolean {
  if (!template.mediums.includes(medium.id)) return false;

  const slots: [string[], Fill | null][] = [
    [template.topicTags, topic],
    [template.styleTags, style],
    [template.constraintTags, constraint],
  ];
  const fills: Fill[] = [];
  for (const [slotTags, fill] of slots) {
    if ((slotTags.length > 0) !== (fill !== null)) return false;
    if (fill === null) continue;
    if (!fill.tags.some((t) => slotTags.includes(t))) return false;
    fills.push(fill);
  }

  const incompatible = new Set(template.incompatible);
  if (fills.some((f) => incompatible.has(f.id))) return false;
  if ([medium, ...fills].some((p) => p.tags.some((t) => incompatible.has(t)))) return false;

  return fills.every((fill) => {
    const others = new Set([
      ...template.tags,
      ...medium.tags,
      ...fills.filter((f) => f !== fill).flatMap((f) => f.tags),
    ]);
    return fill.requires.every((t) => others.has(t)) && !fill.excludes.some((t) => others.has(t));
  });
}
