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
 * The production library source: the JSON that scripts/library/build.ts (Story 1.7) writes to
 * `src/generated/library.json`, dynamically imported so it ships as its own chunk.
 */
export async function loadGeneratedLibrarySource(): Promise<unknown> {
  // Emitted by scripts/library/build.ts on predev/prebuild (Story 1.7); a separate chunk, loaded on demand.
  const mod = await import("@/generated/library.json");
  return mod.default;
}

/**
 * Schedules `run` for a browser idle period (`requestIdleCallback`, capped at 2s so a busy main
 * thread can't delay a first-time visitor indefinitely), falling back to a short `setTimeout`
 * where it's unavailable (older Safari, non-browser test environments). Rejections from `run` are
 * swallowed; `run` owns its own error handling (the store's library load reports its failures).
 */
export function prefetchOnIdle(run: () => Promise<unknown>): void {
  const schedule: (cb: () => void) => void =
    typeof requestIdleCallback === "function"
      ? (cb) => requestIdleCallback(cb, { timeout: 2000 })
      : (cb) => setTimeout(cb, 0);
  schedule(() => {
    run().catch(() => {});
  });
}
