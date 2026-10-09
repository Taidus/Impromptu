---
title: 'Difficulty Dial and Perform timing'
type: 'feature'
created: '2026-10-09'
status: 'in-progress'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: '6a1b526148210a846b8997d93b9d4734ab2cb283'
story_key: '3-7-difficulty-dial-and-perform-timing'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-3-context.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux-designs/ux-impromptu-2026-10-08/DESIGN.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux-designs/ux-impromptu-2026-10-08/EXPERIENCE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Setup page section 01 is still a bare placeholder (`src/app/page.tsx`'s `<section id="setup">`); nothing lets a visitor set a Level or, at Perform, choose timed/untimed, and nothing yet consumes the store built in Story 3.6 (FR-1).

**Approach:** Build `src/components/setup/SetupHero.tsx` — header (brand mark + Practice link), the `h1` headline, a one-line explanation, the Difficulty Dial (one ARIA slider, four Levels), and the Perform-timing segmented control — wired to `useAppStore()`/`getAppStore().dispatchSetup()`, and swap it in for the page.tsx placeholder.

**Founder decisions (keep building, conservative defaults):**
1. No literal copy exists anywhere in planning artifacts for "the one-line explanation" (EXPERIENCE.md → Setup page sections only names it). Working copy: "Set a level, then get a challenge you can start right away." — matches Voice and Tone (direct, no fluff, no scoring language). The founder can replace it in `copy.ts` later with no code change.
2. DESIGN.md's desktop Difficulty Dial is a 160px circular disc with four labels arced above it; the phone variant is a horizontal track. Building true arc-label geometry has no visual-QA step in this story's verification list (lint/typecheck/test/build/check-static/e2e), so both breakpoints render the same horizontal four-stop track (sized up on desktop), which already satisfies every *behavioral* AC (one ARIA slider, four stops, keyboard, click-on-label, drag/touch, value text, active-label underline+star). This is a disclosed visual simplification, not a behavioral gap — `ponytail:` noted in code; a later visual-polish pass can swap in the disc without touching the keyboard/pointer/ARIA logic (`dial.ts` stays unchanged).

## Boundaries & Constraints

**Always:**
- Own only `src/components/setup/**`; in `src/app/page.tsx` replace only the `<section id="setup">` placeholder block with `<SetupHero />` (no other edit to that file, and no edit to `src/components/journey/**`).
- `SetupHero` renders the header, `h1`, and explanation immediately (static copy, not a stored value); only the Dial/Perform-timing block waits on `useAppStore()`'s `status` (AD-10: neutral placeholder while `'loading'`, a short plain message from `copy.ts` while `'error'`).
- All dial keyboard/pointer logic (arrow step, Home/End, nearest-stop-from-ratio, value-text format) lives in one pure, framework-free module (`src/components/setup/dial.ts`) so it is unit-testable in Vitest's `node` environment without a DOM.
- Every new UI string goes into `src/components/copy.ts` (AR-23); reuse `copy.journey.footer.wordmark`/`.practice` and `copy.level.*` rather than duplicating them.
- No raw hex color, `px` length, or CSS color function anywhere in `src/components/setup/**` (`scripts/check-token-usage.test.ts`); use Tailwind's default spacing/size scale or `var(--token)`.
- `set_level`/`set_perform_timing` dispatch through `getAppStore().dispatchSetup(...)`; the component never calls a domain reducer directly.

**Never:**
- No Mediums row, Skill select, Quick reveal switch, or **Get a challenge** button — Story 3.8 adds those to `SetupHero` below a one-line JSX comment marking the slot.
- No Motion toggle in the header — Story 8.3's owner builds it.
- No hero art, three.js chrome piece, or cursor-depth parallax — not this story.
- No Level suggestions, locks, or Rep-count gates (no-penalty guardrail).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Arrow step, mid-range | `levelFromKey("experiment", "ArrowRight")` | returns `"develop"` | N/A |
| Arrow step, clamped at end | `levelFromKey("perform", "ArrowRight")` or `levelFromKey("explore", "ArrowLeft")` | returns the same (unchanged) Level — no wraparound | N/A |
| Home / End | `levelFromKey(any, "Home")` / `levelFromKey(any, "End")` | returns `"explore"` / `"perform"` regardless of current value | N/A |
| Unhandled key | `levelFromKey(any, "a")` | returns `null` (caller does not call `onChange`) | N/A |
| Pointer ratio, in range | `levelFromPointerRatio(0.5)` | rounds to the nearest of the 4 stops (`"develop"`, index 2) | N/A |
| Pointer ratio, out of range | `levelFromPointerRatio(-0.4)` / `levelFromPointerRatio(1.6)` | clamps to `"explore"` / `"perform"` | N/A |
| Value text | `levelValueText("experiment", copy.level.experiment)` | `"Experiment. Try more than one way in."` | N/A |
| Store not ready | `useAppStore().status !== "ready"` | Dial/Perform-timing block renders a neutral placeholder; `h1`/header/explanation still render | N/A |
| Store error | `useAppStore().status === "error"` | Dial/Perform-timing block renders `copy.setup.loadError` instead | N/A |
| Level is not Perform | `setup.level !== "perform"` | Perform-timing control is absent from the DOM | N/A |

</frozen-after-approval>

## Code Map

- `src/app/page.tsx` -- replace the placeholder `<section id="setup">…</section>` with `<SetupHero />` (import from `@/components/setup/SetupHero`); leave every other line (the journey sections, `Seam`, `SiteFooter`) untouched.
- `src/components/copy.ts` -- add a `performTiming: {timed, untimed, either}` map and a `setup: {headline, explanation, dialLabel, performTimingLegend, loadError}` map; reuse `copy.journey.footer.wordmark`/`.practice` and `copy.level.*` (do not duplicate those strings).
- `src/components/ground.ts`, `src/components/InkButton.tsx` -- reuse `FOCUS_RING_BASE`/`focusRingClassName("night")` for the dial, the labels' focus affordance, and the header links; no change to this file.
- `src/styles/tokens.css` -- add one `@utility text-stage-mark` block (the `--typography-stage-mark-*` vars already exist from Story 3.1; no utility class consumes them yet) for the header brand mark. Follow the existing `@utility text-*` pattern exactly (see `text-display`/`text-card-title` added by Story 8.1).
- `src/store/index.ts` -- `useAppStore()` (hook, returns `StoreState`) and `getAppStore()` (singleton, `.dispatchSetup(event)`); reuse exactly as built in Story 3.6. Do not modify.
- `src/domain/session/setup-reducer.ts` -- `SetupEvent` union already has `"set_level"` and `"set_perform_timing"` variants; reuse the exact payload shapes (`{type, level}` / `{type, performTiming}`). Do not modify.
- `src/domain/session/schema.ts` -- `Setup["level"]: Level` (`"explore"|"experiment"|"develop"|"perform"`), `Setup["performTiming"]: PerformTiming` (`"timed"|"untimed"|"either"`). Do not modify.
- `src/components/journey/FourLevels.tsx` -- existing precedent for a local `LEVEL_ORDER`-style constant array and `desktop:`-prefixed responsive classes; match this style in `dial.ts`/`DifficultyDial.tsx` rather than inventing a new convention.
- `scripts/check-token-usage.test.ts` -- the guard this story's new files must pass untouched; re-read its regexes (hex/px/color-function) before writing any class string.
- `e2e/routes.spec.ts` -- its `"/"` row currently asserts the `h1` text is `"Impromptu"`; update that one row's expected text to `copy.setup.headline` since the `h1` moves into `SetupHero`. No other row changes.
- `vitest.config.mts` -- `environment: "node"`, already covers `src/**/*.test.ts`; no config change needed for `dial.test.ts`.
- `playwright.config.ts` -- `baseURL` is `http://localhost:3100`; no change needed for the new e2e spec.

## Tasks & Acceptance

**Execution:**
- [ ] `src/components/copy.ts` -- add `performTiming` and `setup` copy maps (see Code Map) -- AR-23, no hardcoded UI string
- [ ] `src/styles/tokens.css` -- add `@utility text-stage-mark` -- the header brand mark needs it; follow the existing `@utility` pattern
- [ ] `src/components/setup/dial.ts` -- pure module: `LEVELS`, `levelIndex`, `levelDisplayName`, `levelValueText`, `levelFromKey`, `levelFromPointerRatio` -- the I/O Matrix's dial logic, framework-free
- [ ] `src/components/setup/dial.test.ts` -- Vitest coverage of every I/O Matrix dial-logic row -- required by the story's verification
- [ ] `src/components/setup/DifficultyDial.tsx` -- one `role="slider"` control: keyboard (`onKeyDown` → `dial.ts`'s `levelFromKey`), pointer/drag/touch (Pointer Events → `levelFromPointerRatio`), click-on-label, `aria-valuetext` via `levelValueText`, active-label cream underline + grape star -- EXPERIENCE.md → Component Patterns → Difficulty Dial
- [ ] `src/components/setup/PerformTiming.tsx` -- native `<input type="radio">` segmented control (Timed/Untimed/Either, default Either), styled via `peer-checked:`/`peer-focus-visible:` -- native radios give Tab-enters/leaves-as-one-stop and arrow-key selection for free
- [ ] `src/components/setup/SetupHero.tsx` -- composes header, `h1`, explanation, and a `SetupControls` sub-block gated on `useAppStore().status` (placeholder / error / ready); dispatches `set_level`/`set_perform_timing` via `getAppStore().dispatchSetup(...)`; leaves a one-line JSX comment marking Story 3.8's slot -- the story's main deliverable
- [ ] `src/app/page.tsx` -- swap the placeholder section for `<SetupHero />` -- per Code Map
- [ ] `e2e/routes.spec.ts` -- update the `"/"` row's expected `h1` text -- Code Map
- [ ] `e2e/difficulty-dial.spec.ts` -- new Playwright spec: keyboard moves the dial through Home/End/Arrow and the resulting Level survives a reload -- the story's required e2e coverage

**Acceptance Criteria:**
- Given the Setup page section 01 on night, when it renders, then it shows a header with the brand mark and a Practice link, the headline "Make something unexpected." as the page `h1`, and the one-line explanation, with no account prompt or onboarding
- Given the Difficulty Dial, when operated by click on a label, drag, touch, or keyboard (arrows step, Home/End jump), then all four Levels are always selectable, the value is one ARIA slider whose value text joins the Level name and its one-liner, the description beside the dial updates, and the active label shows a cream underline and a grape star
- Given the dial is set to Perform, when the timing control appears, then it is a segmented radio group (Timed/Untimed/Either, default Either), arrows move the selection, and the choice dispatches `set_perform_timing`
- Given a reload, when the page hydrates, then the Level and timing choice are restored

## Implementation Notes

- Implemented directly (no subagent dispatch, per build-session override).
- Built `src/components/setup/dial.ts` (pure logic: `LEVELS`, `levelIndex`, `levelDisplayName`, `levelValueText`, `levelFromKey`, `levelFromPointerRatio`) + `dial.test.ts` (18 cases covering the full I/O Matrix), `src/components/setup/DifficultyDial.tsx`, `src/components/setup/PerformTiming.tsx`, and `src/components/setup/SetupHero.tsx`. Added `performTiming` and `setup` maps to `src/components/copy.ts`, and one `@utility text-stage-mark` block to `src/styles/tokens.css` (the `--typography-stage-mark-*` vars already existed from Story 3.1; no utility consumed them yet). Swapped `<SetupHero />` in for the placeholder in `src/app/page.tsx`.
- `npm run lint`, `npm run typecheck`, `npm test` (467/467, 30 files), `npm run build`, `npm run check:static`, and `npm run test:e2e` (30/30 across chromium/webkit/firefox) all pass.
- Two pre-existing e2e specs needed updates because of this story's legitimate, spec-required UI changes (not because they were wrong before):
  - `e2e/routes.spec.ts`: `/`'s `h1` text changed from "Impromptu" to `copy.setup.headline` ("Make something unexpected.") now that the `h1` lives in `SetupHero` — imported `copy` instead of hardcoding the string.
  - `e2e/journey.spec.ts` (owned by the journey/8.1 session, not touched beyond this one locator fix): the Setup header's own "Practice" link (this story's AC) made `page.getByRole("link", { name: "Practice", exact: true })` ambiguous (2 matches). Scoped that assertion to `page.getByRole("navigation", { name: "Footer" })` instead of changing what it asserts.
- Two bugs surfaced only by the e2e run, fixed in the implementation (not worth a review loopback — caught and fixed in the same pass):
  - `PerformTimingControl`'s visible `<span>` had `pointer-events-none` (defensive, unneeded): a real click still toggles the radio via native label-forwarding, but Playwright's actionability check saw the ancestor `<label>` "intercept" every click attempt and retried until timeout. Removed `pointer-events-none`; the span is itself inside the label, so clicking it directly still toggles the wrapped `<input>`.
  - The dial's four pointer-only labels (`justify-between`, no wrap) overflowed horizontally at 320px in WebKit specifically (`scrollWidth` 412 vs the 320 budget from the Accessibility Floor's reflow requirement). Added `flex-wrap` so they drop to a second line instead of forcing page-wide horizontal scroll.
- `getByRole("radio", { name: "Timed" })` in the new e2e spec needed `exact: true` — Playwright's default substring name matching made "Timed" match "Untimed" too (`"Untimed".includes("Timed")`).

## Design Notes

- **Why the dial's visual labels are `aria-hidden` and non-focusable:** EXPERIENCE.md's Difficulty Dial is "one ARIA slider" (singular) with labels that are a secondary, pointer-only activation path ("a click on a label... sets the value"). Making each label a separate focusable control would add four extra Tab stops that duplicate the slider's own keyboard interface. The labels are `aria-hidden="true"` spans that call the same `onChange` via `onPointerDown` (covers mouse, touch, and pen); the one `role="slider"` div remains the sole keyboard/AT entry point.
- **Why Perform-timing uses real `<input type="radio">`, visually hidden with `sr-only` + `peer-*`:** native same-`name` radios already give arrow-key-moves-selection and single-Tab-stop-in/out for free (EXPERIENCE.md → Component Patterns → Segmented control), so no custom `onKeyDown` is needed there, unlike the dial.

## Verification

**Commands:**
- `npm run lint` -- expected: no errors, including the `src/components` import-boundary rules
- `npm run typecheck` -- expected: no errors
- `npm test` -- expected: all existing and new Vitest suites pass, including full coverage of the dial-logic I/O Matrix
- `npm run build` -- expected: production build succeeds
- `npm run check:static` -- expected: `/` (and every other route) stays fully statically prerendered
- `npm run test:e2e` -- expected: all Playwright specs pass, including the new dial keyboard/reload spec
