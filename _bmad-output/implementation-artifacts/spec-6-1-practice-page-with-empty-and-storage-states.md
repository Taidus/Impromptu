---
title: 'Story 6.1: Practice page with empty and storage states'
type: 'feature'
created: '2026-10-09'
status: 'done'
baseline_commit: '96ea92c'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-6-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `/practice` is a placeholder. Users need a page that says plainly where their progress lives and what to do when there is nothing yet, without an empty table or a guilt message (FR-27, FR-29).

**Approach:** Make `/practice` a Client Component page over the 3.6 store (`useAppStore()`): a night header band (brand mark linking to `/`, back-to-setup link, `h1` "Practice"), a paper body in a single reading column, and three states driven by store data: loading (neutral placeholder, AD-10), empty (no Reps: "Nothing here yet." plus a Get a challenge link that reads Resume while an Attempt exists; the Practice Map is hidden), with Reps (the storage note "Your progress is saved in this browser only." at the top; the Rep list itself is Story 6.2), and storage unavailable ("This browser isn't saving data, so there's no history to show." plus Get a challenge; Export and Clear hidden). The page keeps the night `SiteFooter` from 8.1 below the body. Rendering logic lives in a pure presentational `PracticeView` so it is unit-testable without the store.

## Boundaries & Constraints

**Always:**
- `src/app/practice/page.tsx` stays statically prerendered (`check:static`); the Client Component renders the loading placeholder on the server snapshot and the real state after hydration. Keep the `h1` text "Practice" (`e2e/routes.spec.ts`).
- Store surface: `useAppStore()` from `@/store` (`status`, `session.state`, `history`). `storageAvailable` is not in `StoreState` yet: add `storageAvailable: boolean` (default `true`, set from `deps.repository.storageAvailable` during `hydrate()`) and `migrationFailed: boolean` (default `false`, set to `repository.migrationFailed(key)` OR-ed over `setup`, `session`, `history` after their loads in `hydrate()`) to `StoreState` (`src/store/types.ts`, `src/store/store.ts`), with store tests for each. The builder session's Story 3.11 reads both for the Setup banners. Nothing else in the store changes.
- "Attempt exists" means `session.state === "attempt"`; then the action reads `copy.button.resume` and still links to `/stage`.
- Night header band: inset by `--spacing-header-inset`; brand mark "impromptu" in the `stage-mark` role (add `text-stage-mark` utility) as a link to `/`; back link `copy.stage.back` in `text-meta` cream; `h1` "Practice" in `display-phone` / `desktop:display-setup` cream. Paper body: `max-w-reading-max`, `px-gutter-phone desktop:px-14`, text ink.
- Copy: reuse `copy.state.nothingHereYet`, `copy.state.progressSavedInBrowserOnly`, `copy.button.getAChallenge`, `copy.button.resume`, `copy.stage.back`; add `copy.practice.title: "Practice"`, `copy.practice.storageUnavailable: "This browser isn't saving data, so there's no history to show."`, `copy.practice.loading: "Loading your practice…"` (visually quiet, `aria-busy`).
- The Get a challenge action is a link styled with `inkButtonClassName("paper")` (the ink pill on paper), `href="/stage"`.
- No Rep cards, no Practice Map, no Export, no Clear (6.2–6.5). No library reads. Tokens only; `ground.ts` focus helpers; no raw px/hex in `src/components`.

**Never:**
- Do not change `src/store` beyond the `storageAvailable` and `migrationFailed` additions. Do not touch `src/components/setup/`, `src/components/stage/`, or ESLint/CI config. No new dependencies.

</frozen-after-approval>

## Code Map

- `src/app/practice/page.tsx` -- placeholder; becomes `"use client"` page composing `PracticeHeader`, `PracticeView` (fed from `useAppStore()`), and `SiteFooter`. Metadata cannot be exported from a Client Component: keep `page.tsx` a thin Server Component that exports `metadata: { title: "Practice" }` and renders a `"use client"` `PracticeClient` component.
- `src/store/index.ts` -- `useAppStore()` (server snapshot = `initialState`, `status: "loading"`); `src/store/types.ts` `StoreState`; `src/store/store.ts` `createStore`, `initialState`, `hydrate()`; `src/store/store.test.ts` patterns (fake repository via `createRepository({ storage: createMemoryRawStore() })` or a stub).
- `src/adapters/storage/index.ts` -- `createRepository()` returns `storageAvailable`.
- `src/domain/session/schema.ts` -- `SessionState` enum (`none|held|attempt|finished|saved`), `Rep`.
- `src/components/journey/SiteFooter.tsx` -- footer to reuse; `src/components/InkButton.tsx` `inkButtonClassName`; `src/components/ground.ts`; `src/components/copy.ts`.
- `src/styles/tokens.css` -- `--typography-stage-mark-*` vars exist; utilities `text-display-phone`, `text-display-setup`, `text-meta`, `text-body`, `text-lede` exist; add `text-stage-mark`.
- `e2e/routes.spec.ts`, `e2e/privacy.spec.ts`, `e2e/journey.spec.ts` -- patterns; Playwright on port 3100, three browsers.

## Tasks & Acceptance

**Execution:**
- [x] `src/store/types.ts`, `src/store/store.ts`, `src/store/store.test.ts` -- `storageAvailable` and `migrationFailed` in state, set on hydrate; tests: `storageAvailable` true with a probing memory store and false when the repository reports unavailable; `migrationFailed` false normally and true when a stubbed repository reports a failed migration for one key.
- [x] `src/styles/tokens.css` -- `text-stage-mark` utility.
- [x] `src/components/copy.ts` -- `copy.practice.*`.
- [x] `src/components/practice/PracticeHeader.tsx` -- night band.
- [x] `src/components/practice/PracticeView.tsx` -- pure: `({ status, storageAvailable, repCount, attemptActive })` → loading / unavailable / empty / with-reps markup.
- [x] `src/components/practice/PracticeClient.tsx` -- `"use client"`; reads the store and renders header + view + footer.
- [x] `src/app/practice/page.tsx` -- metadata + `<PracticeClient />`.
- [x] `src/components/practice/practice.test.ts` -- `renderToStaticMarkup` of `PracticeView` for all four states: loading shows the quiet placeholder and no action; empty shows "Nothing here yet." and the Get a challenge link to `/stage`; empty + attempt shows Resume; with reps shows the storage note and no "Nothing here yet."; unavailable shows the unavailable copy, the action, and no storage note.
- [x] `e2e/practice.spec.ts` -- fresh browser on `/practice`: `h1` "Practice", "Nothing here yet.", the action link to `/stage`, the back link to `/`, the footer's Practice link; at 320px no horizontal scroll.

**Acceptance Criteria:**
- Given `/practice`, then a night header band holds the brand mark, a back-to-setup link, and the `h1`, and the paper body is one column at most 760px wide; the server render shows the loading placeholder.
- Given no Reps after hydration, then "Nothing here yet." and Get a challenge (Resume during an Attempt) appear and no map or list is rendered.
- Given at least one Rep, then "Your progress is saved in this browser only." appears at the top of the body.
- Given `storageAvailable === false`, then the unavailable copy and Get a challenge appear, and nothing about export or clear is rendered.
- Given lint, typecheck, unit tests, build, check:static, and e2e, then all pass and `/practice` is static.

## Implementation Notes

- Implemented by a Sonnet agent; review fixes by an Opus agent. Verification after patches: lint, typecheck, 465 unit tests, build (static), check:static, 42 e2e (14 × 3 browsers) all pass. Checked in Chrome at 1280×800.

- The storage note renders in both the body (FR-27) and the shared footer, so page-level locators must scope to `main`.
- `status === "error"` renders like `ready`: history is already loaded, and the Stage handles compose failures.
- `PracticeHeader` is simplified: DESIGN's Stage mark (14px grape star beside the wordmark) and the mark-left/links-right layout are deferred to the Epic 8 furniture stories.
- The first-visit loading wait (status waits on the idle-scheduled library load) is deferred; see deferred-work.md.

## Spec Change Log

## Review Triage Log

| # | Layer | Finding | Verdict | Evidence | Route |
|---|---|---|---|---|---|
| 1 | edge, blind, verif-gap | `status === "error"` falls through to the data branches | low | Store yields error only when no Setup and the library failed; history is still loaded. Decision: error renders like ready (document + test) | patch |
| 2 | edge, blind | First-visit loading waits on the library the page does not need | medium | Spec binds the view to store `status`; a separate `historyStatus` is a store change beyond this story | defer |
| 3 | edge | `migrationFailed` stale after cross-tab rereads | low | Rereads do not recompute it | patch |
| 4 | edge | e2e first-visit waits can exceed the 5 s default | medium | Idle-scheduled library load + three browsers on CI | patch |
| 5 | edge, blind | Unavailable-before-Reps precedence untested | low | Only `repCount: 0` case exists | patch |
| 6 | blind, verif-gap | `PracticeClient` wiring (repCount, attemptActive, storageAvailable) never observed on the page | medium | Pre-verified by flipping the expressions | patch |
| 7 | blind, verif-gap | Server-render loading placeholder untested | medium | Pre-verified | patch |
| 8 | blind | `aria-busy` never asserted | low | One line | patch |
| 9 | blind | Misleading test name | low | Rename | patch |
| 10 | blind | Three near-identical branches in `PracticeView` | low | Simplify | patch |
| 11 | blind | Storage note appears twice (body + footer) | low | Spec-mandated; record and scope locators to `main` | patch |
| 12 | blind | Header deviates from DESIGN (no star, column layout) | low | Record as a 6.1 simplification; furniture comes with 8.x | patch |
| 13 | verif-gap | `migrationFailed` OR pinned by a single-key stub | low | Pre-verified | patch |
| 14 | verif-gap | Brand-mark link and page title unasserted | low | Pre-verified | patch |
| 15 | overseer (visual) | Action pill stretches to the column width | low | Seen in Chrome at 1280 | patch |

## Verification

**Commands:**
- `npm run lint && npm run typecheck && npm test` -- expected: clean, including the new store and practice tests
- `npm run build && npm run check:static` -- expected: `/practice` static
- `npm run test:e2e` -- expected: practice, routes, privacy, journey specs pass on three browsers
