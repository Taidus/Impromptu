---
title: 'Hold the composition still, with Skill info on request'
type: 'feature'
created: '2026-10-10'
status: 'in-progress'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: 'e5179460e73d669d2e126105311a3c942ffaeca1'
story_key: '4-5-hold-the-composition-still-with-skill-info-on-request'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-4-context.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux-designs/ux-impromptu-2026-10-08/DESIGN.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux-designs/ux-impromptu-2026-10-08/EXPERIENCE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Once Held, the Stage must stop moving entirely (FR-15, FR-33) and offer a Skill info Popover only on request, beside the Skill tab (FR-3, FR-32) -- neither exists yet, and nothing currently stops Esc from reaching the Stage's own Setup-navigation handler while a popover is open.

**Approach:** Stories 4.1-4.3 already make the held Stage still by construction (every piece's entrance is a finite, non-looping CSS animation; nothing on `/stage` loops or shimmers once landed) -- this story adds the one missing control (a collapsed Skill Info button beside the Skill tab, shown only once fully revealed) by generalizing Setup's `SkillInfo` component rather than duplicating it, and proves stillness and the Esc ordering with Playwright.

</frozen-after-approval>

## Code Map

- `src/components/setup/SkillInfo.tsx` -- generalized with an optional `ground?: Ground` prop (default `"night"`, Setup's existing treatment unchanged byte-for-byte); `"lilac"`/`"lilac-deep"` take the Stage's plum-muted/plum tone (matching `StageIconButton`/`LockToggle`). Its Escape listener now attaches on `document` in the **capture** phase and calls `event.preventDefault()`: capture always runs before any bubble-phase listener for the same event regardless of attach order, so this is what guarantees the popover consumes Esc before `StagePage.tsx`'s bubble-phase handler ever sees it -- no shared state needed between the two components. `src/components/stage/logic.ts`'s `isPlainEscape` already checks `!event.defaultPrevented` (Story 3.10) and needed no change.
- `src/components/stage/RevealComposition.tsx` -- new `skills?: readonly Skill[]` prop (default `[]`); a `skillInfo` beside `tab("skill")` inside the ticket-tab `<li>`, gated on the same `held` boolean that already gates Lock toggles/Reroll (fully revealed, `new`/`reroll` origin) and `skills.length > 0` (mirrors Setup's own `state.library` gate) -- so it can never mount, let alone open, mid-Reveal.
- `src/components/stage/StagePage.tsx` -- passes `skills={store.library?.skills ?? []}` into `RevealComposition` (the same `ComposeLibrary` Setup already reads `.skills` from, Story 3.8).
- Confirmed, not changed: `src/components/stage/pieces.tsx`'s `LAND_CLASS`/`REVEALED_MOTION`/`SHIMMER_MOTION` are all finite, one-shot entrances (`SHIMMER_MOTION` only renders mid-shuffle, never once held); no decor/3D layer is mounted on `/stage` yet (Epic 8 Story 8.5, backlog) -- "stillness" was already true by construction, this story only adds the Playwright proof.

## Tasks & Acceptance

**Execution:**
- [x] `src/components/setup/SkillInfo.tsx` -- `ground` prop + capture-phase, `preventDefault`-ing Escape handler
- [x] `src/components/setup/SkillInfo.test.ts` -- new: locks down the `ground` render branch
- [x] `src/components/stage/RevealComposition.tsx` -- `skills` prop; Skill Info button beside the Skill tab, gated on `held`
- [x] `src/components/stage/RevealComposition.test.ts` -- new cases: absent mid-Reveal, absent with no library, present and collapsed once Held
- [x] `src/components/stage/StagePage.tsx` -- wire `skills={store.library?.skills ?? []}`
- [x] `e2e/held-skill-info.spec.ts` -- new: no running animations after the Brief's fade; button absent/present by state; open on click/Enter; Esc closes the popover without navigating, a second Esc navigates to Setup; never auto-opens during the Reveal; no unprompted toast/banner/popover over several clocked seconds; popover stays inside the viewport at 1280x800 and 390x844

**Acceptance Criteria:**
- Given the last Reveal step has landed, when the Stage enters Held, then all DOM motion stops and nothing advances on its own, and `document.getAnimations()` (excluding any future decor/3D layer) returns none after the Brief's 250ms fade
- Given Held, when the Stage renders, then a collapsed Skill Info button sits beside the Skill tab; it opens the Popover only on click/Enter, never automatically
- Given the popover is open, when Esc is pressed, then the popover closes and focus returns to the button without navigating away from `/stage`; a second Esc then navigates to Setup
- Given Held, when several seconds pass, then no toast, banner, or popover appears unprompted

## Implementation Notes

- Implemented directly (per build-session override), no subagent dispatch.
- **Open question resolved conservatively (CHECKPOINT 1):** the popover's anchor side wasn't specified. Tried `anchor="left"` (panel's left edge at the button's left edge) first on the theory that the Skill tab sits near the column's left edge; a real-browser check at 390x844 showed the button itself (after the Skill tab's own rendered width) sits well right of center, so a left anchor pushed the 280px panel 130px past the right edge of the viewport. Reverted to Setup's existing right anchor (the panel's right edge at the button's right edge, extending left) with no new prop at all -- it fits at both 1280x800 and 390x844 with room to spare, and keeps the generalization to the one thing that actually differs (`ground`). No `anchor` prop exists in the shipped component.
- **Stillness was already true by construction** (Stories 4.1-4.3): every landing entrance is a finite CSS animation (`LAND_CLASS`/`REVEALED_MOTION`), the foil shimmer only renders mid-shuffle, and no decor/3D layer is mounted on `/stage` (Epic 8 Story 8.5 is still backlog). This story's only behavioral addition is the Skill Info button; the rest of its scope is proving the existing stillness and wiring the Esc-ordering guarantee.
- **Esc ordering:** rather than lifting "is a popover open" state into `StagePage.tsx` (which would couple the Stage to every future popover), `SkillInfo`'s own Escape listener moved to the capture phase and now calls `preventDefault()`. Capture-phase listeners on `document` always run before bubble-phase listeners on `document` for the same event, regardless of which was attached first or when each component mounted -- so this holds even though `StagePage`'s listener is attached once at Stage mount, long before `SkillInfo` ever mounts (Held only, see above). `isPlainEscape` (`src/components/stage/logic.ts`) already gated on `!event.defaultPrevented`; no change needed there.
- `npm run lint`, `npm run typecheck`, `npm test` (917/917, 50 files), `npm run build`, `npm run check:static`, and `E2E_PORT=3111 npm run test:e2e` (318/318 across chromium/webkit/firefox) all pass.

## Design Notes

- **Why generalize `SkillInfo` instead of a new Stage-only component:** the glossary content, open/close state machine, and focus handling are identical between Setup and the Stage -- only the ambient ground (and thus the button's border/text tone and focus-ring color) differs. A `ground` prop is the smallest change that lets one component serve both without either caller reaching into the other's internals.

## Verification

**Commands:**
- `npm run lint` -- no errors
- `npm run typecheck` -- no errors
- `npm test` -- all Vitest suites pass, including the new `SkillInfo`/`RevealComposition` cases
- `npm run build` -- production build succeeds
- `npm run check:static` -- `/stage` still statically prerendered
- `E2E_PORT=3111 npm run test:e2e` -- all Playwright specs pass, including the new `e2e/held-skill-info.spec.ts`
