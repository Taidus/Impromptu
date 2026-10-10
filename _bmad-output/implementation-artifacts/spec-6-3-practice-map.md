---
title: 'Story 6.3: Practice Map'
type: 'feature'
created: '2026-10-09'
status: 'done'
baseline_commit: '97c4664'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-6-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Users cannot see where they have been practising. FR-26 asks for plain counts of Reps by Skill, Medium and Level with no scoring.

**Approach:** Add a pure derivation `practiceMap(reps, library)` in `src/domain/practice/practice-map.ts` and a `PracticeMap` component rendered by `PracticeView` above the history in the with-Reps state: three labelled tables (Skill, Medium, Level) listing every Skill and Medium from the loaded library plus the four Levels, each cell a count in the `index-number` role with an em dash for zero, and the caption "Counts show what you've practiced, not how good it was." Retries and Variations count as Reps; counts use the Rep snapshot's `inputs.skill.id`, `inputs.medium.id` and `level` (AD-5). Hidden when there are no Reps. Cells wrap two per row at 320px.

## Boundaries & Constraints

**Always:**
- Domain: `src/domain/practice/practice-map.ts` exports `practiceMap(reps: Rep[], library: { skills: {id, revealText}[]; mediums: {id, revealText}[] }): { skills: Row[]; mediums: Row[]; levels: Row[] }` with `Row = { id, label, count }`. Every library Skill/Medium appears (count 0 allowed) in library order; a Rep whose Skill or Medium id is no longer in the library is still counted under its snapshot `revealText` as an extra trailing row (AD-5: retired entries still display). Levels are the four `Level` values in order, labelled from `copy.levelName` by the component (the domain returns ids only for levels). Pure: no store, no `Date`, no random.
- Component: `src/components/practice/PracticeMap.tsx`, props `{ map }`; three `<table>`s each with a `<caption>` (visually hidden group name), `<th scope="col">` labels in `text-meta`, counts in a new `text-index-number` utility (add to `tokens.css` from the existing `--typography-index-number-*` vars), zero as `—` in `text-ink-soft`; the FR-26 caption from `copy.state.practiceMapDisclaimer` once above the three groups in `text-body text-ink-soft`. Layout: a responsive grid of cells (`grid grid-cols-2 desktop:grid-cols-4 gap-6`) inside each table body via `display: contents` is NOT required; simpler: render each group as a table with one row and one `<td>` per item, and let the row wrap by giving `tr` `flex flex-wrap` and `td` `basis-1/2 desktop:basis-1/4` (keep the table semantics; add `role` attributes only if the display changes break them).
- `PracticeView` gets a `map` prop (`ReturnType<typeof practiceMap> | null`) and renders `<PracticeMap>` above the history when `reps.length > 0` (note: `PracticeView` has no `repCount` prop any more; it derives the count from `reps`); `PracticeClient` computes it from `history` and `library` (from `useAppStore().library`, null until the library loads; pass `null` → hidden).
- No bars, rings, percentages, goals, streaks, day-gap figures or quality words anywhere; a unit test asserts the rendered markup contains no `%` and no words from a small banned list (`score`, `streak`, `goal`, `better`, `best`, `level up`).
- Tests: unit for the derivation (counts, zero rows, retired-entry trailing row, retry/variation counted) and for the component markup (three captions, em dash for zero); e2e in `e2e/practice.spec.ts`: seed three Reps across two Skills and assert the counts and the caption inside `main`, and at 320px two cells per row (compare `offsetTop` of the first three cells).

**Never:**
- No Export/Clear (6.4, 6.5). No store changes. No new dependencies.

</frozen-after-approval>

## Code Map

- `src/components/practice/PracticeView.tsx`, `PracticeClient.tsx`, `PracticeHistory.tsx`, `RepCard.tsx` (6.2) -- insert the map above `<PracticeHistory>`.
- `src/store/types.ts` -- `StoreState.library` (`ComposeLibrary | null`, with `skills`/`mediums` arrays carrying `id` and `revealText`).
- `src/domain/session/schema.ts` -- `Rep`, `Level`; `src/domain/library/schema.ts` -- `Skill`, `Medium`.
- `src/components/copy.ts` -- `copy.state.practiceMapDisclaimer`, `copy.levelName` (6.2); add `copy.practice.mapGroups = { skill: "Skill", medium: "Medium", level: "Level" }`.
- `src/styles/tokens.css` -- `--typography-index-number-*` vars exist; add `text-index-number`.
- `e2e/practice.spec.ts` -- seeding helper and the 6.2 two-Rep case.

## Tasks & Acceptance

**Execution:**
- [x] `src/domain/practice/practice-map.ts` + `practice-map.test.ts`.
- [x] `src/styles/tokens.css` -- `text-index-number`.
- [x] `src/components/copy.ts` -- `copy.practice.mapGroups`.
- [x] `src/components/practice/PracticeMap.tsx` + markup test (in `practice-map.test.ts` or `practice.test.ts`).
- [x] `src/components/practice/PracticeView.tsx`, `PracticeClient.tsx` -- `map` prop.
- [x] `e2e/practice.spec.ts` -- counts, caption, 320px wrap.

**Acceptance Criteria:**
- Given Reps, then three labelled tables list every Skill, Medium and Level with counts in index-number type and an em dash for zero, above the history, under the FR-26 caption.
- Given no Reps, then no map renders.
- Given a Rep whose Skill id left the library, then it is still counted under its snapshot name.
- Given 320px, then cells wrap two per row.
- Given lint, typecheck, unit, build, check:static and e2e, then all pass.

## Implementation Notes

- Each Map group is a `<table>` with an `sr-only` caption and one `tbody` grid (`grid-cols-2`, `desktop:grid-cols-4`); one `<tr role="row">` per entry holds `<th scope="row">` label and `<td>` count, reversed with `flex-col-reverse` so the count sits above its label and label/count can never misalign when wrapping (replaces the thead/tbody flex rows).
- Zero renders as an `aria-hidden` em dash plus `sr-only` "0" in `text-ink-soft`; non-zero counts are `text-index-number text-ink`.
- `PracticeClient` passes an empty library to `practiceMap` once `libraryStatus === "error"`, so the Map still shows (every Rep in snapshot-labelled trailing rows) instead of staying hidden for the session.
- Domain `levels` is now `{ id: Level; count: number }[]` (no dead label); the component maps ids through `copy.levelName` without a cast.
- e2e zero cells read `—0` (visible dash + sr-only 0).


## Spec Change Log

## Review Triage Log

- [patch] PracticeMap layout: separate thead/tbody flex rows misalign label i and count i once a group wraps (every production group has >2 entries). Fix: one `<tr>` per entry (`<th scope="row">` label under a `<td>` count), rows wrapped by `tbody` as `flex flex-wrap`, items `basis-1/2 desktop:basis-1/4`. (edge-case + design check in Chrome)
- [patch] Guard tests: render PracticeView with `reps: []` / `storageAvailable: false` and a non-null `map`; assert the disclaimer is absent. (verification-gap)
- [patch] Assert the em dash span carries `text-ink-soft` and the count span `text-ink`. (verification-gap)
- [patch] Map hidden for the session when the library fails to load although counts are derivable from snapshots: pass an empty library once `libraryStatus === "error"`; unit test. (edge-case + blind-hunter)
- [patch] `th` is UA-centred while `td` is start-aligned: `text-left`. (blind-hunter)
- [patch] 320px wrap e2e also asserts `scrollWidth <= 320`; `cellCount` guards a missing header with `expect(headers).toContain(label)`. (blind-hunter)
- [patch] Zero cells announce "em dash": `aria-hidden` dash plus `sr-only` "0"; markup test. (blind-hunter)
- [patch] Drop redundant `role="table|columnheader|cell"` and the inaccurate comment; keep `role="row"` on the restyled `tr`. (blind-hunter)
- [patch] `levels` carries a dead `label` and forces a cast: type `levels: { id: Level; count: number }[]`. (blind-hunter)
- [patch] Tighten markup tests: count cell carries `text-index-number`, retired-Skill trailing row rendered by the component. (blind-hunter)
- [patch] Spec bookkeeping: tick Execution, fill Implementation Notes and Verification. (blind-hunter)
- [reject] Hardcoded library labels in e2e: fixture content under our control. (blind-hunter)
- [reject] Duplicate ids in the library: content is authored JSON validated at build; not a runtime input. (edge-case)
- [reject] Trailing retired-id row label uses the first Rep seen in history order; acceptable, documented in the domain comment. (edge-case)
- [reject] Four-digit counts at 320px: 1000+ Reps is out of scope. (edge-case)

## Verification

**Commands:**
- `npm run lint && npm run typecheck && npm test` -- expected: clean
- `npm run build && npm run check:static` -- expected: `/practice` static
- `E2E_PORT=3102 npm run test:e2e` -- expected: all specs pass

**Results:**
- lint: clean; typecheck: clean; `npm test`: 40 files, 655 tests passed.
- build: OK, `/practice` static (○); check:static: OK (/, /practice, /privacy, /stage prerendered).
- e2e: 204 passed (36.7s).
