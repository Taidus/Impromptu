import { Export } from "@/domain/session/schema";
import type { Rep } from "@/domain/session/schema";

export const EXPORT_VERSION = 1;

/** Validates with the `Export` schema (AD-5); throws on an invalid rep set, which store data never produces. */
export function buildExport(reps: Rep[], exportedAt: string): Export {
  return Export.parse({ app: "impromptu", exportVersion: EXPORT_VERSION, exportedAt, reps });
}

/** `impromptu-practice-YYYY-MM-DD.json` from the first 10 chars of `dateIso`; callers pass a `Z` (UTC) ISO datetime, so that is its UTC day. */
export function exportFilename(dateIso: string): string {
  return `impromptu-practice-${dateIso.slice(0, 10)}.json`;
}
