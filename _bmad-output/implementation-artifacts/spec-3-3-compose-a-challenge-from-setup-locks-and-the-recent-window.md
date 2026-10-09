---
title: 'Story 3.3: Compose a Challenge from setup, Locks, and the recent window'
type: 'feature'
created: '2026-10-09'
status: 'in-review'
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
- **Review-triage patch pass:** fixed all 8 Review Triage Log findings in `compose.ts` — Template-then-combo uniform selection (weighting), per-Template renderable-combo grouping with `isCompatible`-pre-filtered fill pools and call-scoped id `Map`s (scale), excluding non-rendering combos instead of failing on the one picked (render failure), an up-front "Lock must still satisfy `enabledMediums`/`request.medium`/`skillFocus`" guard (FR-2), a finite-clock check plus an index-clamping `pickIndex()` helper (totality), and a typed `fill` test fixture with no `as unknown as`. Rewrote `compose.test.ts` to 29 tests covering every listed gap (real recent-window avoidance, skill-focus-without-lock, specific `request.medium`, both `mustDiffer` kinds, retired Style/Constraint incl. a retired lock, a slotless-Template style lock, `requires`/`excludes` accept/reject, same-seed determinism, the two-Locks-only-block-together case, the 1-vs-50-combo weighting ratio over 400 seeds, and both totality edge cases); `npm run lint`, `npm run typecheck`, `npm test` (184/184, 13 files), and `npm run build` all pass after the patch.

## Design Notes

- **`findBlockingLock` only inspects `locks`, never `mustDiffer`:** FR-9 and AD-3 both describe naming a *Lock* to release; `mustDiffer` (Variation's "not this value again") isn't a Lock, so a `mustDiffer`-only block reports `blockingLock:null`, consistent with the founder-flagged gap's spirit (no Lock, no name).
- **Recent-ring exclusion never causes `no_compatible`:** candidate existence is always checked against the full compatible set; the ring only narrows which of an already-nonempty set gets picked (AD-11, FR-8's "allow the repeat instead of failing").
- **Selection weighting (patch pass, finding #1):** `buildCandidates` groups combos by Template (`TemplateGroup[]`) instead of returning one flat pool. `compose()` picks in two uniform draws — first a Template among those with ≥1 renderable combo (restricted to Templates with a *fresh* combo first, per AD-11, falling back to all only when every Template's combos are all in the `recent` ring), then a combo within that Template (same fresh-first/fallback rule). This keeps a 1-combo Template and a 50-combo Template equally likely to be picked, instead of the old single uniform draw over the full cross product, which weighted a Template by its slot-combination count.
- **FR-2, Lock-vs-restriction conflicts (finding #4):** a Medium Lock must still be in `enabledMediums` and match a non-random `request.medium`; a Skill Lock must still match a non-random `skillFocus`. Checked once up front in `buildCandidates` (not per-Template): a violating Lock makes the whole call return no candidates, which `findBlockingLock` can then correctly name (`blockingLock:"medium"`/`"skill"`) by relaxing just that Lock.
- **Render failure (finding #3):** `buildCandidates` now calls `render()` for every `isCompatible` combo (not just the one ultimately picked) and keeps only the combos that render; a Template with zero renderable combos is dropped from the group list entirely. `compose()` therefore only reaches `no_compatible` (with a real `blockingLock` from `findBlockingLock`, not a hardcoded `null`) when no Template has any renderable combo at all — never because the one combo it happened to draw failed to render while others would have succeeded. The rendered `brief`/`guidance` are cached on the `Combo` so the picked one never needs a second `render()` call.
- **Scale (finding #2):** `skillsById`/`mediumsById` `Map`s are built once per `buildCandidates()` call (was once per Template, inside `mediumChoices`). `fillChoices` pre-filters each Topic/Style/Constraint pool to entries sharing a slot tag and absent from `template.incompatible` before the medium×topic×style×constraint cross product, instead of relying on `isCompatible` to reject every mismatched combination after the fact.
- **Totality (finding #5):** `compose()` checks `Number.isFinite(clock.now())` up front and returns `{ok:false, reason:"no_compatible", blockingLock:null}` rather than letting `new Date(NaN).toISOString()` throw. A `pickIndex()` helper clamps every `random.next() * length` draw to `[0, length-1]` so a `Random` returning `1` (or more) can never index past a pool.

## Review Triage Log

| # | Layer | Finding | Verdict | Evidence | Route |
|---|---|---|---|---|---|
| 1 | blind | Uniform pick over combos weights Templates by cross-product size | medium | Topic+Style+Constraint Templates dominate Topic-only ones by orders of magnitude; undermines AR-18 per-cell coverage. Orchestrator decision: uniform over viable Templates, then over that Template's combos | patch |
| 2 | blind, edge | Full cross-product materialised per call, repeated by `findBlockingLock` | medium | ~10^7+ `isCompatible` calls at AR-24 volume on a click path | patch |
| 3 | blind, edge | One render failure fails the whole compose with `blockingLock: null` | medium | `if (!rendered.ok) return no_compatible` after picking | patch |
| 4 | blind, edge | Medium Lock overrides `enabledMediums` (FR-2); Skill Lock overrides focus | medium | Test asserts a disabled Medium is returned | patch |
| 5 | edge | Non-finite clock or `next() >= 1` throws | low | `toISOString` RangeError; index out of range | patch |
| 6 | verif-gap | Recent-window test passes with avoidance removed | medium | Pre-verified: seeds 1–5 all draw ≥ 0.5 | patch |
| 7 | verif-gap, blind | Skill focus, chosen Medium, `mustDiffer` skill/medium, retired Style/Constraint, slotless-Template style lock untested | medium | Pre-verified: each deletion keeps 15/15 green | patch |
| 8 | blind, edge | No determinism, requires/excludes, joint-lock, weighting tests; `as unknown as` fixtures | low | Spec task list items unmet | patch |

## Verification

**Commands:**
- `npm run lint` -- expected: no errors, including `src/domain` import/global restrictions on the two new files
- `npm run typecheck` -- expected: no errors
- `npm test` -- expected: all existing and new Vitest suites pass
- `npm run build` -- expected: production build succeeds
