import { config } from "@/config/app";
import type { Setup } from "./schema";

/**
 * A concrete `Setup` built from `config.setup.defaults`. The config's
 * `enabledMediums` sentinel ("all") is resolved to two fixture Medium ids
 * here, since domain schemas have no access to the library's real Medium
 * list (that's a store/library-loader concern, Story 3.6). Shared by
 * schema.test.ts and setup-reducer.test.ts so both exercise the same base
 * Setup.
 */
export const baseSetup: Setup = {
  level: config.setup.defaults.level,
  performTiming: config.setup.defaults.performTiming,
  enabledMediums: ["med.writing", "med.drawing"],
  medium: config.setup.defaults.medium,
  skillFocus: config.setup.defaults.skill,
  quickReveal: config.setup.defaults.quickReveal,
  sound: config.setup.defaults.sound,
  ambientMotion: config.setup.defaults.ambientMotion,
};
