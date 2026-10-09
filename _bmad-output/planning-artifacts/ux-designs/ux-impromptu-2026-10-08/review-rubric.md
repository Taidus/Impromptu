# Spine Pair Review — Impromptu

Reviewer: rubric walker · 2026-10-08 · Scope: `DESIGN.md` + `EXPERIENCE.md` against `../../prds/prd-impromptu-2026-10-08/prd.md` and `addendum.md`. Spines not edited.

## Overall verdict

The pair works as a contract. All 69 `{token}` references resolve, every color has a hex value, all three UJs have complete Key Flows, every user-facing FR has a surface, state, or component that delivers it, and every founder decision is honored or at least not contradicted. Before story-dev starts, three kinds of gaps need closing. First, the Stage and Setup layouts are not proven to fit the 1280×800 baseline that UJ-1 and SM-1 depend on. Second, three load-bearing color pairs fail or are ambiguous (the LOCKED caption, the Dial labels, and the Constraint stamp on lilac). Third, a few behaviors that architecture needs are not committed: when a Rep is written, multi-tab behavior, and which Inputs a Variation can change. One literal PRD conflict needs a founder ruling: tilted Input text versus "Essential text is always horizontal."

## 1. Flow coverage — adequate

Checked: UJ-1, UJ-2 and UJ-3 each map to a Key Flow (Flows 1–3), with the title verbatim, a named protagonist, numbered steps, a **Climax** beat, and failure paths. Flows 4 (signup) and 5 (export and clear) cover FR-35/36 and FR-28. Walked FR-1 to FR-37: every user-facing FR has a delivering state or component. FR-5–FR-8 and CL-* are generator-only, and FR-37 is email content.

### Findings
- **high** Stage vertical budget is unproven at the 1280×800 filming baseline. In a 450px column (56.25vh at 800px), the CL-5 example 2 Brief ("Take two photos of coming home…", 103 chars) wraps to about 5 lines at 32/44, roughly 220px. Add the mark and meta row (~40px), the ticket tabs (~90px), the scrap with a 48px Topic (~170px), the countdown and caption (~90px), the action row (52px), and 5×`{spacing.6}` + `{spacing.8}` (152px), and the total is about 815–850px. The "column scrolls, type never shrinks" rule (DESIGN.md → Layout & Spacing, Challenge Stage; Typography last paragraph) then cuts off the UJ-1 climax shot. *Fix:* add a height budget per Stage state at 1280×800 using the longest CL-5 Brief. Define what compresses before scrolling (gap tokens, the Topic dropping to `topic-stage-long`, the countdown caption) and state that the Held state must fit without scrolling at the baseline.
- **high** The Setup "above the fold at 1280×800" claim is unproven (DESIGN.md → Layout & Spacing, Setup item 1; EXPERIENCE.md → Setup page sections, "without scrolling (SM-1)"). The stack is a two-line 112px `display` headline, the lede, a 220px dial plus its description, the Medium chips, the "This time" segmented control, a 7-segment Skill focus, the Quick reveal switch, conditional Perform timing, and the CTA. That totals about 1,000–1,100px. Seven tracked Unbounded segments ("IDEA GENERATION", "OBSERVATION"…) also will not fit a ~46% column. *Fix:* give a vertical budget for the stack. Commit an alternative for Skill focus (a select or popover) and a reduced hero headline size for this layout, or drop the above-the-fold promise and restate SM-1's path.
- **medium** Shuffle behavior for an Input the user already fixed is undefined. In Flow 1, Drawing is the only enabled Medium, yet "each one shuffles before landing" (EXPERIENCE.md → Flow 1 step 5; State Patterns → Revealing). A chosen Skill focus or a single enabled Medium makes the shuffle theater. *Fix:* state whether pre-determined Inputs shuffle (only among the user's allowed values) or land without a shuffle.
- **medium** Copy that FR-1 and FR-3 need is missing. Only Experiment's dial value text ("Try more than one way in.") and one Skill description example are given (EXPERIENCE.md → Component Patterns, Difficulty Dial; Voice and Tone rules). *Fix:* add working copy for all four Level one-liners and all six Skill descriptions, or name the owner (library content).
- **low** Flow 2 step 8, "Expression at 1 more than last week", implies a time delta that the Practice Map does not show (FR-26). *Fix:* "the Expression count now reads 1."
- **low** FR-37 email content (sender physical address, one-click unsubscribe, addendum compliance notes) has no UX owner. *Fix:* add one line to Open Questions assigning email template design.

## 2. Token completeness — adequate

Checked: extracted all frontmatter tokens (34 colors, 33 typography, 4 rounded, 19 spacing, 39 components). The 66 distinct refs in DESIGN.md and 3 in EXPERIENCE.md all resolve. Every color is a valid 6-digit hex. Contrast claims were re-measured (WCAG relative luminance). The stated pairs match within ±0.1, for example plum/lilac 9.33, cream/night 15.97, ink/sun-deep 7.07, and cream/grape 4.87.

### Findings
- **high** The Lock toggle's "cream 'LOCKED' meta caption under the piece" sits on lilac at **1.45:1** (DESIGN.md → Components, Lock toggle). This is a load-bearing state word, and it is the not-by-color-alone signal. *Fix:* set the caption in `{colors.plum}` (9.3:1) or put it on an ink chip.
- **high** The Difficulty Dial's position labels are "`{typography.button}` cream" on "its upper arc" (DESIGN.md → Components, Difficulty Dial; frontmatter `difficulty-dial.position-label`). If they sit on the sun face, cream on sun measures 1.52:1 and on sun-light 1.17:1. *Fix:* state that the labels sit outside the disc on the night ground, or use ink on the face (10.2:1).
- **high** The Constraint stamp on lilac fails AA for its label. `{colors.stamp}` on lilac measures **3.93:1**, so the 13px CONSTRAINT `piece-label` fails 4.5:1. The 24px/700 value passes 3:1, but the "at least 5.0:1" claim holds only on paper or cream (DESIGN.md → Components, Ink stamp; Layout & Spacing, Phone "stamp drops below the Topic"). *Fix:* give the stamp a paper or cream backing card wherever it leaves the scrap, or darken the stamp ink, and re-measure.
- **medium** The focus ring on the sun ground is overstated. "Sun 3.2" holds only on `#ffb21a`. Grape measures 2.72:1 on `{colors.sun-orange}` and 2.21:1 on `{colors.sun-deep}`, which are stops of the Setup 04 ground where the ink "Get a challenge" button lives (DESIGN.md → Colors, Focus bullet). *Fix:* use an ink or cream double ring on the sun ground, or pin section 04's button over the light stop and say so.
- **medium** The phone Stage ramp is only partly tokenized. Phone Topic 32, Style 24, Constraint 20, Skill/Medium 22, piece-label 12 and stage-meta 12 appear only as numbers in the Typography table. Only `brief-stage-phone` and `countdown-phone` exist as tokens. *Fix:* add `*-stage-phone` tokens.
- **low** The italic for Style is prose-only (`style-stage` has no style field). *Fix:* add a `note: italic` field or a `fontStyle` key.
- **low** The Switch off state has a cream thumb on a cream-dim track (1.81:1) and relies on the visible label. *Fix:* use an ink thumb when off, or accept and note it.

## 3. Component coverage — adequate

Checked: 33 DESIGN.md component entries against 26 EXPERIENCE.md Component Patterns rows. Every interactive DESIGN component has a behavioral row with real rules (ARIA roles, keys, persistence, focus).

### Findings
- **medium** Overlap geometry between pieces is unspecified. On desktop the Constraint stamp is "pressed onto [the scrap's] lower right" (the phone rule says it "drops below the Topic text rather than overlapping it", implying desktop overlap). The 52px Lock toggles sit "fixed to each piece's top-left corner", which for the foil slip lands over the scrap. The Rep-done stamp is "pressed across the scrap's lower left" (DESIGN.md → Components, Reveal pieces). PRD §6 says decoration never covers instructions or controls. *Fix:* define a keep-out box around every Input value's text, and the anchor offsets for the stamp, the locks and the rep-done stamp relative to it.
- **medium** The email signup card has no DESIGN.md row. EXPERIENCE.md names "Email signup" as a component and places a "quiet email-signup card" on the lilac Stage Saved state, but DESIGN.md only describes the footer on night. *Fix:* add an Email signup row with its night and lilac variants (field, consent, button, privacy link, success and error placement).
- **medium** The Variation picker, Reflection panel and next-step group lack visual specs. "Each piece becomes a radio option" (EXPERIENCE.md → State Patterns, Variation pick), and the Reflection panel replaces the action row inside the safe area, but DESIGN.md has no selected or unselected appearance for a piece-as-radio and no Reflection panel layout. *Fix:* add rows for these, including how they fit in the column.
- **low** Setup header (brand mark + Practice link on night), static hero fallback art, Section header, Poster card and Footer have no behavioral rows. *Fix:* add one-line rows, or note them as static.
- **low** The Info button has no frontmatter component token. *Fix:* add `info-button`.

## 4. State coverage — adequate

Checked: Setup (7 states), Challenge Stage (22), Practice (6), Email signup (8). Present: empty, first visit, returning, focus, lock conflict, storage unavailable (all three surfaces), 3D unavailable, offline, reload, reduced motion, paused, Time's up, migration failure, signup errors.

### Findings
- **high** The Rep-write boundary is uncommitted. After **Finish rep** the Stage shows the Reflection panel, and the Rep is saved only on "Save rep" (EXPERIENCE.md → State Patterns, Finished/Saved). It is undefined whether a tab close, Back or Esc between Finish and Save loses the Rep, and whether Esc is allowed (is the Attempt still "running"?). Architecture needs this for the storage model. *Fix:* state that **Finish rep** writes the Rep immediately and Save rep only attaches the Reflection, or the opposite, and define reload, Back and Esc in the Finished state.
- **medium** Multi-tab behavior is undefined. The single Attempt and held Challenge invariant (EXPERIENCE.md → IA bullet 2) has no rule for two tabs on `/stage`, or for Setup in one tab and Stage in another. *Fix:* commit last-write-wins with a `storage` event refresh, or read-only in the second tab.
- **medium** Setup CTAs during an Attempt conflict. While an Attempt exists, section 01 shows **Resume** twice (banner ink button plus the sun button), and section 04's ink **Get a challenge** and the Practice empty-state **Get a challenge** have undefined behavior (EXPERIENCE.md → State Patterns, Setup "Attempt in progress"). *Fix:* keep one Resume, and say what the other Get a challenge entry points do while an Attempt exists.
- **low** Back mid-Reveal (some pieces landed, not yet held) has no Setup banner state, and the return point is only implied by the reload rule. *Fix:* add "Reveal in progress" to the Setup states.
- **low** Email "already on the list" (duplicate) state and an Unsubscribed invalid-token state are missing. *Fix:* add rows.
- **low** No screen-reader announcement is defined for Reroll (which pieces changed). There is no Stage cold-load state (font swap reflow while filming). *Fix:* add both.
- **low** On Practice with storage unavailable, the visibility of Export and Clear is unstated. *Fix:* hide or disable them.

## 5. Visual reference coverage — strong

Checked: `imports/` is empty, there are no `mockups/` or `wireframes/` folders, and `.working/` is empty. EXPERIENCE.md → Foundation states "No mockups or wireframes were produced for this run", and the memlog records that creative tools were skipped.

### Findings
- **medium** No asset inventory exists. DESIGN.md names raster assets (`paper-scrap.webp`, `ink-mask.png`, `hero-bloom-orange`, poster images, image-based chrome, the static 3D fallback) that exist only in the Cutout artifact. PRD §6 says all artwork is original and generated or drawn. *Fix:* add an asset manifest (name, use, source or owner, fallback) or an Open Question naming who produces them.
- **low** DESIGN.md does not itself state that no visual references exist. *Fix:* add one line in Brand & Style.

## 6. Bloat & overspecification — adequate

### Findings
- **low** Unused tokens are carried over "verbatim": typography `wordmark`, `display-phone`, `topic`, `numeral`, `stamp`, `brief` (21px), `caps-intro` (`y2k-display` is referenced only bare); colors `bust-*`, `neon-*`; spacing `1`–`4`, `12`, `20`. `typography.brief` at 21px is a trap for a dev styling the Stage Brief. *Fix:* annotate Setup-only tokens, or rename `brief` to `brief-setup`.
- **low** The Setup journey 02–04 is described in both files (DESIGN.md → Layout, EXPERIENCE.md → Setup page sections). *Fix:* keep content in EXPERIENCE.md and layout in DESIGN.md, and remove the overlap.

## 7. Inheritance discipline — adequate

Checked: all `sources:` paths resolve from the workspace (`../../prds/...` prd.md, addendum.md, .memlog.md; `../../briefs/.../brief.md`). UJ titles are verbatim. Glossary terms are used as the PRD defines them and are not restated. The 3 EXPERIENCE.md token refs resolve to DESIGN.md. All founder decisions were checked:
- No camera mode: ✓
- Stage on its own page: ✓
- Brief ≥ 32 and Inputs ≥ 24 on desktop: ✓
- Still once held: ✓
- Sound off by default: ✓
- Back and sound always visible: ✓
- Dial all open: ✓
- Timed/Untimed/Either: ✓
- three.js scope and fallback: ✓
- Cutout identity: ✓
- Resend signup is optional, never gates, uses an unticked box: ✓
- Desktop first: ✓
- Working copy: ✓

### Findings
- **high** Tilted essential text conflicts with PRD §6 "Essential text is always horizontal". FR-31 defines Inputs as essential content, but DESIGN.md → Typography allows Input text to tilt up to ±7° (stamp -7°, foil 4°, scrap -1.2°, tabs ±1.5°). *Fix:* get a founder ruling. Either counter-rotate the value text to 0° inside tilted pieces, or record an explicit PRD exception for Input pieces.
- **medium** The safe-area floor can break the 9/16 rule. `spacing.safe-area-min: 360px` exceeds 56.25vh whenever the viewport is under 640px tall, which conflicts with the founder's "≤ 9/16 viewport height" (DESIGN.md frontmatter; Layout & Spacing, Challenge Stage). *Fix:* say which rule wins below 640px (for example, the column scrolls at 9/16 width) or drop the floor on short desktop viewports.
- **low** The addendum's "low-power device" 3D fallback trigger is not carried into the spine (EXPERIENCE.md → Motion and 3D). *Fix:* add it to the fallback conditions.
- **low** "No linked reps, hashtags, analytics" is honored by omission only. *Fix:* add these to EXPERIENCE.md → Interaction Primitives, Banned.
- **low** The Stage ground (lilac) is still an Open Question (EXPERIENCE.md → Open Questions 2), and changing it would cascade to every Stage color pair. *Fix:* mark lilac as the committed default and require re-measured pairs if it changes.

## 8. Shape fit — strong

Checked: DESIGN.md body order is canonical: Brand & Style → Colors → Typography → Layout & Spacing → Elevation & Depth → Shapes → Components → Do's and Don'ts. EXPERIENCE.md has all the required sections (Foundation, IA, Voice and Tone, Component Patterns, State Patterns, Interaction Primitives, Accessibility Floor, Responsive & Platform, Inspiration & Anti-patterns, Key Flows). The invented sections, Challenge Stage Filming Contract and Motion and 3D, earn their place: they hold the founder's filming and three.js rules in one citable spot. Open Questions and the Assumptions Index are useful.

### Findings
- **low** DESIGN.md → Layout & Spacing has no 861–1279px tier (only EXPERIENCE.md → Responsive covers it). *Fix:* add one line.
- **low** The DESIGN.md Ink button row lists "Save rep when a sun button is already present", but EXPERIENCE.md makes Save rep the sun button in the Finished state. *Fix:* remove that case or name the view where it applies.

## Mechanical notes

- **Token refs:** 66 in DESIGN.md and 3 in EXPERIENCE.md, all resolving. No missing hex values. Raw values (shadows, the dial's 220px, tilts, motion durations) are acceptable, because the spec has no keys for them.
- **Component name drift:**
  - "Consent checkbox" (DESIGN.md) vs "Checkbox (consent)" (EXPERIENCE.md)
  - "Chrome and cutouts" vs "Chrome, three.js hero"
  - "Info button" vs "Info button + Popover"
  - "Email signup" (EXPERIENCE.md only)
  - Frontmatter keys (`button-sun`, `icon-button-stage`, `piece-slot-empty`, `checkbox-consent`) map to prose names only implicitly. Add a key column or a matching kebab-case name in each prose bullet.
- **Copy consistency:** "Time's up" appears as "time's up." (DESIGN.md display), "Time's up. Finish when you're ready." (Voice) and as a caption (Flow 3 step 5). These are consistent working copy.
- **Lock-conflict copy:** the State Patterns example says "Unlock Medium" and Flow 2's failure path says "Unlock Constraint". Both are fine as examples.
- **Frontmatter:** EXPERIENCE.md has no `description`. Optional.
- **Memlog:** decisions are recorded with no conflicts against the spines. "Three cues + tick" (memlog) and "four cues" (Open Questions 4) are consistent.
- **Severity counts:** critical 0 · high 7 · medium 12 · low 18.
