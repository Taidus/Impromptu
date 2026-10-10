import { z } from "zod";
import { loadLibrary, prefetchOnIdle } from "@/adapters/library";
import { config } from "@/config/app";
import { compose, recentKeyFor, type ComposeLibrary, type ComposeRequest } from "@/domain/compose/compose";
import type { Envelope, StorageKey } from "@/domain/ports";
import { Rep, Session, Setup } from "@/domain/session/schema";
import { sessionReducer, type SessionEvent } from "@/domain/session/session-reducer";
import { setupReducer, type SetupEvent } from "@/domain/session/setup-reducer";
import { buildDefaultSetup, emptySession } from "./defaults";
import type { Store, StoreCommand, StoreDeps, StoreState } from "./types";

const schemaVersions = config.storage.schemaVersions;
const HistoryList = z.array(Rep);

/** Each rev conflict means another tab wrote in between; ten in a row is a runaway loop, not real contention. */
const MAX_SAVE_ATTEMPTS = 10;

/** The neutral pre-hydration state (AD-10); also the server snapshot. */
export const initialState: StoreState = {
  status: "loading",
  libraryStatus: "loading",
  setup: null,
  library: null,
  session: emptySession,
  history: [],
  saveFailed: false,
  storageAvailable: true,
  migrationFailed: false,
};

/**
 * The one AD-7 app store. Holds setup/session/history, runs only the domain reducers, and
 * persists every change through the Repository (rev-conflict: re-read the fresh envelope,
 * re-apply the same event to it, retry). `createStore` takes its dependencies explicitly --
 * `src/store/index.ts` supplies the real ones.
 */
export function createStore(deps: StoreDeps): Store {
  const { repository, clock, random, librarySource } = deps;

  let state: StoreState = initialState;
  let setupRev = 0;
  let sessionRev = 0;
  let library: ComposeLibrary | null = null;
  let hydrated = false;
  let libraryRequested = false;
  const pendingCommands: StoreCommand[] = [];
  const listeners = new Set<() => void>();
  const readMigrationFailed = () =>
    repository.migrationFailed("setup") || repository.migrationFailed("session") || repository.migrationFailed("history");

  function getState(): StoreState {
    return state;
  }

  function subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  function setState(next: StoreState): void {
    state = next;
    for (const listener of listeners) listener();
  }

  /** The Repository does not validate shapes; a value that fails its schema is treated as absent (same conservative rule 3.5 applies to corrupted bytes). */
  function loadSlice<T>(key: StorageKey, schema: z.ZodType<T>): { data: T | null; rev: number } {
    const result = repository.load<unknown>(key);
    if (!result.ok || result.value === null) return { data: null, rev: 0 };
    const parsed = schema.safeParse(result.value.data);
    return { data: parsed.success ? parsed.data : null, rev: result.value.rev };
  }

  /**
   * Saves `data`; on a rev conflict, re-reads the fresh envelope (zod-validated; invalid counts as
   * absent) and re-applies the same transform to it -- `reapply(null)` means "nothing valid stored",
   * so the caller re-applies to its pre-event base. Bounded; once exhausted, holds what is stored.
   * `saved` is false when the change could not be written.
   */
  function persist<T>(key: StorageKey, schema: z.ZodType<T>, rev: number, data: T, reapply: (fresh: T | null) => T): { data: T; rev: number; saved: boolean } {
    let currentData = data;
    let currentRev = rev;
    for (let attempt = 0; attempt < MAX_SAVE_ATTEMPTS; attempt++) {
      const result = repository.save<T>(key, { v: schemaVersions[key], rev: currentRev + 1, data: currentData });
      if (result.ok) return { data: currentData, rev: result.value.rev, saved: true };
      if (result.reason !== "rev_conflict") return { data: currentData, rev: currentRev, saved: false }; // keep this in memory only
      const fresh: Envelope<unknown> | null = result.fresh;
      const parsed = fresh ? schema.safeParse(fresh.data) : null;
      currentRev = fresh ? fresh.rev : 0;
      currentData = reapply(parsed?.success ? parsed.data : null);
    }
    const stored = loadSlice(key, schema);
    return { data: stored.data ?? currentData, rev: stored.rev, saved: false };
  }

  function hydrate(): void {
    if (hydrated) return;
    hydrated = true;

    const setupSlice = loadSlice("setup", Setup);
    const sessionSlice = loadSlice("session", Session);
    const historySlice = loadSlice("history", HistoryList);
    setupRev = setupSlice.rev;
    sessionRev = sessionSlice.rev;

    setState({
      ...state,
      status: setupSlice.data !== null ? "ready" : "loading",
      setup: setupSlice.data,
      session: sessionSlice.data ?? emptySession,
      history: historySlice.data ?? [],
      storageAvailable: repository.storageAvailable,
      migrationFailed: readMigrationFailed(),
    });

    repository.subscribe("setup", rereadSetup);
    repository.subscribe("session", rereadSession);
    repository.subscribe("history", rereadHistory);

    startLibraryLoad();
  }

  function rereadSetup(): void {
    const slice = loadSlice("setup", Setup);
    setupRev = slice.rev;
    if (slice.data !== null) {
      setState({ ...state, setup: slice.data, status: "ready", migrationFailed: readMigrationFailed() });
      drainPending();
      return;
    }
    // Cleared or invalid in another tab: same as a first visit.
    setState({
      ...state,
      setup: null,
      status: state.libraryStatus === "error" ? "error" : "loading",
      migrationFailed: readMigrationFailed(),
    });
    if (state.libraryStatus === "ready" && library !== null) ensureSetup(library);
  }

  function rereadSession(): void {
    const slice = loadSlice("session", Session);
    sessionRev = slice.rev;
    setState({ ...state, session: slice.data ?? emptySession, migrationFailed: readMigrationFailed() });
  }

  function rereadHistory(): void {
    const slice = loadSlice("history", HistoryList);
    setState({ ...state, history: slice.data ?? [], migrationFailed: readMigrationFailed() });
  }

  function startLibraryLoad(): void {
    if (libraryRequested) return;
    libraryRequested = true;
    prefetchOnIdle(async () => {
      try {
        const result = await loadLibrary(librarySource);
        if (!result.ok) throw new Error(`library load failed: ${result.reason}`);
        library = result.library;
        onLibraryReady(result.library);
      } catch {
        // No retry this story: report it and drop whatever was waiting on the library.
        pendingCommands.length = 0;
        setState({ ...state, libraryStatus: "error", status: state.setup === null ? "error" : state.status });
      }
    });
  }

  function onLibraryReady(loaded: ComposeLibrary): void {
    if (state.setup === null) ensureSetup(loaded);
    setState({ ...state, libraryStatus: "ready", library: loaded });
    drainPending();
  }

  /** First visit: builds and persists the default Setup. A concurrent first-visit write (another tab) wins outright. */
  function ensureSetup(loaded: ComposeLibrary): void {
    const defaultSetup = buildDefaultSetup(loaded);
    if (defaultSetup === null) throw new Error("library has no usable Medium");
    const persisted = persist("setup", Setup, setupRev, defaultSetup, (fresh) => fresh ?? defaultSetup);
    setupRev = persisted.rev;
    setState({ ...state, setup: persisted.data, status: "ready", saveFailed: !persisted.saved });
  }

  function drainPending(): void {
    if (!isReadyToCompose()) return;
    for (const command of pendingCommands.splice(0, pendingCommands.length)) runCommand(command);
  }

  function isReadyToCompose(): boolean {
    return state.status === "ready" && state.libraryStatus === "ready" && state.setup !== null && library !== null;
  }

  function dispatch(command: StoreCommand): void {
    if (!isReadyToCompose()) {
      if (state.status === "error" || state.libraryStatus === "error") return; // nothing will ever drain it
      if (!pendingCommands.some((c) => c.type === command.type)) pendingCommands.push(command); // at most one per type
      return;
    }
    runCommand(command);
  }

  function runCommand(command: StoreCommand): void {
    if (command.type === "new_challenge") runNewChallenge();
  }

  function runNewChallenge(): void {
    const setup = state.setup;
    if (setup === null || library === null) return; // isReadyToCompose() guarantees this in practice
    const request: ComposeRequest = {
      level: setup.level,
      performTiming: setup.performTiming,
      enabledMediums: setup.enabledMediums,
      medium: setup.medium,
      skillFocus: setup.skillFocus,
      locks: {}, // a brand-new Challenge locks nothing -- see Design Notes
      mustDiffer: {},
      origin: { kind: "new", fromRepId: null },
    };
    const result = compose(request, library, state.session.recent, clock, random);
    const event: SessionEvent = result.ok
      ? {
          type: "challenge_committed",
          challenge: result.challenge,
          recentKey: recentKeyFor(result.challenge.templateId, result.challenge.inputs.topic?.id ?? null),
        }
      : { type: "compose_failed", reason: result.reason, blockingLock: result.blockingLock };
    applySessionEvent(event);
  }

  function dispatchSetup(event: SetupEvent): void {
    if (state.setup === null) return; // nothing to apply to yet
    const base = state.setup;
    const result = setupReducer(base, event);
    if (result.setup === base) return; // no-op; `result.notice` has no consumer yet (no UI this story)
    const persisted = persist("setup", Setup, setupRev, result.setup, (fresh) => setupReducer(fresh ?? base, event).setup);
    setupRev = persisted.rev;
    setState({ ...state, setup: persisted.data, saveFailed: !persisted.saved });
  }

  function dispatchSession(event: SessionEvent): void {
    applySessionEvent(event);
  }

  function applySessionEvent(event: SessionEvent): void {
    const quickReveal = state.setup?.quickReveal ?? false;
    const base = state.session;
    const next = sessionReducer(base, event, { quickReveal });
    if (next === base) return;
    const persisted = persist("session", Session, sessionRev, next, (fresh) => sessionReducer(fresh ?? base, event, { quickReveal }));
    sessionRev = persisted.rev;
    setState({ ...state, session: persisted.data, saveFailed: !persisted.saved });
  }

  return { getState, subscribe, hydrate, dispatchSetup, dispatchSession, dispatch };
}
