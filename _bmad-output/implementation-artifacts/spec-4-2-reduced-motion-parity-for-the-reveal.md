---
title: 'Reduced-motion parity for the Reveal'
type: 'feature'
created: '2026-10-10'
status: 'in-progress'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: '05b19107ceb16410958bfdd1fc2f3c4d7f79db28'
story_key: '4-2-reduced-motion-parity-for-the-reveal'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-4-context.md'
  - '{project-root}/_bmad-output/planning-artifacts/architecture/architecture-impromptu-2026-10-08/ARCHITECTURE-SPINE.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux-designs/ux-impromptu-2026-10-08/EXPERIENCE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Story 4.1's shuffle/landing motion already forces `shuffle: false` and a 120ms commit timer under `prefers-reduced-motion: reduce` (AD-18's single source, `usePrefersReducedMotion` in `src/components/motion.ts`), but every landing CSS entrance still carries `motion-reduce:animate-none` — so a reduced-motion user sees pieces snap in with no transition at all, and Quick reveal's instant full landing (which plays no entrance in either motion mode) never fades either. Neither matches EXPERIENCE.md's "Reduced motion: … Pieces fade in over 120ms."

**Approach:** Add one plain opacity `reduced-fade` keyframe/utility (`src/styles/tokens.css`) and swap every material's `motion-reduce:animate-none` for `motion-reduce:animate-reduced-fade`, so a piece's own `landing`-phase entrance fades instead of snapping. Give every already-revealed piece that never goes through `landing` (Quick reveal's instant full commit, and any later re-render once a manual landing has committed) the same fade class on its first mount via a new `REVEALED_MOTION` constant in `pieces.tsx`, so Quick reveal "uses the same fade" too. `landingMotion(kind, reduced)` picks `config.reveal.motion.reducedLandMs` (already 120ms) instead of the material's own duration when reduced. No new hook: `usePrefersReducedMotion` (Story 8.3) stays the one source — `useRevealMotion` now also returns it (reactive) for `RevealComposition`/`ScrapGroup` to pass through.

</frozen-after-approval>

## Code Map

- `src/components/motion.ts` -- `usePrefersReducedMotion()` (Story 8.3) is reused as-is, unchanged; the single source (AR-23).
- `src/components/stage/reveal-motion.ts` -- Story 4.1 already forces `shuffle: false` and `phaseMs` → `reducedLandMs` (120ms) under reduced motion (`createMotionDriver`'s `press()`/`phaseMs`); untouched. "No shuffle, no foil shimmer" are already true for free (shimmer only renders mid-shuffle, which never happens).
- `src/components/stage/useRevealMotion.ts` -- added `usePrefersReducedMotion()` (reactive) and exposed `reduced` on the returned `RevealMotion`.
- `src/components/stage/pieces.tsx` -- `LAND_CLASS` swapped to `motion-reduce:animate-reduced-fade`; `landingMotion(kind, reduced)` now takes the reduced flag; new `REVEALED_MOTION` export for the "revealed outside `landing`" case; `ScrapGroup` takes an optional `reduced` prop (default `false`, so Story 4.1's existing render tests are untouched).
- `src/components/stage/RevealComposition.tsx` -- `tab()`/`BriefBlock`/`ScrapGroup` call sites pass `motion.reduced` and use `REVEALED_MOTION` instead of `undefined` once a piece is revealed outside its own `landing` window.
- `src/styles/tokens.css` -- new `@keyframes reduced-fade` + `@utility animate-reduced-fade` (opacity only -- never moves or resizes anything).
- Not touched: `src/domain/session/**`, `src/store/**`, `copy.ts`, sound (Story 4.6), Lock/Reroll (Story 4.3 owns further edits to `RevealComposition.tsx`/`pieces.tsx` -- this story's edits there are additive motion-class plumbing only).

## Tasks & Acceptance

**Execution:**
- [x] `src/styles/tokens.css` -- `reduced-fade` keyframes + utility
- [x] `src/components/stage/pieces.tsx` -- `REVEALED_MOTION`, `landingMotion(kind, reduced)`, `ScrapGroup`'s `reduced` prop
- [x] `src/components/stage/useRevealMotion.ts` -- expose `reduced` on `RevealMotion`
- [x] `src/components/stage/RevealComposition.tsx` -- thread `reduced` through every piece/`ScrapGroup`/Brief call site
- [x] `src/components/stage/reveal-motion.test.ts` -- unit coverage for `landingMotion`/`REVEALED_MOTION` duration and class selection
- [x] `e2e/reduced-motion.spec.ts` -- new: no-shuffle, present+announced, layout parity vs. the motion version, fade-not-material-transition

**Acceptance Criteria:**
- Given `prefers-reduced-motion: reduce`, when any piece lands (manual reveal or Quick reveal's instant commit), then there is no shuffle, no foil shimmer, no stamp thump, and the piece fades in over 120ms
- Given a fully revealed Challenge under reduced motion, when compared to the same Challenge revealed without it, then every Input, its label, and the Brief are identical in content, position, and size
- Given a keyboard reveal under reduced motion, then `data-motion-status` never reaches `"shuffling"`, and each landed Input and the Brief are present and announced via the Stage's live region

## Implementation Notes

- Implemented directly (per build-session override), no subagent dispatch.
- **Resolved open question (CHECKPOINT 1, most conservative reading):** the AC's "Quick reveal uses the same fade" is ambiguous between "the whole Quick-reveal batch fades once" and "each piece still gets its own 120ms fade, just all starting together." Chose the latter: `REVEALED_MOTION` is per-piece (not a single wrapper fade), so it composes for free with the existing per-piece rendering in `RevealComposition`/`ScrapGroup` and keeps "each piece fades in over 120ms" literally true for every piece regardless of path, with no new Quick-reveal-specific code.
- `landingMotion`'s and `REVEALED_MOTION`'s classes never include `animate-none`; `SHIMMER_MOTION` already carried `motion-reduce:animate-none` from Story 4.1 and needed no change (shimmer only renders mid-shuffle, which reduced motion already prevents).
- The opacity-only `reduced-fade` keyframe guarantees the position/size-parity AC by construction -- nothing it animates affects layout.
- `npm run lint`, `npm run typecheck`, `npm test` (856/856), `npm run build`, `npm run check:static`, and `E2E_PORT=3107 npm run test:e2e` (255/255 across chromium/webkit/firefox) all pass clean. One pre-existing, unrelated flake reproduced in isolation as a pass (`journey-overlap.spec.ts`'s webkit hover-pause ticker test, not touched by this story).

## Verification

**Commands:**
- `npm run lint` -- no errors
- `npm run typecheck` -- no errors
- `npm test` -- all Vitest suites pass (856 tests), including new `landingMotion`/`REVEALED_MOTION`/`ScrapGroup` reduced-motion cases
- `npm run build` -- production build succeeds; `/stage` still prerendered
- `npm run check:static` -- `/stage` still listed as statically prerendered
- `E2E_PORT=3107 npm run test:e2e` -- all Playwright specs pass (255 tests across chromium/webkit/firefox), including the new `e2e/reduced-motion.spec.ts`
