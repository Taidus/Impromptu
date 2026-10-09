---
title: 'Story 1.6: Library hard gate: integrity, Brief rules, Time Limits, anchors, and the CL-4 lint'
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

**Problem:** `npm run library:validate` does not exist. Nothing today rejects a malformed Template, a Brief that leaks `{braces}` or runs past 160 characters, a Time Limit below Perform, a drifted anchor, or a Style/Constraint that violates CL-4 wording rules. A broken batch could pass lint/typecheck/tests and still ship bad content.

**Approach:** Add `scripts/library/validate.ts` (run via `tsx`, wired to `npm run library:validate`) that loads `content/library/anchors/` plus every (currently empty) `content/library/batches/*` folder in folder-name order, parses everything through the Story 1.3 zod schemas, and runs a pure gate (`scripts/library/gate.ts`) covering: integrity (unique ids, tag vocabulary, every `incompatible[]`/`retire[]` reference resolves, retired-but-resolvable), Brief rules (no leftover braces, 1–3 sentences, ≤160 chars) over every compatible fill combination via the existing `isCompatible`/`render`, the three CL-5 anchors rendering byte-for-byte to `expectedBrief`, and the CL-4 Style/Constraint wording lint. The gate writes `gate-report.json` plus a console summary and exits non-zero on any failure. `.github/workflows/ci.yml` gains a `library:validate` step.

## Boundaries & Constraints

**Always:**
- The 160-char Brief cap and the CL-4 word lists live in a new `scripts/library/gate-config.ts` (build-tooling-only config), never hard-coded in `gate.ts`'s branches and never added to `src/config/app.ts` — that file ships into the client bundle and gate word lists are build-time only (AR-21 governs runtime tunables, not offline tooling).
- `gate.ts` is a pure function of already-parsed, in-memory library data (no `fs`) so it is unit-testable with synthetic fixtures; `load.ts` does the `fs`/`path` I/O and JSON parsing and is reused unchanged by Story 1.7's `build.ts`.
- Time Limit enforcement reuses the Story 1.3 schema refinement (`timeLimitSec` only at `perform`) — the loader surfaces a parse failure as a gate failure naming the id, it does not re-implement the rule.
- Brief-rule enumeration pre-filters each slot's candidate fills by tag intersection before cross-producing (perf: avoids a full template×topic×style×constraint×medium cross product).
- CL-4 lint checks both `revealText` and `briefText` against the configured word lists; lists start small (the AC's own examples: `no`/`only`/`must`/`without` plus a count check for Style; a short starter mood/treatment list for Constraint) and are meant to grow in `gate-config.ts` as later batches surface false negatives.
- Retirement: an entity is retired if its own `retired: true` field is set, or its id appears in any loaded batch's `manifest.retire[]`. Retired entities stay resolvable (reference checks use the full id set) but are excluded from the Brief-rule enumeration and the CL-4 lint (only active entities are linted/rendered).
- `gate-report.json` is written to the repo root and is gitignored (generated artifact, like `src/generated/`).

**Never:**
- No reachability, coverage, repeat-headroom checks, `coverage.enforce`, or `scripts/library/build.ts`/`predev`/`prebuild`/`src/generated/library.json` — all Story 1.7.
- No changes to `src/domain/library/{schema,compat,render}.ts` or to `content/library/anchors/*` data.
- No batch-sizing check (AD-17) — needs real batches to mean anything; Story 1.8/1.9.

</frozen-after-approval>

## Code Map

- `src/domain/library/schema.ts` -- `Skill`/`Medium`/`Template`/`Topic`/`Style`/`Constraint`/`Anchor`/`BatchManifest`/`Tag` zod schemas; `Template` already refines `timeLimitSec`-only-at-perform and `guidance`-only-at-explore; reuse via `safeParse`, never re-validate by hand.
- `src/domain/library/compat.ts` -- `isCompatible(template, medium, topic, style, constraint)`; reuse for the Brief-rule enumeration and the anchor check.
- `src/domain/library/render.ts` -- `render(template, medium, fills)` returns `{ok:true,brief,guidance}` or `{ok:false,reason,slot?}`; never throws.
- `content/library/{skills,mediums,tags}.json`, `content/library/anchors/{templates,topics,styles,constraints,anchors}.json` -- real data to load; 3 anchor Templates, no batches yet (`content/library/batches/` holds only `.gitkeep`).
- `scripts/library/anchors.test.ts`, `scripts/library/base-data.test.ts` -- existing pattern for importing JSON content directly in a Vitest file via relative paths (no `@/` alias — `tsx` run outside Vitest won't resolve it either, so new script files use relative imports too).
- `scripts/check-static.mjs`, `scripts/check-privacy.mjs` -- existing standalone CLI scripts invoked from `package.json`/`ci.yml`; follow this convention (exit code, no framework).
- `.github/workflows/ci.yml` -- steps run `lint`, `typecheck`, `check:privacy`, `test`, `build`, `check:static`, then Playwright; insert `library:validate` right after `typecheck` (matches epic-1-context's documented order: lint, typecheck, library:validate, vitest, playwright).
- `.gitignore` -- already ignores `/src/generated/`; add `/gate-report.json` alongside it.
- `src/config/app.ts` -- the one *runtime* tunables module (AD-19); deliberately NOT extended here (see Boundaries).

## Tasks & Acceptance

**Execution:**
- [x] `scripts/library/gate-config.ts` -- new -- `brief.maxChars: 160`, `brief.minSentences: 1`, `brief.maxSentences: 3`, `lint.styleRuleStartWords`, `lint.styleCountWords`, `lint.constraintMoodWords` word lists
- [x] `scripts/library/load.ts` -- new -- `loadLibrary(root: string)`: reads base data + `anchors/` + sorted `batches/*` folders, `safeParse`s every entry individually (never throws), returns `{tags, skills, mediums, templates, topics, styles, constraints, anchors, manifests, issues}` with each parse failure as an `issue` naming its source file and (when available) raw id
- [x] `scripts/library/gate.ts` -- new -- pure `runGate(lib, config)`: integrity (duplicate ids, tag vocabulary, `incompatible[]`/`retire[]`/anchor-field resolution, retired-set computation), Time-Limit pass-through of loader issues, Brief-rule enumeration + anchor equality check, CL-4 lint; returns `GateReport {ok, failures:[{id,rule,message}], counts}`
- [x] `scripts/library/validate.ts` -- new -- CLI entry: `loadLibrary` + `runGate`, writes `gate-report.json`, prints a human summary (one line per failure), sets `process.exitCode`
- [x] `scripts/library/gate.test.ts` -- new -- unit tests of `runGate` against synthetic fixtures: duplicate id, unknown tag, unresolved `incompatible`/`retire`/anchor refs, retired-but-resolvable (incl. excluded-from-enumeration proof), brace leak, sentence-count violations (0 and 4+), length-cap violation, a compatible-but-unrenderable combo not failing (1.7's concern), CL-4 Style-as-rule / Style-as-count / Constraint-as-mood flags, anchor pass + mismatch
- [x] `scripts/library/load.test.ts` -- new -- loads the real `content/library` tree (anchors only) and temp-dir fixtures covering folder-name batch order + per-entity source tagging, a missing manifest, an invalid manifest, and one bad entry not blocking the rest of a file
- [x] `package.json` -- edit -- add `"library:validate": "tsx scripts/library/validate.ts"`
- [x] `.github/workflows/ci.yml` -- edit -- add `- run: npm run library:validate` after the `typecheck` step
- [x] `.gitignore` -- edit -- add `/gate-report.json`

**Acceptance Criteria:**
- Given the real `content/library` tree (anchors only, no batches), when `npm run library:validate` runs, then it exits 0 and `gate-report.json` has `ok: true`.
- Given a synthetic Template whose rendered Brief for a compatible combination exceeds 160 characters, has 0 or 4+ sentences, or retains a `{brace}`, when `runGate` runs, then the report is `ok:false` with a failure naming that Template's id and the specific rule.
- Given a synthetic Style whose `briefText` starts with "no"/"only"/"must"/"without" or names a count, and a synthetic Constraint whose `briefText` is a bare mood/treatment word, when `runGate` runs, then both are flagged as CL-4 lint failures.
- Given a synthetic anchor whose `expectedBrief` does not match `render()`'s output, when `runGate` runs, then it fails naming that anchor's template id.
- Given a synthetic entity retired via a later batch's `manifest.retire[]`, when `runGate` runs, then references to its id still resolve but it is excluded from Brief-rule enumeration and CL-4 linting.
- Given `npm run lint && npm run typecheck && npm test && npm run library:validate && npm run build`, then all pass.

## Implementation Notes

- Spec approved under "keep building"; implemented directly in this session (no subagent dispatch, per orchestrator override).
- Gate tunables deliberately live in a new `scripts/library/gate-config.ts`, not in `src/config/app.ts` (AR-21's runtime config): `src/config/app.ts` ships into the client bundle, and the 160-char cap / CL-4 word lists are build-time-only. This is a judgment call (no founder-visible effect), documented here rather than raised as an Open Question.
- `gate.ts` is a pure function (`runGate(lib, config)`, no `fs`) so Story 1.7's `build.ts` can reuse `load.ts` + `gate.ts` unchanged and layer its own reachability/coverage/headroom checks and `coverage.enforce` flag on top.
- Retirement model: an entity is retired if its own `retired` field is `true` **or** its id appears in any loaded batch's `manifest.retire[]`. Reference-resolution checks (`incompatible[]`, `retire[]`, anchor fields) use the full id set (including retired), matching "retired entries ... still resolvable"; only the Brief-rule enumeration and the CL-4 lint use the active (non-retired) subset.
- `timeLimitSec`-below-Perform is enforced by the Story 1.3 schema refinement (surfaced via the loader's `safeParse` as `integrity.parse`) **and** directly by `gate.ts` itself (`integrity.time-limit`), since `gate.test.ts` exercises `runGate` with hand-built fixtures that bypass schema parsing entirely — belt-and-suspenders, added in the review-fix round below.
- A compatible fill combination whose `render()` call returns `{ok:false}` (e.g. a Template's `topicTags` and its `briefPattern` tokens disagree) is intentionally **not** a gate failure in this story — Story 1.7's reachability check ("≥3 valid combinations per Template") is what catches a Template with zero renderable Briefs. Covered by a dedicated test (`gate.test.ts` → "does not fail when a compatible combination's render fails").
- CL-4 word lists (`styleRuleStartWords`, `styleCountWords`, `constraintMoodWords`) start as short, literal examples straight from the epics AC text plus a small starter mood-word set; marked with `ponytail:` comments in `gate-config.ts` to extend as real batches (Story 1.8/1.9) surface false negatives.
- Sentence counting is a cheap heuristic (`[^.!?]*[.!?]+` groups) — it doesn't understand abbreviations; acceptable for the controlled, authored Brief patterns this gate validates.
- `npm run library:validate` passes clean (`ok:true`) against the real `content/library` tree (anchors only, zero batches); `gate-report.json` is written to the repo root and gitignored.

**Review-fix round (Review Triage Log rows 1–12, patch-routed):** `load.ts` now catches malformed JSON / a non-array body instead of throwing, and treats `tags.json`/`skills.json`/`mediums.json`/`anchors/anchors.json` as required (missing → issue) and flags any unexpected `*.json` filename in a batch folder; `loadFills` is three typed `parseEach` calls, no `as never`. `validate.ts` resolves the repo root from its own file location, not `process.cwd()`. `gate.ts`: `entityIds` now covers templates+fills only (never skills/Mediums); each anchor field resolves against its own kind-specific id set (a field pointing at the wrong kind is now actually reported, not silently treated as "already reported"); an anchor resolving to a retired id fails `anchor.retired`; `manifest.edits[].id` and `review.rejectedIds` are resolved too; all by-id lookups are first-wins, matching the duplicate-id check; zero loaded anchors fails `anchor.missing`; `render()`'s `unknown_slot` now reports `brief.braces` and `no_pattern_for_medium` reports `integrity.no-pattern` (only `missing_fill`/`unused_fill` stay reachability-deferred); a Brief must end with `.`/`!`/`?`, and a decimal point (`3.5`) no longer counts as a sentence break; every `GateFailure` now carries an optional `source` (the culprit's batch/`anchors` origin) and, for a Brief-rule failure caused by one fill's own text, names that fill's id instead of the Template's; failures are de-duplicated by (rule, culprit id), merging distinct messages rather than dropping them. CL-4: the count check now only matches a standalone digit run or number word (not `1920s`, `35mm`, or a hyphenated `one-point`), and the mood lint also flags a phrase made only of mood words, intensifiers, and "and"/"or" (`very moody`, `dreamy and soft`), checked against `revealText` and `briefText` alike, and skipped for retired entities. `load.test.ts`'s real-tree assertion checks minimums, not exact counts.

## Spec Change Log

## Review Triage Log

| # | Layer | Finding | Verdict | Evidence | Route |
|---|---|---|---|---|---|
| 1 | blind, edge, verif-gap | Loader throws on malformed JSON / manifest despite "never throws" | high | Unguarded `JSON.parse` in `readJsonArray` and manifest read; one bad file aborts the gate with no report | patch |
| 2 | blind, edge | Missing base files and zero anchors pass the gate | high | Edge reviewer ran from an empty cwd: PASS with 0 of everything; CL-5 anchor guarantee void | patch |
| 3 | edge | `validate.ts` depends on cwd | medium | Root from `process.cwd()`; combined with #2 an empty library passes | patch |
| 4 | blind, edge | Anchor fields resolve against any kind; skill/medium ids resolve for refs; anchors may use retired entities; edits/rejectedIds unresolved; last-wins maps | medium | `entityIds` built from `allIds`; anchor loop `continue`s without a report | patch |
| 5 | edge | `unknown_slot` and `no_pattern_for_medium` silently skip Brief checks | medium | `if (!result.ok) continue` before checks | patch |
| 6 | blind, edge | Sentence count accepts unterminated tails; decimals inflate count | low | `countSentences` regex behaviour | patch |
| 7 | blind, edge | Failures lack batch/fill attribution; one bad fill floods the report | low | `GateFailure` has no `source`; failures keyed by template per combination | patch |
| 8 | blind | CL-4 lint false positives (`1920s`, `one-point`) and misses multi-word moods | low | `/\d/` and `\bone\b`; mood lint matches whole single words only | patch |
| 9 | blind | `loadFills` uses `as never` | low | Type safety lost by filename switch | patch |
| 10 | blind | Real-tree test hardcodes counts | low | Every content batch would break `npm test` | patch |
| 11 | blind, verif-gap | Missing tests: Time Limit, retired lint exclusion, `revealText` lint, `anchor.incompatible`, malformed input | low | Pre-verified mutations pass all tests | patch |
| 12 | edge | Misnamed batch content files ignored | low | Content silently dropped | patch |
| 13 | edge | Draft batches gated like accepted ones | false | AD-17: the hard gate runs on the draft batch under review; only `build.ts` (1.7) restricts to accepted | reject |
| 14 | edge | Emoji counted as two UTF-16 units | low | Briefs are authored plain text; negligible | reject |
| 15 | verif-gap | CLI non-zero exit never exercised | low | Needs a subprocess harness; no real batches until 1.9 | defer |

## Verification

**Commands:**
- `npm run lint && npm run typecheck && npm test && npm run library:validate && npm run build` -- expected: all exit 0
- **Actual (2026-10-09):** lint clean; typecheck clean; `npm test` 12 files / 119 tests passed; `library:validate` → `Library gate: PASS — 3 templates, 3 topics, 1 styles, 3 constraints, 3 anchors, 0 batches, 0 retired.` (exit 0); `next build` compiled and prerendered all 5 routes statically (exit 0). All green.
- **Review-fix round (2026-10-09):** re-ran the same full chain after patching rows 1–12 above — lint clean, typecheck clean, `npm test` 12 files / 136 tests passed (14 new tests), `library:validate` still `PASS` against the real tree (including from a non-repo cwd, confirming the root-resolution fix), `next build` green.
