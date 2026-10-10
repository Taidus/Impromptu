"use client";

import { useId, useState } from "react";
import { copy } from "@/components/copy";
import { FOCUS_RING_BASE, focusRingClassName } from "@/components/ground";
import type { Medium, MediumId } from "@/domain/library/schema";

export interface MediumsRowProps {
  mediums: readonly Medium[];
  enabledMediums: readonly MediumId[];
  onToggle: (mediumId: MediumId) => void;
}

/**
 * DESIGN.md -> Components -> Chip toggle; EXPERIENCE.md -> Component
 * Patterns -> Chip toggle (FR-2). `Setup.enabledMediums` is schema-guaranteed
 * `min(1)` with no duplicates (Story 3.2), so "this chip is the only one
 * enabled" is exactly `active && enabledMediums.length === 1` -- no reducer
 * call needed to predict the guard it already enforces.
 */
export function MediumsRow({ mediums, enabledMediums, onToggle }: MediumsRowProps) {
  const [blockedId, setBlockedId] = useState<MediumId | null>(null);
  const noticeId = useId();

  function handleClick(medium: Medium) {
    const active = enabledMediums.includes(medium.id);
    const isLastEnabled = active && enabledMediums.length === 1;
    setBlockedId(isLastEnabled ? medium.id : null);
    onToggle(medium.id);
  }

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-label">{copy.setup.mediumsLabel}</legend>
      <div className="flex flex-wrap gap-2">
        {mediums.map((medium) => {
          const active = enabledMediums.includes(medium.id);
          return (
            <button
              key={medium.id}
              type="button"
              aria-pressed={active}
              aria-describedby={medium.id === blockedId ? noticeId : undefined}
              onClick={() => handleClick(medium)}
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
      {blockedId !== null && (
        <p id={noticeId} role="status" className="flex items-start gap-2 text-body text-cream-dim">
          <span aria-hidden="true" className="mt-2 size-2.5 shrink-0 rounded-disc bg-vermilion" />
          {copy.state.keepAtLeastOneMediumOn}
        </p>
      )}
    </fieldset>
  );
}
