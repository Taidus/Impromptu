// Shared "which ground is this control on" plumbing for the Action
// components (DESIGN.md -> Components -> Actions). The focus ring is drawn
// on the ground behind a control, never on the control's own fill, so its
// color and a plain-text control's text color both depend on the ground.
export type Ground = "night" | "lilac" | "paper" | "sun" | "lilac-deep";

// DESIGN.md -> Colors -> Focus.
const FOCUS_RING_CLASS: Record<Ground, string> = {
  night: "focus-visible:outline-focus",
  lilac: "focus-visible:outline-focus",
  paper: "focus-visible:outline-focus",
  sun: "focus-visible:outline-focus-on-sun",
  "lilac-deep": "focus-visible:outline-focus-on-lilac-deep",
};

export function focusRingClassName(ground: Ground): string {
  return FOCUS_RING_CLASS[ground];
}

// DESIGN.md -> Colors table, "Text" column per ground.
const GROUND_TEXT_CLASS: Record<Ground, string> = {
  night: "text-cream",
  lilac: "text-plum",
  "lilac-deep": "text-plum",
  paper: "text-ink",
  sun: "text-ink",
};

export function groundTextClassName(ground: Ground): string {
  return GROUND_TEXT_CLASS[ground];
}

// Hidden until keyboard/assistive-tech focus, then a 2px ring at a 3px
// offset. `focus:outline-none` clears the browser default so only the
// `focus-visible` ring (which Tailwind orders after `focus`, so it wins
// when both match) ever shows.
export const FOCUS_RING_BASE =
  "focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[var(--spacing-focus-offset)]";
