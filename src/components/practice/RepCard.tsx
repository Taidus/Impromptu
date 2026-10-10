import { copy } from "@/components/copy";
import type { Rep } from "@/domain/session/schema";

const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });

/** `timeUsedSec` as "m:ss" (DESIGN.md -> Rep card: "TIMED 4:12"). */
function formatDuration(totalSec: number): string {
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

const pillLabel = { new: null, reroll: null, retry: copy.rep.retry, variation: copy.rep.variation } as const;

/**
 * One Rep (UX-DR35: read-only, no buttons/links/actions). Every value comes
 * from the Rep snapshot only (AD-5) -- no store, no library lookup -- so a
 * retired library entry still displays correctly.
 */
export function RepCard({ rep }: { rep: Rep }) {
  const { challenge, reflection } = rep;
  const pill = pillLabel[challenge.origin.kind];
  const worked = reflection?.worked.trim() ? reflection.worked : null;
  const change = reflection?.change.trim() ? reflection.change : null;
  const formattedDate = dateFormatter.format(new Date(rep.finishedAt));

  return (
    <div className="rounded-scrap bg-cream p-6 shadow-poster">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-meta uppercase text-ink-soft">
          {challenge.inputs.skill.revealText} · {challenge.inputs.medium.revealText} · {copy.levelName[challenge.level]} ·{" "}
          <time dateTime={rep.finishedAt}>{formattedDate}</time>
          {challenge.timeLimitSec !== null &&
            rep.timeUsedSec !== null &&
            ` · ${copy.stage.mode.timed} ${formatDuration(rep.timeUsedSec)}`}
        </p>
        {pill && <span className="rounded-full border border-ink px-2 text-meta text-ink">{pill}</span>}
      </div>
      <p className="mt-4 wrap-anywhere hyphens-auto text-lede text-ink">{challenge.brief}</p>
      {(worked || change) && (
        <div className="mt-4 flex flex-col gap-3">
          {worked && (
            <div>
              <p className="text-meta text-ink-soft">{copy.rep.worked}</p>
              <p className="wrap-anywhere hyphens-auto text-body text-ink-soft">{worked}</p>
            </div>
          )}
          {change && (
            <div>
              <p className="text-meta text-ink-soft">{copy.rep.change}</p>
              <p className="wrap-anywhere hyphens-auto text-body text-ink-soft">{change}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
