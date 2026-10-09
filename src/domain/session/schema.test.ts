import { describe, expect, it } from "vitest";
import { config } from "@/config/app";
import { baseSetup } from "./setup-fixture";
import { Attempt, Challenge, ComposeError, Export, Origin, Rep, Session, Setup } from "./schema";

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
  it("parses the config.setup.defaults-derived fixture", () => {
    expect(Setup.safeParse(baseSetup).success).toBe(true);
  });

  it("rejects an empty enabledMediums list", () => {
    expect(Setup.safeParse({ ...baseSetup, enabledMediums: [] }).success).toBe(false);
  });

  it("rejects duplicate ids in enabledMediums", () => {
    const r = Setup.safeParse({ ...baseSetup, enabledMediums: ["med.writing", "med.writing"] });
    expect(r.success).toBe(false);
  });

  it('rejects a medium that is not "random" or enabled', () => {
    const r = Setup.safeParse({ ...baseSetup, enabledMediums: ["med.writing"], medium: "med.drawing" });
    expect(r.success).toBe(false);
  });

  it('accepts medium "random" regardless of enabledMediums', () => {
    expect(Setup.safeParse({ ...baseSetup, medium: "random" }).success).toBe(true);
  });

  it("accepts a medium that is enabled", () => {
    expect(Setup.safeParse({ ...baseSetup, medium: "med.writing" }).success).toBe(true);
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

  it("rejects a missing skill input", () => {
    const inputs = { medium: challenge.inputs.medium, topic: challenge.inputs.topic };
    expect(Challenge.safeParse({ ...challenge, inputs }).success).toBe(false);
  });

  it("rejects a missing medium input", () => {
    const inputs = { skill: challenge.inputs.skill, topic: challenge.inputs.topic };
    expect(Challenge.safeParse({ ...challenge, inputs }).success).toBe(false);
  });
});

describe("Origin", () => {
  it("accepts new with a null fromRepId", () => {
    expect(Origin.safeParse({ kind: "new", fromRepId: null }).success).toBe(true);
  });

  it("accepts retry with a uuid fromRepId", () => {
    expect(
      Origin.safeParse({ kind: "retry", fromRepId: "123e4567-e89b-42d3-a456-426614174000" }).success,
    ).toBe(true);
  });

  it("rejects new with a non-null fromRepId", () => {
    expect(Origin.safeParse({ kind: "new", fromRepId: "123e4567-e89b-42d3-a456-426614174000" }).success).toBe(
      false,
    );
  });

  it("rejects retry with a null fromRepId", () => {
    expect(Origin.safeParse({ kind: "retry", fromRepId: null }).success).toBe(false);
  });
});

describe("Attempt", () => {
  const attempt = { startedAt: 1000, pausedAt: null, pausedTotalMs: 0, timeLimitSec: 300 };

  it("parses a valid Attempt", () => {
    expect(Attempt.safeParse(attempt).success).toBe(true);
  });

  it("rejects a negative pausedTotalMs", () => {
    expect(Attempt.safeParse({ ...attempt, pausedTotalMs: -1 }).success).toBe(false);
  });
});

describe("ComposeError", () => {
  it("parses a valid ComposeError with a blockingLock", () => {
    expect(ComposeError.safeParse({ reason: "no_compatible", blockingLock: "topic" }).success).toBe(true);
  });

  it("rejects an unknown blockingLock kind", () => {
    expect(ComposeError.safeParse({ reason: "no_compatible", blockingLock: "bogus" }).success).toBe(false);
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

  it("accepts a reflection field longer than config.reflection.maxChars (persisted data outlives a lowered cap)", () => {
    const tooLongForInput = "x".repeat(config.reflection.maxChars + 1);
    const r = { ...rep, reflection: { worked: tooLongForInput, change: "" } };
    expect(Rep.safeParse(r).success).toBe(true);
  });
});

const sessionBase = {
  state: "none" as const,
  challenge: null,
  revealed: [] as string[],
  locks: {},
  attempt: null,
  reflectionDraft: null,
  lastRepId: null,
  lastComposeError: null,
  recent: [] as string[],
};

describe("Session", () => {
  it("parses a fresh None-state session", () => {
    expect(Session.safeParse(sessionBase).success).toBe(true);
  });

  it("parses a Held session (challenge, no attempt)", () => {
    const held = { ...sessionBase, state: "held", challenge };
    expect(Session.safeParse(held).success).toBe(true);
  });

  it("parses an Attempt session (challenge and attempt)", () => {
    const attempt = { startedAt: 0, pausedAt: null, pausedTotalMs: 0, timeLimitSec: null };
    const inAttempt = { ...sessionBase, state: "attempt", challenge, attempt };
    expect(Session.safeParse(inAttempt).success).toBe(true);
  });

  it("rejects None with a held challenge", () => {
    expect(Session.safeParse({ ...sessionBase, state: "none", challenge }).success).toBe(false);
  });

  it("rejects Held with no challenge", () => {
    expect(Session.safeParse({ ...sessionBase, state: "held", challenge: null }).success).toBe(false);
  });

  it("rejects Attempt with no attempt", () => {
    expect(Session.safeParse({ ...sessionBase, state: "attempt", challenge, attempt: null }).success).toBe(false);
  });

  it("rejects an unrecognized lock kind", () => {
    expect(Session.safeParse({ ...sessionBase, locks: { bogus: "x" } }).success).toBe(false);
  });

  it("rejects a lock value that doesn't match its kind's id pattern", () => {
    expect(Session.safeParse({ ...sessionBase, locks: { skill: "not-an-id" } }).success).toBe(false);
  });

  it("accepts a lock value matching its kind's id pattern", () => {
    expect(Session.safeParse({ ...sessionBase, locks: { skill: "skl.observation" } }).success).toBe(true);
  });

  it("rejects duplicate kinds in revealed", () => {
    expect(Session.safeParse({ ...sessionBase, revealed: ["skill", "skill"] }).success).toBe(false);
  });

  it("trims recent to the newest config.generator.recentWindow entries", () => {
    const recent = Array.from({ length: config.generator.recentWindow + 10 }, (_, i) => `tpl.x.explore.y+top.${i}`);
    const r = Session.safeParse({ ...sessionBase, recent });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.recent).toHaveLength(config.generator.recentWindow);
      expect(r.data.recent).toEqual(recent.slice(-config.generator.recentWindow));
    }
  });
});

describe("Export", () => {
  const rep = {
    id: "223e4567-e89b-42d3-a456-426614174000",
    challenge,
    finishedAt: "2026-10-09T12:05:00.000Z",
    timeUsedSec: null,
    reflection: null,
  };

  it("parses an export of zero or more Reps", () => {
    const exported = { app: "impromptu", exportVersion: 1, exportedAt: "2026-10-09T12:05:00.000Z", reps: [] };
    expect(Export.safeParse(exported).success).toBe(true);
  });

  it("rejects duplicate Rep ids", () => {
    const exported = {
      app: "impromptu",
      exportVersion: 1,
      exportedAt: "2026-10-09T12:05:00.000Z",
      reps: [rep, rep],
    };
    expect(Export.safeParse(exported).success).toBe(false);
  });
});
