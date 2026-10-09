# Epic 1 Context: Project Foundation and the Trusted Library Pipeline

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Stand up the Impromptu app on the agreed static-first Next.js stack, with enforced architecture boundaries, a config module, ports, and a CI/test harness. Then build the offline challenge-library pipeline: one zod schema, one compatibility function, one Brief renderer, and a hard gate that runs inside every build. Together these guarantee that every Challenge the runtime can reach is well-formed and contradiction-free. The epic ends with the three founder anchor Challenges transcribed verbatim and a pilot set of batches accepted through the full lifecycle. Later epics then have real library data to compose from, and the founder has a repeatable way to grow the library (Epic 2).

## Stories

- Story 1.1: Scaffold the app from the architecture starter
- Story 1.2: Architecture guardrails, config module, ports, and test harness
- Story 1.3: Library schema, id rules, tag vocabulary, Skills and Mediums
- Story 1.4: One compatibility function and one Brief renderer
- Story 1.5: Transcribe the three CL-5 anchors verbatim
- Story 1.6: Library hard gate: integrity, Brief rules, Time Limits, anchors, and the CL-4 lint
- Story 1.7: Library hard gate: reachability, coverage, repeat headroom, and the build step
- Story 1.8: Generation pipeline kit: prompt, rubric, batch folders, and soft-gate tooling
- Story 1.9: Pilot batches through the full lifecycle

## Requirements & Constraints

- **Template shape:** each Exercise Template has exactly one Skill, one Level, at least one eligible Medium, a Brief pattern that names a concrete deliverable and completion condition, compatibility tags, and an optional Time Limit (Perform only).
- **Level semantics:** Explore is one task with one simple Constraint, Style optional, optional guidance, untimed. Experiment asks for multiple interpretations, untimed. Develop asks the user to create for an effect and then revise, untimed. Perform has full Inputs plus demands and may be timed. No Template below Perform has a Time Limit, and `guidance` is allowed only at Explore.
- **Briefs:** authored as Template patterns with slots and never free-generated. A rendered Brief must stand alone, be 1–3 sentences, contain no leftover braces, and be **at most 160 characters**. The 160 cap is the founder-resolved value. Keep the cap in gate config, not in code.
- **Contradiction rules are library data, never code.** The validator must report Templates that can produce contradictory or empty combinations.
- **Style vs Constraint (CL-4):** a Style describes a treatment and a Constraint describes a rule. A wording lint flags violations as hard failures.
- **Anchors (CL-5):** the three founder Challenges ship verbatim and set the quality bar:
  1. Explore · Observation · Drawing: "Draw an object near you. Include three details you have never paid attention to."
  2. Experiment · Expression · Photography · Minimalist · No people: "Take two photos of coming home. Make one feel comforting and the other lonely. Keep people out of both."
  3. Perform · Idea generation · Writing · Horror · Nothing bad happens: "Write three premises for a first date that feels like horror, even though nothing bad happens." It has a 300 s Time Limit.
- **Offline generation only (CL-6):** batches are AI-generated during development into static repo JSON. The runtime never calls an AI service. Any LLM key is read only from a gitignored local `.env`, is never set in Vercel, and is never imported by `src/`.
- **Privacy guard:** CI fails if `@vercel/analytics`, `@vercel/speed-insights`, or any client error-monitoring SDK is added. Fonts and assets are same-origin only.
- **Configurability:** the recent window, the Medium list, and Time Limits live in config or library data, never in UI code.

## Technical Decisions

- **Scaffold:** run `npx create-next-app@16.4.0 impromptu --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --no-cache-components --no-react-compiler`. Pin Next 16.4.0, React 19.3.0, TS 5.9.3, Tailwind 4.3.3, zod 4.6.5, Vitest 5.0.3, @playwright/test 1.64.0, tsx 4.23.15, @types/node ^24, and `engines.node` 24.x. Do not install three or resend yet.
- **Static-first:** the fixed routes are `/`, `/stage`, `/practice`, `/privacy`, and `POST /api/subscribe` (the only server code). Every page is prerendered. There are no Server Actions, no `proxy.ts`, no database, and Cache Components stays off. Production deploys from `main`, and every PR gets a Preview on Vercel.
- **Layering:** `src/domain` is the pure core. It imports only `src/config` and `zod`, and it never uses `window`, `localStorage`, `Date.now`, `Math.random`, or `crypto`. `src/decor` never imports domain, store, or adapters. Client code never imports `src/server`. Components never import `src/adapters`. `src/shared` imports only `zod`. ESLint `no-restricted-imports` plus a ban-check enforce these rules.
- **Ports** (`src/domain/ports.ts`): `Library` (synchronous), `Repository`, `Clock.now()` (epoch ms), and `Random.next()/uuid()`. Production adapters use `crypto.getRandomValues` and `crypto.randomUUID`. Tests use a seeded Random and a fake Clock.
- **Config** (`src/config/app.ts`, the only source of tunables): `generator.recentWindow: 30`, `reveal.quickMaxMs: 1000`, `reveal.order` (skill, medium, topic, style, constraint, then brief), `setup.defaults` (explore, Perform timing `either`, all Mediums on, Medium random, Skill random, Quick reveal off, sound off, `ambientMotion: true`), `reflection.maxChars: 280`, `storage.schemaVersions`, and `signup.consentTextVersion`.
- **Library schema** (`src/domain/library/schema.ts`): zod defines `Skill`, `Medium`, `Template`, `Topic`, `Style`, `Constraint`, `Tag`, `Anchor`, and `BatchManifest`. Types come only from `z.infer`.
  - A Template has `id`, `skill`, `level`, `mediums[]`, and `briefPattern`, which is a string or a map keyed by Medium id (keys must be a subset of `mediums`). It also has `topicTags`, `styleTags`, `constraintTags`, `incompatible[]`, `tags[]`, and optional `timeLimitSec`, `guidance`, and `retired`.
  - Fills have `id`, `revealText`, `briefText`, `tags`, `requires`, `excludes`, and optional `retired`.
  - Schema refinements reject a misplaced `timeLimitSec` or `guidance` and name the Template id in the error.
- **Ids:** the forms are `skl.<slug>`, `med.<slug>`, `tpl.<skill-slug>.<level>.<slug>`, `top.<slug>`, `sty.<slug>`, and `con.<slug>`, with lowercase kebab slugs. Ids are unique across all declarations and never reused. Entries are removed only through a later batch's `manifest.retire[]`. Retired entries are excluded from active sets but still resolve. Batches apply in folder-name order.
- **Compatibility** (`src/domain/library/compat.ts`): `isCompatible(template, medium, topic, style, constraint)` is the single implementation, shared by the runtime and the validator. A combination is compatible only if all of these hold:
  - each fill matches at least one of the Template's tags for its kind;
  - no part appears in `incompatible[]`, checked by id or by tag;
  - every `requires[]` trait appears among the other parts;
  - no `excludes[]` trait appears among the other parts.

  Template `tags` and the Medium's `tags` count as parts (for example, `med.photography` carries `camera`). A slot the Template omits is evaluated without that part. Every tag comes from `content/library/tags.json`.
- **Renderer** (`src/domain/library/render.ts`): this is the single Brief renderer. It uses the per-Medium pattern when one exists and substitutes each fill's `briefText` into `{topic}`, `{style}`, and `{constraint}`. It returns `{ok:false, reason}` and never throws on a slot/fill mismatch. `guidance` is returned separately and is never put into the Brief.
- **Base data:** `skills.json` holds the six Skills (Observation, Idea generation, Connection, Perspective, Expression, Revision), each with `revealText`, an `info` sentence, and `tags`. `mediums.json` holds Writing, Drawing, Photography, and Spoken storytelling.
- **Hard gate** (`scripts/library/validate.ts` runs as `library:validate`, and `build.ts` runs on `predev`/`prebuild`, both through `tsx`):
  - **Integrity:** schema, unique ids, tags from the vocabulary, and every reference resolves.
  - **Brief rules:** applied to every compatible combination.
  - **Time Limits:** none below Perform.
  - **Anchors:** each rendered anchor must string-equal its `expectedBrief` in `anchors/anchors.json`.
  - **CL-4 lint:** uses word lists kept in gate config.
  - **Reachability:** at least 3 valid combinations per Template, and no reachable requires/excludes violation.
  - **Coverage and headroom:** at least 2 Templates per Skill × Level × Medium cell, and at least 60 `templateId+topicId` combinations per Level × Medium. Skill-focused setups below 31 produce a warning only. These two checks fail the build only when `coverage.enforce` is true. It starts false, and Story 2.8 switches it on.
  - **Batch sizing:** always enforced for the batch under review.
  - **Output:** the gate writes `gate-report.json` plus a human summary and exits non-zero on failure. On success, `build.ts` emits the gitignored `src/generated/library.json` with a content-hash `libraryVersion`. It includes only anchors and batches whose `status` is `accepted`.
- **Batch lifecycle:**
  - **Folder:** `content/library/batches/<YYYY-MM-DD>-<kind>-<scope>-<nn>/` holds `manifest.json` (`status`, `generator{tool,model,promptVersion}`, `rubricVersion`, `review{judge,founderSample,rejectedIds,date}`, `edits[]`, `retire[]`) and the kind's JSON file.
  - **Sizes:** a Template batch is 1 Skill × 1 Level × 4 Mediums, 12 Templates with at least 3 per Medium. A fill batch is one kind with 40 entries. Fills come before Templates.
  - **Review:** the hard gate runs first, then the soft gate (an AI judge scores against `RUBRIC.md` and the founder skims 20 random Challenges).
  - **Failures:** any hard failure rejects the whole batch. The executor regenerates at most 3 times, then escalates to the founder. Rubric-rejected ids are regenerated inside the same batch, never hand-rewritten. Only typo fixes may be hand-edited, and each is logged in `edits[]`.
  - **Landing:** one PR per batch. Accepted batches are immutable, and fixes arrive as patch batches.
  - **Prompt and rubric:** `PROMPT.md` and `RUBRIC.md` both carry version headers.
- **Conventions:**
  - Expected failures return `{ok, reason}` results and never throw.
  - Files are kebab-case.
  - Domain terms follow the PRD Glossary.
  - Level ids are `explore`, `experiment`, `develop`, and `perform`.
  - Input kinds are `skill`, `medium`, `topic`, `style`, and `constraint`.
  - Duration fields carry a mandatory `*Sec`/`*Ms` suffix.
  - Vitest tests are colocated as `*.test.ts`. Playwright tests live in `e2e/` and run on Chromium, WebKit, and Firefox.
  - A GitHub Action runs lint, typecheck, `library:validate`, vitest, and playwright, and any failure blocks the PR.

## Cross-Story Dependencies

- Within the epic, the order is 1.1 → 1.2 → 1.3 → 1.4 → 1.5 → 1.6 → 1.7 → 1.8 → 1.9. Story 1.6 adds the `library:validate` step to the CI workflow from 1.2. Story 1.5's anchor test depends on 1.4's `render` and `isCompatible`. Story 1.9 depends on the 1.8 kit and must produce fills carrying the traits the anchors rely on, such as `person` and `camera`. The pilot runs `topics-01`, `styles-01`, and `constraints-01`, then the Observation × Explore Template batch.
- Downstream:
  - Epic 2 fills launch coverage and switches `coverage.enforce` on.
  - Epic 3's `compose()` reuses `isCompatible`, `render`, the ports, config, and `library.json`.
  - All later epics depend on the guardrails and the CI harness.
