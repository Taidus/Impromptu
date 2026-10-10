// The only source of tunables (AD-19). Nothing else holds magic numbers.
export const config = {
  generator: { recentWindow: 30 },
  reveal: {
    quickMaxMs: 1000,
    order: ["skill", "medium", "topic", "style", "constraint", "brief"],
    // Story 4.1 / UX-DR22 motion budget: shuffle ~900ms, then land over a
    // material-specific duration; a flick every 350ms keeps candidate swaps
    // at or under 3/s (EXPERIENCE.md -> Photosensitivity). Reduced motion
    // (Story 4.2) always skips the shuffle and commits after `reducedLandMs`
    // (EXPERIENCE.md's 120ms fade budget). These also drive the CSS
    // `animation-duration`s (pieces.tsx sets them as inline CSS variables).
    motion: {
      shuffleMs: 900,
      flickIntervalMs: 350,
      landMs: { skill: 550, medium: 550, topic: 550, style: 420, constraint: 320, brief: 250 },
      reducedLandMs: 120,
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
  // Story 8.4: the <Decor> gate and 3D hero/shuffle scenes. The canvas
  // fade is CSS-only, so its duration lives in tokens.css (--dur-decor-fade).
  decor: {
    lowPower: { maxDeviceMemoryGb: 4, maxHardwareConcurrency: 4 },
    maxPixelRatio: 1.5,
    hero: { depthPx: 40, depthEaseMs: 900, spinRadPerSec: 0.2 },
    shuffle: { keepOutMarginPx: 48, spinRadPerSec: 2.4, driftPxPerSec: 60, starCount: 10 },
  },
  storage: { schemaVersions: { setup: 1, session: 1, history: 1 } },
  // Version of copy.signup.consent (src/components/copy.ts); bump when that line changes.
  signup: { consentTextVersion: "2026-10-09" },
} as const;

export type AppConfig = typeof config;
