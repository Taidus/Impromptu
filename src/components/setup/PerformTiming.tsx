"use client";

import { useLayoutEffect, useRef } from "react";
import { copy } from "@/components/copy";
import type { PerformTiming } from "@/domain/session/schema";

export interface PerformTimingControlProps {
  value: PerformTiming;
  onChange: (value: PerformTiming) => void;
}

const OPTIONS: readonly PerformTiming[] = ["timed", "untimed", "either"];

/**
 * DESIGN.md -> Components -> Segmented control; EXPERIENCE.md -> Component
 * Patterns -> Segmented control: a radio group, so plain same-`name`
 * `<input type="radio">`s give Tab-enters/leaves-as-one-stop and
 * arrow-key-moves-selection for free — no custom keydown handling needed.
 */
export function PerformTimingControl({ value, onChange }: PerformTimingControlProps) {
  const ref = useRef<HTMLFieldSetElement>(null);

  // EXPERIENCE.md -> Focus targets: focus is never lost when a control
  // disappears. If the Level leaves Perform while a radio has focus (e.g. a
  // change from another tab), hand focus to the visible dial.
  useLayoutEffect(() => {
    const fieldset = ref.current;
    return () => {
      if (!fieldset?.contains(document.activeElement)) return;
      const slider = [...document.querySelectorAll<HTMLElement>('[role="slider"]')].find((el) => el.offsetParent !== null);
      slider?.focus();
    };
  }, []);

  // min-w-0: a fieldset defaults to min-content width, which would block wrapping at 320px.
  return (
    <fieldset ref={ref} className="min-w-0">
      <legend className="sr-only">{copy.setup.performTimingLegend}</legend>
      <div className="flex w-fit max-w-full flex-wrap gap-1 rounded-full border border-cream-dim p-1">
        {OPTIONS.map((option) => (
          <label
            key={option}
            className="relative inline-flex cursor-pointer items-center justify-center rounded-full"
          >
            <input
              type="radio"
              name="performTiming"
              value={option}
              checked={value === option}
              onChange={() => onChange(option)}
              className="peer sr-only"
            />
            <span
              className="inline-flex min-h-target-min items-center gap-1 rounded-full px-4 text-button uppercase text-cream transition-colors peer-checked:bg-cream peer-checked:text-ink peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-[var(--spacing-focus-offset)] peer-focus-visible:outline-focus"
            >
              {value === option && <span aria-hidden="true">✓</span>}
              {copy.performTiming[option]}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
