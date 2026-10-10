// The Reveal pieces themselves (Story 3.10): presentational only, no store
// access. DESIGN.md -> Components -> "On the Stage". Material tilts; labels
// and values are counter-rotated back to horizontal inside every tilted
// piece (DESIGN.md -> Typography: "Essential text is always horizontal").
//
// No `paper-scrap.webp`/`ink-mask.png` asset exists yet anywhere in the app
// (same gap Story 3.9 flagged for the grain overlay). Per the Assets table's
// own documented fallback ("Flat {colors.paper} scrap" / "plain rule"), the
// paper scrap uses a flat `bg-paper` fill and the ink stamp's double rule
// uses CSS's native `border-style: double` -- both token-only, no image
// request. Replace with the real texture/mask once Story 8.2 (or a future
// asset story) adds them.
import type { ReactNode } from "react";
import { copy } from "@/components/copy";
import type { RevealedKind } from "@/domain/session/schema";
import { emptySlotLabel } from "./reveal-logic";

/** Negates a `"<n>deg"` string so a tilted piece's inner content counter-rotates back to level. */
function counter(tiltDeg: number): string {
  return `rotate(${-tiltDeg}deg)`;
}

interface PieceLabelValueProps {
  label: string;
  value: ReactNode;
  labelClassName: string;
  valueClassName: string;
}

function LabelValue({ label, value, labelClassName, valueClassName }: PieceLabelValueProps) {
  return (
    <>
      <p aria-hidden="true" className={`text-piece-label-phone uppercase desktop:text-piece-label ${labelClassName}`}>
        {label}
      </p>
      <p className={valueClassName}>{value}</p>
    </>
  );
}

/** Not focusable (EXPERIENCE.md -> Component Patterns): a piece's final footprint before it lands. */
export function EmptySlot({ kind, tiltDeg, className = "" }: { kind: Exclude<RevealedKind, "brief">; tiltDeg: number; className?: string }) {
  return (
    <div
      className={`rounded-scrap border border-dashed border-plum-muted px-3 py-2 ${className}`}
      style={{ transform: `rotate(${tiltDeg}deg)` }}
    >
      <span aria-hidden="true" className="text-piece-label-phone uppercase text-plum-muted desktop:text-piece-label">
        {copy.stage.piece[kind]}
      </span>
      <span className="sr-only">{emptySlotLabel(kind)}</span>
    </div>
  );
}

/** Skill or Medium (DESIGN.md: cream card, perforated left edge, tilted ±1.5°). */
export function TicketTab({ kind, value, tiltDeg }: { kind: "skill" | "medium"; value: string; tiltDeg: number }) {
  return (
    <div
      className="rounded-scrap border-l border-dotted border-ink-soft bg-cream px-4 py-2 shadow-lift-soft"
      style={{ transform: `rotate(${tiltDeg}deg)` }}
    >
      <div style={{ transform: counter(tiltDeg) }}>
        <LabelValue
          label={copy.stage.piece[kind]}
          value={value}
          labelClassName="text-vermilion-ink"
          valueClassName="text-tab-value-stage-phone text-ink desktop:text-tab-value-stage"
        />
      </div>
    </div>
  );
}

/** Style, tucked over the paper scrap's top-right corner (DESIGN.md: iridescent foil, tilted 4°). */
export function FoilSlip({ value, tiltDeg }: { value: string; tiltDeg: number }) {
  return (
    <div
      className="px-3 py-2"
      style={{
        transform: `rotate(${tiltDeg}deg)`,
        background: "linear-gradient(120deg, var(--color-foil-a), var(--color-foil-b), var(--color-foil-c), var(--color-foil-d))",
      }}
    >
      <div style={{ transform: counter(tiltDeg) }}>
        <LabelValue
          label={copy.stage.piece.style}
          value={<span className="italic">{value}</span>}
          labelClassName="text-plum"
          valueClassName="text-style-stage-phone italic text-plum desktop:text-style-stage"
        />
      </div>
    </div>
  );
}

/**
 * Constraint, always printed on the paper scrap's bottom band, never
 * directly on lilac (DESIGN.md: double-rule stamp, tilted -7°). The double
 * rule is CSS's native `border-style: double`, not `ink-mask.png` wear --
 * see the file header note.
 */
export function InkStamp({ value, tiltDeg }: { value: string; tiltDeg: number }) {
  return (
    <div className="border-y-4 border-double border-stamp px-3 py-1" style={{ transform: `rotate(${tiltDeg}deg)` }}>
      <div style={{ transform: counter(tiltDeg) }}>
        <LabelValue
          label={copy.stage.piece.constraint}
          value={<span className="uppercase">{value}</span>}
          labelClassName="text-stamp"
          valueClassName="text-stamp-stage-phone uppercase text-stamp desktop:text-stamp-stage"
        />
      </div>
    </div>
  );
}

/**
 * Topic, plus the Style foil slip (tucked over its top-right corner) and
 * the Constraint ink stamp (pressed into its bottom band) when the
 * Challenge has them. DESIGN.md -> Challenge Stage: "Empty (pre-Reveal):
 * empty slots in their final positions" -- so this group always renders at
 * the same width and corner/band positions, whether Topic/Style/Constraint
 * are each still a dashed footprint or have landed; only their own content
 * toggles as `revealed` grows.
 */
export function ScrapGroup({
  topicRevealed,
  topicValue,
  stylePresent,
  styleRevealed,
  styleValue,
  constraintPresent,
  constraintRevealed,
  constraintValue,
}: {
  topicRevealed: boolean;
  topicValue: string;
  stylePresent: boolean;
  styleRevealed: boolean;
  styleValue: string;
  constraintPresent: boolean;
  constraintRevealed: boolean;
  constraintValue: string;
}) {
  const scrapTiltDeg = -1.2;
  return (
    <div className="relative w-full">
      <div
        className={`rounded-scrap px-4 py-3 shadow-lift-soft ${topicRevealed ? "bg-paper" : "border border-dashed border-plum-muted"}`}
        style={{ transform: `rotate(${scrapTiltDeg}deg)` }}
      >
        <div style={{ transform: counter(scrapTiltDeg) }}>
          {topicRevealed ? (
            <LabelValue
              label={copy.stage.piece.topic}
              value={topicValue}
              labelClassName="text-vermilion-ink"
              valueClassName="text-topic-stage-phone text-ink desktop:text-topic-stage"
            />
          ) : (
            <>
              <span aria-hidden="true" className="text-piece-label-phone uppercase text-plum-muted desktop:text-piece-label">
                {copy.stage.piece.topic}
              </span>
              <span className="sr-only">{emptySlotLabel("topic")}</span>
            </>
          )}
          {constraintPresent ? (
            <div className="mt-2 flex min-h-14 items-center justify-end">
              {constraintRevealed ? <InkStamp value={constraintValue} tiltDeg={-7} /> : <EmptySlot kind="constraint" tiltDeg={-7} />}
            </div>
          ) : null}
        </div>
      </div>
      {stylePresent ? (
        <div className="absolute right-0 top-0 w-2/5 max-w-40">
          {styleRevealed ? <FoilSlip value={styleValue} tiltDeg={4} /> : <EmptySlot kind="style" tiltDeg={4} />}
        </div>
      ) : null}
    </div>
  );
}

/** Arrives last; plain, no texture, tilt, or decoration (DESIGN.md: max 34ch). */
export function BriefBlock({ brief, guidance }: { brief: string; guidance: string | null }) {
  return (
    <div className="max-w-[34ch]">
      <p className="text-brief-stage-phone text-plum desktop:text-brief-stage">{brief}</p>
      {guidance !== null ? <p className="mt-2 text-lede text-plum-muted">{guidance}</p> : null}
    </div>
  );
}
