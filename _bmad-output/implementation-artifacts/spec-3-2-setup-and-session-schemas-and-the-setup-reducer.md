---
title: 'Setup and session schemas and the setup reducer'
type: 'feature'
created: '2026-10-09'
status: 'in-review'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: '7bf85e9b3db7ea126e4da03bb927ce2510ec9232'
story_key: '3-2-setup-and-session-schemas-and-the-setup-reducer'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-3-context.md'
  - '{project-root}/_bmad-output/planning-artifacts/architecture/architecture-impromptu-2026-10-08/ARCHITECTURE-SPINE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The domain layer has no schemas yet for Setup, Challenge, Attempt, Rep, Session, or Export, and no rule enforcing that a visitor can never disable every Medium or strand "This time" on a Medium they just turned off (FR-2, FR-4).

**Approach:** Define all six persisted shapes as zod schemas in `src/domain/session/schema.ts` (types via `z.infer` only), and implement a pure setup reducer in `src/domain/session/setup-reducer.ts` that handles the seven setup events from AD-7, guards the last enabled Medium, and falls back "This time" to random when its Medium is disabled.

## Boundaries & Constraints

**Always:**
- `src/domain/session/*` is pure: no `window`, `localStorage`, `Date.now`, `Math.random`, `crypto`, and no React/Next import (ESLint already enforces this for `src/domain`).
- Every exported TypeScript type for a persisted shape comes from `z.infer`; never a hand-written parallel interface.
- Reuse `SkillId`, `MediumId`, `TemplateId`, `TopicId`, `StyleId`, `ConstraintId`, `Level` from `src/domain/library/schema.ts` — do not redeclare them.
- Reuse tunables from `src/config/app.ts` (`config.reflection.maxChars`, `config.generator.recentWindow`) instead of hard-coding.
- The setup reducer is a plain pure function `(setup, event) => result`; it does not know about storage, the store, or the Repository.

**Never:**
- Do not edit `src/domain/ports.ts` — Story 3.5 extends `Repository` on another branch. Note the binding opportunity in Implementation Notes only.
- Do not implement `compose()`, the full session reducer (commits/reveal progress), storage adapters, or any UI — those are Stories 3.3, 3.4, 3.5, 3.7–3.11.
- Do not invent extra persisted fields beyond what AD-5/AD-7/AD-8/AD-9 describe.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| set_level | `{enabledMediums:['med.a','med.b'], ...}`, event `set_level('perform')` | `setup.level === 'perform'`, all other fields unchanged | N/A |
| set_perform_timing | event `set_perform_timing('timed')` | `setup.performTiming === 'timed'` | N/A |
| toggle_medium (enable) | `enabledMediums:['med.a']`, event `toggle_medium('med.b')` | `enabledMediums` becomes `['med.a','med.b']` (order-stable), no notice | N/A |
| toggle_medium (disable, not last) | `enabledMediums:['med.a','med.b']`, event `toggle_medium('med.b')` | `enabledMediums` becomes `['med.a']`, no notice | N/A |
| toggle_medium (disable last) | `enabledMediums:['med.a']`, event `toggle_medium('med.a')` | Setup unchanged (no-op); result carries `notice: 'last_medium'` | N/A |
| toggle_medium disables "This time" pick | `enabledMediums:['med.a','med.b']`, `medium:'med.b'`, event `toggle_medium('med.b')` | `enabledMediums` drops `med.b`, `medium` falls back to `'random'` | N/A |
| choose_medium | event `choose_medium('med.a')` or `choose_medium('random')` | `setup.medium` set exactly to the given value, `enabledMediums` unchanged | N/A |
| set_skill_focus | event `set_skill_focus('skl.observation')` or `('random')` | `setup.skillFocus` set exactly to the given value | N/A |
| set_quick_reveal / set_sound | event with boolean payload | matching field set to that boolean | N/A |
| Reducer purity | any event | reducer calls no `Date.now`, `Math.random`, storage, or I/O | N/A |

</frozen-after-approval>

## Code Map

- `src/domain/library/schema.ts` -- reuse `Level`, `SkillId`, `MediumId`, `TemplateId`, `TopicId`, `StyleId`, `ConstraintId`, the `idSchema`/`text` helpers' style (strict objects, `z.infer` types, trimmed non-empty strings). Do not modify.
- `src/config/app.ts` -- reuse `config.reflection.maxChars` (280), `config.generator.recentWindow` (30), `config.reveal.order` values (as the literal `RevealedKind` enum: skill, medium, topic, style, constraint, brief). Do not modify.
- `src/domain/ports.ts` -- `Repository.load/save<T>(key: StorageKey, ...)` is generic, not yet bound to concrete schemas; `StorageKey` is `'setup'|'session'|'history'`. Do not modify; note the future binding in Implementation Notes only.
- `src/domain/library/compat.ts`, `src/domain/library/render.ts` -- existing pure-function style to match (no classes, named exports, `{ok:true|false}` unions where a function can fail).
- `src/domain/test-doubles.ts` -- existing `fakeClock`/`seededRandom` test doubles; not needed by this story's reducer (it takes no Clock/Random), but kept for context on the project's test-double conventions.
- `src/domain/library/schema.test.ts`, `src/adapters/random.test.ts` -- existing Vitest style to match (colocated `*.test.ts`, `describe`/`it`, `it.each` for table-driven cases).
- No existing `src/domain/session/` directory — this story creates it.
- `eslint.config.mjs` -- the `src/domain` layer's `allowLayers(["config"], ...)` call did not permit domain submodules to import each other; see Implementation Notes for the one-line extension required to let `session` reuse `library`'s id schemas.

## Tasks & Acceptance

**Execution:**
- [x] `src/domain/session/schema.ts` -- define `Setup`, `Challenge` (with `ChallengeInputs`, `Origin`), `Attempt`, `Reflection`, `Rep`, `Export`, and `Session` (with `RevealedKind`, `Locks`) as strict zod schemas; export every type via `z.infer` -- AD-5, AD-7, AD-8, AD-9 require these exact persisted shapes
- [x] `src/domain/session/schema.test.ts` -- Vitest coverage: a valid `Setup` parses; a `Challenge` with a kind absent from `inputs` still parses (e.g. no `style`); `Rep.reflection` accepts `null` and accepts empty `worked`/`change` strings; a `Reflection` field over `config.reflection.maxChars` fails -- guards the schema shapes other stories will build on
- [x] `src/domain/session/setup-reducer.ts` -- define `SetupEvent` (discriminated union for the seven AD-7 setup events) and `setupReducer(setup: Setup, event: SetupEvent): { setup: Setup; notice?: 'last_medium' }`; implement the last-Medium guard and the "This time" fallback -- FR-2, FR-4, AD-7
- [x] `src/domain/session/setup-reducer.test.ts` -- Vitest coverage of every row in the I/O & Edge-Case Matrix above, plus a purity check (reducer is a plain function with no globals touched, verified by calling it with no mocked environment) -- required by the story's AC

**Acceptance Criteria:**
- Given `src/domain/session/schema.ts`, when it is imported, then `Setup`, `Challenge`, `Attempt`, `Rep`, `Session`, and `Export` are all zod schemas whose matching TypeScript types are produced only by `z.infer`
- Given the setup reducer, when any of the seven setup events is dispatched against a valid `Setup`, then the reducer returns the expected next `Setup` and never calls `Date.now`, `Math.random`, or any storage API
- Given a `Setup` with exactly one enabled Medium, when `toggle_medium` targets that Medium, then the returned `setup` is unchanged and the result carries `notice: 'last_medium'`
- Given a `Setup` whose `medium` (the "This time" pick) is a specific enabled Medium, when `toggle_medium` disables that same Medium, then the returned `setup.medium` is `'random'`

## Implementation Notes

- `eslint.config.mjs`'s `src/domain` layer rule allowed only `@/config` (plus zod), with no provision for one domain submodule importing another. That blocked `src/domain/session` from reusing `SkillId`/`MediumId`/etc. from `src/domain/library/schema.ts` via either the `@/` alias (not in the allow-list) or a relative path (banned everywhere under `src/` by the parent-relative rule). Extended the domain layer's `allowLayers` call to also allow `domain` (i.e. `@/domain/**`), so intra-domain imports use the same `@/` alias convention as every other layer. AD-2's rule ("imports only `@/config` and `zod`") is about domain never depending on outer layers (adapters, store, framework) — it was never about domain submodules sharing types with each other, and Story 3.3's `compose()` will need the same access to library schema types. No other guardrail changed; the no-globals/no-framework/no-Date.now/no-Math.random rules for `src/domain` are untouched.
- Used `z.partialRecord` (not `z.record`) for `Locks`: zod v4's `z.record` with an enum key schema produces an *exhaustive* record requiring every enum key present, which is wrong for a Locks map that is usually empty or partial.
- Reused the single `Reflection` schema for both `Rep.reflection` and `Session.reflectionDraft` (both are `{worked, change}` bounded by `config.reflection.maxChars`) rather than declaring a near-duplicate type.
- All four commands (`npm run lint`, `npm run typecheck`, `npm test`, `npm run build`) pass; `npm test` shows 117/117 passing (12 test files), including the two new suites.
- **Review loopback fixes:** `Setup` gained a `superRefine` rejecting duplicate `enabledMediums` ids and a `medium` that is neither `"random"` nor enabled (FR-2); `choose_medium` and `toggle_medium`'s last-Medium guard now enforce/respect that (guard uses the distinct-id count, not raw length). Added `set_ambient_motion` to `SetupEvent` plus a `default` branch in the reducer. `Session.recent` now trims to the newest `config.generator.recentWindow` entries via `.transform()` instead of rejecting on `.max()`, and `Reflection` dropped its `maxChars` cap (moved to a new `ReflectionInput` schema for UI-time validation only) so a later-lowered `config.reflection.maxChars` never breaks parsing of already-persisted data. `Origin` is now a discriminated union (`new`/`reroll` force `fromRepId: null`; `retry`/`variation` require a uuid); `Locks` is a partial strict object keyed by each Input kind's real id schema (was `z.partialRecord(InputKind, z.string())`); `Session` gained a `superRefine` tying `state` to `challenge`/`attempt` presence (`none`/`held`/`attempt`) and rejecting duplicate `revealed` kinds; `Export` rejects duplicate Rep ids. Added `src/domain/session/setup-fixture.ts` (one shared `baseSetup` built from `config.setup.defaults`) used by both test files, plus a deep-frozen-input purity check over every event and a `scripts/boundaries.test.ts` case pinning the widened domain-submodule ESLint allowance.

## Design Notes

- **Session schema shape (conservative, pending Story 3.4):** AD-9 describes the `impromptu:session` key's content by prose ("the held Challenge, reveal progress, Locks, the Attempt, the Finished reflection draft, `lastRepId`, `lastComposeError`, and the recent ring") rather than an exact field list. This story's `Session` schema is the most direct, literal translation of that prose plus the AD-7 state names (`none|held|attempt|finished|saved`) and AD-18's `revealed` set — e.g. `{ state, challenge: Challenge|null, revealed: RevealedKind[], locks: Partial<Record<InputKind,string>>, attempt: Attempt|null, reflectionDraft: {worked,change}|null, lastRepId: string|null, lastComposeError: {reason,blockingLock}|null, recent: string[] }`. Story 3.4 (the session reducer) is the one that exercises this shape through real transitions; if it finds a field missing or shaped wrong, it amends this schema rather than working around it.
- **`notice` over throwing or a separate event:** the AC says toggle_medium "returns a `last_medium` notice for the UI." Modeling the reducer's return as `{ setup, notice? }` (rather than a second dispatch, an exception, or a side channel) keeps it a single pure call the store can inspect synchronously, consistent with `render.ts`'s `{ok, ...}` pattern elsewhere in the domain.
- **Repository binding deferred:** `Repository.load<T>`/`save<T>` stay generic in this story (`src/domain/ports.ts` is untouched). Once Story 3.5 lands its key-typed extension, `load('setup')`/`save('setup', ...)` etc. can bind to `Setup`/`Session`/`Export`-wrapped-history from this file — flagged here, not implemented here.

## Review Triage Log

| # | Layer | Finding | Verdict | Evidence | Route |
|---|---|---|---|---|---|
| 1 | blind, edge | `choose_medium` can select a disabled Medium | medium | Reducer sets `medium` unchecked; schema has no cross-field rule; FR-2 impossible state | patch |
| 2 | blind, edge | Duplicate `enabledMediums` defeat the last-Medium guard | medium | `['med.a','med.a']` passes `min(1)`; guard sees length 2; `filter` empties the list | patch |
| 3 | blind, edge | No event for `ambientMotion`; no default branch | low | `Setup` field unreachable by reducer; untyped dispatch returns undefined | patch |
| 4 | blind, edge | Lowering `recentWindow`/`maxChars` breaks parsing of stored data | medium | `.max()` on persisted shapes rejects existing data → AD-9 memory fallback, AD-5 immutable Reps | patch |
| 5 | blind, edge | `Origin`, `Locks`, `Session` state, `Export` accept inconsistent data | medium | State/payload contradictions load and the reducer will dereference null | patch |
| 6 | verif-gap, blind | Single-Medium enable, required inputs, recent cap, booleans, purity untested | low | Pre-verified: removing `isEnabled &&` or making `skill` optional passes all tests | patch |
| 7 | peer (1.2 owner) | Pin widened `src/domain` boundary with an allowed case | low | Requested by Story 1.2 owner | patch |
| 8 | blind | Whole-layer `@/domain` allowance permits cycles | low | 1.2 owner approved whole-layer allowance; no cycle exists | reject |
| 9 | blind | `Attempt.timeLimitSec` duplicates the Challenge's | false | AD-8 lists `timeLimitSec` as an Attempt field | reject |
| 10 | edge | `pausedAt` may precede `startedAt` | low | Only reachable via corrupted storage; timer story (5.2) owns timing guards | reject |

## Verification

**Commands:**
- `npm run lint` -- expected: no errors, including the `src/domain` import/global restrictions on the two new files
- `npm run typecheck` -- expected: no errors
- `npm test` -- expected: all existing and new Vitest suites pass, including full coverage of the I/O & Edge-Case Matrix
- `npm run build` -- expected: production build succeeds
