import type { ButtonHTMLAttributes, ReactNode } from "react";
import { FOCUS_RING_BASE, focusRingClassName, type Ground } from "./ground";

export interface StageIconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Which ground this button sits on, for the focus-ring color. Defaults to the Stage's lilac. */
  ground?: Ground;
  /** The glyph (arrow-left for back, speaker for sound). */
  icon: ReactNode;
  /** Visible state caption, e.g. "SOUND OFF" (sound only; back has none). */
  caption?: string;
}

// DESIGN.md -> Components -> Actions: a 52px circle with a 1px
// plum-muted outline and a plum glyph, for back and sound. Always visible
// on the Stage, outside the safe area.
//
// Hover/press visuals are not specified for this control in DESIGN.md; we
// mirror the Line button's documented "fill at 8% of the text color on
// hover" rule as the nearest analog (spec Implementation Notes).
export function StageIconButton({
  ground = "lilac",
  icon,
  caption,
  className = "",
  type = "button",
  ...props
}: StageIconButtonProps) {
  return (
    <button
      type={type}
      className={`inline-flex min-h-target-min min-w-target-min flex-col items-center justify-center gap-1 rounded-disc border border-plum-muted text-plum transition-colors hover:bg-plum-muted/[0.08] active:bg-plum-muted/[0.12] ${FOCUS_RING_BASE} ${focusRingClassName(ground)} ${className}`}
      {...props}
    >
      {icon}
      {caption ? <span className="text-stage-meta uppercase">{caption}</span> : null}
    </button>
  );
}
