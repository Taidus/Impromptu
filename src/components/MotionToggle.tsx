"use client";

import { copy } from "@/components/copy";
import { useId } from "react";
import { FOCUS_RING_BASE, focusRingClassName } from "@/components/ground";
import { lineButtonTone } from "@/components/LineButton";
import { useAmbientMotion } from "@/components/motion";

export interface MotionToggleButtonProps {
  on: boolean;
  disabled: boolean;
  title?: string;
  onToggle: () => void;
}

// DESIGN.md -> Components -> Actions: LineButton-styled (1px outline pill,
// hover fill at 8% of the text color on hover) but sized `text-meta`, with
// an inline play/pause glyph. The visible label is the accessible name
// (WCAG 2.2.2), so no separate `aria-label` is needed. Pure/props-driven so
// its on/off/disabled markup is unit-testable without the real store.
// `title` also renders as an sr-only description linked by aria-describedby.
export function MotionToggleButton({ on, disabled, title, onToggle }: MotionToggleButtonProps) {
  const descriptionId = useId();

  return (
    <>
      <button
        type="button"
        aria-pressed={on}
        disabled={disabled}
        title={title}
        aria-describedby={title ? descriptionId : undefined}
        onClick={onToggle}
        className={`inline-flex min-h-target-min items-center gap-1.5 rounded-full border px-4 text-meta uppercase transition-colors ${FOCUS_RING_BASE} ${focusRingClassName("night")} ${lineButtonTone("night", disabled)}`}
      >
        {on ? <PlayIcon /> : <PauseIcon />}
        {on ? copy.motion.on : copy.motion.off}
      </button>
      {title && (
        <span className="sr-only" id={descriptionId}>
          {title}
        </span>
      )}
    </>
  );
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" width={14} height={14} fill="currentColor" aria-hidden="true">
      <path d="M6 4l14 8-14 8V4z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg viewBox="0 0 24 24" width={14} height={14} fill="currentColor" aria-hidden="true">
      <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
    </svg>
  );
}

/**
 * The wired Motion toggle (Story 8.3, WCAG 2.2.2 / UX-DR10): reads and
 * writes `setup.ambientMotion` through the store. AD-10: before the store
 * is ready it renders disabled and reads MOTION ON (the neutral
 * placeholder) and never flashes OFF, even under reduced motion.
 */
export function MotionToggle() {
  const { ambientMotion, reduced, ready, set } = useAmbientMotion();

  return (
    <MotionToggleButton
      on={!ready || (ambientMotion && !reduced)}
      disabled={!ready || reduced}
      title={ready && reduced ? copy.motion.reducedTitle : undefined}
      onToggle={() => set(!ambientMotion)}
    />
  );
}
