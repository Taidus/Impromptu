import { copy } from "@/components/copy";
import type { practiceMap, Row } from "@/domain/practice/practice-map";

/**
 * One group (Skill, Medium, or Level) as a labelled table: a visually hidden
 * `<caption>`, then one row per entry (`<th scope="row">` label, `<td>` count).
 * `tbody` is a two-column grid (four on desktop); each `tr` is a reversed
 * column so the count sits above its label. `role="row"` keeps the row
 * semantics once `display` is overridden.
 */
function Group({ caption, rows }: { caption: string; rows: Row[] }) {
  return (
    <table className="w-full">
      <caption className="sr-only">{caption}</caption>
      <tbody className="grid grid-cols-2 gap-6 desktop:grid-cols-4">
        {rows.map((row) => (
          <tr key={row.id} role="row" className="flex flex-col-reverse justify-end text-left">
            <th scope="row" className="text-meta text-ink-soft font-normal text-left">
              {row.label}
            </th>
            <td>
              {row.count === 0 ? (
                <span className="text-index-number text-ink-soft">
                  <span aria-hidden="true">—</span>
                  <span className="sr-only">0</span>
                </span>
              ) : (
                <span className="text-index-number text-ink">{row.count}</span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/**
 * Story 6.3 / FR-26: plain Rep counts by Skill, Medium and Level -- no
 * scoring, no bars, no streaks. Props only (no store); `map` is the pure
 * `practiceMap()` result. Rendered by `PracticeView` above the history, only
 * when there are Reps.
 */
export function PracticeMap({ map }: { map: ReturnType<typeof practiceMap> }) {
  const levels = map.levels.map((level) => ({ ...level, label: copy.levelName[level.id] }));
  return (
    <div className="flex flex-col gap-6">
      <p className="text-body text-ink-soft">{copy.state.practiceMapDisclaimer}</p>
      <Group caption={copy.practice.mapGroups.skill} rows={map.skills} />
      <Group caption={copy.practice.mapGroups.medium} rows={map.mediums} />
      <Group caption={copy.practice.mapGroups.level} rows={levels} />
    </div>
  );
}
