---
title: 'Story 6.5: Clear all data with confirmation'
type: 'feature'
created: '2026-10-09'
status: 'in-progress'
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
- [ ] `src/store/types.ts`, `store.ts`, `store.test.ts` -- `clear_all_data`.
- [ ] `src/components/copy.ts` -- the strings above.
- [ ] `src/styles/tokens.css` -- scrim token + backdrop rule.
- [ ] `src/components/Dialog.tsx` + markup test.
- [ ] `src/components/practice/ClearAllData.tsx`.
- [ ] `src/components/practice/PracticeView.tsx`, `PracticeClient.tsx` -- `clearControl`, lifted status.
- [ ] `e2e/practice.spec.ts` -- the dialog and clear cases.

**Acceptance Criteria:**
- Given "Clear all data", then a modal opens with the title, focus on "Keep my data", a focus trap, and Esc cancelling back to the opener.
- Given confirmation, then setup/session/history are emptied, every `impromptu:*` key is removed, the Empty state shows, and "All data cleared." is announced; the held Challenge and Attempt are gone.
- Given lint, typecheck, unit, build, check:static and e2e, then all pass.

## Implementation Notes

## Spec Change Log

## Review Triage Log

## Verification

**Commands:**
- `npm run lint && npm run typecheck && npm test` -- expected: clean
- `npm run build && npm run check:static` -- expected: `/practice` static
- `E2E_PORT=3102 npm run test:e2e` -- expected: all specs pass
