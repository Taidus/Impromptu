---
title: 'Story 1.8: Generation pipeline kit: prompt, rubric, batch folders, and soft-gate tooling'
type: 'feature'
created: '2026-10-09'
status: 'in-review'
baseline_commit: '7bf85e9b3db7ea126e4da03bb927ce2510ec9232'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Nothing yet tells an AI coding-agent session how to author a library batch the same way twice, how the judge/founder soft gate reviews it, or how a batch folder is created and sampled for review (CL-6, AD-17, PRD OQ-1).

**Approach:** Write a versioned `PROMPT.md` + `RUBRIC.md` + `README.md` under `content/library/pipeline/`, and two dev-only CLI scripts — `library:new-batch` (scaffolds a batch folder + manifest) and `library:sample` (renders every compatible combination touching a draft batch's new entries, plus a 20-item founder sample, into one Markdown file) — reusing the existing `isCompatible`/`render`. The hard gate (`library:validate`, Stories 1.6/1.7) is not on this branch; the kit only documents it as a future step and never depends on it existing.

**Founder decisions (2026-10-09, carried from spec-1-5 and sprint-status action_items):**
- Styles are named art styles (Y2K, wabi sabi, japandi, chrome, collage, ...) and always appear in the Brief sentence; the Style library must include a "your choice" Style (not authored here — `styles-01` is Story 1.9).
- Constraints state a rule (what may or may not happen); Styles describe a treatment (CL-4).
- **briefText convention (resolves the 1.5-deferred item):** every Topic/Style/Constraint `briefText` is a lowercase phrase fragment with no leading capital and no terminal punctuation. Any capitalization or end punctuation a Template needs lives in the Template's own `briefPattern` text, never in a shared fill. `con.unnoticed-details` and `con.no-people` (anchors, frozen by Story 1.5) predate this rule and are documented exceptions, not a pattern to copy.

## Boundaries & Constraints

**Always:**
- `PROMPT.md`/`RUBRIC.md`/`README.md` each start with a `Version: <semver>` header line.
- `PROMPT.md` embeds the three CL-5 anchor Briefs verbatim and the briefText convention above; it instructs reading `content/library/tags.json` for the tag vocabulary (never pastes a copy that can go stale) and names the target Skill/Level/Medium cells, the FR-5 Level semantics, the 160-char Brief cap, CL-4, AD-6 id patterns, and a "Regeneration context" section to paste the prior `gate-report.json` failures into.
- `RUBRIC.md` lists each scoring item from the AC with an explicit pass/fail definition, including the briefText convention and the CL-5 anchors as the quality bar.
- `library:new-batch -- <kind> <scope>` (`kind` ∈ `topics|styles|constraints|templates`) creates `content/library/batches/<YYYY-MM-DD>-<kind>-<scope>-<nn>/` (`nn` auto-increments per existing `<kind>-<scope>` pair) with `manifest.json` matching the `BatchManifest` schema (`status:"draft"`, `review:null`, `promptVersion`/`rubricVersion` read from the docs' version headers) and an empty `<kind>.json` (`[]`).
- `library:sample -- <batchId>` resolves `batchId` against batch folder names (exact or unique suffix match), loads active data (anchors + any `accepted` batches, minus retired ids) plus the target batch's own new entries, computes every `isCompatible` combination that uses a new entry via `render()`, and writes `sample.md` next to that batch's `manifest.json` with every rendered Challenge (judge pass) and a random 20-item subset (founder skim, or all of them if fewer than 20).
- Both scripts run via `tsx` (matching `validate.ts`/`build.ts`'s documented convention) and are added to `package.json` as `library:new-batch`/`library:sample`.
- Reuse `src/domain/library/{schema,compat,render}.ts` as-is; no change to those files.

**Never:**
- No `scripts/library/validate.ts`, `build.ts`, CI wiring, or `coverage.enforce` (Stories 1.6/1.7, another branch). `library:sample` must not import or require them.
- No `scripts/library/generate.ts` (optional per AC; needs an LLM client, not trivial — skip it; document the key/`.env`/no-`src/`-import rule in `README.md` for whoever adds it later).
- No real batch content (no `topics-01`, `styles-01`, Template batch) — that is Story 1.9.

</frozen-after-approval>

## Code Map

- `src/domain/library/schema.ts` -- `BatchManifest`, `Topic/Style/Constraint`, `Template` zod schemas to parse against; `text` requires non-empty trimmed strings (manifest placeholders must not be `""`).
- `src/domain/library/compat.ts#isCompatible`, `render.ts#render` -- reuse directly; a slot is present iff its `<kind>Tags`/token is non-empty.
- `content/library/anchors/{templates,topics,styles,constraints,anchors}.json` -- always-active base combinations; `content/library/{skills,mediums,tags}.json` -- always-active base data.
- `content/library/batches/.gitkeep`, `content/library/pipeline/.gitkeep` -- delete once each directory has real files.
- `scripts/library/{anchors,base-data}.test.ts` -- existing pattern: `z.array(Schema).parse(json)`, relative imports (`../../src/...`), vitest `describe/it`, no `@/` alias in scripts.
- `vitest.config.mts` -- `include` already covers `scripts/**/*.test.ts`.
- `package.json` -- add two scripts; `tsx` already a devDependency, no new dependency needed.

## Tasks & Acceptance

**Execution:**
- [x] `content/library/pipeline/PROMPT.md` -- versioned prompt per Boundaries -- AC1
- [x] `content/library/pipeline/RUBRIC.md` -- versioned rubric per Boundaries -- AC1
- [x] `content/library/pipeline/README.md` -- documents the AD-17 loop (hard gate, soft gate, whole-batch rejection, ≤3 regenerations then escalate, rubric-rejected ids regenerated in-batch, typo edits in `edits[]`, one PR per batch, accepted batches immutable, patch batches + `retire[]`) and the optional `generate.ts` key rule -- AC4
- [x] delete `content/library/pipeline/.gitkeep` -- directory now holds real files. `content/library/batches/.gitkeep` is kept (restored after a manual smoke test) since this story ships no real batch content (Story 1.9's scope) and an empty dir needs the placeholder to stay tracked.
- [x] `scripts/library/new-batch.ts` -- pure helpers (`parseVersionHeader`, `nextBatchSeq`, `buildManifest`) + `createBatch()` (fs) + CLI `main()` guarded by `import.meta.url` -- AC2
- [x] `scripts/library/new-batch.test.ts` -- unit-test the pure helpers; one tmp-dir integration test for `createBatch()`
- [x] `scripts/library/sample.ts` -- `findBatchFolder`, `detectKind`, `loadActiveLibrary` (fs), `buildCombos` (pure), `toMarkdown` (pure, injectable RNG) + CLI `main()` -- AC3
- [x] `scripts/library/sample.test.ts` -- unit-test `buildCombos`/`toMarkdown` against small in-memory fixtures (reuse the render.test.ts fixture style); one tmp-dir integration test
- [x] `package.json` -- add `library:new-batch`/`library:sample` scripts

**Acceptance Criteria:**
- AC1 Given `PROMPT.md`/`RUBRIC.md`, when read, then both carry a version header and PROMPT.md contains the CL-5 anchors, the briefText convention, the 160-char cap, CL-4, AD-6, and a regeneration-context slot; RUBRIC.md lists pass/fail items covering FR-7, Brief-stands-alone, Level fit, Skill fit, Medium realism, Style/Constraint distinctness, no contradiction, and the anchor bar.
- AC2 Given `npm run library:new-batch -- topics general`, when run twice, then two folders `…-topics-general-01` and `…-topics-general-02` exist, each with a schema-valid draft `manifest.json` and an empty `topics.json`.
- AC3 Given a draft batch folder with a few new `Topic` entries and the repo's anchors as active data, when `npm run library:sample -- <batchId>` runs, then `sample.md` lists every `isCompatible` combination using a new topic with its rendered Brief, plus a ≤20-item founder sample.
- AC4 Given `README.md`, when read, then it states the full AD-17 batch lifecycle loop and the `generate.ts` key rule.
- Given `npm run lint && npm run typecheck && npm test && npm run build`, then all pass.

## Implementation Notes

- Spec approved under "keep building" (founder instruction, 2026-10-09); no checkpoint halt.
- Open Question "briefText convention per slot" resolved in the frozen block above (lowercase fragment, no fill-level punctuation) — the conservative, schema-untouched option; the alternative (a second `briefPatternSentence` token in `render.ts`) was rejected as a code change outside this story's scope.
- Addresses the 1.8 half of the sprint-status action item "Founder decision 2026-10-09: Styles are named art styles ... Story 1.8 PROMPT.md must encode this" — encoded in `PROMPT.md`; the 1.9 half (`styles-01` must include "your choice") is unchanged and left for Story 1.9.
- Review patches applied (triage rows 1-9): `buildCombos` now returns `{combos, renderFailures}`; render-pass-but-render-fail combinations are no longer dropped and render as a "Render failures" `sample.md` section. `loadActiveLibrary` applies `retire[]` only from `accepted` batches or from `sampledBatchFolder` itself (the sampled batch's own patch); a malformed-but-present `manifest.json` now throws naming its folder, a missing `manifest.json` still skips. `buildCombos` warns on stderr past 50,000 candidate combinations (no cap). `new-batch.ts`: `scope` must match the kebab-slug pattern or `createBatch` throws (main() also fast-fails with a usage message); version headers are parsed and the manifest built before any `mkdirSync`; the batch folder's `mkdirSync` is non-recursive (throws `EEXIST` instead of reusing/overwriting); the `Version:` regex no longer crosses a newline; `nextBatchSeq` parses the full `<date>-<kind>-<scope>-<nn>` shape with an anchored regex instead of `indexOf` (closes a same-prefix-scope false match); the batch date is the local calendar day, not UTC; the dead post-log `existsSync` check is removed. `KINDS`/`Kind` are now declared once in `new-batch.ts` and imported by `sample.ts`. `README.md`/`PROMPT.md`: batch landing now says status/review are set in the PR before merge (not "on merge"); the batch author (not the AI session) replaces the `TBD` generator fields by hand; `library:validate` is marked as arriving with Stories 1.6/1.7; the `scope` convention (fill: free slug; Template: `<skill-slug>-<level>`) and `sample.md` being committed with the PR are now stated; the founder-sample wording matches the code (20 drawn from the batch's own rendered combinations); PROMPT.md's "and nothing else" line, which contradicted pasting the Regeneration-context section on a re-run, is reworded. Added tests for each (row 9): draft-batch exclusion from `active` (and its own-batch `retire[]` exception), a `retired: true` entry, a `templates`-kind batch using only the new Template, the default-20 cap at 21+ combos, and a render failure appearing in its own section; plus `isSlug`/invalid-scope and a mocked-stale-listing existing-folder test for `new-batch.ts`. Triage row 10 (batch entry-count checks) rejected as out of scope — that is the Story 1.7 hard gate's job.

## Spec Change Log

## Review Triage Log

| # | Layer | Finding | Verdict | Evidence | Route |
|---|---|---|---|---|---|
| 1 | blind, edge | Compatible-but-unrenderable combos silently dropped from `sample.md` | medium | `if (!rendered.ok) continue;` hides failures the judge must see | patch |
| 2 | blind, edge, verif-gap | Draft batches' `retire[]` removes active ids | medium | `retired.add` runs before the accepted check; spec says accepted batches only | patch |
| 3 | blind, edge | Malformed accepted manifest skipped silently | medium | `catch { continue; }` drops an accepted batch's entries | patch |
| 4 | blind, edge | `scope` unvalidated (path traversal, invalid names) | medium | Joined into the folder path verbatim | patch |
| 5 | blind, edge | Orphan folder on missing version; existing folder overwritten; version regex crosses lines; seq parsing via `indexOf`; UTC date | low | Code reviewed; each is a direct correction | patch |
| 6 | blind | `KINDS`/`Kind` duplicated | low | Identical declarations in two scripts | patch |
| 7 | blind | Unbounded cross-product | low | ~3.3M checks possible; a warning suffices | patch |
| 8 | blind | README/PROMPT contradictions and missing conventions | low | Step 7 vs 8; `TBD` generator; `library:validate` not yet present; scope and `sample.md` unspecified | patch |
| 9 | verif-gap | Draft exclusion, templates batch, default 20, `retired: true` untested | low | Pre-verified: inverting each passes all tests | patch |
| 10 | blind | Batch entry counts not checked | low | Batch sizing belongs to the Story 1.7 hard gate (AD-17) | reject |

## Design Notes

- `new-batch.ts`/`sample.ts` split pure logic (version/seq parsing, combo building, Markdown rendering) from fs/CLI glue so each has a fast, fixture-based unit test without touching disk; one tmp-dir integration test per script covers the fs glue.
- `library:sample`'s combinatorial scan is a dev-only, offline tool over a small library (3 anchors today, hundreds at launch) — not a runtime hot path. `# ponytail: full cross-product scan, add early-exit pruning if a future batch makes it slow.`
- Batch `scope` is an author-chosen free slug (e.g. `general` for fill batches, `observation-explore` for Template batches); `nn` disambiguates repeats of the same `kind`+`scope`. This is an implementation choice, not a founder-visible one — the user only sees the resulting folder name.

## Verification

**Commands:**
- `npm run lint && npm run typecheck && npm test && npm run build` -- all pass (113 tests, 12 files)
- `npm run library:new-batch -- topics smoke-test` then (after hand-adding one fixture topic) `npm run library:sample -- topics-smoke-test-01` -- rendered the real anchor Template `tpl.observation.explore.nearby-object` against the new fixture topic into `sample.md`; folder deleted afterward, not committed
