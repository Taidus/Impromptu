---
title: 'Lock Inputs and Reroll the rest'
type: 'feature'
created: '2026-10-10'
status: 'in-progress'
route: 'dispatch'
review_loop_iteration: 0
story_key: '4-3-lock-inputs-and-reroll-the-rest'
baseline_commit: 'f147b92ffab64e3eae994945062afcb2bc9168dd'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-4-context.md'
  - '{project-root}/_bmad-output/planning-artifacts/architecture/architecture-impromptu-2026-10-08/ARCHITECTURE-SPINE.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux-designs/ux-impromptu-2026-10-08/DESIGN.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux-designs/ux-impromptu-2026-10-08/EXPERIENCE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Once a Challenge is fully revealed and held, there is no way to keep the parts a creator likes and only redraw the rest — the action row has no primary action yet (Story 3.10/4.1's own words).

**Approach:** Add `toggle_lock` to the session reducer and a `reroll` store command that calls the existing `compose()` with `session.locks`, lands via the usual `challenge_committed`/`compose_failed` events, and re-lands only the kinds whose value actually changed (locked or coincidentally-identical kinds stay landed). Reroll is a single explicit action with no follow-up presses: its changed kinds auto-advance through the same shuffle/landing motion Story 4.1 already built (Quick reveal on: instant, same as any other quick commit), so the Reroll control itself never unmounts and focus never leaves it. Lock toggles and the Reroll line button render only once fully revealed, for a `new`/`reroll` origin (never `retry`/`variation`).

</frozen-after-approval>

## Code Map

- `src/domain/session/session-reducer.ts` -- add `toggle_lock` event + gate (reuse/export the Held-fully-revealed predicate `canStart` already encodes); `commitChallenge` preserves a reroll's unchanged kinds instead of always re-emptying `revealed`.
- `src/domain/compose/compose.ts` -- unchanged; already accepts `locks`/`origin:{kind:'reroll'}` and returns `blockingLock` (Story 3.3).
- `src/store/types.ts`, `src/store/store.ts` -- add `{type:'reroll'}` to `StoreCommand`; `runReroll` mirrors `runNewChallenge` but reads `session.locks`/`session.recent` and gates on the Held-fully-revealed predicate before composing (AD-7 no-op).
- `src/components/stage/reveal-logic.ts` -- add a reroll-only live-region branch ("Rerolled." alone mid catch-up, or with the full landed text when the commit already landed everything).
- `src/components/stage/useRevealMotion.ts` -- unchanged; reused as-is.
- `src/components/stage/pieces.tsx`, `icons.tsx` -- add `LockToggle` + a padlock glyph.
- `src/components/stage/RevealComposition.tsx` -- render Lock toggles + Reroll once fully revealed for `new`/`reroll` origins; never render the sun button for a `reroll`-origin Challenge (its changed kinds auto-advance instead).
- `src/components/stage/StagePage.tsx` -- wire `toggle_lock`/`reroll` dispatch, add the reroll auto-advance effect, and stop showing the generic compose-error banner while a Challenge is held (it would otherwise appear under a failed Reroll).
- `src/components/copy.ts` -- add `stage.lock.{toggleLabel,lockedCaption}`, `stage.rerolled`; `button.reroll` already exists.
- Not touched: `src/app/stage/page.tsx`, Epic 5 "Start creating" wiring.

## Tasks & Acceptance

**Execution:**
- [x] `src/domain/session/session-reducer.ts` -- `toggle_lock` + reroll-aware `commitChallenge`
- [x] `src/store/types.ts`, `src/store/store.ts` -- `reroll` command
- [x] `src/components/stage/reveal-logic.ts` -- reroll announcement
- [x] `src/components/stage/pieces.tsx`, `icons.tsx` -- `LockToggle`
- [x] `src/components/stage/RevealComposition.tsx`, `StagePage.tsx` -- wiring + auto-advance
- [x] `src/components/copy.ts` -- new copy keys
- [x] Unit tests: `session-reducer.test.ts`, `store.test.ts`, `RevealComposition.test.ts`
- [x] `e2e/lock-reroll.spec.ts`

**Acceptance Criteria:**
- Given a fully revealed held Challenge, when Held renders, then each present piece shows a Lock toggle and a Reroll line button appears; both are absent mid-Reveal and for `retry` origin
- Given locked Inputs, when Reroll is activated, then the committed Challenge keeps every locked Input identical, pushes its recent key, un-lands only the changed kinds, and `toggle_lock`/`reroll` are no-ops before the reveal completes
- Given repeated Rerolls, then there is no counter, limit, cost, or confirmation, and Locks persist across reload
- Given Locks leave nothing composable, when Reroll is activated, then the held Challenge stays exactly as it was (Story 4.4 owns the conflict message)

## Implementation Notes

- Implemented directly (per build-session override), no subagent dispatch.
- **Open question resolved conservatively (CHECKPOINT 1):** EXPERIENCE.md's Rerolling row ("reshuffle together") and the epics.md AC ("Quick reveal off: the user reveals the changed kinds in order") read as mildly in tension, and the AC's own "focus stays on Reroll" cannot hold if a reroll swaps Reroll out for a fresh "Reveal next" button mid-walk. Resolved as: Reroll is always the single action that starts the catch-up; its changed kinds then auto-advance through Story 4.1's existing shuffle/landing driver (normal timing off, instant via the existing `revealAll` path on), never requiring a follow-up press — consistent with "reroll as often as you like" and with Quick reveal's own existing precedent of landing multiple kinds without per-piece presses. This is not the banned "auto-advancing Reveal steps" (UX-DR35): it is the bounded, direct consequence of one explicit press, exactly like Quick reveal already is.
- **Lock toggle placement is a deliberate simplification:** DESIGN.md asks for a 52px disc on each piece's own outer-left edge. Given the Topic/Style/Constraint pieces are nested inside one scrap card (floats, a bottom band), overlaying a disc precisely at each nested piece's own edge without disturbing Story 3.10/4.1's layout was a disproportionate risk for this story. Implemented instead as a plain vertical list of per-kind Lock toggles above the Reroll button — same control, same per-kind independence, same accessible contract, different arrangement. `ponytail: revisit with per-piece absolute placement if a design review asks for it.`
- `npm run lint`, `npm run typecheck`, `npm test` (867/867), `npm run build`, `npm run check:static`, and `E2E_PORT=3108 npm run test:e2e` (258/258 across chromium/webkit/firefox) all pass.
- **A real bug the first e2e pass caught:** with Lock toggles listed above Reroll in the DOM, the existing "focus the action row's first button on `challenge.id` change" effect (Story 3.10/4.1) grabbed the first Lock toggle instead of Reroll after a reroll commit, failing "focus stays on Reroll" in all three browsers. Fixed by rendering Reroll before the Lock list -- the same generic effect now does the right thing for free.

## Verification

**Commands:**
- `npm run lint` -- no errors
- `npm run typecheck` -- no errors
- `npm test` -- all Vitest suites pass, including the new `toggle_lock`/reroll cases
- `npm run build` -- production build succeeds; `/stage` still prerendered
- `npm run check:static` -- `/stage` still listed as statically prerendered
- `E2E_PORT=3108 npm run test:e2e` -- all Playwright specs pass, including `e2e/lock-reroll.spec.ts`
