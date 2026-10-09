import type { Envelope, StorageKey } from "@/domain/ports";

/** Migrates one version forward: step `i` migrates `v:i+1` to `v:i+2`. */
export type MigrationFn = (data: unknown) => unknown;
export type MigrationTable = Partial<Record<StorageKey, MigrationFn[]>>;

/** No key is above v1 yet (config.storage.schemaVersions), so there is nothing to register. */
export const migrations: MigrationTable = {};

/**
 * Forward-only: runs registered steps until `envelope.v` reaches `targetVersion`.
 * Throws if a required step is missing — the caller (Repository) decides what that means.
 */
export function migrate<T>(
  key: StorageKey,
  envelope: Envelope<unknown>,
  targetVersion: number,
  table: MigrationTable = migrations,
): Envelope<T> {
  const steps = table[key] ?? [];
  let v = envelope.v;
  let data = envelope.data;
  while (v < targetVersion) {
    const step = steps[v - 1];
    if (!step) throw new Error(`storage: no migration from v${v} for "${key}"`);
    data = step(data);
    v += 1;
  }
  return { ...envelope, v, data: data as T };
}
