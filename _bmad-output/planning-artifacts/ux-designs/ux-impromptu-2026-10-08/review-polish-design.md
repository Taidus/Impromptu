# Polish review: DESIGN.md

Lenses: `structure`, then `prose` on top of it (bmad-review, doc-standards polish pass). Headless run. Editorial fixes only. No design decision, value, token, hex, size, timing, or behavior was changed. Frontmatter is byte-identical. Every `{path.to.token}` reference still resolves.

**Read:** this document exists to help designers and story developers build Impromptu's visual layer (grounds, type, layout, components) to a verifiable contract without mockups.

**Structure model:** Reference/Database (random access by section, consistent schema per component). The required section order is fixed and kept.

**Word count:** 5,591 total (Components 1,743; Layout & Spacing 975; frontmatter/preamble 1,276). Net change from applied edits: about +15 words. No length target was given.

**Voice noted and preserved:** editorial, declarative, short sentences, bold lead-ins per bullet, contrast ratios inline.

## Findings

| # | Pass | Location | Original | Revised / disposition | Status |
|---|---|---|---|---|---|
| 1 | structure | Components → Journey furniture / Assets | `Footer` bullet stranded after the Assets table, outside its group (and glued to the table with no blank line) | MOVE into Journey furniture, after Chrome and cutouts | Applied |
| 2 | structure | Components → "Reveal pieces (on the Stage)" | Bold group label ran straight into a sentence; a second sentence sat on its own line. The group also holds non-pieces (Brief block, Countdown, Reflection panel, Next steps, Stage mark) | Group renamed **On the Stage**; intro merged into one paragraph that says it applies to "the five reveal pieces (two ticket tabs, the paper scrap, the foil slip, and the ink stamp)" | Applied |
| 3 | structure | Colors | Rule "Pairs not listed here are unverified and must not carry text" buried at the end of the section | MOVE directly under the ground table it qualifies (front-load the constraint) | Applied |
| 4 | structure | Typography ↔ Layout Fit rule ↔ EXPERIENCE Filming Contract | Stage minimums (Brief 32px, Input 24px, never shrink) stated in three places | PRESERVE: each restatement sits where a builder needs it; reinforcement, not redundancy | Not applied (kept on purpose) |
| 5 | structure | Layout → Setup height-budget table, Stage ramp table | Dense tables inside numbered list | PRESERVE: tables are the right shape for row/size data | Not applied (kept on purpose) |
| 6 | prose | Layout & Spacing | "**Medium widths (861–1279px).**" | "**Mid-size widths (861–1279px).**" (avoids collision with the glossary term Medium) | Applied |
| 7 | prose | Layout → Challenge Stage list, item 1 | "The brand mark, plus the Level and mode meta" | "The Stage mark, …" (matches the component name) | Applied |
| 8 | prose | Colors → Grape bullet | the "rep done" stamp | the rep-done stamp (component name) | Applied |
| 9 | prose | Colors → Focus bullets; Components → Ink stamp | Bare ratios "3.3, lilac 3.4, and paper 4.7", "7.1 or better", "4.1", "2.9", "measure 3.9" | Added ":1" to match every other ratio in the file (values unchanged) | Applied |
| 10 | prose | Brand & Style | "reveal mechanics" | "Reveal mechanics" (glossary term) | Applied |
| 11 | prose | Layout → 02 Lilac | "what is in a challenge … next to six Skill descriptions" | "what is in a Challenge … next to the six Skill descriptions" | Applied |
| 12 | prose | Components → Select field | "Skill focus (Random plus six)" | "Skill focus (Random plus the six Skills)" | Applied |
| 13 | prose | Components → Inline message | "Used for lock conflicts" | "Used for Lock conflicts" (glossary term; matches EXPERIENCE state name) | Applied |
| 14 | prose | Components → Practice | "Practice map cell" | "Practice Map cell" (glossary capitalization; changed in both files so names still match; token `practice-map-cell` untouched) | Applied |
| 15 | prose | Frontmatter `components.section-header.ornament` | "centre circle" (body uses "center") | Spelling variant, not a clear typo. Frontmatter left alone | Not applied |
| 16 | prose | Components → Actions (label formatting) | Button labels are sometimes bold (Next steps), sometimes plain ("Start creating" in Lock toggle) | Consider: bold all PRD working labels, as EXPERIENCE does? | Not applied (author choice; low impact) |

## Cross-file consistency (Components ↔ EXPERIENCE Component Patterns)

Names now match exactly, with three exceptions left for the author because closing them would add or change design content:

- **Ink button vs EXPERIENCE (content conflict).** DESIGN lists "Resume in the Setup banner" as an ink button. EXPERIENCE State Patterns (Attempt in progress) says the section 01 *sun* button reads **Resume** and the banner carries only **Discard**. Not applied: the author needs to decide.
- **"Save rep" button style (content conflict).** DESIGN Reflection panel says a *sun* "Save rep" button. EXPERIENCE Ink button row says "Save rep when shown next to a sun button." Not applied: the author needs to decide.
- **Components in only one file.** `Stage mark` has a DESIGN spec but no EXPERIENCE row. EXPERIENCE's `Setup header` has no DESIGN component (the header appears only in the Layout height budget). Not applied, because a new spec or row would be new content.

## Summary

16 findings: 12 applied (3 structure, 9 prose), 4 not applied (2 PRESERVE, 2 author choice). Plus 3 cross-file items left for the author. Estimated reduction: none. The pass was about clarity and consistency, not length.
