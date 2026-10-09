---
title: 'Story 1.5: Transcribe the three CL-5 anchors verbatim'
type: 'feature'
created: '2026-10-09'
status: 'done'
baseline_commit: 'd0e34c16d4efe4eb071016aeb000cad0bc10089e'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The founder's three example Challenges must ship verbatim and act as the quality bar for every generated batch (CL-5). They do not exist as library data yet.

**Approach:** Transcribe each as ordinary Template + fill entries under `content/library/anchors/`, list them in `anchors.json` (AD-16 shape), and prove with a test that each renders byte-for-byte to its expected Brief and passes `isCompatible()`.

**Decisions (founder, 2026-10-09):**
- A **Style is a named art style** (examples: Y2K, wabi sabi, japandi, chrome, collage) and always appears in the Brief sentence. "Minimalist" is not example 2's Style.
- Example 2's verbatim Brief names no style, so **anchor 2 has no Style** (`styleTags: []`, `styleId: null`).
- The Style library must include a **"your choice"** option (the maker picks the art style). Not built here: recorded for the Story 1.8 prompt and the Story 1.9 `styles-01` batch.

## Boundaries & Constraints

**Always:**
- Expected Briefs, character for character:
  1. Explore · Observation · Drawing, no Style, untimed: "Draw an object near you. Include three details you have never paid attention to."
  2. Experiment · Expression · Photography, no Style, Constraint no people, untimed: "Take two photos of coming home. Make one feel comforting and the other lonely. Keep people out of both."
  3. Perform · Idea generation · Writing, Style Horror, Constraint nothing bad happens, `timeLimitSec: 300`: "Write three premises for a first date that feels like horror, even though nothing bad happens."
- Every entry parses with the 1.3 schemas; ids follow AD-6; each anchor Brief ≤ 160 chars.
- Contradiction rules are data: the no-people Constraint `excludes` the person/people traits; Topics carry only tags they need.
- New tags may be added to `content/library/tags.json` only if an anchor needs them.

**Never:**
- No validator, gate, build step, or batch folders (1.6–1.9). No change to `schema.ts`, `compat.ts`, `render.ts`.

</frozen-after-approval>

## Code Map

- `src/domain/library/{schema,compat,render}.ts` -- reuse; slot present iff `<kind>Tags` non-empty; `render` fails `unused_fill`/`missing_fill` on slot mismatch.
- `content/library/{skills,mediums,tags}.json` -- `skl.observation`, `skl.expression`, `skl.idea-generation`; `med.drawing`, `med.photography`, `med.writing`; vocabulary incl. `person`, `people`, `object`, `place`, `text`, `visual`, `camera`.
- `scripts/library/base-data.test.ts` -- pattern for JSON-backed tests; `@/` resolves in tests (vitest.config.mts from 1.2).

## Tasks & Acceptance

**Execution:**
- [x] `content/library/anchors/templates.json` -- three Templates (`tpl.observation.explore.*`, `tpl.expression.experiment.*`, `tpl.idea-generation.perform.*`), each limited to its anchor's Medium; patterns with `{topic}`/`{style}`/`{constraint}` slots so the fills render the exact Brief
- [x] `content/library/anchors/topics.json`, `styles.json`, `constraints.json` -- the fills (`revealText` short label for the Reveal piece, `briefText` the exact phrase); Style `sty.horror` with `revealText` "Horror"
- [x] `content/library/anchors/anchors.json` -- three `Anchor` entries, `styleId: null` for anchors 1 and 2
- [x] `scripts/library/anchors.test.ts` -- parse every anchors file with its schema; for each anchor resolve ids, assert `isCompatible(...) === true`, `render(...)` ok and `brief === expectedBrief`, `brief.length <= 160`; anchor 3 Template has `timeLimitSec: 300`; every tag used resolves in `tags.json`

**Acceptance Criteria:**
- Given the anchor data, when the test renders each anchor, then output string-equals the Always list and each anchor is compatible.
- Given `npm run lint && npm run typecheck && npm test`, then all pass.

## Implementation Notes

- Spec approved under "keep building"; Style rule and anchor-2-without-Style are founder decisions (2026-10-09).
- Added tags `tone` (Style genre/mood), `exclusion`, `outcome` (Constraint rule kinds) to `tags.json`.
- Review patches applied (triage rows 1–6); lint, typecheck, and all tests pass.

## Spec Change Log

## Review Triage Log

| # | Layer | Finding | Verdict | Evidence | Route |
|---|---|---|---|---|---|
| 1 | verif-gap | Founder wording never pinned; test compares data to itself | medium | Pre-verified: a typo in both `briefText` and `expectedBrief` passes every test; AC says "string-equals the Always list" | patch |
| 2 | blind | `con.no-people` tagged `people` (opposite meaning) | low | `tags.json` defines `people` as "involves more than one person"; a fill excluding/requiring `people` would mis-match | patch |
| 3 | blind, edge | Constraint shares `tone` tag with Style | low | Blurs CL-4 Style/Constraint separation in data; lets tone-slot Templates pull a constraint fragment | patch |
| 4 | blind | `top.first-date` tagged `person` | low | A date involves two people; `excludes:["people"]` would fail to block it | patch |
| 5 | blind, edge | Tests depend on `anchors.json` order | low | Hard-coded `anchors[2]` for the Perform check | patch |
| 6 | blind, edge | No negative rule check; ids/retired/`incompatible` tags unchecked; weak failure messages | low | Test file reviewed; cheap assertions | patch |
| 7 | blind | "Minimalist" Style missing from anchor 2 | false | Founder decision 2026-10-09 recorded in the frozen block: Styles are art styles in the Brief; anchor 2 has no Style | reject |
| 8 | blind | Anchor Templates yield one combination each; AR-18 requires ≥3 | low | Real for Story 1.7's reachability check unless pilot fills fit or anchors are exempt; decision belongs to 1.7 | defer |
| 9 | blind, edge | `briefText` formats differ (sentence vs fragment); "Keep people out of both." only fits its own Template | low | Fill reuse across Templates could render broken Briefs; needs a convention in Story 1.8's PROMPT/RUBRIC | defer |

## Verification

**Commands:**
- `npm run lint && npm run typecheck && npm test` -- expected: all pass
