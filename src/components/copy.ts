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
    emailSignupPitch: "Occasional emails when there's something new. Unsubscribe any time.",
  },
} as const;

export type Copy = typeof copy;
