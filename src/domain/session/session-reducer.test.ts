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
import { Session, type Challenge } from "./schema";
import type { SessionEvent } from "./session-reducer";
import { finishRep, presentKinds, sessionReducer } from "./session-reducer";

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

    it("Saved + challenge_committed (a plain new/reroll) becomes Held, following quickReveal like any other commit", () => {
      const result = sessionReducer(
        savedSession,
        { type: "challenge_committed", challenge: baseChallenge, recentKey: "k-saved" },
        quickOff,
      );
      expect(result.state).toBe("held");
      expect(result.challenge).toBe(baseChallenge);
      expect(result.revealed).toEqual([]);
    });

    it("a retry-origin Challenge lands every present kind at once, even with Quick reveal off", () => {
      const retryChallenge: Challenge = {
        ...fullChallenge,
        origin: { kind: "retry", fromRepId: "223e4567-e89b-42d3-a456-426614174000" },
      };
      const result = sessionReducer(
        savedSession,
        { type: "challenge_committed", challenge: retryChallenge, recentKey: null },
        quickOff,
      );
      expect(result.state).toBe("held");
      expect(result.revealed).toEqual(presentKinds(retryChallenge));
    });

    it("retry's recentKey is null and never pushes onto the ring", () => {
      const retryChallenge: Challenge = { ...baseChallenge, origin: { kind: "retry", fromRepId: "223e4567-e89b-42d3-a456-426614174000" } };
      const withRecent: Session = { ...savedSession, recent: ["old-key"] };
      const result = sessionReducer(withRecent, { type: "challenge_committed", challenge: retryChallenge, recentKey: null }, quickOff);
      expect(result.recent).toEqual(["old-key"]);
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

    it("a non-reroll commit from a Held session clears its Locks (they belonged to the old Challenge) and keeps lastRepId", () => {
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
      expect(result.locks).toEqual({});
      expect(result.lastRepId).toBe("223e4567-e89b-42d3-a456-426614174000");
    });

    it("clears Locks on new and retry commits alike", () => {
      const held: Session = { ...heldSession, locks: { skill: "skl.observation" } };
      const retry: Challenge = { ...fullChallenge, origin: { kind: "retry", fromRepId: "223e4567-e89b-42d3-a456-426614174000" } };
      for (const challenge of [fullChallenge, retry]) {
        const result = sessionReducer(held, { type: "challenge_committed", challenge, recentKey: null }, quickOff);
        expect(result.locks).toEqual({});
      }
    });

    it("is a no-op during an Attempt or Finished (new_challenge stays rejected mid-Attempt)", () => {
      for (const session of [attemptSession, finishedSession]) {
        const result = sessionReducer(session, { type: "challenge_committed", challenge: baseChallenge, recentKey: "k" }, quickOff);
        expect(result).toBe(session);
      }
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

    it("from Saved stays Saved and sets lastComposeError", () => {
      const result = sessionReducer(savedSession, { type: "compose_failed", reason: "no_compatible", blockingLock: null }, quickOff);
      expect(result.state).toBe("saved");
      expect(result.lastComposeError).toEqual({ reason: "no_compatible", blockingLock: null });
    });

    it("is a no-op during an Attempt or Finished", () => {
      for (const session of [attemptSession, finishedSession]) {
        const result = sessionReducer(session, { type: "compose_failed", reason: "no_compatible", blockingLock: null }, quickOff);
        expect(result).toBe(session);
      }
    });
  });

  describe("challenge_committed with a reroll origin (EXPERIENCE.md -> Rerolling: Held at once)", () => {
    const prevRevealed = presentKinds(fullChallenge);
    const rerollingHeld: Session = {
      ...heldSession,
      challenge: fullChallenge,
      revealed: prevRevealed,
      locks: { skill: fullChallenge.inputs.skill.id },
    };

    it("lands every kind at once (Quick reveal off too) and keeps the locked ids", () => {
      const rerolled: Challenge = {
        ...fullChallenge,
        id: "423e4567-e89b-42d3-a456-426614174000",
        origin: { kind: "reroll", fromRepId: null },
        inputs: { ...fullChallenge.inputs, topic: { id: "top.other", revealText: "Something else" } },
        brief: "A different brief.",
      };
      const result = sessionReducer(rerollingHeld, { type: "challenge_committed", challenge: rerolled, recentKey: "k-reroll" }, quickOff);
      expect(result.state).toBe("held");
      expect(result.challenge).toBe(rerolled);
      expect(result.revealed).toEqual(presentKinds(rerolled));
      expect(result.recent).toEqual(["k-reroll"]);
      expect(result.locks).toEqual({ skill: fullChallenge.inputs.skill.id });
    });

    it("stays fully revealed when the reroll happens to redraw identical values everywhere", () => {
      const rerolled: Challenge = { ...fullChallenge, id: "523e4567-e89b-42d3-a456-426614174000", origin: { kind: "reroll", fromRepId: null } };
      const result = sessionReducer(rerollingHeld, { type: "challenge_committed", challenge: rerolled, recentKey: "k-same" }, quickOff);
      expect(result.revealed).toEqual(presentKinds(rerolled));
    });

    it("Quick reveal on lands everything at once, same as any other commit", () => {
      const rerolled: Challenge = {
        ...fullChallenge,
        id: "623e4567-e89b-42d3-a456-426614174000",
        origin: { kind: "reroll", fromRepId: null },
        inputs: { ...fullChallenge.inputs, style: { id: "sty.other", revealText: "Other" } },
      };
      const result = sessionReducer(rerollingHeld, { type: "challenge_committed", challenge: rerolled, recentKey: "k" }, quickOn);
      expect(result.revealed).toEqual(presentKinds(rerolled));
    });
  });

  describe("toggle_lock", () => {
    const fullyRevealed: Session = { ...heldSession, revealed: presentKinds(baseChallenge) };

    it("accepts Held + fully revealed: locks a present kind to its current value", () => {
      expect(fullyRevealed.state).toBe("held");
      const result = sessionReducer(fullyRevealed, { type: "toggle_lock", kind: "skill" }, quickOff);
      expect(result).not.toBe(fullyRevealed);
      expect(result.locks).toEqual({ skill: baseChallenge.inputs.skill.id });
    });

    it("accepts a reroll-origin Challenge too", () => {
      const rerolled: Session = { ...fullyRevealed, challenge: { ...baseChallenge, origin: { kind: "reroll", fromRepId: null } } };
      expect(sessionReducer(rerolled, { type: "toggle_lock", kind: "topic" }, quickOff).locks).toEqual({ topic: baseChallenge.inputs.topic?.id });
    });

    it("is a no-op for a retry- or variation-origin Challenge (origin gating, not just UI hiding)", () => {
      const fromRepId = "223e4567-e89b-42d3-a456-426614174000";
      for (const origin of [{ kind: "retry", fromRepId }, { kind: "variation", fromRepId }] as const) {
        const session: Session = { ...fullyRevealed, challenge: { ...baseChallenge, origin } };
        expect(sessionReducer(session, { type: "toggle_lock", kind: "skill" }, quickOff)).toBe(session);
      }
    });

    it("re-locks a stale Lock (another value's id) to the current value, and clears lastComposeError", () => {
      const stale: Session = {
        ...fullyRevealed,
        locks: { skill: "skl.other" },
        lastComposeError: { reason: "no_compatible", blockingLock: "skill" },
      };
      const result = sessionReducer(stale, { type: "toggle_lock", kind: "skill" }, quickOff);
      expect(result.locks).toEqual({ skill: baseChallenge.inputs.skill.id });
      expect(result.lastComposeError).toBeNull();
    });

    it("unlocks an already-locked kind", () => {
      const locked: Session = { ...fullyRevealed, locks: { skill: baseChallenge.inputs.skill.id } };
      const result = sessionReducer(locked, { type: "toggle_lock", kind: "skill" }, quickOff);
      expect(result.locks).toEqual({});
    });

    it("is a no-op for a kind the Challenge doesn't have", () => {
      const result = sessionReducer(fullyRevealed, { type: "toggle_lock", kind: "style" }, quickOff);
      expect(result).toBe(fullyRevealed);
    });

    it("is a no-op before every present kind has landed", () => {
      const partial: Session = { ...heldSession, revealed: ["skill"] };
      const result = sessionReducer(partial, { type: "toggle_lock", kind: "skill" }, quickOff);
      expect(result).toBe(partial);
    });

    it("is a no-op outside Held", () => {
      for (const session of [noneSession, attemptSession, finishedSession, savedSession]) {
        const result = sessionReducer(session, { type: "toggle_lock", kind: "skill" }, quickOff);
        expect(result).toBe(session);
      }
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

  describe("start", () => {
    const fullyRevealed: Session = { ...heldSession, revealed: presentKinds(baseChallenge) };

    it("Held with every present kind landed becomes Attempt, startedAt = nowMs, locks cleared", () => {
      const withLocks: Session = { ...fullyRevealed, locks: { skill: "skl.observation" } };
      const result = sessionReducer(withLocks, { type: "start", nowMs: 5_000 }, quickOff);
      expect(result.state).toBe("attempt");
      expect(result.attempt).toEqual({ startedAt: 5_000, pausedAt: null, pausedTotalMs: 0, timeLimitSec: null });
      expect(result.locks).toEqual({});
    });

    it("carries the held Challenge's own timeLimitSec onto the Attempt", () => {
      const timedChallenge: Challenge = { ...baseChallenge, timeLimitSec: 300 };
      const held: Session = { ...heldSession, challenge: timedChallenge, revealed: presentKinds(timedChallenge) };
      const result = sessionReducer(held, { type: "start", nowMs: 0 }, quickOff);
      expect(result.attempt?.timeLimitSec).toBe(300);
    });

    it("is a no-op while any present kind hasn't landed yet", () => {
      const partial: Session = { ...heldSession, revealed: ["skill"] };
      const result = sessionReducer(partial, { type: "start", nowMs: 1 }, quickOff);
      expect(result).toBe(partial);
    });

    it("is a no-op from any state other than Held", () => {
      for (const session of [noneSession, attemptSession, finishedSession, savedSession]) {
        const result = sessionReducer(session, { type: "start", nowMs: 1 }, quickOff);
        expect(result).toBe(session);
      }
    });
  });

  describe("pause / resume", () => {
    it("pause sets pausedAt to nowMs", () => {
      const result = sessionReducer(attemptSession, { type: "pause", nowMs: 100 }, quickOff);
      expect(result.attempt?.pausedAt).toBe(100);
    });

    it("pause is a no-op when already paused", () => {
      const paused: Session = { ...attemptSession, attempt: { ...attemptSession.attempt!, pausedAt: 50 } };
      const result = sessionReducer(paused, { type: "pause", nowMs: 100 }, quickOff);
      expect(result).toBe(paused);
    });

    it("resume clears pausedAt and folds the paused span into pausedTotalMs", () => {
      const paused: Session = { ...attemptSession, attempt: { ...attemptSession.attempt!, pausedAt: 50, pausedTotalMs: 10 } };
      const result = sessionReducer(paused, { type: "resume", nowMs: 150 }, quickOff);
      expect(result.attempt).toEqual({ ...attemptSession.attempt, pausedAt: null, pausedTotalMs: 10 + (150 - 50) });
    });

    it("resume clamps a backwards clock step to zero so the Attempt still parses", () => {
      const paused: Session = { ...attemptSession, attempt: { ...attemptSession.attempt!, pausedAt: 500, pausedTotalMs: 0 } };
      const result = sessionReducer(paused, { type: "resume", nowMs: 100 }, quickOff);
      expect(result.attempt?.pausedTotalMs).toBe(0);
      expect(Session.safeParse(result).success).toBe(true);
    });

    it("resume is a no-op when already running", () => {
      const result = sessionReducer(attemptSession, { type: "resume", nowMs: 100 }, quickOff);
      expect(result).toBe(attemptSession);
    });

    it("multiple pause/resume cycles accumulate pausedTotalMs", () => {
      let session = attemptSession;
      session = sessionReducer(session, { type: "pause", nowMs: 100 }, quickOff);
      session = sessionReducer(session, { type: "resume", nowMs: 150 }, quickOff); // +50
      session = sessionReducer(session, { type: "pause", nowMs: 200 }, quickOff);
      session = sessionReducer(session, { type: "resume", nowMs: 230 }, quickOff); // +30
      expect(session.attempt?.pausedTotalMs).toBe(80);
    });

    it("are no-ops outside Attempt", () => {
      for (const session of [noneSession, heldSession, finishedSession, savedSession]) {
        expect(sessionReducer(session, { type: "pause", nowMs: 1 }, quickOff)).toBe(session);
        expect(sessionReducer(session, { type: "resume", nowMs: 1 }, quickOff)).toBe(session);
      }
    });
  });

  describe("update_reflection_draft", () => {
    it("sets the draft while Finished", () => {
      const result = sessionReducer(
        finishedSession,
        { type: "update_reflection_draft", reflection: { worked: "good light", change: "" } },
        quickOff,
      );
      expect(result.reflectionDraft).toEqual({ worked: "good light", change: "" });
    });

    it("slices an over-cap draft to config.reflection.maxChars", () => {
      const max = config.reflection.maxChars;
      const long = "x".repeat(max + 20);
      const result = sessionReducer(finishedSession, { type: "update_reflection_draft", reflection: { worked: long, change: long } }, quickOff);
      expect(result.reflectionDraft?.worked).toHaveLength(max);
      expect(result.reflectionDraft?.change).toHaveLength(max);
    });

    it("is a no-op outside Finished", () => {
      for (const session of [noneSession, heldSession, attemptSession, savedSession]) {
        const result = sessionReducer(session, { type: "update_reflection_draft", reflection: { worked: "x", change: "y" } }, quickOff);
        expect(result).toBe(session);
      }
    });
  });

  describe("save_rep", () => {
    it("Finished becomes Saved with the Attempt cleared", () => {
      const result = sessionReducer(finishedSession, { type: "save_rep" }, quickOff);
      expect(result.state).toBe("saved");
      expect(result.attempt).toBeNull();
    });

    it("is a no-op outside Finished", () => {
      for (const session of [noneSession, heldSession, attemptSession, savedSession]) {
        expect(sessionReducer(session, { type: "save_rep" }, quickOff)).toBe(session);
      }
    });
  });

  describe("discard", () => {
    it("Attempt becomes None with the challenge and attempt cleared, nothing recorded", () => {
      const result = sessionReducer(attemptSession, { type: "discard" }, quickOff);
      expect(result.state).toBe("none");
      expect(result.challenge).toBeNull();
      expect(result.attempt).toBeNull();
      expect(result.revealed).toEqual([]);
      expect(result.locks).toEqual({});
    });

    it("is a no-op outside Attempt", () => {
      for (const session of [noneSession, heldSession, finishedSession, savedSession]) {
        expect(sessionReducer(session, { type: "discard" }, quickOff)).toBe(session);
      }
    });
  });

  it("config.reveal.order ends with brief (assumption this reducer relies on)", () => {
    expect(config.reveal.order.at(-1)).toBe("brief");
  });

  // Required AC: cross every AD-7 state with every event this story
  // implements. Every output -- in scope or not -- must still parse as a
  // Session, and every out-of-scope pair must be a true no-op (same
  // reference). In-scope pairs are checked precisely by the dedicated
  // describe blocks above; this sweep only guards against a pair silently
  // mutating when it has no business to.
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
    { type: "toggle_lock", kind: "skill" },
    { type: "start", nowMs: 1_000 },
    { type: "pause", nowMs: 1_000 },
    { type: "resume", nowMs: 1_000 },
    { type: "update_reflection_draft", reflection: { worked: "a", change: "b" } },
    { type: "save_rep" },
    { type: "discard" },
  ];

  function isInScope(stateLabel: string, eventType: SessionEvent["type"]): boolean {
    switch (eventType) {
      case "challenge_committed":
      case "compose_failed":
        return stateLabel === "None" || stateLabel === "Held" || stateLabel === "Saved";
      case "reveal_next":
      case "start":
        return stateLabel === "Held";
      case "toggle_lock":
        // The generic "Held" fixture here (`heldSession`) isn't fully revealed -- see the
        // dedicated describe("toggle_lock") block above for the real, fully-revealed gate.
        return false;
      case "pause":
      case "resume":
      case "discard":
        return stateLabel === "Attempt";
      case "update_reflection_draft":
      case "save_rep":
        return stateLabel === "Finished";
      default:
        return false;
    }
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

  // Table-driven sweep (required AC): any (state, event) pair this reducer
  // never models -- a future story's event, or garbage -- is a no-op
  // everywhere.
  const notYetImplemented: SessionEvent[] = [
    { type: "finish" } as unknown as SessionEvent, // deliberately not a dispatchable event -- see finishRep
    { type: "vary" } as unknown as SessionEvent, // Story 5.8 phase 2
    { type: "not_a_real_event" } as unknown as SessionEvent,
  ];

  const sweepRows = allStates.flatMap(([stateLabel, session]) =>
    notYetImplemented.map((event) => [`${stateLabel} + ${event.type}`, session, event] as const),
  );

  it.each(sweepRows)("%s is a no-op", (_label, session, event) => {
    const result = sessionReducer(session, event, quickOff);
    expect(result).toBe(session);
    expect(Session.safeParse(result).success).toBe(true);
  });
});

describe("finishRep", () => {
  it("Attempt -> Finished returns the session and a new Rep with the supplied id/finishedAt", () => {
    const result = finishRep(attemptSession, 1_000, "323e4567-e89b-42d3-a456-426614174000", "2026-10-10T00:00:00.000Z");
    expect(result).not.toBeNull();
    expect(result?.session.state).toBe("finished");
    expect(result?.session.lastRepId).toBe("323e4567-e89b-42d3-a456-426614174000");
    expect(result?.session.reflectionDraft).toEqual({ worked: "", change: "" });
    expect(result?.rep).toEqual({
      id: "323e4567-e89b-42d3-a456-426614174000",
      challenge: attemptSession.challenge,
      finishedAt: "2026-10-10T00:00:00.000Z",
      timeUsedSec: null, // the fixture's Attempt is untimed
      reflection: null,
    });
  });

  it("caps timeUsedSec at the Attempt's time limit", () => {
    const timedChallenge: Challenge = { ...baseChallenge, timeLimitSec: 300 };
    const timedAttemptSession: Session = {
      ...attemptSession,
      challenge: timedChallenge,
      attempt: { startedAt: 0, pausedAt: null, pausedTotalMs: 0, timeLimitSec: 300 },
    };
    const result = finishRep(timedAttemptSession, 1_000_000, "323e4567-e89b-42d3-a456-426614174000", "2026-10-10T00:00:00.000Z");
    expect(result?.rep.timeUsedSec).toBe(300);
  });

  it("counts only unpaused time strictly under the limit", () => {
    const timedChallenge: Challenge = { ...baseChallenge, timeLimitSec: 300 };
    const s: Session = {
      ...attemptSession,
      challenge: timedChallenge,
      attempt: { startedAt: 0, pausedAt: null, pausedTotalMs: 5_000, timeLimitSec: 300 },
    };
    const result = finishRep(s, 70_500, "323e4567-e89b-42d3-a456-426614174000", "2026-10-10T00:00:00.000Z");
    expect(result?.rep.timeUsedSec).toBe(65);
  });

  it("returns null outside Attempt", () => {
    for (const session of [noneSession, heldSession, finishedSession, savedSession]) {
      expect(finishRep(session, 0, "323e4567-e89b-42d3-a456-426614174000", "2026-10-10T00:00:00.000Z")).toBeNull();
    }
  });
});
