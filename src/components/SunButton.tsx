import type { ButtonHTMLAttributes } from "react";
import { FOCUS_RING_BASE, focusRingClassName, type Ground } from "./ground";

export interface SunButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Which ground this button sits on, for the focus-ring color. */
  ground?: Ground;
}

// DESIGN.md -> Components -> Actions: the one primary action per view.
// Never render two on the same screen. On the Stage it relabels per step
// (EXPERIENCE.md -> Component Patterns) by changing `children`, which keeps
// this same element — and its focus — across relabels.
export function SunButton({
  ground = "night",
  disabled,
  className = "",
  type = "button",
  ...props
}: SunButtonProps) {
  const tone = disabled
    ? "bg-cream-dim text-ink-soft"
    : "bg-gradient-to-b from-sun-light via-sun to-sun-deep text-ink shadow-sun-glow hover:-translate-y-0.5 active:translate-y-px";

  return (
    <button
      type={type}
      disabled={disabled}
      className={`inline-flex min-h-target-min items-center justify-center gap-2 rounded-full px-6 text-button-sun uppercase transition-transform duration-[250ms] ease-out ${FOCUS_RING_BASE} ${focusRingClassName(ground)} ${tone} ${className}`}
      {...props}
    />
  );
}
