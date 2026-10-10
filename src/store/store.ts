import { z } from "zod";
import { loadLibrary, prefetchOnIdle } from "@/adapters/library";
import { config } from "@/config/app";
import { compose, recentKeyFor, type ComposeLibrary, type ComposeRequest } from "@/domain/compose/compose";
import type { Envelope, StorageKey } from "@/domain/ports";
import { Rep, Session, Setup, type Challenge, InputKind, type Locks, type Reflection } from "@/domain/session/schema";
import { canLockOrReroll, finishRep, sessionReducer, type SessionEvent } from "@/domain/session/session-reducer";
import { setupReducer, type SetupEvent, type SetupReducerResult } from "@/domain/session/setup-reducer";
import { buildDefaultSetup, emptySession } from "./defaults";
import type { Store, StoreCommand, StoreDeps, StoreState } from "./types";

const schemaVersions = config.storage.schemaVersions;
const HistoryList = z.array(Rep);

function appendRepIfAbsent(history: Rep[], rep: Rep): Rep[] {
  return history.some((r) => r.id === rep.id) ? history : [...history, rep];
}

function upsertReflection(history: Rep[], repId: string, reflection: Reflection | null): Rep[] {
  return history.map((r) => (r.id === repId ? { ...r, reflection } : r));
}

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
  let historyRev = 0;
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
      // The key vanished under a write that expected rev > 0: another tab cleared all data (Story 6.5).
      // Re-applying would resurrect the pre-clear slice, so keep it in memory only.
      if (fresh === null && currentRev > 0) return { data: currentData, rev: 0, saved: false };
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
    historyRev = historySlice.rev;

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
    drainPending(); // a finish/save/retry queued before hydrate needs only hydration
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
    historyRev = slice.rev;
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
        // No retry this story: report it and drop what was waiting on the library (new_challenge/reroll only).
        removePending((c) => needsLibrary(c.type));
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

  function removePending(match: (command: StoreCommand) => boolean): StoreCommand[] {
    const removed = pendingCommands.filter(match);
    const kept = pendingCommands.filter((c) => !match(c));
    pendingCommands.length = 0;
    pendingCommands.push(...kept);
    return removed;
  }

  function drainPending(): void {
    for (const command of removePending(canRun)) runCommand(command);
  }

  function isReadyToCompose(): boolean {
    return state.status === "ready" && state.libraryStatus === "ready" && state.setup !== null && library !== null;
  }

  /** `new_challenge` and `reroll` compose, so only they wait for the library. */
  function needsLibrary(type: StoreCommand["type"]): boolean {
    return type === "new_challenge" || type === "reroll";
  }

  /**
   * Composing commands wait for the library; finish/save/retry need
   * hydration alone. `clear_all_data` doesn't read or depend on setup/session validity at all --
   * it only needs the Repository hydrate() has already set up, so it runs as soon as that's done,
   * even from `status: 'loading'` or `'error'`.
   */
  function canRun(command: StoreCommand): boolean {
    if (needsLibrary(command.type)) return isReadyToCompose();
    if (command.type === "clear_all_data") return hydrated;
    return state.status === "ready";
  }

  function dispatch(command: StoreCommand): void {
    if (canRun(command)) {
      runCommand(command);
      return;
    }
    // A library error means nothing will ever drain a composing command; the others can still drain once a Setup arrives.
    if (needsLibrary(command.type) && (state.status === "error" || state.libraryStatus === "error")) return;
    if (!pendingCommands.some((c) => c.type === command.type)) pendingCommands.push(command); // at most one per type
  }

  function runCommand(command: StoreCommand): void {
    if (command.type === "new_challenge") runNewChallenge();
    else if (command.type === "finish_rep") runFinishRep();
    else if (command.type === "save_rep") runSaveRep();
    else if (command.type === "retry") runRetry(command.fromRepId);
    else if (command.type === "reroll") runReroll();
    else runClearAllData();
  }

  /**
   * Clear all data (Story 6.5, FR-28): wipes every `impromptu:*` key, empties session/history,
   * resets every slice rev to 0 (AD-9: the next write after a clear starts a fresh rev chain), and
   * drops any queued `new_challenge` (it would otherwise compose against the just-cleared state
   * the moment the library arrives). Setup goes back to the library default in memory only --
   * nothing is persisted here -- when the library is ready; otherwise it goes to `null` and the
   * existing first-visit path (`onLibraryReady` -> `ensureSetup`) builds and persists one once the
   * library resolves, exactly as it would for a brand-new visitor.
   */
  function runClearAllData(): void {
    // A failed clear changes nothing but the save-failed flag (the caller announces the failure).
    if (!repository.clearAll().ok) {
      setState({ ...state, saveFailed: true });
      return;
    }
    removePending((c) => c.type === "new_challenge");
    setupRev = 0;
    sessionRev = 0;
    historyRev = 0;
    const setup = library !== null ? buildDefaultSetup(library) : null;
    setState({
      ...state,
      setup,
      status: setup !== null ? "ready" : state.libraryStatus === "error" ? "error" : "loading",
      session: emptySession,
      history: [],
      saveFailed: false,
      migrationFailed: false,
    });
  }

  function runNewChallenge(): void {
    // The command layer must not compose while an Attempt is running or just Finished (AD-7):
    // the reducer already refuses the resulting challenge_committed, but skipping compose() here
    // also skips the wasted library/recent-ring work and an unused Random draw.
    if (state.session.state === "attempt" || state.session.state === "finished") return;
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

  /**
   * Finish rep (Story 5.5): reads the Clock/Random this once and moves the session to Finished,
   * then appends the Rep to history. Session first: a rev conflict (another tab finished or
   * discarded first) re-runs `finishRep` on the fresh session, and the Rep is appended only if the
   * persisted session really is Finished on this Rep -- so a lost race never orphans a Rep.
   */
  function runFinishRep(): void {
    const base = state.session;
    const nowMs = clock.now();
    const repId = random.uuid();
    const finishedAt = new Date(nowMs).toISOString(); // outside src/domain only -- see finishRep's doc comment
    const outcome = finishRep(base, nowMs, repId, finishedAt);
    if (outcome === null) return;

    const persistedSession = persist(
      "session",
      Session,
      sessionRev,
      outcome.session,
      (fresh) => finishRep(fresh ?? base, nowMs, repId, finishedAt)?.session ?? (fresh ?? base),
    );
    sessionRev = persistedSession.rev;

    const finishedHere = persistedSession.data.state === "finished" && persistedSession.data.lastRepId === repId;
    let history = state.history;
    let historySaved = true;
    if (finishedHere) {
      const persistedHistory = persist(
        "history",
        HistoryList,
        historyRev,
        appendRepIfAbsent(state.history, outcome.rep),
        (fresh) => appendRepIfAbsent(fresh ?? [], outcome.rep),
      );
      historyRev = persistedHistory.rev;
      history = persistedHistory.data;
      historySaved = persistedHistory.saved;
    }

    setState({ ...state, session: persistedSession.data, history, saveFailed: !persistedSession.saved || !historySaved });
  }

  /** Save rep (Story 5.6): upserts the reflection draft onto the Rep by `lastRepId` (idempotent, null when both fields are blank), then moves Finished -> Saved. */
  function runSaveRep(): void {
    const base = state.session;
    if (base.state !== "finished") return;
    const repId = base.lastRepId;
    const draft = base.reflectionDraft ?? { worked: "", change: "" };
    const trimmed: Reflection = { worked: draft.worked.trim(), change: draft.change.trim() };
    const reflection: Reflection | null = trimmed.worked === "" && trimmed.change === "" ? null : trimmed;

    let nextHistory = state.history;
    let historySaved = true;
    if (repId !== null) {
      // The Rep is missing when its finish-time history write failed: don't pretend it was saved.
      if (!state.history.some((r) => r.id === repId)) {
        setState({ ...state, saveFailed: true });
        return;
      }
      const apply = (history: Rep[]) => upsertReflection(history, repId, reflection);
      const persistedHistory = persist("history", HistoryList, historyRev, apply(state.history), (fresh) => apply(fresh ?? state.history));
      historyRev = persistedHistory.rev;
      nextHistory = persistedHistory.data;
      historySaved = persistedHistory.saved;
    }

    const quickReveal = state.setup?.quickReveal ?? false;
    const nextSession = sessionReducer(base, { type: "save_rep" }, { quickReveal });
    const persistedSession = persist("session", Session, sessionRev, nextSession, (fresh) =>
      sessionReducer(fresh ?? base, { type: "save_rep" }, { quickReveal }),
    );
    sessionRev = persistedSession.rev;

    setState({
      ...state,
      session: persistedSession.data,
      history: nextHistory,
      saveFailed: !persistedSession.saved || !historySaved,
    });
  }

  /** Retry (Story 5.7): copies the Rep's own Challenge snapshot under a new id, never composes. Outside Saved, or with a missing Rep, a no-op. */
  function runRetry(fromRepId: string): void {
    if (state.session.state !== "saved") return; // AD-7: Retry is offered from Saved only
    const fromRep = state.history.find((r) => r.id === fromRepId);
    if (fromRep === undefined) return;
    const challenge: Challenge = { ...fromRep.challenge, id: random.uuid(), origin: { kind: "retry", fromRepId } };
    applySessionEvent({ type: "challenge_committed", challenge, recentKey: null });
  }

  /**
   * Reroll (Story 4.3): composes with every locked kind held fixed, same
   * request shape as `runNewChallenge`, but `locks: session.locks` and
   * `origin: {kind:'reroll'}`. Gated on `canLockOrReroll` (AD-7: a no-op
   * before the reveal completes, and for a Retry/Variation) before
   * composing, so a premature press never spends a Random draw or touches
   * the recent ring. It first asks every unlocked kind to change
   * (`mustDiffer`), so a Reroll visibly rerolls whenever the library allows;
   * only if nothing satisfies that does it fall back to the Locks alone --
   * so only a genuine Lock conflict surfaces as `compose_failed`.
   */
  function runReroll(): void {
    const session = state.session;
    const held = session.challenge;
    if (!canLockOrReroll(session) || held === null) return;
    const setup = state.setup;
    if (setup === null || library === null) return; // isReadyToCompose() guarantees this in practice
    let mustDiffer: Locks = {};
    for (const kind of InputKind.options) {
      const id = held.inputs[kind]?.id;
      if (id !== undefined && session.locks[kind] === undefined) mustDiffer = { ...mustDiffer, [kind]: id };
    }
    const request: ComposeRequest = {
      level: setup.level,
      performTiming: setup.performTiming,
      enabledMediums: setup.enabledMediums,
      medium: setup.medium,
      skillFocus: setup.skillFocus,
      locks: session.locks,
      mustDiffer,
      origin: { kind: "reroll", fromRepId: null },
    };
    let result = compose(request, library, session.recent, clock, random);
    if (!result.ok) result = compose({ ...request, mustDiffer: {} }, library, session.recent, clock, random);
    const event: SessionEvent = result.ok
      ? {
          type: "challenge_committed",
          challenge: result.challenge,
          recentKey: recentKeyFor(result.challenge.templateId, result.challenge.inputs.topic?.id ?? null),
        }
      : { type: "compose_failed", reason: result.reason, blockingLock: result.blockingLock };
    applySessionEvent(event);
  }

  function dispatchSetup(event: SetupEvent): SetupReducerResult["notice"] {
    if (state.setup === null) return undefined; // nothing to apply to yet
    const base = state.setup;
    const result = setupReducer(base, event);
    if (result.setup === base) return result.notice; // no-op; the notice (e.g. `last_medium`) is for the UI to show
    const persisted = persist("setup", Setup, setupRev, result.setup, (fresh) => setupReducer(fresh ?? base, event).setup);
    setupRev = persisted.rev;
    setState({ ...state, setup: persisted.data, saveFailed: !persisted.saved });
    return result.notice;
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
