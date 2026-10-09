Version: 1.0.0

# Library batch soft-gate rubric

Scores one rendered Challenge at a time (one Template + Medium + Topic + Style/null +
Constraint/null, as `library:sample` renders it). Used by both the AI judge pass (every
rendered Challenge touching the batch) and the founder skim (a random 20). Every item is
pass/fail; a Challenge with any failing item is rejected. A rejected **fill** id is
regenerated inside the same batch; a rejected **Template** id is regenerated inside the
same batch (AD-17) — never hand-rewritten except for a logged typo fix.

| # | Item | Pass | Fail |
|---|------|------|------|
| 1 | Concrete deliverable and completion condition (FR-7) | The Brief names a specific thing to make and how the maker knows it is done | The Brief is vague ("make something interesting") or open-ended with no stopping point |
| 2 | Brief stands alone | Reads correctly with no other context, no leftover `{}`, 1–3 sentences, ≤ 160 characters | Needs outside context, has an unfilled slot, or exceeds 160 characters |
| 3 | Level fit (FR-5) | Matches its Level's semantics (Explore: one task + one simple Constraint; Experiment: multiple interpretations; Develop: create-then-revise; Perform: full Inputs, may be timed) | Reads like a different Level (e.g. a Perform-shaped demand at Explore, or `guidance` outside Explore) |
| 4 | Skill fit | The task actually exercises its Skill (e.g. Observation asks the maker to notice something; Connection asks it to join unlike things) | The Skill is nominal — the task would be identical under a different Skill |
| 5 | Medium realism | The deliverable is ordinary and achievable in its Medium with no special equipment implied (e.g. a Photography Brief doesn't require a darkroom) | The Medium is a label only, or the task is unrealistic for an everyday maker in that Medium |
| 6 | Style / Constraint distinctness (CL-4) | Every Style names a treatment and always appears in the Brief sentence; every Constraint states a rule (what may/may not happen); a "your choice" Style reads naturally in its slot | A Style reads as a rule, or a Constraint reads as a mood/treatment, or the entry blurs the two |
| 7 | briefText convention | Every Topic/Style/Constraint `briefText` is a lowercase fragment with no leading capital and no terminal punctuation, and reads correctly in the Template's slot position | `briefText` is capitalized, ends in punctuation, or only fits one specific Template's wording |
| 8 | No contradiction | `tags`/`requires`/`excludes` make every genuinely contradictory or impossible combination unreachable (e.g. a no-people Constraint excludes the person/people traits) | A combination the data allows is nonsensical, impossible, or self-contradictory |
| 9 | Anchor quality bar (CL-5) | Matches the concreteness, plainness, and length of the three founder anchors (`content/library/anchors/anchors.json`) | Reads as noticeably weaker, vaguer, or more elaborate than the anchors |
