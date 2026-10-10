"use client";

import { useId } from "react";
import { FOCUS_RING_BASE, focusRingClassName } from "@/components/ground";
import type { SelectOption } from "./options";

export interface SetupSelectProps {
  label: string;
  value: string;
  options: readonly SelectOption[];
  onChange: (value: string) => void;
  className?: string;
}

/**
 * DESIGN.md -> Components -> Select field: a cream-outlined pill with a
 * chevron, opening the native option list. Shared by "This time" and Skill
 * (EXPERIENCE.md -> Component Patterns -> Select field) so both selects
 * stay visually and behaviorally identical.
 */
export function SetupSelect({ label, value, options, onChange, className = "" }: SetupSelectProps) {
  const id = useId();
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label htmlFor={id} className="text-label">
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={`min-h-target-min w-full appearance-none rounded-full border border-cream-dim bg-night px-4 pr-10 text-button uppercase text-cream ${FOCUS_RING_BASE} ${focusRingClassName("night")}`}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <span aria-hidden="true" className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-cream-dim">
          ▾
        </span>
      </div>
    </div>
  );
}
