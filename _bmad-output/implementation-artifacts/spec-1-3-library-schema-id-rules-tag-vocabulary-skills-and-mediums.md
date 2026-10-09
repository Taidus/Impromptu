---
title: 'Story 1.3: Library schema, id rules, tag vocabulary, Skills and Mediums'
type: 'feature'
created: '2026-10-09'
status: 'done'
baseline_commit: '91a1e43d1434cdc23316f136ef2292b21f2029da'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The generator, validator, and runtime need one agreed shape for library data (CL-1, AD-15). Without it they drift on field names and id formats.

**Approach:** Define every library entity once as a zod schema in `src/domain/library/schema.ts` (types only via `z.infer`), with AD-6 id patterns and the Perform-only/Explore-only refinements. Seed `content/library/` with the six Skills, four Mediums, and the controlled tag vocabulary.

## Boundaries & Constraints

**Always:**
- `src/domain/library/schema.ts` imports only `zod`. No `window`, `document`, storage, `crypto`, `Date.now`, `Math.random`. Sibling imports use `./x`; never `../`.
- Every exported TS type is `z.infer<typeof X>`; no hand-written parallel interfaces.
- Id patterns (lowercase kebab slugs): `skl.<slug>`, `med.<slug>`, `tpl.<skill-slug>.<level>.<slug>`, `top.<slug>`, `sty.<slug>`, `con.<slug>`. A Template id's `<skill-slug>` and `<level>` must equal its `skill` (minus `skl.`) and `level`.
- Level ids: `explore`, `experiment`, `develop`, `perform`. Duration field is `timeLimitSec`.
- Skill `info` strings are exactly the EXPERIENCE → Voice and Tone sentences.

**Never:**
- No `isCompatible`, `render`, validator, build step, anchors data, or batches (Stories 1.4–1.9).
- Do not edit `src/domain/ports.ts`, `src/config/`, ESLint config, CI, or `package.json` scripts (Story 1.2, in flight in another session).
- No Medium names anywhere except `content/library/mediums.json` (NFR-6).

</frozen-after-approval>

## Code Map

- `src/domain/library/` -- new; `schema.ts` + colocated `schema.test.ts`.
- `content/library/` -- has `anchors/`, `batches/`, `pipeline/` (`.gitkeep` only); add `skills.json`, `mediums.json`, `tags.json`.
- `scripts/library/` -- `.gitkeep` only; add `base-data.test.ts`.
- `src/domain/ports.ts` (Story 1.2, not yet on main) -- `Library { libraryVersion }`; shape finalised later, not here.
- Vitest has no config on main yet, so `@/` does not resolve in tests: tests use sibling/relative imports. Run with `npx vitest run`.
- `EXPERIENCE.md` lines 87–92 -- Skill `info` copy.

## Tasks & Acceptance

**Execution:**
- [x] `src/domain/library/schema.ts` -- export `Level`, id schemas (`SkillId`…`ConstraintId`, `TagId` = lowercase kebab, no prefix), `Tag {id, description}`, `Skill {id, revealText, info, tags}`, `Medium {id, revealText, info, tags}`, fill base `{id, revealText, briefText, tags, requires, excludes, retired?}` as `Topic`/`Style`/`Constraint` with their id schema, `Template` (fields per epic context; `briefPattern` string or record keyed by Medium id; `incompatible` = fill ids or tag ids), `Anchor {templateId, mediumId, topicId, styleId|null, constraintId|null, expectedBrief}`, `BatchManifest {status:'draft'|'accepted', generator{tool,model,promptVersion}, rubricVersion, review{judge, founderSample, rejectedIds, date}|null, edits[{id, note}], retire[]}`; `.strict()` objects; arrays default `[]` only for `requires`/`excludes`/`incompatible`/`tags`/`edits`/`retire` -- one shape for all consumers
- [x] `Template` refinements -- reject `timeLimitSec` unless `level==='perform'` (positive int), `guidance` unless `explore`, `briefPattern` record keys not in `mediums`, id/skill/level mismatch; each message contains the Template id -- FR-5, CL-1
- [x] `src/domain/library/schema.test.ts` -- valid fixtures pass; each refinement and each malformed id fails with the expected message
- [x] `content/library/tags.json` -- array of `Tag`: at least `person`, `people`, `camera`, `text`, `visual`, `voice`, `outdoor`, `indoor`, `object`, `place`, `sound`, `color` -- traits anchors/pilot will reference
- [x] `content/library/skills.json` -- six Skills (`skl.observation`, `skl.idea-generation`, `skl.connection`, `skl.perspective`, `skl.expression`, `skl.revision`), `tags: []`
- [x] `content/library/mediums.json` -- `med.writing` [text], `med.drawing` [visual], `med.photography` [camera, visual], `med.spoken-storytelling` [voice]; one-line `info` each
- [x] `scripts/library/base-data.test.ts` -- parse the three JSON files with the schemas; every Skill/Medium tag exists in `tags.json`; ids unique

**Acceptance Criteria:**
- Given a Template with `timeLimitSec` at a non-Perform Level, or `guidance` at a non-Explore Level, when parsed, then parsing fails naming the Template id.
- Given any id not matching its kind's pattern, when parsed, then parsing fails.
- Given the three content files, when parsed with the schemas, then they pass and every referenced tag resolves to `tags.json`.
- Given `src/domain`, when grepped, then no Medium name or banned global appears.

## Implementation Notes

- Spec approved under the founder's "keep building" instruction (no explicit checkpoint reply).
- Built in worktree `../Impromptu-1-3` on `story/1-3-library-schema` from `main` (91a1e43), parallel to Story 1.2 in another session; ports/config/ESLint/CI untouched.
- Template `topicTags`/`styleTags`/`constraintTags` are required (no default); an empty list means the slot is omitted (Story 1.4 must honour this).
- Founder may want to review wording written here: Medium `info` lines, tag descriptions, Skill `revealText`.
- Review patches applied (triage rows 1–6); `npx vitest run` 34 passed, `tsc`, lint, and the banned-pattern grep clean.

## Spec Change Log

## Review Triage Log

| # | Layer | Finding | Verdict | Evidence | Route |
|---|---|---|---|---|---|
| 1 | blind, edge | Accepted `BatchManifest` with `review: null` parses | medium | Reproduced: `safeParse` returns success; accepted batches could skip the AD-17 review record | patch |
| 2 | blind | `retire`/`edits`/`rejectedIds` accept Skill/Medium ids that have no `retired` field | low | `EntityId` union includes `SkillId`/`MediumId`; Skills/Mediums are base data, never in batches | patch |
| 3 | edge | Malformed Template id also emits misleading segment-mismatch issues | low | Reproduced: `tpl.Bad` yields 3 issues | patch |
| 4 | edge | Whitespace-only text passes | low | `z.string().min(1)` accepts `" "`; blank reveal text would reach the Stage | patch |
| 5 | edge, blind | Id-reject tests don't assert the expected message; `%#` titles | low | Spec task says "fails with the expected message"; tests check only `success` | patch |
| 6 | verif-gap | `.strict()` untested on non-Template schemas | low | Pre-verified: removing `.strict()` from `fill` passes all 33 tests | patch |
| 7 | blind, edge | Per-Medium `briefPattern` may omit some `mediums` / be `{}` | low | AD-15 specifies keys as a *subset* of `mediums`; an unrenderable cell is caught by Story 1.6's render-every-combination gate | reject |
| 8 | blind | Placeholder tokens/slot-tag pairing unchecked | low | Story 1.6 hard gate owns "slots match the declared fills" | reject |
| 9 | blind, edge | Fill `requires`∩`excludes` overlap, duplicate tags | low | Unlikely in validated batches; fix adds guard refinements | reject |
| 10 | blind, edge | Template tag/medium duplicates; `incompatible` bare slug ambiguity | low | Bare slugs are TagIds by design (AD-4); Story 1.6 resolves every tag/id reference | reject |
| 11 | blind | Unused vocabulary tags, magic counts, empty Skill tags | low | Vocabulary seeded for anchors/pilot (1.5, 1.9); counts are fixed by the PRD glossary | reject |
| 12 | blind | No cross-file integrity checks (templates→skills, anchors→fills) | low | Story 1.6 owns integrity; frozen intent excludes validator | reject |
| 13 | blind | No upper bound on `timeLimitSec`; `founderSample` may be 0 | low | Not a defect without a spec'd bound | reject |
| 14 | blind, edge | Generic zod errors lack entity id | false | Spec requires the id in *refinement* messages, which hold; gate (1.6) reports per-entry | reject |
| 15 | blind | No `topics/styles/constraints.json` or manifest files | false | Fills arrive as batches in 1.9; frozen intent excludes batches | reject |
| 16 | edge | `briefPattern` bad record key error lacks Template id | low | Rare authoring slip; gate reports per-entry path | reject |
| 17 | verif-gap | Anchor `constraintId: null`, manifest date/edits shapes unpinned | low | Pre-verified gap; consumers (1.5, 1.8) should pin with real fixtures | defer |
| 18 | verif-gap | Tests not wired to a script/CI on this branch | false | Story 1.2 (in flight) adds `npm test`, CI, and includes `scripts/**` | reject |

## Verification

**Commands:**
- `npx vitest run` -- expected: all tests pass
- `npx tsc --noEmit` -- expected: no errors
- `npm run lint` -- expected: no errors
- `grep -rnE "\.\./|window|localStorage|Date\.now|Math\.random|crypto|Writing|Photography" src/domain` -- expected: no matches
