"use client";

import { useEffect, useRef, type KeyboardEvent } from "react";
import { copy } from "@/components/copy";
import { LineButton } from "@/components/LineButton";
import { SunButton } from "@/components/SunButton";
import type { Challenge, InputKind, Locks, RevealedKind } from "@/domain/session/schema";
import { presentKinds } from "@/domain/session/session-reducer";
import type { RevealMotion } from "./useRevealMotion";
import { BriefBlock, EmptySlot, landingMotion, LockToggle, ScrapGroup, ShufflingPiece, TicketTab } from "./pieces";
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
  locks,
  onToggleLock,
  onReroll,
}: {
  challenge: Challenge;
  revealed: RevealedKind[];
  motion: RevealMotion;
  /** Story 4.3: the held Locks, and the Lock/Reroll actions -- RevealComposition decides when to show them. */
  locks: Locks;
  onToggleLock: (kind: InputKind) => void;
  onReroll: () => void;
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
          motion={landingKind === kind ? landingMotion(kind) : undefined}
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

  // Story 4.3: Lock toggles + Reroll render only once fully revealed, for a
  // `new`/`reroll` origin -- never for `retry`/(future) `variation`, whose
  // Challenge must stay exactly as it is (EXPERIENCE.md -> Retry). A
  // `reroll`-origin Challenge keeps the Reroll button mounted through its
  // own changed-kinds catch-up too (`next !== null` mid-walk): Reroll is a
  // single explicit action, its catch-up auto-advances (StagePage), and
  // nothing should ever need to move focus off Reroll for it. The sun
  // button never shows for that catch-up -- there is nothing for it to do.
  const isLockableOrigin = challenge.origin.kind === "new" || challenge.origin.kind === "reroll";
  const showSunButton = next !== null && challenge.origin.kind !== "reroll";
  const showReroll = isLockableOrigin && (next === null || challenge.origin.kind === "reroll");
  const showLocks = isLockableOrigin && next === null;

  return (
    <>
      <ul aria-label={copy.stage.inputsListLabel} className="flex w-full flex-col gap-stage-gap-compact desktop:gap-stage-gap">
        <li className="flex flex-wrap gap-stage-gap-compact">
          {tab("skill", 1.5)}
          {tab("medium", -1.5)}
        </li>
        {scrap.topic.present || scrap.style.present || scrap.constraint.present ? (
          <li>
            <ScrapGroup {...scrap} />
          </li>
        ) : null}
      </ul>

      {briefShowing ? (
        <BriefBlock
          ref={briefRef}
          brief={challenge.brief}
          guidance={challenge.guidance}
          motion={landingKind === "brief" ? landingMotion("brief") : undefined}
        />
      ) : null}

      {showSunButton || showReroll ? (
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
          {showSunButton ? (
            <SunButton ground="lilac" onClick={motion.press} onKeyDown={ignoreRepeatedActivation}>
              {copy.button.revealNext}
            </SunButton>
          ) : (
            // Reroll comes first in the DOM, not just visually: the existing
            // "focus the action row's first button" effect above (keyed on
            // `challenge.id`) re-grabs it here, which is exactly what keeps
            // focus on Reroll (EXPERIENCE.md -> Focus targets) rather than
            // the first Lock toggle, every time a reroll commits.
            <div className="flex flex-col items-start gap-3">
              <LineButton ground="lilac" onClick={onReroll}>
                {copy.button.reroll}
              </LineButton>
              {showLocks ? (
                <ul className="flex flex-col gap-2">
                  {presentKinds(challenge)
                    .filter((kind): kind is InputKind => kind !== "brief")
                    .map((kind) => (
                      <li key={kind}>
                        <LockToggle kind={kind} locked={locks[kind] !== undefined} onToggle={() => onToggleLock(kind)} />
                      </li>
                    ))}
                </ul>
              ) : null}
            </div>
          )}
        </div>
      ) : null}
    </>
  );
}
