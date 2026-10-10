"use client";

import { useEffect, useRef, useState } from "react";
import { copy } from "@/components/copy";
import { SunButton } from "@/components/SunButton";
import type { Challenge, RevealedKind } from "@/domain/session/schema";
import { BriefBlock, EmptySlot, ScrapGroup, TicketTab } from "./pieces";
import { announcementFor, isFullyRevealed, nextKind, quickRevealAnnouncement } from "./reveal-logic";

/**
 * The Reveal composition (Story 3.10): the empty slots, the five pieces as
 * they land, the Brief, and the "Reveal next" sun button. Instant landing
 * only -- no shuffle, no shimmer, no fade (Epic 4 adds motion). Mounted by
 * StagePage only once a Challenge is held; the Stage's one keydown handler
 * stays in StagePage (AD-7) and calls `onRevealNext` itself for the
 * no-control-focused Space/Enter shortcut, so this component adds no
 * listener of its own.
 */
export function RevealComposition({
  challenge,
  revealed,
  onRevealNext,
}: {
  challenge: Challenge;
  revealed: RevealedKind[];
  onRevealNext: () => void;
}) {
  // SunButton's own prop type (Story 3.1, reused as-is) doesn't expose
  // `ref`, so focus is grabbed through a plain wrapper instead of forwarding
  // one onto it.
  const actionRowRef = useRef<HTMLDivElement>(null);
  const focusedOnMount = useRef(false);

  const next = nextKind(challenge, revealed);

  // EXPERIENCE.md -> Interaction Primitives -> Focus targets: "Stage opens
  // (any entry) -> Sun button". Fires once, the first time this component
  // renders with something left to reveal -- it never steals focus back on
  // a later render (the button keeps focus across relabels/presses because
  // it's the same DOM node; Story 3.10 never relabels it).
  useEffect(() => {
    if (focusedOnMount.current) return;
    const button = actionRowRef.current?.querySelector("button");
    if (!button) return;
    focusedOnMount.current = true;
    button.focus();
  }, []);

  // EXPERIENCE.md -> Accessibility Floor: one aria-live="polite" region
  // announces each landing, or "Challenge ready." once for Quick reveal.
  // Tracked as state, not a ref -- React's own "store information from
  // previous renders" pattern: a conditional setState call during render
  // (not inside an effect) that bails out the moment its own condition goes
  // false, so it settles after one extra render and never loops.
  const [announced, setAnnounced] = useState<{ challengeId: string | null; revealedCount: number; text: string }>({
    challengeId: null,
    revealedCount: 0,
    text: "",
  });
  if (challenge.id !== announced.challengeId) {
    // Fully revealed the first time this component ever sees this
    // Challenge can only mean Quick reveal's one-shot commit (stepping
    // always grows `revealed` one kind at a time, after mount). A
    // *partial* `revealed` seen for the first time means a reload mid-
    // Reveal -- EXPERIENCE.md's "whole Challenge announced once" for that
    // case is Story 3.11's restore-on-reload behavior, not this one, so it
    // stays silent here rather than guess at the wording.
    const wasAlreadyFull = revealed.length > 0 && isFullyRevealed(challenge, revealed);
    setAnnounced({
      challengeId: challenge.id,
      revealedCount: revealed.length,
      text: wasAlreadyFull ? quickRevealAnnouncement(challenge) : announced.text,
    });
  } else if (revealed.length > announced.revealedCount) {
    setAnnounced({ challengeId: challenge.id, revealedCount: revealed.length, text: announcementFor(revealed[revealed.length - 1], challenge) });
  }
  const announcement = announced.text;

  const has = (kind: RevealedKind) => revealed.includes(kind);
  const topicPresent = challenge.inputs.topic !== undefined;
  const stylePresent = challenge.inputs.style !== undefined;
  const constraintPresent = challenge.inputs.constraint !== undefined;

  return (
    <>
      <ul aria-label={copy.stage.inputsListLabel} className="flex w-full flex-col gap-stage-gap-compact desktop:gap-stage-gap">
        <li className="flex gap-stage-gap-compact">
          {has("skill") ? (
            <TicketTab kind="skill" value={challenge.inputs.skill.revealText} tiltDeg={1.5} />
          ) : (
            <EmptySlot kind="skill" tiltDeg={1.5} />
          )}
          {has("medium") ? (
            <TicketTab kind="medium" value={challenge.inputs.medium.revealText} tiltDeg={-1.5} />
          ) : (
            <EmptySlot kind="medium" tiltDeg={-1.5} />
          )}
        </li>
        {topicPresent ? (
          <li>
            <ScrapGroup
              topicRevealed={has("topic")}
              topicValue={challenge.inputs.topic?.revealText ?? ""}
              stylePresent={stylePresent}
              styleRevealed={has("style")}
              styleValue={challenge.inputs.style?.revealText ?? ""}
              constraintPresent={constraintPresent}
              constraintRevealed={has("constraint")}
              constraintValue={challenge.inputs.constraint?.revealText ?? ""}
            />
          </li>
        ) : null}
      </ul>

      {has("brief") ? <BriefBlock brief={challenge.brief} guidance={challenge.guidance} /> : null}

      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>

      {next !== null ? (
        // DESIGN.md -> Layout & Spacing -> Phone: "The action row becomes a
        // bottom bar fixed to the column's bottom edge, within thumb
        // reach." Desktop keeps it in normal flow with the rest of the
        // composition.
        <div
          ref={actionRowRef}
          data-testid="stage-action-row"
          className="fixed inset-x-0 bottom-0 px-gutter-phone pb-4 desktop:static desktop:px-0 desktop:pb-0"
        >
          <SunButton ground="lilac" onClick={onRevealNext}>
            {copy.button.revealNext}
          </SunButton>
        </div>
      ) : null}
    </>
  );
}
