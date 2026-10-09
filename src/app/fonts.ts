// Self-hosted brand fonts (AD-13, UX-DR2): next/font/google removes the
// third-party request and serves the files from this origin. Fallback
// stacks come from DESIGN.md -> Typography.
import { Bodoni_Moda, Instrument_Sans, Unbounded } from "next/font/google";

// Variable fonts: omit `weight` so next/font serves the full 400-900 /
// 200-900 / 400-700 axis instead of one static cut (the default is
// "variable").
export const bodoniModa = Bodoni_Moda({
  subsets: ["latin"],
  style: ["normal", "italic"],
  display: "swap",
  fallback: ["Didot", "'Bodoni 72'", "serif"],
  variable: "--font-bodoni-moda",
});

export const unbounded = Unbounded({
  subsets: ["latin"],
  display: "swap",
  fallback: ["Arial Black", "sans-serif"],
  variable: "--font-unbounded",
});

export const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  display: "swap",
  fallback: ["Helvetica Neue", "sans-serif"],
  variable: "--font-instrument-sans",
});
