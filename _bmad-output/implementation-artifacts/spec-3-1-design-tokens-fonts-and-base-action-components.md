---
title: 'Design tokens, fonts, and base action components'
type: 'feature'
created: '2026-10-09'
status: 'in-progress'
route: 'dispatch'
review_loop_iteration: 0
context: []
baseline_commit: '4518307a414e701c12864257206d9604c8495338'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The app has only Tailwind's default starter theme and no design system; nothing on screen reads as Impromptu yet, so no later Setup/Stage story has tokens, fonts, or primitive buttons to build on.

**Approach:** Transcribe DESIGN.md's token front matter into a Tailwind v4 `@theme` stylesheet, self-host the three brand fonts via `next/font/google`, build the four base Action components (Sun/Ink/Line/Stage-icon button) from those tokens, seed `copy.ts` with the working voice strings, and add a guard that fails if `src/components` ever hardcodes a raw hex color or px length instead of a token.

## Boundaries & Constraints

**Always:** Every value in `src/styles/tokens.css` comes verbatim from DESIGN.md's YAML front matter (colors, typography roles including the Stage + phone ramp, `rounded.*`, the 8 named spacings the AC lists, the five Elevation & Depth shadows). Components use only token-backed Tailwind utilities or `var(--token)` — never a literal hex or `px` string. All four buttons are native `<button>` elements, ≥52px target (`min-h-target-min`/`min-w-target-min`), with a 2px/`{spacing.focus-offset}` focus ring whose color is a `ground` prop (`night`/`lilac`/`paper` → `focus`; `sun` → `focus-on-sun`; `lilac-deep` → `focus-on-lilac-deep`). Fonts load through `next/font/google` with `display: 'swap'` and the DESIGN fallback stacks; no third-party font request. `prefers-color-scheme` must not change any color (no dark mode) — remove the starter's dark-mode block.

**Never:** No page redesign (Setup/Stage layout is Stories 3.7–3.11). No new npm dependency. No `seam-fade-min/max` or `stage-brief-max-chars` tokens — out of the AC's named-spacing list; `stage-brief-max-chars` is a content cap for the library gate, not a CSS token. No Tailwind `--font-*`/`--text-*`/`--font-weight-*` namespace mapping for the 45 typography roles (collision-prone and unused this story) — define them as plain `--typography-{role}-*` custom properties instead, and only materialize ready-to-use `.text-button`/`.text-button-sun`/`.text-stage-meta` classes for the three roles the four components actually consume.

</frozen-after-approval>

## Code Map

- `src/app/globals.css` — currently the create-next-app starter theme (background/foreground vars + dark-mode media query). Replace its body with `@import "tailwindcss";` + `@import "../styles/tokens.css";`, a neutral `body` (paper ground, ink text, Instrument Sans default), and no dark-mode block.
- `src/app/layout.tsx` — root layout; add the three font `variable` classNames to `<html>` alongside existing `antialiased`.
- `eslint.config.mjs` — `layer(["src/components"], [...,"styles"], ...)` already permits `src/components` → `@/styles`; no change needed.
- `vitest.config.mts` — `include` already covers `scripts/**/*.test.ts`; new guard test needs no config change.
- `scripts/check-static.mjs`, `scripts/check-privacy.mjs` — existing precedent for small standalone repo guards; the new token guard follows the same spirit but as a colocated Vitest test (simpler, already wired into `npm test`/CI).
- `src/config/app.ts`, `src/domain/ports.ts` — unrelated to this story; do not touch.
- `src/components/.gitkeep`, `src/styles/.gitkeep` — delete once each directory has real files.

## Tasks & Acceptance

**Execution:**
- [x] `src/styles/tokens.css` -- new file: `@theme { … }` block with every DESIGN color (`--color-*`), `--radius-none/scrap/full/disc`, the 5 shadows (`--shadow-lift-soft/lift/poster/sun-glow/ticker`), and the 8 AC-named spacings (`--spacing-safe-area-width/target-min/stage-gap/stage-gap-compact/focus-offset/gutter-phone/header-inset/content-max`) -- single source of truth; colors/radius/shadow/spacing land in Tailwind's theme namespaces so components use plain utilities (`bg-ink`, `rounded-disc`, `shadow-lift`, `min-h-target-min`). Verified by a one-off script diffing every value against DESIGN.md's front matter — all match.
- [x] `src/styles/tokens.css` -- append every typography role from DESIGN.md as `--typography-{role}-family/size/weight/leading/tracking` custom properties, plus three consumable classes `.text-button`, `.text-button-sun`, and `.text-stage-meta` built from those vars -- gives every later story the full ramp without inventing unused Tailwind utility collisions now.
- [x] `src/app/fonts.ts` -- new file: `Bodoni_Moda`, `Unbounded`, `Instrument_Sans`, each variable (no `weight` — `weight: '400 900'`-style range strings are not valid for `next/font/google`'s variable-font types; omitting it serves the full axis, which is the default), `Bodoni_Moda` additionally `style: ['normal','italic']`, fallbacks per DESIGN.md, all `display: 'swap'` with a `variable` name each -- self-hosted, no Google network request.
- [x] `src/app/layout.tsx` -- apply the three `.variable` classes to `<html>` -- makes `var(--font-bodoni-moda|unbounded|instrument-sans)` available everywhere, including inside `tokens.css`'s typography vars.
- [x] `src/app/globals.css` -- rewrite per Code Map -- removes the unthemed starter and the dark-mode block.
- [x] `src/components/copy.ts` -- new file: a single `copy` object seeded from EXPERIENCE → Voice and Tone (4 Level one-liners, 6 Skill descriptions, the core button labels already named across Epic 3/4/5 ACs, and the literal state strings quoted in the Do/Don't table) -- the one copy map AR-23 requires; later stories add entries here, never inline strings.
- [x] `src/components/SunButton.tsx`, `InkButton.tsx`, `LineButton.tsx`, `StageIconButton.tsx` -- new native-`<button>` components per DESIGN → Components → Actions, each accepting a `ground` prop for focus-ring color and standard `disabled`/`onClick`/`children` props; `StageIconButton` additionally takes `icon` + visible caption text -- the four reusable primitives every later Setup/Stage story composes. (Shared `ground`/focus-ring/text-color mapping factored into `src/components/ground.ts` to keep all four consistent.)
- [x] `scripts/check-token-usage.test.ts` -- new Vitest test: read every `src/components/**/*.{ts,tsx}` file (skip `*.test.ts`), strip comments, and fail if the remaining code matches a raw hex color (`/#[0-9a-fA-F]{3,8}\b/`) or a raw px length (`/\b\d+(\.\d+)?px\b/`) -- the AC's "lint or test fails on raw hex/px" guard, enforced on every `npm test`/CI run.

**Acceptance Criteria:**
- Given `src/styles/tokens.css`, when it is read, then every color, typography role (incl. Stage + phone ramp), radius, the 8 AC spacings, and the 5 shadows from DESIGN.md are present with the exact DESIGN.md values.
- Given the four Action components, when each renders on its documented ground, then it is a native `<button>` with a ≥52px target and a focus-ring color matching that ground's token.
- Given `scripts/check-token-usage.test.ts`, when a hex or px literal is added to any `src/components/*.tsx`, then the test fails.
- Given the app, when it loads, then the browser's network panel shows no request to `fonts.googleapis.com`/`fonts.gstatic.com`.

## Implementation Notes

- Decision (conservative, no founder question needed): DESIGN.md documents hover/press states explicitly for Sun, Ink, and Line buttons but not for Stage icon button. Implemented Stage icon button's hover/press as an 8%-opacity fill of its own `plum-muted` border color (mirroring Line button's documented hover rule), since that is the nearest documented analog and introduces no new token.
- `stage-brief-max-chars` and `seam-fade-min/max` intentionally omitted from `tokens.css` — not in this story's AC list; add them in the story that first consumes them (library gate config and the journey-seam components, respectively).
- Added `src/components/ground.ts` (not pre-planned) to hold the shared `Ground` type, the per-ground focus-ring class table, the per-ground text-color class table, and the common focus-ring base classes — avoids repeating the same three lookups across all four button files.
- `next/font/google` rejects range strings like `weight: '400 900'` for variable fonts (TS error: not assignable to the font's literal weight union); omitting `weight` already serves the full variable axis, which is what the AC wants, so no behavior was lost.
- A font fallback entry quoted with embedded `"` (e.g. `'"Bodoni 72"'`) breaks `next/font`'s generated inline-style string at build time; pass fallback names unquoted (`"Bodoni 72"`) and let the loader quote them.
- A CSS block comment containing a literal `*/` substring inside explanatory prose (e.g. writing `--font-*/--text-*`) closes the comment early and corrupts the rest of the stylesheet; avoided by writing out namespace names instead of using `*/`-style globs in comments.
- Verification: `npm run lint`, `npm run typecheck`, `npm test` (30/30 passing, including the new guard), and `npm run build` (all 5 routes still statically prerendered, confirmed via `npm run check:static`) all pass clean.

## Verification

**Commands:**
- `npm run lint` -- expected: no ESLint errors (including the existing import-boundary rules).
- `npm run typecheck` -- expected: `tsc --noEmit` passes.
- `npm test` -- expected: all Vitest tests pass, including the new token-usage guard.
- `npm run build` -- expected: `next build` succeeds with every route still statically prerendered.

**Manual checks (if no CLI):**
- Open the built app and confirm no dark-mode shift when the OS color scheme is toggled.
