---
title: 'Story 8.5: The 3D shuffle layer on the Stage and the freeze rule'
type: 'feature'
created: '2026-10-10'
status: 'done'
baseline_commit: '4f00e0c'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-8-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The Stage has no 3D flourish during a shuffle, and nothing enforces AD-12's freeze rule: once a Challenge is held (or an Attempt exists) the decor must stop for the rest of that Stage visit, including through Reroll and Variation piece shuffles, so the filmed shot is perfectly still (FR-33, NFR-7).

**Approach:** `StagePage` renders the Story 8.4 `<Decor scene="shuffle" mode={…} className="fixed inset-0 -z-10 hidden desktop:block">` behind everything; the shuffle scene already keeps every star outside the safe-area column via its keep-out probe. The mode comes from one pure function, `stageDecorMode({ sessionState, revealComplete, shuffling, frozenThisVisit })` in `src/components/stage/logic.ts`: `"shuffle"` only while Story 4.1's `useRevealMotion` reports `status === "shuffling"` on a held, incomplete Challenge that has not yet been frozen this visit; otherwise `"frozen"`. `StagePage` latches `frozenThisVisit` in a `useRef` the first time the reveal is complete or the session is not `held`, so Reroll and Variation shuffles (later stories) can only ever be DOM animation. Frozen from mount means Decor never requests the three chunk on an already-held Stage (8.4's `shouldRequestScene`). When the gate fails, nothing changes: the 4.1 piece shuffles are DOM-only and the static still shows. A Playwright suite proves that a held or creating Stage requests no animation frames.

## Boundaries & Constraints

**Always:**
- Prerequisite: Story 8.4's `src/decor` and Story 4.1's `useRevealMotion` (`motion.state.status: "idle" | "shuffling" | "landing"`) are both on the baseline. If 4.1 is not merged when this builds, pass `shuffling: false` (the layer is then always frozen, which is still correct for FR-33) and say so in Implementation Notes.
- `src/components/stage/logic.ts`: `export interface StageDecorInput { sessionState: SessionState; revealComplete: boolean; shuffling: boolean; frozenThisVisit: boolean }`; `export function stageDecorMode(input: StageDecorInput): Extract<DecorMode, "shuffle" | "frozen">` returns `"shuffle"` iff `sessionState === "held" && !revealComplete && !frozenThisVisit && shuffling`, else `"frozen"`; `export function shouldFreezeVisit(sessionState: SessionState, revealComplete: boolean): boolean` = `sessionState === "held" ? revealComplete : sessionState !== "none"` (`"none"` is not "has been held": it is the pre-hydration snapshot on every full load, and `stageDecorMode` already freezes it on its own; see Spec Change Log). `revealComplete` is `revealed.includes("brief")` (the Brief is last in `config.reveal.order`). Import the `DecorMode` type from `@/decor` (allowed for `src/components`).
- `src/components/stage/StagePage.tsx`: `const frozenThisVisit = useRef(false); if (shouldFreezeVisit(store.session.state, revealComplete)) frozenThisVisit.current = true;` (a latch read during render is fine; it only ever goes `false → true` and the next render re-derives the same mode); `const decorMode = stageDecorMode({ sessionState: store.session.state, revealComplete, shuffling: motion.state.status === "shuffling", frozenThisVisit: frozenThisVisit.current })`; render `<Decor scene="shuffle" mode={decorMode} className="fixed inset-0 -z-10 hidden desktop:block" />` directly after the existing lilac-deep fade `div` (same `-z-10` inside the root's `relative isolate`, so it paints over the fade and under the column: DESIGN layering ground → decoration and 3D → content). Add `data-testid="stage-column"` to the `div.flex.w-safe-area-width…` column so the e2e can measure it. No other StagePage change.
- The latch survives Reroll (4.3) and Variation (5.8) by construction: those keep `state === "held"` with a complete reveal, so `frozenThisVisit` is already `true`; their piece shuffles are 4.1's DOM animation and never flip the mode. A reload or a fresh navigation to `/stage` is a new visit (the ref resets), which AD-12 allows.
- Phones and mid-size: `hidden desktop:block` (861px+). At 861px the side bands are about 205px each; the keep-out margin from `config.decor.shuffle` keeps stars out of the column at any width. Nothing on the Stage depends on the layer (NFR-7).
- Unit tests, `src/components/stage/logic.test.ts`: `stageDecorMode` table — held + incomplete + shuffling + not frozen → `shuffle`; the same with `shuffling: false` → `frozen` (between presses the Stage is still, EXPERIENCE → Revealing); `revealComplete: true` → `frozen` even when shuffling; `frozenThisVisit: true` → `frozen` even when shuffling; each of `none`, `attempt`, `finished`, `saved` → `frozen`. `shouldFreezeVisit`: `held,false → false`; `held,true → true`; `attempt,false → true`; `none,false → false`.
- `e2e/stage-decor.spec.ts` (viewport 1280×800). Reuse 8.4's helpers by moving `stubNoWebGL`, `stubCapableDevice`, `countRaf`, `threeChunks` into `e2e/helpers/decor.ts` and importing them from both specs. Seeding: `page.addInitScript` writes `impromptu:setup` (`{ v: config.storage.schemaVersions.setup, rev: 1, data: setupFixture }`) and `impromptu:session` (`{ v: config.storage.schemaVersions.session, rev: 1, data }`) exactly as `e2e/stable-challenge.spec.ts` does, with `data` from `src/domain/session/session-fixture.ts`: a held-complete session is `{ ...heldSession, challenge: fullChallenge, revealed: [...config.reveal.order] }`; an Attempt is `attemptSession`. Cases:
  1. `an already-held Stage is frozen: no animation frames, no canvas, no three chunk` (all three browsers): `stubCapableDevice` + `countRaf` + seed held-complete; goto `/stage`; wait for the meta line (`p.text-stage-meta-phone` contains `·`, 15s); `[data-decor-scene="shuffle"]` is attached with `data-decor-state="fallback"` and contains no `canvas`; read `__rafCalls`, `waitForTimeout(600)`, read again: unchanged; `threeChunks` is empty. (The RAF counter sees every `window.requestAnimationFrame` call; `src/` has no other RAF caller and React's production scheduler uses `MessageChannel`, so zero is the correct expectation for a still Stage. If a later story adds a legitimate RAF user, scope the counter to the Decor by marking its loop callback rather than loosening this assertion.)
  2. `a Stage with a running Attempt is frozen` (all browsers): same as 1 with `attemptSession`.
  3. `without WebGL the reveal still steps, DOM-only` (all browsers): `stubNoWebGL`; goto `/stage` (fresh compose); wait for the meta line; press Enter twice, waiting after each with `stage.spec.ts`'s `waitForPieceToLand` pattern (`[data-testid="stage-action-row"]` absent or `data-motion-status="idle"`); `Skill: Observation` and `Medium: Drawing` visible; `canvas` count 0; the fallback still (`img[src*="chrome-burst"]`) is visible; `__rafCalls` is 0 at the end (no RAF loop was ever started on the Stage: the piece animations are CSS and `setTimeout`).
  4. `reduced motion: no canvas and no shuffle phase` (all browsers): `emulateMedia({ reducedMotion: "reduce" })` + `stubCapableDevice`; goto `/stage`; press Enter once and wait to land; `canvas` count 0; `data-decor-state` is `fallback`.
  5. `the still never sits under the column` (all browsers, at 1280×800 and 1440×900): goto `/stage`, wait for the meta line; the bounding box of `[data-decor-scene="shuffle"] img` does not intersect the bounding box of `[data-testid="stage-column"]`; the Decor wrapper has `aria-hidden="true"` and computed `pointer-events: none`.
  6. `a frozen Stage ignores the hero's ambient rule` (chromium only, skipped when the WebGL2 probe fails): `stubCapableDevice` + `countRaf`; goto `/` first and wait for `[data-decor-scene="hero"][data-decor-state="running"]` (proves the device stubs pass the gate on this browser); then click the setup **Get a challenge** button (`page.locator("#setup").getByRole("button", { name: copy.button.getAChallenge })`), expect `/stage`; wait for the meta line; wait 600ms; `[data-decor-scene="shuffle"]` is `fallback` with no canvas (first press has not happened; nothing to animate) and `__rafCalls` stays flat from the moment the hero unmounted (take the reading after `expect(page).toHaveURL("/stage")`, wait 600ms, compare).
- Known gap, stated in Implementation Notes and appended to `_bmad-output/implementation-artifacts/deferred-work.md`: with the current one-Template-per-Level library no piece ever has a second flick candidate, so `mode="shuffle"` cannot be observed end-to-end (see `e2e/reveal-motion.spec.ts`'s header note); the shuffle path is covered by the `stageDecorMode` unit table plus 8.4's scene lifecycle tests, and an e2e case that watches `data-decor-state` go `running` → `frozen` across a shuffle must be added once Epic 2 lands.
- `e2e/motion.spec.ts` (`/stage` has no Motion toggle; a stored `ambientMotion:false` mirrors `html[data-motion="off"]`) and `e2e/stage.spec.ts`, `reveal-motion.spec.ts`, `stable-challenge.spec.ts` keep passing unchanged.

- Keep every change out of `StagePage`'s keyboard handler (Story 4.5 extends it); Reroll's reshuffle (4.3) never sets `useRevealMotion` to `"shuffling"`, and the `frozenThisVisit` latch covers it without a special case.

**Never:**
- No Motion toggle on the Stage (Cross-Document Resolution 7); the stored OFF still reaches the Decor through `html[data-motion]`.
- No store, session, or domain reads inside `src/decor`; the Stage passes `mode`, nothing else. No prop beyond 8.4's `scene`, `mode`, `className`.
- No Reroll, Variation, countdown, or any other Stage feature. No change to 4.1's motion driver, `reveal-motion.ts`, or `RevealComposition`.
- No `mode="ambient"` on the Stage, no cursor depth, no parallax (DESIGN: the Stage has no parallax).
- No second animation loop, no `requestAnimationFrame` in `src/components`, no `NEXT_PUBLIC_*` test hooks, no new dependencies, no text in the canvas, no Decor on phones.

</frozen-after-approval>

## Code Map

- `src/decor/index.ts` (8.4) -- `Decor`, `DecorMode`, `shouldRequestScene` (frozen from mount ⇒ no chunk); `Decor.tsx` sets `data-decor-scene`, `data-decor-state` (`fallback | loading | running | frozen`); `scenes/shuffle.ts` measures `[data-decor-keep-out]` (`w-safe-area-width`, i.e. `min(56.25vh, 640px)`: 450px at 1280×800) plus `config.decor.shuffle.keepOutMarginPx`.
- `src/components/stage/StagePage.tsx` -- root `div.relative.isolate.min-h-screen.bg-lilac`; the lilac-deep fade `div` is `fixed inset-x-0 bottom-0 -z-10`; `heldChallenge`, `motion = useRevealMotion(…)` (4.1), the column `div.flex.w-safe-area-width.max-w-full.flex-col…`.
- `src/components/stage/useRevealMotion.ts` (4.1) -- `RevealMotion.state: MotionState` with `status: "idle" | "shuffling" | "landing"`; `src/components/stage/reveal-motion.ts` -- shuffle only when `shouldShuffle(flickPool(...))`, never under reduced motion.
- `src/components/stage/logic.ts` + `logic.test.ts` -- pure Stage decisions and their vitest table pattern; `src/domain/session/schema.ts` -- `SessionState = "none" | "held" | "attempt" | "finished" | "saved"`, `revealed: RevealedKind[]`; `src/config/app.ts` -- `reveal.order` ends with `"brief"`.
- `src/domain/session/session-fixture.ts` -- `fullChallenge`, `heldSession`, `attemptSession`, `finishedSession`, `savedSession`; `src/domain/session/setup-fixture.ts` -- `baseSetup`.
- `e2e/stable-challenge.spec.ts` -- `seedStage` (`addInitScript` writing both envelopes); `e2e/stage.spec.ts` -- `meta(page)`, `waitForPieceToLand`, the "Skill: Observation / Medium: Drawing" facts; `e2e/decor.spec.ts` (8.4) -- the stubs and the `THREE.WebGLRenderer` chunk detector to lift into `e2e/helpers/decor.ts`.
- `src/styles/tokens.css` -- `--breakpoint-desktop: 861px`, `--spacing-safe-area-width`; `:root[data-motion="off"] [data-decor-scene] canvas` (8.4).
- `_bmad-output/implementation-artifacts/deferred-work.md` -- append the shuffle-observation gap with `source_spec` pointing at this file.

## Tasks & Acceptance

**Execution:**
- [x] `src/components/stage/logic.ts` + `logic.test.ts` -- `stageDecorMode`, `shouldFreezeVisit`, the tables above.
- [x] `src/components/stage/StagePage.tsx` -- the `frozenThisVisit` latch, `decorMode`, `<Decor scene="shuffle" …>`, `data-testid="stage-column"`.
- [x] `e2e/helpers/decor.ts` -- lift the 8.4 stubs; update `e2e/decor.spec.ts` imports.
- [x] `e2e/stage-decor.spec.ts` -- cases 1–6.
- [x] `_bmad-output/implementation-artifacts/deferred-work.md` -- the shuffle-observation entry.
- [x] Review patch: `shouldFreezeVisit` no longer freezes on `none`; latch also guarded on `store.status !== "loading"`; `none → held(incomplete)` latch-walk unit test.
- [x] Review patch: `DecorMode` `"idle"` in `src/decor` (chunk + scene warm, loop stopped, still kept, state `loading`); `stageDecorMode` returns `"idle"` between presses; unit tests.
- [x] Review patch: `data-stage-frozen` on the stage column; e2e latch lifecycle, 860/861 breakpoint, warm-idle chromium case, never-`running` in cases 3/4, case 5 still width/opacity + 861×1200, cases 1/2 prove the seed.
- [x] Review patch: shuffle still width clamped to the side band; `shuffle.ts` re-seeds y after a ≤1px-tall layout.

**Acceptance Criteria:**
- Given a held, incomplete Challenge and a piece shuffling before any hold this visit, then `stageDecorMode` is `shuffle`; between presses, after the Brief lands, during an Attempt, or at any time after the visit has frozen once, it is `frozen`.
- Given a Stage opened already held or creating, then the Decor renders its still, never requests the three chunk, has no canvas, and no `requestAnimationFrame` call occurs over 600ms.
- Given no WebGL2 or reduced motion, then Reveal next still lands each piece with DOM motion (or a fade), the still shows, and no canvas exists.
- Given 1280×800 and 1440×900, then the still and the Decor box never intersect the safe-area column, and the layer is `aria-hidden` with `pointer-events: none`; given a phone, the layer is not rendered.
- Given lint, typecheck, unit, build, check:static, check:privacy, and e2e, then all pass.

## Implementation Notes

- 4.1 (`useRevealMotion`) and 8.4 (`src/decor`) were both already on the baseline, so `stageDecorMode` reads the real `motion.state.status` and no fallback (`shuffling: false` always) was needed.
- Deviation from the spec's literal `useRef` latch: writing `frozenThisVisit.current = true` during render trips the React Compiler's `react-hooks/refs` ESLint rule ("Cannot access/update ref during render"), confirmed by running `npm run lint`. Per the task's fallback guidance, `frozenThisVisit` is instead a `useState<boolean>` flipped with the same "adjust state while rendering" pattern `Decor.tsx`'s own `requested`/`wasShowingScene` latches and this component's `live` region state already use (`if (!frozenThisVisit && shouldFreezeVisit(...)) setFrozenThisVisit(true)`), bounded to one extra render, never an Effect. Behavior is identical: `false -> true` once, never back.
- `e2e/stage-decor.spec.ts` case 3 ("without WebGL the reveal still steps, DOM-only") cannot assert an absolute `__rafCalls === 0` "at the end" as literally written: Playwright's own `waitForFunction` polling (used by `waitForPieceToLand`, and internally by auto-retrying `expect(...)` locator assertions) is itself implemented with `requestAnimationFrame` against the same `window.requestAnimationFrame` the test's `countRaf` stub patches, so any wait before the final read inflates the count by ~30+ regardless of app behavior (confirmed by stack-tracing the calls: they resolve to Playwright's injected `UtilityScript.evaluate`, not to any app or `src/decor` code -- `src/` has no `requestAnimationFrame` caller, confirmed by grep). The test instead takes a before/after delta over a quiet `waitForTimeout(600)` window with no concurrent polling, the same technique `decor.spec.ts`'s own pre-existing RAF-loop checks and this spec's cases 1 and 6 use, and asserts the delta is `0`.
- `e2e/helpers/decor.ts` also lifts `rafCalls` and `webgl2Available` (used by both `decor.spec.ts` and `stage-decor.spec.ts`) alongside the four named stubs, to avoid a second copy; `waitForGateVerdict` stayed in `decor.spec.ts` (hero-specific, unused by the new spec).
- Case 6 ran unskipped on chromium in this environment (a real WebGL2 context is available); it is skipped on webkit/firefox as specified.
- Review patches: `shouldFreezeVisit` is `held ? revealComplete : state !== "none"`, and the StagePage latch also waits for `store.status !== "loading"`, so a full load's pre-hydration `none` never freezes the visit.
- New `DecorMode` `"idle"`: `shouldRequestScene` is unchanged (`idle !== "frozen"` requests the chunk); `DecorScene` builds the scene but `modeLoops("idle")` is false, so the loop stays off and nothing is painted before the first `shuffle` (Decor reports `loading`, the still stays at opacity 1). `idle` after a shuffle has painted holds the last frame and reports `frozen`, like `frozen`. `modeLoops` is exported from `Decor.tsx` (not from `index.ts`) so the loop rule is unit-testable without three.
- Case 6 changed with `idle`: a fresh Stage after Get a challenge now warms the scene, so it asserts `data-decor-state="loading"`, still opacity 1, flat RAF and `data-stage-frozen="false"` instead of `fallback` with no canvas.
- Deviation: the triage item "from a `savedSession` seed, Get a challenge → `true` after the new Challenge lands" cannot hold on arrival: Get a challenge lives on Setup (`/`), so the Stage mounts as a new visit already holding the new, unrevealed Challenge (`false`). The case asserts `false` on arrival and `true` once that Challenge's Brief lands.
- e2e "never `running`" (cases 3/4) uses a `MutationObserver` init script (`watchDecorRunning` in `e2e/helpers/decor.ts`) over the page's whole life rather than polling, so no Playwright RAF polling is involved.
- Case 5 now stubs no-WebGL so the still is asserted in the `fallback` state (width > 0, opacity 1); the still's width is `min(12vw, side band)` using `--spacing-safe-area-width` and `--spacing-header-inset`.

## Spec Change Log

- 2026-10-10 (overseer, on the founder's delegated authority): `shouldFreezeVisit` no longer treats `none` as frozen; the pre-hydration snapshot is `none` on every full load, which froze the layer before the first press. A fourth `DecorMode` `"idle"` warms the three chunk on a held, incomplete, never-frozen Stage so the first shuffle can be 3D.

## Review Triage Log

- [patch] **The latch fires on the pre-hydration `none` snapshot, so the layer is dead on every full load of `/stage`:** `shouldFreezeVisit` becomes `sessionState === "held" ? revealComplete : sessionState !== "none"` (`none` is not "has been held"; `stageDecorMode` already returns `frozen` for `none` by itself); flip the `none,false` unit case to `false` and add a unit test that walks `none → held(incomplete)` through the latch and expects no freeze. Spec Change Log entry below. (blind-hunter)
- [patch] **The first shuffle can never be 3D and the stars arrive between presses:** the chunk is only requested when `mode` first becomes `shuffle` (900ms window). Add a fourth `DecorMode` value `"idle"` in `src/decor` (8.4 API, owned here): requests the chunk and builds the scene but keeps `setAnimationLoop(null)`, does not paint the still away, reports state `"loading"` until the first `shuffle`; `stageDecorMode` returns `"idle"` for `held && !revealComplete && !frozenThisVisit && !shuffling`, `"shuffle"` while shuffling, else `"frozen"`. `shouldRequestScene` unchanged (`mode !== "frozen"`), so an already-held Stage still never requests the chunk. Unit tests for the new mode in `decor.test.ts` and the `stageDecorMode` table; e2e case 1/2 keep asserting no chunk on already-held/attempt Stages; add a chromium case that a fresh held-incomplete Stage (seeded `revealed: []`) on a capable device requests the chunk and settles with `data-decor-state="loading"` and a flat RAF counter. (blind-hunter)
- [patch] e2e cases 3/4 assert `data-decor-state` is never `"running"` during the press window (poll while waiting for the piece to land), not only at the end. (blind-hunter)
- [patch] Make the latch observable and verify its lifecycle: also guard the latch on `store.status !== "loading"` (belt and braces with the `none` fix), add `data-stage-frozen={frozenThisVisit}` to the stage column div (overseer approves this fourth StagePage hunk; it is a data attribute next to `data-testid`), and e2e: seeded held-incomplete reload → `"false"`; press through to the Brief → `"true"`; Reroll stays `"true"`; case 6 asserts `"false"` before any press; from a `savedSession` seed, Get a challenge → `"true"` after the new Challenge lands. (verification-gap)
- [patch] e2e: at 860×800 the shuffle Decor has computed `display: none`; at 861×800 it is `block`, the still is visible, and the still/column boxes do not intersect. (verification-gap)
- [patch] Case 5 also asserts the still has non-zero width and computed `opacity: 1` in the fallback state. (verification-gap)
- [accept] Cross-browser "no chunk" guarantee is chromium-backed (note in Verification); `-z-10` only observable by implementation check. (verification-gap)
- [patch] The shuffle still intrudes into the column on narrow-tall desktops (861–947px wide, >1020px tall): clamp its width to the side band, `w-[min(12vw,calc((100vw-var(--spacing-safe-area-width))/2-var(--spacing-header-inset)))]`, and add `{ width: 861, height: 1200 }` to the case-5 viewport table. (edge-case)
- [patch] Cases 1/2 must prove the seeded Challenge is on screen (assert the seeded Brief text visible; case 2 asserts the Attempt UI or no action row), otherwise a dropped seed composes a fresh Stage and the AD-12 assertions pass vacuously. (edge-case)
- [patch] `shuffle.ts` re-seeds star y positions when the previous layout height was ≤ 1px (0×0 → desktop remount), so stars never sit in one row after a resize. (edge-case)
- [accept] Motion toggled off mid-shuffle then on: 3D stops immediately (correct); the remount pop between presses is cosmetic. (edge-case)
- [accept] Cases 1/2 passed for the wrong reason before the latch fix; still valid after it. Layering, keep-out probe, 0×0 rule, phone action bar, latch reset semantics, helper lift, RAF-delta deviation: clean. (blind-hunter)

## Verification

**Commands:**
- `npm run lint && npm run typecheck && npm test` -- expected: clean (`logic.test.ts` includes the `stageDecorMode` and `shouldFreezeVisit` tables)
- `npm run build && npm run check:static && npm run check:privacy` -- expected: `/stage` listed as `○ (Static)`; `check:static OK`; `check:privacy OK`
- Note: the cross-browser "no three chunk" guarantee is chromium-backed: the positive-path WebGL cases (case 6 and the warm-idle case) run only on chromium; on webkit/firefox the no-chunk cases 1/2 pass but a missing WebGL2 context there would also yield no chunk.
- `E2E_PORT=3104 npm run test:e2e` -- expected: `stage-decor.spec.ts` cases 1–5 pass on chromium, webkit, firefox; case 6 passes on chromium (or is skipped with the WebGL2 probe reason, recorded here); `decor.spec.ts`, `motion.spec.ts`, `stage.spec.ts`, `reveal-motion.spec.ts`, `stable-challenge.spec.ts` unchanged and green

**Results:** (after the review patches)
- `npm run lint`: clean, 0 problems.
- `npm run typecheck`: clean, 0 errors.
- `npm test`: 51 test files passed, 957 tests passed (952 before the patches; +5: latch walk, `idle` requests the chunk, `modeLoops`, `loading` keeps the still, shuffle y re-seed).
- `npm run build`: compiled successfully; `○ /stage` (Static).
- `npm run check:static`: `check:static OK — prerendered: /, /practice, /privacy, /stage`.
- `npm run check:privacy`: `check:privacy OK — no analytics or error-monitoring SDKs.`
- `E2E_PORT=3103 npm run test:e2e` (full suite, 3 browsers): 360 tests, 352 passed, 8 skipped, 0 failed. Skips: `decor.spec.ts`'s two chromium-only WebGL cases and `stage-decor.spec.ts`'s two chromium-only WebGL cases (case 6, warm-idle), each on webkit+firefox. Both chromium WebGL cases ran unskipped here (real WebGL2).
