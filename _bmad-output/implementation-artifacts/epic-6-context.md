# Epic 6 Context: Practice History and Practice Map

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

A user can see everything they've practiced — every Rep with its Brief and Reflection, newest first, and counts by Skill, Medium, and Level — without any quality judgment, streak, or score. They can export the full history as a JSON file and clear everything stored in this browser after confirming. This is the only place Practice History is surfaced; it depends on Reps already existing from the Challenge Stage (Epic 5).

## Stories

- Story 6.1: Practice page with empty and storage states
- Story 6.2: Practice History Rep cards
- Story 6.3: Practice Map
- Story 6.4: Export Practice History as JSON
- Story 6.5: Clear all data with confirmation

## Requirements & Constraints

- **Practice History:** Every Rep is viewable newest first, showing Brief, Skill, Medium, Level, date, Reflection, and whether it was timed (with time used). Retries and Variations are marked as such.
- **Practice Map:** Rep counts by Skill, Medium, and Level, described only as practice, never quality. No streaks, no "you missed a day" messaging, no penalties of any kind, no bars/rings/percentages/goals/day-gap figures.
- **Browser storage, with an explanation:** Practice History, setup, and the active Attempt persist in the current browser and survive a refresh. The Practice page states plainly "Your progress is saved in this browser only." Stored data is versioned so schema changes never wipe it.
- **Export and clear:** Export to JSON (a readable text/CSV option is an explicit stretch goal, not in scope). Clear-all requires confirmation.
- **Empty states:** With no Reps, the page shows one line and a Get a challenge action, never an empty table. If storage is unavailable (private mode or blocked), the app still generates Challenges and explains history will not be kept; Export and Clear are hidden in that state.
- **Responsive:** at 320px, Practice Map cells wrap two per row; the page stays a single column (same gutter as other breakpoints).
- **Banned patterns (apply here):** linked Reps beyond the `origin` marker, hashtags, analytics, accounts, streaks, badges, level-ups, "you missed" messaging, confirmation dialogs on Discard/Reroll, infinite scroll, hover-only affordances.

## Technical Decisions

- **Snapshot-only rendering:** A Challenge is an immutable snapshot (`id`, `createdAt`, `libraryVersion`, `templateId`, `level`, `timeLimitSec`, rendered `brief`/`guidance`, `inputs` keyed by kind with `{id, revealText}`, `origin:{kind, fromRepId}`). A Rep is `{id, challenge, finishedAt, timeUsedSec|null, reflection:{worked, change}|null}`. Practice History, Practice Map, and export all read Rep snapshot text only — never a library lookup — so retired library entries still display correctly. Skill/Medium display names come from the snapshot's `revealText`; kind labels (e.g. "Topic") come from `copy.ts`.
- **Practice Map derivation:** counts by Skill, Medium, Level are computed by a pure function in `src/domain/practice`, keyed off each Rep's snapshot `skill`/`medium`/`level`, with Retries and Variations counted as Reps. "Timed" is derived from `challenge.timeLimitSec`, not stored separately.
- **Storage:** only `src/adapters/storage` touches `localStorage`, via a versioned Repository (`impromptu:history` holds Reps; `impromptu:setup` and `impromptu:session` are the other two keys, both relevant to the Clear-all flow). Each value is an envelope `{v, rev, data}`; forward-only migrations run on read; a failed migration leaves data untouched and falls back to memory with the storage-unavailable UX. Availability is probed once at startup (write/read/remove); `storageAvailable=false` drives the FR-29 copy and hides Export/Clear. `Repository.clearAll()` removes every `impromptu:*` key.
- **Store/reducer:** the app store's `history` slice is driven by one pure reducer; components dispatch commands only. `clear_all_data` empties the `setup`, `session`, and `history` slices in one transition, resets setup to `config.setup.defaults`, calls `Repository.clearAll()`, and removes any held Challenge/Attempt. Practice History rows are read-only in v1 — no edit, delete-one, Retry, Variation, share, or link actions from this page.
- **Hydration:** the Practice page is a Client Component; until the store reports `ready`, it renders a neutral placeholder and never branches on stored values (avoids hydration mismatch between static HTML and per-browser state).
- **Export shape:** `{app:'impromptu', exportVersion, exportedAt, reps}`, validated against a zod `Export` schema before download as `impromptu-practice-YYYY-MM-DD.json`. No network request is made; success is announced inline ("Exported.") via `role="status"`.

## UX & Interaction Patterns

- **Layout:** night header band (brand mark, back-to-setup link, `h1` "Practice"); paper body is a single column, max 760px, with Export/Clear controls top-right of the history. Practice Map (three labelled count groups) sits above Practice History.
- **States:** Empty → "Nothing here yet." plus Get a challenge (Resume if an Attempt exists), Map hidden. With Reps → storage note at top, then Map, then History newest first. Storage unavailable → "This browser isn't saving data, so there's no history to show." plus Get a challenge; Export and Clear hidden. Cleared → returns to Empty with "All data cleared." announced via `role="status"`.
- **Rep card:** a cream card with a meta row (SKILL · MEDIUM · LEVEL · DATE, plus "TIMED 4:12" when timed), the Brief as the lede, both Reflection answers expanded under small question labels, and an outline RETRY/VARIATION pill when applicable. Read-only, no actions.
- **Practice Map cell:** a count in index-number type above a meta-type label; zero shows an em dash; each group (Skill, Medium, Level) is a labelled table for screen readers. Caption: "Counts show what you've practiced, not how good it was."
- **Clear-all dialog:** modal titled "Clear everything in this browser?" with a focus trap, initial focus on the "Keep my data" line button, an ink "Clear everything" button; Esc cancels and returns focus to the opener.
- **Responsive:** at ≤860px the page stays one column at the standard gutter; at 320px, Map cells wrap two per row.

## Cross-Story Dependencies

- Story 6.1 establishes the page shell and its loading/empty/storage-unavailable states that 6.2 and 6.3 render into.
- Story 6.2 (Rep cards) and 6.3 (Practice Map) both read the same Rep history and can be built in parallel once 6.1's shell exists.
- Story 6.4 (Export) and 6.5 (Clear) both depend on 6.1's top-right control slot and on Reps already existing; 6.5's confirmation clears state that 6.2/6.3 render, so it should land after those are stable to verify the Empty-state return.
- This epic depends on Epic 5 (Finish/Save rep) for Reps to exist in history, and on Epic 1/3 for the Repository, store, and Challenge-snapshot schema it reads.
