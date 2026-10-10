export interface OrbitThreadProps {
  className?: string;
}

// One 2.5px grape thread from the hero down through the margins and
// gutters to the footer, never crossing the centered content column.
// `preserveAspectRatio="none"` stretches the viewBox to the caller's
// actual (unknown ahead of time) page height; `vectorEffect="non-scaling-stroke"`
// keeps the 2.5 stroke a constant width regardless of that stretch.
// `strokeWidth={2.5}` is an SVG user-unit number, not a CSS length, so it
// carries no "px" (scripts/check-token-usage.test.ts bans raw px in
// src/components). `data-motion="draw"` is an opt-in hook for a future
// scroll-draw animation (Story 8.3 owns motion gating) — the thread ships
// fully drawn (no stroke-dasharray) by default. Hidden on phones; caller
// positions it absolute over the full page height.
export function OrbitThread({ className = "" }: OrbitThreadProps) {
  return (
    <svg
      aria-hidden="true"
      data-motion="draw"
      preserveAspectRatio="none"
      viewBox="0 0 100 1000"
      className={`pointer-events-none absolute inset-0 hidden h-full w-full desktop:block ${className}`}
    >
      {/* `data-decor` on the path, not the <svg>: the overlap check reads
          getBoundingClientRect(), and an SVG root's box is its full
          (inset-0) layout box, not the drawn line's actual extent. */}
      {/* x stays within 0.6-1.2 of the 100-wide viewBox (≤ ~1.2% of the
          viewport, well inside even the hero placeholder's narrowest
          padding) so it never drifts into the content column. */}
      <path
        data-decor
        d="M1,0 C1.2,200 0.6,400 1,600 S0.6,850 1,1000"
        fill="none"
        stroke="var(--color-grape)"
        strokeWidth={2.5}
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
