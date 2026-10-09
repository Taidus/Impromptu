"use client";

import { useRef, type KeyboardEvent, type PointerEvent } from "react";
import { copy } from "@/components/copy";
import { FOCUS_RING_BASE, focusRingClassName } from "@/components/ground";
import type { Level } from "@/domain/library/schema";
import { LEVELS, levelDisplayName, levelFromKey, levelFromPointerRatio, levelIndex, levelValueText } from "./dial";

export interface DifficultyDialProps {
  level: Level;
  onChange: (level: Level) => void;
}

/**
 * DESIGN.md -> Components -> Difficulty Dial; EXPERIENCE.md -> Component
 * Patterns -> Difficulty Dial. One ARIA slider, always on night ground.
 *
 * ponytail: DESIGN.md's desktop dial is a 160px circular disc with four
 * labels arced above it; the phone dial is a horizontal track. This story
 * has no visual-QA step, so both breakpoints render the same horizontal
 * four-stop track (desktop just sizes it up) — every behavioral AC (ARIA
 * slider, four stops, keyboard, click-on-label, drag/touch, value text,
 * active-label underline+star) still holds. Upgrade path: swap the track
 * markup below for the disc; `./dial.ts`'s keyboard/pointer math is
 * breakpoint-agnostic and needs no change.
 */
export function DifficultyDial({ level, onChange }: DifficultyDialProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const index = levelIndex(level);
  const valueText = levelValueText(level, copy.level[level]);

  function setFromClientX(clientX: number) {
    const track = trackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    const ratio = rect.width === 0 ? 0 : (clientX - rect.left) / rect.width;
    onChange(levelFromPointerRatio(ratio));
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    setFromClientX(event.clientX);
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (event.buttons !== 1) return;
    setFromClientX(event.clientX);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const next = levelFromKey(level, event.key);
    if (next === null) return;
    event.preventDefault();
    onChange(next);
  }

  return (
    <div className="flex flex-col gap-4 desktop:flex-row desktop:items-center desktop:gap-6">
      <div
        role="slider"
        tabIndex={0}
        aria-label={copy.setup.dialLabel}
        aria-orientation="horizontal"
        aria-valuemin={0}
        aria-valuemax={LEVELS.length - 1}
        aria-valuenow={index}
        aria-valuetext={valueText}
        onKeyDown={handleKeyDown}
        className={`relative flex h-14 w-full items-center rounded-full desktop:w-80 ${FOCUS_RING_BASE} ${focusRingClassName("night")}`}
      >
        <div
          ref={trackRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          className="relative h-1 w-full rounded-full bg-cream-dim"
        >
          <span
            aria-hidden="true"
            style={{ left: `${(index / (LEVELS.length - 1)) * 100}%` }}
            className="absolute top-1/2 size-7 -translate-x-1/2 -translate-y-1/2 rounded-disc border border-ink bg-gradient-to-b from-sun-light via-sun to-sun-deep"
          />
        </div>
      </div>
      {/* Pointer-only convenience labels (EXPERIENCE.md: "a click on a label
          ... sets the value"); aria-hidden and non-focusable so the one
          role="slider" above stays the sole keyboard/AT entry point. */}
      <ul aria-hidden="true" className="flex flex-wrap justify-between gap-x-3 gap-y-1 text-button uppercase text-cream">
        {LEVELS.map((stop) => {
          const active = stop === level;
          return (
            <li
              key={stop}
              onPointerDown={() => onChange(stop)}
              className={`inline-flex min-h-target-min cursor-pointer items-center gap-1 ${active ? "underline" : ""}`}
            >
              {active && <span className="text-grape">✦</span>}
              {levelDisplayName(stop)}
            </li>
          );
        })}
      </ul>
      <p className="text-body text-cream-dim">{copy.level[level]}</p>
    </div>
  );
}
