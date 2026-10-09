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
    ],
  },
} as const;

export type GateConfig = typeof gateConfig;
