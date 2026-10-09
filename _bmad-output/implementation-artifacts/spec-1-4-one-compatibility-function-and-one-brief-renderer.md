---
title: 'Story 1.4: One compatibility function and one Brief renderer'
type: 'feature'
created: '2026-10-09'
status: 'done'
baseline_commit: '4c30dc35eac115175f1e35bf3efe6ccaa618616f'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The validator (1.6–1.7) and the runtime `compose()` (3.3) must agree exactly on which combinations are valid and how a Brief reads (FR-6, FR-7, AD-4, AD-15). Two implementations would drift.

**Approach:** One pure `isCompatible()` in `src/domain/library/compat.ts` and one pure `render()` in `src/domain/library/render.ts`, both typed from the 1.3 schema, both total (never throw).

## Boundaries & Constraints

**Always:**
- Pure domain code: imports only `zod`/sibling `./schema`; no `../`, `window`, storage, `crypto`, `Date.now`, `Math.random`. All contradiction rules come from library data (tags/requires/excludes/incompatible) — no hard-coded tag names in logic.
- **Slot presence:** a Template slot (topic/style/constraint) is *present* iff its `<kind>Tags` list is non-empty; an empty list means the Template omits that slot.
- `isCompatible(template, medium, topic, style, constraint)` with `style`/`constraint` nullable returns `true` only if ALL hold:
  1. `template.mediums` includes `medium.id`;
  2. each present slot has a fill and each omitted slot has `null`;
  3. each fill shares ≥1 tag with the Template's tag list for its kind;
  4. no fill id, and no tag carried by the Medium or any fill, appears in `template.incompatible`;
  5. for each fill, "other parts" = Template `tags` ∪ Medium `tags` ∪ the other fills' `tags`: every `requires` tag is in other parts, and no `excludes` tag is.
- `render(template, medium, {topic, style, constraint})` returns `{ok:true, brief, guidance}` or `{ok:false, reason, slot?}`; never throws. Pattern = string `briefPattern`, else the record entry for `medium.id`. Each `{topic}`/`{style}`/`{constraint}` is replaced (all occurrences) by that fill's `briefText`, verbatim (no case changes). `guidance` = `template.guidance ?? null`, never in `brief`.
- Failure reasons: `no_pattern_for_medium`, `unknown_slot` (any `{token}` other than the three), `missing_fill` (placeholder present, fill null; `slot` set), `unused_fill` (fill given, no placeholder; `slot` set).

**Never:**
- No Brief length/sentence checks, coverage, reachability, retired filtering, or file loading — those belong to 1.6/1.7 and `compose()`.
- Do not edit `src/domain/ports.ts`, `src/config/`, ESLint, CI, `package.json` (Story 1.2 in flight).

</frozen-after-approval>

## Code Map

- `src/domain/library/schema.ts` -- types `Template`, `Medium`, `Topic`, `Style`, `Constraint`; reuse, don't modify. `topicTags`/`styleTags`/`constraintTags` are required arrays (empty = omitted slot).
- `content/library/tags.json`, `mediums.json` -- real tag ids (`person`, `camera`, `visual`…) to use in test fixtures; Medium names must not appear in `src/domain` (use fixture ids like `med.alpha`).
- Tests run with `npx vitest run` (no vitest config on this branch; sibling imports only).

## Tasks & Acceptance

**Execution:**
- [x] `src/domain/library/compat.ts` -- export `isCompatible` per rules 1–5 -- single AD-4 implementation
- [x] `src/domain/library/compat.test.ts` -- cases: valid full combo; Topic requires `person` vs Constraint excludes `person` → false; requirement satisfied by Medium tag (e.g. `camera`) → true and unsatisfied → false; `incompatible` by fill id → false; `incompatible` by tag → false; Style omitted (empty `styleTags`, `style:null`) → true; style given for omitted slot → false; present slot with `null` → false; fill sharing no tag with its slot list → false; Medium not in `template.mediums` → false
- [x] `src/domain/library/render.ts` -- export `render` and its result type
- [x] `src/domain/library/render.test.ts` -- string pattern; per-Medium pattern chosen over others; repeated placeholder replaced everywhere; guidance returned separately and absent from brief; each failure reason

**Acceptance Criteria:**
- Given any inputs, when `isCompatible` or `render` runs, then it returns a value and never throws.
- Given `src/domain`, when grepped for `../`, banned globals, or Medium names, then nothing matches.

## Implementation Notes

- Spec approved under the founder's "keep building" instruction. Stacked on Story 1.3 (`story/1-4-compat-render` from `4c30dc3`).
- `topic` is also nullable (slot presence applies to all three kinds). Render substitutes in a single pass so fill text containing `{style}` is never re-substituted.
- Review patches were test-only (triage rows 1–3); all tests, tsc, lint, and the banned-pattern grep pass.

## Spec Change Log

## Review Triage Log

| # | Layer | Finding | Verdict | Evidence | Route |
|---|---|---|---|---|---|
| 1 | blind | "Topic requiring person" test uses `tags`, not `requires` | low | Spec task names the requires/excludes case; test file shows `tags:["place","person"]` | patch |
| 2 | blind | `excludes` via Medium/Template tags and `requires` via another fill untested | low | No such cases in `compat.test.ts`; regression dropping a source from "other parts" would pass | patch |
| 3 | blind | Omitted Topic/Constraint slots untested; render null-constraint path untested | low | Only Style omission covered | patch |
| 4 | blind | Slot presence decided differently in compat (tags) vs render (placeholders) | low | Real divergence, but Story 1.6's gate renders every compatible combination and fails on any render error, so no gate-approved combo is unrenderable; schema refinement would add guard logic | reject |
| 5 | blind | Per-Medium pattern may be missing for a listed Medium | low | AD-15 allows subset keys; caught by Story 1.6 render-every-combination | reject |
| 6 | blind | `isCompatible` returns bare boolean, no reason | low | Frozen intent and AD-4 specify a predicate; 1.7 can attribute failures by re-checking rules if needed | reject |
| 7 | blind | `unknown_slot` doesn't name the token | low | Authoring convenience; adds public surface | reject |
| 8 | blind | Template `tags` not checked against `incompatible` | false | Frozen rule 4 lists only Medium and fill tags; behaviour matches spec | reject |
| 9 | blind | Slot names duplicated between `SLOTS` and regex | low | Maintainability only; slots are fixed by AD-15 | reject |
| 10 | blind, edge | Unbalanced/nested braces render with `ok:true` or misleading `unused_fill` | low | Story 1.6 gate fails any rendered Brief with leftover braces | reject |
| 11 | edge | `undefined` fills throw / misclassify | false | Parameters are typed `X | null`; TypeScript rejects `undefined`; callers pass schema-parsed data | reject |
| 12 | edge | Same fill object passed for two slots | false | Slots take distinct id kinds (`top.`/`sty.`/`con.`); one object cannot be valid for two slots | reject |
| 13 | verif-gap | Tests not run by a script/CI on this branch | false | Story 1.2 merged to main (f35cd6e) with `npm test` + CI; branch is rebased onto it | reject |

## Verification

**Commands:**
- `npx vitest run` -- expected: all pass
- `npx tsc --noEmit` -- expected: no errors
- `npm run lint` -- expected: no errors
- `grep -rnE "\.\./|window|localStorage|Date\.now|Math\.random|crypto|Writing|Photography|Drawing|Spoken" src/domain` -- expected: no matches
