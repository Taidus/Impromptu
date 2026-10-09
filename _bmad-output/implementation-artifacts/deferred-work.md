- source_spec: `_bmad-output/implementation-artifacts/spec-1-1-scaffold-the-app-from-the-architecture-starter.md`
  summary: Add an automated post-build check (Story 1.2 CI) that fails when any of `/`, `/stage`, `/practice`, `/privacy` is not statically prerendered.
  evidence: Static-first (AD-1) is currently verified only by reading `next build` output; a later `cookies()`/`headers()` call or `cacheComponents: true` would ship a dynamic route with build, lint, and tsc all passing.
