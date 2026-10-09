// The one copy map (AR-23). No UI string is ever hardcoded in a component;
// later stories add entries here as they need them. Seeded from
// EXPERIENCE.md -> Voice and Tone: Level one-liners, button labels, and the
// literal state strings from its Do/Don't table.
export const copy = {
  level: {
    explore: "One task, one simple rule.",
    experiment: "Try more than one way in.",
    develop: "Aim for an effect, then revise.",
    perform: "Everything at once. Timed if you want.",
  },
  skill: {
    observation: "Notice what's actually there.",
    ideaGeneration: "Come up with many options, fast.",
    connection: "Join things that don't belong together.",
    perspective: "See it from somewhere else.",
    expression: "Make a feeling land.",
    revision: "Change it on purpose.",
  },
  stage: {
    back: "Back to setup",
    soundOffCaption: "SOUND OFF",
    soundOnCaption: "SOUND ON",
    soundOffAnnounced: "Sound, off",
    soundOnAnnounced: "Sound, on",
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
    posters: {
      reveal: "reveal.",
      make: "make.",
      reflect: "reflect.",
    },
    footer: {
      practice: "Practice",
      privacy: "Privacy",
      wordmark: "impromptu",
    },
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
