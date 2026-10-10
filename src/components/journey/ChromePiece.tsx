import Image from "next/image";

// Intrinsic pixel size of each public/decor/chrome/*.webp file, so next/image
// can reserve the right aspect ratio; the caller's className sets the
// actual display width and `h-auto` lets height follow it.
export const CHROME_SIZE = {
  "chrome-burst": { width: 612, height: 640 },
  "chrome-drip": { width: 531, height: 640 },
  "chrome-ring": { width: 631, height: 640 },
  "chrome-sparkle": { width: 582, height: 640 },
  "chrome-tendril": { width: 640, height: 549 },
  "chrome-tribal": { width: 508, height: 640 },
} as const;

export type ChromePieceName = keyof typeof CHROME_SIZE;

export interface ChromePieceProps {
  name: ChromePieceName;
  /** Position (and, optionally, width) — this component never positions itself. */
  className: string;
}

// A chrome/cutout accent at a seam or corner. Never behind text (the
// caller places it only where there is none), `drop-shadow-lift` (follows
// the artwork's alpha, unlike a box-shadow), hidden on
// phones (DESIGN.md: chrome collapses away below desktop), `aria-hidden`
// and `data-decor` for the overlap check (AD-13). No motion here —
// Story 8.3 owns bob/drift.
export function ChromePiece({ name, className }: ChromePieceProps) {
  const { width, height } = CHROME_SIZE[name];
  return (
    <Image
      src={`/decor/chrome/${name}.webp`}
      alt=""
      aria-hidden="true"
      data-decor
      width={width}
      height={height}
      sizes="8rem"
      className={`pointer-events-none hidden h-auto drop-shadow-lift desktop:block ${className}`}
    />
  );
}
