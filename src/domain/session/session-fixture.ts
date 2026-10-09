import type { Challenge, Session } from "./schema";

/** Skill + Medium + Topic only (no Style, no Constraint) -- matches schema.test.ts's fixture shape. */
export const baseChallenge: Challenge = {
  id: "123e4567-e89b-42d3-a456-426614174000",
  createdAt: "2026-10-09T12:00:00.000Z",
  libraryVersion: "abc123",
  templateId: "tpl.observation.explore.near-object",
  level: "explore",
  timeLimitSec: null,
  brief: "Draw an object near you.",
  guidance: null,
  inputs: {
    skill: { id: "skl.observation", revealText: "Observation" },
    medium: { id: "med.drawing", revealText: "Drawing" },
    topic: { id: "top.near-object", revealText: "An object near you" },
  },
  origin: { kind: "new", fromRepId: null },
};

/** Every Input kind present, for the Quick reveal full-order case. */
export const fullChallenge: Challenge = {
  ...baseChallenge,
  inputs: {
    ...baseChallenge.inputs,
    style: { id: "sty.minimal", revealText: "Minimal" },
    constraint: { id: "con.one-color", revealText: "One color only" },
  },
};

export const noneSession: Session = {
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

export const heldSession: Session = {
  ...noneSession,
  state: "held",
  challenge: baseChallenge,
};

const baseAttempt = { startedAt: 0, pausedAt: null, pausedTotalMs: 0, timeLimitSec: null };

/** Out-of-scope states (Story 3.4 only models None/Held) -- used to verify challenge_committed, compose_failed, and reveal_next are no-ops everywhere else. */
export const attemptSession: Session = {
  ...heldSession,
  state: "attempt",
  attempt: baseAttempt,
};

export const finishedSession: Session = {
  ...attemptSession,
  state: "finished",
  lastRepId: "223e4567-e89b-42d3-a456-426614174000",
};

export const savedSession: Session = {
  ...finishedSession,
  state: "saved",
  attempt: null,
  reflectionDraft: { worked: "", change: "" },
};
