# Epic 3 Context: Get a Challenge

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

A visitor configures Level, Mediums, and Skill focus on the landing page, taps **Get a challenge**, and gets a valid, stable Challenge on its own Challenge Stage page. The Challenge survives reloads and navigation, setup persists across visits, and Quick reveal (landing every piece at once instead of one at a time) is available as the first presentation mode. This epic delivers the domain logic (setup rules, composition, session state machine, storage) and the one store that ties them together, ahead of the Reveal show animation work in Epic 4.

## Stories

- Story 3.1: Design tokens, fonts, and base action components
- Story 3.2: Setup and session schemas and the setup reducer
- Story 3.3: Compose a Challenge from setup, Locks, and the recent window
- Story 3.4: Session reducer for commits and reveal progress
- Story 3.5: Versioned browser storage with a memory fallback
- Story 3.6: The app store and the library loader
- Story 3.7: Difficulty Dial and Perform timing
- Story 3.8: Mediums, Skill focus, Quick reveal, and Get a challenge
- Story 3.9: The Challenge Stage page shell
- Story 3.10: Challenge composition and stepping through the Reveal
- Story 3.11: A stable Challenge across navigation and reload

## Requirements & Constraints

- Setup choices (Level, Mediums, Skill focus, Perform timing, Quick reveal, sound, Motion toggle) must never produce an impossible state: disabling the last enabled Medium is a no-op with a notice, and the generator never selects a disabled Medium.
- Every generated Challenge must fit the chosen Level, Skill focus, and enabled Mediums, and never combine mutually incompatible parts.
- The app avoids repeating the same Template+Topic combination within a rolling window of the last 30 committed Challenges, unless no alternative exists.
- Reveal progress is tracked step by step (one Input kind at a time, Brief last) and must agree across the Stage, setup, and a reload; nothing auto-advances.
- Setup, the active Challenge/Attempt, and Practice History persist in the current browser and survive a refresh; storage is versioned so a future schema change never wipes data; the app still works (in memory only) when storage is unavailable (private mode or blocked), and that is explained to the user rather than hidden.
- Pages must not flash incorrect content: nothing branches on stored values before the store reports ready, and server/first-client render holds no stored state.
- Two tabs open on the same browser must never show two different Challenges or create two different Attempts.

## Technical Decisions

- **Layering (AD-2):** `src/domain` is pure — no `window`, `localStorage`, `Date.now`, `Math.random`, `crypto`, and no framework imports; it may import only `@/config` and zod. Side effects go through ports (`Clock`, `Random`, `Repository`, `Library`) defined in `src/domain/ports.ts`. `src/adapters` is the only layer allowed to import `@/domain`, `@/config`, `@/generated` and touch browser globals; it has no ESLint global restriction. Everything under `src/` must use the `@/` alias, never parent-relative imports.
- **Config (AD-19):** `src/config/app.ts` is the one module for tunables — `generator.recentWindow` (30), `reveal.quickMaxMs` (1000), `reveal.order`, `setup.defaults`, `reflection.maxChars` (280), `storage.schemaVersions`, `signup.consentTextVersion`. Nothing else holds magic numbers.
- **Session state machine (AD-7):** one pure reducer `(state, event, now) → state` in `src/domain/session`, with exactly one held Challenge and at most one Attempt at a time. `src/store` is the one app store (three slices: setup, session, history), runs only domain reducers, persists each changed slice through the Repository after every transition, and exposes a command layer (`new_challenge`, `reroll`, `retry`, `vary`) separate from the events the reducer handles. Components dispatch commands/events only; they never call `compose()` directly or write storage. Any (state, event) pair outside the diagram is a no-op.
- **Challenge snapshot (AD-5):** once composed, a Challenge is immutable — it is never re-rendered from the library. Reveal order for a given Challenge always comes from `config.reveal.order` filtered to the kinds present, never recomputed from the snapshot's own field order.
- **compose() (AD-3):** one pure function `compose(request, library, recent, random)` in `src/domain/compose`, called only from the store's command layer, returning `{ok:true, challenge}` or `{ok:false, reason:'no_compatible', blockingLock}`. It never writes the recent ring or returns a partial Challenge.
- **Storage (AD-9, the focus of 3.5):** `src/adapters/storage` is the sole accessor of `localStorage`, using exactly the keys `impromptu:setup`, `impromptu:session`, `impromptu:history`. Each stored value is an envelope `{v, rev, data}`; `rev` increments on every write, and a write first checks the stored `rev` still matches the last one read (cross-tab race guard) — on mismatch the store re-reads and re-applies or drops the event. Reads run forward-only migrations `vN→vN+1` from `src/adapters/storage/migrations`; a version above the known one is left untouched and read-only; a throwing migration leaves the stored value untouched, runs that key from memory, and reports `migrationFailed`. Availability is probed once at startup (write, read, remove); on failure a memory adapter with the same `Repository` interface is used and `storageAvailable` is `false`. The adapter subscribes to the `storage` event so other tabs' writes are picked up. `Repository.clearAll()` removes every `impromptu:*` key. The UI always derives from the store, never a component-local copy.
- **No stored state before ready (AD-10):** the store reports `status: 'loading'|'ready'`; components render a neutral placeholder and never branch on stored values until `ready`; every store-reading component is a Client Component.
- **Recent window (AD-11):** the session slice keeps a ring of the last 30 `templateId+topicId` keys, pushed on `challenge_committed` (new, Reroll, Variation) in the same write as the commit; Retry never pushes.
- **Decor (AD-12), not this epic's concern to build but relevant to Stage composition:** `<Decor>` lives in `src/decor`, stays isolated from domain/store/adapters, and freezes once a Challenge is held — handled fully in Epic 4/8.

## UX & Interaction Patterns

- Reload or resume in any state restores the exact held Challenge, Locks, Attempt, and countdown; the whole Challenge is announced once via a polite live region.
- Two open tabs: last write wins; each tab listens for the `storage` event and re-renders to the latest held Challenge or Attempt so they never diverge.
- Storage unavailable: everything still works in memory; a reload loses the held Challenge; the first saved Rep (and the Practice History screen) explain that this browser isn't saving data instead of showing the usual "saved in this browser only" note.
- Schema migration: silent on success. If a migration fails, old data is left untouched and a banner reads "Some older reps couldn't be read. They're still stored." (`[ASSUMPTION]` in source material).
- Toggling the last enabled Medium is a no-op with an inline notice; disabling the Medium currently chosen under "This time" falls back to random.

## Cross-Story Dependencies

- Story 3.5 (storage) implements the `Repository` port defined by Story 1.2 and is a direct dependency of Story 3.6 (the app store persists every slice through it) and of all later Epic 3 stories that rely on persisted setup/session/history.
- Story 3.2 (Setup/Session/Attempt/Rep/Export zod schemas) has not been built as of Story 3.5. Story 3.5 must stay generic over the stored data — it persists opaque envelopes `{v, rev, data}` keyed by `StorageKey`, using the `Repository`/`Envelope`/`StorageKey` types already defined in `src/domain/ports.ts` and the version numbers in `config.storage.schemaVersions` — and must not introduce Setup/Session/History-shaped schemas itself.
- Story 3.6 depends on 3.5 for persistence and on 3.3/3.4 for `compose()` and the session reducer.
- Epic 4 (Reveal) and Epic 6 (Practice History) both depend on the Repository being correct and on `migrationFailed`/`storageAvailable` being exposed for their respective UX banners.
