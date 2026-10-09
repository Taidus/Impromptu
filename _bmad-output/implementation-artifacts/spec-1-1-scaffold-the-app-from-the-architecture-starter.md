---
title: 'Story 1.1: Scaffold the app from the architecture starter'
type: 'chore'
created: '2026-10-09'
status: 'in-progress'
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
- [ ] repo root -- run the AD-1 command in a temp dir, move the generated app (excluding `node_modules`, `.next`) into the repo root, then `npm install` -- the target dir is non-empty, so scaffold-then-move
- [ ] `.gitignore` -- merge scaffold rules with `_bmad/render/`, add `/src/generated/`
- [ ] `package.json` -- exact pins per Always; add `engines.node: "24.x"`; add zod, vitest, vite, @playwright/test, tsx as listed (zod as dependency, the rest dev)
- [ ] `src/app/stage/page.tsx`, `src/app/practice/page.tsx`, `src/app/privacy/page.tsx` -- minimal static placeholder page each with one `h1`; trim `src/app/page.tsx` to a placeholder too
- [ ] source-tree folders -- create with `.gitkeep`: `content/library/{anchors,batches,pipeline}`, `scripts/library`, `src/{components,decor,domain,adapters,store,server/email,shared,config,styles}`, `public/decor`, `e2e` (`src/generated/` stays absent and ignored)

**Acceptance Criteria:**
- Given the scaffolded repo, when `npm run build` runs, then it succeeds and lists `/`, `/stage`, `/practice`, `/privacy` as `○ (Static)`, with no `ƒ` routes.
- Given `npm run dev`, when `/` is requested, then it returns 200.
- Given `package.json` and `node_modules`, when versions are read, then they match the Always pins, `engines.node` is `24.x`, and `three`/`resend` are absent.
- Given the repo, then `next.config.ts` does not enable `cacheComponents` or `reactCompiler`, no `proxy.ts` exists, and `src/generated/` is gitignored.
- Given a PR to GitHub, then a Vercel Preview builds and `main` maps to Production (Vercel project created by Claude via the connector).

## Implementation Notes

## Spec Change Log

## Review Triage Log

## Verification

**Commands:**
- `npm run build` -- expected: success; four app routes marked `○`
- `npm run lint` -- expected: no errors
- `npx tsc --noEmit` -- expected: no errors
- `node -p "Object.assign({},require('./package.json').dependencies,require('./package.json').devDependencies)"` -- expected: pins per Always, no `^` except `@types/*` and `eslint`
- `git check-ignore src/generated/x` -- expected: path printed
