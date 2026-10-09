---
title: 'Story 8.1: Setup journey sections 02–04 and the night footer'
type: 'feature'
created: '2026-10-09'
status: 'done'
baseline_commit: '79caa67'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-8-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The Setup page is a placeholder. Below section 01 (built by Stories 3.7–3.11 as `SetupHero`), first-time visitors need the explanation journey: what is in a Challenge, the four Levels and the loop, a closing call, and the night footer that every page shares.

**Approach:** Build the journey as presentational components under `src/components/journey/`: `SectionHeader`, `WhatsInAChallenge` (02, lilac), `FourLevels` (03, paper, three `PosterCard`s), `ClosingCall` (04, sun), `Seam` (ground fade), and `SiteFooter` (night; also used by `/privacy` and later `/practice`). `src/app/page.tsx` becomes a thin composition: a `<section id="setup">` placeholder for `SetupHero` (owned by the builder session; keep the existing `h1`), then the journey sections and footer. All copy lives in `copy.ts`.

## Boundaries & Constraints

**Always:**
- Grounds and type per DESIGN: 02 lilac (text plum), 03 paper (text ink), 04 sun (text ink; the headline in `y2k-display` grape-deep), footer night (text cream, secondary cream-dim). Headlines are lowercase fragments ending in a full stop, in `display-setup` (phone: `display-phone`) with the second line italic where there are two lines.
- Section header: numbered meta line left (`02 — IMPROMPTU`), hairline rule with two diamonds and a centre circle (inline SVG, `aria-hidden`), three-line meta stack right (working copy; see Design Notes).
- 02 content: static labelled sample of the five Inputs and the Brief for CL-5 anchor 2 read from `content/library/anchors/*.json` at build time (Skill Expression, Medium Photography, Topic "Coming home", Constraint "No people", no Style; Brief in `brief-setup`), beside the six Skill descriptions from `copy.skill` with the Skill names from `content/library/skills.json`.
- 03 content: four Level one-liners from `copy.level` (same strings the dial uses) and three `PosterCard`s titled "reveal.", "make.", "reflect." with the last word in vermilion italic (`card-title`), staggered 0 / 90 / 40px on desktop, 2px frame, `rounded-scrap`, poster shadow, poster `<img>` with alt text; until Story 8.2 adds artwork, the image slot is a paper fill (`bg-paper`) with the alt text rendered visually hidden.
- 04: one `y2k-display` line "reveal. make. again." and a second Get a challenge as an `InkButton` on sun. Presentational: `ClosingCall({ label, href })` with `label` defaulting to `copy.button.getAChallenge` and `href="/stage"`; the Resume wiring comes with Story 3.6.
- Seams: adjacent grounds never butt; a `Seam` element fades between them with a height clamped between `--spacing-seam-fade-min` (120px) and `--spacing-seam-fade-max` (260px), tokens added to `tokens.css`. Gradients use the two ground tokens only.
- Footer: night; left the `EmailSignup variant="night"`; right the Practice and Privacy links (`text-meta` uppercase cream, focus ring per `ground.ts`) and `copy.state.progressSavedInBrowserOnly` in cream-dim; the cream wordmark "impromptu" in `display` typography. Rendered on `/` and `/privacy` (replace the privacy page's inline back link? No: keep it; add the footer below the article).
- Phones (≤ 860px, i.e. below the `desktop:` variant): one column, `px-gutter-phone`, posters hidden, no horizontal scroll at 320px (`overflow-wrap: anywhere` on long text, no fixed widths).
- Desktop: content column `max-w-content-max` with `desktop:px-14`; 02 and 03 are two-column at `desktop:`.
- Tokens only (no raw hex/px in `src/components`; `check-token-usage.test.ts` enforces). Reuse `FOCUS_RING_BASE` / `focusRingClassName` from `ground.ts`.
- Reduced motion: no motion is introduced in this story (tickers, tilt and arrival effects are 8.2/8.3).

**Never:**
- No tickers, orbit thread, chrome, grain, or 3D (8.2, 8.4). No Motion toggle or Setup header (8.3). No store or state; nothing reads `localStorage`.
- Do not create `src/components/setup/` or `SetupHero` (builder session owns them). Do not touch `_bmad/`, planning artifacts, or ESLint/CI config.
- No new dependencies.

</frozen-after-approval>

## Code Map

- `src/app/page.tsx` -- placeholder `main` with one `h1`; becomes the composition. Keep `h1` text "Impromptu" inside `<section id="setup">` so `e2e/routes.spec.ts` still passes.
- `src/app/privacy/page.tsx` -- paper page from 7.3; append `<SiteFooter />` after the `<article>` (inside `main` or after it; keep one `h1`).
- `src/components/copy.ts` -- `copy.level`, `copy.skill`, `copy.button.getAChallenge`, `copy.state.progressSavedInBrowserOnly`, `copy.signup.*`, `copy.privacy.title` exist; add `copy.journey.*` (section titles, meta stacks, poster titles, closing line, footer links, wordmark).
- `src/components/EmailSignup.tsx` -- `variant="night"` ready for the footer.
- `src/components/InkButton.tsx` -- `ground="sun"` and `"night"` supported; `ComponentProps<"button">`. For a link-shaped button use `next/link` wrapping styled like the button or render `<a>` with the same classes: follow `InkButton`'s class list, do not fork its styles.
- `src/components/ground.ts` -- `Ground` includes `sun`, `lilac`, `paper`, `night`; focus-ring helpers.
- `src/styles/tokens.css` -- `@theme` colors (night, lilac, paper, sun, sun-deep, sun-light, cream, cream-dim, plum, ink, vermilion, grape-deep), spacing (`gutter-phone`, `content-max`, `reading-max`, `header-inset`), `--breakpoint-desktop: 861px`, `@utility` roles `text-display-setup`, `text-display-phone`, `text-lede`, `text-body`, `text-meta`, `text-button`, `text-label`; typography vars for `display`, `card-title`, `y2k-display`, `brief-setup`, `caps-intro`, `index-number` exist but have no utilities yet: add `text-display`, `text-card-title`, `text-y2k-display`, `text-brief-setup` utilities in the same form.
- `content/library/anchors/{anchors,templates,topics,constraints}.json` and `content/library/skills.json`, `mediums.json` -- static data; import with `resolveJsonModule` (server component, build time). `src/app` may import `@/domain/library/schema` types if needed; do not import `@/adapters`.
- `scripts/check-token-usage.test.ts` -- scans `src/components/**` for raw hex/px/color functions.
- `e2e/routes.spec.ts` -- asserts `/` has `h1` "Impromptu"; `e2e/privacy.spec.ts` asserts the privacy page's links and title.

## Tasks & Acceptance

**Execution:**
- [x] `src/styles/tokens.css` -- add `--spacing-seam-fade-min: 120px`, `--spacing-seam-fade-max: 260px`; `@utility` for `text-display`, `text-card-title`, `text-y2k-display`, `text-brief-setup`.
- [x] `src/components/copy.ts` -- `copy.journey` with: section numbers/titles (`"what's in a challenge."`, `"four levels, all open."`), the meta stacks, Input labels (SKILL, MEDIUM, TOPIC, STYLE, CONSTRAINT, BRIEF), poster titles, `closing: "reveal. make. again."`, footer link labels (`Practice`, `Privacy`), `wordmark: "impromptu"`.
- [x] `src/components/journey/SectionHeader.tsx` -- number, title, ornament SVG, meta stack; `ground` prop for text colors.
- [x] `src/components/journey/Seam.tsx` -- `from`/`to` ground props → gradient band with clamped height.
- [x] `src/components/journey/WhatsInAChallenge.tsx` -- lilac section: sample composition (labelled values + Brief) and the six Skills list.
- [x] `src/components/journey/PosterCard.tsx` and `FourLevels.tsx` -- paper section: Level one-liners list and the three staggered posters (hidden below `desktop:`).
- [x] `src/components/journey/ClosingCall.tsx` -- sun section with the Y2K line and the ink link-button (`label`, `href` props).
- [x] `src/components/journey/SiteFooter.tsx` -- night footer with `EmailSignup`, links, storage note, wordmark.
- [x] `src/app/page.tsx` -- composition: `<section id="setup">` placeholder (keep `h1`), `Seam night→lilac`, 02, `Seam lilac→paper`, 03, `Seam paper→sun`, 04, `Seam sun→night`, `SiteFooter`.
- [x] `src/app/privacy/page.tsx` -- append `SiteFooter`.
- [x] `src/components/journey/journey.test.ts` -- unit test that the anchor-2 sample resolves (template, medium, topic, constraint found; rendered Brief equals the anchor's `expectedBrief` via `@/domain/library/render`) and that `copy.journey` poster titles end with a full stop.
- [x] `e2e/journey.spec.ts` -- on `/`: the three section headlines are visible, the sample Brief text equals anchor 2's `expectedBrief`, the closing link points to `/stage`, the footer has the Practice and Privacy links and the signup email field; at 320×800 viewport `document.documentElement.scrollWidth <= 320`; posters hidden at 390px and visible at 1280px.

**Acceptance Criteria:**
- Given `/` at 1280×800, when it renders, then sections 02 (lilac), 03 (paper), 04 (sun) and the night footer appear in order below the setup placeholder, each with a lowercase headline ending in a full stop, separated by fading seams with no hard ground edge.
- Given 02, then the sample shows Skill "Expression", Medium "Photography", Topic "Coming home", Constraint "No people", no Style slot, and the Brief "Take two photos of coming home. Make one feel comforting and the other lonely. Keep people out of both." in the `brief-setup` role, beside six Skill descriptions.
- Given 03, then the four Level one-liners equal `copy.level.*` and three poster cards titled reveal. / make. / reflect. are staggered 0/90/40px on desktop and hidden on phones.
- Given 04, then the Y2K line reads "reveal. make. again." in grape-deep on sun and the ink button links to `/stage` with the Get a challenge label.
- Given the footer on `/` and `/privacy`, then it holds the night signup form, Practice and Privacy links, the storage note, and the cream wordmark.
- Given a 320px-wide viewport, then there is no horizontal scroll and all text wraps.
- Given `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, `npm run check:static`, `npm run test:e2e`, then all pass; `/` stays statically prerendered.

## Implementation Notes

- Implemented by a Sonnet agent; review fixes by an Opus agent (founder model policy).
- Deviation: `content/library/*.json` is read with `node:fs` at module load in `sample.ts` (server-only, build time) because the lint rule bans every `../` import under `src/` and `content/` has no alias. Recorded; a `@content/*` tsconfig alias was proposed in review and rejected as a refactor beyond a direct correction.
- `inkButtonClassName(ground, disabled)` is exported from `InkButton.tsx` so the sun link-button in 04 shares its styles.
- `text-y2k-display` font-size is `min(token, 16vw)` so the closing line never breaks a word on phones; the footer wordmark uses the display-phone/display ramp.
- `SectionHeader` only for 02 and 03; 04's headline is the Y2K line itself. `copy.journey.closingMeta` removed as unused.
- Posters are paper-fill placeholders with `aria-hidden` until 8.2 supplies artwork (assets already staged by the overseer).
- Verified in Chrome at 1280×800: seams fade, Bodoni headlines, Unbounded meta, staggered posters, grape-deep Y2K line on sun, night footer with the signup form and wordmark.
- Verification after patches: lint, typecheck, 313 unit tests, build (static), check:static, 24 e2e all pass.

## Spec Change Log

## Review Triage Log

| # | Layer | Finding | Verdict | Evidence | Route |
|---|---|---|---|---|---|
| 1 | edge | `anchors[1]` may be undefined | low | One guard line; data currently has 3 rows | patch |
| 2 | edge | `constraintId!` non-null assertion hides a null | low | One guard line | patch |
| 3 | edge | `styleId` ignored (hardcoded `style: null`) | low | Resolve the style when present | patch |
| 4 | edge, blind, verif-gap | Skill copy key mapping is cast and untested; renders empty on a miss | medium | Pre-verified by renaming an id: tests stay green | patch |
| 5 | edge | e2e "Get a challenge" link will match twice once SetupHero lands | medium | Playwright strict mode | patch |
| 6 | blind | Footer inside `<main>` on `/` loses the contentinfo landmark | medium | `/privacy` does it right | patch |
| 7 | blind | Ornament diamonds/circle distorted by `preserveAspectRatio="none"` | low | Visible in screenshots at 1280 | patch |
| 8 | blind | "Second line italic" not applied | false | Titles are single authored fragments; wrapped lines are not authored second lines | reject |
| 9 | blind, verif-gap | ClosingCall forks InkButton's class list | medium | Spec forbade forking; drift risk | patch |
| 10 | blind | Wordmark and Y2K line break mid-word at 320px | medium | `break-all`; 112px/92px type in 280px column | patch |
| 11 | blind | PosterCard title announced twice | low | sr-only alt + figcaption | patch |
| 12 | blind | Storage note inside `<nav>` | low | Read as navigation | patch |
| 13 | blind | Prefer a `@content/*` tsconfig alias over fs reads | low | Works today, build-time only; alias is a refactor beyond a direct correction | reject |
| 14 | blind | `GROUND_VAR` map unnecessary | low | Inline style is not scanned by Tailwind | patch |
| 15 | blind, verif-gap | Dead copy (`closingMeta`, `inputs.style`); `aspect-[3/4]` vs `aspect-3/4` | low | Deletions | patch |
| 16 | verif-gap | Skill descriptions and Level one-liners unverified | medium | Pre-verified | patch |
| 17 | verif-gap | Footer on `/privacy` untested | medium | Pre-verified | patch |
| 18 | verif-gap | Seam gradient untested | low | Pre-verified; one markup test | patch |
| 19 | verif-gap | Level names rendered from ids, not copy | low | Ids are stable tokens used as labels; cosmetic | reject |

## Design Notes

- Working copy for the three-line meta stacks (right side of each section header), lowercase meta, one phrase per line: 02 `inputs · levels · brief` / `one challenge` / `every time`; 03 `explore · experiment` / `develop · perform` / `all open`; 04 `reveal` / `make` / `again`. Founder may replace later; keep them in `copy.journey`.
- Sample composition in 02 is plain labelled rows (label in `text-meta`, value in `text-lede` serif where DESIGN uses display type for reveal words: Topic in `card-title`), not the Stage pieces; the Stage collage pieces arrive in Epics 3–4.
- Poster image slot: `aspect-[3/4]`, `bg-paper` fill, `<img>` omitted until 8.2 supplies files; render the alt text in an `sr-only` span so screen readers get the poster name now.

## Verification

**Commands:**
- `npm run lint` -- expected: clean
- `npm run typecheck` -- expected: clean
- `npm test` -- expected: all pass including `journey.test.ts` and the token guard
- `npm run build && npm run check:static` -- expected: `/` and `/privacy` static
- `npm run test:e2e` -- expected: `journey.spec.ts`, `routes.spec.ts`, `privacy.spec.ts` pass on all three browsers
