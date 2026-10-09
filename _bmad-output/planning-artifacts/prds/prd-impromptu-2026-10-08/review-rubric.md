# PRD Quality Review — Impromptu

## Overall verdict
This is a strong PRD for a medium-rigor passion project. The thesis is clear ("worth making and worth filming"), the personas and journeys drive real requirements, and most FRs have testable consequences. There are three risks. First, the deliberate removals (camera mode, linked reps) left stale traces in the signature journey and the metrics. Second, the filming-safe area, which is the product's main differentiator, has no numeric spec. Third, no success metric tests whether creators actually film and post with it. All three are fixable in one editing pass, and none calls for rethinking the product.

## Decision-readiness — adequate
Most decisions are stated as decisions, and the PRD says what each one cost. Examples: "Product analytics (deliberate privacy trade)" (§9.2), typography that "supersedes the spec's 'one display plus one sans'" (§6), and the explicit three.js placement rule (NFR-3a). The single `[NOTE FOR PM]` (§9.2, viewer-suggested topics) sits at a real tension.

Weaknesses: one Open Question contradicts a section stated as settled, and one decision with launch consequences (EU consent handling) sits in the addendum as a conditional instead of being decided or listed as open.

### Findings
- **[medium]** Open Question 2 contradicts "Fixed copy" (§6, §11 item 2). §6 lists "Fixed copy: … Get a challenge · Reveal next · Start creating · Finish rep · Try another version", but §11 says "Final UI copy is undecided … working copy until the founder decides." A UX designer can't tell which one wins. *Fix:* rename the §6 bullet "Working copy (see §11 Q2)", or close Q2 and keep "Fixed".
- **[medium]** The GDPR stance for a public launch is left conditional (addendum, "Email compliance notes"). "If EU visitors are expected, treat consent as GDPR opt-in…" A public website will get EU visitors. The CAN-SPAM physical-address requirement is also a personal-privacy decision for a solo founder (home address vs. a PO box or registered agent), and nothing records it. *Fix:* decide opt-in wording now, or add both points to §11 as Open Questions with a `[NOTE FOR PM]`.
- **[low]** The Open Questions list is thin for what remains unresolved. Only two items appear, but the PRD has unresolved semantics in places: what happens to a held Challenge when the user goes back to setup, and how timed vs. untimed Perform is chosen (see Done-ness). *Fix:* add those as Open Questions, or resolve them inline.

## Substance over theater — strong
The Vision is specific to this product. "Creators already film 'let the wheel decide what I draw' videos with generic spinners" names a real behavior and a real replacement, and it could not be swapped into another PRD. Each of the three personas drives distinct requirements:
- Dani drives filming, the safe area, and sequential reveal.
- Marcus drives quick reveal, Lock, and resume.
- Priya drives the timer start rule and Retry.

The NFRs carry thresholds: 4.5:1 / 3:1 contrast, ≥1280px primary target, 320px minimum width, quick reveal ≤ 1 s. NFR-5 Privacy is a real product stance, not boilerplate.

### Findings
- **[low]** §6 "Visual direction" describes the mockup's page, not the product (§6). "A page built as one continuous collage journey through four grounds (night → lilac → paper → sun → night)" describes a single-page structure. The same section says the mockup's "page structure … [is] not [a] requirement", and §4.7 splits the product into separate setup, Stage, and history pages. *Fix:* restate the direction per page. For example, setup and history may use the grounds journey, and the Challenge Stage uses one ground behind a calm safe area.

## Strategic coherence — adequate
The thesis is explicit: real exercises plus a filmable reveal beat generic spinners, and progress means breadth, not streaks. Feature prioritization follows from it. The Reveal and the Challenge Stage get the most FR detail, and §8 Non-Goals protects the "no grading, no guilt" stance. Counter-metrics exist and are well chosen (SM-C1, SM-C3).

The gap is that the metrics validate the utility half of the thesis (first-use clarity, legibility, deliverable quality) but not the bet that distinguishes the product, which is that creators will film and post it.

### Findings
- **[high]** No success metric tests the "worth filming" thesis (§10). §1 bets that creators will use Impromptu instead of generic spinners for posted videos. §10 says metrics come from "moderated tests, library audits, and external signals", but no SM uses an external signal. SM-5 counts email signups, which measures interest in updates, not filming. *Fix:* add a primary SM that needs no analytics. For example: "≥ N public videos featuring the Challenge Stage found by search of the brand mark or hashtag within 60 days", or "≥ 3 of 5 creator testers say they would post the recording."
- **[medium]** SM-4 and SM-5 can't be measured as written (§10). SM-4 ("≥ 3 of 5 testers return for a second session within a week and save at least one Reflection") needs either self-report or analytics, and the method isn't stated. SM-5 has no target ("email signups recorded … in the first 60 days"), so it can't pass or fail. *Fix:* state SM-4's method (for example, a testers' diary, or exported JSON shared back) and give SM-5 a number.

## Done-ness clarity — adequate
Most FRs are tight and testable. Examples: FR-9 ("Locked Inputs are identical before and after every Reroll"), FR-14 (≤ 1 s), FR-18, FR-20's wall-clock rule, FR-2's last-Medium guard, and FR-27's versioned storage. The weak spots cluster on the Challenge Stage, the product's differentiator, which is where downstream UX and stories will lean hardest.

### Findings
- **[high]** The filming-safe area has no dimensions (FR-31, FR-34). FR-31 says "a centered safe area that stays intact when the screen is filmed in landscape or cropped to a 9:16 portrait", and "Inputs and Brief use large type sized for being filmed." Neither phrase is testable. A 9:16 crop of a 16:9 laptop screen keeps only about the center 32% of its width, which drives the whole Stage layout. FR-34 says "At 50% scale" without saying 50% of what. *Fix:* specify the safe area as a percentage of the viewport (for example, centered 30% × 90% at ≥1280px), give a minimum type size for the Brief at that width, and define FR-34's test setup (viewport size, phone distance, playback size).
- **[medium]** Timed vs. untimed Perform can't be selected, so UJ-3 can't happen as described (FR-5, UJ-3). FR-5 says that at Perform "Both timed and untimed Templates are eligible." No FR lets the user request a timed one, yet UJ-3 is titled "Priya runs a timed Perform challenge." *Fix:* add a timed/untimed preference to setup (FR-4 persists it), or rewrite UJ-3 so the timed brief is a chance outcome she rerolls toward.
- **[medium]** Leaving the Stage with a held, unstarted Challenge is unspecified (FR-10, FR-30). FR-10 says a revealed Challenge "survives a page reload", and FR-30 says "Esc returns to setup when no Attempt is running." Nothing says whether returning to setup keeps, discards, or reveals the held Challenge again when the user comes back. *Fix:* add one consequence to FR-30. For example: "Returning to setup discards an unstarted Challenge; Locks are kept."
- **[medium]** Countdown behavior across pause and reload is undefined (FR-20, FR-21). FR-21 restores an Attempt after a tab close, and FR-20 uses wall-clock time. It's unclear whether a running countdown keeps elapsing while the tab is closed, or comes back paused. *Fix:* state it. For example: "On Resume, a running countdown reflects wall-clock time elapsed; a paused one stays paused."
- **[medium]** NFR-4 is both a requirement and a stretch. It says the app "work[s] fully offline after the first load" and then "[ASSUMPTION: offline is a stretch; graceful degradation is required]". "Graceful degradation" is undefined, so an engineer can't tell what done looks like. *Fix:* make the requirement the floor. For example: "If the network drops after load, an in-progress Reveal and Attempt continue and History saves." Move full offline support to a stretch bullet.
- **[medium]** NFR-3 sets a performance bound only for the secondary platform (NFR-2, NFR-3). The product is "desktop first", but the only performance threshold is "a mid-range phone over 4G within 3 s". Desktop, the primary filming setup, has no bound, for example for Reveal frame rate with three.js running. *Fix:* add a desktop bound, such as a steady 60 fps during the Reveal on a mid-range laptop's integrated GPU, plus a first-interaction time.
- **[low]** Some requirements use adjectives instead of bounds: FR-32 "visually quiet", FR-20 "clearly visible", FR-36 "rate-limited per client" with no threshold. The addendum adds "per-IP rate limiting and a honeypot" but no numbers. *Fix:* give FR-36 a number (for example, 5 per IP per hour). Tie FR-32 and FR-20 to a size or contrast rule, or accept them as UX-owned.
- **[low]** The order in which Inputs are revealed is unspecified (FR-13, §4.3). The order is implied (Topic → Style → Constraint), but FR-13 never states it, and it doesn't say whether Skill and Medium are revealed or shown up front. *Fix:* state the sequence, which also fixes the tap count in UJ-1 (see Mechanical notes).

## Scope honesty — adequate
§8 Non-Goals does real work, and §9.2 names each deferral with its reason. The Assumptions Index exists and mostly matches the inline tags. Open-item density is low and appropriate for medium rigor. The weak points are stale scope statements left behind by edits.

### Findings
- **[medium]** §9.1 puts the Cutout design system in scope, which contradicts §6 (§9.1, §6). §9.1 lists "the Aesthetic and Copy rules in §6, and the Cutout design system" as in scope. §6 says the mockup "is a design exploration, not the site" and that its structure, labels, and reveal mechanics aren't requirements. Listing it in scope invites someone to build the mockup. *Fix:* replace it with "the visual direction in §6, using the Cutout mockup as a style reference only."
- **[medium]** §9.1 omits CL-6 (§9.1). It says "Challenge Library requirements CL-1 to CL-5", but §5 defines CL-6 (offline generation and its validation gate), which is a core scope decision. *Fix:* change to "CL-1 to CL-6".
- **[low]** CL-6 is still tagged `[ASSUMPTION]` though it's a decision (§5 CL-6, §8, §12). §8 states "It never calls an AI service at runtime" as a non-goal, and §9.2 cites CL-6 as the chosen approach. The inline "`[ASSUMPTION]` AI-assisted, offline" and its index entry are left over from before the decision. *Fix:* drop the tag and the index entry, or narrow the tag to the one undecided detail (which AI tool).

## Downstream usability — adequate
This PRD is at the top of the planning chain (UX → architecture → stories), so this dimension matters. The Glossary is solid: Style and Constraint are carefully told apart, and Attempt, Rep, Retry, and Variation are distinct terms. FR and NFR IDs are mostly contiguous, and FRs carry "Realizes UJ-n" links. But the removals left several references that don't resolve, and one of them sits in the signature journey.

### Findings
- **[high]** UJ-1 has a duplicated tap left over from the camera-mode removal (§2.3 UJ-1 Path). "…taps **Get a challenge**, which opens the Challenge Stage. She taps **Get a challenge**." It's unclear whether arriving on the Stage starts the cycling, or whether a second **Get a challenge** button exists on the Stage. FR-13 ("After **Get a challenge**, each Input appears in turn") and FR-30 don't settle it. This is the product's main flow, and UX will design it from this sentence. *Fix:* decide whether the Reveal starts automatically on arrival or with an on-Stage start action. Update UJ-1, FR-13, and FR-30 to match.
- **[medium]** SM-C2 points to a metric that doesn't exist (§10). "Counterbalances SM-6." No SM-6 exists, probably a numbering gap from a removed metric. *Fix:* point it at the metric it actually balances (SM-1 or SM-2), or reinstate the missing metric.
- **[medium]** Glossary drift on Variation (§3 vs. FR-12). The Glossary says Variation "keeps a chosen Input and changes others". FR-12 says "the generator changes exactly one other compatible Input." It also doesn't say whether the user or the generator picks which Input changes, or whether a Variation goes through a Reveal or Lock/Reroll. *Fix:* align the Glossary to "changes exactly one other Input" and add the reveal/reroll behavior to FR-12.
- **[medium]** The repeat window counts Reps, but the library target counts Challenges (FR-8 vs. CL-2). FR-8 avoids repeats over "the last N Reps" (finished only). CL-2 targets "no repeated Brief in their first 30 Challenges" (seen, including rerolls). A user who rerolls often can see repeats that FR-8 permits. *Fix:* make FR-8 count revealed Challenges, or restate CL-2 in Reps.

## Shape fit — strong
This is a consumer product with meaningful UX, so journeys with named protagonists are load-bearing, and they're present, short, and each has an edge case. The library gets its own requirements section (§5, "The library *is* the product"), which fits a content-driven product. Rigor matches a passion project aimed at a public launch: the PRD isn't over-formalized and has no persona sprawl. The technology choices live in the addendum.

### Findings
- **[low]** UJ-3 doesn't follow the journey template (§2.3). UJ-1 and UJ-2 have an **Entry** line and an **Edge case**. UJ-3 has neither, though "time runs out" serves as a near-edge case. *Fix:* add Entry (for example, a returning visitor on desktop) for consistency.

## Mechanical notes
- **Broken cross-reference:** §0 says inferred items are "indexed in §11". The Assumptions Index is §12, and §11 is Open Questions.
- **Unclear section reference:** CL-5 cites "The three example Challenges from the spec (§13)". The PRD has no §13, and the examples live in `addendum.md` ("Example challenges carried verbatim"). Point to the addendum.
- **Dangling ID:** SM-C2 points to "SM-6", which doesn't exist (covered above).
- **ID ordering:** NFR-3a appears before NFR-3 in §7. Renumber NFR-3a to follow NFR-3 (or make it NFR-7), and update the addendum's "per PRD NFR-3a".
- **Scope ranges:** §9.1 "CL-1 to CL-5" should be CL-1 to CL-6 (covered above).
- **Assumptions Index roundtrip:**
  - FR-21 is indexed ("an active Attempt is restored after a reload; Discard saves nothing"), but FR-21 has no inline `[ASSUMPTION]` tag.
  - CL-6 is tagged and indexed but is now a decision.
  - The rest round-trip cleanly: FR-2, FR-8, FR-20, FR-23, FR-28, NFR-3, NFR-4, and §2.3.
- **Count mismatch in UJ-1:** Dani "taps **Reveal next** four times" while three Inputs are named (Topic, Style, Constraint). Five Inputs exist per the Glossary, and the Brief comes last per FR-13. The count follows from whatever reveal order FR-13 adopts.
- **Stale reference in FR-3:** "It is not shown during the Reveal unless the user asks for it." The Skill info control lives on setup, and the Reveal now happens on a separate Challenge Stage page that excludes setup controls (§4.7). Decide whether the Stage offers a Skill info affordance. If it doesn't, remove the clause.
- **Glossary casing drift:** "practice map" in lowercase (UJ-2) vs. **Practice Map**. "quick reveal" (FR-18) vs. **Quick reveal** (FR-14). "Template" and "Exercise Template" are used interchangeably; this is acceptable but worth a Glossary alias note. The setup screen is called "landing screen" (§4.1), "landing and setup page" (NFR-3a), and "setup" (FR-30), with no Glossary entry. Add one term.
- **Required sections:** all are present for this product type and the agreed rigor.
