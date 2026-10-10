# Epic 4 Context: The Reveal Show and a Filming-Ready Stage

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

A creator reveals a Challenge one Input at a time at their own pace, with collage motion, optional sound, and reduced-motion parity. They can Lock and Reroll, and the held Challenge sits still and legible on camera. The 3D shuffle layer is added in Epic 8; this epic is DOM-only.

## Stories

- Story 4.1: Shuffle and landing motion for each reveal piece
- Story 4.2: Reduced-motion parity for the Reveal
- Story 4.3: Lock Inputs and Reroll the rest
- Story 4.4: Name the Lock to release when nothing fits
- Story 4.5: Hold the composition still, with Skill info on request
- Story 4.6: Optional reveal sounds
- Story 4.7: Filming contract: fit rule and automated legibility checks

## Requirements & Constraints

- Skill info is shown only on request (a collapsed Info button opens a Popover; never opens on its own during or after a Reveal).
- Locking an Input and Rerolling the rest carries no penalty: no counter, limit, cost, or confirmation dialog; Locks persist with the held Challenge across a reload.
- A Reveal lands one Input at a time, in the configured order, ending with the Brief; a live region announces each landing and the pieces form a list labeled "Challenge inputs".
- Once everything is held, nothing advances on its own and all DOM motion stops; this must hold true on camera (no toast/banner/popover appears unprompted while held).
- Sound cues are optional, off by default, same-origin, and never the only signal — every event they mark is also visible and announced.
- Under `prefers-reduced-motion: reduce`, there is no shuffle, parallax, bob, ticker, shimmer, or 3D; every Input and the Brief are equally readable, identical in content/position/size to the motion version.
- Essential content (every Input, the Brief, the Time Limit, the primary action, the brand mark) stays inside the safe-area column and meets minimum type sizes (Brief ≥32px, Input values ≥24px desktop) at 1280×800, 1440×900, 1920×1080, and 390×844.

## Technical Decisions

- **AD-18 (Reveal progress is domain state; animation only renders it).** The reveal order comes from `config.reveal.order` (Skill, Medium, Topic, Style, Constraint, then Brief), skipping any slot the Template omits. The held session stores `revealed`, the set of landed kinds — it persists, so a reload resumes at the same step. `reveal_next` lands the next kind. Quick reveal (a setup preference, not an event) lands every kind at once on `challenge_committed`. A Reroll/Variation un-lands only the changed kinds; locked kinds stay landed. Animation components render from `revealed` and never invent or change it. One polite live region, owned by the Stage, announces each landed Input and the Brief. Retry commits with everything already landed, so no Reveal plays.
- **AD-19 (one config module for tunables).** `src/config/app.ts` is the only source for timing/threshold constants (e.g. `reveal.quickMaxMs`, `reveal.order`) — no magic numbers in components.
- **AD-7 (the domain owns the session state machine; one store applies it).** `toggle_lock`/`reroll` are accepted only once the reveal is complete and before `start`. The Stage's one keydown handler (AD-7) handles Esc, plus Space/Enter when no control has focus; with focus on a control, keys keep native behavior. Components dispatch commands/events and never write session state directly.
- **AD-12 (decor is an isolated, freezable, text-free layer).** The 3D shuffle layer (Epic 8) is a separate, `aria-hidden`, text-free canvas; it freezes whenever the reveal is complete or an Attempt exists. Once a Challenge has been held on a Stage visit, decor stays frozen for the rest of that visit, including during Reroll piece shuffles — those use DOM animation only. This epic's own shuffle/landing motion is DOM/CSS, independent of that layer.
- **AD-13 (no third-party runtime requests).** Sound cues are same-origin files; no third-party script, analytics, or CDN calls.

## UX & Interaction Patterns

- **Revealing (state pattern).** The current piece shuffles (~900ms of candidate flicks) then lands: scrap/tabs over 550ms, foil over 420ms, stamp over 320ms. Flicks live in an `aria-hidden` layer; the accessible value is written once, on landing. The foil shimmer (and, later, the 3D shuffle layer) run only during a shuffle — the Stage is still between presses. An Input with only one possible value lands without a shuffle. A press during a shuffle completes that piece at once and does not skip the next one. The final press brings in the Brief with a plain 250ms fade, no shuffle.
- **Reload or Resume in any state.** Restores the exact state (held Challenge, Locks, Attempt, countdown); the whole Challenge (or, Story 3.11, the already-landed part) is announced once. A mid-shuffle reload restores the pieces already landed and waits for **Reveal next** — the in-flight press is simply lost, never partially persisted.
- **Reduced motion.** No shuffle, parallax, bob, ticker, shimmer, or 3D; each piece fades in over 120ms (Story 4.2 owns this fade; Story 4.1 must not break it — it skips the shuffle under `prefers-reduced-motion: reduce` even before 4.2 lands).
- **Lock toggle (UX-DR14).** A 52px disc on the piece's outer-left edge, `aria-pressed`, shown only once held and before **Start creating**; hidden during the Reveal itself.
- **Motion budget (UX-DR22).** Shuffle ≈900ms; land 550/420/320ms per material; Quick reveal 120ms stagger, 260ms each, ≤860ms total; flicks show only setup-allowed values.
- **Sound cues (UX-DR23).** Paper drop (scrap), sticker slap (foil), stamp thump (stamp), soft tick (tabs), one soft chime for Time's up; off by default; independent of reduced motion (cues still play on landing when sound is on).
- **Inline message (UX-DR27).** Vermilion dot, `aria-describedby`, polite — used for the Lock-conflict "no challenge fits these locks" case (Story 4.4).
- **Focus targets (UX-DR31).** Reroll keeps focus on itself; an unlock moves focus to Reroll; Stage-open focuses the sun button.
- **Filming contract (UX-DR34, UX-DR20).** Checks run at 1280×800, 1440×900, 1920×1080, and 390×844; a fit-rule cascade (compact gaps → Topic long-form → countdown caption inline → countdown phone size → scroll) keeps the held composition inside the safe area without ever going below the type minimums.
- **Photosensitivity.** Shuffle flicks swap text only — no full-area luminance change — and stay under 3 flashes per second at any size; a PEAT (or equivalent) check is part of design sign-off.

## Cross-Story Dependencies

- Builds directly on Epic 3's Reveal composition (Story 3.10: `RevealComposition`, `pieces.tsx`, `reveal-logic.ts`, the Stage's one live region and keydown handler in `StagePage.tsx`) and its reload/restore stability (Story 3.11). Those stories land every piece **instantly**; this epic adds the motion on top of the same structure without changing when/what `revealed` or the live region contain.
- Story 4.1's shuffle/landing state machine and timing constants are the foundation Story 4.2 (reduced motion) refines, Story 4.3 (Reroll) reuses for the changed-kinds reshuffle, Story 4.5 (hold-still) checks against, and Story 4.6 (sound) attaches cues to.
- The 3D shuffle layer (Epic 8, Story 8.5) is a separate visual layer added later; this epic's motion is DOM-only and must not assume or require it.
