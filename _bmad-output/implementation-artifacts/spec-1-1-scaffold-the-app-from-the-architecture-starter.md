---
title: 'Story 1.1: Scaffold the app from the architecture starter'
type: 'chore'
created: '2026-10-09'
status: 'done'
baseline_commit: '6a8417892407e08e9de0d00471289115f95842ff'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The repo holds only planning artifacts. Every later story needs the agreed Next.js stack, static-first routes, and the source-tree skeleton from ARCHITECTURE-SPINE (AD-1, Structural Seed).

**Approach:** Run the exact AD-1 `create-next-app@16.4.0` command, place the result at the repo root (the spine's `impromptu/` root *is* this repo), pin the Stack-table versions, add placeholder pages for the four fixed routes, and create the empty source-tree folders.

## Boundaries & Constraints

**Always:**
- Scaffold flags exactly as AD-1: `--ts --tailwind --eslint --app --src-dir --import-alias "@/*" --no-cache-components --no-react-compiler` (plus non-semantic `--use-npm --disable-git --yes`).
- Exact (caret-free) pins: next 16.4.0, react/react-dom 19.3.0, typescript 5.9.3, tailwindcss 4.3.3, eslint-config-next 16.4.0, zod 4.6.5, vitest 5.0.3, vite 8.3.4, @playwright/test 1.64.0, tsx 4.23.15; `@types/node` `^24`; `engines.node` `24.x`.
- Every route statically prerendered (`○` in `next build`): `/`, `/stage`, `/practice`, `/privacy`.
- Keep the repo's existing `.gitignore` line `_bmad/render/` and merge in the scaffold's rules plus `src/generated/`.

**Never:**
- No `three` or `resend` dependency (Stories 8.4 / 7.1 add them).
- No `proxy.ts`, Server Actions, dynamic rendering, `cacheComponents: true`, or React Compiler.
- No Vitest/Playwright/ESLint-boundary config or CI workflow — Story 1.2 owns those. This story only installs the packages.
- Do not touch `_bmad/`, `_bmad-output/planning-artifacts/`.

**Decision (founder, 2026-10-09) — GitHub + Vercel wiring:** Claude handles it all: push the story branch, open the PR with `gh`, and create the Vercel project linked to `Taidus/Impromptu` via the Vercel connector, Production branch `main`, Preview for all other branches.

</frozen-after-approval>

## Code Map

- Repo root -- currently `_bmad/`, `_bmad-output/`, `.gitignore` (`_bmad/render/`), `.git`. No app code exists.
- Probe scaffold (scratchpad, 2026-10-09) -- the AD-1 command produces: `package.json` (next/react pinned exact; `tailwindcss ^4`, `typescript ^5`, `@types/node ^20` — must be re-pinned), `next.config.ts` with a `turbopack.rules` entry for `@tailwindcss/turbopack` (keep it), `eslint.config.mjs`, `tsconfig.json`, `next-env.d.ts`, `AGENTS.md` (Next re-adds it on `next dev` — commit it), `README.md`, `public/`, `src/app/{layout,page}.tsx`, `globals.css`, `favicon.ico`. Next 16.4.0 default is `cacheComponents: false`. `next build` reported `/` as `○ Static`.
- `ARCHITECTURE-SPINE.md` → Structural Seed → Source tree -- folders to create.

## Tasks & Acceptance

**Execution:**
- [x] repo root -- run the AD-1 command in a temp dir, move the generated app (excluding `node_modules`, `.next`) into the repo root, then `npm install` -- the target dir is non-empty, so scaffold-then-move
- [x] `.gitignore` -- merge scaffold rules with `_bmad/render/`, add `/src/generated/`
- [x] `package.json` -- exact pins per Always; add `engines.node: "24.x"`; add zod, vitest, vite, @playwright/test, tsx as listed (zod as dependency, the rest dev)
- [x] `src/app/stage/page.tsx`, `src/app/practice/page.tsx`, `src/app/privacy/page.tsx` -- minimal static placeholder page each with one `h1`; trim `src/app/page.tsx` to a placeholder too
- [x] source-tree folders -- create with `.gitkeep`: `content/library/{anchors,batches,pipeline}`, `scripts/library`, `src/{components,decor,domain,adapters,store,server/email,shared,config,styles}`, `public/decor`, `e2e` (`src/generated/` stays absent and ignored)

**Acceptance Criteria:**
- Given the scaffolded repo, when `npm run build` runs, then it succeeds and lists `/`, `/stage`, `/practice`, `/privacy` as `○ (Static)`, with no `ƒ` routes.
- Given `npm run dev`, when `/` is requested, then it returns 200.
- Given `package.json` and `node_modules`, when versions are read, then they match the Always pins, `engines.node` is `24.x`, and `three`/`resend` are absent.
- Given the repo, then `next.config.ts` does not enable `cacheComponents` or `reactCompiler`, no `proxy.ts` exists, and `src/generated/` is gitignored.
- Given a PR to GitHub, then a Vercel Preview builds and `main` maps to Production (Vercel project created by Claude via the connector).

## Implementation Notes

- Scaffolded via AD-1 command in scratchpad, moved to repo root. Also pinned `@tailwindcss/turbopack` 4.3.3; layout title set to "Impromptu". Kept scaffold `README.md` and sample SVGs in `public/` (cleanup deferred to UI stories).
- Implementation subagent pushed `story/1-1-scaffold` and opened PR #1 (https://github.com/Taidus/Impromptu/pull/1), per the frozen Vercel/GitHub decision.
- Verified independently: build lists `/`, `/practice`, `/privacy`, `/stage` as `○`; lint and `tsc --noEmit` clean; installed versions match pins; `src/generated/` ignored; no `proxy.ts`.
- BLOCKED (AC 5): Vercel connector `create_git_project` on team `taidus-projects` returns 403 "You don't have permission to create the project" (request iad1:sfo1::r7tl9-1791569254031-c9de17bfcf70). Vercel CLI not installed. Needs founder action in the Vercel dashboard.
- npm warns `unrs-resolver` / `esbuild` install scripts not covered by `allowScripts`; local install and build unaffected.

- Review patches applied (triage rows 1–6); build, lint, tsc, pins, ignore checks re-run and passing.
- RESOLVED (was open at completion): AC 5 (Vercel Preview / main → Production) awaits the founder adding `Impromptu` to the Vercel GitHub App's repository list; sprint status left at `review` until verified.
- AC 5 verified 2026-10-09: founder granted the Vercel GitHub App repo access; peer session created project `impromptu` (prj_i0HaOUOBQpQymx6kCGKVRiNytocY, Production branch `main`) via Vercel CLI. Pushing 439a655 triggered a Preview for PR #1; GitHub check `Vercel` passed ("Deployment has completed"). Previews use Vercel Authentication by default. Production deploys on first merge to `main`.

## Spec Change Log

## Review Triage Log

| # | Layer | Finding | Verdict | Evidence | Route |
|---|---|---|---|---|---|
| 1 | blind, edge | `layout.tsx` global `LayoutProps` breaks `tsc --noEmit` on fresh clone | medium | Reproduced in a clean clone: TS2304 `Cannot find name 'LayoutProps'`; Story 1.2 CI typecheck would hit it | patch |
| 2 | blind, edge | Geist fonts loaded but `body` hard-codes Arial | low | `globals.css` `font-family: Arial…` overrides `--font-sans`; two unused font downloads on every page | patch |
| 3 | blind, edge | `.env*` ignores a future `.env.example` | low | Rule matches `.env.example`; Story 7.1 needs an env template; one-line fix | patch |
| 4 | blind | Playwright output dirs not gitignored | low | `@playwright/test` installed, `e2e/` exists, no ignore for `test-results/` etc.; one-line fix | patch |
| 5 | blind | README is create-next-app boilerplate with wrong facts | low | Says `app/page.tsx` (actual `src/app/page.tsx`), offers yarn/pnpm/bun, describes Geist | patch |
| 6 | blind | Unused sample SVGs in `public/` | low | `grep` finds no reference after `page.tsx` was trimmed; deletion | patch |
| 7 | edge | No PostCSS config, so Tailwind breaks under `--webpack` | false | No script or Vercel default uses `--webpack`; Next 16 builds with Turbopack and `next.config.ts` wires `@tailwindcss/turbopack` | reject |
| 8 | blind, edge | ESLint will lint `src/generated/` output | false | Generated artifact is `library.json`; reproduced `npx eslint .` with a JSON file there: no output | reject |
| 9 | blind | `engines.node` advisory only; add `.nvmrc` | low | Not a defect: engines is set (Vercel honors it), local Node is 24.19; extra tooling file not needed | reject |
| 10 | blind | All routes share one page title | low | Placeholder pages; real pages and metadata arrive in Stories 3.7/3.9/6.1/7.3 | reject |
| 11 | verif-gap, blind | No automated guard that routes stay static (`○`) | medium | Pre-verified: no test, script, or CI asserts prerendering; Story 1.2 owns test/CI harness | defer |
| 12 | verif-gap | No `test` script despite vitest/playwright installed | low | Frozen intent assigns test config to Story 1.2 | reject |

## Verification

**Commands:**
- `npm run build` -- expected: success; four app routes marked `○`
- `npm run lint` -- expected: no errors
- `npx tsc --noEmit` -- expected: no errors
- `node -p "Object.assign({},require('./package.json').dependencies,require('./package.json').devDependencies)"` -- expected: pins per Always, no `^` except `@types/*` and `eslint`
- `git check-ignore src/generated/x` -- expected: path printed
