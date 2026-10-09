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

const initialState: StoreState = {
  status: "loading",
  libraryStatus: "loading",
  setup: null,
  session: emptySession,
  history: [],
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

  /** Saves `data`; on a rev conflict, re-reads the fresh envelope and re-applies the same transform to it before retrying (bounded, so a pathological conflict loop can't hang). */
  function persist<T>(key: StorageKey, version: number, rev: number, data: T, reapply: (fresh: T) => T): { data: T; rev: number } {
    let currentData = data;
    let currentRev = rev;
    for (let attempt = 0; attempt < 10; attempt++) {
      const result = repository.save<T>(key, { v: version, rev: currentRev + 1, data: currentData });
      if (result.ok) return { data: currentData, rev: result.value.rev };
      if (result.reason !== "rev_conflict") return { data: currentData, rev: currentRev }; // give up, keep this in memory only
      const fresh: Envelope<T> | null = result.fresh;
      currentRev = fresh ? fresh.rev : 0;
      currentData = reapply(fresh ? fresh.data : currentData);
    }
    return { data: currentData, rev: currentRev };
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
    });

    repository.subscribe("setup", rereadSetup);
    repository.subscribe("session", rereadSession);
    repository.subscribe("history", rereadHistory);

    startLibraryLoad();
  }

  function rereadSetup(): void {
    const slice = loadSlice("setup", Setup);
    setupRev = slice.rev;
    setState({ ...state, setup: slice.data ?? state.setup });
  }

  function rereadSession(): void {
    const slice = loadSlice("session", Session);
    sessionRev = slice.rev;
    setState({ ...state, session: slice.data ?? emptySession });
  }

  function rereadHistory(): void {
    const slice = loadSlice("history", HistoryList);
    setState({ ...state, history: slice.data ?? [] });
  }

  function startLibraryLoad(): void {
    if (libraryRequested) return;
    libraryRequested = true;
    prefetchOnIdle(async () => {
      const result = await loadLibrary(librarySource);
      if (result.ok) {
        library = result.library;
        onLibraryReady(result.library);
      }
      // On failure, libraryStatus stays 'loading' for this store's lifetime (no retry this story).
    });
  }

  function onLibraryReady(loaded: ComposeLibrary): void {
    let next: StoreState = { ...state, libraryStatus: "ready" };

    if (next.setup === null) {
      const defaultSetup = buildDefaultSetup(loaded);
      // A concurrent first-visit write (another tab) wins outright rather than being overwritten.
      const persisted = persist("setup", schemaVersions.setup, setupRev, defaultSetup, (fresh) => fresh);
      setupRev = persisted.rev;
      next = { ...next, setup: persisted.data, status: "ready" };
    }

    setState(next);
    for (const command of pendingCommands.splice(0, pendingCommands.length)) runCommand(command);
  }

  function isReadyToCompose(): boolean {
    return state.status === "ready" && state.libraryStatus === "ready" && state.setup !== null && library !== null;
  }

  function dispatch(command: StoreCommand): void {
    if (!isReadyToCompose()) {
      pendingCommands.push(command);
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
    const result = setupReducer(state.setup, event);
    if (result.setup === state.setup) return; // no-op; `result.notice` has no consumer yet (no UI this story)
    const persisted = persist("setup", schemaVersions.setup, setupRev, result.setup, (fresh) => setupReducer(fresh, event).setup);
    setupRev = persisted.rev;
    setState({ ...state, setup: persisted.data });
  }

  function dispatchSession(event: SessionEvent): void {
    applySessionEvent(event);
  }

  function applySessionEvent(event: SessionEvent): void {
    const quickReveal = state.setup?.quickReveal ?? false;
    const next = sessionReducer(state.session, event, { quickReveal });
    if (next === state.session) return;
    const persisted = persist("session", schemaVersions.session, sessionRev, next, (fresh) =>
      sessionReducer(fresh, event, { quickReveal: state.setup?.quickReveal ?? false }),
    );
    sessionRev = persisted.rev;
    setState({ ...state, session: persisted.data });
  }

  return { getState, subscribe, hydrate, dispatchSetup, dispatchSession, dispatch };
}
