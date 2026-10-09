---
title: 'Story 3.9: The Challenge Stage page shell'
type: 'feature'
created: '2026-10-09'
status: 'in-progress'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: '0f12d0fd97a898d64b2915a925f519bf033f3e3f'
story_key: '3-9-the-challenge-stage-page-shell'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-3-context.md'
  - '{project-root}/_bmad-output/planning-artifacts/architecture/architecture-impromptu-2026-10-08/ARCHITECTURE-SPINE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `/stage` is still the Story 1.1 scaffold placeholder (`<h1>Stage</h1>`): it renders nothing from the store, has no Stage-only layout (lilac ground, safe area, corner controls), and is the first page to call `useAppStore`/`getAppStore` — nothing yet proves the production store (and the real, built `src/generated/library.json`) work end to end outside unit tests with injected fakes.

**Approach:** Build the Stage shell only: a lilac page with no nav/footer/setup/signup, a visually hidden `h1` "Challenge", a centered safe-area column holding the Stage mark and Level/mode meta, and back/sound corner controls outside it (the Stage's one AD-7 key handler: Esc only). On open with nothing held, dispatch `new_challenge` once the library is ready; show a neutral placeholder while loading and a short error message on failure. Leave the reveal composition (ticket tabs, paper scrap, foil slip, ink stamp, Brief, action row) as an explicit empty slot for Story 3.10.

## Boundaries & Constraints

**Always:**
- Own only `src/app/stage/**` and `src/components/stage/**`. Never touch `src/app/page.tsx`, `src/components/setup/**`, or `src/components/journey/**` (Story 3.7/3.8, built in parallel).
- `src/app/stage/page.tsx` stays a server component (so it can export `metadata`); all interactivity lives in `src/components/stage/StagePage.tsx` ("use client").
- Reuse `StageIconButton` (Story 3.1), `useAppStore`/`getAppStore`/`StoreCommand`/`Status` (Story 3.6), `copy` (Story 3.1, additive), and the `--spacing-header-inset`/`--spacing-safe-area-width`/`--spacing-stage-gap` tokens (Story 3.1) exactly as built. No raw hex/px in `src/components` (existing guard) or in this story's own files.
- Dispatch `new_challenge` at most once per page mount, and only when `libraryStatus === 'ready'` and nothing is held (`session.state === 'none'`) — Story 3.6's store already queues/drains and de-dupes by command type, so this is a plain, un-gated `dispatch()` call once that condition is observed.
- The one Stage-level keydown handler (AD-7) handles only `Escape` this story; it must stay the only `keydown` listener the Stage adds, so Story 3.10 extends it rather than adding a second one.
- Branch-y logic (the dispatch gate, the error gate, the meta string, the Esc guard) lives in pure functions in `src/components/stage/logic.ts`, unit-tested without rendering React or mounting the router.

**Never:**
- No reveal pieces, empty slots, lock toggles, countdown, or action-row buttons (sun/line) — Story 3.10, 4.x, 5.x. Leave a code-comment slot, not placeholder markup for them.
- No grain overlay or lilac-deep edge-fade asset/gradient work here — no grain asset exists yet anywhere in the app, and the only story that plans to add one (`spec-8-2`, not yet built) explicitly places it on the Setup page only and "never over the Stage." Nothing to suppress; noted in Design Notes rather than invented.
- No new npm dependency. Icons are inline SVG (`currentColor`), not an icon library.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Nothing held, library ready | `session.state:'none'`, `libraryStatus:'ready'` | `new_challenge` dispatched once; once composed, the meta line shows `"{Level} · {TIMED\|UNTIMED}"` | N/A |
| Nothing held, still loading | `libraryStatus:'loading'` | No dispatch yet; meta renders a same-height placeholder (` `), not the real string | N/A |
| Something already held | `session.state:'held'`, any `libraryStatus` | No dispatch; the held Challenge's own meta renders | N/A |
| Store or library failed | `status:'error'` or `libraryStatus:'error'` | Short load-error copy renders; no dispatch attempted | Shown via `copy.stage.loadError`, no thrown error |
| Esc, no Attempt | `session.state` ≠ `'attempt'`, key `Escape` | Navigates to `/`; session/store untouched | N/A |
| Esc, Attempt running | `session.state:'attempt'` | No-op (unreachable this story; guarded for AD-7 forward-compat) | N/A |
| Back button click | any session state | Always navigates to `/` (unconditional, per EXPERIENCE.md Component Patterns — back works even mid-Attempt) | N/A |
| Sound toggle click | `setup.sound` either value | Dispatches `set_sound` with the flipped value; caption/aria-label swap and persist across reload | N/A |

</frozen-after-approval>

## Code Map

- `src/app/stage/page.tsx` -- was the Story 1.1 placeholder; now a server component exporting `metadata` and rendering `StagePage`.
- `src/components/stage/StagePage.tsx` -- new: the shell (layout, store wiring, Esc handler, corner controls).
- `src/components/stage/logic.ts` -- new: `shouldRequestNewChallenge`, `isStageError`, `stageMeta`, `canHandleEscape` (pure, unit-tested).
- `src/components/stage/icons.tsx` -- new: inline `ArrowLeftIcon`/`SpeakerIcon`/`SpeakerOffIcon`/`StarIcon`.
- `src/components/StageIconButton.tsx`, `src/components/ground.ts` -- reused as-is (Story 3.1).
- `src/store/index.ts` (`useAppStore`, `getAppStore`), `src/store/types.ts` (`Status`, `StoreCommand`) -- reused as-is (Story 3.6).
- `src/domain/session/schema.ts` (`Session`, `Challenge`) -- types only, reused as-is.
- `src/components/copy.ts` -- additive: new `stage.h1`, `stage.mark`, `stage.levelName`, `stage.mode`, `stage.loadError` keys; existing `stage.back`/`soundOff*`/`soundOn*` reused unchanged.
- `src/styles/tokens.css` -- additive: `@utility text-stage-mark` (the var already existed from Story 3.1; this is its first consumer).
- `e2e/routes.spec.ts` -- `/stage`'s expected `h1` text changes from the old placeholder `"Stage"` to `"Challenge"`.
- `e2e/stage.spec.ts` -- new: the deferred-work e2e check (Story 3.6 follow-up: the production store must reach a held Challenge from the real built `src/generated/library.json`), plus corner-control and Esc coverage.
- Not touched: `src/app/page.tsx`, `src/components/setup/**`, `src/components/journey/**`, `src/domain/compose/**`, `src/store/store.ts`.

## Tasks & Acceptance

**Execution:**
- [x] `src/components/copy.ts` -- add `stage.h1`, `stage.mark`, `stage.levelName`, `stage.mode`, `stage.loadError` -- AR-23: no inline UI string
- [x] `src/styles/tokens.css` -- add `@utility text-stage-mark` -- first consumer of the existing var
- [x] `src/components/stage/icons.tsx` -- inline back/sound/star glyphs -- no new dependency
- [x] `src/components/stage/logic.ts` + `logic.test.ts` -- pure dispatch/error/meta/Esc decisions, unit-tested
- [x] `src/components/stage/StagePage.tsx` -- the shell: lilac ground, hidden `h1`, safe-area column, corner controls, Esc handler, dispatch-once effect, loading/error rendering, Story 3.10 slot comment
- [x] `src/app/stage/page.tsx` -- replace the Story 1.1 placeholder with `metadata` + `<StagePage />`
- [x] `e2e/routes.spec.ts` -- update `/stage`'s expected heading to `"Challenge"`
- [x] `e2e/stage.spec.ts` -- production-library e2e check + corner controls + sound persistence + Esc

**Acceptance Criteria:**
- Given `/stage`, when it renders, then it has a lilac ground, no global nav/footer/setup/signup, a visually hidden `h1` "Challenge" (`lang="en"` already set app-wide in `src/app/layout.tsx`), and a centered safe-area column (`w-safe-area-width`) holding the Stage mark (decorative, not a link) and the Level/mode meta
- Given the corner controls, when the page renders, then back and sound sit at `fixed … top-header-inset` plus `left-header-inset`/`right-header-inset`, outside the safe-area column; sound shows its state via caption + `aria-label` ("Sound, off"/"Sound, on"), toggles `set_sound`, and persists across reload
- Given no Attempt running, when Esc is pressed, then the app navigates to `/` without dispatching anything; the back button does the same unconditionally
- Given nothing held and `libraryStatus` becomes `'ready'`, when the effect runs, then `new_challenge` is dispatched exactly once; given `status`/`libraryStatus` is `'error'`, then `copy.stage.loadError` renders instead
- Given `npm run build` then Playwright against the production server, when `/stage` is opened, then the store composes a held Challenge from the real `src/generated/library.json` (Level/mode meta shows a real value, no load-error text) — the Story 3.6 deferred e2e follow-up

## Implementation Notes

- Implemented directly (per build-session override), no subagent dispatch.
- **Corner assignment (no mockup exists):** DESIGN.md says only "the viewport corners"; EXPERIENCE.md's IA doesn't pick a side either. Chose back = top-left, sound = top-right (the conventional reading-order default) and recorded it here rather than blocking on it — the most conservative, reversible choice (a one-line class swap if the founder picks otherwise).
- **Grain / lilac-deep edge fade:** DESIGN.md's AC text asks the grain overlay to be "suppressed inside the safe area." No grain asset or overlay component exists anywhere in the app yet, and the only story that plans to add one, `spec-8-2-journey-furniture-tickers-orbit-thread-chrome-and-assets.md` (status `ready-for-dev`, not yet built, not owned by this story), explicitly places it "in `src/app/page.tsx` only … never over the Stage." Rather than inventing an unspecified gradient asset/overlay ahead of that story, this AC is satisfied vacuously: nothing is rendered on the Stage for 8.2 to ever need to suppress. Same reasoning for the lilac-deep edge fade — no visual mockup exists ("no mockups… these tables and prose are the whole visual contract") to pin exact gradient stops against, and it is pure decoration with no behavioral test surface. Flagged here rather than guessed at.
- **Esc vs. Back during an Attempt:** epics.md's Given/When/Then for this AC groups Esc and back under one "with no Attempt running" clause, but EXPERIENCE.md → Component Patterns is more specific: back always returns to Setup (the Attempt keeps running), while Esc specifically does nothing during an Attempt. Followed the more detailed, behavior-owning doc (EXPERIENCE.md says "Behavioral. Visual specs are in DESIGN.md" and reserves this nuance for itself). `canHandleEscape` therefore only gates the keydown handler, never the back button's `onClick`. Moot in practice this story — Attempt is unreachable before Story 5.1 — but written correctly for forward-compat per AD-7's full state machine.
- **Level/mode meta format:** DESIGN.md names the content ("Level and mode meta") but not its exact string. Chose `"{LevelName} · {TIMED|UNTIMED}"`, reusing the `·` separator already established in `copy.journey.*.meta` three-line stacks. `TIMED`/`UNTIMED` is derived from the held Challenge's own `timeLimitSec`, not from `setup.performTiming` (a held Challenge is an immutable snapshot — AD-5 — so its own field is authoritative even if the setup's Perform choice changes afterward).
- **Dispatch trigger is `libraryStatus`, not `status`:** matches the AC's literal wording. Story 3.6's Design Notes establish that by the time `libraryStatus` flips to `'ready'`, `status` is already `'ready'` too for both first-time visitors (`ensureSetup` runs synchronously inside the same `onLibraryReady` call, before the `libraryStatus` state update) and returning visitors (whose `status` resolves at hydration, independent of the library). No separate `status` check needed.
- **Focus on arrival at `/`:** EXPERIENCE.md's focus-target table ("Back, Esc, or Discard to Setup → Setup `h1` or the notice banner") is Setup's own responsibility (`src/app/page.tsx`, out of this story's ownership) — the Stage only calls `router.push('/')`.
- Verified against the real generated library (`npm run build`'s `prebuild`, currently 3 CL-5 anchor Templates only): the default Setup (`level: 'explore'`, all Mediums enabled, Medium/Skill random) has exactly one compatible Template (`tpl.observation.explore.nearby-object`), so `/stage`'s e2e composes deterministically without flaking.
- `npm run lint`, `npm run typecheck`, `npm test` (30 files, 473 tests), `npm run build`, `npm run check:static`, `npm run check:privacy`, and `npm run test:e2e` (36 tests across chromium/webkit/firefox) all pass clean.

## Verification

**Commands:**
- `npm run lint` -- expected: no errors
- `npm run typecheck` -- expected: no errors
- `npm test` -- expected: all Vitest suites pass, including `src/components/stage/logic.test.ts`'s full table of `shouldRequestNewChallenge`/`isStageError`/`stageMeta`/`canHandleEscape` cases
- `npm run build` -- expected: production build succeeds; `/stage` still prerendered
- `npm run check:static` -- expected: `/stage` listed as statically prerendered
- `npm run check:privacy` -- expected: no analytics/error-monitoring SDKs
- `npm run test:e2e` -- expected: all Playwright specs pass, including the new `e2e/stage.spec.ts` (production-library composition, corner controls, sound persistence, Esc)
