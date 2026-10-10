// Story 5.5: the rep-done moment's stamp. DESIGN.md -> Challenge Stage:
// grape-deep double rule, tilted 6°, lettering counter-rotated back level
// (the same pattern as `pieces.tsx`'s InkStamp). Purely decorative -- the
// real "Rep done." announcement is a separate `role="status"` region the
// Stage owns (out of scope this phase) -- so this is `aria-hidden` with
// `data-decor` for the overlap check (AD-13).
import { copy } from "@/components/copy";

export function RepDoneStamp({ className = "" }: { className?: string }) {
  const tiltDeg = 6;
  return (
    <div
      aria-hidden="true"
      data-decor
      className={`inline-block border-y-4 border-double border-grape-deep px-3 py-1 ${className}`}
      style={{ transform: `rotate(${tiltDeg}deg)` }}
    >
      <p
        style={{ transform: `rotate(${-tiltDeg}deg)` }}
        className="text-stamp-stage-phone uppercase text-grape-deep desktop:text-stamp-stage"
      >
        {copy.stage.repDoneStamp}
      </p>
    </div>
  );
}
