import { config } from "@/config/app";
import { timeUsedSec as timerTimeUsedSec } from "@/domain/timer/timer";
import type { Challenge, ComposeError, InputKind, Locks, Reflection, Rep, RevealedKind, Session, Setup } from "./schema";

export type SessionEvent =
  | { type: "challenge_committed"; challenge: Challenge; recentKey: string | null }
  | ({ type: "compose_failed" } & ComposeError)
  | { type: "reveal_next" }
  | { type: "toggle_lock"; kind: InputKind }
  | { type: "start"; nowMs: number }
  | { type: "pause"; nowMs: number }
  | { type: "resume"; nowMs: number }
  | { type: "update_reflection_draft"; reflection: Reflection }
  | { type: "save_rep" }
  | { type: "discard" };

/**
 * The AD-7 session reducer. Pure: no Clock, Random, or storage -- times come
 * in as `nowMs`. `finish` is deliberately not a dispatchable event: it needs
 * to hand the store a new Rep in the same transition, so it's the separate
 * pure `finishRep()` below instead (see that function's doc comment). `vary`
 * is phase 2 (Story 5.8) and isn't modelled here yet. Any other
 * (state, event) pair is a no-op that returns the same session reference.
 */
export function sessionReducer(session: Session, event: SessionEvent, setup: Pick<Setup, "quickReveal">): Session {
  switch (event.type) {
    case "challenge_committed":
      return canCommit(session) ? commitChallenge(session, event, setup.quickReveal) : session;
    case "compose_failed":
      return canCommit(session)
        ? { ...session, lastComposeError: { reason: event.reason, blockingLock: event.blockingLock } }
        : session;
    case "reveal_next":
      return session.state === "held" ? revealNext(session) : session;
    case "toggle_lock":
      return isFullyRevealedHeld(session) ? toggleLock(session, event.kind) : session;
    case "start":
      return canStart(session) ? startAttempt(session, event.nowMs) : session;
    case "pause": {
      if (session.state !== "attempt" || session.attempt === null || session.attempt.pausedAt !== null) return session;
      return { ...session, attempt: { ...session.attempt, pausedAt: event.nowMs } };
    }
    case "resume": {
      if (session.state !== "attempt" || session.attempt === null || session.attempt.pausedAt === null) return session;
      const { pausedAt, pausedTotalMs } = session.attempt;
      return { ...session, attempt: { ...session.attempt, pausedAt: null, pausedTotalMs: pausedTotalMs + Math.max(0, event.nowMs - pausedAt) } };
    }
    case "update_reflection_draft":
      return session.state === "finished" ? { ...session, reflectionDraft: clampReflection(event.reflection) } : session;
    case "save_rep":
      return session.state === "finished" ? { ...session, state: "saved", attempt: null } : session;
    case "discard":
      return session.state === "attempt"
        ? { ...session, state: "none", challenge: null, attempt: null, revealed: [], locks: {}, reflectionDraft: null }
        : session;
    default:
      // Exhaustiveness guard: fails to compile if a SessionEvent variant is
      // added without a case above. The runtime fallback is still a no-op,
      // for a runtime event the type system didn't catch.
      assertNever(event);
      return session;
  }
}

/** None/Held/Saved may receive a new Challenge (AD-7); Attempt/Finished reject it (new_challenge stays rejected mid-Attempt). */
function canCommit(session: Session): boolean {
  return session.state === "none" || session.state === "held" || session.state === "saved";
}

/** Held, with a Challenge, and every present kind already landed -- the AD-7 gate shared by Start, toggle_lock, and reroll (Story 4.3: "only when held, every kind landed, before start"). */
export function isFullyRevealedHeld(session: Session): boolean {
  return session.state === "held" && session.challenge !== null && presentKinds(session.challenge).every((kind) => session.revealed.includes(kind));
}

/** Held -> Attempt only once every present kind of the held Challenge has landed. */
function canStart(session: Session): boolean {
  return isFullyRevealedHeld(session);
}

/** Toggles a Lock for `kind` to the held Challenge's own current value for it (or releases it); a no-op kind the Challenge doesn't have. Gated by `isFullyRevealedHeld` in the reducer above. */
function toggleLock(session: Session, kind: InputKind): Session {
  const challenge = session.challenge;
  if (challenge === null) return session;
  if (session.locks[kind] !== undefined) {
    const nextLocks = { ...session.locks };
    delete nextLocks[kind];
    return { ...session, locks: nextLocks };
  }
  const input = challenge.inputs[kind];
  if (input === undefined) return session;
  const nextLocks: Locks = { ...session.locks, [kind]: input.id };
  return { ...session, locks: nextLocks };
}

function startAttempt(session: Session, nowMs: number): Session {
  if (session.challenge === null) return session; // canStart guarantees this; narrows the type here
  return {
    ...session,
    state: "attempt",
    attempt: { startedAt: nowMs, pausedAt: null, pausedTotalMs: 0, timeLimitSec: session.challenge.timeLimitSec },
    locks: {},
  };
}

function commitChallenge(
  session: Session,
  event: { challenge: Challenge; recentKey: string | null },
  quickReveal: boolean,
): Session {
  const recent =
    event.recentKey === null || event.recentKey.length === 0
      ? session.recent
      : [...session.recent, event.recentKey].slice(-config.generator.recentWindow);
  // Retry never plays a Reveal (AD-3): every present kind lands at once, regardless of Quick reveal.
  const revealAll = quickReveal || event.challenge.origin.kind === "retry";
  const revealed = revealAll
    ? presentKinds(event.challenge)
    : event.challenge.origin.kind === "reroll"
      ? unchangedKinds(session, event.challenge)
      : [];

  return {
    ...session,
    state: "held",
    challenge: event.challenge,
    revealed,
    recent,
    lastComposeError: null,
  };
}

/**
 * Reroll only (AD-18): the kinds the previous held Challenge had already
 * landed whose value is identical in the new one -- these stay landed
 * (locked kinds always qualify, since `compose()` holds them fixed; an
 * unlocked kind that happens to redraw the same value qualifies too, with
 * nothing to show either way). Everything else, including the Brief
 * whenever its text changed, re-lands through the ordinary Reveal.
 */
function unchangedKinds(session: Session, next: Challenge): RevealedKind[] {
  const prev = session.challenge;
  if (prev === null) return [];
  return presentKinds(next).filter((kind) => session.revealed.includes(kind) && sameValue(prev, next, kind));
}

function sameValue(prev: Challenge, next: Challenge, kind: RevealedKind): boolean {
  if (kind === "brief") return prev.brief === next.brief;
  return prev.inputs[kind]?.id === next.inputs[kind]?.id;
}

/**
 * Attempt -> Finished, returning the new Rep alongside the session so the
 * store can append it to history in the same transition and set
 * `lastRepId`. Exported separately from the reducer -- not a dispatchable
 * SessionEvent -- because of that extra return value. `finishedAt` is taken
 * as an already-formatted ISO string rather than built here from `nowMs`:
 * `src/domain` is the pure core and never touches `Date` itself, so the
 * store derives it from the same Clock reading it passes as `nowMs` and
 * hands both in. Returns `null` outside an Attempt (nothing to finish).
 */
export function finishRep(session: Session, nowMs: number, repId: string, finishedAt: string): { session: Session; rep: Rep } | null {
  if (session.state !== "attempt" || session.challenge === null || session.attempt === null) return null;
  const timed = session.attempt.timeLimitSec !== null;
  const rep: Rep = {
    id: repId,
    challenge: session.challenge,
    finishedAt,
    timeUsedSec: timed ? timerTimeUsedSec(session.attempt, nowMs) : null,
    reflection: null,
  };
  const nextSession: Session = {
    ...session,
    state: "finished",
    lastRepId: repId,
    reflectionDraft: { worked: "", change: "" },
  };
  return { session: nextSession, rep };
}

function revealNext(session: Session): Session {
  if (session.challenge === null) return session;
  const next = presentKinds(session.challenge).find((kind) => !session.revealed.includes(kind));
  return next === undefined ? session : { ...session, revealed: [...session.revealed, next] };
}

/** Kinds the Challenge actually has, in `config.reveal.order`, with `brief` always last. Exported for the Stage UI (Story 3.10), which needs it without a Session. */
export function presentKinds(challenge: Challenge): RevealedKind[] {
  return config.reveal.order.filter((kind) => isPresent(challenge, kind));
}

function isPresent(challenge: Challenge, kind: RevealedKind): boolean {
  if (kind === "brief") return true;
  return challenge.inputs[kind] !== undefined;
}

/** Over-cap drafts (a paste, a stale tab) are cut to `config.reflection.maxChars` rather than stored past the textarea's own cap. */
function clampReflection(reflection: Reflection): Reflection {
  const max = config.reflection.maxChars;
  return { worked: reflection.worked.slice(0, max), change: reflection.change.slice(0, max) };
}

function assertNever(value: never): void {
  void value;
}
