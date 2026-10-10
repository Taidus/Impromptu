---
title: 'Story 8.5: The 3D shuffle layer on the Stage and the freeze rule'
type: 'feature'
created: '2026-10-10'
status: 'in-progress'
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
- `src/components/stage/logic.ts`: `export interface StageDecorInput { sessionState: SessionState; revealComplete: boolean; shuffling: boolean; frozenThisVisit: boolean }`; `export function stageDecorMode(input: StageDecorInput): Extract<DecorMode, "shuffle" | "frozen">` returns `"shuffle"` iff `sessionState === "held" && !revealComplete && !frozenThisVisit && shuffling`, else `"frozen"`; `export function shouldFreezeVisit(sessionState: SessionState, revealComplete: boolean): boolean` = `sessionState !== "held" || revealComplete` (`"none"` counts as frozen too: nothing to animate before a Challenge exists). `revealComplete` is `revealed.includes("brief")` (the Brief is last in `config.reveal.order`). Import the `DecorMode` type from `@/decor` (allowed for `src/components`).
- `src/components/stage/StagePage.tsx`: `const frozenThisVisit = useRef(false); if (shouldFreezeVisit(store.session.state, revealComplete)) frozenThisVisit.current = true;` (a latch read during render is fine; it only ever goes `false → true` and the next render re-derives the same mode); `const decorMode = stageDecorMode({ sessionState: store.session.state, revealComplete, shuffling: motion.state.status === "shuffling", frozenThisVisit: frozenThisVisit.current })`; render `<Decor scene="shuffle" mode={decorMode} className="fixed inset-0 -z-10 hidden desktop:block" />` directly after the existing lilac-deep fade `div` (same `-z-10` inside the root's `relative isolate`, so it paints over the fade and under the column: DESIGN layering ground → decoration and 3D → content). Add `data-testid="stage-column"` to the `div.flex.w-safe-area-width…` column so the e2e can measure it. No other StagePage change.
- The latch survives Reroll (4.3) and Variation (5.8) by construction: those keep `state === "held"` with a complete reveal, so `frozenThisVisit` is already `true`; their piece shuffles are 4.1's DOM animation and never flip the mode. A reload or a fresh navigation to `/stage` is a new visit (the ref resets), which AD-12 allows.
- Phones and mid-size: `hidden desktop:block` (861px+). At 861px the side bands are about 205px each; the keep-out margin from `config.decor.shuffle` keeps stars out of the column at any width. Nothing on the Stage depends on the layer (NFR-7).
- Unit tests, `src/components/stage/logic.test.ts`: `stageDecorMode` table — held + incomplete + shuffling + not frozen → `shuffle`; the same with `shuffling: false` → `frozen` (between presses the Stage is still, EXPERIENCE → Revealing); `revealComplete: true` → `frozen` even when shuffling; `frozenThisVisit: true` → `frozen` even when shuffling; each of `none`, `attempt`, `finished`, `saved` → `frozen`. `shouldFreezeVisit`: `held,false → false`; `held,true → true`; `attempt,false → true`; `none,false → true`.
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
- [ ] `src/components/stage/logic.ts` + `logic.test.ts` -- `stageDecorMode`, `shouldFreezeVisit`, the tables above.
- [ ] `src/components/stage/StagePage.tsx` -- the `frozenThisVisit` latch, `decorMode`, `<Decor scene="shuffle" …>`, `data-testid="stage-column"`.
- [ ] `e2e/helpers/decor.ts` -- lift the 8.4 stubs; update `e2e/decor.spec.ts` imports.
- [ ] `e2e/stage-decor.spec.ts` -- cases 1–6.
- [ ] `_bmad-output/implementation-artifacts/deferred-work.md` -- the shuffle-observation entry.

**Acceptance Criteria:**
- Given a held, incomplete Challenge and a piece shuffling before any hold this visit, then `stageDecorMode` is `shuffle`; between presses, after the Brief lands, during an Attempt, or at any time after the visit has frozen once, it is `frozen`.
- Given a Stage opened already held or creating, then the Decor renders its still, never requests the three chunk, has no canvas, and no `requestAnimationFrame` call occurs over 600ms.
- Given no WebGL2 or reduced motion, then Reveal next still lands each piece with DOM motion (or a fade), the still shows, and no canvas exists.
- Given 1280×800 and 1440×900, then the still and the Decor box never intersect the safe-area column, and the layer is `aria-hidden` with `pointer-events: none`; given a phone, the layer is not rendered.
- Given lint, typecheck, unit, build, check:static, check:privacy, and e2e, then all pass.

## Implementation Notes

## Spec Change Log

## Review Triage Log

## Verification

**Commands:**
- `npm run lint && npm run typecheck && npm test` -- expected: clean (`logic.test.ts` includes the `stageDecorMode` and `shouldFreezeVisit` tables)
- `npm run build && npm run check:static && npm run check:privacy` -- expected: `/stage` listed as `○ (Static)`; `check:static OK`; `check:privacy OK`
- `E2E_PORT=3104 npm run test:e2e` -- expected: `stage-decor.spec.ts` cases 1–5 pass on chromium, webkit, firefox; case 6 passes on chromium (or is skipped with the WebGL2 probe reason, recorded here); `decor.spec.ts`, `motion.spec.ts`, `stage.spec.ts`, `reveal-motion.spec.ts`, `stable-challenge.spec.ts` unchanged and green

**Results:**
