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
