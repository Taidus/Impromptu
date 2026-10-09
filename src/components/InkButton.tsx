import type { ButtonHTMLAttributes } from "react";
import { FOCUS_RING_BASE, focusRingClassName, type Ground } from "./ground";

export interface InkButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Which ground this button sits on, for the focus-ring color. */
  ground?: Ground;
}

// DESIGN.md -> Components -> Actions: the secondary strong action
// ("Back to your challenge", Export, the night email signup button).
export function InkButton({
  ground = "night",
  className = "",
  type = "button",
  ...props
}: InkButtonProps) {
  // "On night it gets a 1px cream-dim outline so its edge holds 8.6:1."
  const edge = ground === "night" ? "outline outline-1 outline-cream-dim" : "";

  return (
    <button
      type={type}
      className={`inline-flex min-h-target-min items-center justify-center gap-2 rounded-full px-6 text-button uppercase bg-ink text-cream transition-opacity hover:opacity-90 active:opacity-80 ${edge} ${FOCUS_RING_BASE} ${focusRingClassName(ground)} ${className}`}
      {...props}
    />
  );
}
