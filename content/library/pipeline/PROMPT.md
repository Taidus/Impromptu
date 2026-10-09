Version: 1.0.0

# Library batch generation prompt

Paste this whole file into the AI coding-agent session that will author one batch, along
with the batch's folder path (from `npm run library:new-batch -- <kind> <scope>`). On a
regeneration round (attempt 2 or 3), also fill in and paste the "Regeneration context"
section below. The session edits only that batch's `<kind>.json` file — never
`manifest.json`, never another batch, never `src/`.

## What you are building

A **batch** is either:
- a **fill batch**: 40 entries of exactly one kind — `topics.json`, `styles.json`, or
  `constraints.json` — inside the batch folder, or
- a **Template batch**: 12 `Template` entries (`templates.json`) for exactly one
  Skill × Level, at least 3 per Medium.

Every entry must parse against `src/domain/library/schema.ts` (`Topic`/`Style`/
`Constraint`/`Template`, all `.strict()` — no extra fields). Fills come before Templates
(a Template batch assumes the fills it needs already exist as accepted data).

## Ids (AD-6)

Lowercase kebab slugs only. `top.<slug>`, `sty.<slug>`, `con.<slug>`,
`tpl.<skill-slug>.<level>.<slug>` where `<skill-slug>` and `<level>` must equal the
Template's own `skill` (minus `skl.`) and `level`. Never reuse an id that exists anywhere
under `content/library/` (anchors or any prior batch). Ids are namespaced per kind and
never retired by editing — removal is only ever a later batch's `manifest.retire[]`.

## Level semantics (FR-5)

- **Explore**: one task, one simple Constraint, Style optional, untimed. Only Explore
  Templates may carry `guidance`.
- **Experiment**: multiple interpretations of the same brief, untimed.
- **Develop**: create for an effect, then revise, untimed.
- **Perform**: full Inputs plus demands, may carry `timeLimitSec`. No Template below
  Perform may have a Time Limit.

## Skills, Mediums, tags, target cells

Skill and Medium ids and names are fixed base data — read them from
`content/library/skills.json` and `content/library/mediums.json`, never invent or
hardcode a name elsewhere (NFR-6). The full controlled tag vocabulary is
`content/library/tags.json` — every `tags`/`requires`/`excludes`/`*Tags` entry you write
must already exist there; if a fill genuinely needs a new trait, propose adding it to
`tags.json` in the same PR and say so in the batch's PR description, never invent a
one-off tag.

The target grid is every Skill × Level × Medium cell (6 Skills × 4 Levels × 4 Mediums).
Coverage and repeat-headroom targets live in the hard gate config, not here — this prompt
only needs the one cell (or, for fills, the general pool) named in the batch folder.

## Brief rules

- A Template's `briefPattern` is a string, or a map keyed by Medium id when the wording
  differs per Medium (map keys must be a subset of `mediums`).
- A rendered Brief is **1–3 sentences**, stands alone with no leftover `{}`, and is
  **at most 160 characters**. Count characters, not words, before submitting.
- The Brief must name a concrete deliverable and a completion condition (FR-7) — "make
  something" is not a Brief; "draw three objects and circle the ugliest one" is.

## Style vs Constraint (CL-4)

- A **Style is a named art style** that always appears in the Brief sentence — e.g. Y2K,
  wabi sabi, japandi, chrome, collage, horror. It describes a *treatment*. Never write a
  Style that states a rule ("no people") — that is a Constraint.
  The Style library must always include one **"your choice"** Style whose `briefText`
  reads naturally in any Style slot (e.g. `"a style of your choosing"`), so the maker can
  pick the art style themselves. (Authored in the `styles-01` batch, Story 1.9 — if you
  are generating `styles-01`, include it.)
- A **Constraint states a rule** — what the maker may or may not do, or what may or may
  not happen. Never write a Constraint that is really a mood or treatment — that is a
  Style.

## briefText convention (every Topic, Style, and Constraint)

`briefText` is always a **lowercase phrase fragment with no leading capital letter and no
terminal punctuation** — it must read correctly when dropped into any Template's
`briefPattern` wherever that Template places its slot token. Examples: `"coming home"`,
`"horror"`, `"nothing bad happens"`, `"a style of your choosing"`.

Never write a `briefText` as a full, capitalized, independently-punctuated sentence (e.g.
`"Keep people out of both."`). If a Template needs a capital letter or a trailing period
around a slot, put that in the **Template's own `briefPattern`** text (e.g.
`"Draw {topic}. Make sure to {constraint}."`), never in the shared fill — a fill must be
safely reusable by any Template whose tags match it. (`con.unnoticed-details` and
`con.no-people` in `content/library/anchors/constraints.json` predate this rule and are
documented exceptions — do not copy their shape into new fills.)

`revealText` is a short label for the Reveal piece (e.g. `"Coming home"`), unrelated to
the briefText rule above.

## Contradiction rules are data, not prose

Use `tags`, `requires`, and `excludes` to encode every contradiction (e.g. a no-people
Constraint `excludes: ["person", "people"]`; a Topic that needs a person carries the
`person` tag). Never describe a contradiction only in prose and leave the data
unconstrained — the hard gate only checks data.

## The CL-5 anchors (the quality bar)

These three founder Challenges already ship (`content/library/anchors/`). Match their
level of concreteness, length, and plainness — do not imitate their exact wording.

1. Explore · Observation · Drawing, no Style:
   "Draw an object near you. Include three details you have never paid attention to."
2. Experiment · Expression · Photography, no Style, Constraint "no people":
   "Take two photos of coming home. Make one feel comforting and the other lonely. Keep
   people out of both."
3. Perform · Idea generation · Writing, Style "horror", Constraint "nothing bad happens",
   `timeLimitSec: 300`:
   "Write three premises for a first date that feels like horror, even though nothing bad
   happens."

## Output

Write only the batch's `<kind>.json` as a JSON array of entries matching the schema.
Nothing else in the batch folder changes — `manifest.json` is filled in by the pipeline
tooling (`library:new-batch`, and later `library:sample`/the hard gate), not by you.

## Regeneration context (fill in when regenerating)

If this is attempt 2 or 3 for this batch, paste the latest `gate-report.json` failures (or
the rubric's rejected-id list) below this line before generating again. Fix only what it
names; do not rewrite entries it did not flag.

```
(paste the previous failure report here)
```
