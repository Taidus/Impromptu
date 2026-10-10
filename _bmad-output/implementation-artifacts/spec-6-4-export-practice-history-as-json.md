---
title: 'Story 6.4: Export Practice History as JSON'
type: 'feature'
created: '2026-10-09'
status: 'done'
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
- [x] `src/domain/practice/export.ts` + `export.test.ts`.
- [x] `src/components/copy.ts` -- `button.export`, `state.exported`.
- [x] `src/components/practice/ExportButton.tsx` (+ pure view) and a markup test.
- [x] `src/components/practice/PracticeView.tsx`, `PracticeClient.tsx` -- `exportControl`.
- [x] `e2e/practice.spec.ts` -- download case.
- [x] Review patches: always-mounted `role="status"` body-type line (`exported` / `exportFailed`), `aria-describedby`, `flushSync` re-announce, body-attached anchor with deferred revoke, stricter tests (literal `exportVersion: 1`, `text-ink-soft`, two Reps in history order, `exportedAt` freshness and derived filename, post-visibility request listener).

**Acceptance Criteria:**
- Given Reps, when Export is activated, then a file `impromptu-practice-YYYY-MM-DD.json` downloads containing a valid `Export` object, "Exported." is announced, and no network request is made.
- Given no Reps or unavailable storage, then no Export control renders.
- Given lint, typecheck, unit, build, check:static and e2e, then all pass.

## Implementation Notes

`buildExport`/`exportFilename` live in `src/domain/practice/export.ts`, pure and parsed through the existing `Export` schema (duplicate ids throw via its own `refine`). `ExportButton.tsx` splits into `ExportButtonView` (markup only, `useId` for the status) and the wired `"use client"` `ExportButton`, which takes `new Date().toISOString()` itself since the domain layer may not touch the clock. `PracticeView` got a required `exportControl: ReactNode` prop rendered in a `flex justify-end` row above `PracticeHistory`, gated by the same `storageAvailable && repCount > 0` condition as the history itself; `PracticeClient` wires `<ExportButton reps={history} />`. Existing `practice.test.ts` was extended with an `EXPORT_MARKER` stand-in to assert the control's placement and its with-Reps-only visibility. The e2e case seeds one Rep, clicks Export, asserts the downloaded file's name and its `Export.parse`-able contents, "Exported." becoming visible, and that every observed request during the click stayed same-origin (or `data:`/`blob:`).

After review: the status is an always-mounted `<p role="status" className="text-body text-ink-soft">` holding `null`, `copy.state.exported`, or `copy.state.exportFailed` (set when `buildExport` throws, then rethrown); the button points at it via `aria-describedby` once it has text, and each click clears it under `flushSync` first so a repeat export re-announces. The download anchor is appended to `document.body`, clicked and removed, and the object URL is revoked on a 10s `setTimeout` (synchronous revoke can cancel the download). The e2e request listener attaches after the button is visible and allows only `blob:`, `${origin}/_next/`, and same-origin `?_rsc=` `<Link>` prefetches, which Next.js fires around the click with nondeterministic timing (seen on Chromium and WebKit even after `networkidle`).

## Spec Change Log

- 2026-10-10: e2e no-network filter also allows same-origin `?_rsc=` route prefetches (Next.js `<Link>`), which the strict `blob:`/`_next/` filter flaked on; they are same-origin RSC payloads, not external requests.
- 2026-10-10: status region is a plain `<p role="status">` in body type instead of `InlineStatus`, because the Inline message pattern (vermilion dot) is reserved for conflicts and errors in DESIGN.md; the email-signup success line is the precedent.

## Review Triage Log

- [patch] `role="status"` must be present before firing: assert it in the `render(false)` markup test. (verification-gap)
- [patch] Assert `exportVersion: 1` literally, not via the imported constant. (verification-gap)
- [patch] e2e: `exportedAt` within 60s of now and `suggestedFilename()` equals `impromptu-practice-${exportedAt.slice(0,10)}.json`. (verification-gap)
- [patch] e2e: seed two Reps and assert both ids export in history order. (verification-gap)
- [patch] Markup test: status carries `text-ink-soft`, not `text-cream-dim`. (verification-gap)
- [accept] Pretty-print, blob MIME, revoke and `ground="paper"` unasserted: cosmetic, checked visually. (verification-gap)
- [patch] `buildExport` throwing inside the click handler leaves a dead button: catch, show `copy.state.exportFailed` ("Export failed.") in the status, and rethrow (visible, not silent). (edge-case)
- [patch] Append the anchor to the document before `click()`, remove it after, and revoke the object URL on a 10s timeout instead of synchronously. (edge-case)
- [patch] Link the status from the button with `aria-describedby={fired ? statusId : undefined}` (the `useId` is otherwise dead). (edge-case)
- [patch] Second export must re-announce: `flushSync(() => setFired(false)); setFired(true);` in `onExport` so the live region mutates each time. (edge-case + blind-hunter)
- [patch] e2e no-network check: attach `page.on("request")` after the button is visible, and assert nothing but `blob:` and `${origin}/_next/` URLs. (blind-hunter)
- [patch] `exportFilename` doc and test: it slices the ISO string's date portion (callers pass a `Z` datetime); rename the "local-time boundary" test accordingly. (blind-hunter)
- [patch] Drop the literal `class="flex justify-end"` assertion in practice.test.ts; the ordering assertion covers placement. (blind-hunter)
- [patch] "Exported." is a success message, not an Inline message (DESIGN.md: vermilion dot is for conflicts and errors). Replace `InlineStatus` with a plain always-mounted `<p role="status" className="text-body text-ink-soft">` whose text is the message or empty; same for the new failure text. Spec deviation recorded in Spec Change Log. (blind-hunter)
- [reject] Filename uses the UTC day: as specified, and the domain stays Date-free. (edge-case)
- [accept] Large-history cost, first-click layout shift (shared InlineStatus pattern), in-memory export when storage fails later (desired). (edge-case)

## Verification

**Commands:**
- `npm run lint && npm run typecheck && npm test` -- expected: clean
- `npm run build && npm run check:static` -- expected: `/practice` static
- `E2E_PORT=3102 npm run test:e2e` -- expected: all specs pass

**Results:**
- `npm run lint` -- clean, no output.
- `npm run typecheck` -- clean, no output.
- `npm test` -- 43 test files, 681 tests passed.
- `npm run build` -- compiled successfully; `/practice` listed as `○ (Static)`.
- `npm run check:static` -- `check:static OK -- prerendered: /, /practice, /privacy, /stage`.
- `E2E_PORT=3102 npm run test:e2e` -- 234 passed (chromium, webkit, firefox), including the Export download spec on all three browsers (that spec also passed `--repeat-each=8` on all three after the review patches).
