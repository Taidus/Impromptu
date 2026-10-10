---
title: 'Story 6.2: Practice History Rep cards'
type: 'feature'
created: '2026-10-09'
status: 'in-progress'
baseline_commit: '053bafa'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-6-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `/practice` shows the storage note when Reps exist but not the Reps themselves. Users need every Rep newest first with its Brief, details and Reflection (FR-25).

**Approach:** Add a pure `RepCard` and a `PracticeHistory` list under `src/components/practice/`, rendered by `PracticeView` in the with-Reps state below the storage note. Every value on a card comes from the Rep snapshot only (AD-5): Skill and Medium names from the snapshot `revealText`, Level and kind labels from `copy.ts`, the Brief from `challenge.brief`. Cards are read-only.

## Boundaries & Constraints

**Always:**
- Order newest first by `finishedAt` (ISO string compare is enough; ties by array order).
- Card per DESIGN → Rep card: cream card on paper (`bg-cream`, `rounded-scrap`, `shadow-poster`, `p-6`), a meta row in `text-meta` uppercase (`SKILL · MEDIUM · LEVEL · DATE`, plus `TIMED m:ss` when `challenge.timeLimitSec` is set, formatted from `timeUsedSec`; untimed Reps show no TIMED segment), the Brief in `text-lede` ink, and both Reflection answers in `text-body` ink-soft under small Unbounded question labels (`text-meta`): "What worked" and "What I'd change" (copy entries). A Rep with `reflection: null` shows no reflection block. A RETRY or VARIATION outline pill (`text-meta`, 1px border, `rounded-full`) appears in the meta row when `challenge.origin.kind` is `retry` or `variation`; `new`/`reroll` show nothing.
- Date: `finishedAt` formatted with `Intl.DateTimeFormat(undefined, { dateStyle: "medium" })`; render inside a `<time dateTime={finishedAt}>`.
- Level label: `copy.levelName` (add: explore "Explore", experiment "Experiment", develop "Develop", perform "Perform"); kind labels `copy.rep.retry: "RETRY"`, `copy.rep.variation: "VARIATION"`; question labels `copy.rep.worked`, `copy.rep.change`; list heading `copy.practice.historyTitle: "Practice history"` (visually hidden `h2`).
- No library lookups, no store access inside `RepCard`/`PracticeHistory` (props only). `PracticeView` gains a `reps: Rep[]` prop and renders `<PracticeHistory reps={reps} />` in the with-Reps state; `PracticeClient` passes `history`. Note `PracticeView` now takes an `action: ReactNode` prop (the client passes `<GetAChallengeButton ground="paper" />`); keep that. Keep the pure-view tests pattern.
- Read-only: no buttons, links or actions on a card (UX-DR35). Tokens only. Long Briefs wrap (`overflow-wrap: anywhere`).
- Tests: unit (`renderToStaticMarkup`) for ordering, the TIMED segment present/absent, the RETRY/VARIATION pill, a null reflection, and that a card never reads anything but the Rep; e2e in `e2e/practice.spec.ts`: seed two Reps (one retry with reflection and a time limit, one new without) via `addInitScript` and assert order, the pill, the TIMED text and the reflection text inside `main`.

**Never:**
- No Practice Map (6.3), export (6.4), or clear (6.5). No edits to the store. No new dependencies.

</frozen-after-approval>

## Code Map

- `src/components/practice/PracticeView.tsx`, `PracticeClient.tsx`, `practice.test.ts` (6.1) -- pure view + client wiring; `e2e/practice.spec.ts` has the `addInitScript` seeding pattern with envelopes `{ v, rev, data }` and `Rep.parse` from `src/domain/session/schema.ts`.
- `src/domain/session/schema.ts` -- `Rep { id, challenge, finishedAt, timeUsedSec, reflection }`, `Challenge { level, timeLimitSec, brief, inputs { skill, medium, topic?, style?, constraint? } (each `{ id, revealText }`), origin { kind } }`; `src/domain/session/session-fixture.ts` -- `baseChallenge`, `fullChallenge`.
- `src/components/copy.ts` -- `copy.practice.*`, `copy.level.*` (one-liners, not names).
- `src/styles/tokens.css` -- `shadow-poster`, `text-meta`, `text-lede`, `text-body`, `rounded-scrap` exist.

## Tasks & Acceptance

**Execution:**
- [ ] `src/components/copy.ts` -- `copy.levelName`, `copy.rep.*`, `copy.practice.historyTitle`.
- [ ] `src/components/practice/RepCard.tsx` -- pure card.
- [ ] `src/components/practice/PracticeHistory.tsx` -- sorted list (`<ol>`), hidden `h2`.
- [ ] `src/components/practice/PracticeView.tsx` + `PracticeClient.tsx` -- `reps` prop wired.
- [ ] `src/components/practice/rep-card.test.ts` -- the unit cases above.
- [ ] `e2e/practice.spec.ts` -- seeded two-Rep case.

**Acceptance Criteria:**
- Given Reps, then cards render newest first with the meta row, the Brief, and expanded Reflection answers; timed Reps show `TIMED m:ss`.
- Given a retry or variation, then the card shows the matching outline pill.
- Given a retired library entry, then the card still displays because it reads only the snapshot.
- Given lint, typecheck, unit, build, check:static and e2e, then all pass.

## Implementation Notes

## Spec Change Log

## Review Triage Log

## Verification

**Commands:**
- `npm run lint && npm run typecheck && npm test` -- expected: clean
- `npm run build && npm run check:static` -- expected: `/practice` static
- `E2E_PORT=3102 npm run test:e2e` -- expected: all specs pass on three browsers
