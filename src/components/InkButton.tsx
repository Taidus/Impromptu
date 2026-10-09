import type { ComponentProps } from "react";
import { FOCUS_RING_BASE, focusRingClassName, type Ground } from "./ground";

export interface InkButtonProps extends ComponentProps<"button"> {
  /** Which ground this button sits on, for the focus-ring color. */
  ground?: Ground;
}

// InkButton's class list, shared with link-shaped ink actions (ClosingCall).
export function inkButtonClassName(ground: Ground, disabled = false): string {
  // "On night it gets a 1px cream-dim outline so its edge holds 8.6:1."
  // Drawn with `border`, not `outline`: the focus ring also uses `outline`,
  // and `focus:outline-none` (FOCUS_RING_BASE) would otherwise wipe this
  // edge the moment the button loses focus after a click.
  const edge = ground === "night" ? "border border-cream-dim" : "";
  const tone = disabled
    ? "pointer-events-none bg-cream-dim text-ink-soft"
    : "bg-ink text-cream hover:opacity-90 active:opacity-80";
  return `inline-flex min-h-target-min items-center justify-center gap-2 rounded-full px-6 text-button uppercase transition-opacity ${edge} ${FOCUS_RING_BASE} ${focusRingClassName(ground)} ${tone}`;
}

// DESIGN.md -> Components -> Actions: the secondary strong action
// ("Back to your challenge", Export, the night email signup button).
export function InkButton({
  ground = "night",
  className = "",
  type = "button",
  disabled,
  ...props
}: InkButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled}
      className={`${inkButtonClassName(ground, disabled)} ${className}`}
      {...props}
    />
  );
}
