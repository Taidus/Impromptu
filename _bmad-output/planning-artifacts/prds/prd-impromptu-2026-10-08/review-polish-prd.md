# Review Polish Log: prd.md

Date: 2026-10-08. Lenses: structure, then prose (bmad-review). Style: Microsoft Writing Style Guide; reader: humans.
Read: this PRD exists to help UX, architecture, and story-breakdown work build Impromptu v1 without re-deriving behavior.
Structure model: requirements/reference doc. Baseline: 4,946 words; the edits change the length by less than 1%. No sections were cut.

## Applied (34 edits)

**Structure / ordering**
- §4.5: added a `**Description:**` line and moved "Realizes UJ-1, UJ-2" there from the FR-22 body, matching §4.1–4.4, §4.7, §4.8.
- §12: reordered entries to follow document order (FR-31 before CL-6; NFR-4 moved after NFR-3, ahead of SM-6 and Addendum).
- §11: made both questions parallel (bold label, then the question). Q1 is now an actual question.
- §4.8 Description: the sentence fragment is now a full sentence, with a cross-reference to SM-5 added.

**Terminology (Glossary terms applied consistently)**
- sound/mute: FR-16 heading ("obvious sound/mute control"), FR-30 ("The sound/mute control is always on screen"), FR-32 ("the sound/mute control"), FR-4 ("sound/mute state").
- Quick reveal: FR-4 and FR-18 now use the **Quick reveal** control name.
- Capitalized Glossary terms in the journeys and Vision: Level, Skill, Input, Topic, Style, Constraint, Challenge, Lock(s), Reroll(s), Retries, Rep(s), Attempt, Practice Map, Practice History, Variation, Reveal.
- FR-27 and FR-29: "History screen" changed to "Practice History screen".
- Headings: FR-5 "Templates", FR-21 "Attempts", FR-22 "Rep", FR-23 "Reflection".
- CL-4: "The audit" changed to "The library audit", because it was unclear which audit.

**Prose**
- UJ-1: fixed the typo "she reacts reacting as" to "she reacts as". "for each piece" changed to "for each Input".
- UJ-2: "Next visit" changed to "On his next visit".
- UJ-3: "timed idea-generation brief ... with five minutes" changed to "timed Idea generation exercise ... with a five-minute Time Limit". This avoids using "brief" loosely next to the Glossary term Brief.
- FR-15: removed comma-splice punctuation ("stay on screen with decorative motion stopped until...").
- FR-17: fixed subject-verb agreement ("Every Input and the Brief remains").
- FR-31: "sized for being filmed" changed to "sized for filming".
- FR-32: action labels bolded to match the rest of the doc. "back" changed to "the back control".
- NFR-2: unit spacing normalized ("≥ 1280 px", "320 px"). Values are unchanged.
- NFR-7: added the missing subject ("and it falls back").
- §9.1: "FR-1 through FR-37" changed to "FR-1 to FR-37", parallel with CL/NFR ranges.

## Found, deliberately not changed (would alter meaning or add content)
- UJ-3 has no **Entry** or **Edge case** field, unlike UJ-1 and UJ-2. Adding them would add content.
- §4.6 has no Description or "Realizes" line. Which UJs it realizes (UJ-2 and UJ-3 by reading) is a content decision.
- §12 lists FR-21 as an assumption, but FR-21 has no `[ASSUMPTION]` tag in the body. Decide whether to tag FR-21 or drop it from the index.
- §12 lists "Addendum: GDPR-style opt-in consent". No body requirement carries that tag. FR-35 says only "records consent".
- §6 Visual direction says "four grounds" but lists five stops (night → lilac → paper → sun → night). It may be a loop that returns to night, but this was left as is.
- FR-28's assumption tag wording ("plus a readable text/CSV option is a stretch") is awkward but was left verbatim inside the tag.
- §4.4 is listed as realizing UJ-1 and UJ-3 but not UJ-2, although Marcus also creates. Not changed.
- FR heading grammar is mixed (verb-led "Set difficulty..." vs noun-led "Stable Challenge"). Normalizing all of them would be churn with no gain in clarity.
- "Template" is used throughout as shorthand for the Glossary term "Exercise Template". It is consistent, so it was left as is.
