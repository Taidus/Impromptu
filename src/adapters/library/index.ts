import type { ComposeLibrary } from "@/domain/compose/compose";
import { LibraryFile } from "./schema";

export type LoadLibraryResult =
  | { ok: true; library: ComposeLibrary }
  | { ok: false; reason: "fetch_failed" | "invalid" };

/**
 * Loads and validates a library from an injected source (`() => Promise<unknown>`), never
 * `src/generated/library.json` directly -- the caller decides where the JSON comes from.
 * Never throws: a rejecting `source()` or a shape that fails validation both become
 * `{ok:false, reason}`.
 */
export async function loadLibrary(source: () => Promise<unknown>): Promise<LoadLibraryResult> {
  let raw: unknown;
  try {
    raw = await source();
  } catch {
    return { ok: false, reason: "fetch_failed" };
  }
  const parsed = LibraryFile.safeParse(raw);
  return parsed.success ? { ok: true, library: parsed.data } : { ok: false, reason: "invalid" };
}

/**
 * The production library source, for the Story 1.7 follow-up (recorded in deferred-work.md) to
 * point at the real build output once it merges: replace this body with
 * `import("@/generated/library.json").then((m) => m.default)`.
 * Story 1.7 is not merged yet, so this story deliberately never imports `@/generated/**`.
 */
export async function loadGeneratedLibrarySource(): Promise<unknown> {
  throw new Error("library source not wired yet: see deferred-work.md (Story 1.7 follow-up)");
}

/**
 * Schedules `run` for a browser idle period (`requestIdleCallback`), falling back to a short
 * `setTimeout` where it's unavailable (older Safari, non-browser test environments). Errors from
 * `run` are swallowed -- a failed prefetch is not fatal, the real load (awaited elsewhere) still runs.
 */
export function prefetchOnIdle(run: () => Promise<unknown>): void {
  const schedule: (cb: () => void) => void =
    typeof requestIdleCallback === "function" ? (cb) => requestIdleCallback(cb) : (cb) => setTimeout(cb, 0);
  schedule(() => {
    run().catch(() => {});
  });
}
