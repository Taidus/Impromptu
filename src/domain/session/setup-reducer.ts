import type { MediumId, SkillId } from "@/domain/library/schema";
import type { Setup } from "./schema";

export type SetupEvent =
  | { type: "set_level"; level: Setup["level"] }
  | { type: "set_perform_timing"; performTiming: Setup["performTiming"] }
  | { type: "toggle_medium"; mediumId: MediumId }
  | { type: "choose_medium"; medium: MediumId | "random" }
  | { type: "set_skill_focus"; skillFocus: SkillId | "random" }
  | { type: "set_quick_reveal"; quickReveal: boolean }
  | { type: "set_sound"; sound: boolean }
  | { type: "set_ambient_motion"; ambientMotion: boolean };

export type SetupReducerResult = { setup: Setup; notice?: "last_medium" };

/**
 * The AD-7 setup reducer. Pure: no Clock, Random, or storage. Guards the last
 * enabled Medium (FR-2) and falls "This time" back to random when its Medium
 * is disabled (EXPERIENCE.md -> Chip toggle).
 */
export function setupReducer(setup: Setup, event: SetupEvent): SetupReducerResult {
  switch (event.type) {
    case "set_level":
      return { setup: { ...setup, level: event.level } };
    case "set_perform_timing":
      return { setup: { ...setup, performTiming: event.performTiming } };
    case "toggle_medium":
      return toggleMedium(setup, event.mediumId);
    case "choose_medium":
      return chooseMedium(setup, event.medium);
    case "set_skill_focus":
      return { setup: { ...setup, skillFocus: event.skillFocus } };
    case "set_quick_reveal":
      return { setup: { ...setup, quickReveal: event.quickReveal } };
    case "set_sound":
      return { setup: { ...setup, sound: event.sound } };
    case "set_ambient_motion":
      return { setup: { ...setup, ambientMotion: event.ambientMotion } };
    default:
      // Any (state, event) pair outside the known set is a no-op (AD-7);
      // this also guards a runtime event the type system didn't catch.
      return { setup };
  }
}

function toggleMedium(setup: Setup, mediumId: MediumId): SetupReducerResult {
  const isEnabled = setup.enabledMediums.includes(mediumId);
  const distinctEnabledCount = new Set(setup.enabledMediums).size;

  if (isEnabled && distinctEnabledCount === 1) {
    return { setup, notice: "last_medium" };
  }

  const enabledMediums = isEnabled
    ? setup.enabledMediums.filter((id) => id !== mediumId)
    : [...setup.enabledMediums, mediumId];

  const medium = isEnabled && setup.medium === mediumId ? "random" : setup.medium;

  return { setup: { ...setup, enabledMediums, medium } };
}

function chooseMedium(setup: Setup, medium: MediumId | "random"): SetupReducerResult {
  // Never let "This time" name a Medium that isn't enabled (FR-2).
  if (medium !== "random" && !setup.enabledMediums.includes(medium)) {
    return { setup };
  }
  return { setup: { ...setup, medium } };
}
