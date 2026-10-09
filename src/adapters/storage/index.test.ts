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
    length: 0,
    key: () => null,
  };
}

/** Probe succeeds (uses an unprefixed key), but any `impromptu:*` write throws (quota/revoked). */
function quotaExceededStore(): RawStore {
  const map = new Map<string, string>();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      if (key.startsWith("impromptu:")) throw new Error("QuotaExceededError");
      map.set(key, value);
    },
    removeItem: (key) => void map.delete(key),
    get length() {
      return map.size;
    },
    key: (index) => Array.from(map.keys())[index] ?? null,
  };
}

function fakeEventTarget() {
  type Handler = (event: { key: string | null; storageArea?: unknown }) => void;
  const listeners = new Set<Handler>();
  return {
    addEventListener: (_: "storage", listener: Handler) => {
      listeners.add(listener);
    },
    removeEventListener: (_: "storage", listener: Handler) => {
      listeners.delete(listener);
    },
    fire(key: string | null, storageArea?: unknown) {
      for (const listener of listeners) listener({ key, storageArea });
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

describe("createRepository — corrupted or non-envelope bytes", () => {
  it("treats unparseable JSON as an absent key", () => {
    const raw = createMemoryRawStore();
    raw.setItem("impromptu:setup", "{not json");
    const repo = createRepository({ storage: raw, schemaVersions });
    expect(repo.load("setup")).toEqual({ ok: true, value: null });
  });

  it("treats valid JSON that isn't an envelope as an absent key", () => {
    const raw = createMemoryRawStore();
    raw.setItem("impromptu:setup", "5");
    const repoNumber = createRepository({ storage: raw, schemaVersions });
    expect(repoNumber.load("setup")).toEqual({ ok: true, value: null });

    raw.setItem("impromptu:history", "{}");
    const repoEmpty = createRepository({ storage: raw, schemaVersions });
    expect(repoEmpty.load("history")).toEqual({ ok: true, value: null });
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

  it("rejects a lower-v save against a stored future version, leaving bytes unchanged", () => {
    const raw = createMemoryRawStore();
    const future = { v: 3, rev: 1, data: { a: 1 } };
    raw.setItem("impromptu:setup", JSON.stringify(future));
    // known version (1) is below the stored version (3); the new envelope's own v (1) is within range.
    const repo = createRepository({ storage: raw, schemaVersions });

    expect(repo.save("setup", { v: 1, rev: 2, data: { a: 99 } })).toEqual({
      ok: false,
      reason: "unsupported_version",
    });
    expect(JSON.parse(raw.getItem("impromptu:setup")!)).toEqual(future);
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

describe("createRepository — availability and write failures", () => {
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

  it("returns write_failed when the probe passes but a real write later throws (quota exceeded)", () => {
    const repo = createRepository({ storage: quotaExceededStore(), schemaVersions });
    expect(repo.storageAvailable).toBe(true); // the probe itself used a non-prefixed key and succeeded
    const envelope: Envelope<{ a: number }> = { v: 1, rev: 1, data: { a: 1 } };
    expect(repo.save("setup", envelope)).toEqual({ ok: false, reason: "write_failed" });
  });
});

describe("createRepository — clearAll", () => {
  it("removes every impromptu:* key (including unknown ones), leaves other keys, and resets migrationFailed", () => {
    const raw = createMemoryRawStore();
    raw.setItem("impromptu:setup", JSON.stringify({ v: 1, rev: 1, data: { a: 1 } }));
    raw.setItem("impromptu:legacy", "leftover-from-an-old-key");
    raw.setItem("other-app:unrelated", "keep-me");
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
    expect(raw.getItem("impromptu:legacy")).toBeNull();
    expect(raw.getItem("other-app:unrelated")).toBe("keep-me");
    expect(repo.migrationFailed("session")).toBe(false);
    expect(repo.load("setup")).toEqual({ ok: true, value: null });
  });
});

describe("createRepository — cross-tab subscription", () => {
  it("notifies a listener when the shared event target fires for this key from the same storage area", () => {
    const storage = createMemoryRawStore();
    const target = fakeEventTarget();
    const repo = createRepository({ storage, schemaVersions, eventTarget: target });

    let calls = 0;
    const unsubscribe = repo.subscribe("session", () => {
      calls += 1;
    });

    target.fire("impromptu:session", storage);
    expect(calls).toBe(1);

    target.fire("impromptu:setup", storage); // a different key: ignored
    expect(calls).toBe(1);

    target.fire(null, storage); // a wholesale clear: notifies every subscriber
    expect(calls).toBe(2);

    target.fire("impromptu:session", {}); // a different storage area: ignored
    expect(calls).toBe(2);

    unsubscribe();
    target.fire("impromptu:session", storage);
    expect(calls).toBe(2);
  });

  it("notifies listeners on two repository instances that share one storage object and event target", () => {
    const storage = createMemoryRawStore();
    const target = fakeEventTarget();
    const repoA = createRepository({ storage, schemaVersions, eventTarget: target });
    const repoB = createRepository({ storage, schemaVersions, eventTarget: target });

    let callsA = 0;
    let callsB = 0;
    repoA.subscribe("session", () => void callsA++);
    repoB.subscribe("session", () => void callsB++);

    // repoA writes; the shared event target fires as it would when another tab's write arrives.
    repoA.save("session", { v: 1, rev: 1, data: {} });
    target.fire("impromptu:session", storage);

    expect(callsA).toBe(1);
    expect(callsB).toBe(1);
  });

  it("subscribe is a harmless no-op when there is no event target", () => {
    const repo = createRepository({ storage: createMemoryRawStore(), schemaVersions, eventTarget: null });
    expect(() => repo.subscribe("session", () => {})()).not.toThrow();
  });

  it("subscribe is a no-op for a key currently running on its migration-failure memory fallback", () => {
    const raw = createMemoryRawStore();
    raw.setItem("impromptu:setup", JSON.stringify({ v: 1, rev: 1, data: {} }));
    const target = fakeEventTarget();
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
      eventTarget: target,
    });
    repo.load("setup"); // trigger the migration failure, moving "setup" to its own memory fallback

    let calls = 0;
    const unsubscribe = repo.subscribe("setup", () => void calls++);
    target.fire("impromptu:setup", raw);
    expect(calls).toBe(0);
    expect(() => unsubscribe()).not.toThrow();
  });
});
