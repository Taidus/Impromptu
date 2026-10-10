---
title: 'Shuffle and landing motion for each reveal piece'
type: 'feature'
created: '2026-10-10'
status: 'in-review'
route: 'dispatch'
review_loop_iteration: 0
story_key: '4-1-shuffle-and-landing-motion-for-each-reveal-piece'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-4-context.md'
  - '{project-root}/_bmad-output/planning-artifacts/architecture/architecture-impromptu-2026-10-08/ARCHITECTURE-SPINE.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux-designs/ux-impromptu-2026-10-08/DESIGN.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux-designs/ux-impromptu-2026-10-08/EXPERIENCE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Story 3.10 lands every Reveal piece instantly — the Stage composition exists, but a creator filming a Reveal gets no beat to react to: no shuffle, no shimmer, no material landing feel, nothing to film.

**Approach:** Add a shuffle-then-land motion state machine (`idle -> shuffling(kind) -> landing(kind) -> idle`) shared by the sun button and the Stage's keyboard fallback. A press starts the next kind shuffling through `aria-hidden` candidate flicks (~900ms, swapping only setup-allowed values), then it lands with a material-specific CSS entrance (550/420/320ms); the Brief fades in over 250ms with no shuffle. `revealed` (and the one live-region announcement) only advance once a piece's landing phase elapses — animation renders the Reveal, it never owns the progress AD-18 already defines. A press mid-shuffle force-completes the current piece at once; the next piece waits for the following press. A single-candidate Input skips the shuffle. Durations and the flick interval live in `config.reveal.motion`, not magic numbers in components.

</frozen-after-approval>

## Boundaries & Constraints

**Always:**
- Own `src/components/stage/**` (new: `reveal-motion.ts`, `useRevealMotion.ts`; additive: `pieces.tsx`, `RevealComposition.tsx`, `StagePage.tsx`) and `src/config/app.ts`, `src/styles/tokens.css` (additive). No new route, no `src/app/stage/page.tsx` change.
- Reuse the existing `revealed`/`reveal_next` session event (Story 3.4), `RevealComposition`/`pieces.tsx`/`reveal-logic.ts` (Story 3.10), the Stage's one keydown handler and one live region (`StagePage.tsx`, Stories 3.9-3.11), and `usePrefersReducedMotion` (`src/components/motion.ts`, Story 8.3) exactly as built. `dispatchSession({type:'reveal_next'})` is called from exactly one place: inside `useRevealMotion`, when a piece's landing phase elapses or a press force-completes one in flight — never from a plain press with nothing in flight.
- Candidate flicks ("the values the user's setup allows") draw from the loaded `ComposeLibrary` (`store.library`): Skill/Medium are gated by the Setup fields that actually restrict them (`skillFocus`, `medium`/`enabledMediums`); Topic/Style/Constraint fall back to every non-retired fill of that kind tag-compatible with the held Template where feasible, else every non-retired fill of that kind. Never empty.
- No new npm dependency; CSS `@keyframes`/`@utility` + React state only (no Web Animations API call needed to meet the motion budget). Every new animation utility pairs with `motion-reduce:animate-none` at its call site (matching the `SunButton`/`Ticker` precedent) — Story 4.2 owns the full reduced-motion fade, but a landing transition must not play under it regardless.

**Never:**
- No Lock toggle, Reroll, Skill-info popover, sound cue, or filming-contract/legibility check — Stories 4.3-4.7.
- No change to `src/domain/session/session-reducer.ts`, `src/store/**`, or `copy.ts`'s existing keys.
- No 3D/WebGL shuffle layer (Epic 8, Story 8.5) — this epic is DOM-only; decor stays exactly as Story 8.3 left it.
- Quick reveal's existing instant full-landing (Story 3.10) is untouched — no AC in this story asks for its own transition.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Press, multi-candidate kind | idle, `nextKind` has >1 flick candidate | Shuffles ~900ms (aria-hidden flicks), then lands over its material's duration; `revealed`/live region update only once landing elapses | N/A |
| Press, single-candidate kind (e.g. one enabled Medium) | idle, `nextKind`'s flick pool has exactly 1 candidate | Lands without a shuffle (straight to the landing phase) | N/A |
| Press during a shuffle or landing | `motion.state.status !== 'idle'` | The in-flight piece completes at once (`reveal_next` dispatched immediately); no new piece starts | N/A |
| Press with nothing left | `nextKind(challenge, revealed) === null` and idle | No-op (no action row exists to press) | N/A |
| Final press (the Brief) | `next === 'brief'` | Fades in over 250ms, never shuffles, together with any guidance line | N/A |
| Reload/navigate away mid-shuffle or mid-landing | A browser reload before the in-flight phase's timer fires | The dispatch never happened -- `revealed` is unchanged from before the press; the Stage waits for another **Reveal next** | N/A |
| A new Challenge (future Reroll) while mid-animation | `challenge.id` changes | Motion resets to idle; no stale timer from the previous Challenge fires | N/A |
| `prefers-reduced-motion: reduce` | `usePrefersReducedMotion()` true | Every press skips the shuffle (as if single-candidate); landing durations are unaffected (Story 4.2 owns the full fade) | N/A |

</frozen-after-approval>

## Code Map

- `src/config/app.ts` -- additive: `reveal.motion` (`shuffleMs`, `flickIntervalMs`, `landMs` per kind).
- `src/components/stage/reveal-motion.ts` -- new: the pure `idle -> shuffling -> landing -> idle` state machine (`startMotion`, `press`, `shuffleElapsed`, `landingDone`) and the flick candidate pool (`flickPool`, `shouldShuffle`).
- `src/components/stage/reveal-motion.test.ts` -- new: unit tests over the state machine and `flickPool`.
- `src/components/stage/useRevealMotion.ts` -- new: the hook owning the real timers, the flick tick, and the one `dispatchSession({type:'reveal_next'})` call site; shared by `StagePage`'s keydown fallback and `RevealComposition`'s sun button.
- `src/components/stage/pieces.tsx` -- additive: `MOTION_CLASS`, `ShufflingPiece` (the aria-hidden flick wrapper), and an optional `motionClassName` prop on `TicketTab`/`FoilSlip`/`InkStamp`/`TopicValue`/`BriefBlock`; `ScrapGroup`'s `ScrapPiece` gains `landing`/`shufflingText`.
- `src/components/stage/RevealComposition.tsx` -- additive: takes `motion: RevealMotion` instead of `onRevealNext`; renders each piece's empty/shuffling/landing-or-landed state from it.
- `src/components/stage/StagePage.tsx` -- additive: owns the one `useRevealMotion` instance; its keydown fallback calls `motion.press()` instead of dispatching directly.
- `src/styles/tokens.css` -- additive: `piece-land`/`piece-land-stamp`/`foil-shimmer` `@keyframes` and their `@utility` classes.
- `e2e/reveal-motion.spec.ts` -- new: shuffle-then-land, press-during-shuffle, live-region-on-landing-only, single-value Medium, reload-mid-shuffle.
- `e2e/stage.spec.ts` -- additive: a `waitForPieceToLand` helper, used wherever a press is immediately followed by a content assertion (candidate flicks can coincidentally echo the real value, e.g. Skill focus "random").
- Not touched: `src/app/stage/page.tsx`, `src/domain/session/**`, `src/store/**`, `copy.ts`'s existing keys, `src/decor/**`.

## Tasks & Acceptance

**Execution:**
- [x] `src/config/app.ts` -- add `reveal.motion` tunables
- [x] `src/components/stage/reveal-motion.ts` + `.test.ts` -- state machine + flick pool, unit-tested
- [x] `src/components/stage/useRevealMotion.ts` -- timers, reduced-motion gate, the one dispatch site
- [x] `src/components/stage/pieces.tsx` -- shuffling/landing rendering per piece, motion-reduce-guarded entrance classes
- [x] `src/components/stage/RevealComposition.tsx` -- wire `motion`, render each piece's phase
- [x] `src/components/stage/StagePage.tsx` -- own `useRevealMotion`, route the keyboard fallback through it
- [x] `src/styles/tokens.css` -- landing/shimmer keyframes and utilities
- [x] `e2e/reveal-motion.spec.ts` + `e2e/stage.spec.ts` updates

**Acceptance Criteria:**
- Given a press of **Reveal next**, when the next piece lands, then it shuffles ~900ms (aria-hidden flicks, setup-allowed values only), lands over its material's duration, and its accessible value/live-region announcement is written once, on landing; the foil shimmer runs only during its own shuffle
- Given a press during a shuffle or landing, when **Reveal next** is activated again, then the current piece completes at once and the next piece does not start until the following press
- Given an Input with only one possible value, when it is revealed, then it lands without a shuffle
- Given the final press, when the Brief arrives, then it fades in over 250ms with no shuffle, together with any guidance line
- Given `prefers-reduced-motion: reduce`, when a press occurs, then it skips the shuffle
- Given a reload mid-shuffle, when the Stage remounts, then the landed pieces are unchanged and the Stage waits for **Reveal next**

## Implementation Notes

- Implemented directly (per build-session override), no subagent dispatch.
- **The one dispatch site is timer-driven, not press-driven.** A plain press only ever starts the local `shuffling`/`landing` animation (`useRevealMotion`'s `state`); `dispatchSession({type:'reveal_next'})` fires only when a landing phase's own `setTimeout` elapses, or when a *later* press force-completes an in-flight piece. This is what makes "reload mid-shuffle keeps the landed pieces" true for free: the browser tears down before an uncommitted phase's timer can fire, so `revealed` in storage is always exactly what it was before the in-flight press.
- **The real value is already known during `landing`.** The Challenge is composed and held in full before any Reveal step runs (Story 3.4/3.6); only `revealed` gates what's shown. So a piece in its `landing` phase renders the true `challenge.inputs[kind].revealText` (or `challenge.brief`) with an entrance animation, not a placeholder — `revealed` itself, and the live-region announcement, flip a beat later when the phase's timer actually elapses. `RevealComposition` computes this per piece as `has(kind) || motion.state.status === 'landing' && motion.state.kind === kind`.
- **Candidate pools, concretely:** Skill -- every Skill when `skillFocus` is `"random"`, else that one Skill (a pin is a natural single-candidate case). Medium -- the enabled set intersected with the held Template's `mediums` where that intersection is non-empty, else the enabled set itself; a `medium` pin (not `"random"`) is a singleton. Topic/Style/Constraint -- every non-retired fill of that kind whose tags intersect the held Template's `topicTags`/`styleTags`/`constraintTags` (and isn't in `template.incompatible`), else every non-retired fill of that kind. A pool that would otherwise be empty falls back to `[challenge.inputs[kind].revealText]`, so `shouldShuffle` always has at least one candidate to compare against.
- **The production library is currently thin** (pre-Epic-2: 3 Templates, each with exactly one compatible Medium/Topic/Constraint). In practice today only Skill (Skill focus "random", 6 Skills) actually shuffles for the default Setup; Medium/Topic/Constraint land without a shuffle regardless of `enabledMediums`. This is expected, not a bug -- `flickPool`'s unit tests cover the general multi-candidate case directly with a synthetic library, and `e2e/reveal-motion.spec.ts`'s single-value-Medium test is still written against the real library's current behavior (enabling one Medium is sufficient and also already true of the default Template).
- **A real risk this surfaced in the pre-existing Story 3.10 e2e suite:** the Skill flick pool (every real Skill name) can coincidentally display the eventual landed text (e.g. "Observation") *during* the shuffle, since it's a legitimate candidate. Several `stage.spec.ts` tests asserted `page.getByText(...)` immediately after a single press, which is vulnerable to matching that coincidental flick (text content matching does not respect `aria-hidden`). Fixed by adding `waitForPieceToLand` (polls the action row's `data-motion-status` until `"idle"` or the row itself unmounts) and calling it after every press those tests make before asserting landed content. The two `data-motion-status`/`data-motion-kind` attributes on the action row (`RevealComposition.tsx`) exist for exactly this -- a deterministic alternative to racing wall-clock timing in tests.
- **Reduced motion (Story 4.2's territory) is only minimally touched here**, per the override: `useRevealMotion` reuses the existing `usePrefersReducedMotion()` (Story 8.3, `src/components/motion.ts` -- not a new hook) to force `shuffle = false` on every press, satisfying "do not break it: skip the shuffle" without building 4.2's full fade system. The landing CSS entrance still plays under reduced motion; each new utility carries `motion-reduce:animate-none` as a courtesy (matching `SunButton`/`Ticker`), but Story 4.2 is expected to revisit this with its own 120ms-fade convention.
- **Founder-level open question, resolved conservatively per CHECKPOINT 1:** the spec doesn't say whether the foil's "material feel" should literally reuse DESIGN.md's 6s background-position shimmer tuned for the whole Reveal, or something scoped to one 900ms shuffle. Chose the latter (a 900ms `filter: brightness()` pulse, scoped to `animate-foil-shimmer`), because Story 4.1's own AC text ("the foil shimmer runs only during a shuffle") is more specific than DESIGN.md's broader framing and because `filter` (not `background-position`) avoids fighting the foil's existing inline gradient `style`.
- `npm run lint`, `npm run typecheck`, `npm test` (649/649), `npm run build`, `npm run check:static`, `npm run check:privacy`, and `E2E_PORT=3105 npm run test:e2e` (237/237 across chromium/webkit/firefox) all pass clean.
- **Review patch pass (triage rows 1-9):** landing keyframes animate individual `translate`/`scale` so the inline `rotate(...)` tilt holds; land and shimmer durations come from `config.reveal.motion` via an inline `--motion-ms` variable (no CSS literals); the timer/commit scheduler moved into a pure `createMotionDriver` in `reveal-motion.ts` that commits only while `nextKind(challenge, revealed)` is still the in-flight kind, drops to idle on an external `revealed` change or new Challenge, commits on unmount mid-landing, and under reduced motion skips the shuffle and commits after `reducedLandMs` (120ms). Flick pools are setup-allowed only (Skills reachable at the held Level with an allowed Medium; fills via `isCompatible`; fallback is the real value, never `""`) -- which supersedes the candidate-pool note above and means no piece shuffles in today's thin library. Topic flick no longer remounts per tick; `useRevealMotion` returns a memoized API with a stable `press`. Tests: driver logic with fake timers, `ScrapGroup` render test via `renderToStaticMarkup`, updated `flickPool` cases, and e2e driven by a paused page clock plus `data-motion-status` (single-Medium press never reaches `shuffling`). lint, typecheck, `npm test` (700/700), build, check:static, check:privacy, and `E2E_PORT=3105 npm run test:e2e` (243/243) pass.

## Review Triage Log

| # | Layer | Finding | Verdict | Evidence | Route |
|---|---|---|---|---|---|
| 1 | blind, edge, verif-gap | Landing keyframes override inline tilt; pieces snap to their rotation at the end | medium | `@keyframes` animate `transform` on the element carrying `rotate(...)` | patch |
| 2 | edge | External `revealed` change mid-motion dispatches an untargeted `reveal_next`; stale timer on an already-landed kind | medium | Cross-tab sync / restore paths | patch |
| 3 | edge | Unmount during landing leaves the shown value uncommitted | low | Cleanup clears the timer without committing | patch |
| 4 | blind, edge | Flick pools ignore Level/enabled Mediums (Skill) and requires/excludes (fills); `[""]` fallback | medium | AD-18 "setup-allowed values only"; 6 Skills flick at Explore where 1 is composable | patch |
| 5 | blind, edge | Topic flick remounts per tick, toggling size | low | `key={shufflingText}` | patch |
| 6 | blind, edge | Durations duplicated between config and CSS | low | `landMs` vs `animate-land-*` literals | patch |
| 7 | blind | Reduced motion still waits full landing before commit | low | Value visible, announcement lags | patch |
| 8 | blind | Keydown listener re-subscribes every flick | low | Unstable hook return object | patch |
| 9 | blind, edge, verif-gap | e2e checks match aria-hidden flicks (single-Medium, mid-shuffle); Scrap shuffle rendering and hook untested | medium | Pre-verified: forcing a Medium shuffle passes | patch |
| 10 | blind | Motion ignores Quick reveal budget | false | Quick reveal lands every kind at commit (AD-18, 3.4); press motion never runs | reject |
| 11 | blind | Topic scrap switches to paper during shuffle | low | Material visible while candidates flick is intended | reject |
| 12 | verif-gap | Reduced-motion `/stage` e2e missing | low | Story 4.2 owns reduced-motion parity | defer |

## Verification

**Commands:**
- `npm run lint` -- no errors
- `npm run typecheck` -- no errors
- `npm test` -- all Vitest suites pass (649 tests), including `reveal-motion.test.ts`
- `npm run build` -- production build succeeds; `/stage` still prerendered
- `npm run check:static` -- `/stage` still listed as statically prerendered
- `npm run check:privacy` -- no analytics/error-monitoring SDKs
- `E2E_PORT=3105 npm run test:e2e` -- all Playwright specs pass (237 tests across chromium/webkit/firefox), including the new `e2e/reveal-motion.spec.ts` and the updated `e2e/stage.spec.ts`
