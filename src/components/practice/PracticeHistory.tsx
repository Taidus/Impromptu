import { copy } from "@/components/copy";
import type { Rep } from "@/domain/session/schema";
import { RepCard } from "./RepCard";

/** Newest first by `finishedAt`; ties keep their array order (`Array.prototype.sort` is stable). */
function byNewestFirst(a: Rep, b: Rep): number {
  return Date.parse(b.finishedAt) - Date.parse(a.finishedAt);
}

/** Every Rep, newest first (FR-25). Props only -- no store, no library lookup. */
export function PracticeHistory({ reps }: { reps: Rep[] }) {
  const sorted = [...reps].sort(byNewestFirst);

  return (
    <section>
      <h2 className="sr-only">{copy.practice.historyTitle}</h2>
      <ol role="list" className="flex flex-col gap-6">
        {sorted.map((rep) => (
          <li key={rep.id}>
            <RepCard rep={rep} />
          </li>
        ))}
      </ol>
    </section>
  );
}
