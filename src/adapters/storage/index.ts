import type { Envelope, Repository, SaveResult, StorageKey, Result } from "@/domain/ports";
import { config } from "@/config/app";
import { createMemoryRawStore, probe, type RawStore } from "./raw";
import { migrate, migrations as defaultMigrations, type MigrationTable } from "./migrations";

const KEY_PREFIX = "impromptu:";
const keyFor = (key: StorageKey) => `${KEY_PREFIX}${key}`;

interface StorageEventLike {
  key: string | null;
}
interface EventTargetLike {
  addEventListener(type: "storage", listener: (event: StorageEventLike) => void): void;
  removeEventListener(type: "storage", listener: (event: StorageEventLike) => void): void;
}

export interface CreateRepositoryOptions {
  /** Defaults to `globalThis.localStorage` (accessed defensively; some browsers throw just reading it). */
  storage?: RawStore | null;
  /** Defaults to `config.storage.schemaVersions`. */
  schemaVersions?: Record<StorageKey, number>;
  /** Defaults to the real migration registry. */
  migrations?: MigrationTable;
  /** Defaults to `window` when defined. `null` disables cross-tab notification. */
  eventTarget?: EventTargetLike | null;
}

function tryGlobalLocalStorage(): RawStore | null {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}

function tryGlobalEventTarget(): EventTargetLike | null {
  return typeof window !== "undefined" ? window : null;
}

/**
 * The one factory for the AD-9 Repository. Probes `storage` once; on failure every
 * operation runs against an in-memory store and `storageAvailable` is false. On
 * success, a key whose migration throws falls back to its own in-memory copy
 * (seeded with the untouched original bytes) for the rest of the session.
 */
export function createRepository(options: CreateRepositoryOptions = {}): Repository {
  const schemaVersions = options.schemaVersions ?? config.storage.schemaVersions;
  const migrationTable = options.migrations ?? defaultMigrations;
  const eventTarget = options.eventTarget === undefined ? tryGlobalEventTarget() : options.eventTarget;

  const primary = options.storage === undefined ? tryGlobalLocalStorage() : options.storage;
  const storageAvailable = primary != null && probe(primary);
  const base: RawStore = storageAvailable ? primary! : createMemoryRawStore();

  const fallbacks = new Map<StorageKey, RawStore>();
  const migrationFailedKeys = new Set<StorageKey>();

  const rawFor = (key: StorageKey): RawStore => fallbacks.get(key) ?? base;

  function readEnvelope(key: StorageKey): Envelope<unknown> | null {
    const text = rawFor(key).getItem(keyFor(key));
    if (text == null) return null;
    try {
      return JSON.parse(text) as Envelope<unknown>;
    } catch {
      return null; // corrupted bytes are treated as absent, never a hard failure.
    }
  }

  function load<T>(key: StorageKey): Result<Envelope<T> | null> {
    const stored = readEnvelope(key);
    if (stored == null) return { ok: true, value: null };

    const known = schemaVersions[key];
    if (stored.v >= known) return { ok: true, value: stored as Envelope<T> };

    try {
      return { ok: true, value: migrate<T>(key, stored, known, migrationTable) };
    } catch {
      const mem = createMemoryRawStore();
      mem.setItem(keyFor(key), JSON.stringify(stored)); // seed with the untouched original
      fallbacks.set(key, mem);
      migrationFailedKeys.add(key);
      return { ok: true, value: stored as Envelope<T> };
    }
  }

  function save<T>(key: StorageKey, envelope: Envelope<T>): SaveResult<T> {
    const known = schemaVersions[key];
    if (envelope.v > known) return { ok: false, reason: "unsupported_version" };

    const current = readEnvelope(key) as Envelope<T> | null;
    const currentRev = current?.rev ?? 0;
    const expectedRev = envelope.rev - 1;
    if (currentRev !== expectedRev) {
      return { ok: false, reason: "rev_conflict", fresh: current };
    }

    rawFor(key).setItem(keyFor(key), JSON.stringify(envelope));
    return { ok: true, value: envelope };
  }

  function clearAll(): Result {
    for (const key of Object.keys(schemaVersions) as StorageKey[]) {
      base.removeItem(keyFor(key));
      fallbacks.get(key)?.removeItem(keyFor(key));
      fallbacks.delete(key);
    }
    migrationFailedKeys.clear();
    return { ok: true };
  }

  function migrationFailed(key: StorageKey): boolean {
    return migrationFailedKeys.has(key);
  }

  function subscribe(key: StorageKey, listener: () => void): () => void {
    if (!eventTarget) return () => {};
    const storageKey = keyFor(key);
    const handler = (event: StorageEventLike) => {
      if (event.key === null || event.key === storageKey) listener();
    };
    eventTarget.addEventListener("storage", handler);
    return () => eventTarget.removeEventListener("storage", handler);
  }

  return { storageAvailable, load, save, clearAll, migrationFailed, subscribe };
}
