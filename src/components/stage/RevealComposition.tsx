"use client";

import { useEffect, useRef, type KeyboardEvent } from "react";
import { copy } from "@/components/copy";
import { SunButton } from "@/components/SunButton";
import type { Challenge, RevealedKind } from "@/domain/session/schema";
import { BriefBlock, EmptySlot, ScrapGroup, TicketTab } from "./pieces";
import { nextKind } from "./reveal-logic";

/** Native auto-repeat on a held Enter would click the focused button once per repeat -- one reveal per press only. */
function ignoreRepeatedActivation(event: KeyboardEvent<HTMLButtonElement>) {
  if (event.repeat && (event.key === "Enter" || event.key === " ")) event.preventDefault();
}

/**
 * The Reveal composition (Story 3.10): the empty slots, the five pieces as
 * they land, the Brief, and the "Reveal next" sun button. Instant landing
 * only -- no shuffle, no shimmer, no fade (Epic 4 adds motion). Mounted by
 * StagePage only once a Challenge is held; the Stage's one keydown handler
 * and its aria-live region stay in StagePage (AD-7), so this component adds
 * no listener of its own.
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
  // `ref`, so focus is grabbed through a plain wrapper instead.
  const actionRowRef = useRef<HTMLDivElement>(null);
  const briefRef = useRef<HTMLDivElement>(null);
  const has = (kind: RevealedKind) => revealed.includes(kind);
  const briefLanded = has("brief");
  const briefLandedBefore = useRef(briefLanded);

  // EXPERIENCE.md -> Focus targets: "Stage opens (any entry) -> Sun button".
  // Re-runs for every new Challenge, not just on mount.
  useEffect(() => {
    actionRowRef.current?.querySelector("button")?.focus();
  }, [challenge.id]);

  // "Focus is never lost when a control disappears": when the Brief lands,
  // the Reveal next button unmounts, so focus moves to the Brief.
  useEffect(() => {
    if (briefLanded && !briefLandedBefore.current) briefRef.current?.focus();
    briefLandedBefore.current = briefLanded;
  }, [briefLanded]);

  const next = nextKind(challenge, revealed);
  const piece = (kind: "topic" | "style" | "constraint") => ({
    present: challenge.inputs[kind] !== undefined,
    revealed: has(kind),
    value: challenge.inputs[kind]?.revealText ?? "",
  });
  const scrap = { topic: piece("topic"), style: piece("style"), constraint: piece("constraint") };

  return (
    <>
      <ul aria-label={copy.stage.inputsListLabel} className="flex w-full flex-col gap-stage-gap-compact desktop:gap-stage-gap">
        <li className="flex flex-wrap gap-stage-gap-compact">
          {has("skill") ? (
            <TicketTab kind="skill" value={challenge.inputs.skill.revealText} tiltDeg={1.5} />
          ) : (
            <EmptySlot kind="skill" tiltDeg={1.5} className="min-w-0" />
          )}
          {has("medium") ? (
            <TicketTab kind="medium" value={challenge.inputs.medium.revealText} tiltDeg={-1.5} />
          ) : (
            <EmptySlot kind="medium" tiltDeg={-1.5} className="min-w-0" />
          )}
        </li>
        {scrap.topic.present || scrap.style.present || scrap.constraint.present ? (
          <li>
            <ScrapGroup {...scrap} />
          </li>
        ) : null}
      </ul>

      {briefLanded ? <BriefBlock ref={briefRef} brief={challenge.brief} guidance={challenge.guidance} /> : null}

      {next !== null ? (
        // DESIGN.md -> Layout & Spacing -> Phone: "The action row becomes a
        // bottom bar fixed to the column's bottom edge, within thumb reach"
        // -- column width, on the lilac ground, clear of the home indicator;
        // StagePage pads the column bottom by this bar's height. Desktop keeps
        // it in flow, {spacing.8} below the composition (stage-gap + 2).
        <div
          ref={actionRowRef}
          data-testid="stage-action-row"
          className="fixed inset-x-0 bottom-0 mx-auto w-safe-area-width max-w-[calc(100%-2*var(--spacing-gutter-phone))] bg-lilac pt-4 pb-[max(--spacing(4),env(safe-area-inset-bottom))] desktop:static desktop:mx-0 desktop:mt-2 desktop:w-auto desktop:max-w-none desktop:bg-transparent desktop:p-0"
        >
          <SunButton ground="lilac" onClick={onRevealNext} onKeyDown={ignoreRepeatedActivation}>
            {copy.button.revealNext}
          </SunButton>
        </div>
      ) : null}
    </>
  );
}
