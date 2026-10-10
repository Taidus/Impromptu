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
import { useEffect, useRef, useState, type Ref } from "react";
import { copy } from "@/components/copy";
import { FOCUS_RING_BASE, focusRingClassName } from "@/components/ground";
import type { RevealedKind } from "@/domain/session/schema";
import { emptySlotLabel, isPastTwoLines } from "./reveal-logic";

type InputKind = Exclude<RevealedKind, "brief">;

/** The CSS transform that counter-rotates a tilted piece's inner content back to level. */
function counter(tiltDeg: number): string {
  return `rotate(${-tiltDeg}deg)`;
}

/**
 * The visible label is decorative (`aria-hidden`); the value carries an
 * sr-only "Label: " prefix instead, so each landed piece's list item reads
 * as "Topic: coming home" (EXPERIENCE.md -> Accessibility Floor).
 */
function LabelValue({
  kind,
  value,
  labelClassName,
  valueClassName,
  valueRef,
}: {
  kind: InputKind;
  value: string;
  labelClassName: string;
  valueClassName: string;
  valueRef?: Ref<HTMLParagraphElement>;
}) {
  return (
    <>
      <p aria-hidden="true" className={`text-piece-label-phone uppercase desktop:text-piece-label ${labelClassName}`}>
        {copy.stage.piece[kind]}
      </p>
      <p ref={valueRef} className={`wrap-anywhere hyphens-auto ${valueClassName}`}>
        <span className="sr-only">{copy.stage.piece[kind]}: </span>
        {value}
      </p>
    </>
  );
}

/** Not focusable (EXPERIENCE.md -> Component Patterns): a piece's final footprint before it lands. */
export function EmptySlot({ kind, tiltDeg, className = "" }: { kind: InputKind; tiltDeg?: number; className?: string }) {
  const label = (
    <>
      <span aria-hidden="true" className="text-piece-label-phone uppercase text-plum-muted desktop:text-piece-label">
        {copy.stage.piece[kind]}
      </span>
      <span className="sr-only">{emptySlotLabel(kind)}</span>
    </>
  );
  // No tilt: the Topic's slot is the dashed scrap itself, already tilted by ScrapGroup.
  if (tiltDeg === undefined) return label;
  return (
    <div
      className={`rounded-scrap border border-dashed border-plum-muted px-3 py-2 ${className}`}
      style={{ transform: `rotate(${tiltDeg}deg)` }}
    >
      {label}
    </div>
  );
}

/** Skill or Medium (DESIGN.md: cream card, perforated left edge, tilted ±1.5°). */
export function TicketTab({ kind, value, tiltDeg }: { kind: "skill" | "medium"; value: string; tiltDeg: number }) {
  return (
    <div
      className="min-w-0 rounded-scrap border-l border-dotted border-ink-soft bg-cream px-4 py-2 shadow-lift-soft"
      style={{ transform: `rotate(${tiltDeg}deg)` }}
    >
      <div style={{ transform: counter(tiltDeg) }}>
        <LabelValue
          kind={kind}
          value={value}
          labelClassName="text-vermilion-ink"
          valueClassName="text-tab-value-stage-phone text-ink desktop:text-tab-value-stage"
        />
      </div>
    </div>
  );
}

/** Style (DESIGN.md: iridescent foil, tilted 4°). */
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
          kind="style"
          value={value}
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
          kind="constraint"
          value={value}
          labelClassName="text-stamp"
          valueClassName="text-stamp-stage-phone uppercase text-stamp desktop:text-stamp-stage"
        />
      </div>
    </div>
  );
}

/**
 * The landed Topic. DESIGN.md -> Fit rule step 2: on desktop it drops to
 * `topic-stage-long` once the value runs past two lines. One-way per value
 * (the caller keys this on the value), so the smaller size can't flip it
 * back and forth.
 */
function TopicValue({ value }: { value: string }) {
  const valueRef = useRef<HTMLParagraphElement>(null);
  const [long, setLong] = useState(false);
  useEffect(() => {
    const el = valueRef.current;
    if (el === null || long) return;
    const observer = new ResizeObserver(() => {
      if (isPastTwoLines(el.getBoundingClientRect().height, parseFloat(getComputedStyle(el).lineHeight))) setLong(true);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [long]);
  return (
    <LabelValue
      kind="topic"
      value={value}
      valueRef={valueRef}
      labelClassName="text-vermilion-ink"
      valueClassName={`text-topic-stage-phone text-ink ${long ? "desktop:text-topic-stage-long" : "desktop:text-topic-stage"}`}
    />
  );
}

interface ScrapPiece {
  present: boolean;
  revealed: boolean;
  value: string;
}

/**
 * Topic, plus the Style foil slip (tucked over its top-right corner) and
 * the Constraint ink stamp (pressed into its bottom band) when the
 * Challenge has them. DESIGN.md -> Challenge Stage: "Empty (pre-Reveal):
 * empty slots in their final positions" -- so this group always renders at
 * the same width and corner/band positions, whether each piece is still a
 * dashed footprint or has landed; only its own content toggles.
 *
 * The foil floats right inside the scrap, so the Topic text wraps around it
 * and never sits under it (DESIGN.md: "the scrap reserves 40% of its top row
 * for it"). Style and Constraint still render on a Topic-less Challenge:
 * the scrap is then a plain paper band, since the stamp is always on paper.
 */
export function ScrapGroup({ topic, style, constraint }: { topic: ScrapPiece; style: ScrapPiece; constraint: ScrapPiece }) {
  const scrapTiltDeg = -1.2;
  const foil = style.present ? (
    style.revealed ? <FoilSlip value={style.value} tiltDeg={4} /> : <EmptySlot kind="style" tiltDeg={4} />
  ) : null;
  if (!topic.present && !constraint.present) return <div className="ml-auto w-2/5 max-w-40">{foil}</div>;
  return (
    <div
      className={`rounded-scrap px-4 py-3 shadow-lift-soft ${topic.present && !topic.revealed ? "border border-dashed border-plum-muted" : "bg-paper"}`}
      style={{ transform: `rotate(${scrapTiltDeg}deg)` }}
    >
      <div className="flow-root" style={{ transform: counter(scrapTiltDeg) }}>
        {foil !== null ? <div className="float-right -mt-6 -mr-7 ml-3 w-2/5 max-w-40">{foil}</div> : null}
        {topic.present ? topic.revealed ? <TopicValue key={topic.value} value={topic.value} /> : <EmptySlot kind="topic" /> : null}
        {constraint.present ? (
          <div className="clear-both mt-2 flex min-h-14 items-center justify-end">
            {constraint.revealed ? <InkStamp value={constraint.value} tiltDeg={-7} /> : <EmptySlot kind="constraint" tiltDeg={-7} />}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** Arrives last; plain, no texture, tilt, or decoration (DESIGN.md: max 34ch). */
export function BriefBlock({ brief, guidance, ref }: { brief: string; guidance: string | null; ref?: Ref<HTMLDivElement> }) {
  // tabIndex -1: focus target when the last piece lands and the Reveal next button unmounts.
  return (
    <div ref={ref} tabIndex={-1} className={`max-w-[34ch] ${FOCUS_RING_BASE} ${focusRingClassName("lilac")}`}>
      <p className="text-brief-stage-phone text-plum desktop:text-brief-stage">{brief}</p>
      {guidance !== null ? <p className="mt-2 text-lede text-plum-muted">{guidance}</p> : null}
    </div>
  );
}
