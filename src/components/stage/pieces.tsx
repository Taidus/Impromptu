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
import { useEffect, useRef, useState, type CSSProperties, type ReactNode, type Ref } from "react";
import { config } from "@/config/app";
import { copy } from "@/components/copy";
import { FOCUS_RING_BASE, focusRingClassName } from "@/components/ground";
import type { RevealedKind } from "@/domain/session/schema";
import { LockIcon } from "./icons";
import { emptySlotLabel, isPastTwoLines } from "./reveal-logic";

type InputKind = Exclude<RevealedKind, "brief">;

/** The CSS transform that counter-rotates a tilted piece's inner content back to level. */
function counter(tiltDeg: number): string {
  return `rotate(${-tiltDeg}deg)`;
}

/** A piece's entrance or shimmer: the utility class plus its `animation-duration`, as an inline CSS variable. */
export interface PieceMotion {
  className: string;
  style: CSSProperties;
}

const NO_MOTION: PieceMotion = { className: "", style: {} };

const durationVar = (ms: number) => ({ "--motion-ms": `${ms}ms` }) as CSSProperties;

/**
 * Story 4.1 / UX-DR22: the landing entrance per material. Durations come
 * from `config.reveal.motion` (the same values `useRevealMotion`'s timers
 * use), never CSS literals. `motion-reduce:` mirrors this codebase's
 * per-animation guard (SunButton, Ticker) -- Story 4.2 owns the full
 * reduced-motion fade.
 */
const LAND_CLASS: Record<RevealedKind, string> = {
  skill: "animate-land-tabs motion-reduce:animate-none",
  medium: "animate-land-tabs motion-reduce:animate-none",
  topic: "animate-land-tabs motion-reduce:animate-none",
  style: "animate-land-foil motion-reduce:animate-none",
  constraint: "animate-land-stamp motion-reduce:animate-none",
  brief: "animate-land-brief motion-reduce:animate-none",
};

export function landingMotion(kind: RevealedKind): PieceMotion {
  return { className: LAND_CLASS[kind], style: durationVar(config.reveal.motion.landMs[kind]) };
}

/** The foil's shimmer, only while it's actively shuffling: one pulse per shuffle. */
export const SHIMMER_MOTION: PieceMotion = {
  className: "animate-foil-shimmer motion-reduce:animate-none",
  style: durationVar(config.reveal.motion.shuffleMs),
};

/**
 * The `aria-hidden` candidate-flick layer (EXPERIENCE.md -> Revealing): the
 * accessible text stays "<Kind>, not revealed yet." (same as `EmptySlot`)
 * until the real value lands -- the flicker piece itself is never exposed
 * to assistive tech.
 */
export function ShufflingPiece({ kind, children }: { kind: InputKind; children: ReactNode }) {
  return (
    <>
      <span className="sr-only">{emptySlotLabel(kind)}</span>
      <div aria-hidden="true">{children}</div>
    </>
  );
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

/**
 * DESIGN.md -> Lock toggle: unlocked an outline plum-muted padlock disc;
 * locked an ink disc with a cream padlock plus a "LOCKED" caption beside it.
 * The accessible name is fixed (AC: "fixed name such as 'Lock Topic'") --
 * only `aria-pressed` and the caption carry state. Shown only once a
 * Challenge is fully revealed and held, before Start creating (Story 4.3 --
 * RevealComposition decides when).
 */
export function LockToggle({ kind, locked, onToggle }: { kind: InputKind; locked: boolean; onToggle: () => void }) {
  const tone = locked
    ? "border-ink bg-ink text-cream"
    : "border-plum-muted text-plum-muted hover:bg-plum-muted/[0.08] active:bg-plum-muted/[0.12]";
  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        aria-pressed={locked}
        aria-label={copy.stage.lock.toggleLabel(copy.stage.piece[kind])}
        onClick={onToggle}
        className={`flex size-target-min items-center justify-center rounded-disc border transition-colors ${FOCUS_RING_BASE} ${focusRingClassName("lilac")} ${tone}`}
      >
        <LockIcon />
      </button>
      {locked ? (
        <span aria-hidden="true" className="text-piece-label-phone uppercase text-plum desktop:text-piece-label">
          {copy.stage.lock.lockedCaption}
        </span>
      ) : null}
    </span>
  );
}

/** Skill or Medium (DESIGN.md: cream card, perforated left edge, tilted ±1.5°). */
export function TicketTab({
  kind,
  value,
  tiltDeg,
  motion = NO_MOTION,
}: {
  kind: "skill" | "medium";
  value: string;
  tiltDeg: number;
  motion?: PieceMotion;
}) {
  return (
    <div
      className={`min-w-0 rounded-scrap border-l border-dotted border-ink-soft bg-cream px-4 py-2 shadow-lift-soft ${motion.className}`}
      style={{ ...motion.style, transform: `rotate(${tiltDeg}deg)` }}
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
export function FoilSlip({ value, tiltDeg, motion = NO_MOTION }: { value: string; tiltDeg: number; motion?: PieceMotion }) {
  return (
    <div
      className={`px-3 py-2 ${motion.className}`}
      style={{
        ...motion.style,
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
export function InkStamp({ value, tiltDeg, motion = NO_MOTION }: { value: string; tiltDeg: number; motion?: PieceMotion }) {
  return (
    <div
      className={`border-y-4 border-double border-stamp px-3 py-1 ${motion.className}`}
      style={{ ...motion.style, transform: `rotate(${tiltDeg}deg)` }}
    >
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
 * back and forth. Not keyed during a shuffle, so the size stays put across flicks.
 */
function TopicValue({ value, motion = NO_MOTION }: { value: string; motion?: PieceMotion }) {
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
    <div className={motion.className} style={motion.style}>
      <LabelValue
        kind="topic"
        value={value}
        valueRef={valueRef}
        labelClassName="text-vermilion-ink"
        valueClassName={`text-topic-stage-phone text-ink ${long ? "desktop:text-topic-stage-long" : "desktop:text-topic-stage"}`}
      />
    </div>
  );
}

/**
 * `landing`: the piece's own `motion.state.status === "landing"` window --
 * the real value is already known (the Challenge is composed in full at
 * commit, Story 4.1), so it renders exactly like `revealed`, just with the
 * entrance animation; `revealed` itself (and the live-region announcement)
 * only flips once that window elapses (`useRevealMotion`). `shufflingText`:
 * the current aria-hidden flick candidate, or `null` outside a shuffle.
 */
interface ScrapPiece {
  present: boolean;
  revealed: boolean;
  landing: boolean;
  shufflingText: string | null;
  value: string;
}

function hasMaterial(piece: ScrapPiece): boolean {
  return piece.revealed || piece.landing || piece.shufflingText !== null;
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
  const foil = !style.present
    ? null
    : style.revealed || style.landing
      ? <FoilSlip value={style.value} tiltDeg={4} motion={style.landing ? landingMotion("style") : NO_MOTION} />
      : style.shufflingText !== null
        ? (
            <ShufflingPiece kind="style">
              <FoilSlip value={style.shufflingText} tiltDeg={4} motion={SHIMMER_MOTION} />
            </ShufflingPiece>
          )
        : <EmptySlot kind="style" tiltDeg={4} />;
  if (!topic.present && !constraint.present) return <div className="ml-auto w-2/5 max-w-40">{foil}</div>;
  return (
    <div
      className={`rounded-scrap px-4 py-3 shadow-lift-soft ${topic.present && !hasMaterial(topic) ? "border border-dashed border-plum-muted" : "bg-paper"}`}
      style={{ transform: `rotate(${scrapTiltDeg}deg)` }}
    >
      <div className="flow-root" style={{ transform: counter(scrapTiltDeg) }}>
        {foil !== null ? <div className="float-right -mt-6 -mr-7 ml-3 w-2/5 max-w-40">{foil}</div> : null}
        {topic.present
          ? topic.revealed || topic.landing
            ? <TopicValue key={topic.value} value={topic.value} motion={topic.landing ? landingMotion("topic") : NO_MOTION} />
            : topic.shufflingText !== null
              ? (
                  <ShufflingPiece kind="topic">
                    <TopicValue value={topic.shufflingText} />
                  </ShufflingPiece>
                )
              : <EmptySlot kind="topic" />
          : null}
        {constraint.present ? (
          <div className="clear-both mt-2 flex min-h-14 items-center justify-end">
            {constraint.revealed || constraint.landing ? (
              <InkStamp value={constraint.value} tiltDeg={-7} motion={constraint.landing ? landingMotion("constraint") : NO_MOTION} />
            ) : constraint.shufflingText !== null ? (
              <ShufflingPiece kind="constraint">
                <InkStamp value={constraint.shufflingText} tiltDeg={-7} />
              </ShufflingPiece>
            ) : (
              <EmptySlot kind="constraint" tiltDeg={-7} />
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** Arrives last; plain, no texture, tilt, or decoration (DESIGN.md: max 34ch); a 250ms fade, no shuffle (Story 4.1). */
export function BriefBlock({
  brief,
  guidance,
  ref,
  motion = NO_MOTION,
}: {
  brief: string;
  guidance: string | null;
  ref?: Ref<HTMLDivElement>;
  motion?: PieceMotion;
}) {
  // tabIndex -1: focus target when the last piece lands and the Reveal next button unmounts.
  return (
    <div
      ref={ref}
      tabIndex={-1}
      className={`max-w-[34ch] ${FOCUS_RING_BASE} ${focusRingClassName("lilac")} ${motion.className}`}
      style={motion.style}
    >
      <p className="text-brief-stage-phone text-plum desktop:text-brief-stage">{brief}</p>
      {guidance !== null ? <p className="mt-2 text-lede text-plum-muted">{guidance}</p> : null}
    </div>
  );
}
