---
title: 'The app store and the library loader'
type: 'feature'
created: '2026-10-09'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: '05e862d60e61ed71e113da1bff008eff4196fb09'
story_key: '3-6-the-app-store-and-the-library-loader'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-3-context.md'
  - '{project-root}/_bmad-output/planning-artifacts/architecture/architecture-impromptu-2026-10-08/ARCHITECTURE-SPINE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Nothing yet wires the pure domain pieces (setup reducer 3.2, `compose()` 3.3, session reducer 3.4, Repository 3.5) into one running client, and nothing loads the generated library at runtime. Without a single store, two components could hold different "current Challenge" state, and pages would flash default values before storage loads (AD-7, AD-10).

**Approach:** Build `src/store` as one `useSyncExternalStore`-backed store with `setup`/`session`/`history` slices, a command layer (`new_challenge` only) that calls `compose()` and dispatches `challenge_committed`/`compose_failed`, and generic setup/session event dispatch that persists through the Repository with the rev-conflict re-read/re-apply rule and cross-tab `storage` re-sync. Build a library loader adapter in `src/adapters/library` that validates an injected `() => Promise<unknown>` source into `ComposeLibrary` with zod, plus a prefetch-on-idle helper and a clearly-named (but not-yet-wired) production source function, since Story 1.7's `src/generated/library.json` isn't merged.

**Founder decision (keep building, conservative default; see Design Notes):** `enabledMediums:"all"` in `config.setup.defaults` can only be resolved into real Medium ids once the library has loaded. The store's `status` therefore becomes `'ready'` as soon as Repository hydration completes *if* a `Setup` was already persisted; on a brand-new visitor (nothing persisted), `status` stays `'loading'` until `libraryStatus` is also `'ready'`, so the store can build and persist the first-visit default. Returning visitors are unaffected.

## Boundaries & Constraints

**Always:**
- `src/store/**` imports only `@/domain`, `@/adapters`, `@/config`, `@/shared`, plus `react` (ESLint-allowed; the directory is explicitly the `useSyncExternalStore` layer).
- `src/adapters/library/**` imports only `@/domain`, `@/config`, `@/generated` (ESLint-allowed) — but this story never actually imports `@/generated/library.json` (Story 1.7 isn't merged); the production source is a separate, clearly-named function.
- Every slice mutation (setup event, session event, or command-driven session event) is persisted through `Repository.save` after the in-memory state updates; a `rev_conflict` re-reads the fresh envelope and re-applies the *same* event/reducer to it before retrying, rather than overwriting blindly.
- `createStore()` takes injectable `repository`, `clock`, `random`, and `librarySource` (all defaulting to the real adapters) so it is fully testable without `window`/`localStorage`.
- Components still never call `compose()` directly and never pass a Challenge in an event payload — only the store's `new_challenge` command does.
- Reuse `setupReducer`, `sessionReducer`, `compose`, `recentKeyFor`, `createRepository`, `cryptoRandom`, `systemClock` exactly as built in 3.2–3.5. Do not modify their files.

**Never:**
- Do not wire the store into any page/component (`src/app/**`, `src/components/**`) — that is Stories 3.7–3.11.
- Do not implement `reroll`, `retry`, `vary`, `toggle_lock`, `start`/`pause`/`resume`/`finish`, `save_rep`, `update_reflection_draft`, or `clear_all_data` — later stories. Only the `new_challenge` command exists this story.
- Do not import `src/generated/library.json`. Do not add a new runtime dependency.
- Do not persist `locks`/`mustDiffer` from a previous held Challenge into a `new_challenge` compose request — a brand-new Challenge locks nothing (see Design Notes).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| First client render | store just created | `getState().status === 'loading'`, `libraryStatus === 'loading'` | N/A |
| Hydrate, returning visitor | Repository has a valid persisted `Setup`/`Session`/`History` | `status` becomes `'ready'` synchronously in the hydrate effect; slices reflect stored data | N/A |
| Hydrate, corrupted persisted value | stored `setup` envelope's `data` fails `Setup.safeParse` | treated as absent (conservative, matches 3.5's own corrupted-bytes precedent) | N/A |
| Hydrate, brand-new visitor | no persisted `Setup` | `status` stays `'loading'`; once `libraryStatus` becomes `'ready'`, a default `Setup` is built from `config.setup.defaults` (`enabledMediums` = every library Medium id) and persisted at rev 1, then `status` becomes `'ready'` | N/A |
| Library load succeeds | injected source resolves to valid library JSON | `libraryStatus` becomes `'ready'`; any queued `new_challenge` commands run in order | N/A |
| Library load fails | source rejects, or resolves to data `LibraryFile` rejects | `libraryStatus` stays `'loading'` forever (no retry this story); queued commands stay queued | N/A |
| `new_challenge`, not ready | dispatched before `status`/`libraryStatus` are both `'ready'` | queued; replayed once both are ready | N/A |
| `new_challenge`, compose succeeds | ready store, compatible combination exists | `sessionReducer` receives `challenge_committed {challenge, recentKey}`; session persisted | N/A |
| `new_challenge`, compose fails | ready store, no compatible combination | `sessionReducer` receives `compose_failed {reason, blockingLock}`; session persisted | N/A |
| Setup/session event, rev conflict | another write landed between read and save | fresh envelope re-read, the same event re-applied to it, then retried | N/A |
| Cross-tab storage event | another tab writes `impromptu:session` | this store re-reads that key via `Repository.load`, re-validates with zod, updates its slice, notifies subscribers | N/A |

</frozen-after-approval>

## Code Map

- `src/domain/ports.ts` -- `Repository`, `Clock`, `Random`, `Envelope`, `StorageKey`, `SaveResult`. Do not modify.
- `src/domain/session/schema.ts` -- `Setup`, `Session`, `Rep`, `RevealedKind`. Reuse for runtime zod re-validation of whatever the Repository returns (the Repository itself does not validate shapes).
- `src/domain/session/setup-reducer.ts` -- `setupReducer(setup, event): {setup, notice?}`. Reuse as-is; the store discards `notice` for now (no UI consumes it yet — flagged in deferred-work.md-worthy note, but trivial enough to just note in Implementation Notes).
- `src/domain/session/session-reducer.ts` -- `sessionReducer(session, event, setup): Session`. Reuse as-is.
- `src/domain/compose/compose.ts` -- `compose(request, library, recent, clock, random)`, `ComposeLibrary`, `ComposeRequest`, `ComposeResult`, `recentKeyFor`. Reuse exactly; `ComposeLibrary`'s fields are what the library loader must produce.
- `src/domain/library/schema.ts` -- `Skill`, `Medium`, `Template`, `Topic`, `Style`, `Constraint` zod schemas. Reuse directly to build the library-file zod schema (no redeclaration).
- `src/adapters/storage/index.ts` -- `createRepository(options)`. Reuse; `Repository.load` and `.save` are synchronous and do no shape validation — the store must zod-validate `envelope.data` itself.
- `src/adapters/clock.ts`, `src/adapters/random.ts` -- `systemClock`, `cryptoRandom`. Reuse as the store's production `Clock`/`Random`.
- `src/config/app.ts` -- `config.setup.defaults`, `config.storage.schemaVersions`. Reuse; do not modify.
- `eslint.config.mjs` -- confirms `src/store` may import `@/domain`, `@/adapters`, `@/config`, `@/shared`, and that only the `src/domain` layer block bans `react`; `src/store` has no such ban (the architecture diagram's directory comment: "store/ # session store (useSyncExternalStore)").
- No existing `src/store/*` files beyond `.gitkeep`, and no `src/adapters/library/*` — this story creates both directories.

## Tasks & Acceptance

**Execution:**
- [x] `src/adapters/library/schema.ts` -- `LibraryFile` zod schema (`libraryVersion` + the six library arrays, reusing `src/domain/library/schema.ts` types) whose `z.infer` type structurally satisfies `ComposeLibrary`
- [x] `src/adapters/library/index.ts` -- `loadLibrary(source)` (validates via `LibraryFile.safeParse`, returns `{ok:true,library}|{ok:false,reason}`), `prefetchOnIdle(run)` (schedules via `requestIdleCallback`, falling back to `setTimeout`, swallowing errors), and `loadGeneratedLibrarySource()` -- a clearly-named stub the Story 1.7 follow-up points at `src/generated/library.json`
- [x] `src/adapters/library/index.test.ts` -- covers a valid source, an invalid shape, and a rejecting source
- [x] `src/store/defaults.ts` -- `emptySession: Session` (library-independent) and `buildDefaultSetup(library): Setup`
- [x] `src/store/types.ts` -- `StoreState`, `StoreCommand` (`{type:'new_challenge'}` only), `Store` interface
- [x] `src/store/store.ts` -- `createStore(options)`: hydrate, `dispatchSetup`, `dispatchSession`, `dispatch` (commands), persistence with rev-conflict retry, cross-tab resubscription, library loading + idle prefetch + command queueing
- [x] `src/store/index.ts` -- the production singleton (`createStore()` with real `createRepository()`, `systemClock`, `cryptoRandom`, `loadGeneratedLibrarySource`) and the `useAppStore()` React hook (`"use client"`)
- [x] `src/store/store.test.ts` -- unit tests over every I/O & Edge-Case Matrix row using injected fakes (fake Repository, fake Clock/Random, fake library source) -- no `jsdom`, no real `localStorage`

**Acceptance Criteria:**
- Given AD-7, when `src/store` is implemented, then it holds one store with `setup`/`session`/`history` slices, runs only domain reducers, persists each changed slice through the Repository after every transition, and exposes a command layer separate from events, starting with `new_challenge`; `new_challenge` calls `compose()` with the current setup, `recent` ring, and production `Random`/`Clock`, then dispatches `challenge_committed` or `compose_failed`
- Given AD-10, when a page first renders, then the store reports `status:'loading'` and switches to `'ready'` only after the hydrate effect runs
- Given the library loader adapter, when setup is idle, then the injected source is prefetched, `libraryStatus` moves from `'loading'` to `'ready'`, and compose commands issued earlier are then run
- Given a `storage` event from another tab, when it arrives, then the store re-reads and re-renders

## Implementation Notes

- Implemented directly (no subagent dispatch, per build-session override).
- Built `src/adapters/library/schema.ts` (`LibraryFile` zod schema, reusing `Skill`/`Medium`/`Template`/`Topic`/`Style`/`Constraint` from `src/domain/library/schema.ts` so its `z.infer` structurally satisfies `ComposeLibrary` with no cast) and `src/adapters/library/index.ts` (`loadLibrary(source)`, `loadGeneratedLibrarySource()` stub, `prefetchOnIdle(run)`), plus `index.test.ts` (5 tests: valid source, invalid shape, rejecting source, the stub's rejection message, and the `setTimeout`-fallback idle scheduling).
- Built `src/store/defaults.ts` (`emptySession`, `buildDefaultSetup`), `src/store/types.ts` (`StoreState`, `StoreCommand`, `StoreDeps`, `Store`), `src/store/store.ts` (`createStore(deps)`), `src/store/index.ts` (production singleton + `useAppStore()` hook), and `src/store/store.test.ts` (12 tests covering every I/O & Edge-Case Matrix row with injected fakes: a real `createRepository({storage: createMemoryRawStore()})` per test rather than a bespoke fake Repository, `fakeClock`/`seededRandom` from `src/domain/test-doubles.ts`, and a small local `tpl()`/`skill()`/`medium()`/`topic()` fixture-builder set matching `compose.test.ts`'s established style).
- `npm run lint`, `npm run typecheck`, `npm test` (384/384, 26 files), `npm run build`, and `npm run check:static` all pass.
- One fixture bug caught by `npm test` during development: the library loader's own test fixture used a `topicTags`/`tags` value of `"tag.object"`, which fails `TagId`'s lowercase-kebab-slug pattern (no dots allowed, per `src/domain/library/schema.ts`'s `SLUG` regex). Fixed the fixture (not the schema) to `"object"`.
- `createStore()`'s dependencies (`repository`, `clock`, `random`, `librarySource`) are all required, non-optional parameters — `src/store/index.ts` is the only place that supplies the real `createRepository()`, `systemClock`, `cryptoRandom`, and `loadGeneratedLibrarySource`, keeping `store.ts` itself fully injectable for tests with no `window`/`localStorage`.
- `setupReducer`'s `notice: 'last_medium'` return value is intentionally dropped by `dispatchSetup` for now — no UI in this story consumes it (Story 3.8 will dispatch `toggle_medium` from a real control and will need to read it then). Noted here rather than in deferred-work.md since it's a one-line change to `dispatchSetup`'s return type when that story needs it, not a tracked gap.
- History slice persistence (write path) is intentionally not implemented — this story has no event that mutates `history` (`clear_all_data` and `save_rep` are AD-7 events owned by later stories). `hydrate()`/cross-tab `rereadHistory()` still read it, so the slice is already wired for whichever later story adds its first write.
- After merging main (Story 1.7), `loadGeneratedLibrarySource()` is wired to `import("@/generated/library.json")` (no longer a stub); `src/types/generated-library.d.ts` declares that gitignored module as `unknown` so typecheck runs before the build generates it, and `scripts/library/library-contract.test.ts` pins the build payload against the loader's `LibraryFile` schema. `anchors` were removed from the build payload (they failed the strict schema).
- Review patches (triage rows 1-10): `persist` validates `fresh.data` with the slice schema, re-applies to the pre-event base when nothing valid is stored, and after `MAX_SAVE_ATTEMPTS` holds what is stored; `Status` gained `'error'` (library load/validation failure, or no usable Medium on a first visit) and pending commands are dropped then; at most one pending command per type; a cross-tab Setup promotes `status` to `'ready'` and drains, while a null re-read is treated as a first visit; `StoreState.saveFailed` flags non-conflict save failures; `buildDefaultSetup` drops Mediums no non-retired Template uses (Mediums have no `retired` field), falls back unknown `medium`/`skillFocus` to `"random"`, and validates with `Setup`; `LibraryFile` requires at least one skill/medium/template; `prefetchOnIdle` passes `{ timeout: 2000 }`; the production store is created lazily via `getAppStore()` with `initialState` as the server snapshot. This supersedes the frozen matrix's "Library load fails -> stays `'loading'` forever" row.

## Deferred-Work Follow-Up

Added to `_bmad-output/implementation-artifacts/deferred-work.md`: once Story 1.7 merges `src/generated/library.json`, change `loadGeneratedLibrarySource()`'s body in `src/adapters/library/index.ts` to `import("@/generated/library.json").then((m) => m.default)`.

## Design Notes

- **`new_challenge` always composes with empty `locks`/`mustDiffer`:** AD-3 describes `locks`/`mustDiffer` as Reroll/Variation concepts applied to a *currently held* Challenge's inputs. A plain `new_challenge` has no held Challenge to lock parts of, so it always composes against `{}`/`{}` — `session.locks` is left untouched by this command (it's reset by later stories' `toggle_lock`/Finished-exit flows, out of scope here).
- **Why `status` can wait on `libraryStatus`:** `Setup.enabledMediums` requires at least one real Medium id (`z.array(MediumId).min(1)`), and the only source for Medium ids is the library. A returning visitor's persisted `Setup` already has concrete ids baked in from a previous resolution, so the common case never waits on the library. Only the very first visit (no persisted `Setup`) needs it, which is also the only time `config.setup.defaults.enabledMediums === "all"` must be resolved — exactly the gap `setup-fixture.ts` flagged as "a store/library-loader concern, Story 3.6".
- **Rev-conflict retry is generic, not per-slice:** one `persist(key, version, rev, data, reapply)` helper (loop bounded at 10 retries) is shared by `dispatchSetup`, `dispatchSession`, and the command layer. `reapply(freshData)` is always "re-run the same reducer with the same event against `freshData`", never "take my already-computed `data` and force it in" — that is what keeps two tabs from losing each other's writes.
- **The store, not a UI idle callback, owns the library prefetch trigger:** since no Setup UI exists yet (Story 3.8), `createStore()` itself calls `prefetchOnIdle(() => loadLibrary(librarySource))` once on construction. `prefetchOnIdle` stays a small, separately-exported helper so a future Setup-page effect can also call it (idempotent: `loadLibrary` is only ever in flight once per store instance).

- Orchestrator correction after `07e898e`: Mediums are base data and never retired (AD-6), so `buildDefaultSetup` enables every library Medium (FR-2, AD-19); the "unused Medium = retired" heuristic was removed.

## Review Triage Log

| # | Layer | Finding | Verdict | Evidence | Route |
|---|---|---|---|---|---|
| 0 | orchestrator | Build payload's `anchors` field fails the strict `LibraryFile` schema | high | Contract test against the real build payload returned `{ok:false, reason:'invalid'}`: production would never load a library. Fixed in `b5b26b0` (anchors dropped from payload; contract test added) | patch (applied) |
| 1 | blind, edge | `persist` double-applies when `fresh` is null; unvalidated `fresh.data`; stale data after retries | medium | `reapply(fresh ? fresh.data : currentData)` re-runs on already-transformed data | patch |
| 2 | blind, edge | Library load failure leaves status `loading` forever; errors swallowed | medium | `Status` has no error state; test pins "loading forever" | patch |
| 3 | blind, edge | Duplicate `new_challenge` commands queue and each commit | low | `pendingCommands` unbounded, no de-dupe | patch |
| 4 | edge | Cross-tab Setup during loading never promotes status; null re-read inconsistent | medium | `rereadSetup` keeps stale Setup while resetting rev | patch |
| 5 | blind | Non-conflict save failures are silent | low | `write_failed` returns early with no state signal | patch |
| 6 | blind, edge | `buildDefaultSetup` enables retired Mediums, unchecked defaults, empty-medium Setup | low | Invalid Setup persisted then rejected on reload | patch |
| 7 | edge | Empty skills/mediums/templates pass `LibraryFile` | low | Unusable library reports ready | patch |
| 8 | blind | `requestIdleCallback` without timeout; misleading comment | low | Busy thread can delay first load indefinitely | patch |
| 9 | blind | Store/Repository created at module scope during SSR | low | `"use client"` modules still evaluate on the server | patch |
| 10 | verif-gap, blind | Cross-tab Setup, concurrent first-visit, fresh-null, queue, idle-callback branch untested; fake timers leak | low | Pre-verified: deleting the setup subscription passes all tests | patch |
| 11 | verif-gap | Production `loadGeneratedLibrarySource` import never executed in tests | medium | CI tests run before the build generates the file; needs the first UI story's e2e | defer |
| 12 | edge | Cross-tab read-modify-write not atomic | low | AD-9 rev check is the specified mitigation | reject |

## Verification

**Commands:**
- `npm run lint` -- expected: no errors, including the `src/store`/`src/adapters` import-boundary rules
- `npm run typecheck` -- expected: no errors
- `npm test` -- expected: all existing and new Vitest suites pass
- `npm run build` -- expected: production build succeeds
- `npm run check:static` -- expected: all routes still statically prerendered (this story touches no page/route)
