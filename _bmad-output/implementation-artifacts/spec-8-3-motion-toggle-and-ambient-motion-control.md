---
title: 'Story 8.3: Motion toggle and ambient motion control'
type: 'feature'
created: '2026-10-09'
status: 'in-progress'
baseline_commit: 'ce44c36'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-8-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Ambient motion (today the two tickers; later chrome bob, orbit drawing, poster tilt and the 3D hero) has no user switch. WCAG 2.2.2 and UX-DR10 require one control that stops it all and stays off; `prefers-reduced-motion` must always win.

**Approach:** Add a `MotionToggle` button ("MOTION ON" / "MOTION OFF", play or pause glyph, `aria-pressed`) that reads and writes `setup.ambientMotion` through the store, and one `useAmbientMotion()` hook that resolves the effective value (`setup.ambientMotion && !prefersReducedMotion`) and mirrors it as `data-motion="on|off"` on `<html>`. A single stylesheet rule under `:root[data-motion="off"]` stops every ambient animation (today `.animate-ticker`); later furniture keys off the same attribute. The Setup header moves out of `SetupHero` into `src/components/journey/SetupHeader.tsx` (brand mark with the grape star, Practice link, Motion toggle), rendered from `page.tsx` above `<SetupHero />`; the 6.1 `PracticeHeader` gets the same toggle. The Stage never shows it.

## Boundaries & Constraints

**Always:**
- One `usePrefersReducedMotion()` hook (`src/components/motion.ts`, `matchMedia("(prefers-reduced-motion: reduce)")`, server snapshot `false`) and one `useAmbientMotion()` returning `{ ambientMotion, effective, reduced, set(value) }` over `useAppStore()` + `getAppStore().dispatchSetup({ type: "set_ambient_motion", ambientMotion })`. The hook sets `document.documentElement.dataset.motion` in an effect; before hydration the attribute is absent (motion runs, matching today's behaviour).
- Default: `config.setup.defaults.ambientMotion` is `true`; with reduced motion the effective value is `false` regardless, the toggle reads MOTION OFF, is `aria-pressed="false"` and `disabled` with a `title` from copy explaining the system setting (reduced motion always wins, AD-19).
- `MotionToggle` is a `LineButton`-styled small control in `text-meta` with an inline SVG play (on) or pause (off) glyph, `aria-pressed`, label text from `copy.motion.on` / `copy.motion.off`; the visible text is the accessible name. Before the store is ready it renders disabled with MOTION ON (neutral, AD-10) and never flashes OFF.
- `SetupHeader` (client): night band, `px-gutter-phone desktop:px-14`, content column `max-w-content-max`, `relative z-10`; left the brand mark link (wordmark + grape `✦`, as in 3.7's `SetupHero` `Header`), right the Practice link and the toggle in `text-meta` cream. Remove the `Header` from `SetupHero.tsx` and reduce its top padding so the hero's headline sits where it did (`pt-6 desktop:pt-8` instead of `pt-16 desktop:pt-20`); no other SetupHero change.
- `PracticeHeader` gains the toggle on the right of its band (wrap mark/back/title column and the toggle in a `flex justify-between items-start`).
- `tokens.css`: `:root[data-motion="off"] .animate-ticker { animation: none; }` plus a comment that every ambient animation utility added later must be listed under this selector.
- Tests: unit (`renderToStaticMarkup`) for `MotionToggle` on/off/disabled markup and the hook's effective-value logic (pure helper `effectiveMotion(ambientMotion, reduced)`); e2e `e2e/motion.spec.ts`: on `/` the toggle reads MOTION ON with `aria-pressed=true`, the sun ticker track animates; click → MOTION OFF, `aria-pressed=false`, `html[data-motion="off"]`, track `animationName === "none"`; reload → still OFF (persisted); `/practice` shows the toggle; `/stage` has no toggle; with `emulateMedia({ reducedMotion: "reduce" })` the toggle is disabled and reads MOTION OFF.
- Keep e2e stable: scope "Practice" link locators to `banner` or the footer as 3.7 did.

**Never:**
- No three.js or static 3D fallback (8.4). No new motion. No change to the store API beyond dispatching the existing `set_ambient_motion`. Do not touch ESLint/CI config. No new dependencies.

</frozen-after-approval>

## Code Map

- `src/components/setup/SetupHero.tsx` (3.7) -- client; `Header()` with wordmark + `✦` and Practice link; section `pt-16 pb-28 desktop:pt-20`. Only the header removal and padding change are allowed here.
- `src/app/page.tsx` -- composition; insert `<SetupHeader />` before `<SetupHero />` inside `<main>`.
- `src/components/practice/PracticeHeader.tsx` (6.1) -- night band with mark, back link, h1.
- `src/store/index.ts` -- `useAppStore()`, `getAppStore()`; `src/domain/session/setup-reducer.ts` -- `set_ambient_motion` event; `src/config/app.ts` -- defaults.
- `src/components/LineButton.tsx`, `ground.ts` -- button styles and focus helpers; `src/components/copy.ts` -- add `copy.motion = { on: "MOTION ON", off: "MOTION OFF", reducedTitle: "Your system asks for reduced motion, so ambient motion stays off." }`.
- `src/styles/tokens.css` -- `animate-ticker` utility (8.2); add the `data-motion` rule next to it.
- `src/components/journey/Ticker.tsx` -- the only ambient animation today (`.animate-ticker`).
- `e2e/journey-overlap.spec.ts` (8.2) -- has the reduced-motion and hover patterns to copy; `e2e/practice.spec.ts`, `e2e/stage.spec.ts` -- page patterns.

## Tasks & Acceptance

**Execution:**
- [ ] `src/components/copy.ts` -- `copy.motion`.
- [ ] `src/components/motion.ts` -- `effectiveMotion`, `usePrefersReducedMotion`, `useAmbientMotion` (sets `data-motion`).
- [ ] `src/components/MotionToggle.tsx` -- the button.
- [ ] `src/components/journey/SetupHeader.tsx` -- header band with mark, Practice link, toggle.
- [ ] `src/components/setup/SetupHero.tsx` -- remove `Header`, adjust top padding.
- [ ] `src/app/page.tsx` -- render `SetupHeader` above `SetupHero`.
- [ ] `src/components/practice/PracticeHeader.tsx` -- add the toggle.
- [ ] `src/styles/tokens.css` -- `:root[data-motion="off"]` rule.
- [ ] `src/components/motion.test.ts` -- `effectiveMotion` and toggle markup cases.
- [ ] `e2e/motion.spec.ts` -- the scenarios above; update any existing spec that counted Practice links or the header.

**Acceptance Criteria:**
- Given `/` or `/practice`, then the header shows a MOTION ON/OFF button with a play or pause glyph and `aria-pressed`, defaulting on unless the system requests reduced motion.
- Given the toggle set to off, then `html[data-motion="off"]` is present, the tickers do not animate, and the choice persists across reload via `setup.ambientMotion`.
- Given `prefers-reduced-motion: reduce`, then motion is off and the toggle is disabled and reads MOTION OFF.
- Given `/stage`, then no Motion toggle is rendered.
- Given lint, typecheck, unit, build, check:static and e2e, then all pass.

## Implementation Notes

## Spec Change Log

## Review Triage Log

## Verification

**Commands:**
- `npm run lint && npm run typecheck && npm test` -- expected: clean
- `npm run build && npm run check:static` -- expected: all pages static
- `npm run test:e2e` -- expected: motion, journey, overlap, practice, stage, routes, privacy specs pass on three browsers
