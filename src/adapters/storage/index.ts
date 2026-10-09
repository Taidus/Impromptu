import type { Envelope, Repository, SaveResult, StorageKey, Result } from "@/domain/ports";
import { config } from "@/config/app";
import { createMemoryRawStore, probe, type RawStore } from "./raw";
import { migrate, migrations as defaultMigrations, type MigrationTable } from "./migrations";

const KEY_PREFIX = "impromptu:";
const keyFor = (key: StorageKey) => `${KEY_PREFIX}${key}`;

interface StorageEventLike {
  key: string | null;
  storageArea?: unknown;
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

function isEnvelope(value: unknown): value is Envelope<unknown> {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return Number.isInteger(candidate.v) && Number.isInteger(candidate.rev) && "data" in candidate;
}

function parseEnvelope(text: string): Envelope<unknown> | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }
  return isEnvelope(parsed) ? parsed : null;
}

/** Removes every key starting with `prefix` from `store`. */
function removeAllPrefixed(store: RawStore, prefix: string): void {
  const toRemove: string[] = [];
  for (let i = 0; i < store.length; i++) {
    const key = store.key(i);
    if (key != null && key.startsWith(prefix)) toRemove.push(key);
  }
  for (const key of toRemove) store.removeItem(key);
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

  function load<T>(key: StorageKey): Result<Envelope<T> | null> {
    let text: string | null;
    try {
      text = rawFor(key).getItem(keyFor(key));
    } catch {
      return { ok: false, reason: "read_failed" };
    }
    if (text == null) return { ok: true, value: null };

    const stored = parseEnvelope(text);
    if (stored == null) return { ok: true, value: null }; // corrupted or not an envelope: treat as absent

    const known = schemaVersions[key];
    if (stored.v >= known) return { ok: true, value: stored as Envelope<T> };

    try {
      return { ok: true, value: migrate<T>(key, stored, known, migrationTable) };
    } catch {
      const mem = createMemoryRawStore();
      mem.setItem(keyFor(key), text); // seed with the untouched original bytes, not the parsed object
      fallbacks.set(key, mem);
      migrationFailedKeys.add(key);
      return { ok: true, value: stored as Envelope<T> };
    }
  }

  function save<T>(key: StorageKey, envelope: Envelope<T>): SaveResult<T> {
    const known = schemaVersions[key];
    if (envelope.v > known) return { ok: false, reason: "unsupported_version" };

    let text: string | null;
    try {
      text = rawFor(key).getItem(keyFor(key));
    } catch {
      return { ok: false, reason: "read_failed" };
    }
    const current = text == null ? null : (parseEnvelope(text) as Envelope<T> | null);

    // A stored version above what this app knows must never be overwritten, regardless of rev.
    if (current != null && current.v > known) {
      return { ok: false, reason: "unsupported_version" };
    }

    const currentRev = current?.rev ?? 0;
    const expectedRev = envelope.rev - 1;
    if (currentRev !== expectedRev) {
      return { ok: false, reason: "rev_conflict", fresh: current };
    }

    try {
      rawFor(key).setItem(keyFor(key), JSON.stringify(envelope));
    } catch {
      return { ok: false, reason: "write_failed" };
    }
    return { ok: true, value: envelope };
  }

  function clearAll(): Result {
    try {
      removeAllPrefixed(base, KEY_PREFIX);
      for (const fallback of fallbacks.values()) removeAllPrefixed(fallback, KEY_PREFIX);
      fallbacks.clear();
      migrationFailedKeys.clear();
      return { ok: true };
    } catch {
      return { ok: false, reason: "clear_failed" };
    }
  }

  function migrationFailed(key: StorageKey): boolean {
    return migrationFailedKeys.has(key);
  }

  function subscribe(key: StorageKey, listener: () => void): () => void {
    if (!eventTarget || !storageAvailable || fallbacks.has(key)) return () => {};
    const storageKey = keyFor(key);
    const handler = (event: StorageEventLike) => {
      if (event.storageArea !== undefined && event.storageArea !== primary) return; // another storage area (e.g. sessionStorage)
      if (event.key === null || event.key === storageKey) listener();
    };
    eventTarget.addEventListener("storage", handler);
    return () => eventTarget.removeEventListener("storage", handler);
  }

  return { storageAvailable, load, save, clearAll, migrationFailed, subscribe };
}
