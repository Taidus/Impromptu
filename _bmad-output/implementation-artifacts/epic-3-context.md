# Epic 3 Context: Get a Challenge

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

A visitor configures Level, Mediums, and Skill focus on the landing page, taps "Get a challenge," and gets a valid, stable Challenge on its own Challenge Stage page. The Challenge survives reloads and navigation, and setup persists in the browser. This epic lands every piece instantly (no theatrical motion — that's Epic 4). It builds the pure domain core (library compatibility already exists from Epic 1) up through composition, session state, storage, the app store, and the setup/Stage UI.

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

- A visitor sets Level via a Difficulty Dial (four stops, all selectable, keyboard-reachable, announced to screen readers); Perform adds a Timed/Untimed/Either choice, default Either.
- The visitor enables one or more Mediums and can pick one or leave it random ("This time"). The generator never produces a Challenge in a disabled Medium. At least one Medium must always stay enabled — the control blocks disabling the last one and explains why. Default on first visit: all Mediums enabled, Medium randomized.
- Skill focus is optional (pick one of six Skills, or random), with an info control explaining each Skill.
- Setup (Level, Perform timing, Mediums, Skill focus, Quick reveal, sound/mute) persists across reloads in the same browser. No account is ever required.
- Every generated Challenge must fit the chosen Level, Skill focus, and an enabled Medium, and never contradict itself (library compatibility rules from Epic 1).
- A held Challenge is a stable, immutable snapshot: it never re-renders or changes when setup or the library changes later: only a new `compose()` call produces a new Challenge.
- The Reveal lands one Input at a time at the user's pace (no auto-advance); Quick reveal lands everything at once as a setup preference.
- No no-penalty-violating UI: no error/failure language, no streak or score copy.

## Technical Decisions

- **Functional core / imperative shell.** `src/domain` is pure TypeScript: no React, no Next.js, no `window`/`localStorage`/`Date.now()`/`Math.random()`/`crypto`. Time comes from the `Clock` port, randomness/ids from the `Random` port (both in `src/domain/ports.ts`, already defined). `src/domain` imports only `@/config` and `zod`; an ESLint rule enforces this.
- **Persisted shapes are zod schemas** in `src/domain/session/schema.ts` (`Setup`, `Challenge`, `Attempt`, `Rep`, `Session`, `Export`); every TypeScript type comes from `z.infer`, never a hand-written parallel interface. This mirrors the existing pattern in `src/domain/library/schema.ts` (strict objects, id patterns via regex, `z.infer` types).
- **Challenge** (AD-5) is an immutable snapshot: `id` (uuid), `createdAt` (ISO 8601), `libraryVersion`, `templateId`, `level`, `timeLimitSec|null`, rendered `brief`, `guidance|null`, `inputs` (a record keyed by Input kind — `skill`, `medium`, `topic`, `style`, `constraint` — each `{id, revealText}`; kinds the Template omits are absent), and `origin: {kind:'new'|'reroll'|'retry'|'variation', fromRepId|null}`.
- **Rep** (AD-5): `{id, challenge, finishedAt (ISO), timeUsedSec|null, reflection: {worked, change}|null}`. Reflection fields may be empty strings (never required, never penalized). **Export**: `{app:'impromptu', exportVersion, exportedAt, reps}`.
- **Attempt** (AD-8): timers are derived from wall-clock timestamps, never a ticking stored counter. `{startedAt (epoch ms), pausedAt|null, pausedTotalMs, timeLimitSec|null}`. Elapsed/remaining/timeUp are always computed, never stored.
- **One session state machine** (AD-7), implemented as a pure reducer `(state, event, now) → state` in `src/domain/session`, owns at most one held Challenge and at most one Attempt. States: `None → Held → Attempt → Finished → Saved`, looping back to `Held`. Setup events (`set_level`, `set_perform_timing`, `toggle_medium`, `choose_medium`, `set_skill_focus`, `set_quick_reveal`, `set_sound`) are handled by a **setup reducer** that is a pure domain rule module — this is Story 3.2's deliverable. The guard against disabling the last enabled Medium (FR-2) lives there, and so does the "This time" Medium falling back to random when its Medium is disabled.
- **`compose()`** (AD-3, Story 3.3) is the single function behind New Challenge, Reroll, and Variation; it reads `isCompatible()` (already built in Epic 1, `src/domain/library/compat.ts`) and `render()` (`src/domain/library/render.ts`). It returns `{ok:true, challenge}` or `{ok:false, reason:'no_compatible', blockingLock}`, and never a partial Challenge.
- **Recent-repeat window** (AD-11): the session slice keeps a ring of the last `config.generator.recentWindow` (30) `templateId+topicId` keys, pushed on every committed Challenge (not Retry). `compose()` excludes ring keys whenever an alternative exists.
- **Repository** (AD-9, Story 3.5) is the sole `localStorage` accessor, three keys (`impromptu:setup`, `impromptu:session`, `impromptu:history`), each an envelope `{v, rev, data}` with forward-only migrations and a memory fallback. The `Repository.load/save` port signature is generic over `T` today (`src/domain/ports.ts`); Story 3.5 (on another branch) is extending it. Its deferred item "make `Repository.load/save` key-typed" can bind `load`/`save` to the exact `Setup`/`Session`/`Export`-history schemas this story defines, once that extension lands — do not implement that binding here.
- **One config module** (`src/config/app.ts`, already built): `generator.recentWindow`, `reveal.order` (skill, medium, topic, style, constraint, then brief), `setup.defaults`, `reflection.maxChars` (280), `storage.schemaVersions`. Domain and store code read these; nothing hard-codes the numbers.
- **One app store** (Story 3.6) using `useSyncExternalStore`, holding `setup`/`session`/`history` slices, running only domain reducers, persisting through the Repository after every transition. Components dispatch commands/events only; they never call `compose()` or write state directly.
- Store hydration: no stored state in the first client render (AD-10). Components render a neutral placeholder until the store reports `status:'ready'`.

## UX & Interaction Patterns

- **Difficulty Dial**: one ARIA slider, four stops, arrow keys step, Home/End jump, click-to-set; value text joins the Level name and its one-liner. Perform shows the Timed/Untimed/Either control beside it.
- **Chip toggle** (Enabled Mediums): toggle buttons (`aria-pressed`). Disabling the last enabled Medium is blocked — the chip stays on and an inline message says "Keep at least one medium on." If the Medium chosen under "This time" is turned off, "This time" falls back to Random.
- **Select field** ("This time" Medium, Skill focus): native `<select>`. "This time" lists Random plus each enabled Medium; Skill lists Random plus the six Skills.
- First visit defaults: Level Explore, all Mediums on, "This time" Random, Skill Random, Quick reveal off, Perform timing Either, sound off. Returning visitors get every setup choice restored.

## Cross-Story Dependencies

- Story 3.2 (this story) defines the schemas Stories 3.3–3.6 build on (`compose()`'s `Challenge` return shape, the session reducer's state shape, the Repository's persisted envelopes) and the setup reducer that Story 3.6's store calls directly for setup events.
- Story 3.2 depends on Epic 1's library schema (`src/domain/library/schema.ts`) for id types and on `src/config/app.ts` for tunables; both already exist and are not modified by this story.
- Story 3.5 (storage) is being extended on a separate branch to make `Repository.load/save` key-typed against the schemas Story 3.2 defines; that binding is explicitly out of scope here.
