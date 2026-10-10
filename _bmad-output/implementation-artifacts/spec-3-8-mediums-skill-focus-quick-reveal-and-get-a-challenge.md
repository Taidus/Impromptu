---
title: 'Mediums, Skill focus, Quick reveal, and Get a challenge'
type: 'feature'
created: '2026-10-09'
status: 'in-review'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: '6a601f01c08885fa78491ca3374b304a3576ce50'
story_key: '3-8-mediums-skill-focus-quick-reveal-and-get-a-challenge'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-3-context.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux-designs/ux-impromptu-2026-10-08/DESIGN.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux-designs/ux-impromptu-2026-10-08/EXPERIENCE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Setup section 01 stops at the Difficulty Dial (Story 3.7's slot comment in `SetupHero.tsx`); nothing lets a visitor pick Mediums, a Skill focus, Quick reveal, or actually get a Challenge (FR-2, FR-3, FR-4, FR-14).

**Approach:** Fill that slot with a Mediums chip row, "This time"/Skill `<select>`s plus a Skill-info popover, a Quick reveal switch, and the sun **Get a challenge** button — all reading Medium/Skill names from the library already loaded by the store (NFR-6), dispatched through `getAppStore().dispatchSetup()`/`.dispatch()`.

**Founder decisions (keep building, conservative defaults):**
1. The store's `StoreState` (Story 3.6, done) never exposed the loaded library to components — only `compose()` used it internally. Minimal, necessary extension: add `library: ComposeLibrary | null` to `StoreState` (set once in `onLibraryReady`), so this story's components can read `.mediums`/`.skills` without a new type or duplicated fetch. No other `StoreState`/`Store` shape changes.
2. The Skill info Popover shows all six Skills' `info` (a glossary), not just the currently-selected one — the AC's "each Skill's one-sentence info" reads as plural on purpose, and a glossary needs no sync with the select's value.
3. Story 8.2 (landed on `main` after this branch was cut) wraps the page in decorative layers (Ticker, ChromePiece, OrbitThread, Grain) behind a `relative` ancestor; `SetupHero`'s content column gets `relative z-10` so it stays on top once merged. `pb-28` on the hero stays, so the seam ticker never overlaps **Get a challenge**.

## Boundaries & Constraints

**Always:**
- Own only `src/components/setup/**` plus the slot in `SetupHero.tsx`/`SetupControls()`; the one `StoreState`/`store.ts` extension in founder decision 1 is the sole file outside `src/components/setup/**`.
- Medium/Skill display names and Skill `info` come only from `state.library.mediums`/`.skills` (the loaded library) — never a hardcoded string (NFR-6).
- Every new UI string goes into `copy.ts`; reuse `copy.state.keepAtLeastOneMediumOn` and `copy.button.getAChallenge` rather than duplicating them.
- No raw hex color, `px` length, or CSS color function in `src/components/setup/**` (`scripts/check-token-usage.test.ts`).
- All new dispatches go through `getAppStore().dispatchSetup(...)` / `.dispatch({type:"new_challenge"})`; components never call a domain reducer to mutate state (prediction-only reads of pure derived booleans are fine).
- The new Mediums/Selects/Switch/Get-a-challenge block renders only once `state.library !== null` (mirrors the Dial's `status==='ready'` gating one level deeper, since `libraryStatus` can still be `'loading'` on a returning visit); it reserves height so hydration doesn't shift the page.

**Never:**
- No edits to `src/components/journey/**` or `src/components/stage/**` (including `ClosingCall.tsx`, which keeps its own plain `/stage` link — out of scope).
- No Motion toggle, hero art, or three.js chrome — not this story.
- **Get a challenge** never composes a second time on `/stage`; Story 3.9's own "compose if nothing held" check is left as the only other producer.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Medium select options | `mediumSelectOptions(mediums, ['med.b','med.a'], "Random")` | `[Random, med.a, med.b]` — library order, not insertion order | N/A |
| Medium select excludes disabled | `mediumSelectOptions(mediums, ['med.a'], "Random")` | `[Random, med.a]` only | N/A |
| Skill select options | `skillSelectOptions(skills, "Random")` | `[Random, ...all six Skills in library order]` | N/A |
| Last-Medium chip click | `enabledMediums:['med.a']`, click the `med.a` chip | Chip stays `aria-pressed="true"`; the inline message mounts, `aria-describedby`-linked to that chip | N/A |
| Non-last chip click | `enabledMediums:['med.a','med.b']`, click `med.b` | Message unmounts/stays absent; `dispatchSetup({type:'toggle_medium', mediumId:'med.b'})` fires | N/A |
| Skill info popover | click the info button | Popover opens listing every Skill's `info`; Esc, outside click, or a second activation closes it and returns focus to the button | N/A |
| Get a challenge | click | `store.dispatch({type:'new_challenge'})` then `router.push('/stage')` | N/A |
| Library still loading | `state.library === null`, `libraryStatus !== 'error'` | Block renders a neutral placeholder (no Medium/Skill text) | N/A |
| Library failed | `state.libraryStatus === 'error'` | Block shows `copy.setup.loadError` | N/A |

</frozen-after-approval>

## Code Map

- `src/components/setup/SetupHero.tsx` -- replace the Story 3.8 slot comment in `SetupControls()` with the new block; add `relative z-10` to the content column `<div>` (founder decision 3); keep `pb-28` on the `<section>`.
- `src/store/types.ts` -- add `library: ComposeLibrary | null` to `StoreState` (import the type from `@/domain/compose/compose`).
- `src/store/store.ts` -- `initialState.library = null`; in `onLibraryReady`, `setState({ ...state, libraryStatus: "ready", library: loaded })`.
- `src/domain/library/schema.ts` -- reuse `Medium`/`Skill` (`{id, revealText, info, tags}`), `MediumId`, `SkillId`. Do not modify.
- `src/domain/session/schema.ts`, `src/domain/session/setup-reducer.ts` -- reuse `Setup`, `SetupEvent` exactly as built (Story 3.2). Do not modify.
- `src/components/copy.ts` -- extend the existing `setup` map: `mediumsLabel`, `thisTimeLabel`, `skillLabel`, `skillInfoLabel`, `quickRevealLabel`, `quickRevealOn`, `quickRevealOff`, `randomOption`.
- `src/components/setup/dial.ts`, `DifficultyDial.tsx`, `PerformTiming.tsx` -- existing style precedents: pure logic in its own module + colocated `.test.ts`; `peer-checked:`/sibling toggle markup (no `group`/nested-descendant styling); `border-ink` standing in for "1.5px" borders (no raw px).
- `src/components/EmailSignup.tsx` -- existing `InlineMessage` precedent (conditionally-mounted `<p role="status">` with a leading `bg-vermilion` dot, `aria-describedby` set only while the message exists). Match this convention rather than an always-mounted `aria-live` region.
- `src/components/ground.ts`, `InkButton.tsx`/`SunButton.tsx` -- reuse `FOCUS_RING_BASE`/`focusRingClassName("night")`; `SunButton` for **Get a challenge**.
- `e2e/difficulty-dial.spec.ts`, `e2e/routes.spec.ts` -- existing Playwright style to match (`copy` imports, `getByRole`, `test.describe("phone", ...)` viewport override).

## Tasks & Acceptance

**Execution:**
- [ ] `src/store/types.ts`, `src/store/store.ts` -- expose `library: ComposeLibrary | null` on `StoreState` -- founder decision 1
- [ ] `src/components/copy.ts` -- add the eight new `setup` strings -- AR-23
- [ ] `src/components/setup/options.ts` + `options.test.ts` -- pure `mediumSelectOptions`/`skillSelectOptions` helpers -- I/O Matrix rows 1-3
- [ ] `src/components/setup/MediumsRow.tsx` -- chip toggle fieldset (`aria-pressed`, tick glyph) + the last-Medium inline message -- I/O Matrix rows 4-5, FR-2
- [ ] `src/components/setup/SetupSelect.tsx` -- one reusable labeled native `<select>` (styled pill + chevron), used for both "This time" and Skill -- FR-2, FR-3
- [ ] `src/components/setup/SkillInfo.tsx` -- info button (`aria-expanded`) + Popover glossary over all Skills -- I/O Matrix row 6, FR-3
- [ ] `src/components/setup/QuickRevealSwitch.tsx` -- `role="switch"` control with a visible label and ON/OFF word -- FR-14
- [ ] `src/components/setup/SetupHero.tsx` -- compose the above plus the sun **Get a challenge** button (`store.dispatch({type:'new_challenge'})` then `router.push('/stage')`), gated on `state.library`; add `relative z-10` -- I/O Matrix rows 7-9
- [ ] `e2e/setup-mediums-and-challenge.spec.ts` -- new Playwright spec covering chip toggle + inline message, "This time"/Skill selects, info popover open/close/Esc/focus-return, Quick reveal persistence, Get a challenge → `/stage`, and the 1280×800 no-scroll check -- story's required e2e coverage

**Acceptance Criteria:**
- Given the Mediums row, when a user toggles chips, then turning off the last enabled Medium is blocked with "Keep at least one medium on." (`aria-describedby`, announced politely), and defaults on first visit are all Mediums on with "This time" Random
- Given the select fields, when opened, then "This time" lists Random plus each enabled Medium and Skill lists Random plus the six library Skills
- Given the Skill info button, when activated, then the Popover shows every Skill's `info`, opens only on click/Enter, closes on Esc/outside click/second activation, and returns focus to the button
- Given Quick reveal and **Get a challenge**, when toggled/activated, then the switch state persists and **Get a challenge** dispatches `new_challenge` then navigates to `/stage`
- Given 1280×800, then the whole section 01 stack including **Get a challenge** is visible without scrolling; at ≤860px it is one column with a 20px gutter
- Given a reload, then Mediums, "This time", Skill focus, and Quick reveal are restored

## Implementation Notes

- Implemented directly (no subagent dispatch, per build-session override).
- `src/store/types.ts`/`store.ts`: added `library: ComposeLibrary | null` to `StoreState`, set once in `onLibraryReady` (founder decision 1). No other `Store`/`StoreState` shape change; `store.test.ts`'s existing assertions are all on individual fields, so nothing broke.
- `src/components/setup/options.ts` + `options.test.ts`: pure `mediumSelectOptions`/`skillSelectOptions` helpers (8 cases, including empty-library edges).
- `src/components/setup/MediumsRow.tsx`: chip toggle fieldset. The last-Medium block is a derived boolean (`active && enabledMediums.length === 1`), not a `setupReducer` call -- `Setup.enabledMediums` is schema-guaranteed `min(1)` with no duplicates, so the chip-click guard and the reducer's guard are the same invariant restated, not two sources of truth that could drift. The inline message follows `EmailSignup.tsx`'s `InlineMessage` convention exactly: conditionally-mounted `<p role="status">` with a leading `bg-vermilion` dot, `aria-describedby` set on the one chip it concerns only while blocked.
- `src/components/setup/SetupSelect.tsx`: one reusable labeled `<select>` (pill + `▾` chevron via `appearance-none`), used for both "This time" and Skill -- DESIGN.md gives them the identical visual spec.
- `src/components/setup/SkillInfo.tsx`: info button + Popover glossary over every Skill's `info` (founder decision 2). Esc and a second activation return focus to the button; an outside click closes it without stealing focus from whatever was clicked (EXPERIENCE.md's focus table lists Esc/second-activation but not outside-click as a "focus goes to" case -- stealing focus from a legitimate outside click would be the more surprising behavior).
- `src/components/setup/QuickRevealSwitch.tsx`: native `<input type="checkbox" role="switch">`, `sr-only`, wrapped in one `<label>` with the visible text label before the track and an `aria-hidden` ON/OFF word after it (its state is already announced via the switch's own `aria-checked` + accessible name). Same reuse-the-native-control move as `PerformTiming.tsx`'s radios.
- `src/components/setup/SetupHero.tsx`: replaced the Story 3.8 slot comment with `MediumsAndChallenge` (gated on `state.library`, separately from the Dial's `status==='ready'` gate, since `libraryStatus` can still be `'loading'` on a returning visit); **Get a challenge** is a `SunButton` whose `onClick` calls `store.dispatch({type:'new_challenge'})` then `router.push('/stage')`. Added `relative z-10` to the content column per the coordinator's note about Story 8.2's decorative layers landing on `main`.
- `e2e/setup-mediums-and-challenge.spec.ts`: new spec, 7 tests. Two required fixes found only by the real-browser run (not worth a review loopback -- caught and fixed in the same pass):
  - Clicking the Quick reveal switch via `getByRole("switch").click()` fails in all three browsers (`sr-only` input's own hit-box is covered by its wrapping `<label>`) -- same as `PerformTiming`'s `sr-only` radios; fixed the test to click the visible label text (`e2e/difficulty-dial.spec.ts` already does this for the radios), not the component.
  - The Skill info popover's "Notice what's actually there." text collided with Journey section 02's static Skill-description copy (`copy.skill.observation`, same wording, same page) under Playwright's strict mode; scoped the popover assertions to the panel via the Info button's `aria-controls` id.
- `npm run lint`, `npm run typecheck`, `npm test` (505/505, 32 files), `npm run build`, `npm run check:static`, and `npm run test:e2e` (78/78 across chromium/webkit/firefox) all pass.
- Review patch pass: **Get a challenge** now goes through an exported `useGetAChallenge()` hook (`src/components/setup/useGetAChallenge.ts`) that ignores re-entry, composes on Setup, and opens `/stage` only once the session holds the new Challenge (`challenge !== null && lastComposeError === null`); on failure it stays on Setup with `copy.stage.composeError` as an inline message `aria-describedby`-linked to the button. The store's `dispatchSetup` now returns the reducer notice, and `MediumsRow` derives its block from `last_medium` (plus a library-only count so stale stored ids can't let the last visible chip turn off), clears it once it no longer holds, and keeps its `role="status"` element always mounted (new shared `InlineStatus.tsx`). `SetupSelect` is generic, the selects show and write back `random` for a stored id that isn't an option (`optionOrRandom`), and the unused `className` prop is gone. `SkillInfo` closes on focus leaving button+panel, is a non-modal `role="dialog"` labelled by its button, is right-aligned and capped at the phone content width, and Esc/second activation explicitly refocus the button while an outside click leaves focus where it landed. The reserved blocks get `aria-busy` while loading and the load error has one render site. Added store tests (`library` null → set on ready, null on error; `dispatchSetup` notice), `optionOrRandom` tests, and e2e for a held-Challenge replacement, compose failure staying on Setup, "This time" across reload, every section-01 control in the 1280×800 viewport, and outside click leaving focus off the info button. Note this supersedes the I/O Matrix "Get a challenge" row's unconditional `router.push`. lint, typecheck, `npm test` (564/564, 34 files), build, check:static, and `test:e2e` (138/138) pass.

## Design Notes

- **Why `library` on `StoreState` instead of a parallel fetch:** the store already loads and holds the full `ComposeLibrary` to run `compose()`; adding a second loader in `src/components/setup` would duplicate `loadLibrary`/`prefetchOnIdle` and risk the UI and `compose()` disagreeing about which Mediums/Skills exist. Exposing the same object read-only is the smaller, single-source-of-truth change.
- **Why the last-Medium notice is a derived boolean, not a reducer call:** `Setup.enabledMediums` is schema-guaranteed `min(1)` with no duplicates, so "this chip is the only one enabled" is exactly `active && enabledMediums.length === 1` — no need to call `setupReducer` just to predict its own invariant back.

## Review Triage Log

| # | Layer | Finding | Verdict | Evidence | Route |
|---|---|---|---|---|---|
| 1 | blind, edge, verif-gap | Get a challenge navigates on compose failure, composes twice on double click, and its e2e passes with the dispatch deleted | medium | Handler dispatches then always pushes; test asserts only the URL | patch |
| 2 | blind, edge, verif-gap | Last-Medium rule duplicated in UI; stale `blockedId`; status region mounted with text; stale ids defeat the guard | medium | `MediumsRow` recomputes the rule; reducer `notice` unused | patch |
| 3 | blind, edge | Stale `medium`/`skillFocus` shows Random but composes with hidden id; unchecked casts; unused prop | medium | Select value cast; options filtered by library | patch |
| 4 | blind, edge | SkillInfo: no focusout close, phone overflow, focus return, no accessible name, effect deps | low | 280px panel anchored left at 320px; `aria-controls` target unlabeled | patch |
| 5 | blind | Loading block silent; load error may render twice | low | `null` in reserved box; two `loadError` branches | patch |
| 6 | blind | New `library` store field untested; doc wrong on error path | low | No store test covers it | patch |
| 7 | blind, verif-gap | "This time" persistence and full 1280×800 stack untested; outside-click focus unasserted | low | Test names claim more than they check | patch |
| 8 | verif-gap | Setup load-error branch never rendered in a test | low | Needs a failure-injection seam for the generated chunk | defer |
| 9 | verif-gap | Journey ClosingCall and Practice "Get a challenge" are plain links that reopen a held Challenge | low | Owned by the other session; shared `useGetAChallenge()` offered | defer (peer) |

## Verification

**Commands:**
- `npm run lint` -- expected: no errors, including `src/components`/`src/store` import-boundary rules
- `npm run typecheck` -- expected: no errors
- `npm test` -- expected: all existing and new Vitest suites pass, including full coverage of the options-helper I/O Matrix rows
- `npm run build` -- expected: production build succeeds
- `npm run check:static` -- expected: `/` (and every other route) stays fully statically prerendered
- `npm run test:e2e` -- expected: all Playwright specs pass, including the new Mediums/select/popover/switch/Get-a-challenge/no-scroll spec
</frozen-after-approval>
