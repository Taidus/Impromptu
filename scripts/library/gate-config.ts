// Build-tooling-only tunables for the library hard gate (scripts/library/validate.ts,
// and later scripts/library/build.ts). Deliberately separate from src/config/app.ts:
// that module ships into the client bundle, and these word lists never should.
export const gateConfig = {
  brief: {
    // Cross-Document Resolution 1: the 160-char cap lives here, not in a code branch.
    maxChars: 160,
    minSentences: 1,
    maxSentences: 3,
  },
  lint: {
    // CL-4: a Style describes a treatment. Flag ones phrased as a rule.
    styleRuleStartWords: ["no", "only", "must", "without"],
    // ponytail: starter count-word list; a bare digit is also checked. Extend here if a
    // batch's Style names a count this list misses.
    styleCountWords: ["one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"],
    // CL-4: a Constraint describes a rule. Flag ones phrased as a bare mood/treatment word.
    // ponytail: starter list, not exhaustive — grow it as the lint lets a real violation through.
    constraintMoodWords: [
      "minimalist",
      "moody",
      "dreamy",
      "whimsical",
      "nostalgic",
      "gritty",
      "vibrant",
      "melancholic",
      "cheerful",
      "somber",
      "cozy",
      "eerie",
      "serene",
      "chaotic",
      "elegant",
      "rustic",
      "retro",
      "futuristic",
      "soft",
    ],
    // Words that only intensify a mood word ("very moody") rather than add a separate
    // claim; a phrase made of only these plus mood words plus "and"/"or" still lints.
    moodIntensifiers: ["very", "so", "quite", "really", "extremely", "incredibly", "somewhat", "slightly"],
  },
  // Story 1.7 (AD-16/CL-2): reachability — at least this many valid Template x Medium x
  // fill combinations per active Template (a combination counts only once its Brief passes
  // every brief.* rule). The three CL-5 anchor Templates (anchors/-sourced Templates whose
  // ids are named in content/library/anchors/anchors.json) are exempt: each intentionally admits
  // only its own pinned fill, and the byte-for-byte anchor check pins them instead.
  reachability: {
    minCombinations: 3,
  },
  // Story 1.7 (CL-3/FR-6): coverage and repeat headroom. `enforce` starts false because the
  // library can't reach launch coverage until Epic 2 completes and the app must build in
  // the meantime; Story 2.8 switches it on. Below enforce, shortfalls are warnings only.
  coverage: {
    // Widened to `boolean` (not narrowed by `as const`) so tests can override it in a
    // config object literal, e.g. `{ ...gateConfig.coverage, enforce: true }`.
    enforce: false as boolean,
    minTemplatesPerCell: 2, // Skill x Level x Medium
    minComboPerLevelMedium: 60, // Level x Medium, Skill random (repeat headroom)
    // Skill-focused (single-Skill setup) headroom — always a warning, never a failure,
    // regardless of `enforce`: a single Skill is allowed to be thin pre-launch.
    minComboPerSkillFocusedCell: 31,
  },
  // Story 1.7 (AD-17): batch sizing is always enforced for the batches under review (draft
  // batches only; accepted ones are immutable), regardless of `coverage.enforce`. Counts
  // each active (non-retired) Template once per distinct Medium it declares.
  batchSizing: {
    minTemplatesPerMedium: 3,
  },
} as const;

export type GateConfig = typeof gateConfig;
