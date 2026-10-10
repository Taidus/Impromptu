---
title: 'Story 8.2: Journey furniture: tickers, orbit thread, chrome, and assets'
type: 'feature'
created: '2026-10-09'
status: 'done'
baseline_commit: '5dfd5a2'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-8-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** After 8.1 the journey has its grounds and copy but none of the collage furniture: no tickers at the seams, no orbit thread, no chrome pieces, no artwork in the poster cards, and no grain. The page reads as a stack, not a collage.

**Approach:** Ship the original artwork under `public/decor/` with a provenance manifest, then add the furniture as presentational components under `src/components/journey/`: `Ticker` (sun band across night/lilac at -2.4°, grape-deep band across paper/sun at 2°, real Topic and Style fragments from the library, `aria-hidden`, pause on hover and focus-within), `OrbitThread` (one 2.5px grape SVG path from the hero area through margins and gutters to the footer, never crossing text), `ChromePiece` (2–4 per screen at seams and corners, never behind text, hidden on phones), poster images in the 8.1 `PosterCard`s, and a page-wide grain overlay. A Playwright overlap check at 1280, 1440, 1920 and 390px proves no decoration intersects essential text or controls.

## Boundaries & Constraints

**Always:**
- Assets: copy the 37 files from the overseer's staging folder (listed in Code Map) into `public/decor/{artwork,chrome,textures,ornaments,cutouts}/` unchanged, plus `public/decor/manifest.json` recording for every file `{ file, group, source: "higgsfield" | "drawn", use, fallback }` (artwork, chrome, textures and cutouts are Higgsfield-generated; ornaments are drawn SVGs). Total stays about 2.1 MB; nothing is base64-inlined.
- Tickers: text in `style-italic` (add `text-style-italic` utility); fragments are Topic and Style `revealText` values read at build time from `content/library/anchors/{topics,styles}.json` and any accepted batches under `content/library/batches/*/{topics,styles}.json`, deduplicated, joined with a `chrome-burst` separator image (`alt=""`); the band is `aria-hidden="true"`; the loop is a CSS `transform` animation (`--dur-ticker` token, add to `tokens.css`) that pauses on `:hover` and `:focus-within` and is disabled under `prefers-reduced-motion: reduce`. Bands overlap both grounds by 40–120px and sit within the seam.
- Orbit thread: inline SVG `<path>` in grape, 2.5px stroke, `aria-hidden`, absolutely positioned behind content (`z-index` below text, above grounds), routed through margins and gutters; hidden on phones; no scroll-drawing animation in this story (8.3 owns motion gating; keep `stroke-dasharray` drawing as an opt-in `data-motion` hook with the thread fully drawn by default).
- Chrome: `ChromePiece({ name, className })` renders `next/image` from `public/decor/chrome/` with `alt=""`, `aria-hidden`, `shadow-lift`, positioned absolutely by the caller; place `chrome-drip` hanging from the night/lilac seam, `chrome-tribal` across lilac/paper, `chrome-sparkle` at a poster corner, `chrome-ring` rising out of the footer into sun; all `hidden desktop:block`. No bob/drift motion here (8.3).
- Posters: `PosterCard` gets `src` for `poster-eye`, `poster-hands`, `poster-still` (3:4, `next/image`, `sizes` set, alt text from `copy.journey.posters[].alt`); keep the paper-fill fallback when `src` is absent.
- Grain: one full-page overlay `div` with `background-image: url(/decor/textures/grain.png)`, `opacity: 0.1`, `mix-blend-mode: overlay`, `pointer-events: none`, `aria-hidden`, placed in `src/app/page.tsx` only (Setup page), never over the Stage.
- Overlap check: `e2e/journey-overlap.spec.ts` at 1280×800, 1440×900, 1920×1080, 390×844: for every element with `data-decor` compute its bounding box and assert it does not intersect any `h1,h2,h3,p,a,button,input,label` box that is visible; mark every decorative element with `data-decor`.
- Hero bloom (`hero-bloom-orange`) and `bust` are NOT placed here (Setup section 01 and the 02 decoration belong to the builder's hero story and 8.4); only copy the files.
- Tokens only; `next/image` for raster assets; same-origin only (AD-13).

**Never:**
- No three.js, no Decor gate (8.4). No Motion toggle (8.3). No store. No new dependencies. Do not touch `src/components/setup/`.

</frozen-after-approval>

## Code Map

- Staged assets: `/private/tmp/claude-501/-Users-taidus-Documents-Developer-Impromptu/a91ce320-0625-4840-9324-547604b6754b/scratchpad/decor/{artwork,chrome,textures,ornaments,cutouts}/` (37 files, pulled from the Cutout design-system artifact's asset store, which the founder generated with Higgsfield for this project). Copy them verbatim.
- `src/components/journey/*` (from 8.1): `Seam`, `SectionHeader`, `WhatsInAChallenge`, `FourLevels`, `PosterCard`, `ClosingCall`, `SiteFooter`; `src/app/page.tsx` composition.
- `src/styles/tokens.css`: `--shadow-lift`, `--shadow-ticker`, `--color-grape`, `--color-grape-deep`, `--color-sun*`, typography `style-italic` vars; add `text-style-italic` utility and `--dur-ticker` (e.g. 40s) under `@theme`.
- `content/library/anchors/{topics,styles}.json`, `content/library/batches/*/` (may be empty): ticker fragments source; parse with the zod schemas from `@/domain/library/schema` (allowed: `src/app` → `@/domain`; a `src/components` file may import `@/domain` too).
- `next.config.ts`: images unconfigured; local `next/image` with static imports or `/decor/...` paths needs no remote patterns.
- `e2e/journey.spec.ts` (8.1) for the pattern; Playwright config has three projects and port 3100.

## Tasks & Acceptance

**Execution:**
- [x] `public/decor/**` + `public/decor/manifest.json` -- copy assets, write manifest.
- [x] `src/styles/tokens.css` -- `text-style-italic` utility, `--dur-ticker`.
- [x] `src/components/journey/ticker-fragments.ts` -- build-time reader returning `string[]` of Topic/Style revealText from anchors and accepted batches.
- [x] `src/components/journey/Ticker.tsx` -- `variant: "sun" | "grape"`, tilt, loop, pause rules, `aria-hidden`, `data-decor`.
- [x] `src/components/journey/OrbitThread.tsx` -- SVG path, `data-decor`.
- [x] `src/components/journey/ChromePiece.tsx` -- image piece with `data-decor`.
- [x] `src/components/journey/PosterCard.tsx` -- `src`/`alt` props, `next/image`.
- [x] `src/components/journey/Grain.tsx` -- overlay.
- [x] `src/app/page.tsx` -- place tickers at the two seams, four chrome pieces, the orbit thread, grain; pass poster sources.
- [x] `src/components/journey/ticker-fragments.test.ts` -- anchors yield at least the three anchor topics and "Horror"; duplicates removed.
- [x] `e2e/journey-overlap.spec.ts` -- the overlap assertion at four viewports; tickers hidden from the accessibility tree; posters have alt text.

**Acceptance Criteria:**
- Given `/` at 1280×800, then a sun ticker crosses the night/lilac seam at -2.4° and a grape-deep ticker crosses the paper/sun seam at 2°, each carrying library fragments in style-italic and separated by chrome bursts, and neither is in the accessibility tree.
- Given hover or focus within a ticker, then its animation pauses; given reduced motion, it does not animate.
- Given desktop, then one grape orbit thread runs from the top of the page to the footer without crossing text, and two to four chrome pieces appear per screen; given a phone, they are all hidden.
- Given the three poster cards, then they show the poster artwork with alt text.
- Given the overlap e2e at 1280, 1440, 1920 and 390, then no `data-decor` element intersects visible text or controls.
- Given `public/decor/manifest.json`, then every file under `public/decor/` has an entry with its source and fallback.

## Implementation Notes

- Implemented by a Sonnet agent; review fixes by an Opus agent. The 37 assets came from the Cutout design-system artifact's asset store (the founder's Higgsfield originals), not regenerated. Verification after patches: lint, typecheck, 428 unit tests, build (static), check:static, 57 e2e (19 × 3 browsers, including the overlap sweep at four viewports, reduced motion, hover pause, phone-hidden decor and a real click under the overlays) all pass. Checked in Chrome at 1280×800: tickers, posters, chrome with drop-shadows, orbit thread, grain.

- Four chrome pieces total are placed, per this spec's list (drip, tribal, sparkle, ring); DESIGN's "2–4 per screen" is left for 8.4's hero and later furniture.

## Spec Change Log

## Review Triage Log

| # | Layer | Finding | Verdict | Evidence | Route |
|---|---|---|---|---|---|
| 1 | all three, overseer | Ticker hover pause is dead (`pointer-events-none` on the group) | medium | AC requires pause on hover; seen in code and in Chrome | patch |
| 2 | verif-gap, blind | No e2e for reduced motion, hover pause, decor hidden on phones, or a real interaction under the overlays | medium | Pre-verified by deleting classes | patch |
| 3 | edge, blind | Poster wrapper has no width; figures collapse to caption width | medium | Visible in Chrome (posters ≈190px, not 256px) | patch |
| 4 | blind, overseer | `shadow-lift` box-shadow draws rectangular plates behind transparent chrome | medium | Visible in Chrome at every seam | patch |
| 5 | blind | Grain and OrbitThread paint above content (no z-order) | low | Harmless today; one class per content column fixes it | patch |
| 6 | blind, overseer | Orbit thread is a straight line at the left edge, not routed through margins and gutters | medium | DESIGN wants winding; safe routing needs seam-aware waypoints and 8.3's motion | defer |
| 7 | blind | ChromePiece lacks `sizes` | low | Oversized srcset candidates | patch |
| 8 | blind | Stale comment in Grain | low | Delete sentence | patch |
| 9 | blind | Burst size duplicated | low | Export `CHROME_SIZE` | patch |
| 10 | blind | `tickerFragments()` runs on every render | low | Hoist to module scope | patch |
| 11 | blind | Fixed `--dur-ticker` while track grows | low | `ponytail:` note naming the ceiling | patch |
| 12 | edge, blind | `alt` not enforced with `src` on PosterCard | low | Discriminated union | patch |
| 13 | blind, edge | Four chrome pieces total vs "2–4 per screen" | low | Spec listed four; record in notes | patch |
| 14 | edge | Loop boundary jumps by half a gap | low | Put the gap inside each item | patch |
| 15 | edge | Track shorter than 2× viewport with four fragments | low | Repeat to a minimum count | patch |
| 16 | edge | Empty fragments renders an empty band | low | Return null | patch |
| 17 | edge | Burst images lazy-load mid-scroll | low | `loading="eager"` | patch |
| 18 | edge | Missing anchor files silently empty the ticker | low | Throw for the anchors dir | patch |
| 19 | edge | Retired entries and `manifest.retire` ids still shown | low | Filter | patch |
| 20 | edge | Malformed draft manifest breaks the build | low | `safeParse` | patch |
| 21 | edge | Symlinked batch dirs skipped | low | Unlikely; adds complexity | reject |
| 22 | edge | ChromePiece className optional | low | Make required | patch |
| 23 | edge | Thread could cross hero text beyond ~2500px wide | low | Covered by the z-order fix; routing deferred (#6) | reject |
| 24 | edge | Overlap selector misses li/dt/dd/figcaption | medium | Sample rows and captions unchecked | patch |
| 25 | edge | Rects measured before fonts load | low | `document.fonts.ready` | patch |
| 26 | edge | Opacity/overflow clipping not modelled in overlap check | low | Adds complexity; no current false result | reject |
| 27 | edge | "Horror" aria assertion brittle | low | Assert the ticker's own snapshot is empty | patch |
| 28 | verif-gap | Accepted/draft batch filtering untested | medium | Pre-verified; add root param + temp fixture | patch |

## Verification

**Commands:**
- `npm run lint && npm run typecheck && npm test` -- expected: clean, including the fragments test
- `npm run build && npm run check:static` -- expected: `/` static
- `npm run test:e2e` -- expected: journey, overlap, routes, privacy specs pass on three browsers
