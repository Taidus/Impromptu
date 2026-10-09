import type { Ground } from "@/components/ground";

export interface SeamProps {
  from: Ground;
  to: Ground;
}

// Grounds never butt directly; this fades between two adjacent grounds
// using only their two tokens, in a band clamped between
// --spacing-seam-fade-min and --spacing-seam-fade-max.
export function Seam({ from, to }: SeamProps) {
  return (
    <div
      aria-hidden="true"
      className="h-[clamp(var(--spacing-seam-fade-min),20vw,var(--spacing-seam-fade-max))]"
      style={{ backgroundImage: `linear-gradient(to bottom, var(--color-${from}), var(--color-${to}))` }}
    />
  );
}
