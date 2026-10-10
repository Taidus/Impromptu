"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { copy } from "@/components/copy";
import { FOCUS_RING_BASE, focusRingClassName } from "@/components/ground";
import { isPlainEscape } from "@/components/stage/logic";
import type { Skill } from "@/domain/library/schema";

export interface SkillInfoProps {
  skills: readonly Skill[];
  /** Which ground the Info button sits on (Setup's night, or Story 4.5's Stage lilac) -- picks its tone, focus-ring color, and panel placement. Defaults to Setup's existing night treatment. */
  ground?: "night" | "lilac";
}

/**
 * DESIGN.md -> Components -> Info button, Popover; EXPERIENCE.md ->
 * Component Patterns -> Info button, Popover (FR-3). A glossary over every
 * Skill's `info`, not just the selected one -- the AC's "each Skill's
 * one-sentence info" needs no sync with the Skill select's value. A
 * non-modal dialog: opens only on click/Enter (native button activation).
 * Focus on close: Esc and a second activation return focus to the button;
 * an outside click leaves focus on whatever was clicked (stealing it back
 * would undo that click); focus leaving button+panel (e.g. Tab away) just
 * closes it, since focus is already somewhere the user chose.
 *
 * Story 4.5 reuses this on the Stage (beside the Skill tab, once Held)
 * rather than duplicating it -- `ground` is the only thing that differs by
 * caller; everything else (glossary content, open/close behavior) is
 * identical.
 */

// Night: Setup's classes, unchanged since before `ground` existed. Lilac:
// like every other Stage icon button (StageIconButton, LockToggle) -- a
// plum-muted ring and plum glyph, no color transition (the Held Stage stays
// still). Its root is not `relative`, so the panel anchors to the caller's
// positioned wrapper (phone: the Stage's Skill row, starting at the Skill
// tab's left edge; desktop: the button's own slot in the margin) rather than
// to the button, which can sit too far left of a short Skill name to fit the
// panel. The Stage panel is capped at a fraction of the viewport and
// scrolls, so it stays above the action row (phone's fixed bottom bar, and
// desktop's in-flow row on a compact 800px-tall Stage).
const GROUND_STYLES = {
  night: { root: "relative", tone: "border-cream", panel: "right-0" },
  lilac: {
    root: undefined,
    tone: "border-plum-muted text-plum hover:bg-plum-muted/[0.08] active:bg-plum-muted/[0.12]",
    panel: "left-0 max-h-[45dvh] overflow-y-auto",
  },
} as const;
export function SkillInfo({ skills, ground = "night" }: SkillInfoProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const buttonId = useId();

  const closeAndRefocus = useCallback(() => {
    setOpen(false);
    buttonRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    // Capture phase + preventDefault: on the Stage (Story 4.5), the Stage's
    // own Esc-to-Setup handler (StagePage.tsx) is a *bubble*-phase document
    // listener gated on `isPlainEscape`'s `!event.defaultPrevented` check.
    // Capture always runs before bubble for the same event regardless of
    // which listener was attached first, so this is the one place that
    // needs to guarantee "Esc closes the popover before it reaches the
    // Stage" without the two components sharing any state.
    function onKeyDown(event: KeyboardEvent) {
      if (!isPlainEscape(event)) return;
      event.preventDefault();
      closeAndRefocus();
    }
    function onPointerDown(event: PointerEvent) {
      if (rootRef.current?.contains(event.target as Node)) return;
      setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open, closeAndRefocus]);

  const styles = GROUND_STYLES[ground];

  return (
    <div
      ref={rootRef}
      className={styles.root}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <button
        ref={buttonRef}
        id={buttonId}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={copy.setup.skillInfoLabel}
        onClick={() => (open ? closeAndRefocus() : setOpen(true))}
        className={`inline-flex size-target-min items-center justify-center rounded-disc border ${styles.tone} ${FOCUS_RING_BASE} ${focusRingClassName(ground)}`}
      >
        <span aria-hidden="true" className="text-button italic">
          i
        </span>
      </button>
      {open && (
        // Never wider than the phone content column; placement per GROUND_STYLES.
        // tabIndex -1: a click inside the panel moves focus into it, so the blur-close above doesn't fire.
        <div
          id={panelId}
          role="dialog"
          aria-labelledby={buttonId}
          tabIndex={-1}
          className={`absolute ${styles.panel} top-full z-10 mt-2 flex w-70 max-w-[calc(100vw_-_2*var(--spacing-gutter-phone))] flex-col gap-3 rounded-scrap bg-cream p-4 text-ink shadow-lift-soft focus:outline-none`}
        >
          <dl className="flex flex-col gap-2">
            {skills.map((skill) => (
              <div key={skill.id}>
                <dt className="text-label">{skill.revealText}</dt>
                <dd className="text-body text-ink-soft">{skill.info}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </div>
  );
}
