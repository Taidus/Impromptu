import type { ComponentProps } from "react";
import { FOCUS_RING_BASE, focusRingClassName, groundTextClassName, type Ground } from "./ground";

export interface LineButtonProps extends ComponentProps<"button"> {
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
  disabled,
  ...props
}: LineButtonProps) {
  const tone = disabled
    ? "pointer-events-none border-cream-dim text-ink-soft"
    : `border-current hover:bg-current/[0.08] active:bg-current/[0.12] ${groundTextClassName(ground)}`;

  return (
    <button
      type={type}
      disabled={disabled}
      className={`inline-flex min-h-target-min items-center justify-center gap-2 rounded-full border px-6 text-button uppercase transition-colors ${FOCUS_RING_BASE} ${focusRingClassName(ground)} ${tone} ${className}`}
      {...props}
    />
  );
}
