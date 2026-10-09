---
title: 'Story 3.3: Compose a Challenge from setup, Locks, and the recent window'
type: 'feature'
created: '2026-10-09'
status: 'in-progress'
baseline_commit: '635c4b68f7a70c164571565bca640ab059d0b26a'
route: 'dispatch'
review_loop_iteration: 0
story_key: '3-3-compose-a-challenge-from-setup-locks-and-the-recent-window'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-3-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Nothing yet turns a visitor's setup, Locks, and the recent-repeat window into an actual Challenge (FR-5–FR-9, AD-3, AD-4, AD-11). New Challenge, Reroll, and Variation each need the exact same filtering, compatibility, and repeat-avoidance rules, or they will drift.

**Approach:** One pure `compose()` in `src/domain/compose/compose.ts` that filters the library by Level/Skill/Medium/Perform-timing, enumerates `isCompatible()`-approved combinations honoring Locks and `mustDiffer`, prefers combinations outside the `recent` ring, renders the Brief, and returns `{ok:true, challenge}` or `{ok:false, reason:'no_compatible', blockingLock}`.

**Founder decision (flagged, epic-3 action_items):** with no Locks set and no compatible Template, `compose()` has no Lock to name — `blockingLock` is `null` in that case.

**Resolved decisions (no founder reply needed; conservative, see Implementation Notes):**
- `compose()`'s signature adds a `Clock` port param (`compose(request, library, recent, clock, random)`), since `Challenge.createdAt` requires wall-clock time and `src/domain` may never call `Date.now()`. This is the minimal deviation from epics.md's listed signature that keeps domain purity (AD-2, ESLint-enforced).
- `ComposeRequest` adds an `origin: Origin` field (reusing `src/domain/session/schema.ts`'s `Origin`), since AD-5 requires every returned Challenge to carry one and only the caller (store command layer) knows whether this is `new`/`reroll`/`variation`.
- `blockingLock` algorithm: try releasing each locked kind alone, in `skill, medium, topic, style, constraint` order; return the first kind whose release (holding the others) yields a result; otherwise `null`. This is the literal reading of FR-9 ("the Lock whose release would make a result possible") and also covers the founder-flagged no-Locks case.

## Boundaries & Constraints

**Always:**
- `src/domain/compose/*` is pure: no `window`, `localStorage`, `Date.now`, `Math.random`, `crypto`, no React/Next import (ESLint already enforces this for `src/domain`).
- Reuse `isCompatible` (`src/domain/library/compat.ts`) and `render` (`src/domain/library/render.ts`) exactly as written — no parallel compatibility or rendering logic.
- Reuse `Locks`, `InputKind`, `Challenge`, `ChallengeInputs`, `Origin`, `PerformTiming` from `src/domain/session/schema.ts`, and `Level`/`SkillId`/`MediumId`/`TemplateId`/`TopicId`/`StyleId`/`ConstraintId`/`Template`/`Medium`/`Skill`/`Topic`/`Style`/`Constraint` from `src/domain/library/schema.ts`. Never redeclare these.
- `compose()` skips `retired` Templates/Topics/Styles/Constraints (Skills and Mediums have no `retired` field — base data).
- `compose()` never returns a partial Challenge: a render failure on the selected combination is treated as no compatible result rather than surfaced.
- `compose()` never writes the recent ring; it only reads `recent` (Story 3.4 owns pushing to it).

**Never:**
- Do not edit `src/domain/ports.ts`.
- Do not build the library loader (Story 3.6) — define only the minimal `ComposeLibrary` type `compose()` needs (`libraryVersion`, `skills`, `mediums`, `templates`, `topics`, `styles`, `constraints` arrays), in `src/domain/compose/compose.ts`.
- Do not implement the session reducer, storage, store, or any UI (Stories 3.4–3.11).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Level + Skill + Medium filter | `level:'explore'`, `skillFocus:'skl.a'`, `enabledMediums:['med.a']` | only `level==='explore'` Templates with `skill==='skl.a'` and a Medium in `['med.a']` are candidates | N/A |
| Perform timing | `level:'perform'`, `performTiming:'timed'` | only Templates with `timeLimitSec` set are candidates (`'untimed'` → only those without; `'either'` → both) | N/A |
| Retired entries | a Template/Topic/Style/Constraint has `retired:true` | excluded from candidates | N/A |
| Recent window | ≥1 compatible combination's `templateId+topicId` is outside `recent` | only non-ring combinations are chosen from | N/A |
| Recent window exhausted | every compatible combination's key is in `recent` | the ring is ignored; any compatible combination may be chosen (FR-8) | N/A |
| Locks | `locks:{medium:'med.a'}` | every result's `medium.id === 'med.a'`; Templates that can't carry `med.a` are excluded | N/A |
| mustDiffer | `mustDiffer:{topic:'top.a'}` | no result has `topic.id === 'top.a'` | N/A |
| No compatible, with Locks | Locks present, no candidate combination exists | `{ok:false, reason:'no_compatible', blockingLock}` names the one locked kind whose release alone yields a candidate, else `null` | N/A |
| No compatible, no Locks | no Locks, no candidate combination exists | `{ok:false, reason:'no_compatible', blockingLock:null}` (founder-flagged gap) | N/A |
| Full snapshot | any successful compose | `{ok:true, challenge}` has `id` from `random.uuid()`, `createdAt` ISO from `clock.now()`, `libraryVersion`, `templateId`, `level`, `timeLimitSec`, `brief`, `guidance`, `inputs` (only present kinds), `origin` from the request | N/A |

</frozen-after-approval>

## Code Map

- `src/domain/library/schema.ts` -- `Level`, `SkillId`…`ConstraintId`, `Skill`, `Medium`, `Template`, `Topic`, `Style`, `Constraint` types; `requires`/`excludes`/`tags` on fills; slot present iff `<kind>Tags` non-empty. Do not modify.
- `src/domain/library/compat.ts` -- `isCompatible(template, medium, topic, style, constraint): boolean`. Reuse as the sole compatibility check.
- `src/domain/library/render.ts` -- `render(template, medium, {topic,style,constraint}): RenderResult`. Reuse as the sole Brief renderer; `RenderResult.ok:false` is defensive-only here (the library gate guarantees every `isCompatible` combo renders).
- `src/domain/session/schema.ts` -- `PerformTiming`, `InputKind`, `Locks` (`Partial<{skill,medium,topic,style,constraint}>`, each the real id type), `Challenge`, `ChallengeInputs`, `Origin` (discriminated union incl. `fromRepId`). Reuse; do not modify.
- `src/domain/ports.ts` -- `Clock.now(): number`, `Random.next(): number` (uniform `[0,1)`) / `Random.uuid(): string`. Do not modify.
- `src/domain/test-doubles.ts` -- `fakeClock(startMs)`, `seededRandom(seed)` (mulberry32, deterministic). Use both in tests.
- `src/domain/library/compat.test.ts`, `src/domain/session/setup-reducer.test.ts` -- fixture-builder style (`tpl()`, `med()`, `fill()` helper functions with `Partial<T>` overrides) and `it.each` table-driven tests to match.
- No existing `src/domain/compose/` directory -- this story creates it.

## Tasks & Acceptance

**Execution:**
- [x] `src/domain/compose/compose.ts` -- `ComposeLibrary`, `ComposeRequest` (setup filters + `locks`/`mustDiffer`: `Locks` + `origin: Origin`), `ComposeResult`, `compose(request, library, recent, clock, random)`, and exported `recentKeyFor(templateId, topicId)` (single key format, reusable by Story 3.4) -- AD-3, AD-4, AD-5, AD-11, FR-5–9
- [x] `src/domain/compose/compose.test.ts` -- a small fixture library (2+ Templates across levels/skills/mediums, retired entries, fills with `requires`/`excludes`); cover every I/O & Edge-Case Matrix row plus: locked Medium/Skill/Topic/Style/Constraint each produce only matching results; `mustDiffer` excludes the given id; seeded `Random` picks deterministically; purity (no thrown errors, `recent`/`library`/`request` never mutated)

**Acceptance Criteria:**
- Given any request/library/recent combination, when `compose()` runs, then it returns a value and never throws, and a `{ok:true}` result's Challenge always satisfies `isCompatible()` for its own `templateId`/`medium`/`topic`/`style`/`constraint`
- Given a `locks` entry whose referenced id no longer exists in `library` (removed or `retired`), when `compose()` runs, then no candidate can satisfy it and the result is `{ok:false, reason:'no_compatible', ...}`

## Implementation Notes

- Implemented directly (no subagent dispatch, per build-session override).
- Built `src/domain/compose/compose.ts` + colocated `compose.test.ts` (18 tests) exactly per the resolved decisions recorded in Intent: `compose()` takes a `Clock` 5th-ish param (`request, library, recent, clock, random`) to produce `createdAt` without touching `Date.now()`; `ComposeRequest.origin: Origin` flows straight into the returned Challenge; `findBlockingLock` tries releasing each locked kind alone (`skill, medium, topic, style, constraint` order) and reports the first that unblocks, else `null`.
- `buildCandidates`/`mediumChoices`/`fillChoices` avoid a "null means exclude this Template" sentinel: an absent slot with no Lock returns `[null]`, a locked-but-impossible slot (lock id missing/retired, or the Template has no such slot) returns `[]`, and the cross-product loop naturally produces zero combinations either way — no extra branching needed.
- A real bug surfaced during testing: two test fixtures added a `styleTags`/`constraintTags` slot to a Template without updating its `briefPattern` to reference `{style}`/`{constraint}`. `isCompatible()` doesn't look at the pattern, so those combos passed compatibility but then failed `render()` with `unused_fill` — exactly the "defensive, never-partial" path `compose()` is supposed to take, caught here by `npm test`. Fixed the fixtures (not the implementation); kept the defensive `render.ok===false` branch as-is since it's the correct guard against exactly this class of mismatch in real library data.
- All four commands pass: `npm run lint`, `npm run typecheck`, `npm test` (171/171, 13 files), `npm run build`.

## Design Notes

- **`findBlockingLock` only inspects `locks`, never `mustDiffer`:** FR-9 and AD-3 both describe naming a *Lock* to release; `mustDiffer` (Variation's "not this value again") isn't a Lock, so a `mustDiffer`-only block reports `blockingLock:null`, consistent with the founder-flagged gap's spirit (no Lock, no name).
- **Recent-ring exclusion never causes `no_compatible`:** candidate existence is always checked against the full compatible set; the ring only narrows which of an already-nonempty set gets picked (AD-11, FR-8's "allow the repeat instead of failing").

## Verification

**Commands:**
- `npm run lint` -- expected: no errors, including `src/domain` import/global restrictions on the two new files
- `npm run typecheck` -- expected: no errors
- `npm test` -- expected: all existing and new Vitest suites pass
- `npm run build` -- expected: production build succeeds
