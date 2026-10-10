import Image from "next/image";
import { CHROME_SIZE } from "./ChromePiece";
import { tickerFragments } from "./ticker-fragments";

export interface TickerProps {
  /** "sun" crosses night/lilac at -2.4°; "grape" (grape-deep) crosses paper/sun at 2°. */
  variant: "sun" | "grape";
}

const VARIANT = {
  sun: { background: "bg-sun", text: "text-ink", rotation: "rotate-[-2.4deg]" },
  grape: { background: "bg-grape-deep", text: "text-cream", rotation: "rotate-[2deg]" },
} as const;

// chrome-burst's own pixel size, scaled down for the ticker's inline separator.
const BURST_WIDTH = 24;
const BURST_HEIGHT = Math.round((BURST_WIDTH * CHROME_SIZE["chrome-burst"].height) / CHROME_SIZE["chrome-burst"].width);

// Read once per build (module scope), not per render.
const fragments = tickerFragments();
// Enough copies that the track stays longer than a wide screen; an even
// count so the -50% keyframe loops exactly onto a copy boundary.
const repeats = Math.max(2, Math.ceil(24 / Math.max(1, fragments.length)));
const sequence = Array.from({ length: repeats % 2 === 0 ? repeats : repeats + 1 }, () => fragments).flat();

// A decorative marquee at a ground seam, carrying real Topic/Style library
// fragments. Positioned by the caller (a `relative` wrapper around the
// Seam it crosses); this component only handles the tilt, loop, and pause
// rules. `aria-hidden` and no interactive content, so it never reaches the
// accessibility tree; `data-decor` for the overlap check (AD-13).
export function Ticker({ variant }: TickerProps) {
  if (fragments.length === 0) return null;
  const { background, text, rotation } = VARIANT[variant];

  return (
    <div
      aria-hidden="true"
      data-decor
      className="group pointer-events-none absolute inset-x-0 -top-10 -bottom-10 flex items-center overflow-hidden"
    >
      <div className={`pointer-events-auto w-full origin-center overflow-hidden py-3 shadow-ticker ${background} ${rotation}`}>
        <div
          className={`flex w-max animate-ticker items-center whitespace-nowrap text-style-italic motion-reduce:animate-none group-hover:[animation-play-state:paused] group-focus-within:[animation-play-state:paused] ${text}`}
        >
          {sequence.map((fragment, index) => (
            // Gap inside each item (text, gap, burst, trailing gap) so -50% lands on an item boundary.
            <span key={`${fragment}-${index}`} className="flex items-center gap-10 pr-10">
              <span>{fragment}</span>
              <Image
                src="/decor/chrome/chrome-burst.webp"
                alt=""
                width={BURST_WIDTH}
                height={BURST_HEIGHT}
                loading="eager"
              />
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
