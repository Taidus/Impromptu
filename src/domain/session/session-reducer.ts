import { config } from "@/config/app";
import type { Challenge, ComposeError, RevealedKind, Session, Setup } from "./schema";

export type SessionEvent =
  | { type: "challenge_committed"; challenge: Challenge; recentKey: string | null }
  | ({ type: "compose_failed" } & ComposeError)
  | { type: "reveal_next" };

/**
 * The AD-7 session reducer, scoped to the None and Held states (Story 3.4).
 * Pure: no Clock, Random, or storage. challenge_committed and compose_failed
 * apply only when `state` is None or Held -- AD-7's Saved -> Held
 * (retry/vary/new) and Saved -> Saved (compose_failed) arrive with Story 5.7.
 * Any other (state, event) pair -- including AD-7 events later stories
 * implement (e.g. toggle_lock, start) -- is a no-op that returns the same
 * session reference.
 */
export function sessionReducer(session: Session, event: SessionEvent, setup: Pick<Setup, "quickReveal">): Session {
  switch (event.type) {
    case "challenge_committed":
      return isNoneOrHeld(session) ? commitChallenge(session, event, setup.quickReveal) : session;
    case "compose_failed":
      return isNoneOrHeld(session)
        ? { ...session, lastComposeError: { reason: event.reason, blockingLock: event.blockingLock } }
        : session;
    case "reveal_next":
      return session.state === "held" ? revealNext(session) : session;
    default:
      // Exhaustiveness guard: fails to compile if a SessionEvent variant is
      // added without a case above. The runtime fallback is still a no-op,
      // for a runtime event the type system didn't catch.
      assertNever(event);
      return session;
  }
}

function isNoneOrHeld(session: Session): boolean {
  return session.state === "none" || session.state === "held";
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

  return {
    ...session,
    state: "held",
    challenge: event.challenge,
    revealed: quickReveal ? presentKinds(event.challenge) : [],
    recent,
    lastComposeError: null,
  };
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

function assertNever(value: never): void {
  void value;
}
