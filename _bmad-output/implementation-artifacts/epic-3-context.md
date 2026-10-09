# Epic 3 Context: Get a Challenge

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

A visitor configures Level, Mediums, and Skill focus on the landing page, taps **Get a challenge**, and gets a valid, stable Challenge on its own Challenge Stage page. The Challenge survives reloads and navigation, and setup persists in the browser (no account). In this epic, reveal pieces land instantly; Epic 4 adds the theatrical shuffle/landing motion on top of the same state.

## Stories

- Story 3.1: Design tokens, fonts, and base action components
- Story 3.2: Setup and session schemas and the setup reducer
- Story 3.3: Compose a Challenge from setup, Locks, and the recent window
- Story 3.4: Session reducer for commits and reveal progress
- Story 3.5: Versioned browser storage with a memory fallback
- Story 3.6: The app store and the library loader
- Story 3.7: Difficulty Dial and Perform timing
- Story 3.8: Mediums, Skill focus, Quick reveal, and Get a challenge
- Story 3.9: The Challenge Stage page shell
- Story 3.10: Challenge composition and stepping through the Reveal
- Story 3.11: A stable Challenge across navigation and reload

## Requirements & Constraints

- Difficulty Dial selects Level (Explore/Experiment/Develop/Perform); all four always selectable, keyboard+pointer+touch, current value announced; no suggestions/gating. Perform adds a Timed/Untimed/Either choice (default Either).
- Enable one or more Mediums; pick one or Random; generator never uses a disabled Medium; last enabled Medium can't be disabled (explained inline); default all on, Random.
- Optional Skill focus (pick or Random) with an info control explaining each Skill; never shown during the Reveal unless asked.
- Setup (Level, timing, Mediums, Skill focus, Quick reveal, sound, ambient motion) persists across reloads; no account/sign-in/email ever required.
- Every reachable Challenge is compatible (no contradictions) and renders a standalone Brief; avoid repeats within the last 30 Challenges when an alternative exists.
- A revealed Challenge is stable: changes only on explicit Reroll/Get a challenge; survives reload and a return trip to setup; setup edits apply only to the next Challenge.
- Quick reveal shows the whole Challenge in one transition ≤ 1s (`config.reveal.quickMaxMs`).
- Browser storage is versioned; app still works (challenges still generate) if storage is unavailable, with a banner explaining history won't be kept.
- The Stage is its own page/route, with a visible "back to setup" control and Esc-to-setup when no Attempt is running; only step-relevant controls show.
- Accessibility floor (WCAG 2.1 AA): every control keyboard-operable with visible focus; verified contrast pairs; no state conveyed by color alone; Reveal steps announced to screen readers.
- Desktop-first responsive: ≥1280px primary target, works down to 320px.

## Technical Decisions

- Layering/import boundaries (already enforced by ESLint from Story 1.2): `src/domain` (pure, no `window`/`localStorage`/`Date.now`/`Math.random`/`crypto`) → `ports.ts` → `src/adapters` → `src/store` → `src/shared` → `src/app`/`src/components` → `src/decor`/`src/server`.
- One `compose(request, library, recent, random)` in `src/domain/compose` handles new/Reroll/Variation/"Change it again" via `locks`/`mustDiffer`; returns `{ok:true, challenge}` or `{ok:false, reason:'no_compatible', blockingLock}`. Only the store command layer calls it; components never call `compose()` directly or pass a Challenge in an event payload.
- Immutable Challenge snapshot and Rep/Export zod schemas live in `src/domain/session/schema.ts`; types come only from `z.infer`.
- Pure session reducer + one store (`setup`, `session`, `history` slices) built on `useSyncExternalStore`; one Stage-level key handler (Esc always; Space/Enter only when no control has focus, per Cross-Doc Resolution 3 below).
- Repository (`src/adapters/storage`) is the only module touching `localStorage`; keys `impromptu:setup|session|history`; envelope `{v, rev, data}`; forward-only migrations; memory fallback on probe failure; cross-tab sync via `storage` events.
- No stored state in first render: store reports `status: 'loading'|'ready'`; components render neutral placeholders until ready, then hydrate.
- Recent ring: last 30 `templateId+topicId` keys, pushed on `challenge_committed` only (not on Retry).
- Reveal progress is domain state (`revealed` set + `config.reveal.order`: skill, medium, topic, style, constraint, then brief); Quick reveal lands all kinds on commit.
- One config module `src/config/app.ts` holds `generator.recentWindow`, `reveal.quickMaxMs`, `reveal.order`, `setup.defaults`, `reflection.maxChars`, `storage.schemaVersions`, `signup.consentTextVersion`.
- Conventions: one copy map `src/components/copy.ts` for all UI strings; `{ok,reason}` result shapes; Tailwind v4 tokens in `src/styles/tokens.css`, no raw hex colors or px font sizes in `src/components`; `usePrefersReducedMotion` hook for motion gating; Vitest colocated `*.test.ts`.
- Cross-Doc Resolution (Motion toggle): add `ambientMotion: boolean` to the `Setup` schema and `config.setup.defaults` (default `true`; `prefers-reduced-motion: reduce` always wins). Motion toggle never appears on the Stage (Stage motion only runs during shuffles and freezes when held — Epic 4 concern).

## UX & Interaction Patterns

- No dark mode; `prefers-color-scheme` changes nothing. Four fixed grounds: night, lilac (incl. the Challenge Stage), paper, sun. Grain overlay at 0.1 opacity, suppressed inside the Stage safe area and behind essential text.
- Three self-hosted font families via `next/font/google` with `display: swap`, no third-party origin requests: Bodoni Moda (400–900 + italic, editorial/reveal words), Unbounded (200–900, Y2K labels/buttons/stamps/countdown), Instrument Sans (400–700, reading voice: Briefs, body, forms). Stage renders after Bodoni + Instrument load (100ms max wait, then swap).
- Base action components (visual in DESIGN.md → Components → Actions, behavior in EXPERIENCE.md → Component Patterns): **Sun button** (one primary action per view, sun-gradient pill, relabels per Stage step while keeping focus, never disabled during a Reveal step); **Ink button** (secondary strong action, solid ink pill); **Line button** (quiet actions: Reroll, Discard, Pause/Resume); **Stage icon button** (52px circle, back + sound, sound shows state via glyph + "SOUND OFF/ON" caption, never color-only). All are native `<button>`, ≥52px target, focus ring 2px/3px-offset colored per ground (`focus` on night/lilac/paper, `focus-on-sun` on sun stops, `focus-on-lilac-deep` on lilac-deep; never on `night-glow`).
- Full token set (colors, typography roles, radii, spacing, component specs, shadows) is captured verbatim in DESIGN.md's YAML front matter — read it directly rather than re-deriving values; it is authoritative over the prose below it.
- Voice: direct, one instruction per step, no motivational fluff; headlines are lowercase fragments ending in a full stop; buttons are verbs; never mention streaks/missed days/quality judgments. Working copy (Level one-liners, Skill descriptions, button/state strings) seeds `src/components/copy.ts`.
- Setup page is a journey (night → lilac → paper → sun → night footer), each section its own ground; the Challenge Stage is the one held, still exception. Stage safe-area column width `{spacing.safe-area-width}`; back/sound sit in viewport corners outside it.

## Cross-Story Dependencies

- Story 3.1's tokens, fonts, and action components are a prerequisite for every later UI story in this epic (3.7–3.11) and for Epic 4/5/8 UI.
- Story 3.2's schemas and setup reducer are required by 3.3 (compose), 3.5 (Repository envelopes), and 3.6 (store slices).
- Story 3.3's `compose()` depends on Epic 1's library schema, `isCompatible()`, and `render()`.
- Story 3.4's session reducer depends on 3.2's schemas and feeds 3.6's store and 3.9–3.11's Stage behavior.
- Story 3.5 (storage) and Story 3.3 (compose) are both prerequisites for Story 3.6 (the store), which 3.7–3.11 all read/write through.
- Story 3.9 (Stage shell) must exist before 3.10 (reveal stepping) and 3.11 (stability across navigation/reload) can be verified end-to-end.
