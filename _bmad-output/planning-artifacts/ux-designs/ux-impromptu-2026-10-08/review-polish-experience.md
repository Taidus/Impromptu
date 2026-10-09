# Polish review: EXPERIENCE.md

Lenses: `structure`, then `prose` on top of it (bmad-review, doc-standards polish pass). Headless run. Editorial fixes only. No behavior, timing, value, required section, protagonist, UJ title, or FR/NFR/UJ reference was changed. `[ASSUMPTION]` tags, working-copy markers, and Open Questions are untouched. Frontmatter is unchanged, and every `{path.to.token}` reference still resolves against DESIGN.md.

**Read:** this document exists to help story developers and QA build and verify Impromptu's behavior (surfaces, states, focus, motion, filming rules) in step with DESIGN.md and the PRD.

**Structure model:** Reference/Database for IA, Component Patterns, and State Patterns (consistent row schema). Tutorial/Linear for Key Flows. Both fit, with no mismatch.

**Word count:** 6,670 total (Component Patterns 1,166; Challenge Stage states 927). Net change from applied edits: about +20 words. No length target was given.

**Voice noted and preserved:** plain and terse, with table-first behavior rules, bold PRD working labels, and quoted working copy.

## Findings

| # | Pass | Location | Original | Revised / disposition | Status |
|---|---|---|---|---|---|
| 1 | structure | Component Patterns table | Row order did not follow DESIGN.md Components (e.g. Brief block after Next steps, Motion toggle near the end, Email signup after Practice rows) | MOVE rows into DESIGN's group order: Actions → Setup controls (Popover kept next to Info button, since its behavior depends on it; Motion toggle joins this group) → Stage → Forms and feedback → Practice → Journey furniture | Applied |
| 2 | structure | Interaction Primitives → Multi-tab | Restates State Patterns → Second tab | CONDENSE to a pointer: added "(see State Patterns → Second tab)" | Applied |
| 3 | structure | Accessibility Floor → Reduced motion; State Patterns → Reduced motion; Filming Contract → Minimum sizes | Same rules appear in two or three places | PRESERVE: each sits where its reader (a11y QA, state implementer, filming check) looks | Not applied (kept on purpose) |
| 4 | structure | Assumptions Index | Mirrors `.memlog.md` | PRESERVE: a required index, and short | Not applied (kept on purpose) |
| 5 | prose | Component Patterns, State Patterns (Practice), Interaction Primitives → Persistence | "History", "the Map", "Map, then History" | "Practice History", "Practice Map" (glossary terms in full; 5 places) | Applied |
| 6 | prose | Component Patterns → Variation option; Key Flows → Flow 2 failure paths | "the Template allows", "no compatible Template" | "Exercise Template" (PRD glossary term) | Applied |
| 7 | prose | Component Patterns | "Practice map cell" | "Practice Map cell" (changed in both files, so names still match) | Applied |
| 8 | prose | Component Patterns → decoration row | "Ticker, Orbit thread, Chrome and cutouts, three.js hero" | "… Chrome and cutouts (including the three.js hero piece)". DESIGN has no separate "three.js hero" component; it is part of Chrome and cutouts | Applied |
| 9 | prose | State Patterns → Variation pick | "'Change it again' re-rolls the same Input" | "… changes the same Input again" (avoids confusion with the glossary term Reroll, which keeps Locks and has different behavior) | Applied |
| 10 | prose | Component Patterns → Difficulty Dial | "Choosing Perform reveals the Perform timing control" | "… shows …" (avoids confusion with the glossary term Reveal) | Applied |
| 11 | prose | Motion and 3D | "never blocks input" | "never blocks user interaction" (avoids confusion with the glossary term Input) | Applied |
| 12 | prose | Inspiration & Anti-patterns (2 places) | "the reveal as a beat", "The reveal is part of the show"; "(brief, PRD §1)" | "the Reveal …", "The Reveal …"; "(product brief; PRD §1)" | Applied |
| 13 | prose | Component Patterns → Chip toggle; Interaction Primitives → Banned; State Patterns → Rerolling | "the medium picked", "linked reps", "quick-reveal timing" | "the Medium picked", "linked Reps", "Quick reveal timing" | Applied |
| 14 | prose | Component Patterns → Notice banner | "setup section 01" | "Setup section 01" (surface name) | Applied |
| 15 | prose | Component Patterns → Lock toggle | "a fixed name, "Lock Topic", and `aria-pressed`" | "a fixed name per piece (for example, "Lock Topic") and `aria-pressed`" (the old wording read as one name for every toggle) | Applied |
| 16 | prose | Information Architecture bullets | "Modals stack at most one level: the Clear-all dialog and the Skill info popover." | "At most one overlay is open at a time: the Clear-all dialog or the Skill info popover." | Applied |
| 17 | prose | Foundation | "This spine is the experience, and the PRD owns requirements" | "This spine owns the experience, …" (parallel with "the PRD owns") | Applied |
| 18 | prose | Challenge Stage Filming Contract; Motion and 3D | "This section is invented because/to …" | "This section is added …" | Applied |
| 19 | prose | Voice and Tone, Component Patterns, State Patterns (UI strings) | "Keep at least one medium on.", "No challenge fits these locks." use lowercase glossary terms | UI strings are working copy and are content (PRD §11). Flagged for final copy | Not applied |
| 20 | prose | Key Flows titles | "films a reveal", "quick daily rep" in lowercase | Flow/UJ titles are protected | Not applied |
| 21 | prose | Whole doc | "Stage" as shorthand for Challenge Stage | PRESERVE: consistent shorthand, and the full term is defined in Foundation and IA | Not applied (kept on purpose) |
| 22 | prose | Flow 3 step 4 | "At 2:10" when the countdown displays mm:ss ("05:00") | Consider: "At 02:10"? It is a narrative time, not a display string | Not applied (low impact) |

## Cross-file consistency (Component Patterns ↔ DESIGN Components)

Names now match exactly, apart from these items left for the author:

- **Ink button row: "Save rep when shown next to a sun button."** This conflicts with DESIGN's Reflection panel, where "Save rep" is the sun button. It is a behavior/visual decision, so not applied.
- **Resume button style.** DESIGN's Ink button lists "Resume in the Setup banner". This file's Attempt-in-progress state makes the section 01 sun button read **Resume**, with only **Discard** in the banner. Not applied.
- **`Setup header`** (in the journey-furniture row) has no DESIGN Components entry. **`Stage mark`** has a DESIGN spec but no behavior row here. Either needs new content to close, so not applied.

## Summary

22 findings: 16 applied (2 structure, 14 prose rows covering 25 individual text edits), 6 not applied (3 PRESERVE, 2 protected or content, 1 low-impact "Consider"). Plus 3 cross-file items left for the author. Estimated reduction: none. The pass was about clarity, terminology, and cross-file name alignment.
