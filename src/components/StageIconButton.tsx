import type { ButtonHTMLAttributes, ReactNode } from "react";
import { FOCUS_RING_BASE, focusRingClassName, type Ground } from "./ground";

// The Stage only ever renders on these two grounds (DESIGN.md -> Layout &
// Spacing -> Challenge Stage).
export type StageGround = Extract<Ground, "lilac" | "lilac-deep">;

export interface StageIconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Which Stage ground this button sits on, for the focus-ring color. */
  ground?: StageGround;
  /** The glyph (arrow-left for back, speaker for sound). */
  icon: ReactNode;
  /** Visible state caption, e.g. "SOUND OFF" (sound only; back has none). It
   * is not the accessible name — `aria-label` carries that. */
  caption?: string;
  /** Required: a caption is visible text, not an accessible name, and the
   * glyph alone names nothing to assistive tech. */
  "aria-label": string;
}

// `className` goes on the outer wrapper, so positioning (e.g. `fixed` corner
// placement) moves the disc and its caption together.

// DESIGN.md -> Components -> Actions: a 52px circle with a 1px
// plum-muted outline and a plum glyph, for back and sound. Always visible
// on the Stage, outside the safe area. The caption, when present, sits
// outside the circle so the circle itself always stays 52x52.
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
  disabled,
  ...props
}: StageIconButtonProps) {
  const tone = disabled
    ? "pointer-events-none border-cream-dim text-ink-soft"
    : "border-plum-muted text-plum hover:bg-plum-muted/[0.08] active:bg-plum-muted/[0.12]";

  return (
    <span className={`inline-flex flex-col items-center gap-1 ${className}`}>
      <button
        type={type}
        disabled={disabled}
        className={`flex size-target-min items-center justify-center rounded-disc border transition-colors ${FOCUS_RING_BASE} ${focusRingClassName(ground)} ${tone}`}
        {...props}
      >
        {icon}
      </button>
      {caption ? <span className="text-stage-meta uppercase">{caption}</span> : null}
    </span>
  );
}
