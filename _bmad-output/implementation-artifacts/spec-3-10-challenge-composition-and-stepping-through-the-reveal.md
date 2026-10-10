---
title: 'Challenge composition and stepping through the Reveal'
type: 'feature'
created: '2026-10-09'
status: 'in-review'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: '050df6ad4f0fd7c58ef125edae835c22103f8f79'
story_key: '3-10-challenge-composition-and-stepping-through-the-reveal'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-3-context.md'
  - '{project-root}/_bmad-output/planning-artifacts/architecture/architecture-impromptu-2026-10-08/ARCHITECTURE-SPINE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `/stage` (Story 3.9) composes and holds a Challenge but renders no reveal composition at all — Story 3.9 left an explicit empty slot where the Skill/Medium ticket tabs, the Topic paper scrap, the Style foil slip, the Constraint ink stamp, the Brief, and the "Reveal next" sun button belong. A held Challenge today is invisible.

**Approach:** Build the Reveal composition inside that slot: the five pieces in their final positions (empty-dashed until landed), the Brief arriving last, and a "Reveal next" sun button that steps `session.revealed` forward one kind at a time via the existing `reveal_next` session event (Story 3.4) and the store's `dispatchSession` (Story 3.6). Quick reveal (a setup preference) already lands every kind on commit (Story 3.4); this story only has to render whatever `revealed` already contains, so Quick reveal needs no special-cased UI path. Everything lands **instantly** — no shuffle, no shimmer, no fade; Epic 4 adds that motion on top of this same structure. With everything landed, the action row renders nothing further (Reroll is Story 4.3, Start creating is Story 5.1).

</frozen-after-approval>

## Boundaries & Constraints

**Always:**
- Own only `src/components/stage/**` and `src/app/stage/**` (`src/app/stage/page.tsx` is untouched this story — no new routes).
- Reuse `SunButton`, `StageIconButton`, `LineButton` (Story 3.1), `copy` (Story 3.1, additive), `useAppStore`/`getAppStore`/`dispatchSession` (Story 3.6), `sessionReducer`'s `reveal_next` (Story 3.4), and the `--spacing-*`/`--color-*`/`--radius-*`/`--shadow-*` tokens (Story 3.1) exactly as built. No raw hex/px in `src/components` (existing `scripts/check-token-usage.test.ts` guard) — this story's new typography roles (`tab-value-stage`, `topic-stage`, `topic-stage-long`, `style-stage`, `stamp-stage`, `piece-label`, `brief-stage`, each with a `-phone` delta) are added as `@utility` classes in `src/styles/tokens.css` from vars Story 3.1 already transcribed, consumed for the first time here.
- The Stage's one AD-7 keydown handler stays in `StagePage.tsx` (Story 3.9 boundary); this story extends it with Space/Enter for "Reveal next" only when no control has focus, using the same bare-first-press guards as `isPlainEscape`. It never adds a second `keydown` listener.
- Space/Enter on the focused sun button use native `<button>` activation — the extended handler is strictly the no-control-focused fallback.
- `which kinds are present`, `which kind is next`, and `what the live region announces` are pure functions (`src/components/stage/reveal-logic.ts`), unit-tested without rendering React.
- No new npm dependency. No `paper-scrap.webp`/`ink-mask.png` image request — neither asset exists yet anywhere in the app (same gap Story 3.9 flagged for the grain overlay); the paper scrap and the ink stamp's "wear" use the Assets table's own documented fallback (a flat `bg-paper` fill; CSS's native `border-style: double` in place of the mask), both token-only.

**Never:**
- No shuffle, shimmer, fade, 3D, or any other motion (Epic 4). Pieces appear in their final state the instant their kind enters `revealed`.
- No Lock toggle, Reroll, countdown, or Start creating — Stories 4.x/5.x. The action row shows only "Reveal next" while something remains, and nothing once everything (including the Brief) has landed.
- No Variation, Retry, Rerolling, Finished, Saved, or any other post-Held session state — out of scope; this story only ever reads `session.state === 'held'`.
- Do not modify `src/domain/session/session-reducer.ts`, `src/store/**`, or `copy.ts`'s existing keys — additive only.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Held, nothing revealed | `session.state:'held'`, `revealed:[]` | All present kinds render as empty dashed slots in their final positions; "Reveal next" renders and receives focus | N/A |
| Click/Enter/Space on focused sun button | Button has focus | Native activation calls `onRevealNext` → `dispatchSession({type:'reveal_next'})` once | N/A |
| Space/Enter with no control focused | `document.activeElement === document.body`, a next kind exists | The Stage's extended keydown handler dispatches `reveal_next` directly | N/A |
| Space/Enter with no control focused, nothing left | `nextKind(...) === null` | No-op | N/A |
| Each kind lands | `revealed` grows by one kind | That kind's material piece replaces its empty slot; the aria-live region announces `"{Label}: {value}."`, or the Brief's own text unprefixed for `brief` | N/A |
| No Style on this Challenge | `challenge.inputs.style === undefined` | No Style slot (empty or landed) renders at all — the Reveal has one step fewer | N/A |
| Everything landed | `revealed` contains every present kind incl. `brief` | The sun button disappears; no primary action renders (Reroll/Start creating are later stories) | N/A |
| Quick reveal commit | A fresh `challenge_committed` with `quickReveal` on | `revealed` already contains every present kind (Story 3.4); this story renders all pieces landed immediately and announces once as `"Challenge ready." + every Input + the Brief` | N/A |
| Reload or restore (any `revealed`) | The first hydrated render sees an already-held Challenge | Pieces render per their actual `revealed` state; the live region stays silent (the restore announcement is Story 3.11 — see deferred-work.md) | N/A |
| Phone (≤ 860px) | viewport width ≤ 860px | The action row is a bottom bar fixed to the column's bottom edge; the Constraint stamp sits in normal flow below the Topic text | N/A |

## Code Map

- `src/components/stage/reveal-logic.ts` — new: `presentKinds`, `nextKind`, `isFullyRevealed`, `announcementFor`, `quickRevealAnnouncement`, `emptySlotLabel`. Pure; mirrors (without importing) the session reducer's own private `presentKinds`/`revealNext` helpers, since the UI needs them without a `Session`.
- `src/components/stage/pieces.tsx` — new: presentational pieces. `EmptySlot`, `TicketTab` (Skill/Medium), `FoilSlip` (Style), `InkStamp` (Constraint), `ScrapGroup` (Topic, hosting Style/Constraint at fixed corner/band positions), `BriefBlock`.
- `src/components/stage/RevealComposition.tsx` — new: wires `reveal-logic` + `pieces` to the held `Challenge`/`revealed`; owns the aria-live announcement, the "Reveal next" sun button, and the focus-on-entry effect.
- `src/components/stage/logic.ts` — additive: `isPlainActivationKey` (Space/Enter, same guard shape as `isPlainEscape`), and `KeyLike` is now exported for reuse.
- `src/components/stage/StagePage.tsx` — additive: renders `<RevealComposition>` in Story 3.9's slot when held; the existing keydown handler grows an `isPlainActivationKey` branch.
- `src/components/copy.ts` — additive: `stage.piece.{skill,medium,topic,style,constraint}`, `stage.inputsListLabel`, `stage.challengeReady`, `stage.notRevealedYet`. `stage.button.revealNext` (Story 3.1) is reused unchanged.
- `src/styles/tokens.css` — additive: `@utility` classes for the Reveal pieces' type ramp (`text-brief-stage(+phone)`, `text-topic-stage(+long)(+phone)`, `text-style-stage(+phone)`, `text-stamp-stage(+phone)`, `text-tab-value-stage(+phone)`, `text-piece-label(+phone)`) from vars Story 3.1 already transcribed.
- `e2e/stage.spec.ts` — additive: empty slots + focus on entry, keyboard stepping order with the Brief last, live-region announcements, Quick reveal, desktop type minimums at 1280×800, phone layout at 390×844.
- Not touched: `src/app/stage/page.tsx`, `src/domain/session/**`, `src/store/**`, `src/components/SunButton.tsx`/`StageIconButton.tsx`/`LineButton.tsx`.

## Tasks & Acceptance

**Execution:**
- [x] `src/components/stage/reveal-logic.ts` + `reveal-logic.test.ts` — pure present/next/announcement helpers, unit-tested over `baseChallenge`/`fullChallenge` fixtures (Story 3.4)
- [x] `src/components/copy.ts` — add the Reveal pieces' labels and the Quick reveal/empty-slot copy
- [x] `src/styles/tokens.css` — add the Reveal pieces' `@utility` type classes
- [x] `src/components/stage/pieces.tsx` — `EmptySlot`, `TicketTab`, `FoilSlip`, `InkStamp`, `ScrapGroup`, `BriefBlock`
- [x] `src/components/stage/RevealComposition.tsx` — composition, live region, "Reveal next" button, focus-on-entry
- [x] `src/components/stage/logic.ts` + `logic.test.ts` — `isPlainActivationKey`
- [x] `src/components/stage/StagePage.tsx` — render the composition; extend the one keydown handler
- [x] `e2e/stage.spec.ts` — the six new Story 3.10 scenarios

**Acceptance Criteria:**
- Given a held Challenge with nothing revealed, when the Stage renders, then every present kind shows as an empty dashed slot in its final position, no Style slot exists if the Challenge has none, and "Reveal next" has focus
- Given "Reveal next" is pressed (click, focused Enter/Space, or Space/Enter with no control focused), when a kind remains, then the next present kind (per `config.reveal.order`) lands instantly and the live region announces it; once every kind including the Brief has landed, the button disappears
- Given Quick reveal is on, when a Challenge commits, then every present kind and the Brief render landed immediately and the live region announces once as "Challenge ready." followed by each Input and the Brief
- Given 1280×800, when the Brief and Inputs are showing, then the Brief computes at ≥32px and every Input at ≥24px; given 390×844, then the Constraint stamp sits below the Topic text and the action row is fixed to the column's bottom edge

## Implementation Notes

- Implemented directly (per build-session override), no subagent dispatch.
- **No asset for the paper scrap or the ink-mask wear:** per DESIGN.md's own Assets fallback table ("Flat `{colors.paper}` scrap" / "plain rule"), `ScrapGroup` uses a flat `bg-paper` fill and `InkStamp` uses CSS's native `border-style: double` (via `border-y-4 border-double`) instead of `ink-mask.png`. Token-only, no image request; swap in the real texture/mask whenever an asset story adds them.
- **All five empty slots render from the start, not just the ones about to land:** DESIGN.md's "Empty (pre-Reveal): empty slots in their final positions" and the per-piece Empty slot spec ("each piece's final footprint... at the same tilt as the piece it will hold") describe every present kind's footprint existing simultaneously, not only the next one in `config.reveal.order`. `ScrapGroup` therefore always renders its outer wrapper (Topic in normal flow, Style absolutely tucked at the top-right corner, Constraint in the bottom band) regardless of load order, and each of the three independently toggles empty-dashed vs. landed-material as its own kind enters `revealed`.
- **Announcement state lives in `useState`, not a `useRef`, and is computed during render, not inside a `useEffect`:** this codebase's lint config rejects both `setState` inside an effect body (`react-hooks/set-state-in-effect`) and reading/writing a ref during render (`react-hooks/refs`). The React-documented "store information from previous renders" pattern — comparing against a `useState` value during render and conditionally calling its setter — satisfies both. Since the review patch pass this state lives in `StagePage` (see below).
- **A reload/restore stays silent:** EXPERIENCE.md's "Reload or Resume in any state" announcement belongs to Story 3.11 (navigation/reload stability). Since the review patch pass the live region is seeded silently with whatever hydration restored, so this holds for partial and fully revealed restores alike; Quick reveal wording comes from `setup.quickReveal` on a fresh commit, not from inference.
- **`SunButton` cannot take a `ref` prop:** it's typed with `ButtonHTMLAttributes<HTMLButtonElement>` (Story 3.1), which — unlike `ComponentProps<"button">` (used by `InkButton`/`LineButton`, which do accept a forwarded `ref` under React 19's ref-as-prop support, e.g. `EmailSignup.tsx`) — does not include `ref`. Rather than edit a Story 3.1-owned file, `RevealComposition` wraps it in a plain `<div ref={actionRowRef}>` and focuses via `actionRowRef.current?.querySelector("button")` for each new `challenge.id`.
- **Tilt and counter-rotation:** each tilted piece (ticket tabs ±1.5°, scrap -1.2°, foil 4°, stamp -7°) wraps its label/value in an inner `<div>` rotated by the negated angle, keeping "essential text... always horizontal" (DESIGN.md → Typography) while the piece itself stays askew.
- **Action row gap before the primary action:** DESIGN.md's `{spacing.8}` (32px) between the composition and the action row is implemented on desktop as the column's `gap-stage-gap` (24px) plus `desktop:mt-2` (8px) on the action row; on phone the row is a fixed bottom bar, so the gap does not apply.
- **Fit-rule cascade:** only step 2 is implemented: a landed Topic measures itself (ResizeObserver, `isPastTwoLines`) and switches to `desktop:text-topic-stage-long` once it runs past two lines — one-way per value (keyed on it) so the smaller size cannot flip it back. Steps 1, 3, and 4 (compact gaps, countdown caption/size) wait for the stories that add the countdown and the rest of the Held composition.
- `npm run lint`, `npm run typecheck`, `npm test` (539 passing after the review patch pass), `npm run build`, `npm run check:static`, `npm run check:privacy`, and `npm run test:e2e` (93 across chromium/webkit/firefox after the review patch pass) all pass clean.

- **Review patch pass (triage #1–#9):**
  - The polite live region now lives in `StagePage`, mounted before any Challenge is held; its text is set after mount. The first hydrated render seeds it silently with whatever was restored (reload/restore announcement deferred to Story 3.11, recorded in `deferred-work.md`). `liveAnnouncement` (pure, unit-tested) picks the Quick reveal wording only for a new Challenge with `setup.quickReveal` on, clears stale text on a new `challenge.id`, and announces every newly landed kind in order on a multi-kind jump.
  - Focus: the Brief block is `tabIndex={-1}` and takes focus when it lands (the Reveal next button unmounts at that moment); Reveal next is refocused for every new `challenge.id`, not only on mount. Repeated Enter/Space keydown on the sun button is `preventDefault`ed, so a held key reveals once. The body fallback also treats `activeElement` null or `documentElement` as "no control focused".
  - Each landed value carries an sr-only "Label: " prefix (the visible label stays `aria-hidden`), so it reads "Topic: coming home".
  - Style and Constraint render on a Topic-less Challenge (the scrap becomes a plain paper band, so the stamp stays on paper). The foil now floats right inside the scrap, so the Topic text wraps around it instead of sitting under it.
  - Phone action row: column-width, `bg-lilac`, bottom padding `max(spacing 4, safe-area-inset-bottom)`; the column's bottom padding reserves the bar's height. Ticket tabs wrap (`flex-wrap`, `min-w-0`); values wrap with `overflow-wrap: anywhere`.
  - `presentKinds` is now exported from `src/domain/session/session-reducer.ts` and reused by `reveal-logic.ts` (a one-word `export` — the only edit to the reducer, overriding the "do not modify" boundary at the reviewer's request).
- **Decisions on the former Open Questions:** (1) reload mid-Reveal announcement deferred to Story 3.11 (deferred-work.md); (2) the 32px composition-to-actions gap is implemented (above); (3) the paper-scrap and ink-mask asset fallbacks (flat `bg-paper`, native double rule) are accepted per DESIGN.md's own Assets fallback column.

## Review Triage Log

| # | Layer | Finding | Verdict | Evidence | Route |
|---|---|---|---|---|---|
| 1 | blind, edge, verif-gap | Live region inserted with Quick reveal text (likely unspoken); restored full reveal mis-announced as Quick reveal; stale text on new Challenge; multi-kind jump announces only the last | medium | Region mounts with composition; `wasAlreadyFull` inference | patch |
| 2 | blind, edge | Focus drops to body when the Brief lands; entry focus only on mount; held Enter bursts reveals | medium | Button unmounts when `next === null`; `[]` deps; native auto-repeat | patch |
| 3 | blind | Filled pieces have no accessible label | medium | Visible label `aria-hidden`; list reads values only | patch |
| 4 | blind, edge, verif-gap | Topic-less Challenge hides Style/Constraint | low | Schema allows no Topic; `ScrapGroup` gated on `topicPresent` | patch |
| 5 | blind, edge | Phone action row spans viewport, no safe area, covers content; tabs overflow; foil covers Topic | medium | `fixed inset-x-0 bottom-0`; no column padding | patch |
| 6 | orchestrator | DESIGN 32px gap before action row; long-Topic fit step unwired | low | Open Question 2; `text-topic-stage-long` unused | patch |
| 7 | blind | `presentKinds` duplicates the reducer helper; `pieces.tsx` duplication | low | Docstring admits the copy | patch |
| 8 | verif-gap, blind | Body-focus Space/Enter, final announcement text, Style minimum size untested | low | Pre-verified: deleting the fallback branch passes CI | patch |
| 9 | edge | `activeElement` null/`documentElement` skips the fallback | low | Browser-dependent focus root | patch |

## Verification

**Commands:**
- `npm run lint` -- no errors
- `npm run typecheck` -- no errors
- `npm test` -- all Vitest suites pass (539 tests, including `reveal-logic.test.ts` and the new `logic.test.ts` cases)
- `npm run build` -- production build succeeds; `/stage` still prerendered
- `npm run check:static` -- `/stage` still listed as statically prerendered
- `npm run check:privacy` -- no analytics/error-monitoring SDKs
- `npm run test:e2e` -- all Playwright specs pass (93 tests across chromium/webkit/firefox), including the Story 3.10 scenarios (plus the review pass's body-focus, final-announcement, Brief-focus, held-Enter, Style-size, and phone-overlap checks) in `e2e/stage.spec.ts`
