import type { ButtonHTMLAttributes } from "react";
import { FOCUS_RING_BASE, focusRingClassName, groundTextClassName, type Ground } from "./ground";

export interface LineButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Which ground this button sits on, for text, border, and focus-ring color. */
  ground?: Ground;
}

// DESIGN.md -> Components -> Actions: quiet actions (Reroll, Discard,
// Pause/Resume, Change it again). A 1px outline pill in the ground's text
// color; hover fills at 8% of that color.
export function LineButton({
  ground = "night",
  className = "",
  type = "button",
  ...props
}: LineButtonProps) {
  return (
    <button
      type={type}
      className={`inline-flex min-h-target-min items-center justify-center gap-2 rounded-full border border-current px-6 text-button uppercase transition-colors hover:bg-current/[0.08] active:bg-current/[0.12] ${groundTextClassName(ground)} ${FOCUS_RING_BASE} ${focusRingClassName(ground)} ${className}`}
      {...props}
    />
  );
}
