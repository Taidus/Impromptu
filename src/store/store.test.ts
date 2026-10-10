import { afterEach, beforeEach, describe, expect, it, onTestFinished, vi } from "vitest";
import { createMemoryRawStore, type RawStore } from "@/adapters/storage/raw";
import { createRepository } from "@/adapters/storage";
import { fakeClock, seededRandom } from "@/domain/test-doubles";
import type { Medium, Skill, Template, Topic } from "@/domain/library/schema";
import type { ComposeLibrary } from "@/domain/compose/compose";
import type { Repository } from "@/domain/ports";
import type { Rep, Session, Setup } from "@/domain/session/schema";
import { attemptSession, baseChallenge, noneSession } from "@/domain/session/session-fixture";
import { presentKinds } from "@/domain/session/session-reducer";
import { config } from "@/config/app";
import { buildDefaultSetup } from "./defaults";
import { createStore } from "./store";
import type { StoreDeps } from "./types";

const skill = (id: string): Skill => ({ id, revealText: id, info: id, tags: [] });
const medium = (id: string): Medium => ({ id, revealText: id, info: id, tags: [] });
const topic = (id: string, tags: string[]): Topic => ({ id, revealText: id, briefText: id, tags, requires: [], excludes: [] });
const tpl = (over: Partial<Template> = {}): Template => ({
  id: "tpl.observation.explore.one",
  skill: "skl.observation",
  level: "explore",
  mediums: ["med.a", "med.b"],
  briefPattern: "{topic}",
  topicTags: ["place"],
  styleTags: [],
  constraintTags: [],
  incompatible: [],
  tags: [],
  ...over,
});

const workingLibrary: ComposeLibrary = {
  libraryVersion: "test-1",
  skills: [skill("skl.observation")],
  mediums: [medium("med.a"), medium("med.b")],
  templates: [tpl()],
  topics: [topic("top.one", ["place"]), topic("top.two", ["place"])],
  styles: [],
  constraints: [],
};

// Valid library, but nothing at the "explore" level a test Setup asks for.
const noCompatibleLibrary: ComposeLibrary = { ...workingLibrary, templates: [tpl({ id: "tpl.observation.develop.one", level: "develop" })] };

const concreteSetup: Setup = {
  level: "explore",
  performTiming: "either",
  enabledMediums: ["med.a", "med.b"],
  medium: "random",
  skillFocus: "random",
  quickReveal: false,
  sound: false,
  ambientMotion: true,
};

function fakeEventTarget() {
  type Handler = (event: { key: string | null; storageArea?: unknown }) => void;
  const listeners = new Set<Handler>();
  return {
    addEventListener: (_: "storage", listener: Handler) => void listeners.add(listener),
    removeEventListener: (_: "storage", listener: Handler) => void listeners.delete(listener),
    fire(key: string | null, storageArea?: unknown) {
      for (const listener of listeners) listener({ key, storageArea });
    },
  };
}

function makeDeps(overrides: { repository?: Repository; library?: ComposeLibrary | "reject" } = {}): StoreDeps {
  return {
    repository: overrides.repository ?? createRepository({ storage: createMemoryRawStore() }),
    clock: fakeClock(1_700_000_000_000),
    random: seededRandom(1),
    librarySource: async () => {
      if (overrides.library === "reject") throw new Error("network down");
      return overrides.library ?? workingLibrary;
    },
  };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("createStore — before hydrate", () => {
  it("reports status:'loading' and libraryStatus:'loading' on first render", () => {
    const store = createStore(makeDeps());
    expect(store.getState().status).toBe("loading");
    expect(store.getState().libraryStatus).toBe("loading");
    expect(store.getState().setup).toBeNull();
  });
});

describe("createStore — hydrate, returning visitor", () => {
  it("becomes 'ready' synchronously from a valid persisted Setup/Session/History", () => {
    const repository = createRepository({ storage: createMemoryRawStore() });
    repository.save("setup", { v: 1, rev: 1, data: concreteSetup });
    repository.save("session", {
      v: 1,
      rev: 1,
      data: { state: "none", challenge: null, revealed: [], locks: {}, attempt: null, reflectionDraft: null, lastRepId: null, lastComposeError: null, recent: ["k1"] },
    });

    const store = createStore(makeDeps({ repository }));
    store.hydrate();

    expect(store.getState().status).toBe("ready");
    expect(store.getState().setup).toEqual(concreteSetup);
    expect(store.getState().session.recent).toEqual(["k1"]);
  });

  it("treats a persisted value that fails its schema as absent", () => {
    const repository = createRepository({ storage: createMemoryRawStore() });
    repository.save("setup", { v: 1, rev: 1, data: { bogus: true } });

    const store = createStore(makeDeps({ repository }));
    store.hydrate();

    expect(store.getState().setup).toBeNull();
    expect(store.getState().status).toBe("loading"); // no persisted setup, and the library hasn't resolved yet
  });
});

describe("createStore — hydrate, brand-new visitor", () => {
  it("stays 'loading' until the library resolves, then builds and persists a default Setup", async () => {
    const repository = createRepository({ storage: createMemoryRawStore() });
    const store = createStore(makeDeps({ repository }));
    store.hydrate();

    expect(store.getState().status).toBe("loading");
    await vi.runAllTimersAsync();

    expect(store.getState().status).toBe("ready");
    expect(store.getState().libraryStatus).toBe("ready");
    expect(store.getState().setup?.enabledMediums).toEqual(["med.a", "med.b"]);

    const stored = repository.load<Setup>("setup");
    expect(stored).toEqual({ ok: true, value: { v: 1, rev: 1, data: store.getState().setup } });
  });
});

describe("createStore — library on state", () => {
  it("is null initially, set to the loaded library on ready, and stays null on 'error'", async () => {
    const store = createStore(makeDeps());
    expect(store.getState().library).toBeNull();
    store.hydrate();
    await vi.runAllTimersAsync();
    expect(store.getState().library).toEqual(workingLibrary);

    const failing = createStore(makeDeps({ library: "reject" }));
    failing.hydrate();
    await vi.runAllTimersAsync();
    expect(failing.getState().libraryStatus).toBe("error");
    expect(failing.getState().library).toBeNull();
  });
});

describe("createStore — dispatchSetup notice", () => {
  it("returns the reducer's last_medium notice when the last Medium toggle is blocked, undefined otherwise", () => {
    const repository = createRepository({ storage: createMemoryRawStore() });
    repository.save("setup", { v: 1, rev: 1, data: { ...concreteSetup, enabledMediums: ["med.a"] } });
    const store = createStore(makeDeps({ repository }));
    store.hydrate();

    expect(store.dispatchSetup({ type: "toggle_medium", mediumId: "med.a" })).toBe("last_medium");
    expect(store.getState().setup?.enabledMediums).toEqual(["med.a"]);
    expect(store.dispatchSetup({ type: "toggle_medium", mediumId: "med.b" })).toBeUndefined();
  });
});

describe("createStore — library load failure", () => {
  it("sets libraryStatus and (with no Setup) status to 'error', and drops queued commands", async () => {
    const store = createStore(makeDeps({ library: "reject" }));
    store.dispatch({ type: "new_challenge" });
    store.hydrate();
    await vi.runAllTimersAsync();

    expect(store.getState().libraryStatus).toBe("error");
    expect(store.getState().status).toBe("error");

    expect(store.getState().session.state).toBe("none");
  });

  it("treats a library that fails validation the same way", async () => {
    const store = createStore(makeDeps({ library: { ...workingLibrary, mediums: [] } }));
    store.hydrate();
    await vi.runAllTimersAsync();
    expect(store.getState().libraryStatus).toBe("error");
    expect(store.getState().status).toBe("error");
  });

  it("goes to 'error' instead of persisting an invalid Setup when the default Setup is invalid", async () => {
    const repository = createRepository({ storage: createMemoryRawStore() });
    const defaults = config.setup.defaults as { level: string };
    const original = defaults.level;
    defaults.level = "not-a-level";
    onTestFinished(() => {
      defaults.level = original;
    });
    const store = createStore(makeDeps({ repository, library: workingLibrary }));
    store.hydrate();
    await vi.runAllTimersAsync();
    expect(store.getState().status).toBe("error");
    expect(repository.load("setup")).toEqual({ ok: true, value: null });
  });
});

describe("createStore — new_challenge command", () => {
  it("queues the command until status and libraryStatus are both ready, then runs it", async () => {
    const store = createStore(makeDeps());
    store.dispatch({ type: "new_challenge" }); // dispatched before hydrate() -- nothing to do yet
    expect(store.getState().session.state).toBe("none");

    store.hydrate();
    await vi.runAllTimersAsync();

    expect(store.getState().session.state).toBe("held");
  });

  it("keeps at most one pending command per type (five new_challenge while loading commit once)", async () => {
    const repository = createRepository({ storage: createMemoryRawStore() });
    const store = createStore(makeDeps({ repository }));
    for (let i = 0; i < 5; i++) store.dispatch({ type: "new_challenge" });
    store.hydrate();
    await vi.runAllTimersAsync();

    expect(store.getState().session.recent).toHaveLength(1);
    const stored = repository.load("session");
    expect(stored.ok && stored.value?.rev).toBe(1);
  });

  it("composes and commits a held Challenge, persisting the session", async () => {
    const repository = createRepository({ storage: createMemoryRawStore() });
    repository.save("setup", { v: 1, rev: 1, data: concreteSetup });
    const store = createStore(makeDeps({ repository }));
    store.hydrate();
    await vi.runAllTimersAsync();

    store.dispatch({ type: "new_challenge" });

    expect(store.getState().session.state).toBe("held");
    expect(store.getState().session.challenge?.templateId).toBe("tpl.observation.explore.one");
    const stored = repository.load<{ state: string }>("session");
    expect(stored.ok && stored.value?.data.state).toBe("held");
  });

  it("dispatches compose_failed when no compatible Template exists", async () => {
    const repository = createRepository({ storage: createMemoryRawStore() });
    repository.save("setup", { v: 1, rev: 1, data: concreteSetup });
    const store = createStore(makeDeps({ repository, library: noCompatibleLibrary }));
    store.hydrate();
    await vi.runAllTimersAsync();

    store.dispatch({ type: "new_challenge" });

    expect(store.getState().session.state).toBe("none");
    expect(store.getState().session.lastComposeError).toEqual({ reason: "no_compatible", blockingLock: null });
  });
});

describe("createStore — setup events, rev conflict", () => {
  it("re-reads the fresh envelope and re-applies the same event instead of overwriting it", () => {
    const storage = createMemoryRawStore();
    const repository = createRepository({ storage });
    repository.save("setup", { v: 1, rev: 1, data: concreteSetup });

    const store = createStore(makeDeps({ repository }));
    store.hydrate();
    expect(store.getState().status).toBe("ready");

    // Another tab writes first, moving "setup" to rev 2 with a different enabledMediums list,
    // without this store knowing (no storage event fired yet).
    const otherTabSetup: Setup = { ...concreteSetup, enabledMediums: ["med.a"], medium: "med.a" };
    const otherRepo = createRepository({ storage });
    otherRepo.save("setup", { v: 1, rev: 2, data: otherTabSetup });

    store.dispatchSetup({ type: "set_quick_reveal", quickReveal: true });

    // The conflict was resolved by re-reading rev 2 and re-applying set_quick_reveal to it,
    // not by blindly forcing this store's stale rev-1-based computation through.
    expect(store.getState().setup).toEqual({ ...otherTabSetup, quickReveal: true });
    const stored = repository.load<Setup>("setup");
    expect(stored).toEqual({ ok: true, value: { v: 1, rev: 3, data: { ...otherTabSetup, quickReveal: true } } });
  });
});

describe("createStore — setup events, fresh === null conflict", () => {
  // Story 6.5: a null reread under a rev > 0 write means another tab cleared all data --
  // the write stays in memory only so the cleared slice is never resurrected.
  it("applies the event once in memory and does not write the cleared key back", () => {
    const storage = createMemoryRawStore();
    const repository = createRepository({ storage });
    repository.save("setup", { v: 1, rev: 1, data: concreteSetup });
    const store = createStore(makeDeps({ repository }));
    store.hydrate();

    createRepository({ storage }).clearAll(); // another tab clears everything, no event seen yet

    store.dispatchSetup({ type: "toggle_medium", mediumId: "med.b" });

    const expected = { ...concreteSetup, enabledMediums: ["med.a"] };
    expect(store.getState().setup).toEqual(expected); // applied once, not toggled back on
    expect(repository.load("setup")).toEqual({ ok: true, value: null });
    expect(store.getState().saveFailed).toBe(true);
  });
});

describe("createStore — save failures", () => {
  it("sets saveFailed on write_failed and clears it on the next successful save", () => {
    const real = createRepository({ storage: createMemoryRawStore() });
    real.save("setup", { v: 1, rev: 1, data: concreteSetup });
    let failWrites = true;
    const repository: Repository = {
      ...real,
      save: (key, envelope) => (failWrites ? { ok: false, reason: "write_failed" } : real.save(key, envelope)),
    };
    const store = createStore(makeDeps({ repository }));
    store.hydrate();

    store.dispatchSetup({ type: "set_sound", sound: true });
    expect(store.getState().saveFailed).toBe(true);
    expect(store.getState().setup?.sound).toBe(true); // held in memory

    failWrites = false;
    store.dispatchSetup({ type: "set_quick_reveal", quickReveal: true });
    expect(store.getState().saveFailed).toBe(false);
  });
});

describe("createStore — cross-tab Setup", () => {
  function twoTabs() {
    const storage = createMemoryRawStore();
    const target = fakeEventTarget();
    const repoA = createRepository({ storage, eventTarget: target });
    const repoB = createRepository({ storage, eventTarget: target });
    return { storage, target, repoA, repoB };
  }

  it("re-reads and updates setup when another tab writes it", () => {
    const { storage, target, repoA, repoB } = twoTabs();
    repoA.save("setup", { v: 1, rev: 1, data: concreteSetup });
    const store = createStore(makeDeps({ repository: repoB }));
    store.hydrate();

    repoA.save("setup", { v: 1, rev: 2, data: { ...concreteSetup, sound: true } });
    target.fire("impromptu:setup", storage);

    expect(store.getState().setup?.sound).toBe(true);
  });

  it("promotes status to 'ready' while loading when another tab's Setup arrives", () => {
    const { storage, target, repoA, repoB } = twoTabs();
    const store = createStore(makeDeps({ repository: repoB }));
    store.hydrate();
    expect(store.getState().status).toBe("loading");

    repoA.save("setup", { v: 1, rev: 1, data: concreteSetup });
    target.fire("impromptu:setup", storage);

    expect(store.getState().status).toBe("ready");
    expect(store.getState().setup).toEqual(concreteSetup);
  });

  it("brand-new visitor keeps a Setup another tab wrote first, not the defaults", async () => {
    const { repoA, repoB } = twoTabs();
    const store = createStore(makeDeps({ repository: repoB }));
    store.hydrate();

    const otherTabSetup: Setup = { ...concreteSetup, enabledMediums: ["med.b"], medium: "med.b" };
    repoA.save("setup", { v: 1, rev: 1, data: otherTabSetup }); // no storage event delivered
    await vi.runAllTimersAsync();

    expect(store.getState().setup).toEqual(otherTabSetup);
    const stored = repoB.load<Setup>("setup");
    expect(stored.ok && stored.value?.data).toEqual(otherTabSetup);
  });
});

describe("createStore — hydrate, storageAvailable", () => {
  it("is true with a probing memory store", () => {
    const repository = createRepository({ storage: createMemoryRawStore() });
    const store = createStore(makeDeps({ repository }));
    store.hydrate();
    expect(store.getState().storageAvailable).toBe(true);
  });

  it("is false when the repository reports unavailable", () => {
    const brokenStorage: RawStore = {
      getItem: () => null,
      setItem: () => {
        throw new Error("storage blocked");
      },
      removeItem: () => {},
      length: 0,
      key: () => null,
    };
    const repository = createRepository({ storage: brokenStorage });
    const store = createStore(makeDeps({ repository }));
    store.hydrate();
    expect(store.getState().storageAvailable).toBe(false);
  });
});

describe("createStore — hydrate, migrationFailed", () => {
  it("is false when nothing failed to migrate", () => {
    const repository = createRepository({ storage: createMemoryRawStore() });
    const store = createStore(makeDeps({ repository }));
    store.hydrate();
    expect(store.getState().migrationFailed).toBe(false);
  });

  it.each(["setup", "session", "history"] as const)("is true when the repository reports a failed %s migration", (failedKey) => {
    const real = createRepository({ storage: createMemoryRawStore() });
    const repository: Repository = { ...real, migrationFailed: (key) => key === failedKey };
    const store = createStore(makeDeps({ repository }));
    store.hydrate();
    expect(store.getState().migrationFailed).toBe(true);
  });

  it("is true when a real migration throws", () => {
    const raw = createMemoryRawStore();
    raw.setItem("impromptu:setup", JSON.stringify({ v: 1, rev: 1, data: concreteSetup }));
    const repository = createRepository({
      storage: raw,
      schemaVersions: { ...config.storage.schemaVersions, setup: 2 },
      migrations: {
        setup: [
          () => {
            throw new Error("boom");
          },
        ],
      },
    });
    const store = createStore(makeDeps({ repository }));
    store.hydrate();
    expect(store.getState().migrationFailed).toBe(true);
  });
});

describe("buildDefaultSetup", () => {
  it("enables every library Medium, including one no Template uses yet (FR-2)", () => {
    const library: ComposeLibrary = { ...workingLibrary, templates: [tpl({ mediums: ["med.a"] })] };
    expect(buildDefaultSetup(library)?.enabledMediums).toEqual(["med.a", "med.b"]);
  });

  it("falls back a default Medium the library lacks to random", () => {
    const defaults = config.setup.defaults as { medium: string };
    const original = defaults.medium;
    defaults.medium = "med.gone";
    try {
      expect(buildDefaultSetup(workingLibrary)?.medium).toBe("random");
    } finally {
      defaults.medium = original;
    }
  });
});

describe("createStore — cross-tab storage event", () => {
  it("re-reads and updates this store's session when another tab's write is announced", () => {
    const storage = createMemoryRawStore();
    const target = fakeEventTarget();
    const repoA = createRepository({ storage, eventTarget: target });
    const repoB = createRepository({ storage, eventTarget: target });
    repoA.save("setup", { v: 1, rev: 1, data: concreteSetup });

    const storeA = createStore(makeDeps({ repository: repoA }));
    const storeB = createStore(makeDeps({ repository: repoB }));
    storeA.hydrate();
    storeB.hydrate();

    storeA.dispatchSession({ type: "compose_failed", reason: "no_compatible", blockingLock: "topic" });
    target.fire("impromptu:session", storage); // simulates the native cross-tab storage event

    expect(storeB.getState().session.lastComposeError).toEqual({ reason: "no_compatible", blockingLock: "topic" });
  });
});

/** A started Attempt: composes, lands every piece (Quick reveal on), then starts. */
function startedStore(overrides: { repository?: Repository } = {}) {
  const repository = overrides.repository ?? createRepository({ storage: createMemoryRawStore() });
  repository.save("setup", { v: 1, rev: 1, data: { ...concreteSetup, quickReveal: true } });
  const deps = makeDeps({ repository });
  const store = createStore(deps);
  return { store, repository, deps };
}

async function startAttempt(store: ReturnType<typeof createStore>) {
  store.hydrate();
  await vi.runAllTimersAsync();
  store.dispatch({ type: "new_challenge" });
  store.dispatchSession({ type: "start", nowMs: 0 });
}

describe("createStore — finish_rep command", () => {
  it("is a no-op outside an Attempt", async () => {
    const { store } = startedStore();
    store.hydrate();
    await vi.runAllTimersAsync();
    store.dispatch({ type: "finish_rep" });
    expect(store.getState().history).toHaveLength(0);
    expect(store.getState().session.state).toBe("none");
  });

  it("appends one Rep to history, sets lastRepId, and moves the session to Finished", async () => {
    const { store, repository } = startedStore();
    await startAttempt(store);
    expect(store.getState().session.state).toBe("attempt");

    store.dispatch({ type: "finish_rep" });

    expect(store.getState().session.state).toBe("finished");
    expect(store.getState().history).toHaveLength(1);
    const repId = store.getState().session.lastRepId;
    expect(repId).not.toBeNull();
    expect(store.getState().history[0]?.id).toBe(repId);
    const stored = repository.load<Rep[]>("history");
    expect(stored.ok && stored.value?.data).toHaveLength(1);
  });

  it("is idempotent: a second finish_rep once Finished does not append another Rep", async () => {
    const { store } = startedStore();
    await startAttempt(store);

    store.dispatch({ type: "finish_rep" });
    store.dispatch({ type: "finish_rep" });

    expect(store.getState().history).toHaveLength(1);
  });
});

describe("createStore — save_rep command", () => {
  it("attaches the reflection draft to the Rep and moves the session to Saved", async () => {
    const { store } = startedStore();
    await startAttempt(store);
    store.dispatch({ type: "finish_rep" });
    store.dispatchSession({ type: "update_reflection_draft", reflection: { worked: "good light", change: "" } });

    store.dispatch({ type: "save_rep" });

    expect(store.getState().session.state).toBe("saved");
    expect(store.getState().session.attempt).toBeNull();
    expect(store.getState().history[0]?.reflection).toEqual({ worked: "good light", change: "" });
  });

  it("stores null when both fields are blank", async () => {
    const { store } = startedStore();
    await startAttempt(store);
    store.dispatch({ type: "finish_rep" });

    store.dispatch({ type: "save_rep" });

    expect(store.getState().history[0]?.reflection).toBeNull();
  });

  it("is idempotent: saving twice keeps one upserted reflection", async () => {
    const { store } = startedStore();
    await startAttempt(store);
    store.dispatch({ type: "finish_rep" });
    store.dispatchSession({ type: "update_reflection_draft", reflection: { worked: "a", change: "b" } });

    store.dispatch({ type: "save_rep" });
    store.dispatch({ type: "save_rep" });

    expect(store.getState().history).toHaveLength(1);
    expect(store.getState().history[0]?.reflection).toEqual({ worked: "a", change: "b" });
  });

  it("is a no-op outside Finished", async () => {
    const { store } = startedStore();
    store.hydrate();
    await vi.runAllTimersAsync();
    store.dispatch({ type: "save_rep" });
    expect(store.getState().history).toHaveLength(0);
  });
});

describe("createStore — retry command", () => {
  it("copies the Rep's Challenge under a new id with origin retry, and commits to Held without composing", async () => {
    const { store } = startedStore();
    await startAttempt(store);
    store.dispatch({ type: "finish_rep" });
    store.dispatch({ type: "save_rep" });

    const fromRep = store.getState().history[0];
    const fromRepId = fromRep?.id as string;
    const originalChallengeId = fromRep?.challenge.id;

    store.dispatch({ type: "retry", fromRepId });

    const { session } = store.getState();
    expect(session.state).toBe("held");
    expect(session.challenge?.origin).toEqual({ kind: "retry", fromRepId });
    expect(session.challenge?.id).not.toBe(originalChallengeId);
    expect(session.challenge?.brief).toBe(fromRep?.challenge.brief);
    // Retry never plays a Reveal: every present kind lands at once.
    expect(session.revealed).toEqual(presentKinds(session.challenge!));
  });

  it("is a no-op when fromRepId matches no Rep", async () => {
    const { store } = startedStore();
    store.hydrate();
    await vi.runAllTimersAsync();
    const before = store.getState().session;

    store.dispatch({ type: "retry", fromRepId: "does-not-exist" });

    expect(store.getState().session).toBe(before);
  });
});

describe("createStore — new_challenge guarded during Attempt/Finished", () => {
  it("does not compose a new Challenge while an Attempt is running or just Finished", async () => {
    const { store, deps } = startedStore();
    await startAttempt(store);
    const challengeDuringAttempt = store.getState().session.challenge;
    const next = vi.spyOn(deps.random, "next");

    store.dispatch({ type: "new_challenge" });
    expect(store.getState().session.challenge).toBe(challengeDuringAttempt);
    expect(store.getState().session.state).toBe("attempt");

    store.dispatch({ type: "finish_rep" });
    store.dispatch({ type: "new_challenge" });
    expect(store.getState().session.state).toBe("finished");
    expect(next).not.toHaveBeenCalled(); // compose() never ran
  });
});

const START_MS = 1_700_000_000_000;
const timedAttempt: Session = {
  ...attemptSession,
  challenge: { ...baseChallenge, timeLimitSec: 300 },
  attempt: { startedAt: START_MS, pausedAt: null, pausedTotalMs: 0, timeLimitSec: 300 },
};

/** A store hydrated straight into a stored timed Attempt, with the fake clock in hand. */
function attemptStore(overrides: { repository?: Repository; library?: ComposeLibrary | "reject" } = {}) {
  const repository = overrides.repository ?? createRepository({ storage: createMemoryRawStore() });
  repository.save("setup", { v: 1, rev: 1, data: concreteSetup });
  repository.save("session", { v: 1, rev: 1, data: timedAttempt });
  const clock = fakeClock(START_MS);
  const store = createStore({ ...makeDeps({ repository, library: overrides.library }), clock });
  return { store, repository, clock };
}

describe("createStore — finish/save/retry gating", () => {
  it("finish_rep works while libraryStatus is 'error' (needs hydration only)", async () => {
    const { store } = attemptStore({ library: "reject" });
    store.hydrate();
    await vi.runAllTimersAsync();
    expect(store.getState().libraryStatus).toBe("error");

    store.dispatch({ type: "finish_rep" });

    expect(store.getState().session.state).toBe("finished");
    expect(store.getState().history).toHaveLength(1);
  });

  it("a finish_rep dispatched before hydrate runs once hydrated, without waiting for the library", () => {
    const { store } = attemptStore();
    store.dispatch({ type: "finish_rep" });
    store.hydrate();
    expect(store.getState().libraryStatus).toBe("loading");
    expect(store.getState().session.state).toBe("finished");
  });
});

describe("createStore — finish_rep timing and rev conflicts", () => {
  it("records timeUsedSec from the fake clock and finishedAt as its ISO time", () => {
    const { store, clock } = attemptStore();
    store.hydrate();
    clock.advance(65_400);

    store.dispatch({ type: "finish_rep" });

    const rep = store.getState().history[0];
    expect(rep?.timeUsedSec).toBe(65);
    expect(rep?.finishedAt).toBe(new Date(START_MS + 65_400).toISOString());
  });

  it("re-applies the append onto another tab's history write instead of overwriting it", () => {
    const storage = createMemoryRawStore();
    const repository = createRepository({ storage });
    const other = createRepository({ storage });
    const { store } = attemptStore({ repository });
    store.hydrate();
    const otherRep: Rep = {
      id: "523e4567-e89b-42d3-a456-426614174000",
      challenge: baseChallenge,
      finishedAt: "2026-10-09T12:00:00.000Z",
      timeUsedSec: null,
      reflection: null,
    };
    other.save("history", { v: 1, rev: 1, data: [otherRep] }); // written between hydrate and finish_rep

    store.dispatch({ type: "finish_rep" });

    const repId = store.getState().session.lastRepId;
    const stored = repository.load<Rep[]>("history");
    expect(stored.ok && stored.value?.data.map((r) => r.id)).toEqual([otherRep.id, repId]);
    expect(store.getState().history).toHaveLength(2);
    expect(store.getState().saveFailed).toBe(false);
  });

  it("appends no Rep when another tab already moved the session on (lost race)", () => {
    const storage = createMemoryRawStore();
    const repository = createRepository({ storage });
    const other = createRepository({ storage });
    const { store } = attemptStore({ repository });
    store.hydrate();
    other.save("session", { v: 1, rev: 2, data: { ...timedAttempt, state: "none", challenge: null, attempt: null } }); // discarded elsewhere

    store.dispatch({ type: "finish_rep" });

    expect(store.getState().session.state).toBe("none");
    expect(store.getState().history).toHaveLength(0);
    expect(repository.load("history")).toEqual({ ok: true, value: null });
  });
});

describe("createStore — save_rep edge cases", () => {
  it("stores null for a whitespace-only reflection and trims real text", async () => {
    const { store } = startedStore();
    await startAttempt(store);
    store.dispatch({ type: "finish_rep" });
    store.dispatchSession({ type: "update_reflection_draft", reflection: { worked: "   ", change: "\n\t" } });
    store.dispatch({ type: "save_rep" });
    expect(store.getState().history[0]?.reflection).toBeNull();
  });

  it("trims each field before storing", async () => {
    const { store } = startedStore();
    await startAttempt(store);
    store.dispatch({ type: "finish_rep" });
    store.dispatchSession({ type: "update_reflection_draft", reflection: { worked: "  good light ", change: " " } });
    store.dispatch({ type: "save_rep" });
    expect(store.getState().history[0]?.reflection).toEqual({ worked: "good light", change: "" });
  });

  it("sets saveFailed and stays Finished when the Rep is missing from history", () => {
    const repository = createRepository({ storage: createMemoryRawStore() });
    repository.save("setup", { v: 1, rev: 1, data: concreteSetup });
    repository.save("session", {
      v: 1,
      rev: 1,
      data: { ...timedAttempt, state: "finished", lastRepId: "623e4567-e89b-42d3-a456-426614174000", reflectionDraft: { worked: "", change: "" } },
    });
    const store = createStore(makeDeps({ repository }));
    store.hydrate();

    store.dispatch({ type: "save_rep" });

    expect(store.getState().saveFailed).toBe(true);
    expect(store.getState().session.state).toBe("finished");
  });
});

describe("createStore — retry outside Saved", () => {
  it("is a no-op from Finished even with a real Rep id", async () => {
    const { store } = startedStore();
    await startAttempt(store);
    store.dispatch({ type: "finish_rep" });
    const before = store.getState().session;

    store.dispatch({ type: "retry", fromRepId: before.lastRepId as string });

    expect(store.getState().session).toBe(before);
  });
});

/** A minimal persisted Rep for seeding history. */
const rep = (id: string): Rep => ({
  id: `${id}-e89b-42d3-a456-426614174000`,
  challenge: baseChallenge,
  finishedAt: "2026-10-09T12:00:00.000Z",
  timeUsedSec: null,
  reflection: null,
});

describe("createStore — clear_all_data command", () => {
  it("empties setup/session/history and removes every impromptu:* key", async () => {
    const storage = createMemoryRawStore();
    const repository = createRepository({ storage });
    const store = createStore(makeDeps({ repository }));
    store.hydrate();
    await vi.runAllTimersAsync();
    store.dispatch({ type: "new_challenge" });
    expect(store.getState().session.state).toBe("held");

    store.dispatch({ type: "clear_all_data" });

    expect(store.getState().session).toEqual(noneSession);
    expect(store.getState().history).toEqual([]);
    expect(storage.length).toBe(0);
  });

  it("runs synchronously once hydrated, before any timer advances", () => {
    const storage = createMemoryRawStore();
    const repository = createRepository({ storage });
    repository.save("setup", { v: 1, rev: 1, data: concreteSetup });
    repository.save("session", { v: config.storage.schemaVersions.session, rev: 1, data: attemptSession });
    repository.save("history", { v: config.storage.schemaVersions.history, rev: 1, data: [rep("12345678")] });
    const store = createStore(makeDeps({ repository }));
    store.hydrate();
    expect(store.getState().history).toHaveLength(1);

    store.dispatch({ type: "clear_all_data" });

    expect(storage.length).toBe(0);
    expect(store.getState().session).toEqual(noneSession);
    expect(store.getState().history).toEqual([]);
  });

  it("resets every slice rev to 0 -- the next write to each slice after a clear lands at rev 1", async () => {
    const { store, repository } = startedStore();
    await startAttempt(store);
    store.dispatch({ type: "finish_rep" });
    expect(store.getState().history).toHaveLength(1);

    store.dispatch({ type: "clear_all_data" });
    store.dispatchSetup({ type: "set_quick_reveal", quickReveal: true });
    store.dispatch({ type: "new_challenge" });
    store.dispatchSession({ type: "start", nowMs: 0 });
    store.dispatch({ type: "finish_rep" });

    const revOf = (key: "setup" | "session" | "history") => {
      const stored = repository.load<unknown>(key);
      return stored.ok ? stored.value?.rev : undefined;
    };
    expect(revOf("setup")).toBe(1);
    expect(revOf("history")).toBe(1);
    // new_challenge, start and finish_rep each write the session once.
    expect(revOf("session")).toBe(3);
    expect(store.getState().history).toHaveLength(1);
  });

  it("lands in status 'error' with setup null after a library failure, even with a persisted setup", async () => {
    const repository = createRepository({ storage: createMemoryRawStore() });
    repository.save("setup", { v: 1, rev: 1, data: concreteSetup });
    const store = createStore(makeDeps({ repository, library: "reject" }));
    store.hydrate();
    await vi.runAllTimersAsync();
    expect(store.getState().status).toBe("ready");

    store.dispatch({ type: "clear_all_data" });

    expect(store.getState().setup).toBeNull();
    expect(store.getState().status).toBe("error");
  });

  it("resets migrationFailed", () => {
    const real = createRepository({ storage: createMemoryRawStore() });
    const repository: Repository = { ...real, migrationFailed: () => true };
    const store = createStore(makeDeps({ repository }));
    store.hydrate();
    expect(store.getState().migrationFailed).toBe(true);

    store.dispatch({ type: "clear_all_data" });

    expect(store.getState().migrationFailed).toBe(false);
  });

  it("sets saveFailed and changes nothing else when the wipe fails", () => {
    const memory = createMemoryRawStore();
    const storage: RawStore = {
      ...memory,
      get length() {
        return memory.length;
      },
      removeItem: (key) => {
        if (key.startsWith("impromptu:")) throw new Error("denied");
        memory.removeItem(key);
      },
    };
    const repository = createRepository({ storage });
    repository.save("setup", { v: 1, rev: 1, data: concreteSetup });
    repository.save("history", { v: config.storage.schemaVersions.history, rev: 1, data: [rep("12345678")] });
    const store = createStore(makeDeps({ repository }));
    store.hydrate();
    const before = store.getState();

    store.dispatch({ type: "clear_all_data" });

    expect(store.getState()).toEqual({ ...before, saveFailed: true });
    expect(memory.length).toBe(2);
  });

  it("does not resurrect cleared data when another tab writes from its pre-clear state", () => {
    const storage = createMemoryRawStore();
    const repoA = createRepository({ storage });
    const repoB = createRepository({ storage });
    repoA.save("setup", { v: 1, rev: 1, data: concreteSetup });
    repoA.save("session", { v: config.storage.schemaVersions.session, rev: 1, data: attemptSession });
    repoA.save("history", { v: config.storage.schemaVersions.history, rev: 1, data: [rep("12345678")] });
    const storeA = createStore(makeDeps({ repository: repoA }));
    const storeB = createStore(makeDeps({ repository: repoB }));
    storeA.hydrate();
    storeB.hydrate();

    storeA.dispatch({ type: "clear_all_data" });
    storeB.dispatchSession({ type: "compose_failed", reason: "no_compatible", blockingLock: "topic" });
    storeB.dispatchSetup({ type: "set_sound", sound: true });

    const keys = Array.from({ length: storage.length }, (_, i) => storage.key(i)).filter((k) => k?.startsWith("impromptu:"));
    expect(keys).toEqual([]);
    expect(storeB.getState().saveFailed).toBe(true);
  });

  it("rebuilds setup from the library default once the library is ready", async () => {
    const repository = createRepository({ storage: createMemoryRawStore() });
    const store = createStore(makeDeps({ repository }));
    store.hydrate();
    await vi.runAllTimersAsync();

    store.dispatch({ type: "clear_all_data" });

    expect(store.getState().setup?.enabledMediums).toEqual(["med.a", "med.b"]);
    expect(store.getState().status).toBe("ready");
    // Persisted nothing: a clear's rebuilt default lives in memory only.
    expect(repository.load("setup")).toEqual({ ok: true, value: null });
  });

  it("leaves setup null (status loading) when the library hasn't resolved yet", () => {
    const repository = createRepository({ storage: createMemoryRawStore() });
    const store = createStore(makeDeps({ repository }));
    store.hydrate(); // library load kicked off but pending -- fake timers not advanced

    store.dispatch({ type: "clear_all_data" });

    expect(store.getState().setup).toBeNull();
    expect(store.getState().status).toBe("loading");
  });

  it("persists a fresh default setup at rev 1 when the library resolves after a clear", async () => {
    const repository = createRepository({ storage: createMemoryRawStore() });
    repository.save("setup", { v: 1, rev: 1, data: { ...concreteSetup, sound: true } });
    const store = createStore(makeDeps({ repository }));
    store.hydrate();

    store.dispatch({ type: "clear_all_data" });
    await vi.runAllTimersAsync();

    expect(store.getState().status).toBe("ready");
    expect(store.getState().setup?.sound).toBe(false);
    const stored = repository.load<unknown>("setup");
    expect(stored.ok && stored.value?.rev).toBe(1);
  });

  it("drops a queued new_challenge so it never runs once the library arrives", async () => {
    const repository = createRepository({ storage: createMemoryRawStore() });
    const store = createStore(makeDeps({ repository }));
    store.hydrate();
    store.dispatch({ type: "new_challenge" }); // library still loading -> queued

    store.dispatch({ type: "clear_all_data" }); // hydrated -> runs immediately, drops the queued command

    await vi.runAllTimersAsync();
    expect(store.getState().session.state).toBe("none");
  });

  it("still treats a cross-tab reread of a missing key as a first visit after clearing", async () => {
    const storage = createMemoryRawStore();
    const target = fakeEventTarget();
    const repository = createRepository({ storage, eventTarget: target });
    const store = createStore(makeDeps({ repository }));
    store.hydrate();
    await vi.runAllTimersAsync();
    store.dispatch({ type: "new_challenge" });

    store.dispatch({ type: "clear_all_data" });
    target.fire("impromptu:setup", storage); // another tab's (or this repository's own) notification arrives

    expect(store.getState().setup).not.toBeNull();
    expect(store.getState().status).toBe("ready");
    const stored = repository.load<unknown>("setup");
    expect(stored.ok && stored.value?.rev).toBe(1); // the first-visit path (ensureSetup) persisted it
  });
});
