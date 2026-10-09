---
title: 'Story 1.2: Architecture guardrails, config module, ports, and test harness'
type: 'chore'
created: '2026-10-09'
status: 'done'
baseline_commit: '91a1e43'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The scaffold has no import boundaries, no config module, no ports, and no test or CI harness, so every later story would invent its own and the pure core (AD-2) would drift.

**Approach:** Add ESLint boundary rules for the AD-2 diagram, `src/config/app.ts` (AD-19), the four ports with production adapters and test doubles, Vitest and Playwright configs with one smoke test each, and a GitHub Action that blocks PRs on lint, typecheck, unit, build, static-route check, privacy guard, and e2e.

## Boundaries & Constraints

**Always:**
- Boundaries exactly as the Design Paradigm diagram: `src/domain` → only `src/config` and `zod`; `src/decor` never → `src/domain`, `src/store`, `src/adapters`; client code never → `src/server` (only `src/app/api/**` and `src/server/**` may); `src/components` and `src/app` never → `src/adapters`; `src/shared` → only `zod`.
- Cross-layer imports use the `@/` alias; parent-relative imports (`../`) are banned repo-wide under `src/` so the alias patterns are complete.
- `src/domain` may not reference `window`, `localStorage`, `Date.now`, `Math.random`, or `crypto` (ESLint `no-restricted-globals` + `no-restricted-properties`).
- Config values exactly as AD-19 and the story AC; `as const`; no other file holds tunables.
- Ports in `src/domain/ports.ts`: `Clock.now(): number` (epoch ms), `Random.next(): number` in [0,1) and `Random.uuid(): string`, `Repository` (per AD-9: `load/save/clearAll`, envelope `{v, rev, data}`, `{ok,reason}` results), `Library` (synchronous data; shape finalised in Story 1.3, keep minimal `{libraryVersion}` here).
- Production adapters: `src/adapters/clock.ts` uses `Date.now()`; `src/adapters/random.ts` uses `crypto.getRandomValues` / `crypto.randomUUID`. Test doubles `fakeClock` and `seededRandom` live in `src/domain/test-doubles.ts` (pure, deterministic).
- Vitest: colocated `*.test.ts`, node environment, `npm test` = `vitest run`. Playwright: `e2e/`, projects chromium, webkit, firefox, `webServer` builds and starts the app.
- CI (`.github/workflows/ci.yml`) on pull_request and push to main: lint, `tsc --noEmit`, `vitest run`, `next build`, static-route check, privacy guard, playwright. Any failure fails the workflow; the workflow is made a required status check on `main`.
- Privacy guard fails if `package.json` deps include `@vercel/analytics`, `@vercel/speed-insights`, or a client error-monitoring SDK (`@sentry/*`, `@bugsnag/*`, `@datadog/browser-*`, `logrocket`, `rollbar`, `posthog-js`, `@highlight-run/*`).
- Static-route check reads `.next/prerender-manifest.json` after build and fails unless `/`, `/stage`, `/practice`, `/privacy` are present (closes deferred-work item from 1.1).

**Never:**
- No `library:validate` step (Story 1.6). No storage adapter or migrations (Story 3.5). No real tests of domain logic beyond harness smoke tests.
- No new runtime dependencies. No jsdom / testing-library (domain tests are pure TS; UI is covered by Playwright).
- Do not touch `_bmad/`, `_bmad-output/planning-artifacts/`.

**Decisions (founder delegated go/no-go to the overseer session, 2026-10-09: "nothing should wait on me, thats your job"):**
- `storage.schemaVersions` = `{ setup: 1, session: 1, history: 1 }` (AD-9 keys).
- `signup.consentTextVersion` = `'2026-10-09'` (date-stamped; Story 7.x bumps it with copy).
- `reveal.order` = `['skill','medium','topic','style','constraint','brief']`.
- Branch protection on `main` requiring the CI check is set by the overseer via `gh api`.

</frozen-after-approval>

## Code Map

- `eslint.config.mjs` -- flat config with `nextVitals` + `nextTs`; eslint-plugin-import 2.32 is already bundled (`import/no-relative-parent-imports` available). Add per-directory `files` blocks with `no-restricted-imports` patterns, plus domain-only `no-restricted-globals` / `no-restricted-properties`.
- `tsconfig.json` -- `@/*` → `./src/*`; `include` covers `**/*.ts` so `vitest.config.ts`, `playwright.config.ts`, `scripts/**` typecheck too.
- `package.json` -- scripts `dev/build/start/lint`; vitest 5.0.3, vite 8.3.4, @playwright/test 1.64.0, tsx 4.23.15 already installed. Add `test`, `test:e2e`, `typecheck`, `check:static`, `check:privacy`.
- `src/{config,domain,adapters,shared,...}/.gitkeep` -- empty layer folders from 1.1; replace `.gitkeep` with real files where a file lands.
- `src/app/{layout,page,stage,practice,privacy}` -- placeholder pages with one `h1`; e2e smoke asserts those headings.
- Playwright browsers already cached locally (`~/Library/Caches/ms-playwright`); CI uses `npx playwright install --with-deps`.
- `_bmad-output/implementation-artifacts/deferred-work.md` -- the static-route item is resolved by this story.

## Tasks & Acceptance

**Execution:**
- [x] `eslint.config.mjs` -- add boundary blocks (`src/domain/**`, `src/decor/**`, `src/shared/**`, `src/components/**`, `src/app/**` minus `src/app/api/**`, `src/store/**`, `src/adapters/**`) with `no-restricted-imports` `patterns` on `@/<layer>` and `@/<layer>/*`; `import/no-relative-parent-imports` for `src/**`; domain globals/properties bans; ignore `src/generated/**`, `test-results/**`, `playwright-report/**`.
- [x] `src/config/app.ts` -- `export const config = {...} as const` with the AD-19 values; `export type AppConfig`.
- [x] `src/domain/ports.ts` -- `Clock`, `Random`, `Repository`, `Library`, `StorageKey`, `Envelope<T>`.
- [x] `src/domain/test-doubles.ts` -- `fakeClock(startMs)` with `advance(ms)`; `seededRandom(seed)` (mulberry32) with deterministic `uuid()` (v4 layout from `next()`).
- [x] `src/domain/test-doubles.test.ts` -- seeded sequence is reproducible; fake clock advances; uuid matches v4 regex.
- [x] `src/adapters/clock.ts`, `src/adapters/random.ts` -- `systemClock`, `cryptoRandom`.
- [x] `vitest.config.ts` -- `include: ['src/**/*.test.ts','scripts/**/*.test.ts']`, `environment: 'node'`, alias `@` → `src`.
- [x] `playwright.config.ts` -- `testDir: 'e2e'`, 3 projects, `webServer: npm run build && npm run start`, `baseURL http://localhost:3000`, `reuseExistingServer: !CI`.
- [x] `e2e/routes.spec.ts` -- each of the four routes responds 200 and shows its `h1`.
- [x] `scripts/check-static.mjs` -- read `.next/prerender-manifest.json`; exit 1 listing any missing route.
- [x] `scripts/check-privacy.mjs` -- scan `package.json` deps/devDeps against the banned list; exit 1 naming offenders.
- [x] `package.json` -- scripts: `test`, `test:e2e`, `typecheck`, `check:static`, `check:privacy`.
- [x] `.github/workflows/ci.yml` -- Node 24, `npm ci`, then lint → typecheck → check:privacy → test → build → check:static → playwright install → test:e2e.
- [x] `.gitignore` -- already ignores Playwright output (1.1); verify, add nothing new unless needed.
- [x] `deferred-work.md` -- mark the static-route item resolved by this spec.
- [ ] GitHub -- after the first green run, `gh api` branch protection on `main` requiring the `ci` check.

**Acceptance Criteria:**
- Given a file in `src/domain` importing `@/store/x` or using `Date.now()`, when `npm run lint` runs, then it fails naming the rule; removing the violation makes lint pass.
- Given a file in `src/components` importing `@/adapters/clock` or `@/server/x`, when lint runs, then it fails.
- Given `src/config/app.ts`, when imported, then `config.generator.recentWindow === 30`, `config.reveal.quickMaxMs === 1000`, `config.reveal.order` ends with `'brief'`, `config.setup.defaults.ambientMotion === true`, `config.reflection.maxChars === 280`.
- Given `npm test`, then the test-doubles test passes and no browser/jsdom is required.
- Given `npm run build && npm run check:static`, then it exits 0; given a route removed from the manifest, it exits 1.
- Given `@vercel/analytics` added to `package.json`, when `npm run check:privacy` runs, then it exits 1.
- Given `npm run test:e2e`, then the four-route smoke passes on chromium, webkit, and firefox.
- Given a PR, then the `ci` workflow runs all steps and `main` requires it to pass.

## Implementation Notes

- `import/no-relative-parent-imports` (Code Map) resolves the `@/` alias to a real path first, so it flagged every cross-layer alias import (`@/config/app` from `src/domain`, `@/domain/ports` from `src/adapters`) as "parent". That contradicts the frozen constraint that cross-layer imports use `@/`. The `../` ban is enforced instead with `no-restricted-imports` `patterns: ['..', '../*']`, folded into every layer block (ESLint rule configs replace rather than merge). Verified: `../config/app` from `src/domain` fails lint naming the rule.
- `config.setup.defaults.enabledMediums: 'all'` is a sentinel; the Medium list itself is library data (Story 1.3).
- Local Playwright cache held chromium-1228/webkit-2311, older than @playwright/test 1.64 expects; ran `npx playwright install chromium webkit firefox` (CI uses `--with-deps`).
- Task "GitHub branch protection" left to the overseer per the dispatch brief.


- Review pass (3 layers, 23 findings): 14 patched, 6 rejected, 3 deferred (see Triage Log and deferred-work.md). Full verification after patches: lint, typecheck, 24 unit tests, check:privacy, build (5 static routes), check:static, 12 e2e all green. Playwright now owns port 3100 so it no longer clobbers a dev server on 3000.

## Spec Change Log

## Review Triage Log

| # | Layer | Finding | Verdict | Evidence | Route |
|---|---|---|---|---|---|
| 1 | edge | Domain/shared/adapters `files` globs match `.ts` only; a `.tsx` there skips the bans | low | Confirmed in eslint.config.mjs; domain is pure TS so unlikely, fix is a glob change | patch |
| 2 | edge, blind, verif-gap | `new Date()`, `performance.now`, `setTimeout`, `fetch`, `navigator`, `self`, `globalThis` pass lint in `src/domain` | medium | Reviewers probed with `eslint --stdin`: exit 0; defeats the Clock port and determinism | patch |
| 3 | edge, blind | Only the enumerated boundaries are enforced; `src/config`, `src/server` unguarded, `adapters`/`store`/`app` too loose; deny-lists drift when a layer is added | medium | Spine: "arrows are the only allowed import directions"; blind hunter verified allow-list negation works in `no-restricted-imports` | patch |
| 4 | edge | `check:static` accepts an ISR/PPR route that is in the manifest | low | Manifest entries carry `compute`, `response`, `initialRevalidateSeconds`; one-line predicate | patch |
| 5 | edge, blind | Privacy denylist misses common SDKs; ignores `optionalDependencies`/`peerDependencies` | medium | List is enumerated; npm installs optional/peer deps; additions are trivial | patch |
| 6 | edge, blind | `crypto.randomUUID` is undefined outside secure contexts (LAN phone testing over http) | medium | Browser matrix (Story 9.2) covers iOS/Android; `seededRandom` already has bytes→v4 logic to share | patch |
| 7 | edge | `fakeClock.advance` accepts NaN/negative; `seededRandom` seed unvalidated | low | Test-only helpers; adding guards is more than a direct correction | reject |
| 8 | edge, blind | `reuseExistingServer` on :3000 reuses a `next dev` server; e2e then tests dev, and the `webServer` build clobbers `.next` | medium | Reproduced: my dev server crashed with a Turbopack cache error when e2e built | patch |
| 9 | edge, blind | CI builds twice (`build` step + `webServer` build) | low | One-line `CI ? start : build && start`; direct correction | patch |
| 10 | edge | Vitest `include` misses `*.test.tsx` | false | Frozen intent: no jsdom/testing-library; component unit tests are not expected | reject |
| 11 | edge | Spec names `import/no-relative-parent-imports` but core rule is used | low | Fix is a spec edit; Implementation Notes already record the deviation | reject |
| 12 | blind | Route list hand-maintained in three places; a new page escapes the static guard | medium | `.next/app-path-routes-manifest.json` lists every page; derive `required` from it | patch |
| 13 | verif-gap, blind | `check:privacy` and `check:static` failing branches have no automated test | medium | Pre-verified: no test spawns them; weakening the predicate stays green | patch |
| 14 | verif-gap | ESLint boundary rules have no negative fixture; silently disabling them stays green | medium | Pre-verified with `eslint --stdin`; `scripts/**/*.test.ts` already in vitest include | patch |
| 15 | blind | CI never uploads Playwright report/traces on failure; no `permissions`/`concurrency` | low | Direct YAML additions; WebKit flakes otherwise undebuggable from a PR | patch |
| 16 | blind | Playwright browsers downloaded every CI run (no cache) | low | Adds a cache step with key management; not everyday pain yet | reject |
| 17 | blind | `Result<void>` requires `{ok:true, value: undefined}` | low | tsc verified by reviewer; direct type correction | patch |
| 18 | blind | `Repository.load<T>(key)` lets callers pick `T` independent of key | medium | Payload types do not exist until Story 3.2/3.5 | defer |
| 19 | blind | `check:static` raw ENOENT when run before build | low | Error already names the file; guard adds a branch | reject |
| 20 | verif-gap | `cryptoRandom` contract untested while its fake is | low | Trivial test, same file touched by #6 | patch |
| 21 | verif-gap | Dynamic `import()` bypasses `no-restricted-imports` | medium | Verified by reviewer; needs `import/no-restricted-paths` or syntax selector; dynamic imports first appear in Story 8.4 | defer |
| 22 | verif-gap | `vitest.config.ts` triggers a Vite ESM/CJS deprecation; AGENTS.md says heed deprecations | low | Rename to `.mts`; tsconfig already includes `**/*.mts` | patch |
| 23 | blind | Privacy guard cannot see `<Script src>` or `next/third-parties` loaders | medium | Real bypass; AD-13 verification beyond package.json belongs to Story 9.4 | defer |

## Verification

**Commands:**
- `npm run lint` -- expected: clean; then a temporary violating file in `src/domain` makes it fail
- `npm run typecheck` -- expected: clean
- `npm test` -- expected: test-doubles tests pass
- `npm run build && npm run check:static` -- expected: exit 0, four routes listed
- `npm run check:privacy` -- expected: exit 0
- `npm run test:e2e` -- expected: 12 passed (4 routes × 3 browsers)
- `gh run list --workflow ci.yml --limit 1` -- expected: success on the story PR
