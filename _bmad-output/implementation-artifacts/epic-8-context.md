# Epic 8 Context: The Setup Journey and 3D Decor

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

The landing page becomes a full collage journey below the existing setup stack — four grounds (night → lilac → paper → sun), returning to night at a footer — carrying tickers, poster cards, an orbit thread, chrome/cutout decoration, a Motion toggle, and a three.js hero piece on `/`, plus a matching freezable three.js shuffle layer behind the Challenge Stage. All of it is progressive (static fallback first, 3D only when a capability gate passes) and all ambient motion stops permanently once a Challenge is held, so the page feels alive without ever slowing setup or disturbing a filmed Reveal.

## Stories

- Story 8.1: Setup journey sections 02–04 and the night footer
- Story 8.2: Journey furniture: tickers, orbit thread, chrome, and assets
- Story 8.3: Motion toggle and ambient motion control
- Story 8.4: Decor component, gate, and the 3D hero
- Story 8.5: The 3D shuffle layer on the Stage and the freeze rule

## Requirements & Constraints

- All ambient and decorative motion (tickers, chrome, cursor depth, 3D) must stop permanently once a Challenge is held and stay stopped while creating; this is the single most important invariant for this epic.
- Decoration must never cover instructions or controls; essential text stays horizontal; no fine texture sits behind essential text; this is checked automatically (Playwright overlap check) at 1280, 1440, 1920, and 390px.
- Desktop (≥1280px) is the primary target; everything must still work at a 320px floor. Phones (≤860px) collapse the journey to one column with a small gutter, hide posters/chrome/orbit thread, and keep tickers but static.
- Performance budget: setup interactive within 2s on a mid-range laptop/broadband and 3s on a mid-range phone/4G; the three.js chunk is never on the critical path and loads progressively; a 2D static fallback is required whenever 3D is unavailable or reduced motion is requested.
- Accessibility: decorative pieces (tickers, chrome, orbit thread, 3D canvas) are `aria-hidden`; tickers pause on hover and on focus-within (never hover-only affordances); all state (locked, on/off, muted) must be conveyed by glyph/word, never color alone; 52px touch targets; 200% zoom and 320px reflow without horizontal scroll.
- Images: poster images carry alt text; all other decorative images are `aria-hidden`; all artwork is original (Higgsfield-generated or drawn) — reference posters set direction only, never ship as-is.
- No third-party runtime requests anywhere: fonts are self-hosted via `next/font/google`, no analytics/tracking scripts, only same-origin fetches.
- Banned patterns relevant here: no auto-advance, no pop-ups, no hover-only affordances, no confirmation dialogs on routine actions.

## Technical Decisions

- **Decor contract (AD-12):** `src/decor` exports one Client Component, `<Decor scene="hero"|"shuffle" mode="ambient"|"shuffle"|"frozen" />`. It renders the static fallback from `public/decor/` immediately. A tiny gate module (imports no three.js) runs after mount and must pass before the three.js scene loads via `next/dynamic` with `ssr:false`; plain three.js is used, not React Three Fiber (rejected for v1).
- **Gate conditions (superset, per Cross-Document Resolution 6):** WebGL2 context creatable, `prefers-reduced-motion` not `reduce`, Motion toggle on, and device not low-power (`deviceMemory ≤ 4`, `hardwareConcurrency ≤ 4`, or `saveData`). Any failure keeps the static fallback.
- **Freeze behavior:** `mode="frozen"` calls `renderer.setAnimationLoop(null)` and keeps the last frame; the loop also stops on `document.hidden`; all GPU resources are disposed on unmount. On `/stage`, once a Challenge has been held during a visit, decor stays frozen for the rest of that visit, including during Reroll/Variation piece shuffles (those use DOM animation only).
- **Containment:** the canvas is `aria-hidden`, `pointer-events:none`, positioned outside the safe-area column, and never renders text. On `/`, the hero stays `ambient` even while an Attempt exists elsewhere in the app.
- **Import boundaries (AD-2):** `src/decor` imports nothing from `src/domain`, `src/store`, or `src/adapters` — enforced by `no-restricted-imports`; this must still pass after adding three.js and `@types/three` (pinned to three `0.186.1`).
- **Motion toggle persistence (Cross-Document Resolution 5):** `ambientMotion: boolean` is added to the `Setup` schema and `config.setup.defaults` (default `true`); `prefers-reduced-motion: reduce` always wins regardless of the toggle's stored value.
- **Toggle scope (Cross-Document Resolution 7):** the Motion toggle lives only in the Setup and Practice headers, never on the Stage — Stage motion is owned entirely by the shuffle/freeze rule, not a user-facing switch.
- Routes stay fixed per AD-1: `/` is landing+setup (static prerendered), `/stage` is the Challenge Stage; no new server code or routes are introduced by this epic.

## UX & Interaction Patterns

- Setup page is a vertical journey of grounds, each fading across a 120–260px seam (never butted edges): 01 night hero (already built, out of scope here) → sun ticker → 02 lilac "what's in a challenge." (a static labeled sample of the five Inputs + Brief, next to the six Skill descriptions) → 03 paper "four levels, all open." (four Level one-liners matching the dial + three poster cards staggered 0/90/40px: reveal/make/reflect) → grape ticker → 04 sun "reveal. make. again." with a second **Get a challenge** (reads **Resume** while an Attempt exists) → night footer (email signup night variant, Practice/Privacy links, "Your progress is saved in this browser only.", cream wordmark).
- Journey furniture: tickers carry real Topic/Style library fragments, `aria-hidden`, pause on hover and focus-within; one 2.5px grape orbit thread runs from the hero orbit ring to the footer, never crossing text; 2–4 chrome/cutout pieces per screen (never behind text, hidden on phones); the asset manifest (`public/decor/manifest.json`) records source (Higgsfield or drawn) for every asset, each with a DESIGN-specified fallback when missing.
- Motion toggle visual: a line button reading "MOTION ON"/"MOTION OFF" with a play/pause glyph and `aria-pressed`, in the Setup/Practice headers only.
- Cursor-driven parallax (hero only, never on the Stage): layers move at depth values of -12px (far/sun discs), 10px (type), 22px (hero art), 40px (chrome), eased over 900ms; the three.js piece takes the nearest depth.
- Stage motion ownership: piece shuffles and the three.js shuffle layer (behind/around the safe-area column, outside it) run only during Reveal shuffles and stop permanently once held; under reduced motion or missing WebGL, the shuffle degrades to DOM-only motion with nothing on the Stage depending on the 3D layer.
- Visual acceptance bar (pre-launch check) includes: Bodoni Moda on reveal words, grape/sun-gradient as signatures, at least two Y2K accents (chrome, stars, orbit line) on setup, all motion settled once held, and zero decoration/text overlap at 1280/1440/1920/390px.

## Cross-Story Dependencies

- Epic 8 builds on the Setup page and Difficulty Dial from Epic 3 and the Reveal/Stage mechanics from Epic 4; it cannot start until those routes and components exist.
- Story 8.4 (Decor component + gate + 3D hero) must land before Story 8.5, which reuses the same `<Decor>` component and gate logic for the Stage's `scene="shuffle"` mode.
- Story 8.3 (Motion toggle, `ambientMotion` in the Setup schema) should land before or alongside 8.4/8.5, since the gate in AD-12 checks the Motion toggle's state.
- Story 8.1's footer reuses the night email signup variant built in Epic 7 (Story 7.2); Epic 7's Stage-side signup card is placed on `/stage` separately and is not part of this epic.
- Epic 9 (Launch Readiness) depends on this epic's completion for its responsive matrix, performance budget, and PRD §6 visual acceptance checks.
