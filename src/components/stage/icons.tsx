// Inline glyphs for the Stage icon buttons and mark (DESIGN.md -> Components
// -> Actions / Stage mark). `currentColor`/`fill="currentColor"` only, so
// every glyph follows its parent's text color token -- no new asset, no raw
// hex (Story 3.1's token guard covers src/components).
import type { SVGProps } from "react";

const GLYPH_SIZE = 20;

function Glyph(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={GLYPH_SIZE}
      height={GLYPH_SIZE}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    />
  );
}

/** Back control glyph (DESIGN.md: "arrow-left"). */
export function ArrowLeftIcon() {
  return (
    <Glyph>
      <path d="M19 12H5" />
      <path d="M11 18l-6-6 6-6" />
    </Glyph>
  );
}

/** Sound-on control glyph (DESIGN.md: "speaker"). */
export function SpeakerIcon() {
  return (
    <Glyph>
      <path d="M4 9v6h4l5 5V4L8 9H4z" />
      <path d="M17 8.5a5 5 0 0 1 0 7" />
      <path d="M19.5 6a8.5 8.5 0 0 1 0 12" />
    </Glyph>
  );
}

/** Sound-off control glyph (DESIGN.md: "speaker with slash"). */
export function SpeakerOffIcon() {
  return (
    <Glyph>
      <path d="M4 9v6h4l5 5V4L8 9H4z" />
      <path d="M17 9l5 6" />
      <path d="M22 9l-5 6" />
    </Glyph>
  );
}

/** The Stage mark's 14px grape four-point star (DESIGN.md -> Stage mark). */
export function StarIcon() {
  return (
    <svg viewBox="0 0 24 24" width={14} height={14} fill="currentColor" aria-hidden="true">
      <path d="M12 1l2.6 8.4L23 12l-8.4 2.6L12 23l-2.6-8.4L1 12l8.4-2.6z" />
    </svg>
  );
}
