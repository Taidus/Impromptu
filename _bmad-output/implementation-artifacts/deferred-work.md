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
