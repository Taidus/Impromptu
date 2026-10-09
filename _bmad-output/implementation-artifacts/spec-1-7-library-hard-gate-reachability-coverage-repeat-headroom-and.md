---
title: 'Story 1.7: Library hard gate: reachability, coverage, repeat headroom, and the build step'
type: 'feature'
created: '2026-10-09'
status: 'in-progress'
baseline_commit: '4d2a92215be466b71a81725ed5143a3156cc6d2e'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The Story 1.6 gate proves every Challenge is well-formed but proves nothing about whether the library has enough of them: a Template with zero renderable fills, a Skill×Level×Medium cell with no coverage, or a setup that would repeat the same Challenge constantly can all pass today. Nothing also stops `next dev`/`next build` from running against unreviewed draft batches, since no build step exists yet.

**Approach:** Extend `scripts/library/gate.ts` (pure, already reused by `validate.ts`) with three more checks — reachability (≥3 valid combinations per active Template, reusing the existing Brief-rule enumeration's `isCompatible()`/`render()` pass rather than a second cross-product), coverage/repeat-headroom (Skill×Level×Medium Template count and templateId+topicId pair counts), and AD-17 batch sizing — then add `scripts/library/build.ts`, wired to `predev`/`prebuild`, which loads anchors plus only `status: accepted` batches (via a new pure `filterAccepted` helper in `load.ts`), runs the same gate, and on success writes the gitignored `src/generated/library.json` with a content-hash `libraryVersion`.

**Deferred decisions resolved here:**
1. The three CL-5 anchor Templates (their ids come from `content/library/anchors/anchors.json`) are exempt from the ≥3-combinations reachability rule — each intentionally admits only its own pinned fill, and the byte-for-byte anchor check already pins them instead.
2. `coverage.enforce` starts `false` in `gate-config.ts` (Story 2.8 switches it on). Below the threshold, the two coverage/headroom checks produce warnings (new `GateReport.warnings[]`), never failures. Batch sizing (AD-17) is unconditional and always enforced for the batch under review, regardless of the flag. The Skill-focused headroom check (<31) always warns, never fails, regardless of the flag too.

## Boundaries & Constraints

**Always:**
- `gate.ts` stays a pure function of already-parsed data (no `fs`); reuse the existing Brief-rule enumeration loop's `isCompatible()`/`render()` pass to accumulate reachability/headroom counts — do not add a second cross-product loop.
- New tunables (`reachability.minCombinations`, `coverage.*`, `batchSizing.minTemplatesPerMedium`) live in `scripts/library/gate-config.ts`, matching Story 1.6's build-tooling-only convention — never in `src/config/app.ts`.
- `GateReport` gains `warnings: GateFailure[]` (same shape as `failures`, never flips `ok`) and `retiredIds: string[]` (JSON-serializable form of the retired-id set `gate.ts` already computes, so `build.ts` can exclude retired entries from `library.json` without recomputing the set).
- `load.ts`'s existing exports and behavior are unchanged; it gains one new pure export, `filterAccepted(lib)`, with no new `fs` calls.
- `build.ts` resolves the repo root from its own file location (matches `validate.ts`), never `process.cwd()`.
- `npm run dev` and `npm run build` must keep working against the current real `content/library` tree (anchors only, zero batches).

**Never:**
- No changes to `src/domain/library/{schema,compat,render}.ts`, to `content/library/anchors/*` data, or to `scripts/library/sample.ts` (a separate, unmerged-on-this-branch Story 1.8 file with its own loader).
- No subprocess test exercising `build.ts`'s or `validate.ts`'s non-zero exit code — deferred (no real batches to fail against yet; tracked in `deferred-work.md`).
- `build.ts` does not write its own `gate-report.json` — failures go to the console only; `validate.ts` remains the report-writing entry point.

</frozen-after-approval>

## Code Map

- `scripts/library/gate.ts` -- extend `runGate`: add `anchorTemplateIds` (from `lib.anchors`), accumulate `validComboCountByTemplate`/`pairsByCell`/`pairsByLevelMedium` inside the existing Brief-rule loop (right after `const { brief } = result;`), then after that loop add reachability, coverage/headroom, and batch-sizing sections before the final `dedupe`+return. Export the existing inline `retiredIds` Set as `GateReport.retiredIds` (sorted array) instead of only using it internally.
- `scripts/library/gate-config.ts` -- add `reachability`, `coverage` (with `enforce: false`), and `batchSizing` blocks; keep the `as const` pattern.
- `scripts/library/load.ts` -- add `export function filterAccepted(lib: LoadedLibrary): LoadedLibrary` (pure): keeps `anchors`-sourced + accepted-manifest-sourced templates/fills, keeps only accepted manifests, and drops issues whose batch folder isn't accepted (base-file issues, which have no `batches` segment in their `source` path, always pass through).
- `scripts/library/build.ts` -- new -- CLI entry mirroring `validate.ts`'s style: `filterAccepted(loadLibrary(root))` → `runGate` → on failure, console-log failures and set `process.exitCode = 1`; on success, filter out `retiredIds`, build `{libraryVersion, skills, mediums, templates, topics, styles, constraints, anchors}`, hash it (`node:crypto` sha256, hex, sliced), write to `src/generated/library.json`.
- `package.json` -- add `"predev"` and `"prebuild"` scripts (`tsx scripts/library/build.ts`); `dev`/`build` scripts unchanged so npm's lifecycle auto-run picks them up.
- `scripts/library/gate.test.ts` -- existing fixtures/conventions (`baseLib`, `sourced`, `template`, `fillEntry`, `draftManifest`, `rulesOf`) to reuse; one existing test ("does not fail when a compatible combination's render fails") must be updated — its second Template (`tpl.observation.explore.y`) is not in `defaultAnchor` so it is no longer exempt from reachability, and Story 1.7 intentionally makes that case fail now (0 valid combinations), while still proving render failure isn't a `brief.*` rule violation.
- `scripts/library/load.test.ts` -- existing `writeJson`/temp-dir pattern for `loadLibrary`; add synthetic-fixture tests for `filterAccepted` (no `fs` needed, it's pure).
- `content/library/anchors/anchors.json`, `templates.json` -- read-only reference: the 3 anchor template ids that must be reachability-exempt.
- `.gitignore` -- already ignores `/src/generated/` and `/gate-report.json`; no change needed.
- `.github/workflows/ci.yml` -- already runs `library:validate` then `build`; no change needed (both now exercise the extended gate at their respective scopes).

## Tasks & Acceptance

**Execution:**
- [x] `scripts/library/gate-config.ts` -- edit -- add `reachability.minCombinations: 3`, `coverage.{enforce: false, minTemplatesPerCell: 2, minComboPerLevelMedium: 60, minComboPerSkillFocusedCell: 31}`, `batchSizing.minTemplatesPerMedium: 3`
- [x] `scripts/library/gate.ts` -- edit -- reachability (anchor-exempt), coverage/headroom (enforce-gated failures vs. always-warnings), batch sizing (unconditional), `GateReport.warnings`/`retiredIds`
- [x] `scripts/library/load.ts` -- edit -- add `filterAccepted`
- [x] `scripts/library/build.ts` -- new -- predev/prebuild entry writing `src/generated/library.json`
- [x] `package.json` -- edit -- add `predev`/`prebuild` scripts
- [x] `scripts/library/gate.test.ts` -- edit -- update the one affected existing test; add reachability (pass/fail/anchor-exempt), coverage/headroom (enforce on/off, Skill-focused always-warn), and batch-sizing tests
- [x] `scripts/library/load.test.ts` -- edit -- add `filterAccepted` tests (accepted-only filtering, draft/invalid-batch issue exclusion, base-file issues always kept)

**Acceptance Criteria:**
- Given an active Template with fewer than 3 valid `isCompatible()`+`render()`-ok combinations and not referenced by any anchor, when `runGate` runs, then it fails `reachability.min-combinations` naming that Template; an anchor Template with the same shortfall does not fail this rule.
- Given `coverage.enforce: false` (the shipped default) and a Skill×Level×Medium cell with fewer than 2 active Templates or a Level×Medium setup with fewer than 60 distinct templateId+topicId combinations, when `runGate` runs, then both appear in `report.warnings` and `report.ok` stays `true` (all else passing); given `coverage.enforce: true`, the same shortfalls appear in `report.failures` instead.
- Given any coverage.enforce setting, a Skill-focused cell with fewer than 31 distinct templateId+topicId combinations always appears in `report.warnings`, never `report.failures`.
- Given a batch (non-`"anchors"` source) whose Templates give one of its declared Mediums fewer than 3 Templates, when `runGate` runs, then it fails `batch.sizing` for that batch+medium regardless of `coverage.enforce`.
- Given the real `content/library` tree (anchors only, zero batches) and `coverage.enforce: false`, when `npm run library:validate` runs, then it still exits 0.
- Given a draft batch with templates/fills and an accepted batch with templates/fills, when `build.ts` runs, then `src/generated/library.json` contains only the accepted batch's entries (plus anchors), and a retired entity (its own `retired: true` or a later accepted batch's `manifest.retire[]`) is excluded from the written file.
- Given `npm run dev` or `npm run build` against the current real tree, when the `predev`/`prebuild` hook runs, then it exits 0 and writes `src/generated/library.json` with a non-empty `libraryVersion`.
- Given `npm run lint && npm run typecheck && npm test && npm run library:validate && npm run build && npm run check:static`, then all pass.

## Implementation Notes

- Spec approved under "keep building" (CHECKPOINT 1 override); implemented directly in this session (no subagent dispatch, per orchestrator override).
- Reachability, coverage/headroom, and batch-sizing all reuse the Brief-rule enumeration's single `isCompatible()`+`render()` pass (new `Map`/`Set` accumulators filled inside the existing loop) rather than a second cross-product — kept the gate's one-pass-per-Template performance characteristic from Story 1.6.
- `isCompatible()` is the single `requires[]`/`excludes[]` authority; reachability's enumeration calls it directly, so the AC's "fails if any reachable combination violates a requires or excludes rule" is satisfied by construction. No separate requires/excludes re-check was added (would duplicate `src/domain/library/compat.ts`'s logic).
- **Judgment calls (no founder-visible effect at the current anchors-only, zero-batch state of the library; documented here rather than raised as Open Questions):**
  - **Coverage/headroom cell enumeration is exhaustive**, not just over cells that already have a Template: every `Skill × Level × Medium` cell (`lib.skills.length × 4 × lib.mediums.length`) and every `Level × Medium` pair is checked, so the report shows the full pre-Epic-2 gap map (208 warnings against the current real tree) rather than only the cells a batch happens to touch. This matches "it reports every ... cell" literally and gives the founder a progress map; all 208 are warnings, not failures, since `coverage.enforce` is `false`.
  - **Batch sizing (AD-17) checks each batch against the Mediums its own Templates declare**, not a hardcoded "all 4 Mediums" — a batch's `templateCountByBatchMedium` is grouped by `(source, mediumId)` from its own Templates' `mediums[]`, so a batch that legitimately targets fewer Mediums isn't penalized for Mediums it never claimed to cover.
  - **`src/generated/library.json` excludes retired entities.** The AC text only says "it includes only anchors and batches whose status is accepted," not whether to drop retired entries, but "active sets" language is used consistently elsewhere (`gate.ts`'s `activeTemplates`/etc.), and nothing at the runtime layer (not yet built) has a way to re-derive which entries are retired without re-loading `manifest.retire[]`. `gate.ts`'s already-computed `retiredIds` Set is exposed via the new `GateReport.retiredIds: string[]` field (JSON-safe) instead of recomputed in `build.ts`, so there's no duplicated retirement logic.
  - **`build.ts` does not write its own `gate-report.json`.** On failure it logs each failure to the console and exits non-zero (sufficient for a Vercel build log); `validate.ts` remains the one report-writing entry point, per the Story 1.6 boundary.
- Added `GateConfig.coverage.enforce: false as boolean` (one explicit widen, not a structural change) so `gate.test.ts` can override it per-test (`{ ...gateConfig.coverage, enforce: true }`) despite the rest of `gate-config.ts` staying `as const` for its literal word-list tuples.
- One existing Story 1.6 test (`gate.test.ts`, "does not fail when a compatible combination's render fails") explicitly deferred reachability to this story in its own comment; updated it to assert the new expected behavior (a `reachability.min-combinations` failure, never a `brief.*` one) instead of `ok: true`.
- Deferred to Story 1.9 (alongside the existing `validate.ts` subprocess-test deferral): a subprocess test of `build.ts`'s non-zero exit and an end-to-end check that `library.json` drops a draft batch's content and a retired entity, once real batches/retirements exist. `filterAccepted` (load.ts) and `retiredIds`/the three new gate rules (gate.ts) are unit-tested directly in the meantime.
- Full verification chain run against the real `content/library` tree (anchors only, zero batches): `library:validate` → `PASS` (`ok:true`, 0 failures, 208 warnings — the full pre-Epic-2 coverage/headroom gap, all non-blocking since `coverage.enforce` is `false`), `npm run build` → `predev`/`prebuild` ran `build.ts` (`libraryVersion ba2fcbdc46c6ba85`, wrote `src/generated/library.json`) then `next build` compiled and prerendered all 5 routes.

## Spec Change Log

_None._

## Review Triage Log

_None — step-04 review is explicitly skipped for this session per orchestrator override._

## Verification

**Commands:**
- `npm run lint && npm run typecheck && npm test && npm run library:validate && npm run build && npm run check:static` -- expected: all exit 0
- **Actual (2026-10-09):** lint clean; typecheck clean; `npm test` 12 files / 149 tests passed (13 new: 9 in `gate.test.ts`, 4 in `load.test.ts`); `library:validate` → `Library gate: PASS — 3 templates, 3 topics, 1 styles, 3 constraints, 3 anchors, 0 batches, 0 retired.` (exit 0, `gate-report.json` has `ok:true`, `failures:[]`, 208 `warnings`); `npm run build` → `predev`/`prebuild` ran `build.ts` (`Library build: OK — libraryVersion ba2fcbdc46c6ba85, 3 templates, 3 anchors, 0 accepted batch(es)`, wrote `src/generated/library.json`) then `next build` compiled and prerendered `/`, `/_not-found`, `/practice`, `/privacy`, `/stage` (exit 0); `check:static` → OK for all 4 routes; `check:privacy` (not in the required chain, run anyway) → OK. All green.
