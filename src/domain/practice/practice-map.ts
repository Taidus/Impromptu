import { Level } from "@/domain/library/schema";
import type { Rep } from "@/domain/session/schema";

export type Row = { id: string; label: string; count: number };

type LibraryEntry = { id: string; revealText: string };

const LEVELS = Level.options;

/**
 * Counts `reps` against `entries` (library order first, count 0 allowed),
 * then any Rep whose snapshot id is no longer in `entries` gets one trailing
 * row per retired id (AD-5: labelled from the snapshot's own `revealText`,
 * never a library lookup).
 */
function countBy(reps: Rep[], entries: LibraryEntry[], pick: (rep: Rep) => LibraryEntry): Row[] {
  const rows = entries.map((entry): Row => ({ id: entry.id, label: entry.revealText, count: 0 }));
  const indexById = new Map(rows.map((row, index) => [row.id, index]));
  const extrasById = new Map<string, Row>();

  for (const rep of reps) {
    const entry = pick(rep);
    const index = indexById.get(entry.id);
    if (index !== undefined) {
      rows[index].count += 1;
      continue;
    }
    const extra = extrasById.get(entry.id);
    if (extra) extra.count += 1;
    else extrasById.set(entry.id, { id: entry.id, label: entry.revealText, count: 1 });
  }

  return [...rows, ...extrasById.values()];
}

/**
 * FR-26: pure Rep counts by Skill, Medium and Level -- no store, no `Date`,
 * no random. Retries and Variations count as Reps (they are ordinary Reps).
 */
export function practiceMap(
  reps: Rep[],
  library: { skills: LibraryEntry[]; mediums: LibraryEntry[] },
): { skills: Row[]; mediums: Row[]; levels: { id: Level; count: number }[] } {
  return {
    skills: countBy(reps, library.skills, (rep) => rep.challenge.inputs.skill),
    mediums: countBy(reps, library.mediums, (rep) => rep.challenge.inputs.medium),
    levels: LEVELS.map((level) => ({
      id: level,
      count: reps.filter((rep) => rep.challenge.level === level).length,
    })),
  };
}
