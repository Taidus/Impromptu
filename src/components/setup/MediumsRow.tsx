"use client";

import { useId, useState } from "react";
import { copy } from "@/components/copy";
import { FOCUS_RING_BASE, focusRingClassName } from "@/components/ground";
import type { Medium, MediumId } from "@/domain/library/schema";
import type { SetupReducerResult } from "@/domain/session/setup-reducer";
import { InlineStatus } from "./InlineStatus";

export interface MediumsRowProps {
  mediums: readonly Medium[];
  enabledMediums: readonly MediumId[];
  /** Dispatches `toggle_medium` and returns the reducer's notice (`last_medium` when blocked). */
  onToggle: (mediumId: MediumId) => SetupReducerResult["notice"];
}

/**
 * DESIGN.md -> Components -> Chip toggle; EXPERIENCE.md -> Component
 * Patterns -> Chip toggle (FR-2). The last-Medium block comes from the setup
 * reducer's `last_medium` notice. The one extra UI-side guard: only Medium ids
 * the library still has count as "on" -- a stale stored id the reducer can't
 * tell apart would otherwise let the last visible chip turn off.
 */
export function MediumsRow({ mediums, enabledMediums, onToggle }: MediumsRowProps) {
  const [blockedId, setBlockedId] = useState<MediumId | null>(null);
  const noticeId = useId();
  const visibleEnabled = mediums.filter((medium) => enabledMediums.includes(medium.id)).map((medium) => medium.id);
  // Derived, not stored: the notice clears itself once the blocked chip is no longer the only one on.
  const shownBlockedId = blockedId !== null && visibleEnabled.length === 1 && visibleEnabled[0] === blockedId ? blockedId : null;

  function handleClick(mediumId: MediumId) {
    const lastVisible = visibleEnabled.length === 1 && visibleEnabled[0] === mediumId;
    const notice = lastVisible ? "last_medium" : onToggle(mediumId);
    setBlockedId(notice === "last_medium" ? mediumId : null);
  }

  return (
    <fieldset className="flex flex-col">
      <legend className="text-label">{copy.setup.mediumsLabel}</legend>
      <div className="flex flex-wrap gap-2">
        {mediums.map((medium) => {
          const active = enabledMediums.includes(medium.id);
          return (
            <button
              key={medium.id}
              type="button"
              aria-pressed={active}
              aria-describedby={medium.id === shownBlockedId ? noticeId : undefined}
              onClick={() => handleClick(medium.id)}
              className={`inline-flex min-h-target-min items-center gap-1 rounded-full border px-4 text-button uppercase transition-colors ${FOCUS_RING_BASE} ${focusRingClassName("night")} ${
                active ? "border-cream bg-cream text-ink" : "border-cream-dim text-cream"
              }`}
            >
              {active && <span aria-hidden="true">✓</span>}
              {medium.revealText}
            </button>
          );
        })}
      </div>
      <InlineStatus id={noticeId} message={shownBlockedId === null ? null : copy.state.keepAtLeastOneMediumOn} />
    </fieldset>
  );
}
