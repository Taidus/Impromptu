---
title: 'Story 6.4: Export Practice History as JSON'
type: 'feature'
created: '2026-10-09'
status: 'in-progress'
baseline_commit: '29cceb0'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-6-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Practice History lives only in one browser. Users switching machines need a file copy (FR-28).

**Approach:** An Export ink button at the top right of the history (with Reps and storage available) downloads `impromptu-practice-YYYY-MM-DD.json` containing `{ app: "impromptu", exportVersion, exportedAt, reps }` built by a pure `buildExport(reps, nowIso)` in `src/domain/practice/export.ts` and validated with the existing `Export` zod schema (AD-5). The download is a Blob object URL on a temporary anchor; "Exported." is announced inline via `role="status"`. No network request. JSON only; no import.

## Boundaries & Constraints

**Always:**
- `src/domain/practice/export.ts`: `export const EXPORT_VERSION = 1`; `buildExport(reps: Rep[], exportedAt: string): Export` returns `Export.parse({...})` (throws on an invalid rep set, which cannot happen for store data; never catch silently); `exportFilename(dateIso: string): string` → `impromptu-practice-YYYY-MM-DD.json` from the date's UTC day. Pure (the caller passes the time from the Clock).
- Client: `src/components/practice/ExportButton.tsx` (`"use client"`): an `InkButton` on paper labelled `copy.button.export` ("Export"); on click builds the export with `systemClock.now()` (via `getAppStore()`'s clock? the store does not expose its clock: use `new Date().toISOString()` here, it is a component, not domain), creates `new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })`, an `<a download>` with `URL.createObjectURL`, clicks it, revokes the URL, then sets a status message `copy.state.exported` ("Exported.") rendered in an always-mounted `role="status"` element (reuse `InlineStatus` with `className="text-ink-soft"`).
- Placement: `PracticeView` gets an `exportControl: ReactNode` prop rendered in a controls row at the top right of the history (above `PracticeHistory`, right-aligned, only when `repCount > 0 && storageAvailable`); `PracticeClient` passes `<ExportButton reps={history} />`. Hidden when storage is unavailable (6.1 AC).
- Tests: unit for `buildExport` (shape, version, exportedAt passthrough, duplicate-id rejection) and `exportFilename`; component test of the pure markup (button label; status text after a `fired` prop); e2e in `e2e/practice.spec.ts`: seed one Rep, click Export, assert `page.waitForEvent("download")` yields `suggestedFilename()` matching `/^impromptu-practice-\d{4}-\d{2}-\d{2}\.json$/`, read the file and `Export.parse` it, and assert "Exported." is visible; assert no request to anything but same-origin static assets during the click (`page.on("request")` filter).
- Copy: `copy.button.export = "Export"`, `copy.state.exported = "Exported."`.

**Never:**
- No CSV, no import, no server route, no store changes, no new dependencies.

</frozen-after-approval>

## Code Map

- `src/domain/session/schema.ts` -- `Export`, `Rep`.
- `src/components/practice/PracticeView.tsx`, `PracticeClient.tsx` (6.1–6.3) -- props `action`, `reps`, `map`; add `exportControl`.
- `src/components/InkButton.tsx`, `src/components/setup/InlineStatus.tsx` (with `className`).
- `e2e/practice.spec.ts` -- seeding helper; Playwright downloads need `acceptDownloads` (default true).

## Tasks & Acceptance

**Execution:**
- [ ] `src/domain/practice/export.ts` + `export.test.ts`.
- [ ] `src/components/copy.ts` -- `button.export`, `state.exported`.
- [ ] `src/components/practice/ExportButton.tsx` (+ pure view) and a markup test.
- [ ] `src/components/practice/PracticeView.tsx`, `PracticeClient.tsx` -- `exportControl`.
- [ ] `e2e/practice.spec.ts` -- download case.

**Acceptance Criteria:**
- Given Reps, when Export is activated, then a file `impromptu-practice-YYYY-MM-DD.json` downloads containing a valid `Export` object, "Exported." is announced, and no network request is made.
- Given no Reps or unavailable storage, then no Export control renders.
- Given lint, typecheck, unit, build, check:static and e2e, then all pass.

## Implementation Notes

## Spec Change Log

## Review Triage Log

## Verification

**Commands:**
- `npm run lint && npm run typecheck && npm test` -- expected: clean
- `npm run build && npm run check:static` -- expected: `/practice` static
- `E2E_PORT=3102 npm run test:e2e` -- expected: all specs pass
