import { config } from "@/config/app";
import type { ComposeLibrary } from "@/domain/compose/compose";
import { Setup, type Session } from "@/domain/session/schema";

/** Library-independent: valid immediately -- no stored data, no held Challenge, no Attempt. */
export const emptySession: Session = {
  state: "none",
  challenge: null,
  revealed: [],
  locks: {},
  attempt: null,
  reflectionDraft: null,
  lastRepId: null,
  lastComposeError: null,
  recent: [],
};

/**
 * The first-visit `Setup`, resolving `config.setup.defaults.enabledMediums`'s `"all"` sentinel
 * against the loaded library's real Medium ids -- the one piece of the default no domain schema
 * can supply on its own (flagged in `src/domain/session/setup-fixture.ts` as this story's job).
 * Mediums are base data and never retired (AD-6 retires batch entries only), so every library
 * Medium starts enabled (FR-2, AD-19). A default `medium`/`skillFocus` the library doesn't offer
 * falls back to `"random"`. Returns `null` when the result isn't a valid `Setup` (no Medium).
 */
export function buildDefaultSetup(library: ComposeLibrary): Setup | null {
  const enabledMediums = library.mediums.map((m) => m.id);
  const { medium, skill } = config.setup.defaults;
  const parsed = Setup.safeParse({
    level: config.setup.defaults.level,
    performTiming: config.setup.defaults.performTiming,
    enabledMediums,
    medium: (enabledMediums as string[]).includes(medium) ? medium : "random",
    skillFocus: library.skills.some((s) => s.id === skill) ? skill : "random",
    quickReveal: config.setup.defaults.quickReveal,
    sound: config.setup.defaults.sound,
    ambientMotion: config.setup.defaults.ambientMotion,
  });
  return parsed.success ? parsed.data : null;
}
