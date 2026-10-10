import type { Medium, MediumId, Skill } from "@/domain/library/schema";

export interface SelectOption {
  value: string;
  label: string;
}

export const RANDOM_VALUE = "random";

/**
 * EXPERIENCE.md -> Component Patterns -> Select field: "This time" lists
 * Random plus each enabled Medium, in the library's own order (not
 * `enabledMediums`'s insertion order, which reorders as chips toggle).
 */
export function mediumSelectOptions(
  mediums: readonly Medium[],
  enabledMediums: readonly MediumId[],
  randomLabel: string,
): SelectOption[] {
  const enabled = new Set<MediumId>(enabledMediums);
  return [
    { value: RANDOM_VALUE, label: randomLabel },
    ...mediums.filter((medium) => enabled.has(medium.id)).map((medium) => ({ value: medium.id, label: medium.revealText })),
  ];
}

/**
 * EXPERIENCE.md -> Component Patterns -> Select field: Skill lists Random
 * plus the six Skills, in the library's order.
 */
export function skillSelectOptions(skills: readonly Skill[], randomLabel: string): SelectOption[] {
  return [{ value: RANDOM_VALUE, label: randomLabel }, ...skills.map((skill) => ({ value: skill.id, label: skill.revealText }))];
}
