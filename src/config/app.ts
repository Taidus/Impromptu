// The only source of tunables (AD-19). Nothing else holds magic numbers.
export const config = {
  generator: { recentWindow: 30 },
  reveal: {
    quickMaxMs: 1000,
    order: ["skill", "medium", "topic", "style", "constraint", "brief"],
    // Story 4.1 / UX-DR22 motion budget: shuffle ~900ms, then land over a
    // material-specific duration; a flick every 350ms keeps candidate swaps
    // at or under 3/s (EXPERIENCE.md -> Photosensitivity). Reduced motion
    // (Story 4.2) always skips the shuffle; landing durations still apply.
    motion: {
      shuffleMs: 900,
      flickIntervalMs: 350,
      landMs: { skill: 550, medium: 550, topic: 550, style: 420, constraint: 320, brief: 250 },
    },
  },
  setup: {
    defaults: {
      level: "explore",
      performTiming: "either",
      enabledMediums: "all",
      medium: "random",
      skill: "random",
      quickReveal: false,
      sound: false,
      ambientMotion: true,
    },
  },
  reflection: { maxChars: 280 },
  storage: { schemaVersions: { setup: 1, session: 1, history: 1 } },
  // Version of copy.signup.consent (src/components/copy.ts); bump when that line changes.
  signup: { consentTextVersion: "2026-10-09" },
} as const;

export type AppConfig = typeof config;
