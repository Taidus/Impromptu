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
  return (
    <fieldset className="flex gap-1 rounded-full border border-cream-dim p-1">
      <legend className="sr-only">{copy.setup.performTimingLegend}</legend>
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
    </fieldset>
  );
}
