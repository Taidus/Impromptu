"use client";

import { useEffect, useId, useRef, useState } from "react";
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
 * one-sentence info" needs no sync with the Skill select's value. Opens
 * only on click/Enter (native button activation), closes on Esc, an
 * outside click, or a second activation, and returns focus to the button.
 */
export function SkillInfo({ skills }: SkillInfoProps) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  function close() {
    setOpen(false);
    buttonRef.current?.focus();
  }

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }
    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (panelRef.current?.contains(target) || buttonRef.current?.contains(target)) return;
      setOpen(false); // outside click: no focus-return, per EXPERIENCE.md's focus table (only Esc/second-activation do)
    }
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={copy.setup.skillInfoLabel}
        onClick={() => setOpen((wasOpen) => !wasOpen)}
        className={`inline-flex size-target-min items-center justify-center rounded-disc border border-cream ${FOCUS_RING_BASE} ${focusRingClassName("night")}`}
      >
        <span aria-hidden="true" className="text-button italic">
          i
        </span>
      </button>
      {open && (
        <div
          ref={panelRef}
          id={panelId}
          className="absolute left-0 top-full z-10 mt-2 flex max-w-70 flex-col gap-3 rounded-scrap bg-cream p-4 text-ink shadow-lift-soft"
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
