---
title: 'Story 6.5: Clear all data with confirmation'
type: 'feature'
created: '2026-10-09'
status: 'done'
baseline_commit: 'a064d9f'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-6-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Users on a shared or old machine need to leave nothing behind (FR-28).

**Approach:** A "Clear all data" line button beside Export opens a modal Dialog ("Clear everything in this browser?") with a focus trap, initial focus on the "Keep my data" line button, an ink "Clear everything" button, and Esc cancelling back to the opener. Confirming dispatches a new store command `clear_all_data` (AD-7/AD-9) that empties the setup, session and history slices, resets setup to the library default, calls `Repository.clearAll()` (every `impromptu:*` key), and drops the held Challenge and any Attempt; the page shows the Empty state and "All data cleared." is announced via `role="status"`.

## Boundaries & Constraints

**Always:**
- Store (agreed with the builder session, who owns `src/store`): add `{ type: "clear_all_data" }` to `StoreCommand`; `dispatch` handles it by calling `repository.clearAll()`, setting `session: emptySession`, `history: []`, `setup: buildDefaultSetup(state.library)` when the library is ready else `null` (the existing `onLibraryReady` path rebuilds it), resetting every slice rev to 0, persisting nothing else, dropping any queued `new_challenge`, and notifying listeners once. Do not change `pendingCommands` or `persist` beyond what this needs; if you must, record the exact diff in Implementation Notes. Tests: all three slices cleared and revs reset; `storage.length` has no `impromptu:*` key; a queued `new_challenge` is dropped; after a clear, a cross-tab reread of a missing key behaves as a first visit (existing null-reread rule); setup rebuilt when the library is ready and null otherwise.
- Dialog: `src/components/Dialog.tsx` over the native `<dialog>` element (`showModal()` gives the focus trap and Esc for free; handle `cancel`/`close` to return focus to the opener via a ref). Paper panel (`bg-paper`, `rounded-scrap`, `p-8`, `shadow-lift`), night scrim via `::backdrop` with the `--color-night` token at 0.72 alpha (add `--color-scrim: rgb(18 16 16 / 0.72)` to `tokens.css` and a `dialog::backdrop` rule there), title in `text-card-title` ink, body `text-body`, buttons: `LineButton` "Keep my data" (initial focus via `autoFocus`) and `InkButton ground="paper"` "Clear everything". Copy from `copy.button.keepMyData` / `copy.button.clearEverything` (exist) plus `copy.practice.clearAllTitle: "Clear everything in this browser?"`, `copy.practice.clearAllBody: "Practice history, your setup and any challenge in progress will be removed from this browser."`, `copy.button.clearAllData: "Clear all data"`, `copy.state.allDataCleared: "All data cleared."`.
- Placement: `PracticeView` gets a `clearControl: ReactNode` next to `exportControl` (both only when `repCount > 0 && storageAvailable`); `PracticeClient` passes `<ClearAllData />`, a client component holding the dialog state, dispatching the command on confirm, and announcing `copy.state.allDataCleared` in an always-mounted plain `<p role="status" className="text-body text-ink-soft">` (not `InlineStatus`: the vermilion-dot Inline message is reserved for conflicts and errors in DESIGN.md; follow the 6.4 `ExportButton` status pattern), which stays visible in the Empty state that follows (lift the status element above `PracticeView` in `PracticeClient` so it survives the state change).
- Tests: store tests as above; Dialog markup test (title, both buttons, `autofocus` on Keep my data); e2e in `e2e/practice.spec.ts`: seed a Rep and an attempt session, open the dialog, assert focus is on "Keep my data", press Escape → dialog closed and focus back on the opener; open again, confirm → "Nothing here yet." visible, "All data cleared." visible, `localStorage` has no `impromptu:*` key (`page.evaluate`), and `/stage` afterwards composes a fresh Challenge (no held one).

**Never:**
- No per-Rep delete, no undo. No new dependencies.

</frozen-after-approval>

## Code Map

- `src/store/store.ts` -- `createStore`, `dispatch` (handles `new_challenge`, queues until the library is ready), `hydrate`, slices with revs, `persist`; `src/store/defaults.ts` -- `emptySession`, `buildDefaultSetup`; `src/store/types.ts` -- `StoreCommand`; `src/store/store.test.ts` patterns (`createRepository({ storage: createMemoryRawStore() })`, `makeDeps`).
- `src/adapters/storage/index.ts` -- `clearAll()` removes every `impromptu:*` key and resets fallbacks.
- `src/components/practice/PracticeView.tsx`, `PracticeClient.tsx` (6.1–6.4) -- add `clearControl`; `src/components/LineButton.tsx`, `InkButton.tsx`, `setup/InlineStatus.tsx`.
- `src/styles/tokens.css` -- add the scrim token and `dialog::backdrop`.
- `e2e/practice.spec.ts` -- seeding helper, `attemptSession` fixture.

## Tasks & Acceptance

**Execution:**
- [x] `src/store/types.ts`, `store.ts`, `store.test.ts` -- `clear_all_data`.
- [x] `src/components/copy.ts` -- the strings above.
- [x] `src/styles/tokens.css` -- scrim token + backdrop rule.
- [x] `src/components/Dialog.tsx` + markup test.
- [x] `src/components/practice/ClearAllData.tsx`.
- [x] `src/components/practice/PracticeView.tsx`, `PracticeClient.tsx` -- `clearControl`, lifted status.
- [x] `e2e/practice.spec.ts` -- the dialog and clear cases.
- [x] Review patches: Dialog centring/width + `flex-wrap` button row; scroll lock; ref-based initial focus (no `autoFocus`); focusable lifted status line with `flushSync` re-announce; opener disabled while the library loads; unmount closes an open dialog.
- [x] Review patches: `clearAll()` failure -> `saveFailed` + `copy.state.clearFailed`; `persist()` null-reread guard against cross-tab resurrection; the triage's store tests and e2e cases (Keep my data, status focus, centring at 1280/320).

**Acceptance Criteria:**
- Given "Clear all data", then a modal opens with the title, focus on "Keep my data", a focus trap, and Esc cancelling back to the opener.
- Given confirmation, then setup/session/history are emptied, every `impromptu:*` key is removed, the Empty state shows, and "All data cleared." is announced; the held Challenge and Attempt are gone.
- Given lint, typecheck, unit, build, check:static and e2e, then all pass.

## Implementation Notes

- `store.ts`'s `canRun` gated every non-`new_challenge` command on `state.status === "ready"`; `clear_all_data` doesn't read or depend on setup/session validity at all, so it only needs `hydrate()` to have run. Diff: `canRun` now branches `new_challenge` -> `isReadyToCompose()`, `clear_all_data` -> the closure's `hydrated` flag, else `state.status === "ready"` (unchanged for finish/save/retry). `pendingCommands` is untouched (`persist()` changed in review -- see below); `runClearAllData()` reuses the existing `removePending` helper to drop a queued `new_challenge`.
- `runClearAllData()` resets `setupRev`/`sessionRev`/`historyRev` to 0 and rebuilds `setup` from `buildDefaultSetup(library)` in memory only when the library is already loaded (never persisted -- the next real write, or the existing first-visit `onLibraryReady` -> `ensureSetup` path when the library wasn't ready yet, is what actually writes it).
- Dialog focus-return to the opener is handled explicitly (`ClearAllData` captures the click's `currentTarget` on open and calls `.focus()` on it from `Dialog`'s native `close` event), not left to the browser's own restore-on-close behavior -- WebKit in this Playwright run didn't restore focus reliably on its own.
- The opener is captured via the click event's `currentTarget`; "Keep my data" takes a plain `ref` prop (React 19 passes it through `LineButton`'s spread).
- Review: Tailwind preflight zeroes `<dialog>`'s UA `margin: auto`, which pinned it top-left; `m-auto` restores centring and `w-[calc(100%-2*var(--spacing-gutter-phone))] max-w-reading-max` keeps a phone gutter at 320px and the reading width on desktop. `body:has(dialog[open])` locks page scroll behind the scrim.
- Review: `autoFocus` was a no-op inside a closed `<dialog>`; `ClearAllData` focuses "Keep my data" right after `showModal()`. On confirm it reads `saveFailed` after the dispatch to pick the message, nulls the opener ref (so `onClose` doesn't pull focus back), closes, and calls `onCleared(message)`; `PracticeClient` sets the message via `flushSync(null)` then the text and focuses its `tabIndex={-1}` status line.
- Review: `runClearAllData()` now checks `repository.clearAll().ok`; on failure it sets only `saveFailed: true` and leaves every slice and rev alone.
- Review: `persist()` diff -- on a `rev_conflict` whose reread is `null` while the write expected `currentRev > 0` (another tab cleared all data), it returns `{ data: currentData, rev: 0, saved: false }` instead of reapplying, so a pre-clear tab can't write its slice back. The existing "fresh === null conflict" setup test was updated to that behaviour (in memory, not written, `saveFailed`); the storage-event null-reread-as-first-visit rule is untouched.

## Spec Change Log

## Review Triage Log

- [patch] Dialog is pinned to the viewport's top-left and spans ~776px: Tailwind preflight zeroes `margin`, which removes the UA's `margin: auto` centring for `<dialog>`. Add `m-auto` and a width rule using existing tokens (full width minus the phone gutter at 320px, a reading-width max on desktop), and an e2e assertion that the open dialog's bounding box is horizontally centred in the viewport at 1280 and 320 widths. (design check in Chrome)
- [patch] Store test: `clear_all_data` runs synchronously once hydrated (seed history and session, dispatch, assert storage empty and slices cleared before any timer advance). (verification-gap)
- [patch] Store test: clear after a library failure with a persisted setup → `status === "error"`, `setup === null`. (verification-gap)
- [patch] e2e: clicking "Keep my data" hides the dialog, returns focus to the opener, keeps the data. (verification-gap)
- [patch] Store test: `migrationFailed` true before a clear → false after. (verification-gap)
- [accept] `aria-labelledby` id resolution (e2e covers it); `dialog::backdrop` rule unasserted (presentational). (verification-gap)
- [patch] Dialog width: `m-auto max-w-reading-max` (token exists) on top of the centring fix. (blind-hunter)
- [patch] Focus is dropped to `<body>` after "Clear everything" because the opener unmounts with the with-Reps branch: make the lifted status line focusable (`tabIndex={-1}`, ref), set the message with `flushSync`, then focus it; e2e asserts the status is focused after confirm. (blind-hunter)
- [patch] `repository.clearAll()`'s Result is discarded: on `ok: false` set `saveFailed: true`, change nothing else, and have `ClearAllData` announce a new `copy.state.clearFailed` ("Couldn't clear this browser's data.") instead of success (read `saveFailed` from the store after dispatch). Store test with a raw store whose `removeItem` throws. (blind-hunter)
- [patch] `autoFocus` is a no-op inside a closed `<dialog>` under React 19: drop it, focus "Keep my data" via a ref right after `showModal()` (React 19 passes `ref` as a prop through `LineButton`'s spread); delete the `autofocus` markup assertion; the e2e `toBeFocused` is the guard. (blind-hunter)
- [patch] Clearing before the library resolves flashes the loading placeholder and later re-persists `impromptu:setup`: disable the opener while `libraryStatus === "loading"`; store test that pins the behaviour of a clear followed by library resolution. (blind-hunter)
- [patch] Scroll lock behind the scrim: `body:has(dialog[open]) { overflow: hidden; }` next to the backdrop rule. (blind-hunter)
- [patch] "resets every slice rev" test asserts all three revs via a follow-up write landing at rev 1. (blind-hunter)
- [accept] `buildDefaultSetup` returning null leaves status loading: pre-existing `ensureSetup` behaviour, out of scope. (blind-hunter)
- [patch] Dialog button row at 320px overflows the panel: `flex flex-wrap justify-end gap-3`; the centring e2e at 320 also asserts the dialog's right edge is within the viewport. (edge-case)
- [patch] Cross-tab resurrection: `persist()`'s rev-conflict path re-applies the in-memory slice on top of a `null` reread, so a write in tab B after tab A cleared writes the pre-clear session/history back. Guard in `persist()`: when the reread is `null` and the caller's `currentRev > 0`, do not reapply; return `{ data: currentData, rev: 0, saved: false }` (callers already handle `saved: false`). Store test: two repository handles over one raw store, A dispatches `clear_all_data`, B dispatches a session/history write, storage still has no `impromptu:*` key. (edge-case)
- [patch] Second clear in one page lifetime does not re-announce: `flushSync(() => setClearedMessage(null))` before setting it, as `ExportButton` does. (edge-case)
- [patch] If the host branch unmounts while the dialog is open (cross-tab clear), the modal vanishes without a `close` event: close it explicitly in an unmount cleanup effect so `onClose` and focus restore still run. (edge-case)
- [accept] Fast double-click click-through after confirm; fresh default setup/session reappearing when another tab composes after a clear (a new visit, not resurrected data). (edge-case)

## Verification

**Commands:**
- `npm run lint && npm run typecheck && npm test` -- expected: clean
- `npm run build && npm run check:static` -- expected: `/practice` static
- `E2E_PORT=3102 npm run test:e2e` -- expected: all specs pass

**Results:**
- `npm run lint` -- clean, 0 problems.
- `npm run typecheck` -- clean, 0 errors.
- `npm test` -- 46 files, 839 tests passed.
- `npm run build` -- compiled successfully; route table lists `/practice` as `○ (Static)`.
- `npm run check:static` -- `check:static OK — prerendered: /, /practice, /privacy, /stage`.
- `E2E_PORT=3102 npm run test:e2e` -- 249 passed (chromium/webkit/firefox), including the review's Keep my data, status-focus and 1280/320 centring cases.
