import type { Medium, MediumId, Skill, SkillId } from "@/domain/library/schema";

export interface SelectOption<T extends string = string> {
  value: T;
  label: string;
}

export const RANDOM_VALUE = "random";
export type Random = typeof RANDOM_VALUE;

/**
 * EXPERIENCE.md -> Component Patterns -> Select field: "This time" lists
 * Random plus each enabled Medium, in the library's own order (not
 * `enabledMediums`'s insertion order, which reorders as chips toggle).
 */
export function mediumSelectOptions(
  mediums: readonly Medium[],
  enabledMediums: readonly MediumId[],
  randomLabel: string,
): SelectOption<MediumId | Random>[] {
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
export function skillSelectOptions(skills: readonly Skill[], randomLabel: string): SelectOption<SkillId | Random>[] {
  return [{ value: RANDOM_VALUE, label: randomLabel }, ...skills.map((skill) => ({ value: skill.id, label: skill.revealText }))];
}

/** A stored id that is no longer an option (e.g. dropped from the library) reads as Random. */
export function optionOrRandom<T extends string>(options: readonly SelectOption<T>[], value: string): T | Random {
  return options.find((option) => option.value === value)?.value ?? RANDOM_VALUE;
}
