import { describe, expect, it } from "vitest";
import { createRepository } from "./index";
import { createMemoryRawStore, type RawStore } from "./raw";
import type { Envelope } from "@/domain/ports";

const schemaVersions = { setup: 1, session: 1, history: 1 };

function throwingStore(): RawStore {
  return {
    getItem: () => {
      throw new Error("blocked");
    },
    setItem: () => {
      throw new Error("blocked");
    },
    removeItem: () => {
      throw new Error("blocked");
    },
  };
}

function fakeEventTarget() {
  const listeners = new Set<(event: { key: string | null }) => void>();
  return {
    addEventListener: (_: "storage", listener: (event: { key: string | null }) => void) => {
      listeners.add(listener);
    },
    removeEventListener: (_: "storage", listener: (event: { key: string | null }) => void) => {
      listeners.delete(listener);
    },
    fire(key: string | null) {
      for (const listener of listeners) listener({ key });
    },
  };
}

describe("createRepository — normal round-trip", () => {
  it("load on an absent key returns null", () => {
    const repo = createRepository({ storage: createMemoryRawStore(), schemaVersions });
    expect(repo.load("history")).toEqual({ ok: true, value: null });
  });

  it("save then load returns the same envelope", () => {
    const repo = createRepository({ storage: createMemoryRawStore(), schemaVersions });
    const envelope: Envelope<{ a: number }> = { v: 1, rev: 1, data: { a: 1 } };
    expect(repo.save("setup", envelope)).toEqual({ ok: true, value: envelope });
    expect(repo.load("setup")).toEqual({ ok: true, value: envelope });
  });

  it("storageAvailable is true for a working store", () => {
    const repo = createRepository({ storage: createMemoryRawStore(), schemaVersions });
    expect(repo.storageAvailable).toBe(true);
  });
});

describe("createRepository — rev conflict", () => {
  it("rejects a write whose expected rev is stale and returns the fresh envelope", () => {
    const repo = createRepository({ storage: createMemoryRawStore(), schemaVersions });
    const first: Envelope<{ n: number }> = { v: 1, rev: 1, data: { n: 1 } };
    expect(repo.save("setup", first)).toEqual({ ok: true, value: first });

    const second: Envelope<{ n: number }> = { v: 1, rev: 2, data: { n: 2 } };
    expect(repo.save("setup", second)).toEqual({ ok: true, value: second });

    // A third writer still believes rev 1 is current (stale): rejected, nothing persisted.
    const stale: Envelope<{ n: number }> = { v: 1, rev: 2, data: { n: 99 } };
    expect(repo.save("setup", stale)).toEqual({ ok: false, reason: "rev_conflict", fresh: second });
    expect(repo.load("setup")).toEqual({ ok: true, value: second });
  });
});

describe("createRepository — versions", () => {
  it("migrates an older version forward on read without rewriting storage", () => {
    const raw = createMemoryRawStore();
    raw.setItem("impromptu:setup", JSON.stringify({ v: 1, rev: 1, data: { a: 1 } }));
    const repo = createRepository({
      storage: raw,
      schemaVersions: { ...schemaVersions, setup: 2 },
      migrations: { setup: [(data) => ({ ...(data as object), migrated: true })] },
    });

    const result = repo.load<{ a: number; migrated: boolean }>("setup");
    expect(result).toEqual({ ok: true, value: { v: 2, rev: 1, data: { a: 1, migrated: true } } });
    // Storage itself is untouched until the next explicit write.
    expect(JSON.parse(raw.getItem("impromptu:setup")!).v).toBe(1);
  });

  it("leaves a future version untouched and read-only", () => {
    const raw = createMemoryRawStore();
    const future: Envelope<{ a: number }> = { v: 3, rev: 1, data: { a: 1 } };
    raw.setItem("impromptu:setup", JSON.stringify(future));
    const repo = createRepository({ storage: raw, schemaVersions });

    expect(repo.load("setup")).toEqual({ ok: true, value: future });
    expect(repo.save("setup", { v: 3, rev: 2, data: { a: 2 } })).toEqual({
      ok: false,
      reason: "unsupported_version",
    });
  });

  it("falls a key back to memory when its migration throws, leaving storage untouched", () => {
    const raw = createMemoryRawStore();
    const original = { v: 1, rev: 1, data: { a: 1 } };
    raw.setItem("impromptu:setup", JSON.stringify(original));
    const repo = createRepository({
      storage: raw,
      schemaVersions: { ...schemaVersions, setup: 2 },
      migrations: {
        setup: [
          () => {
            throw new Error("boom");
          },
        ],
      },
    });

    expect(repo.migrationFailed("setup")).toBe(false);
    expect(repo.load("setup")).toEqual({ ok: true, value: original });
    expect(repo.migrationFailed("setup")).toBe(true);
    // The real store never received a write.
    expect(JSON.parse(raw.getItem("impromptu:setup")!)).toEqual(original);

    // The key now runs on memory: a write succeeds without touching `raw`.
    expect(repo.save("setup", { v: 1, rev: 2, data: { a: 2 } })).toEqual({
      ok: true,
      value: { v: 1, rev: 2, data: { a: 2 } },
    });
    expect(JSON.parse(raw.getItem("impromptu:setup")!)).toEqual(original);
  });
});

describe("createRepository — availability probe", () => {
  it("falls back to memory and reports storageAvailable: false when every op throws", () => {
    const repo = createRepository({ storage: throwingStore(), schemaVersions });
    expect(repo.storageAvailable).toBe(false);
    expect(repo.load("setup")).toEqual({ ok: true, value: null });
    const envelope: Envelope<{ a: number }> = { v: 1, rev: 1, data: { a: 1 } };
    expect(repo.save("setup", envelope)).toEqual({ ok: true, value: envelope });
    expect(repo.load("setup")).toEqual({ ok: true, value: envelope });
  });

  it("falls back to memory when no storage is supplied (no window in this environment)", () => {
    const repo = createRepository({ schemaVersions });
    expect(repo.storageAvailable).toBe(false);
  });
});

describe("createRepository — clearAll", () => {
  it("removes every impromptu:* key and resets migrationFailed", () => {
    const raw = createMemoryRawStore();
    raw.setItem("impromptu:setup", JSON.stringify({ v: 1, rev: 1, data: { a: 1 } }));
    const repo = createRepository({
      storage: raw,
      schemaVersions: { ...schemaVersions, session: 2 },
      migrations: {
        session: [
          () => {
            throw new Error("boom");
          },
        ],
      },
    });
    raw.setItem("impromptu:session", JSON.stringify({ v: 1, rev: 1, data: {} }));
    repo.load("session"); // trigger the migration failure
    expect(repo.migrationFailed("session")).toBe(true);

    expect(repo.clearAll()).toEqual({ ok: true });
    expect(raw.getItem("impromptu:setup")).toBeNull();
    expect(raw.getItem("impromptu:session")).toBeNull();
    expect(repo.migrationFailed("session")).toBe(false);
    expect(repo.load("setup")).toEqual({ ok: true, value: null });
  });
});

describe("createRepository — cross-tab subscription", () => {
  it("notifies a listener when the shared event target fires for this key", () => {
    const target = fakeEventTarget();
    const repo = createRepository({ storage: createMemoryRawStore(), schemaVersions, eventTarget: target });

    let calls = 0;
    const unsubscribe = repo.subscribe("session", () => {
      calls += 1;
    });

    target.fire("impromptu:session");
    expect(calls).toBe(1);

    target.fire("impromptu:setup"); // a different key: ignored
    expect(calls).toBe(1);

    target.fire(null); // a wholesale clear: notifies every subscriber
    expect(calls).toBe(2);

    unsubscribe();
    target.fire("impromptu:session");
    expect(calls).toBe(2);
  });

  it("subscribe is a harmless no-op when there is no event target", () => {
    const repo = createRepository({ storage: createMemoryRawStore(), schemaVersions, eventTarget: null });
    expect(() => repo.subscribe("session", () => {})()).not.toThrow();
  });
});
