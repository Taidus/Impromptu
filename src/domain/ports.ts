import type { AppConfig } from "@/config/app";

export interface Clock {
  /** Epoch milliseconds. */
  now(): number;
}

export interface Random {
  /** Uniform in [0, 1). */
  next(): number;
  /** RFC 4122 v4 layout. */
  uuid(): string;
}

export type StorageKey = keyof AppConfig["storage"]["schemaVersions"];

export interface Envelope<T> {
  v: number;
  rev: number;
  data: T;
}

export type Result<T = void> =
  | (T extends void ? { ok: true } : { ok: true; value: T })
  | { ok: false; reason: string };

/**
 * save()'s result. A rev conflict (the stored rev no longer matches
 * `envelope.rev - 1`, the rev the caller last read) carries the fresh
 * stored envelope so the caller can re-apply or drop its change (AD-9).
 */
export type SaveResult<T> =
  | { ok: true; value: Envelope<T> }
  | { ok: false; reason: "rev_conflict"; fresh: Envelope<T> | null }
  | { ok: false; reason: string };

export interface Repository {
  /** False when the startup probe failed; every key then runs on memory. */
  readonly storageAvailable: boolean;
  load<T>(key: StorageKey): Result<Envelope<T> | null>;
  /** `envelope.rev` must be (the rev last read) + 1. */
  save<T>(key: StorageKey, envelope: Envelope<T>): SaveResult<T>;
  clearAll(): Result;
  /** True once this key's most recent migration attempt threw; it now runs on memory. */
  migrationFailed(key: StorageKey): boolean;
  /** Notifies `listener` when another tab changes `key`. Returns an unsubscribe function. */
  subscribe(key: StorageKey, listener: () => void): () => void;
}

/** Synchronous library data. Shape is finalised in Story 1.3. */
export interface Library {
  libraryVersion: string;
}
