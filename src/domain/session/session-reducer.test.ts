import { describe, expect, it } from "vitest";
import { config } from "@/config/app";
import {
  attemptSession,
  baseChallenge,
  finishedSession,
  fullChallenge,
  heldSession,
  noneSession,
  savedSession,
} from "./session-fixture";
import { Session } from "./schema";
import type { SessionEvent } from "./session-reducer";
import { sessionReducer } from "./session-reducer";

const quickOff = { quickReveal: false };
const quickOn = { quickReveal: true };

describe("sessionReducer", () => {
  describe("challenge_committed", () => {
    it("None + challenge_committed becomes Held with the new challenge, empty revealed, and the key pushed", () => {
      const result = sessionReducer(
        noneSession,
        { type: "challenge_committed", challenge: baseChallenge, recentKey: "k1" },
        quickOff,
      );
      expect(result.state).toBe("held");
      expect(result.challenge).toBe(baseChallenge);
      expect(result.revealed).toEqual([]);
      expect(result.recent).toEqual(["k1"]);
    });

    it("Held + challenge_committed replaces the challenge and re-empties revealed", () => {
      const held: Session = { ...heldSession, revealed: ["skill", "medium"] };
      const result = sessionReducer(
        held,
        { type: "challenge_committed", challenge: fullChallenge, recentKey: "k2" },
        quickOff,
      );
      expect(result.state).toBe("held");
      expect(result.challenge).toBe(fullChallenge);
      expect(result.revealed).toEqual([]);
      expect(result.recent).toEqual(["k2"]);
    });

    it("None + challenge_committed with Quick reveal on lands every present kind at once, brief last", () => {
      const result = sessionReducer(
        noneSession,
        { type: "challenge_committed", challenge: baseChallenge, recentKey: "k1" },
        quickOn,
      );
      expect(result.revealed).toEqual(["skill", "medium", "topic", "brief"]);
    });

    it("Held + challenge_committed with Quick reveal on lands every present kind at once, brief last", () => {
      const result = sessionReducer(
        heldSession,
        { type: "challenge_committed", challenge: baseChallenge, recentKey: "k1" },
        quickOn,
      );
      expect(result.revealed).toEqual(["skill", "medium", "topic", "brief"]);
    });

    it("Quick reveal on with every kind present lands all five, brief last", () => {
      const result = sessionReducer(
        heldSession,
        { type: "challenge_committed", challenge: fullChallenge, recentKey: "k1" },
        quickOn,
      );
      expect(result.revealed).toEqual(["skill", "medium", "topic", "style", "constraint", "brief"]);
    });

    it("recentKey null (retry) leaves the recent ring unchanged", () => {
      const withRecent = { ...noneSession, recent: ["old-key"] };
      const result = sessionReducer(
        withRecent,
        { type: "challenge_committed", challenge: baseChallenge, recentKey: null },
        quickOff,
      );
      expect(result.recent).toEqual(["old-key"]);
    });

    it("recentKey '' (empty) is never pushed onto the ring", () => {
      const withRecent = { ...noneSession, recent: ["old-key"] };
      const result = sessionReducer(
        withRecent,
        { type: "challenge_committed", challenge: baseChallenge, recentKey: "" },
        quickOff,
      );
      expect(result.recent).toEqual(["old-key"]);
    });

    it("caps the recent ring at config.generator.recentWindow", () => {
      const full = {
        ...noneSession,
        recent: Array.from({ length: config.generator.recentWindow }, (_, i) => `k${i}`),
      };
      const result = sessionReducer(
        full,
        { type: "challenge_committed", challenge: baseChallenge, recentKey: "newest" },
        quickOff,
      );
      expect(result.recent).toHaveLength(config.generator.recentWindow);
      expect(result.recent.at(-1)).toBe("newest");
      expect(result.recent[0]).toBe("k1");
    });

    it("a recent ring already longer than recentWindow is trimmed by the reducer too", () => {
      const overLong = {
        ...noneSession,
        recent: Array.from({ length: config.generator.recentWindow + 5 }, (_, i) => `k${i}`),
      };
      const result = sessionReducer(
        overLong,
        { type: "challenge_committed", challenge: baseChallenge, recentKey: "newest" },
        quickOff,
      );
      expect(result.recent).toHaveLength(config.generator.recentWindow);
      expect(result.recent.at(-1)).toBe("newest");
    });

    it("clears a prior lastComposeError on a successful commit", () => {
      const withError = { ...noneSession, lastComposeError: { reason: "no_compatible", blockingLock: null } };
      const result = sessionReducer(
        withError,
        { type: "challenge_committed", challenge: baseChallenge, recentKey: "k1" },
        quickOff,
      );
      expect(result.lastComposeError).toBeNull();
    });

    it("commit from a Held session with locks and a lastRepId keeps both untouched", () => {
      const held: Session = {
        ...heldSession,
        locks: { skill: "skl.observation" },
        lastRepId: "223e4567-e89b-42d3-a456-426614174000",
      };
      const result = sessionReducer(
        held,
        { type: "challenge_committed", challenge: fullChallenge, recentKey: "k3" },
        quickOff,
      );
      expect(result.locks).toEqual({ skill: "skl.observation" });
      expect(result.lastRepId).toBe("223e4567-e89b-42d3-a456-426614174000");
    });
  });

  describe("compose_failed", () => {
    it("from None keeps state none and sets lastComposeError", () => {
      const result = sessionReducer(
        noneSession,
        { type: "compose_failed", reason: "no_compatible", blockingLock: "topic" },
        quickOff,
      );
      expect(result.state).toBe("none");
      expect(result.lastComposeError).toEqual({ reason: "no_compatible", blockingLock: "topic" });
    });

    it("from Held keeps state held, challenge, and revealed untouched", () => {
      const held: Session = { ...heldSession, revealed: ["skill"] };
      const result = sessionReducer(
        held,
        { type: "compose_failed", reason: "no_compatible", blockingLock: null },
        quickOff,
      );
      expect(result.state).toBe("held");
      expect(result.challenge).toBe(held.challenge);
      expect(result.revealed).toEqual(["skill"]);
      expect(result.lastComposeError).toEqual({ reason: "no_compatible", blockingLock: null });
    });
  });

  describe("reveal_next", () => {
    it("lands the next present kind in config.reveal.order", () => {
      const result = sessionReducer(heldSession, { type: "reveal_next" }, quickOff);
      expect(result.revealed).toEqual(["skill"]);
    });

    it("lands kinds in order across repeated calls, skipping absent kinds, brief last", () => {
      let session = heldSession;
      const landed: string[] = [];
      for (let i = 0; i < 4; i++) {
        session = sessionReducer(session, { type: "reveal_next" }, quickOff);
        landed.push(session.revealed.at(-1) as string);
      }
      expect(landed).toEqual(["skill", "medium", "topic", "brief"]);
    });

    it("is a no-op once every present kind has landed", () => {
      const done: Session = { ...heldSession, revealed: ["skill", "medium", "topic", "brief"] };
      const result = sessionReducer(done, { type: "reveal_next" }, quickOff);
      expect(result).toBe(done);
    });

    it("None + reveal_next is a no-op (not in the AD-7 diagram)", () => {
      const result = sessionReducer(noneSession, { type: "reveal_next" }, quickOff);
      expect(result).toBe(noneSession);
    });
  });

  it("config.reveal.order ends with brief (assumption this reducer relies on)", () => {
    expect(config.reveal.order.at(-1)).toBe("brief");
  });

  // Required AC: cross every AD-7 state with every event this story
  // implements. None/Held are in scope for challenge_committed and
  // compose_failed; only Held is in scope for reveal_next. Everywhere else
  // the pair is out of scope and must be a no-op (same session reference),
  // and every output -- in scope or not -- must still parse as a Session.
  const allStates = [
    ["None", noneSession],
    ["Held", heldSession],
    ["Attempt", attemptSession],
    ["Finished", finishedSession],
    ["Saved", savedSession],
  ] as const;

  const implementedEvents: SessionEvent[] = [
    { type: "challenge_committed", challenge: baseChallenge, recentKey: "k-cross" },
    { type: "compose_failed", reason: "no_compatible", blockingLock: null },
    { type: "reveal_next" },
  ];

  function isInScope(stateLabel: string, eventType: SessionEvent["type"]): boolean {
    if (eventType === "reveal_next") return stateLabel === "Held";
    return stateLabel === "None" || stateLabel === "Held";
  }

  const crossRows = allStates.flatMap(([stateLabel, session]) =>
    implementedEvents.map((event) => [`${stateLabel} + ${event.type}`, stateLabel, session, event] as const),
  );

  it.each(crossRows)("%s", (_label, stateLabel, session, event) => {
    const result = sessionReducer(session, event, quickOff);
    expect(Session.safeParse(result).success).toBe(true);
    if (!isInScope(stateLabel, event.type)) {
      expect(result).toBe(session);
    }
  });

  // Table-driven sweep (required AC): any (state, event) pair this story
  // does not model -- including AD-7 events later stories add -- is a no-op.
  const notYetImplemented: SessionEvent[] = [
    { type: "toggle_lock" } as unknown as SessionEvent,
    { type: "start" } as unknown as SessionEvent,
    { type: "pause" } as unknown as SessionEvent,
    { type: "resume" } as unknown as SessionEvent,
    { type: "finish" } as unknown as SessionEvent,
    { type: "update_reflection_draft" } as unknown as SessionEvent,
    { type: "save_rep" } as unknown as SessionEvent,
    { type: "discard" } as unknown as SessionEvent,
    { type: "not_a_real_event" } as unknown as SessionEvent,
  ];

  const scopedStates = [
    ["None", noneSession],
    ["Held", heldSession],
  ] as const;

  const sweepRows = scopedStates.flatMap(([stateLabel, session]) =>
    notYetImplemented.map((event) => [`${stateLabel} + ${event.type}`, session, event] as const),
  );

  it.each(sweepRows)("%s is a no-op", (_label, session, event) => {
    const result = sessionReducer(session, event, quickOff);
    expect(result).toBe(session);
    expect(Session.safeParse(result).success).toBe(true);
  });
});
