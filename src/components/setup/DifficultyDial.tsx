"use client";

import { useRef, type CSSProperties, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { copy } from "@/components/copy";
import { FOCUS_RING_BASE, focusRingClassName } from "@/components/ground";
import type { Level } from "@/domain/library/schema";
import {
  LEVELS,
  levelAngle,
  levelDisplayName,
  levelFromAngle,
  levelFromKey,
  levelFromPointerRatio,
  levelIndex,
  levelValueText,
} from "./dial";

export interface DifficultyDialProps {
  level: Level;
  onChange: (level: Level) => void;
  /** Rendered under the Level description (beside the dial on desktop). */
  children?: ReactNode;
}

// Disc label radius and disc center, in rem (no raw px in src/components):
// the 10rem (160px) disc sits at the bottom of a 14rem-tall slider box.
const LABEL_RADIUS = 6.5;
const DISC_CENTER_TOP = 9;

/**
 * DESIGN.md -> Components -> Difficulty Dial; EXPERIENCE.md -> Component
 * Patterns -> Difficulty Dial. One ARIA slider, always on night ground.
 * Desktop (`desktop:`) draws the 160px sun disc with a grape-deep notch and
 * the four labels around its upper arc; phones draw the horizontal
 * four-stop track. Both forms live inside the same slider element, so the
 * keyboard, focus, and ARIA semantics never change with the breakpoint.
 */
export function DifficultyDial({ level, onChange, children }: DifficultyDialProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const discRef = useRef<HTMLDivElement>(null);
  const index = levelIndex(level);
  const valueText = levelValueText(level, copy.level[level]);

  function change(next: Level) {
    if (next !== level) onChange(next);
  }

  function setFromPointer(clientX: number, clientY: number) {
    const disc = discRef.current?.getBoundingClientRect();
    if (disc && disc.width > 0) {
      const dx = clientX - (disc.left + disc.width / 2);
      const dy = clientY - (disc.top + disc.height / 2);
      change(levelFromAngle((Math.atan2(dx, -dy) * 180) / Math.PI));
      return;
    }
    const track = trackRef.current?.getBoundingClientRect();
    if (!track || track.width === 0) return;
    change(levelFromPointerRatio((clientX - track.left) / track.width));
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || event.altKey || event.metaKey || event.ctrlKey) return;
    const slider = event.currentTarget;
    slider.setPointerCapture(event.pointerId);
    slider.focus();
    const label = (event.target as Element).closest<HTMLElement>("[data-level]");
    const labelLevel = LEVELS.find((stop) => stop === label?.dataset.level);
    if (labelLevel) change(labelLevel);
    else setFromPointer(event.clientX, event.clientY);
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    setFromPointer(event.clientX, event.clientY);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.altKey || event.metaKey || event.ctrlKey) return;
    const next = levelFromKey(level, event.key);
    if (next === null) return;
    event.preventDefault();
    change(next);
  }

  function label(stop: Level, extra = "", style?: CSSProperties) {
    const active = stop === level;
    return (
      <span
        key={stop}
        data-level={stop}
        style={style}
        className={`inline-flex min-h-target-min cursor-pointer items-center gap-1 whitespace-nowrap ${extra}`}
      >
        {active && <span className="text-grape">✦</span>}
        <span className={active ? "underline decoration-2 underline-offset-4" : ""}>{levelDisplayName(stop)}</span>
      </span>
    );
  }

  return (
    <div className="flex flex-col gap-4 desktop:flex-row desktop:items-center desktop:gap-10">
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
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        className={`relative w-full shrink-0 touch-none select-none rounded-full text-button uppercase text-cream desktop:h-56 desktop:w-96 ${FOCUS_RING_BASE} ${focusRingClassName("night")}`}
      >
        {/* Phone: horizontal four-stop track, labels below. */}
        <div aria-hidden="true" className="flex flex-col desktop:hidden">
          <div className="flex h-14 items-center">
            <div ref={trackRef} className="relative h-1 w-full rounded-full bg-cream-dim">
              <span
                style={{ left: `${(index / (LEVELS.length - 1)) * 100}%` }}
                className="absolute top-1/2 size-7 -translate-x-1/2 -translate-y-1/2 rounded-disc border border-ink bg-gradient-to-b from-sun-light via-sun to-sun-deep"
              />
            </div>
          </div>
          <div className="flex flex-wrap justify-between gap-x-3">{LEVELS.map((stop) => label(stop))}</div>
        </div>
        {/* Desktop: 160px sun disc, notch pointing at the active stop, labels on its upper arc. */}
        <div aria-hidden="true" className="hidden desktop:block">
          <div
            ref={discRef}
            className="absolute bottom-0 left-1/2 size-40 -translate-x-1/2 rounded-disc bg-gradient-to-b from-sun-light via-sun to-sun-deep"
          >
            <div
              style={{ transform: `rotate(${levelAngle(level)}deg)` }}
              className="absolute inset-0 motion-safe:transition-transform motion-safe:duration-200"
            >
              <span className="absolute left-1/2 top-2 h-7 w-2 -translate-x-1/2 rounded-full bg-grape-deep" />
            </div>
          </div>
          {LEVELS.map((stop, i) => {
            const radians = (levelAngle(stop) * Math.PI) / 180;
            return label(stop, `absolute -translate-y-1/2 ${i < LEVELS.length / 2 ? "-translate-x-full" : ""}`, {
              left: `calc(50% + ${(LABEL_RADIUS * Math.sin(radians)).toFixed(3)}rem)`,
              top: `${(DISC_CENTER_TOP - LABEL_RADIUS * Math.cos(radians)).toFixed(3)}rem`,
            });
          })}
        </div>
      </div>
      <div className="flex flex-col gap-4">
        <p className="text-body text-cream-dim">{copy.level[level]}</p>
        {children}
      </div>
    </div>
  );
}
