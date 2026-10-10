// The one copy map (AR-23). No UI string is ever hardcoded in a component;
// later stories add entries here as they need them. Seeded from
// EXPERIENCE.md -> Voice and Tone: Level one-liners, button labels, and the
// literal state strings from its Do/Don't table.
const levelName = {
  explore: "Explore",
  experiment: "Experiment",
  develop: "Develop",
  perform: "Perform",
} as const;

export const copy = {
  level: {
    explore: "One task, one simple rule.",
    experiment: "Try more than one way in.",
    develop: "Aim for an effect, then revise.",
    perform: "Everything at once. Timed if you want.",
  },
  // Story 6.2: the Rep card's meta row (names, not one-liners -- see `level` above for those).
  levelName,
  // Story 6.2: Practice History Rep card -- the Retry/Variation pill and the Reflection question labels.
  rep: {
    retry: "RETRY",
    variation: "VARIATION",
    worked: "What worked",
    change: "What I'd change",
  },
  skill: {
    observation: "Notice what's actually there.",
    ideaGeneration: "Come up with many options, fast.",
    connection: "Join things that don't belong together.",
    perspective: "See it from somewhere else.",
    expression: "Make a feeling land.",
    revision: "Change it on purpose.",
  },
  // Story 3.7: Setup page section 01 (header, headline, Difficulty Dial,
  // Perform timing). Mediums/Skill/Quick reveal/Get a challenge (Story 3.8)
  // add their own strings here later.
  setup: {
    headline: "Make something unexpected.",
    explanation: "Get a creative challenge. Make your version. Build your skills.",
    dialLabel: "Level",
    performTimingLegend: "Perform timing",
    loadError: "Setup couldn't load. Reload the page to try again.",
    mediumsLabel: "Mediums",
    thisTimeLabel: "This time",
    skillLabel: "Skill",
    skillInfoLabel: "Skill info",
    quickRevealLabel: "Quick reveal",
    quickRevealOn: "ON",
    quickRevealOff: "OFF",
    randomOption: "Random",
  },
  performTiming: {
    timed: "Timed",
    untimed: "Untimed",
    either: "Either",
  },
  stage: {
    // Visually hidden h1 (EXPERIENCE.md -> Accessibility Floor: Stage's h1 is
    // "Challenge"); the Stage mark itself is decorative (aria-hidden), not a
    // heading.
    h1: "Challenge",
    mark: "impromptu",
    back: "Back to setup",
    soundOffCaption: "SOUND OFF",
    soundOnCaption: "SOUND ON",
    soundOffAnnounced: "Sound, off",
    soundOnAnnounced: "Sound, on",
    // Level/mode meta line (DESIGN.md -> Layout, "the Level and mode meta").
    // Keyed by src/domain/library/schema's Level enum; "mode" is derived from
    // a held Challenge's timeLimitSec (Perform's Timed/Untimed/Either setup
    // choice resolves to one or the other per generated Challenge).
    levelName,
    mode: {
      timed: "TIMED",
      untimed: "UNTIMED",
    },
    // Short, cause-naming, no-penalty-language message (EXPERIENCE.md ->
    // Voice and Tone) for when the store or library fails to load.
    loadError: "Couldn't load a challenge right now. Try reloading the page.",
    // new_challenge failed (session.lastComposeError). Lock-specific copy and
    // the unlock action arrive with the Lock stories; this covers every case.
    composeError: "No challenge fits this setup yet. Change your setup and try again.",
    // Story 3.10: the five reveal pieces' visible label and screen-reader
    // name (DESIGN.md -> Components -> "On the Stage"; EXPERIENCE.md ->
    // Accessibility Floor). Sentence case here -- the visible chip/scrap
    // label is uppercased with CSS (`uppercase`), the same way stageMeta's
    // "Explore" is uppercased visually without changing the DOM text.
    piece: {
      skill: "Skill",
      medium: "Medium",
      topic: "Topic",
      style: "Style",
      constraint: "Constraint",
    },
    // The reveal pieces' aria-label (EXPERIENCE.md -> Accessibility Floor:
    // "The pieces are a list labeled 'Challenge inputs'.").
    inputsListLabel: "Challenge inputs",
    // Quick reveal's one-shot announcement opener (EXPERIENCE.md ->
    // Accessibility Floor).
    challengeReady: "Challenge ready.",
    // Empty slot screen-reader text, joined as "{piece}, not revealed yet."
    // (EXPERIENCE.md -> Component Patterns -> Empty slot).
    notRevealedYet: "not revealed yet.",
  },
  button: {
    getAChallenge: "Get a challenge",
    revealNext: "Reveal next",
    startCreating: "Start creating",
    finishRep: "Finish rep",
    tryAnotherVersion: "Try another version",
    retry: "Retry",
    saveRep: "Save rep",
    reroll: "Reroll",
    discard: "Discard",
    resume: "Resume",
    pause: "Pause",
    changeItAgain: "Change it again",
    backToYourChallenge: "Back to your challenge",
    keepMyData: "Keep my data",
    clearEverything: "Clear everything",
    // Story 6.4: the Practice History export control.
    export: "Export",
  },
  state: {
    timesUp: "Time's up. Finish when you're ready.",
    repSaved: "Rep saved.",
    reflectionSaved: "Reflection saved.",
    keepAtLeastOneMediumOn: "Keep at least one medium on.",
    progressSavedInBrowserOnly: "Your progress is saved in this browser only.",
    challengeInProgress: "You have a challenge in progress.",
    nothingHereYet: "Nothing here yet.",
    practiceMapDisclaimer: "Counts show what you've practiced, not how good it was.",
    // Story 6.4: announced after the export download fires.
    exported: "Exported.",
    exportFailed: "Export failed.",
  },
  // Story 3.11: Setup's Notice banner (DESIGN.md -> Components -> Notice
  // banner). More than one can show at once -- see activeNoticeBanners.
  notice: {
    challengeWaiting: "Your challenge is waiting.",
    storageUnavailable: "This browser isn't saving data, so your history won't be kept. Challenges still work.",
    // Neutral on purpose: migrationFailed covers setup, session, and history, not just reps.
    // Orchestrator placeholder -- final copy is the founder's.
    migrationFailed: "Some older saved data couldn't be read. It's still stored.",
  },
  // Story 6.1: the Practice page shell (empty and storage-unavailable states).
  practice: {
    title: "Practice",
    loading: "Loading your practice…",
    storageUnavailable: "This browser isn't saving data, so there's no history to show.",
    // Story 6.2: visually hidden h2 above the Rep card list.
    historyTitle: "Practice history",
    // Story 6.3: the Practice Map's three group labels (table captions).
    mapGroups: { skill: "Skill", medium: "Medium", level: "Level" },
  },
  privacy: {
    title: "privacy.",
    lede: "What this site keeps, where it lives, and how to leave.",
    sections: [
      {
        heading: "Your practice stays here",
        body: "Challenges, attempts and reps are saved in this browser only. Nothing about your practice is sent anywhere.",
      },
      {
        heading: "No tracking",
        body: "There is no analytics and no tracking. The site loads nothing from third parties.",
      },
      {
        heading: "Email, only if you ask",
        body: "The only personal data is an email address you opt in to. It is held by Resend, our email provider, together with the time you consented and the version of the consent text you saw.",
      },
      {
        heading: "What the emails are",
        body: "Occasional updates when there is something new. Every email has an unsubscribe link.",
      },
      {
        heading: "Leaving",
        body: "Unsubscribe from any email, or ask us to erase your address and we delete the contact in Resend.",
      },
    ],
    contactLead: "Erasure requests:",
    // Working address; the founder confirms it in the Story 7.4 launch checklist (see deferred-work.md).
    contactEmail: "hello@impromptu.app",
  },
  // Story 8.1: the Setup journey (sections 02-04) and the night footer.
  // Working copy for the three-line meta stacks per the spec's Design
  // Notes; the founder may replace it later.
  journey: {
    whatsInAChallenge: {
      eyebrow: "02 — IMPROMPTU",
      title: "what's in a challenge.",
      meta: ["inputs · levels · brief", "one challenge", "every time"] as const,
    },
    fourLevels: {
      eyebrow: "03 — IMPROMPTU",
      title: "four levels, all open.",
      meta: ["explore · experiment", "develop · perform", "all open"] as const,
    },
    // 04's own headline is the y2k-display line below (not a SectionHeader);
    // this meta stack is kept only because Design Notes ask for it.
    closing: "reveal. make. again.",
    inputs: {
      skill: "SKILL",
      medium: "MEDIUM",
      topic: "TOPIC",
      constraint: "CONSTRAINT",
      brief: "BRIEF",
    },
    // Story 8.2: title is the figcaption word; alt is the poster artwork's
    // own alt text (the title alone doesn't describe the image).
    posters: {
      reveal: {
        title: "reveal.",
        alt: "A blue eye inside a gold-edged triangle, set against a pink moon, UFOs and a shooting star, above teal mountains.",
      },
      make: {
        title: "make.",
        alt: "Two glowing blue hands reaching toward each other, fingertips almost touching, on a blue-to-magenta gradient.",
      },
      reflect: {
        title: "reflect.",
        alt: "A dark red dahlia, an apple, mushrooms and a starry glass orb, with a full moon and rainbow behind.",
      },
    },
    footer: {
      practice: "Practice",
      privacy: "Privacy",
      wordmark: "impromptu",
    },
  },
  // Story 8.3: the Motion toggle (WCAG 2.2.2 / UX-DR10).
  motion: {
    on: "MOTION ON",
    off: "MOTION OFF",
    reducedTitle: "Your system asks for reduced motion, so ambient motion stays off.",
  },
  signup: {
    emailLabel: "Email",
    // This is the consent text whose version is config.signup.consentTextVersion: bump that when this line changes.
    consent: "Occasional emails when there's something new. Unsubscribe any time.",
    privacyLink: "Privacy note",
    opensInNewTab: "(opens in new tab)",
    honeypotLabel: "Website",
    submit: "Sign up",
    submitting: "Signing up…",
    success: "You're on the list.",
    errors: {
      invalid_email: "That email doesn't look right.",
      consent_required: "Tick the box to confirm you want emails.",
      rate_limited: "Too many tries. Wait a minute and try again.",
      unavailable: "Couldn't sign you up just now. Try again in a moment.",
      offline: "You're offline. Try again when you're connected.",
    },
  },
} as const;

export type Copy = typeof copy;
