"use client";

import { copy } from "@/components/copy";

export interface QuickRevealSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

/**
 * DESIGN.md -> Components -> Switch (Quick reveal); EXPERIENCE.md ->
 * Component Patterns -> Switch (FR-14). A native checkbox carries
 * `role="switch"`, so Space/click toggling and the checked state come free
 * (the same reuse-the-native-control move as PerformTiming's radios). The
 * visible text label sits before the track; the ON/OFF word beside it is
 * `aria-hidden` -- the switch's own accessible name + checked state already
 * announce "Quick reveal, switch, on/off" without it.
 */
export function QuickRevealSwitch({ checked, onChange }: QuickRevealSwitchProps) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-3">
      <span className="text-body text-cream">{copy.setup.quickRevealLabel}</span>
      <span className="relative inline-flex h-6 w-11 shrink-0 items-center">
        <input type="checkbox" role="switch" checked={checked} onChange={(event) => onChange(event.target.checked)} className="peer sr-only" />
        <span
          aria-hidden="true"
          className={`absolute inset-0 rounded-full transition-colors ${checked ? "bg-grape" : "bg-cream-dim"} peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-[var(--spacing-focus-offset)] peer-focus-visible:outline-focus`}
        />
        <span
          aria-hidden="true"
          className={`absolute left-0.5 size-5 rounded-disc border border-ink bg-cream transition-transform ${checked ? "translate-x-5" : "translate-x-0"}`}
        />
      </span>
      <span aria-hidden="true" className="text-meta uppercase text-cream-dim">
        {checked ? copy.setup.quickRevealOn : copy.setup.quickRevealOff}
      </span>
    </label>
  );
}
