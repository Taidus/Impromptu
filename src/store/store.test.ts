import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMemoryRawStore } from "@/adapters/storage/raw";
import { createRepository } from "@/adapters/storage";
import { fakeClock, seededRandom } from "@/domain/test-doubles";
import type { Medium, Skill, Template, Topic } from "@/domain/library/schema";
import type { ComposeLibrary } from "@/domain/compose/compose";
import type { Repository } from "@/domain/ports";
import type { Setup } from "@/domain/session/schema";
import { createStore } from "./store";
import type { StoreDeps } from "./types";

const skill = (id: string): Skill => ({ id, revealText: id, info: id, tags: [] });
const medium = (id: string): Medium => ({ id, revealText: id, info: id, tags: [] });
const topic = (id: string, tags: string[]): Topic => ({ id, revealText: id, briefText: id, tags, requires: [], excludes: [] });
const tpl = (over: Partial<Template> = {}): Template => ({
  id: "tpl.observation.explore.one",
  skill: "skl.observation",
  level: "explore",
  mediums: ["med.a"],
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

const emptyTemplateLibrary: ComposeLibrary = { ...workingLibrary, templates: [] };

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

describe("createStore — library load failure", () => {
  it("leaves libraryStatus:'loading' forever (no retry this story)", async () => {
    const store = createStore(makeDeps({ library: "reject" }));
    store.hydrate();
    await vi.runAllTimersAsync();

    expect(store.getState().libraryStatus).toBe("loading");
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
    const store = createStore(makeDeps({ repository, library: emptyTemplateLibrary }));
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
