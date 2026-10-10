---
title: 'Lock Inputs and Reroll the rest'
type: 'feature'
created: '2026-10-10'
status: 'done'
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
- **Orchestrator decision A (supersedes the CHECKPOINT 1 resolution above):** Reroll follows EXPERIENCE.md -> Rerolling, not ARCHITECTURE-SPINE AD-18's "user reveals changed kinds in order" -- only EXPERIENCE satisfies "Focus stays on Reroll". A successful reroll commits with every kind landed at once (no catch-up auto-advance, no hidden sun button, no stuck state); the changed pieces play one decorative reshuffle together with Quick reveal timing (<= `config.reveal.quickMaxMs`, aria-hidden flicks from the 4.1 flick pools, or the 4.2 fade under reduced motion) while locked pieces stay still; the result is Held, focus stays on Reroll, and the live region says "Rerolled." then each changed Input and the Brief.
- **Orchestrator decision B (supersedes the "plain vertical list" simplification above):** Lock toggles follow DESIGN.md -- a 52px disc on each landed piece's outer left edge, vertically centred, overlapping only the piece border (never a text box); unlocked an outline plum-muted padlock, locked an ink disc with a cream padlock and a "LOCKED" `piece-label` caption beside it; fixed name "Lock Topic" with `aria-pressed`. The list under Reroll is gone.
- **Review patch pass:** merged Story 4.2 (`story/4-2-reduced-motion`) first (conflicts: sprint-status keeps 4.2 `review` + 4.3 `in-progress`; `pieces` import union), then: reducer `commitChallenge` lands everything for a reroll, carries Locks only on a reroll and clears them on new/retry/variation commits, `toggle_lock` re-locks a stale id and clears `lastComposeError`; new `canLockOrReroll` (Held + fully revealed + origin `new`/`reroll`) gates both `toggle_lock` and the store's `reroll`; `runReroll` composes with `mustDiffer` on every unlocked kind and falls back to the Locks alone on `no_compatible`; `useRerollShuffle` (useRevealMotion.ts) plays the changed pieces' <= `quickMaxMs` reshuffle, Reroll is `aria-disabled` and ignores presses while it runs (not `disabled`, which would drop focus); StagePage's auto-advance effect and the reroll catch-up branches are gone; announcements via `rerollAnnouncement`/`changedInputKinds`, and `nextLiveText` clears then re-sets repeated text a tick later (restore never says "Rerolled."); a failed reroll politely announces "No challenge fits these locks." and keeps the held Challenge and focus (TODO Story 4.4: inline message + Unlock button); `LockToggle`/`LockSlot` place each disc 8px into its piece's padding, with the composition reserving a `pl-14` gutter, `gap-x-14` between the tabs, and `ml-14 mb-4` beside the foil so no disc or caption meets a text box; the `clear_all_data` JSDoc is back above `canRun`. Tests: reducer (toggle_lock accept/origin/stale matrix, lock clearing, reroll keeps ids), store (no-op from Attempt/Finished/Saved/Retry, queued-before-library runs or is dropped on error, mustDiffer + fallback), reveal-logic (reroll wording, repeat text, restore), render (`aria-pressed` per kind, stale Lock, aria-disabled reshuffle), e2e (`lock-reroll.spec.ts`: second compatible Topic seeded by patching the library chunk in transit; reroll changes the unlocked Topic, keeps locked pieces, all slots filled, focus on Reroll, exact announcement; disc/caption bounding boxes vs every text line at 1280x800 and 390x844 for Explore and Perform, clear of the phone action bar; Locks persist across reload; Brief focused after the last landing). `reduced-motion.spec.ts` now checks Reveal next is gone instead of the whole action row (which holds Reroll once Held). `npm run lint`, `typecheck`, `test` (911/911), `build`, `check:static`, and `E2E_PORT=3108 npm run test:e2e` (297/297, chromium/webkit/firefox) all pass.

## Review Triage Log

| # | Layer | Finding | Verdict | Evidence | Route |
|---|---|---|---|---|---|
| 1 | orchestrator, blind | Reroll auto-advances changed kinds one by one (Quick off) / swaps instantly (Quick on); neither matches EXPERIENCE "reshuffle together with Quick reveal timing" | medium | EXPERIENCE → Rerolling vs AD-18; only EXPERIENCE satisfies "focus stays on Reroll"; auto-advance can strand the Stage (verif-gap) | patch (orchestrator decision A) |
| 2 | orchestrator, blind | Lock toggles in a list under Reroll instead of a 52px disc on each piece's left edge; phone bar grows ~300px | medium | DESIGN → Lock toggle, keep-outs | patch (orchestrator decision B) |
| 3 | blind, edge | Locks carried into new/retry commits; toggle shows LOCKED for a different value | medium | `commitChallenge` spreads `session.locks`; `locked = locks[kind] !== undefined` | patch |
| 4 | edge | `toggle_lock`/`reroll` not gated on origin in the domain | low | Only UI hides controls for retry/variation | patch |
| 5 | blind | Reroll can redraw identical values; no decision recorded | low | `mustDiffer: {}` | patch |
| 6 | blind, edge, verif-gap | Identical announcements not re-spoken; reroll wording untested; restore may say "Rerolled." | low | Same DOM text; no reroll case in `reveal-logic.test.ts` | patch |
| 7 | blind, edge | Focus drops after last reveal; Brief steals focus from Reroll; Reroll presses silently ignored mid catch-up | medium | Effects keyed on `challenge.id`; `runReroll` gated | patch |
| 8 | blind | Failed reroll gives no feedback before Story 4.4 | low | Compose-error banner suppressed while held | patch (interim) |
| 9 | blind | JSDoc moved above `needsLibrary` | low | Merge resolution | patch |
| 10 | blind, verif-gap | Gaps: toggle_lock accept case, reroll no-op states, queued reroll before library, unlocked aria-pressed | low | Pre-verified mutations pass CI | patch |
| 11 | verif-gap | Compose-error banner suppression on held Stage untested | low | Story 4.4 owns lock-conflict rendering | defer |

## Verification

**Commands:**
- `npm run lint` -- no errors
- `npm run typecheck` -- no errors
- `npm test` -- all Vitest suites pass, including the new `toggle_lock`/reroll cases
- `npm run build` -- production build succeeds; `/stage` still prerendered
- `npm run check:static` -- `/stage` still listed as statically prerendered
- `E2E_PORT=3108 npm run test:e2e` -- all Playwright specs pass, including `e2e/lock-reroll.spec.ts`
