"use client";

import { useEffect, useRef, type KeyboardEvent } from "react";
import { copy } from "@/components/copy";
import { SunButton } from "@/components/SunButton";
import type { Challenge, RevealedKind } from "@/domain/session/schema";
import type { RevealMotion } from "./useRevealMotion";
import { BriefBlock, EmptySlot, landingMotion, REVEALED_MOTION, ScrapGroup, ShufflingPiece, TicketTab } from "./pieces";
import { nextKind } from "./reveal-logic";

/** Native auto-repeat on a held Enter would click the focused button once per repeat -- one reveal per press only. */
function ignoreRepeatedActivation(event: KeyboardEvent<HTMLButtonElement>) {
  if (event.repeat && (event.key === "Enter" || event.key === " ")) event.preventDefault();
}

/**
 * The Reveal composition (Story 3.10, motion added in Story 4.1): the empty
 * slots, the five pieces as they land, the Brief, and the "Reveal next" sun
 * button. `motion` (from `useRevealMotion`, owned by `StagePage` so its
 * keyboard fallback shares it) drives each piece through empty -> shuffling
 * (an aria-hidden flick layer) -> landing (the real value, with its entrance
 * animation) -> landed (gated on the store's `revealed`, via `has`). A
 * single-value Input or the Brief skips straight to landing. Mounted by
 * StagePage only once a Challenge is held; the Stage's one keydown handler
 * and its aria-live region stay in StagePage (AD-7), so this component adds
 * no listener of its own.
 */
export function RevealComposition({
  challenge,
  revealed,
  motion,
}: {
  challenge: Challenge;
  revealed: RevealedKind[];
  motion: RevealMotion;
}) {
  // SunButton's own prop type (Story 3.1, reused as-is) doesn't expose
  // `ref`, so focus is grabbed through a plain wrapper instead.
  const actionRowRef = useRef<HTMLDivElement>(null);
  const briefRef = useRef<HTMLDivElement>(null);
  const has = (kind: RevealedKind) => revealed.includes(kind);
  const landingKind = motion.state.status === "landing" ? motion.state.kind : null;
  const shufflingKind = motion.state.status === "shuffling" ? motion.state.kind : null;
  const briefTrulyLanded = has("brief");
  const briefLandedBefore = useRef(briefTrulyLanded);

  // EXPERIENCE.md -> Focus targets: "Stage opens (any entry) -> Sun button".
  // Re-runs for every new Challenge, not just on mount.
  useEffect(() => {
    actionRowRef.current?.querySelector("button")?.focus();
  }, [challenge.id]);

  // "Focus is never lost when a control disappears": when the Brief truly
  // lands (the store commit, not its landing-preview fade), the Reveal next
  // button unmounts, so focus moves to the Brief.
  useEffect(() => {
    if (briefTrulyLanded && !briefLandedBefore.current) briefRef.current?.focus();
    briefLandedBefore.current = briefTrulyLanded;
  }, [briefTrulyLanded]);

  const next = nextKind(challenge, revealed);

  function tab(kind: "skill" | "medium", tiltDeg: number) {
    if (has(kind) || landingKind === kind) {
      return (
        <TicketTab
          kind={kind}
          value={challenge.inputs[kind].revealText}
          tiltDeg={tiltDeg}
          motion={landingKind === kind ? landingMotion(kind, motion.reduced) : REVEALED_MOTION}
        />
      );
    }
    if (shufflingKind === kind && motion.flickText !== null) {
      return (
        <ShufflingPiece kind={kind}>
          <TicketTab kind={kind} value={motion.flickText} tiltDeg={tiltDeg} />
        </ShufflingPiece>
      );
    }
    return <EmptySlot kind={kind} tiltDeg={tiltDeg} className="min-w-0" />;
  }

  function scrapPiece(kind: "topic" | "style" | "constraint") {
    return {
      present: challenge.inputs[kind] !== undefined,
      revealed: has(kind),
      landing: landingKind === kind,
      shufflingText: shufflingKind === kind ? motion.flickText : null,
      value: challenge.inputs[kind]?.revealText ?? "",
    };
  }
  const scrap = { topic: scrapPiece("topic"), style: scrapPiece("style"), constraint: scrapPiece("constraint") };

  const briefShowing = briefTrulyLanded || landingKind === "brief";

  return (
    <>
      <ul aria-label={copy.stage.inputsListLabel} className="flex w-full flex-col gap-stage-gap-compact desktop:gap-stage-gap">
        <li className="flex flex-wrap gap-stage-gap-compact">
          {tab("skill", 1.5)}
          {tab("medium", -1.5)}
        </li>
        {scrap.topic.present || scrap.style.present || scrap.constraint.present ? (
          <li>
            <ScrapGroup {...scrap} reduced={motion.reduced} />
          </li>
        ) : null}
      </ul>

      {briefShowing ? (
        <BriefBlock
          ref={briefRef}
          brief={challenge.brief}
          guidance={challenge.guidance}
          motion={landingKind === "brief" ? landingMotion("brief", motion.reduced) : REVEALED_MOTION}
        />
      ) : null}

      {next !== null ? (
        // DESIGN.md -> Layout & Spacing -> Phone: "The action row becomes a
        // bottom bar fixed to the column's bottom edge, within thumb reach"
        // -- column width, on the lilac ground, clear of the home indicator;
        // StagePage pads the column bottom by this bar's height. Desktop keeps
        // it in flow, {spacing.8} below the composition (stage-gap + 2).
        <div
          ref={actionRowRef}
          data-testid="stage-action-row"
          data-motion-status={motion.state.status}
          data-motion-kind={motion.state.status === "idle" ? "" : motion.state.kind}
          className="fixed inset-x-0 bottom-0 mx-auto w-safe-area-width max-w-[calc(100%-2*var(--spacing-gutter-phone))] bg-lilac pt-4 pb-[max(--spacing(4),env(safe-area-inset-bottom))] desktop:static desktop:mx-0 desktop:mt-2 desktop:w-auto desktop:max-w-none desktop:bg-transparent desktop:p-0"
        >
          <SunButton ground="lilac" onClick={motion.press} onKeyDown={ignoreRepeatedActivation}>
            {copy.button.revealNext}
          </SunButton>
        </div>
      ) : null}
    </>
  );
}
