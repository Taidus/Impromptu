"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { copy } from "@/components/copy";
import { FOCUS_RING_BASE, focusRingClassName } from "@/components/ground";
import type { Skill } from "@/domain/library/schema";

export interface SkillInfoProps {
  skills: readonly Skill[];
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
 */
export function SkillInfo({ skills }: SkillInfoProps) {
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
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closeAndRefocus();
    }
    function onPointerDown(event: PointerEvent) {
      if (rootRef.current?.contains(event.target as Node)) return;
      setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open, closeAndRefocus]);

  return (
    <div
      ref={rootRef}
      className="relative"
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
        className={`inline-flex size-target-min items-center justify-center rounded-disc border border-cream ${FOCUS_RING_BASE} ${focusRingClassName("night")}`}
      >
        <span aria-hidden="true" className="text-button italic">
          i
        </span>
      </button>
      {open && (
        // Right-aligned to the button (which ends the Skill row), never wider than the phone content column.
        // tabIndex -1: a click inside the panel moves focus into it, so the blur-close above doesn't fire.
        <div
          id={panelId}
          role="dialog"
          aria-labelledby={buttonId}
          tabIndex={-1}
          className="absolute right-0 top-full z-10 mt-2 flex w-70 max-w-[calc(100vw_-_2*var(--spacing-gutter-phone))] flex-col gap-3 rounded-scrap bg-cream p-4 text-ink shadow-lift-soft focus:outline-none"
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
