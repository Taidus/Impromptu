import { config } from "@/config/app";
import type { Challenge, InputKind, RevealedKind, Session, Setup } from "./schema";

export type SessionEvent =
  | { type: "challenge_committed"; challenge: Challenge; recentKey: string | null }
  | { type: "compose_failed"; reason: string; blockingLock: InputKind | null }
  | { type: "reveal_next" };

/**
 * The AD-7 session reducer, scoped to the None and Held states (Story 3.4).
 * Pure: no Clock, Random, or storage. Any (state, event) pair this story
 * does not model -- including AD-7 events later stories implement (e.g.
 * toggle_lock, start) -- is a no-op that returns the same session reference.
 */
export function sessionReducer(session: Session, event: SessionEvent, setup: Pick<Setup, "quickReveal">): Session {
  switch (event.type) {
    case "challenge_committed":
      return commitChallenge(session, event, setup.quickReveal);
    case "compose_failed":
      return { ...session, lastComposeError: { reason: event.reason, blockingLock: event.blockingLock } };
    case "reveal_next":
      return session.state === "held" ? revealNext(session) : session;
    default:
      // Any event outside the known set is a no-op (AD-7); this also guards
      // a runtime event the type system didn't catch (e.g. an AD-7 event
      // later stories add, such as toggle_lock or start).
      return session;
  }
}

function commitChallenge(
  session: Session,
  event: { challenge: Challenge; recentKey: string | null },
  quickReveal: boolean,
): Session {
  const recent =
    event.recentKey === null ? session.recent : [...session.recent, event.recentKey].slice(-config.generator.recentWindow);

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
  // Schema invariant (AD-7): held always has a challenge.
  const challenge = session.challenge as Challenge;
  const next = presentKinds(challenge).find((kind) => !session.revealed.includes(kind));
  return next === undefined ? session : { ...session, revealed: [...session.revealed, next] };
}

/** Kinds the Challenge actually has, in `config.reveal.order`, with `brief` always last. */
function presentKinds(challenge: Challenge): RevealedKind[] {
  return config.reveal.order.filter((kind) => isPresent(challenge, kind));
}

function isPresent(challenge: Challenge, kind: RevealedKind): boolean {
  if (kind === "brief") return true;
  return challenge.inputs[kind] !== undefined;
}
