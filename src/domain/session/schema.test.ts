import { describe, expect, it } from "vitest";
import { config } from "@/config/app";
import { Challenge, Export, Rep, Session, Setup } from "./schema";

const setup: Setup = {
  level: "explore",
  performTiming: "either",
  enabledMediums: ["med.writing", "med.drawing"],
  medium: "random",
  skillFocus: "random",
  quickReveal: false,
  sound: false,
  ambientMotion: true,
};

const challenge: Challenge = {
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

describe("Setup", () => {
  it("parses a valid Setup", () => {
    expect(Setup.safeParse(setup).success).toBe(true);
  });

  it("rejects an empty enabledMediums list", () => {
    expect(Setup.safeParse({ ...setup, enabledMediums: [] }).success).toBe(false);
  });
});

describe("Challenge", () => {
  it("parses with an omitted slot (no style, no constraint)", () => {
    expect(Challenge.safeParse(challenge).success).toBe(true);
  });

  it("rejects an unknown input kind", () => {
    const withExtra = { ...challenge, inputs: { ...challenge.inputs, bogus: { id: "x", revealText: "x" } } };
    expect(Challenge.safeParse(withExtra).success).toBe(false);
  });
});

describe("Rep", () => {
  const rep: Rep = {
    id: "223e4567-e89b-42d3-a456-426614174000",
    challenge,
    finishedAt: "2026-10-09T12:05:00.000Z",
    timeUsedSec: null,
    reflection: null,
  };

  it("accepts a null reflection", () => {
    expect(Rep.safeParse(rep).success).toBe(true);
  });

  it("accepts empty reflection fields (no penalty for skipping)", () => {
    const r = { ...rep, reflection: { worked: "", change: "" } };
    expect(Rep.safeParse(r).success).toBe(true);
  });

  it("rejects a reflection field over config.reflection.maxChars", () => {
    const tooLong = "x".repeat(config.reflection.maxChars + 1);
    const r = { ...rep, reflection: { worked: tooLong, change: "" } };
    expect(Rep.safeParse(r).success).toBe(false);
  });
});

describe("Session", () => {
  it("parses a fresh None-state session", () => {
    const session = {
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
    expect(Session.safeParse(session).success).toBe(true);
  });

  it("rejects an unrecognized lock kind", () => {
    const session = {
      state: "none",
      challenge: null,
      revealed: [],
      locks: { bogus: "x" },
      attempt: null,
      reflectionDraft: null,
      lastRepId: null,
      lastComposeError: null,
      recent: [],
    };
    expect(Session.safeParse(session).success).toBe(false);
  });
});

describe("Export", () => {
  it("parses an export of zero or more Reps", () => {
    const exported = { app: "impromptu", exportVersion: 1, exportedAt: "2026-10-09T12:05:00.000Z", reps: [] };
    expect(Export.safeParse(exported).success).toBe(true);
  });
});
