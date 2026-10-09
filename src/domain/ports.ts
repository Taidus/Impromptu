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

export interface Repository {
  load<T>(key: StorageKey): Result<Envelope<T> | null>;
  save<T>(key: StorageKey, envelope: Envelope<T>): Result;
  clearAll(): Result;
}

/** Synchronous library data. Shape is finalised in Story 1.3. */
export interface Library {
  libraryVersion: string;
}
