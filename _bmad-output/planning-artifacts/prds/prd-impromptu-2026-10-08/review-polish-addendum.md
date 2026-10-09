---
title: "Review polish: addendum.md"
created: 2026-10-08
---

# Review polish: addendum.md

The bmad-review lenses that ran were structure, then prose. The style guide was the Microsoft Writing Style Guide, and the target reader was a person. Before the edits the file was 600 words. The structure model is a reference/spec addendum for architecture and UX.

## Edits applied (11)

| # | Section | Change |
|---|---|---|
| 1 | Stack › 3D | Fixed a stale reference: `NFR-3a` became `NFR-7` (3D placement). |
| 2 | Stack › 3D | Split a tangled sentence in two. One says what 3D renders (the Y2K accents). The other says that 3D supplements the image-based chrome and does not replace it. |
| 3 | Stack › 3D › Settle rule | Rewrote it as "on the Challenge Stage … once the Reveal completes, and stays stopped while the user is creating (FR-15, FR-33)". The vague "creating" view and the misplaced qualifier are gone. |
| 4 | Stack › 3D › Fallback | Added the governing references (NFR-3, NFR-7). |
| 5 | Stack › App | Capitalized the glossary term: "Challenge experience". |
| 6 | Challenge library shape | Changed "TS" to "for example, TypeScript". |
| 7 | Generation sequence | Made the stale shorthand match FR-8: "drop recent Template-plus-Topic combinations (FR-8; allow a repeat if none remain)". |
| 8 | Generation sequence | Changed "leaves nothing … reports which Lock" to "leaves no compatible Challenge … names the Lock", which matches the wording of FR-9. |
| 9 | Example Challenges | Capitalized the term in the heading. Item 3 now says "starting when the user taps **Start creating**". Nothing inside the quotes changed. |
| 10 | Email compliance | Split the form requirements (consent line, privacy-note link) from the per-email requirements (physical address, unsubscribe). |
| 11 | Email compliance | Tightened "an explicit submit with clear wording" to "a clearly worded explicit submit". |

## Left unchanged on purpose

- The YAML frontmatter, every config key and value, and the existing FR, NFR, CL and SM references.
- The quoted text of the three verbatim example Challenges (CL-5).
- `generator.recentWindow` = "30 revealed Challenges". This already matches FR-8, which counts revealed Challenges, finished or not.
- The section order and the separate Email compliance section. Merging that section into the Stack › Email bullet would bury the compliance decision.
- The 3D lead-in "Architecture should decide:". Reframing the sub-bullets as fixed constraints would change their meaning.
