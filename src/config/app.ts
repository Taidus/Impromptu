// The only source of tunables (AD-19). Nothing else holds magic numbers.
export const config = {
  generator: { recentWindow: 30 },
  reveal: {
    quickMaxMs: 1000,
    order: ["skill", "medium", "topic", "style", "constraint", "brief"],
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
  signup: { consentTextVersion: "2026-10-09" },
} as const;

export type AppConfig = typeof config;
