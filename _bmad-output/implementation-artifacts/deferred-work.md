- source_spec: `_bmad-output/implementation-artifacts/spec-1-1-scaffold-the-app-from-the-architecture-starter.md`
  summary: Add an automated post-build check (Story 1.2 CI) that fails when any of `/`, `/stage`, `/practice`, `/privacy` is not statically prerendered.
  evidence: Static-first (AD-1) is currently verified only by reading `next build` output; a later `cookies()`/`headers()` call or `cacheComponents: true` would ship a dynamic route with build, lint, and tsc all passing.
  status: resolved
  resolved_by: `_bmad-output/implementation-artifacts/spec-1-2-architecture-guardrails-config-module-ports-and-test-harness.md` — `scripts/check-static.mjs` (`npm run check:static`) runs after `next build` in `.github/workflows/ci.yml`.
- source_spec: `_bmad-output/implementation-artifacts/spec-1-2-architecture-guardrails-config-module-ports-and-test-harness.md`
  summary: Make `Repository.load`/`save` key-typed (map each StorageKey to its payload type) once the Setup/Session/History schemas exist (Story 3.2/3.5).
  evidence: `load<T>(key)` lets a caller choose `T` independently of `key`; no payload types exist yet to bind to.
- source_spec: `_bmad-output/implementation-artifacts/spec-1-2-architecture-guardrails-config-module-ports-and-test-harness.md`
  summary: Close the dynamic `import()` bypass of the layer boundaries (e.g. `import/no-restricted-paths` or a `no-restricted-syntax` ImportExpression selector) before Story 8.4 introduces lazy decor imports.
  evidence: Reviewer verified `() => import("@/store/x")` in `src/domain` lints clean; `no-restricted-imports` ignores dynamic imports.
- source_spec: `_bmad-output/implementation-artifacts/spec-1-2-architecture-guardrails-config-module-ports-and-test-harness.md`
  summary: Extend the AD-13 privacy guard beyond package.json (grep `src/` for `<Script src=`, `next/third-parties`, known tracker hosts) in Story 9.4.
  evidence: An analytics loader via `next/script` or `next/third-parties` needs no new dependency and passes `check:privacy`.
- source_spec: `_bmad-output/implementation-artifacts/spec-1-3-library-schema-id-rules-tag-vocabulary-skills-and-mediums.md`
  summary: Pin `Anchor.constraintId: null`, `BatchManifest.review.date` format, and `edits[]` item shape with real fixtures when anchors (1.5) and manifests (1.8) first consume them.
  evidence: Verification-gap review showed dropping `.nullable()`, loosening `date` to text, or `edits` to `z.any()` passes all 1.3 tests.
- source_spec: `_bmad-output/implementation-artifacts/spec-1-5-transcribe-the-three-cl-5-anchors-verbatim.md`
  summary: Decide in Story 1.7 whether the CL-5 anchor Templates are exempt from the ≥3-combinations reachability rule or get matching pilot fills.
  evidence: Each anchor Template currently admits only its own Topic/Constraint, so AD-16's "at least 3 valid combinations per Template" would fail on anchors.
- source_spec: `_bmad-output/implementation-artifacts/spec-1-5-transcribe-the-three-cl-5-anchors-verbatim.md`
  summary: Story 1.8 PROMPT/RUBRIC must fix a `briefText` format convention per slot (full sentence vs lowercase fragment) and keep Template-specific phrasing ("Keep people out of both.") from being reused by other Templates.
  evidence: Anchor fills mix sentence-form and fragment-form `briefText`; nothing in data or schema records which a slot expects, so mixed batches can render lowercase sentence starts or doubled periods.
- source_spec: `_bmad-output/implementation-artifacts/spec-7-3-privacy-note-page.md`
  summary: Confirm the erasure-request contact address (`copy.privacy.contactEmail`, working value hello@impromptu.app) with the founder in the Story 7.4 launch checklist.
  evidence: The privacy note publishes a mailto: route (AD-20) but no domain or mailbox has been set up yet.
- source_spec: `_bmad-output/implementation-artifacts/spec-1-6-library-hard-gate-integrity-brief-rules-time-limits-anchors.md`
  summary: Add a subprocess test that `npm run library:validate` exits non-zero on a failing library, when the first real batches land (Story 1.9).
  evidence: `process.exitCode = report.ok ? 0 : 1` is the only thing making the CI step block merges; nothing exercises the failure exit.
- source_spec: `_bmad-output/implementation-artifacts/spec-1-7-library-hard-gate-reachability-coverage-repeat-headroom-and.md`
  summary: Add a subprocess test that `npm run build`'s `prebuild` hook exits non-zero and does not touch `src/generated/library.json` when the gate fails, and an end-to-end check that `library.json` excludes a draft batch's content and a retired entity's data, once real batches exist (Story 1.9).
  evidence: `scripts/library/build.ts`'s `process.exitCode = 1` path and its use of `filterAccepted`/`report.retiredIds` are covered unit-wise (`load.test.ts`, `gate.test.ts`) but not through the actual script file — same gap as `validate.ts`'s deferred subprocess test above, for the same reason (no real batches yet to fail/retire against).
- source_spec: `_bmad-output/implementation-artifacts/spec-1-8-generation-pipeline-kit-prompt-rubric-batch-folders-and-soft.md`
  summary: After 1.6 and 1.8 both merge, make `scripts/library/sample.ts` reuse 1.6's `load.ts` instead of its own `loadActiveLibrary` file reading.
  evidence: The two stories were built in parallel and each wrote its own library loader.
- source_spec: `_bmad-output/implementation-artifacts/spec-3-3-compose-a-challenge-from-setup-locks-and-the-recent-window.md`
  summary: Measure `compose()` against the launch-size generated library (Story 2.8) and switch to lazy per-Template sampling if a click exceeds ~50 ms.
  evidence: After review fixes, candidates are still enumerated (pre-filtered by slot tags) and every compatible combo is rendered before picking; cost scales with fills per Template.
- source_spec: `_bmad-output/implementation-artifacts/spec-3-6-the-app-store-and-the-library-loader.md`
  summary: Point `loadGeneratedLibrarySource()` (`src/adapters/library/index.ts`) at the real build output once Story 1.7 merges `src/generated/library.json`.
  evidence: Story 1.7 (the `build.ts` step that emits the gitignored `src/generated/library.json`) was not merged when this story was built, so the store's library loader is wired against an injected source only; the production function is a clearly-named stub that throws until this one-line swap (`import("@/generated/library.json").then((m) => m.default)`) lands.
  status: resolved
  resolved_by: Story 3.6 after merging main (Story 1.7): `loadGeneratedLibrarySource` imports `@/generated/library.json`; `scripts/library/library-contract.test.ts` pins build payload ↔ loader schema.
- source_spec: `_bmad-output/implementation-artifacts/spec-3-6-the-app-store-and-the-library-loader.md`
  summary: The first UI story that renders `useAppStore` (3.9/3.10) must add an e2e check that the production store reaches `libraryStatus: 'ready'` from `src/generated/library.json`.
  evidence: `loadGeneratedLibrarySource` (dynamic import + `.default`) is never executed by unit tests because CI runs tests before the build generates the file.
- source_spec: `_bmad-output/implementation-artifacts/spec-6-1-practice-page-with-empty-and-storage-states.md`
  summary: Give the store a history-only readiness signal (e.g. `historyStatus`) so /practice stops showing the loading placeholder as soon as the Repository is read, instead of waiting for the idle-scheduled library load.
  evidence: `status` stays `loading` on a first visit until the library resolves and a default Setup is persisted; the Practice page never needs the library.
- source_spec: `_bmad-output/implementation-artifacts/spec-3-6-the-app-store-and-the-library-loader.md`
  summary: The first UI story that renders `useAppStore` (3.9/3.10) must add an e2e check that the production store reaches `libraryStatus: 'ready'` from `src/generated/library.json`.
  evidence: `loadGeneratedLibrarySource` (dynamic import + `.default`) is never executed by unit tests because CI runs tests before the build generates the file.
  status: resolved
  resolved_by: `_bmad-output/implementation-artifacts/spec-3-9-the-challenge-stage-page-shell.md` — `e2e/stage.spec.ts`'s "opening /stage composes a held Challenge from the production library" test runs against `npm run build`'s real `src/generated/library.json`.
- source_spec: `_bmad-output/implementation-artifacts/spec-3-9-the-challenge-stage-page-shell.md`
  summary: Add the page grain overlay (0.1 opacity, overlay blend) to the Stage, suppressed inside the safe area, once Story 8.2 ships `grain.png`.
  evidence: DESIGN.md -> Colors asks for grain suppressed inside the Stage safe area; no grain asset exists yet. Story 3.9's patch pass added only the lilac-deep edge fade (CSS gradient, tokens only).
