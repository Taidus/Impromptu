---
title: "PRD: Impromptu"
status: final
created: 2026-10-08
updated: 2026-10-08
inputs:
  - ../../briefs/brief-impromptu-2026-10-08/brief.md
  - ../../briefs/brief-impromptu-2026-10-08/addendum.md
  - Founder's 16-section product spec (conversation, 2026-10-08)
---

# PRD: Impromptu
*Product name confirmed: Impromptu.*

## 0. Document Purpose

This PRD defines v1 of Impromptu for UX design (`bmad-ux`), architecture (`bmad-architecture`), and the epic and story breakdown. It builds on the product brief and its addendum and does not repeat their market context. Domain terms are defined once in §3 and used exactly. Features in §4 hold globally numbered FRs. Inferred items are tagged `[ASSUMPTION]` and indexed in §12. Technology choices (Next.js, three.js, Vercel, Resend) and the proposed configuration values live in `addendum.md`.

## 1. Vision

Impromptu gives creatives a randomized challenge that is worth making and worth filming. Each challenge combines a skill, a topic, a medium, a style, and a constraint into a single brief with a clear deliverable. A theatrical collage-and-Y2K Reveal presents it, built to read clearly on a phone camera. The user makes the work in their own tools, finishes the Rep, reflects briefly, and can try a Variation.

Creators already film "let the wheel decide what I draw" videos with generic spinners. Impromptu replaces random word mashups with real exercises, and a utility widget with a reveal that is part of the show. Progress means practice across Skills and Mediums, never streaks or a quality score.

## 2. Target User

### 2.1 Jobs To Be Done

- **Functional:** give me a challenge I can start right now in my own medium, with a clear end point.
- **Social:** give me a repeatable, good-looking format I can film and post, which viewers understand within seconds.
- **Emotional:** let me play and take risks without being graded, and without guilt when I skip a day or reroll.
- **Growth:** let me see that I'm stretching across skills and mediums over time.

### 2.2 Non-Users (v1)

- People who want to make the artwork inside the site (no canvas, editor, or upload).
- People who want feedback, critique, or scoring on their work.
- Teams, classrooms, or communities that need shared or synced accounts.

### 2.3 Key User Journeys

`[ASSUMPTION]` These were drafted by the PM, not narrated by the founder. Confirm or correct.

- **UJ-1. Dani films a reveal for her next post.**
  - **Persona and context:** Dani is an illustrator with about 8k followers who posts a weekly "random challenge" video.
  - **Entry:** first visit, no account, on her laptop, filmed by a phone on a tripod.
  - **Path:** she lands on "Make something unexpected." She picks the Experiment Level, enables Drawing, leaves the Skill as random, and taps **Get a challenge**, which opens the Challenge Stage with empty slots. She taps **Reveal next** for each Input. The cards cycle, and she reacts as the torn-paper Topic, the sticker Style, and the stamped Constraint land.
  - **Climax:** the finished composition holds still with the brief large and centered. Her viewers can read exactly what she has to draw.
  - **Resolution:** she taps **Start creating**, draws off-camera, comes back, and taps **Finish rep**. She skips reflection and taps **Try another version** for part two.
  - **Edge case:** her vertical phone frame crops the sides of the laptop screen. The Brief and Inputs stay inside the centered safe area.
- **UJ-2. Marcus gets a quick daily rep in.**
  - **Persona and context:** Marcus is a product designer who practices photography privately on his lunch break.
  - **Entry:** a returning visitor whose Practice History is in this browser.
  - **Path:** he taps **Get a challenge** with **Quick reveal** on. The full Challenge appears at once. He Locks the Medium (Photography) and Rerolls the rest once.
  - **Climax:** "Take two photos of coming home. Make one feel comforting and the other lonely. Keep people out of both."
  - **Resolution:** he shoots, taps **Finish rep**, and writes one line under "What would you change?" His Practice Map shows Expression filling in.
  - **Edge case:** he closes the tab mid-Attempt. On his next visit, the Attempt is waiting, and he can resume or discard it without penalty.
- **UJ-3. Priya runs a timed Perform challenge.**
  - **Persona and context:** Priya is a writer and spoken-word performer who has been doing untimed Reps for a month.
  - **Path:** she sets the Difficulty Dial to Perform and chooses **Timed**. The Challenge is a timed Idea generation exercise: "Write three premises for a first date that feels like horror, even though nothing bad happens," with a five-minute Time Limit. The timer does not run during the reveal. She taps **Start creating** and the countdown begins.
  - **Climax:** time runs out. The screen shows "Time's up" with no penalty, and she taps **Finish rep**.
  - **Resolution:** she Retries the exact same Challenge to beat her own approach. Both Reps appear in her Practice History.

## 3. Glossary

- **Skill** — The ability a challenge trains. There are six: Observation, Idea generation, Connection, Perspective, Expression, Revision. Each Challenge has exactly one primary Skill.
- **Topic** — The subject of the work, for example "coming home".
- **Medium** — The form of the response: Writing, Drawing, Photography, or Spoken storytelling. A user enables the Mediums they can realistically use.
- **Style** — The creative treatment, for example surreal, minimalist, or documentary. It describes *how the work feels*.
- **Constraint** — A restriction that shapes decisions, for example "no people" or "three colors". It describes *what you may or may not do*.
- **Input** — Any one of Skill, Topic, Medium, Style, or Constraint as shown in the Reveal.
- **Level** — A stage of exercise design: Explore, Experiment, Develop, Perform. The user sets it with the Difficulty Dial, and all Levels are always selectable.
- **Difficulty Dial** — The setup control that selects the Level. It is the only way Level is chosen.
- **Exercise Template** — A generated, validated, tagged library entry. It defines Skill, Level, eligible Mediums, the deliverable pattern, compatible Topic, Style, and Constraint tags, and an optional Time Limit.
- **Challenge** — A resolved Exercise Template: concrete Inputs plus a Brief, and a Time Limit when timed. A Challenge is immutable once revealed.
- **Brief** — The one- to three-sentence instruction that stands alone and states the deliverable.
- **Time Limit** — A duration attached to a timed Challenge. It starts only on **Start creating**.
- **Lock** — A user-set marker that keeps one Input fixed during a Reroll.
- **Reroll** — Generating a new Challenge that keeps all Locked Inputs.
- **Reveal** — The staged presentation of a Challenge's Inputs and Brief, either sequential or quick.
- **Attempt** — A Challenge the user has started and not yet finished or discarded. There is at most one at a time.
- **Rep** — A finished Attempt saved to Practice History, with an optional Reflection.
- **Reflection** — Optional answers to "What worked?" and "What would you change?".
- **Retry** — A new Attempt of the exact same Challenge.
- **Variation** — A new Attempt derived from a finished Rep. It keeps all Inputs except exactly one, which the generator changes.
- **Practice History** — All Reps stored in the current browser.
- **Practice Map** — A summary of Reps by Skill, Medium, and Level. It never expresses quality.
- **Challenge Stage** — The dedicated page where the Reveal, the held Challenge, and the creating view happen. It is designed for filming by default.

## 4. Features

### 4.1 Challenge Setup

**Description:** The landing screen is the challenge experience itself. It has the headline "Make something unexpected.", a one-line explanation, and the setup controls. There are no account prompts and no long onboarding. Realizes UJ-1, UJ-2, UJ-3.

#### FR-1: Set difficulty with the Difficulty Dial
The user turns the Difficulty Dial to select a Level, from Explore to Perform.
- All four Levels are selectable on first visit.
- All four Levels are reachable by pointer, touch, and keyboard (arrow keys), and the current Level is announced to screen readers.
- Each Level position shows a one-line description of what changes at that Level.
- The app makes no Level suggestions and applies no Rep-count gating.
- At Perform, the user can choose **Timed**, **Untimed**, or **Either** (the default). Untimed advanced practice stays available.

#### FR-2: Enable, choose, or randomize the Medium
The user can enable one or more Mediums. They can then pick one, or let the generator choose among the enabled Mediums.
- The generator never produces a Challenge in a Medium that is not enabled.
- At least one Medium must stay enabled. The control prevents disabling the last one and explains why.
- The default on first visit is all Mediums enabled and the Medium randomized. `[ASSUMPTION]`

#### FR-3: Optional Skill focus
The user can pick a Skill or leave it random.
- An info control shows a short explanation of each Skill. It is not shown during the Reveal unless the user asks for it.

#### FR-4: Setup persists
The setup choices (Level, the Perform timing choice, Mediums, Skill focus, **Quick reveal** preference, sound/mute state) persist across reloads in the same browser.
- No account, sign-in, or email is ever required to generate, reveal, complete, or save a Rep.

### 4.2 Challenge Generator

**Description:** The generator assembles Challenges from the generated library using compatibility tags. It does not shuffle each field independently, and it does not depend on an AI service. Difficulty comes from the creative decisions an Exercise Template demands, not from the Topic. Realizes UJ-1, UJ-2, UJ-3.

#### FR-5: Level-appropriate Templates
The generator selects an Exercise Template that matches the chosen Level, Skill focus (if any), and an enabled Medium.
- **Explore:** one task, one simple Constraint, Style optional, optional guidance line, untimed.
- **Experiment:** multiple interpretations or unexpected combinations, untimed.
- **Develop:** create for a specific effect, then revise deliberately, untimed.
- **Perform:** the full set of Inputs with added demands. Timed and untimed Templates are both eligible, filtered by the user's Timed, Untimed, or Either choice.
- No Template below Perform carries a Time Limit.

#### FR-6: Compatible combinations only
The generator fills Topic, Style, and Constraint only from values the Template marks compatible, and it rejects combinations listed as contradictory.
- Contradiction rules (for example "no people" with a Topic that requires a person) are data in the library, not code branches.
- A library validation step reports any Template that can produce a contradictory or empty combination.

#### FR-7: Standalone Brief
Every Challenge has a Brief that names a concrete deliverable and an implicit completion condition (what to make, how many, what to include or avoid).
- The Brief makes sense without reading the separate Input labels.
- Brief text is authored in the Template with Input slots. It is never free-generated.

#### FR-8: Avoid recent repeats
The generator avoids any Template-plus-Topic combination revealed in the last N Challenges (finished or not), where N is configurable `[ASSUMPTION: 30]`, when an alternative exists.
- When no alternative exists, it may repeat rather than fail.

#### FR-9: Lock and reroll
Before the user taps **Start creating**, they can Lock any Input and Reroll the rest.
- Locked Inputs are identical before and after every Reroll.
- If no compatible Challenge exists with the current Locks, the app says so and names the Lock to release. It never shows a broken Challenge.
- Rerolling is unlimited and carries no penalty.

#### FR-10: Stable Challenge
Once revealed, a Challenge does not change unless the user explicitly Rerolls, and it survives a page reload.
- Going back to setup keeps the held Challenge. Returning to the Challenge Stage shows it again until the user Rerolls or requests a new Challenge with **Get a challenge**. If setup changed meanwhile, the held Challenge stays as it was, and the new setup applies to the next Challenge.

#### FR-11: Retry the exact Challenge
From a finished Rep, the user can start a Retry with identical Inputs, Brief, and Time Limit.

#### FR-12: Make a Variation
From a finished Rep, the user can choose **Try another version**. The app offers "Keep your strongest choice. Change one other thing." The user picks one Input to change, and the generator replaces it with a compatible value. All other Inputs stay the same.

### 4.3 The Reveal

**Description:** The Reveal is the signature interaction. Cards and collage pieces cycle through possible values, then Inputs land one at a time: the Topic on a torn paper strip, the Style as a glossy sticker, the Constraint stamped onto an overlapping card. At the end everything settles into a readable composition. Realizes UJ-1, UJ-2.

#### FR-13: Sequential reveal at the user's pace
The Challenge Stage opens with empty slots in their final positions and one prominent **Reveal next** action. Each Input then appears in turn. The next one arrives only when the user activates **Reveal next**, by button, Space, or Enter.
- Once an Input lands, it stays readable for the rest of the Reveal.
- The Brief appears last, after all Inputs.
- Each revealed Input carries a short visible label (Topic, Style, Constraint, and so on), so Style and Constraint are never confused. The paper, sticker, and stamp treatments reinforce the labels and do not replace them.

#### FR-14: Quick reveal
With **Quick reveal** on, the full Challenge appears in one short transition (≤ 1 s).

#### FR-15: Hold the final composition
After the last step, all Inputs and the Brief stay on screen with decorative motion stopped until the user taps **Start creating** or **Reroll**. Nothing advances automatically.

#### FR-16: Optional sound and an obvious sound/mute control
Reveal sounds are optional and **off by default**. A sound/mute control is visible on the Challenge Stage at all times, and its state persists.
- No information is conveyed only by sound.

#### FR-17: Reduced motion
When the user's system requests reduced motion, the app replaces cycling and motion effects with simple fades or instant states.
- Every Input and the Brief remains equally understandable with motion off.

#### FR-18: Timers never start during the Reveal
No Time Limit starts during any Reveal step, including a **Quick reveal**.

### 4.4 Creating and Timed Challenges

**Description:** The user creates outside the site. The site keeps the Brief visible and, for timed Challenges, shows a countdown. Realizes UJ-1, UJ-2, UJ-3.

#### FR-19: Start creating
**Start creating** turns the Challenge into the active Attempt and shows a calm "creating" view with the Brief visible. It offers **Finish rep** and **Discard**.

#### FR-20: Countdown for timed Challenges
For a Challenge with a Time Limit, the countdown starts at the moment the user taps **Start creating** and is clearly visible.
- The user can pause and resume. `[ASSUMPTION]`
- At zero the app shows "Time's up" with no failure state, and the user can still tap **Finish rep**. The time used is recorded. `[ASSUMPTION]`
- The countdown is accurate after the tab is backgrounded, and it survives a reload. It is computed from a stored start time and elapsed wall-clock time, minus paused time.

#### FR-21: Incomplete Attempts
An active Attempt survives a reload or tab close. On return, the app offers **Resume** or **Discard**. `[ASSUMPTION]`
- Discarding saves nothing to Practice History and carries no penalty or message of failure.

### 4.5 Completion and Reflection

**Description:** Finishing and reflecting close out an Attempt. Realizes UJ-1, UJ-2.

#### FR-22: Finish a Rep without uploading
**Finish rep** completes the Attempt with no upload or proof required.
- A short completion moment rewards finishing, for example a "rep done" stamp landing on the Challenge. It acknowledges effort and never judges quality. It respects reduced motion.

#### FR-23: Optional Reflection
After **Finish rep**, the app offers "What worked?" and "What would you change?" as optional short text fields `[ASSUMPTION: 280 characters each]`, plus **Save rep**.
- Saving with both fields empty is valid.
- Saving a Reflection gets a small acknowledgement of its own, so reflecting is rewarded, not just finishing.

#### FR-24: Next step
After saving, the app offers **Try another version** (Variation), **Retry**, and **Get a challenge** (new).

### 4.6 Practice History and Progress

#### FR-25: Practice History
The user can view their Reps, newest first. Each shows the Brief, Skill, Medium, Level, date, Reflection, and whether it was timed (with time used). Retries and Variations are marked as such.

#### FR-26: Practice Map
The user can see Rep counts by Skill, Medium, and Level. Copy describes this as practice, never as quality.
- The UI uses no streaks, no "you missed a day" messages, and no penalties of any kind.

#### FR-27: Browser storage, with an explanation
Practice History, setup, and the active Attempt persist in the current browser and survive a refresh.
- The Practice History screen, and the confirmation after the first saved Rep, state plainly: "Your progress is saved in this browser only."
- Stored data is versioned so a future schema change does not wipe it.

#### FR-28: Export and clear
The user can export Practice History as a JSON file `[ASSUMPTION: plus a readable text/CSV option is a stretch]`, and can clear all data after confirming.

#### FR-29: Empty states
With no Reps, the Practice History screen shows one line and a **Get a challenge** action, not an empty table. If storage is unavailable (private mode or blocked), the app still generates Challenges and explains that history will not be kept.

### 4.7 The Challenge Stage

**Description:** The Reveal, the held Challenge, and the creating view all live on their own dedicated page, the Challenge Stage. It is designed to be filmed by default, with no separate mode to switch on. Navigation, setup controls, history, and footer content stay off this page. It holds only the Challenge composition and the few controls needed to act on it. Realizes UJ-1.

#### FR-30: Own page
The Challenge Stage is a separate page from setup and history, with its own address. **Get a challenge** takes the user there, and a clearly visible control returns them to setup. The sound/mute control is always on screen. Esc returns to setup when no Attempt is running.

#### FR-31: Filming-safe composition
All essential content sits inside a centered safe area that stays intact when the screen is filmed in landscape or cropped to a 9:16 portrait. On desktop, the safe area is a centered column no wider than 9/16 of the viewport height (about 600 px at 1080 px tall) `[ASSUMPTION]`. Essential content means the Inputs, the Brief, the Time Limit or countdown, and the primary action.
- Inputs and Brief use large type sized for filming: on desktop the Brief is at least 32 px and Input values at least 24 px `[ASSUMPTION]`.
- A small Impromptu brand mark sits inside the safe area.
- Decoration stays outside the safe area and never covers text or controls.

#### FR-32: Clean controls
The Challenge Stage shows only the controls relevant to the current step: **Reveal next**, **Reroll** and Locks, **Start creating**, **Finish rep**, **Discard**, the sound/mute control, a collapsed Skill info control (it opens only on request), and the back control. Controls are visually quiet next to the Challenge.

#### FR-33: Still once held
When the Reveal completes, all ambient and decorative motion on the Challenge Stage stops: tickers, chrome, depth effects, and 3D. The page stays still while the Challenge is held and while the user is creating.

#### FR-34: Legible at reduced size
When a 1920×1080 screen recording is downscaled to 960×540, or the screen is filmed on a phone and viewed at feed size, a viewer can read the Brief and identify the deliverable. This is verified by test (SM-2).

### 4.8 Email Updates

**Description:** Email signup is the only data the site collects. Realizes the brief's single "Interest" signal (SM-5).

#### FR-35: Optional signup
The user can submit an email address to receive updates. There is a single list. The offer appears after a saved Rep and in the footer, and never blocks or interrupts a Reveal or an Attempt.
- The form states what the user will receive, links to a privacy note, and records consent with an explicit opt-in (GDPR-style, for all visitors) `[ASSUMPTION]`.
- Submission goes through a server-side endpoint. No email-service key ever reaches the browser.

#### FR-36: Signup feedback and abuse resistance
The form shows success and error states, rejects malformed addresses, and is rate-limited per client.

#### FR-37: Unsubscribe
Every email sent includes a working unsubscribe link.

## 5. Challenge Library Requirements

The library *is* the product. These requirements apply to content, not code.

- **CL-1:** Each Exercise Template has one Skill, one Level, at least one eligible Medium, a Brief pattern that names its deliverable, compatibility tags, and an optional Time Limit (Perform only).
- **CL-2:** Launch coverage: every Skill × Level pair has at least one Template for every Medium. Volume is large enough that a user sees no repeated Brief in their first 30 Challenges. Because the library is generated, volume is limited by validation quality, not by authoring effort.
- **CL-3:** A library validation script fails the build on missing fields, uncovered Skill × Level × Medium cells, and contradictory combinations it can reach.
- **CL-4:** Style and Constraint remain distinguishable: Styles describe a treatment, Constraints describe a rule. The library audit flags any entry that blurs the two.
- **CL-5:** The three example Challenges from the founder's spec (listed in `addendum.md`) ship in the library verbatim. They are the quality bar that generated Templates are measured against.
- **CL-6:** No one writes the library by hand. It is generated in batches during development (`[ASSUMPTION]` AI-assisted, offline) into static data in the repo. CL-3 validation is the gate: a batch that fails does not ship. At runtime the site only composes Challenges from that data and never calls an AI service.

## 6. Aesthetic, Tone, and Copy

- **Visual style reference:** the **Cutout design-system mockup** (https://claude.ai/artifact/SnnfBhnRo7Y21JMoWy5qFE) sets the *look*: grounds, palette, type, textures, chrome, collage artwork, and motion character. It is a design exploration, not the site. Its name, labels, page structure, and reveal mechanics are not requirements. This PRD defines behavior.
- **Visual direction:** a page built as one continuous collage journey through four grounds (night → lilac → paper → sun), returning to night at the footer. Grape (purple) and the sun gradient (yellow-orange) are the signatures. Liquid chrome, tickers, and an orbit thread link the grounds. Tactile editorial collage (flower-bloom portraits, cutout hands and eyes, torn paper) is combined with Y2K brightness.
- **Typography:** three families, each with one job. Bodoni Moda is the editorial and display voice, Unbounded the Y2K meta and button voice, and Instrument Sans the reading voice for Briefs and body text. This supersedes the spec's "one display plus one sans".
- **Hard rules:**
  - Decoration never covers instructions or controls.
  - Essential text is always horizontal.
  - No fine texture sits behind essential text.
- **Visual acceptance check (design review before launch):** the build passes when a reviewer confirms all of these:
  - Reveal pieces read as material collage (torn paper, sticker or foil, ink stamp).
  - Grape and the sun gradient appear as the signatures.
  - Display type (Bodoni Moda) is used on reveal words.
  - At least two Y2K accents (chrome, stars, orbit line) appear on setup.
  - All motion is settled once a Challenge is held.
  - No decoration overlaps essential text at 1280, 1440, and 1920 px, or at 390 px on phones.
- **Assets:** all artwork in the design system is original (generated with Higgsfield or drawn). The reference posters set direction only. The licensing risk is resolved.
- **Voice:** direct, one instruction per step, no motivational fluff, and no claims of improvement.
- **Working copy (final copy is undecided; see §11):** "Make something unexpected." · "Get a creative challenge. Make your version. Build your skills." · Get a challenge · Reveal next · Start creating · Finish rep · Try another version.

## 7. Cross-Cutting NFRs

- **NFR-1 Accessibility:** WCAG 2.1 AA.
  - Every action is reachable and operable by keyboard, with visible focus.
  - Text contrast is ≥ 4.5:1 (≥ 3:1 for large display text), verified in the actual color combinations, including text placed on purple or orange.
  - Reveal steps are announced to screen readers.
- **NFR-2 Responsive (desktop first):** desktop (≥ 1280 px) is the primary design and test target, with phones second. All features work from 320 px wide up. On phones the layout simplifies, but long Briefs still wrap without clipping or overlapping decoration at every breakpoint.
- **NFR-3 Performance:** setup is usable within 2 s on a mid-range laptop over typical broadband, and within 3 s on a mid-range phone over 4G `[ASSUMPTION]`. The 3D accents load progressively and never block setup or the Reveal. If 3D is unavailable or reduced motion is on, the app falls back to a 2D version.
- **NFR-4 Reliability:** if the connection drops after the first load, an in-progress Reveal or Attempt and the saved History stay usable, and email signup shows a clear offline error. Full offline support, such as starting fresh with no connection, is a stretch goal `[ASSUMPTION]`.
- **NFR-5 Privacy:** no analytics or tracking. The only personal data is an opted-in email address, held by the email provider. A privacy note states this.
- **NFR-6 Configurability:** the recent-repeat window, the Medium list, and Time Limits live in configuration or library data, not UI code.
- **NFR-7 3D placement:** three.js is used only on the landing and setup page (a hero chrome piece with cursor-driven depth, in the mockup's Y2K style) and during the Reveal's shuffle moment, behind the safe area. It freezes when the Challenge is held (FR-33). It is never used for text, and it falls back to static images when reduced motion is on or WebGL is unavailable.

## 8. Non-Goals (Explicit)

- Impromptu is not a creation tool: no canvas, editor, recorder, or upload.
- It does not score, rank, or judge artistic quality, and it never implies that completion counts measure skill.
- It is not a social network: no feeds, profiles, follows, comments, or leaderboards.
- It does not use streaks, guilt, or loss-aversion mechanics.
- It never calls an AI service at runtime. Challenges come from the generated, validated library.

## 9. MVP Scope

### 9.1 In Scope
FR-1 to FR-37; Challenge Library requirements CL-1 to CL-6; NFR-1 to NFR-7; the Aesthetic rules and visual acceptance check in §6. The Cutout mockup is the style reference, not a deliverable.

### 9.2 Out of Scope for MVP
- Accounts and cross-device sync (later, once usage justifies it).
- Product analytics (deliberate privacy trade).
- Social features, leaderboards, and scoring (non-goals).
- Subscriptions or payments.
- Media upload and hosting.
- Live AI generation at runtime (for example a "surprise me" prompt). The library is generated ahead of time instead (CL-6).
- Viewer-suggested topics and themed challenge packs (the brief's vision; v2 candidates). `[NOTE FOR PM]` Viewer-suggested topics map directly to the existing TikTok engagement loop and are worth revisiting first.

## 10. Success Metrics

With no analytics, the metrics come from moderated tests, library audits, and external signals.

**Primary**
- **SM-1 First challenge without explanation:** in moderated tests, ≥ 4 of 5 first-time visitors reveal a Challenge within 60 s with no guidance. Validates FR-1–FR-4 and FR-13.
- **SM-2 Camera legibility:** viewers watching a phone recording of the Challenge Stage at feed size can state the deliverable within 3 s in ≥ 4 of 5 trials. Validates FR-31 and FR-34.
- **SM-3 Deliverable clarity:** a library audit finds that 100% of reachable Challenges have a Brief with a concrete deliverable and no contradictions. Validates FR-6, FR-7, and CL-3.

**Secondary**
- **SM-4 Return:** ≥ 3 of 5 testers return for a second session within a week and save at least one Reflection. Validates FR-23 and FR-25.
- **SM-5 Interest:** email signups recorded by the email provider in the first 60 days. Validates FR-35.
- **SM-6 Worth filming:** in moderated sessions with 5 creators who post process videos, ≥ 3 film a Reveal and say they would post it unedited. Validates FR-13–FR-15 and FR-30–FR-33. `[ASSUMPTION]`

**Counter-metrics (do not optimize)**
- **SM-C1 Signup rate:** do not raise it with pop-ups, gating, or interrupting a Reveal. Counterbalances SM-5.
- **SM-C2 Reveal duration:** do not lengthen the Reveal for spectacle at the cost of quick practice. Quick reveal must stay ≤ 1 s. Counterbalances SM-6 (spectacle at the expense of SM-1 speed).
- **SM-C3 Rep count:** do not add streaks or nudges to inflate it. Reps are not quality. Counterbalances SM-4.

## 11. Open Questions

1. **Generation pipeline (for architecture).** What are the prompt or rubric and the batch size, and how is a failed batch regenerated?
2. **Final UI copy.** Final copy is undecided. The spec's labels (Get a challenge, Reveal next, Quick reveal, Start creating, Finish rep, Try another version) are working copy until the founder decides. The design-system mockup's labels are not binding.

## 12. Assumptions Index

- §2.3: all three journeys (UJ-1 to UJ-3) were drafted by the PM.
- FR-2: default is all Mediums enabled and the Medium randomized.
- FR-8: recent-repeat window N = 30 revealed Challenges.
- FR-20: pause is allowed; Time's up is not a failure; time used is recorded.
- FR-21: an active Attempt is restored after a reload; Discard saves nothing.
- FR-23: Reflection fields are capped at 280 characters each.
- FR-28: CSV/text export is a stretch beyond JSON.
- FR-31: safe area width of 9/16 of the viewport height; Brief at least 32 px and Inputs at least 24 px on desktop.
- CL-6: the library is AI-assisted and generated offline at development time, never at runtime.
- NFR-3: 2 s on laptop broadband, 3 s on phone 4G.
- NFR-4: offline support is a stretch; graceful degradation is required.
- SM-6: creator filming test (3 of 5).
- Addendum: GDPR-style opt-in consent applied for all visitors.
