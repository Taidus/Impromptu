Version: 1.0.0

# Library batch pipeline (AD-17)

How a batch moves from an empty folder to accepted library data. The tooling lives in
`scripts/library/`; the authoring rules live in `PROMPT.md`; the scoring rules live in
`RUBRIC.md`.

## The loop

1. **Create the folder.** `npm run library:new-batch -- <kind> <scope>` makes
   `content/library/batches/<date>-<kind>-<scope>-<nn>/manifest.json` (`status: "draft"`)
   and an empty `<kind>.json`. `scope` is a free lowercase-kebab slug: a fill batch
   (`topics`/`styles`/`constraints`) uses a plain label such as `general`; a Template
   batch uses `<skill-slug>-<level>` (e.g. `observation-explore`).
2. **Generate.** Hand the batch folder path and `PROMPT.md` to an AI coding-agent session.
   It fills in `<kind>.json`. Once it reports what it used, the batch author (a person,
   not the session) replaces `manifest.generator.tool`/`generator.model`'s `"TBD"` with
   the real values by hand.
3. **Hard gate first.** Run `npm run library:validate` (arrives with Stories 1.6/1.7). Any
   hard failure — a schema error, an unreachable combination, a Time Limit below Perform,
   a CL-4 lint hit, a failed anchor render — **rejects the whole batch**. Nothing partially
   lands.
4. **Soft gate second, only after the hard gate passes.** Run
   `npm run library:sample -- <batchId>` to render every compatible Challenge touching the
   batch's new entries into `sample.md`, plus a random 20 drawn from that same set and any
   isCompatible-but-unrendered combinations (a "Render failures" section — a divergence
   between the data's tags and the Template's wording that the hard gate should also
   catch, once it exists). An AI judge scores every rendered Challenge against
   `RUBRIC.md`; the founder skims the 20-item sample. `sample.md` is committed with the
   batch's PR, as evidence of what was reviewed.
5. **On any hard failure, or any rubric-rejected id:** regenerate — never hand-rewrite —
   the rejected ids inside the same batch, feeding the gate report or rejected-id list
   back into the AI session via `PROMPT.md`'s "Regeneration context" section. At most 3
   regeneration rounds; after that, escalate the batch to the founder instead of trying
   again.
6. **Typo-only fixes** may be hand-edited directly (never a rewording, never a rule
   change) — log each one as an entry in the batch's `manifest.edits[]`
   (`{id, note}`).
7. **Land.** Before opening the PR, set `manifest.status: "accepted"` and fill in
   `manifest.review` (`judge`, `founderSample`, `rejectedIds`, `date`) — the PR's diff is
   the accepted manifest, not a draft one a merge then changes. One PR per batch; merging
   it is the landing, nothing is edited afterward.
8. **Accepted batches are immutable.** A later correction is a new **patch batch**: it
   lists the ids to remove in its own `manifest.retire[]` (AD-6/AD-17) and/or adds
   replacement entries — it never edits a merged batch's files.

## Generation — no runtime AI (CL-6)

Batches are generated offline, during development, by an AI coding-agent session acting
on `PROMPT.md`. The running app never calls an AI service — only the static,
gate-checked JSON under `content/library/` ships.

If a `scripts/library/generate.ts` is ever added to call an LLM API directly (instead of
an interactive coding-agent session), it must read its key only from a gitignored local
`.env` (never set in Vercel, never committed), and nothing under `src/` may import it —
`src/` only ever reads the generated, gate-checked JSON.
