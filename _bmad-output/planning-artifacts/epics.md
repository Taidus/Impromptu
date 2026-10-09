---
stepsCompleted: [1, 2, 3, 4]
inputDocuments:
  - _bmad-output/planning-artifacts/prds/prd-impromptu-2026-10-08/prd.md
  - _bmad-output/planning-artifacts/prds/prd-impromptu-2026-10-08/addendum.md
  - _bmad-output/planning-artifacts/architecture/architecture-impromptu-2026-10-08/ARCHITECTURE-SPINE.md
  - _bmad-output/planning-artifacts/ux-designs/ux-impromptu-2026-10-08/DESIGN.md
  - _bmad-output/planning-artifacts/ux-designs/ux-impromptu-2026-10-08/EXPERIENCE.md
  - _bmad-output/planning-artifacts/briefs/brief-impromptu-2026-10-08/brief.md
---

# Impromptu - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for Impromptu, decomposing the requirements from the PRD, UX Design if it exists, and Architecture requirements into implementable stories.

**Run mode.** This breakdown was produced autonomously by John (PM) under the founder's pre-authorization: every menu was answered with Continue, and every judgment call is tagged `[ASSUMPTION]`. Cross-document conflicts and the resolution applied are listed in *Cross-Document Resolutions* below. Those resolutions bind the stories in this file.

**Reference names used in acceptance criteria.** `AD-n` = ARCHITECTURE-SPINE.md decision. `DESIGN` = DESIGN.md (section or token, for example `DESIGN → Components → Paper scrap` or `{typography.brief-stage}`). `EXPERIENCE` = EXPERIENCE.md (section, for example `EXPERIENCE → State Patterns → Challenge Stage → Held`). `FR/CL/NFR` = PRD.

## Requirements Inventory

### Functional Requirements

**4.1 Challenge Setup**
- FR-1: The Difficulty Dial selects a Level (Explore, Experiment, Develop, Perform). All four Levels are selectable on first visit and reachable by pointer, touch, and keyboard (arrows); the current Level is announced; each position shows a one-line description; no Level suggestions or Rep-count gating. At Perform the user chooses Timed, Untimed, or Either (default).
- FR-2: The user enables one or more Mediums and picks one or lets the generator choose among enabled Mediums. The generator never uses a disabled Medium. The last enabled Medium cannot be disabled, with an explanation. Default: all Mediums on, Medium random.
- FR-3: Optional Skill focus (pick or random), with an info control explaining each Skill, never shown during the Reveal unless asked.
- FR-4: Setup choices (Level, Perform timing, Mediums, Skill focus, Quick reveal, sound) persist across reloads in the browser. No account, sign-in, or email is ever required.

**4.2 Challenge Generator**
- FR-5: The generator selects an Exercise Template matching Level, Skill focus, and an enabled Medium, with Level semantics (Explore: one task, one simple Constraint, Style optional, optional guidance, untimed; Experiment: multiple interpretations, untimed; Develop: create for an effect then revise, untimed; Perform: full Inputs plus demands, timed and untimed filtered by the timing choice). No Template below Perform has a Time Limit.
- FR-6: Topic, Style, and Constraint are filled only from compatible values; contradictory combinations are rejected. Contradiction rules are library data, not code; a validation step reports Templates that can produce contradictory or empty combinations.
- FR-7: Every Challenge has a standalone Brief naming a concrete deliverable and completion condition, authored in the Template with slots, never free-generated.
- FR-8: Avoid any Template+Topic combination revealed in the last N (30) Challenges when an alternative exists; repeat rather than fail otherwise.
- FR-9: Before Start creating, the user can Lock any Input and Reroll the rest. Locked Inputs are identical after every Reroll. If no compatible Challenge exists, the app says so and names the Lock to release, never showing a broken Challenge. Rerolls are unlimited and penalty-free.
- FR-10: A revealed Challenge is stable: it changes only on explicit Reroll or Get a challenge, survives reload, and survives returning to setup; setup changes apply only to the next Challenge.
- FR-11: From a finished Rep, Retry starts a new Attempt with identical Inputs, Brief, and Time Limit.
- FR-12: From a finished Rep, Try another version offers "Keep your strongest choice. Change one other thing."; the user picks one Input to change and the generator replaces it with a compatible value, all else unchanged.

**4.3 The Reveal**
- FR-13: The Challenge Stage opens with empty slots in final positions and one Reveal next action; each Input appears only on Reveal next (button, Space, Enter); landed Inputs stay readable; the Brief appears last; every Input carries a visible label.
- FR-14: Quick reveal shows the full Challenge in one transition ≤ 1 s.
- FR-15: After the last step, Inputs and Brief hold with decorative motion stopped until Start creating or Reroll; nothing auto-advances.
- FR-16: Reveal sounds are optional and off by default; a sound/mute control is always visible on the Stage and persists; no information only by sound.
- FR-17: Reduced motion replaces cycling/motion with fades or instant states; everything stays equally understandable.
- FR-18: No Time Limit starts during any Reveal step, including Quick reveal.

**4.4 Creating and Timed Challenges**
- FR-19: Start creating turns the Challenge into the active Attempt and shows a calm creating view with the Brief visible, offering Finish rep and Discard.
- FR-20: For timed Challenges the countdown starts on Start creating, is clearly visible, can pause/resume, shows "Time's up" at zero with no failure state (Finish rep still available, time used recorded), and is accurate after backgrounding and reload (wall-clock minus paused time).
- FR-21: An active Attempt survives reload or tab close; on return the app offers Resume or Discard. Discard saves nothing and carries no penalty or failure message.

**4.5 Completion and Reflection**
- FR-22: Finish rep completes the Attempt without upload or proof, with a short effort-acknowledging completion moment (e.g. "rep done" stamp) that respects reduced motion.
- FR-23: After Finish rep, optional "What worked?" and "What would you change?" fields (280 chars each) plus Save rep; saving with both empty is valid; saving a Reflection gets its own small acknowledgement.
- FR-24: After saving, the app offers Try another version, Retry, and Get a challenge.

**4.6 Practice History and Progress**
- FR-25: Practice History lists Reps newest first with Brief, Skill, Medium, Level, date, Reflection, timed flag with time used; Retries and Variations are marked.
- FR-26: Practice Map shows Rep counts by Skill, Medium, and Level, described as practice not quality; no streaks, missed-day messages, or penalties anywhere.
- FR-27: Practice History, setup, and the active Attempt persist in the browser; the Practice screen and the confirmation after the first saved Rep say "Your progress is saved in this browser only."; stored data is versioned so schema changes do not wipe it.
- FR-28: Export Practice History as JSON (CSV/text is a stretch) and clear all data after confirmation.
- FR-29: Empty Practice shows one line plus Get a challenge; if storage is unavailable, Challenges still work and the app explains history will not be kept.

**4.7 The Challenge Stage**
- FR-30: The Stage is its own page with its own address; Get a challenge goes there; a visible control returns to setup; the sound control is always on screen; Esc returns to setup when no Attempt is running.
- FR-31: All essential content (Inputs, Brief, Time Limit/countdown, primary action, brand mark) sits in a centered safe area ≤ 9/16 of viewport height wide that survives a 9:16 crop; desktop Brief ≥ 32 px, Input values ≥ 24 px; decoration outside the safe area, never covering text or controls.
- FR-32: The Stage shows only the controls relevant to the current step (Reveal next, Reroll and Locks, Start creating, Finish rep, Discard, sound, collapsed Skill info, back), visually quiet next to the Challenge.
- FR-33: When the Reveal completes, all ambient and decorative motion on the Stage stops (tickers, chrome, depth, 3D) and stays stopped while held and while creating.
- FR-34: A 1920×1080 recording downscaled to 960×540 (or a phone recording at feed size) keeps the Brief readable and the deliverable identifiable; verified by test (SM-2).

**4.8 Email Updates**
- FR-35: Optional email signup to a single list, offered after a saved Rep and in the footer, never blocking a Reveal or Attempt; states what the user receives, links to a privacy note, records explicit opt-in consent; submits through a server-side endpoint with no key in the browser.
- FR-36: The signup form shows success and error states, rejects malformed addresses, and is rate-limited per client.
- FR-37: Every email sent includes a working unsubscribe link.

**5. Challenge Library Requirements**
- CL-1: Each Exercise Template has one Skill, one Level, ≥ 1 eligible Medium, a Brief pattern naming its deliverable, compatibility tags, and an optional Time Limit (Perform only).
- CL-2: Launch coverage: every Skill × Level pair has ≥ 1 Template for every Medium; volume large enough that no Brief repeats in a user's first 30 Challenges.
- CL-3: A library validation script fails the build on missing fields, uncovered Skill × Level × Medium cells, and reachable contradictory combinations.
- CL-4: Styles describe a treatment and Constraints describe a rule; the audit flags entries that blur the two.
- CL-5: The three founder example Challenges (addendum) ship verbatim and are the quality bar.
- CL-6: The library is generated in batches offline during development (AI-assisted) into static repo data; CL-3 validation gates every batch; the runtime never calls an AI service.

### NonFunctional Requirements

- NFR-1 Accessibility: WCAG 2.1 AA. Every action keyboard-operable with visible focus; text contrast ≥ 4.5:1 (≥ 3:1 large display) verified in actual color pairs including on purple and orange; Reveal steps announced to screen readers.
- NFR-2 Responsive (desktop first): desktop ≥ 1280 px is the primary design and test target, phones second; all features work from 320 px; long Briefs wrap without clipping or overlapping decoration at every breakpoint.
- NFR-3 Performance: setup usable within 2 s on a mid-range laptop over broadband and 3 s on a mid-range phone over 4G; 3D loads progressively and never blocks setup or the Reveal; 2D fallback when 3D is unavailable or reduced motion is on.
- NFR-4 Reliability: if the connection drops after first load, an in-progress Reveal or Attempt and saved History stay usable, and signup shows a clear offline error. Full offline is a stretch.
- NFR-5 Privacy: no analytics or tracking; the only personal data is an opted-in email held by the email provider; a privacy note says so.
- NFR-6 Configurability: the recent-repeat window, the Medium list, and Time Limits live in configuration or library data, not UI code.
- NFR-7 3D placement: three.js only on the landing/setup hero and during the Reveal shuffle, behind the safe area; freezes when held; never used for text; falls back to static images under reduced motion or no WebGL.

### Additional Requirements

From ARCHITECTURE-SPINE.md (binding on implementation):

- **AR-1 Starter template (Epic 1 Story 1):** scaffold with `npx create-next-app@16.4.0 impromptu --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --no-cache-components --no-react-compiler` (AD-1). Cache Components stays off. Pin the Stack table versions (Next 16.4.0, React 19.3.0, TS 5.9.3, Tailwind 4.3.3, three 0.186.1, zod 4.6.5, resend 6.32.1, Vitest 5.0.3, Playwright 1.64.0, tsx 4.23.15, Node `engines` 24.x).
- **AR-2 Static-first routes:** fixed routes `/`, `/stage`, `/practice`, `/privacy`, `POST /api/subscribe`; every page statically prerendered; no Server Actions, no `proxy.ts`, no database, no runtime AI; Challenge state never in the URL (AD-1).
- **AR-3 Layering and import boundaries:** `src/domain` (pure) / `ports.ts` / `src/adapters` / `src/store` / `src/shared` / `src/app` + `src/components` / `src/decor` / `src/server` / `scripts/library` + `content/library`; ESLint `no-restricted-imports` enforces the dependency diagram; domain uses no `window`, `localStorage`, `Date.now()`, `Math.random()`, `crypto` (AD-2).
- **AR-4 Ports:** `Library` (sync), `Repository`, `Clock.now()`, `Random.next()/uuid()`; production adapters use `crypto`; tests use seeded Random and fake Clock (AD-2, Testing convention).
- **AR-5 Single `compose()`** for new, Reroll, Variation, "Change it again" with `locks` and `mustDiffer`; result union `{ok:true, challenge} | {ok:false, reason:'no_compatible', blockingLock}`; Retry copies the snapshot and bypasses compose; only the store command layer calls it (AD-3).
- **AR-6 Single `isCompatible()`** in `src/domain/library/compat.ts` shared by runtime and validator; tags/requires/excludes semantics; Medium tags count as a part; controlled vocabulary `content/library/tags.json` (AD-4).
- **AR-7 Immutable Challenge snapshot and Rep/Export zod schemas** in `src/domain/session/schema.ts` (AD-5).
- **AR-8 Namespaced, never-reused library ids; retire via `manifest.retire[]`; batches apply in folder-name order** (AD-6).
- **AR-9 Pure session reducer + one store** with `setup`, `session`, `history` slices; the named commands and events; transition rules; one Stage-level key handler (AD-7).
- **AR-10 Wall-clock timer math** (`startedAt`, `pausedAt`, `pausedTotalMs`); remaining/timeUp derived, never stored (AD-8).
- **AR-11 Repository:** only `src/adapters/storage` touches `localStorage`; keys `impromptu:setup|session|history`; envelope `{v, rev, data}`; rev check against cross-tab races; forward-only migrations; read-only for future versions; memory fallback on probe failure; `storage` event subscription (AD-9).
- **AR-12 No stored state in first render:** store `status: 'loading'|'ready'`, neutral placeholders until ready (AD-10).
- **AR-13 Recent ring** of 30 `templateId+topicId` keys pushed on `challenge_committed` (not on Retry) (AD-11).
- **AR-14 Decor isolation:** one `<Decor scene mode>` Client Component; static fallback first; gate (WebGL2, no reduced motion, not low-power); `next/dynamic` `ssr:false`; plain three.js; `frozen` stops the loop; stops on `document.hidden`; disposes on unmount; `aria-hidden`, `pointer-events:none`, outside the safe area (AD-12).
- **AR-15 No third-party runtime requests:** same-origin only; fonts via `next/font/google`; no Vercel Analytics / Speed Insights / error monitoring; server logs never contain an email (AD-13).
- **AR-16 Signup contract:** Node Route Handler; shared zod schema `src/shared/subscribe.ts`; honeypot; consent required; Resend `contacts.create` with Segment and `consent_at`/`consent_text_version`; existing-contact path; response codes `invalid_email|consent_required|rate_limited|unavailable` (+ client `offline`); Vercel WAF rule 5/60 s per IP; unsubscribe via Resend Broadcast `{{{RESEND_UNSUBSCRIBE_URL}}}`; no app unsubscribe route (AD-14).
- **AR-17 Library zod schema** `src/domain/library/schema.ts` (Skill, Medium, Template, Topic, Style, Constraint, Tag, Anchor, BatchManifest); fills carry `revealText` and `briefText`; `render.ts` is the single Brief renderer; `guidance` Explore-only and outside the Brief; Skills and Mediums are data (AD-15).
- **AR-18 Library hard gate** `scripts/library/build.ts` on `predev`/`prebuild`; emits gitignored `src/generated/library.json` with content-hash `libraryVersion`; checks integrity, rendering (1–3 sentences, length cap), Time Limits, coverage (≥ 2 per cell), reachability (≥ 3 combos per Template, no violations), repeat headroom (≥ 60 per Level × Medium), CL-4 lint, anchors (AD-16).
- **AR-19 Batch lifecycle** (resolves PRD OQ-1): batch folder naming, manifest fields, `PROMPT.md` + `RUBRIC.md` versioned, sizes (Template batch = 1 Skill × 1 Level × 4 Mediums = 12 Templates, ≥ 3 per Medium; fill batch = 1 kind × 40), fills before Templates, hard gate then soft gate (AI judge + founder skim of 20), ≤ 3 regenerations then escalate, typo-only hand edits logged, one PR per batch, accepted batches immutable, patch batches retire (AD-17).
- **AR-20 Reveal progress is domain state** (`revealed` set, `config.reveal.order`), Quick reveal lands all kinds on commit, Reroll/Variation un-land only changed kinds, Retry commits fully landed, one polite live region (AD-18).
- **AR-21 One config module** `src/config/app.ts` for `generator.recentWindow`, `reveal.quickMaxMs`, `reveal.order`, `setup.defaults`, `reflection.maxChars`, `storage.schemaVersions`, `signup.consentTextVersion` (AD-19).
- **AR-22 Environments and secrets:** Production from `main`, Preview for other branches; `RESEND_API_KEY` and `RESEND_SEGMENT_ID` per environment; Preview uses a test Segment; no `NEXT_PUBLIC_` secrets; launch checklist (custom domain, Resend sending domain SPF/DKIM, Segments and contact properties, WAF rule incl. Preview, Deployment Protection on Preview); Instant Rollback; erasure via Resend (AD-20).
- **AR-23 Conventions:** naming per Glossary; ids/dates/duration suffixes; `{ok,reason}` results; one copy map `src/components/copy.ts`; no-penalty guardrail; signup placement; Tailwind v4 tokens in `src/styles/tokens.css` with no raw hex/px font sizes in components; Accessibility convention (native controls, one ARIA slider, `usePrefersReducedMotion`); Vitest colocated tests; Playwright `e2e/` incl. keyboard path, reduced-motion, FR-34 legibility; browser matrix; CI GitHub Action (lint, typecheck, `library:validate`, vitest, playwright).
- **AR-24 Library launch volume targets** (Deferred, tunable): about 288 Templates, 160 Topics, 32 Styles, 64 Constraints.

### UX Design Requirements

From DESIGN.md (visual) and EXPERIENCE.md (behavior):

- UX-DR1: Design tokens in `src/styles/tokens.css` (`@theme`): every DESIGN color, typography role (including the Stage ramp and phone ramp), radius, spacing (incl. `safe-area-width: min(56.25vh, 640px)`, `target-min: 52px`, `stage-gap`, `stage-gap-compact`, `focus-offset`), and the five shadows. No dark mode.
- UX-DR2: Self-hosted fonts Bodoni Moda (400–900 + italic), Unbounded (200–900), Instrument Sans (400–700) with the DESIGN fallbacks; Stage renders after Bodoni and Instrument load (100 ms max wait, then swap).
- UX-DR3: Focus ring 2px at 3px offset, color per ground (`focus`, `focus-on-sun`, `focus-on-lilac-deep`); controls never on night-glow.
- UX-DR4: Grain overlay at 0.1 opacity, suppressed inside the Stage safe area and behind essential text.
- UX-DR5: Action components: Sun button (one per view, relabels per step, keeps focus, never disabled during a Reveal step), Ink button, Line button, Stage icon button (back, sound with "SOUND OFF" caption and announced state).
- UX-DR6: Difficulty Dial: 160px sun disc, one ARIA slider, 4 stops, arrows/Home/End/click/drag, value text "Level. One-liner.", active label underline + grape star; phone horizontal track; Perform timing segmented control appears at Perform.
- UX-DR7: Chip toggle (`aria-pressed`, tick glyph), last-Medium block with inline "Keep at least one medium on."; "This time" falls back to Random when its Medium is disabled.
- UX-DR8: Select fields ("This time", Skill) as styled native `<select>`; Segmented control (radio group) for Perform timing; Switch (`role="switch"`, ON/OFF word) for Quick reveal.
- UX-DR9: Info button + Popover for Skill info (opens on request, Esc/outside/second activation closes, returns focus); on the Stage only beside the Skill tab.
- UX-DR10: Motion toggle in Setup and Practice headers ("MOTION ON/OFF", `aria-pressed`), stops all ambient motion, persists, default on unless reduced motion.
- UX-DR11: Reveal pieces: Ticket tabs (Skill, Medium), Paper scrap (Topic, contrast-flattened texture, -1.2°), Foil slip (Style, 4°, shimmer only while revealing), Ink stamp (Constraint, -7°, always on the scrap's bottom band), each with a visible piece label; label and value counter-rotated to horizontal.
- UX-DR12: Empty slots (dashed outline, label, same tilt, not focusable, SR "Topic, not revealed yet.").
- UX-DR13: Brief block (`{typography.brief-stage}` plum, 34ch, selectable, no texture/tilt) and the Explore guidance line in `{typography.lede}` plum-muted under it.
- UX-DR14: Lock toggle (52px disc on the piece's left edge, "Lock Topic" name, `aria-pressed`, LOCKED caption), shown only held before Start creating and hidden for Retry/Variation.
- UX-DR15: Countdown (`role="timer"`, `aria-live="off"`, tabular mm:ss, "TIME LIMIT 5 MIN" caption, "PAUSED", "time's up." + "Finish when you're ready.", separate polite region at minute marks, 1:00, pause/resume, zero; no red, no flashing).
- UX-DR16: Rep-done stamp (grape-deep, 6°, left half of scrap band, "Rep done." text carries meaning).
- UX-DR17: Variation option radio group (Topic, Style, Constraint, Medium changeable; Skill not), dashed/solid outline states, "Change it", "Pick one thing to change.", "Change it again", "Nothing else fits here. Pick a different one."
- UX-DR18: Reflection panel (cream, two fields, 280 cap with counter from 240, typing past the cap blocked; focus to "Rep done." heading) and Next steps layout (sun Try another version full width; Retry and Get a challenge line buttons).
- UX-DR19: Stage layout: lilac ground; safe-area column; order mark+meta → tabs → scrap with foil and stamp → Brief → countdown → actions; back and sound in viewport corners outside the safe area; piece keep-outs; lilac-deep edge fade ≥ 120px from corner controls.
- UX-DR20: Stage fit rule: Held/Creating fit 1280×800 for a 160-character Brief; compression steps 1–5 in order; type never below minimums.
- UX-DR21: Stage meta: Level and mode meta, RETRY / VARIATION tags; Stage mark "impromptu" + grape star, not a link, decorative to SR; visually hidden `h1` "Challenge".
- UX-DR22: Motion budget: shuffle ≈ 900ms then land 550/420/320 ms; Quick reveal 120ms stagger, 260ms each, ≤ 860ms; press during shuffle completes the piece; single-value Input lands without shuffle; flicks show only setup-allowed values; flicks in an `aria-hidden` layer; Brief 250ms fade; reduced motion 120ms fades; photosensitivity < 3 flashes/s.
- UX-DR23: Sound cues (paper drop, sticker slap, stamp thump, tab tick, Time's up chime), off by default, never the only signal.
- UX-DR24: Setup page journey: 01 night hero (2-column, height budget ≈ 718 of 800, Get a challenge visible without scrolling at 1280×800), sun ticker seam, 02 lilac "what's in a challenge." (CL-5 example 2 sample + six Skill descriptions), 03 paper "four levels, all open." + three poster cards, grape ticker, 04 sun "reveal. make. again." + second Get a challenge, night footer (signup, links, storage note, wordmark). Seams fade 120–260px.
- UX-DR25: Journey furniture: Setup header, Section header, Tickers (real Topic/Style fragments, pause on hover/focus), Poster cards, Orbit thread, Chrome and cutouts (2–4 per screen, hidden on phones), Footer.
- UX-DR26: Notice banners on Setup: "Your challenge is waiting." + Back to your challenge; "You have a challenge in progress." + Discard, with every Get a challenge entry relabeled Resume; storage-unavailable banner; migration-failed banner.
- UX-DR27: Inline message pattern (vermilion dot, `aria-describedby`, polite) for Lock conflict, last Medium, form errors; Lock conflict shows "Unlock <Kind>" line button with the focus sequence.
- UX-DR28: Practice page: night header band, paper body, 760px column, Practice Map (three labeled count tables, em dash for zero, no bars/rings/percent), Rep cards (meta row, Brief, expanded Reflection, RETRY/VARIATION pill, read-only), storage note, Export ("Exported.", `impromptu-practice-YYYY-MM-DD.json`), Clear dialog (focus trap, initial focus "Keep my data", Esc cancels, "All data cleared.").
- UX-DR29: Email signup component, night (footer) and lilac (Stage) variants, all states (idle, malformed, consent, submitting, success "You're on the list." also for existing, rate-limited, offline, server error), honeypot off-screen and unreachable.
- UX-DR30: Privacy note page on paper.
- UX-DR31: Focus target table (Stage open → sun button; relabel → stays; Reroll → stays; unlock → Reroll; Finish → "Rep done."; Save → Try another version; Variation → first option; to Setup → `h1` or banner; overlay close → opener).
- UX-DR32: Accessibility floor: 52px targets, 200% zoom, 320px reflow without horizontal scroll, `overflow-wrap: anywhere`, not-by-color-alone, one `h1` per page, pieces list "Challenge inputs", `lang="en"`, announcements per EXPERIENCE.
- UX-DR33: Responsive behavior per EXPERIENCE → Responsive & Platform (≥ 1280, 861–1279, ≤ 860, 320 floor) incl. phone Stage fixed bottom action bar and stamp below Topic.
- UX-DR34: Filming contract checks at 1280×800, 1440×900, 1920×1080, 390×844 plus the PRD §6 visual acceptance check and a PEAT check.
- UX-DR35: Banned patterns: linked Reps, hashtags, analytics, accounts, auto-advance, early timer, pop-ups, signup during Reveal/Attempt, streaks, badges, level-ups, "you missed", confirmation dialogs on Discard or Reroll, infinite scroll, hover-only affordances, camera mode.
- UX-DR36: Voice: working copy from EXPERIENCE → Voice and Tone (Level one-liners, Skill descriptions, all state strings) lives in `copy.ts`.

### Cross-Document Resolutions

These resolve conflicts between the input documents. Each one binds the stories below; items marked **correction needed** should be fed back into the named document.

1. **Brief length cap: 160 characters** (founder-resolved). DESIGN `{spacing.stage-brief-max-chars}` = 160 so a timed Brief fits the held Stage at 1280×800. AD-16 says 220. Stories use 160. **Correction needed: ARCHITECTURE-SPINE AD-16 and Deferred → Library tuning (220 → 160).** The three CL-5 anchors are all under 160 characters.
2. **When the Rep is written** `[ASSUMPTION]`. EXPERIENCE says **Finish rep** writes the Rep immediately and "Save rep" attaches the Reflection; AD-7's diagram appends at `save_rep`. Resolution, compatible with AD-5's "Rep id assigned at finish, append idempotent by id": `finish` appends the Rep (reflection `null`) to history in the same transition; `save_rep` sets its reflection (an idempotent upsert by id) and moves to Saved. Finished still persists with the draft across reloads (AD-7). Leaving `/stage` from Finished (back or Esc) dispatches `save_rep` with the current draft, so the Rep is never lost and the session reaches Saved. **Correction needed: AD-7 state diagram label.**
3. **Keyboard handling** `[ASSUMPTION]`. AD-7 specifies one Stage-level key handler; EXPERIENCE says "no page-level key handler" for Space/Enter. Resolution: the Stage-level handler owns **Esc** only, plus Space/Enter **only when focus is on no control** (body), per AD-7. Space/Enter on the focused sun button use native button activation. Focus starts on the sun button, so EXPERIENCE's scroll concern only applies when the user has deliberately blurred focus. **Correction needed: EXPERIENCE → Interaction Primitives wording.**
4. **Unsubscribe page.** EXPERIENCE lists a conditional `/unsubscribed` route; AD-14 chooses Resend's managed unsubscribe with no app route. No `/unsubscribed` story is created.
5. **Motion toggle persistence** `[ASSUMPTION]`. EXPERIENCE requires a persisted Motion toggle; AD-9/AD-19 `Setup` schema omits it. Resolution: add `ambientMotion: boolean` to the `Setup` schema and `config.setup.defaults` (default `true`, while `prefers-reduced-motion: reduce` always wins). **Correction needed: AD-9 Setup key contents and AD-19 defaults.**
6. **Low-power 3D gate.** EXPERIENCE lists `hardwareConcurrency ≤ 4` or Save-Data; AD-12 adds `deviceMemory ≤ 4`. Stories use AD-12 (the superset).
7. **Practice header Motion toggle and Stage.** The Motion toggle is never on the Stage (Stage motion runs only during shuffles, and decor freezes when held, AD-12).

### FR Coverage Map

Epic-level map (the story-level map is in *Story Coverage Map* at the end of this file).

| Req | Epic | Summary |
|---|---|---|
| FR-1 | E3 | Difficulty Dial, Perform timing |
| FR-2 | E3 | Medium enable / choose / random, last-Medium guard |
| FR-3 | E3 (Setup), E4 (Stage info) | Skill focus + info popover |
| FR-4 | E3 | Setup persistence, no account |
| FR-5 | E1 (data rules), E3 (compose) | Level-appropriate Templates |
| FR-6 | E1 (isCompatible, gate), E3 (compose) | Compatible combinations only |
| FR-7 | E1 (render, gate), E2 (content) | Standalone Brief |
| FR-8 | E3 | Recent-repeat window |
| FR-9 | E4 | Lock and Reroll, lock conflict |
| FR-10 | E3 | Stable held Challenge |
| FR-11 | E5 | Retry |
| FR-12 | E5 | Variation |
| FR-13 | E3 (stepping, labels, announcements), E4 (motion) | Sequential reveal |
| FR-14 | E3 | Quick reveal |
| FR-15 | E4 | Hold the composition |
| FR-16 | E3 (control), E4 (cues) | Sound and mute |
| FR-17 | E4 | Reduced motion |
| FR-18 | E5 | Timers never start during Reveal |
| FR-19 | E5 | Start creating |
| FR-20 | E5 | Countdown |
| FR-21 | E5 | Incomplete Attempts, Resume / Discard |
| FR-22 | E5 | Finish rep + stamp |
| FR-23 | E5 | Reflection |
| FR-24 | E5 | Next steps |
| FR-25 | E6 | Practice History |
| FR-26 | E6 | Practice Map |
| FR-27 | E3 (Repository), E5 (first-Rep note), E6 (Practice note) | Browser storage, versioning, note |
| FR-28 | E6 | Export and clear |
| FR-29 | E3 (Setup banner), E5 (Stage), E6 (Practice) | Empty / storage-unavailable states |
| FR-30 | E3 | Stage as its own page, back, Esc |
| FR-31 | E3 (layout), E4 (filming contract) | Safe area and type minimums |
| FR-32 | E3, E4, E5 | Step-relevant controls only |
| FR-33 | E4, E8 | Stillness when held |
| FR-34 | E4 (automated check), E9 (SM-2 protocol) | Legible at reduced size |
| FR-35 | E7 | Optional signup |
| FR-36 | E7 | Signup feedback, rate limit |
| FR-37 | E7 | Unsubscribe |
| CL-1 | E1 | Template schema |
| CL-2 | E1 (gate), E2 (content) | Coverage and volume |
| CL-3 | E1 | Validation gate |
| CL-4 | E1 (lint), E2 (content) | Style vs Constraint |
| CL-5 | E1 | Anchors verbatim |
| CL-6 | E1 (pipeline), E2 (batches) | Offline generation |
| NFR-1 | E3–E8 (per story), E9 (audit) | Accessibility |
| NFR-2 | E3–E8 (per story), E9 (matrix) | Responsive, desktop first |
| NFR-3 | E8, E9 | Performance, progressive 3D |
| NFR-4 | E3, E7, E9 | Reliability offline-after-load |
| NFR-5 | E1 (AD-13 guard), E7 (privacy note), E9 (audit) | Privacy |
| NFR-6 | E1 | Config and library data |
| NFR-7 | E8 | 3D placement |

## Epic List

### Epic 1: Project Foundation and the Trusted Library Pipeline
The founder (as library author) can generate, validate, and ship challenge-library batches through a gate that guarantees every reachable Challenge is well-formed and contradiction-free, and the app builds and deploys from that library. Starts with the AD-1 scaffold. Ends with the CL-5 anchors and a pilot batch set accepted, so later epics have real data.
**FRs covered:** FR-5 (data rules), FR-6, FR-7, CL-1, CL-3, CL-4 (lint), CL-5, CL-6; NFR-5 (AD-13 guard), NFR-6. **Architecture:** AR-1–AR-4, AR-6, AR-8, AR-15, AR-17–AR-19, AR-21, AR-23 (CI, testing).

### Epic 2: Launch Challenge Library
The library reaches launch coverage: every Skill × Level × Medium cell has at least 2 active Templates, every Level × Medium setup has repeat headroom, and coverage enforcement is switched on. Depends only on Epic 1, so it runs in parallel with Epics 3–8. `[ASSUMPTION]`
**FRs covered:** CL-2, CL-4, CL-6 (batches), FR-7 (content quality). **Architecture:** AR-19, AR-24.

### Epic 3: Get a Challenge
A visitor configures Level, Mediums, and Skill focus on the landing page, taps **Get a challenge**, and gets a valid, stable Challenge on its own Challenge Stage page. The Challenge survives reloads and navigation, and setup persists. Quick reveal is the first presentation.
**FRs covered:** FR-1, FR-2, FR-3, FR-4, FR-5, FR-6, FR-8, FR-10, FR-14, FR-27 (storage), FR-29 (Setup banner), FR-30, FR-31 (layout), FR-32. **Architecture:** AR-5, AR-7, AR-9, AR-11–AR-13, AR-20, AR-21, AR-23. **UX:** UX-DR1–UX-DR9, UX-DR11–UX-DR13, UX-DR19–UX-DR21, UX-DR26, UX-DR36.

### Epic 4: The Reveal Show and a Filming-Ready Stage
A creator reveals a Challenge one Input at a time at their own pace, with collage motion, optional sound, and reduced-motion parity. They can Lock and Reroll, and the held Challenge sits still and legible on camera.
**FRs covered:** FR-3 (Stage info), FR-9, FR-13, FR-15, FR-16, FR-17, FR-31, FR-32, FR-33, FR-34. **Architecture:** AR-20. **UX:** UX-DR14, UX-DR20, UX-DR22, UX-DR23, UX-DR27, UX-DR31, UX-DR34.

### Epic 5: Create, Finish, Reflect, Go Again
A user starts creating, optionally against a countdown, can pause, resume after closing the tab, or discard without penalty, finishes the Rep, reflects, and chooses a Variation, a Retry, or a new Challenge.
**FRs covered:** FR-11, FR-12, FR-18, FR-19, FR-20, FR-21, FR-22, FR-23, FR-24, FR-27 (first-Rep note), FR-29 (Stage). **Architecture:** AR-3 (Retry path), AR-5, AR-10. **UX:** UX-DR15–UX-DR18, UX-DR26.

### Epic 6: Practice History and Practice Map
A user sees what they have practiced, by Skill, Medium, and Level, and every Rep with its Reflection, without quality judgments. They can export to JSON and clear everything.
**FRs covered:** FR-25, FR-26, FR-27, FR-28, FR-29. **Architecture:** AR-7 (Export), AR-11. **UX:** UX-DR28.

### Epic 7: Email Updates and Privacy
A visitor can opt in to occasional emails after a saved Rep or from the footer, with explicit consent and a privacy note, and every email can be unsubscribed. The production environment is ready to send.
**FRs covered:** FR-35, FR-36, FR-37; NFR-4 (offline error), NFR-5. **Architecture:** AR-16, AR-22. **UX:** UX-DR29, UX-DR30.

### Epic 8: The Setup Journey and 3D Decor
The landing page becomes the full collage journey (night → lilac → paper → sun → night) with tickers, posters, the footer, the Motion toggle, and the three.js hero and Reveal shuffle layers, all progressive and freezable.
**FRs covered:** FR-33 (decor freeze), NFR-3, NFR-7. **Architecture:** AR-14. **UX:** UX-DR10, UX-DR24, UX-DR25.

### Epic 9: Launch Readiness
The release is verified against the PRD's acceptance bars: accessibility, responsive matrix, performance budgets, filming legibility, the §6 visual acceptance check, photosensitivity, and privacy. The moderated-test protocols for SM-1, SM-2, SM-4, and SM-6 are ready to run.
**FRs covered:** FR-34 (SM-2 protocol); NFR-1, NFR-2, NFR-3, NFR-4, NFR-5 (verification). **UX:** UX-DR32–UX-DR35.

**Dependency flow:** E1 → (E2 ∥ E3) → E4 → E5 → E6; E7 needs E5's Saved state for the Stage signup card (its footer variant is placed in E8); E8 needs E3/E4; E9 needs all. No epic depends on a later one.

## Epic 1: Project Foundation and the Trusted Library Pipeline

The founder (as library author) can generate, validate, and ship challenge-library batches through a gate that guarantees every reachable Challenge is well-formed and contradiction-free, and the app builds and deploys from that library. Starts with the AD-1 scaffold. Ends with the CL-5 anchors and a pilot batch set accepted.

### Story 1.1: Scaffold the app from the architecture starter

As the founder,
I want the Impromptu repo created from the exact starter the architecture specifies,
So that every later story builds on the agreed stack and static-first routing.

**Acceptance Criteria:**

**Given** an empty project root
**When** the developer runs `npx create-next-app@16.4.0 impromptu --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --no-cache-components --no-react-compiler` (AD-1)
**Then** the app builds and serves the default page with `npm run dev` and `npm run build`
**And** Cache Components is off in `next.config` and there is no `proxy.ts`

**Given** the scaffolded repo
**When** dependencies are installed
**Then** versions match the ARCHITECTURE-SPINE Stack table (Next 16.4.0, React 19.3.0, TypeScript 5.9.3, Tailwind 4.3.3, zod 4.6.5, Vitest 5.0.3, @playwright/test 1.64.0, tsx 4.23.15, @types/node ^24), `engines.node` is `24.x`, and three.js and resend are not installed yet (the stories that use them add them)

**Given** the AD-1 route list
**When** the developer creates placeholder pages for `/`, `/stage`, `/practice`, and `/privacy`
**Then** `next build` reports every page as statically prerendered, with no dynamic server rendering and no Server Actions
**And** the folders from ARCHITECTURE-SPINE → Structural Seed → Source tree exist (empty folders hold a `.gitkeep`), and `src/generated/` is in `.gitignore`

**Given** the repo is pushed to GitHub and linked to Vercel
**When** a PR is opened
**Then** a Preview deployment builds, and `main` deploys to Production (AD-20)

### Story 1.2: Architecture guardrails, config module, ports, and test harness

As a developer agent,
I want import boundaries, the config module, the four ports, and the test and CI harness in place,
So that domain logic stays pure and every later story is tested the same way.

**Acceptance Criteria:**

**Given** the dependency diagram in ARCHITECTURE-SPINE → Design Paradigm
**When** ESLint runs
**Then** a `no-restricted-imports` configuration fails any import that breaks AD-2: `src/domain` importing anything but `src/config` and `zod`; `src/decor` importing `src/domain`, `src/store`, or `src/adapters`; client code importing `src/server`; components importing `src/adapters`; `src/shared` importing anything but `zod`
**And** a lint rule or test fails if `src/domain` references `window`, `localStorage`, `Date.now`, `Math.random`, or `crypto`

**Given** AD-19
**When** `src/config/app.ts` is created
**Then** it exports `generator.recentWindow: 30`, `reveal.quickMaxMs: 1000`, `reveal.order` (skill, medium, topic, style, constraint, then brief), `setup.defaults` (Level `explore`, Perform timing `either`, all Mediums enabled, Medium random, Skill random, Quick reveal off, sound off, `ambientMotion: true` per Cross-Document Resolution 5), `reflection.maxChars: 280`, `storage.schemaVersions`, and `signup.consentTextVersion`

**Given** AD-2
**When** `src/domain/ports.ts`, `src/adapters/clock.ts`, and `src/adapters/random.ts` are created
**Then** `Library`, `Repository`, `Clock.now()`, and `Random.next()/uuid()` are defined; production adapters use `Date.now()` and `crypto.getRandomValues`/`crypto.randomUUID`; and a seeded `Random` and a fake `Clock` exist for tests

**Given** the Testing and CI conventions
**When** a PR is opened
**Then** a GitHub Action runs lint, typecheck, vitest (colocated `*.test.ts`), and playwright (Chromium, WebKit, Firefox, `e2e/`), and any failure blocks the PR; the `library:validate` step is added by Story 1.6
**And** a CI check fails if `package.json` contains `@vercel/analytics`, `@vercel/speed-insights`, or any client error-monitoring SDK (AD-13, NFR-5)

### Story 1.3: Library schema, id rules, tag vocabulary, Skills and Mediums

As the library author,
I want one zod schema for every library entity plus the base Skill, Medium, and tag data,
So that the generator, validator, and runtime can never disagree on shape (CL-1, AD-15).

**Acceptance Criteria:**

**Given** AD-15
**When** `src/domain/library/schema.ts` is written
**Then** it defines `Skill`, `Medium`, `Template`, `Topic`, `Style`, `Constraint`, `Tag`, `Anchor`, and `BatchManifest` in zod, and every TypeScript type comes from `z.infer` with no hand-written parallel interfaces
**And** a Template has `id`, `skill`, `level`, required `mediums[]`, `briefPattern` (a string, or a map keyed by Medium id whose keys are a subset of `mediums`), `topicTags`, `styleTags`, `constraintTags`, `incompatible[]`, `tags[]`, optional `timeLimitSec`, optional `guidance`, and optional `retired`
**And** every Topic, Style, and Constraint has `id`, `revealText`, `briefText`, `tags`, `requires`, `excludes`, and optional `retired`

**Given** schema refinements
**When** a Template has `timeLimitSec` at a Level other than `perform`, or `guidance` at a Level other than `explore`
**Then** parsing fails with a message naming the Template id (FR-5, CL-1)

**Given** AD-6
**When** an id is parsed
**Then** it must match its kind's pattern (`skl.<slug>`, `med.<slug>`, `tpl.<skill-slug>.<level>.<slug>`, `top.<slug>`, `sty.<slug>`, `con.<slug>`, lowercase kebab slugs)

**Given** the PRD Glossary and AD-15
**When** `content/library/skills.json`, `mediums.json`, and `tags.json` are created
**Then** `skills.json` holds the six Skills with `revealText`, `info` (the one-sentence EXPERIENCE → Voice and Tone description), and `tags`; `mediums.json` holds Writing, Drawing, Photography, and Spoken storytelling with `tags` (for example `med.photography` carrying `camera`); and `tags.json` is the controlled vocabulary every other tag must come from (AD-4)
**And** the Medium list exists only in library data, never in UI code (NFR-6)

### Story 1.4: One compatibility function and one Brief renderer

As the library author,
I want a single `isCompatible()` and a single `render()` used by both the validator and the runtime,
So that a combination the gate approves is exactly a combination the app can produce (FR-6, FR-7, AD-4).

**Acceptance Criteria:**

**Given** AD-4 semantics
**When** `isCompatible(template, medium, topic, style, constraint)` in `src/domain/library/compat.ts` is called
**Then** it returns true only if each fill matches at least one of the Template's tag lists for its kind, no part is listed in `incompatible[]`, every `requires[]` trait appears among the other parts (Template `tags`, Medium `tags`, and the other fills), and no `excludes[]` trait appears among the other parts
**And** a Template that omits a slot (for example Style at Explore) is evaluated without that part

**Given** colocated Vitest tests
**When** they run
**Then** they cover a Topic requiring `person` against a Constraint excluding `person` (rejected), Medium tags counting as a part, `incompatible` by id and by tag, and an omitted Style slot

**Given** AD-15
**When** `src/domain/library/render.ts` renders a Template with a Medium and fills
**Then** it uses the per-Medium `briefPattern` when one exists, substitutes each fill's `briefText` into `{topic}`, `{style}`, and `{constraint}`, and returns `{ok:false, reason}` (never throws) when a slot has no fill or a fill has no slot
**And** `guidance` is returned separately and is never inserted into the Brief

### Story 1.5: Transcribe the three CL-5 anchors verbatim

As the founder,
I want my three example Challenges in the library exactly as written,
So that they ship to users and serve as the quality bar for every generated batch (CL-5).

**Acceptance Criteria:**

**Given** PRD addendum → Example Challenges
**When** `content/library/anchors/` is created
**Then** it holds ordinary Template and fill entries for: Explore · Observation · Drawing ("Draw an object near you. Include three details you have never paid attention to."); Experiment · Expression · Photography · Minimalist · No people ("Take two photos of coming home. Make one feel comforting and the other lonely. Keep people out of both."); and Perform · Idea generation · Writing · Horror · Nothing bad happens ("Write three premises for a first date that feels like horror, even though nothing bad happens.", with `timeLimitSec: 300`)
**And** `anchors.json` lists each as `{templateId, mediumId, topicId, styleId, constraintId, expectedBrief}` (AD-16), with `styleId` or `constraintId` null where the anchor has none

**Given** the anchor data
**When** a Vitest test renders each anchor through `render.ts`
**Then** the output string-equals `expectedBrief`, and each anchor passes `isCompatible()`
**And** each anchor Brief is at most 160 characters (Cross-Document Resolution 1)

### Story 1.6: Library hard gate: integrity, Brief rules, Time Limits, anchors, and the CL-4 lint

As the library author,
I want `npm run library:validate` to reject malformed data and bad Briefs with a readable report,
So that no batch with broken content can be accepted (CL-3, CL-4, AD-16).

**Acceptance Criteria:**

**Given** `scripts/library/validate.ts` run with `tsx`
**When** it loads `content/library/anchors/` plus every batch folder in folder-name order (AD-6)
**Then** it checks the zod schema, that ids are unique across all declarations, that every tag comes from `tags.json`, that every id reference (including `retire[]` and `incompatible[]`) resolves, and that retired entries are excluded from active sets but still resolvable
**And** it checks that no `timeLimitSec` exists below Perform

**Given** the Brief rules
**When** every active Template is rendered against each of its compatible fill combinations
**Then** the gate fails any Brief that has leftover braces, has fewer than 1 or more than 3 sentences, or exceeds **160 characters** (Cross-Document Resolution 1; the cap lives in a gate config file, not in code branches)
**And** it fails if any anchor's render does not string-equal its `expectedBrief`

**Given** CL-4
**When** the Style/Constraint wording lint runs
**Then** it flags Styles phrased as rules (for example starting with "no", "only", "must", "without", or naming a count) and Constraints phrased as moods or treatments (for example adjective-only phrases), using word lists kept in the gate config
**And** a flag is a hard failure for the batch that introduces it

**Given** any failure
**When** the script finishes
**Then** it exits non-zero and writes a machine-readable `gate-report.json` plus a human summary naming each failing id and rule
**And** the CI workflow from Story 1.2 gains a `library:validate` step that runs it

### Story 1.7: Library hard gate: reachability, coverage, repeat headroom, and the build step

As the founder,
I want the gate to prove every Template is reachable and every setup has enough variety, and the app build to consume only a validated library,
So that a contradictory or uncovered library can never deploy (CL-2, CL-3, FR-6, AD-16).

**Acceptance Criteria:**

**Given** the reachability checks
**When** the gate enumerates every active Template × eligible Medium × compatible fill combination through `isCompatible()`
**Then** it fails any Template with fewer than 3 valid combinations, and fails if any reachable combination violates a `requires` or `excludes` rule

**Given** the coverage and headroom checks
**When** the gate runs
**Then** it reports every Skill × Level × Medium cell with fewer than 2 active Templates and every Level × Medium setup (Skill random) with fewer than 60 distinct `templateId+topicId` combinations, and it warns (never fails) on Skill-focused setups below 31
**And** these two checks fail the build only when `coverage.enforce` is `true` in the gate config. It starts `false`, and Story 2.8 switches it on `[ASSUMPTION]`, because the library cannot reach launch coverage until Epic 2 completes and the app must build in the meantime
**And** regardless of that flag, a batch-scoped check always enforces AD-17 sizing for the batch under review (a Template batch covers its one Skill × Level with at least 3 Templates per Medium)

**Given** `scripts/library/build.ts`
**When** `npm run dev` or `npm run build` runs (`predev`, `prebuild`)
**Then** it loads anchors plus every batch whose `manifest.status === 'accepted'`, runs the full gate, and only on success writes `src/generated/library.json` with `libraryVersion` set to a content hash
**And** any gate failure exits non-zero, so the Vercel build fails

### Story 1.8: Generation pipeline kit: prompt, rubric, batch folders, and soft-gate tooling

As the library author,
I want a versioned prompt, rubric, batch template, and sampling tools,
So that an AI coding-agent session can generate a batch, and the AI judge and I can review it the same way every time (CL-6, AD-17, PRD OQ-1).

**Acceptance Criteria:**

**Given** AD-17
**When** `content/library/pipeline/PROMPT.md` and `RUBRIC.md` are written
**Then** each has a version header, and PROMPT.md embeds (or instructs inclusion of) the CL-5 anchors, the tag vocabulary, the target cells, the Level semantics from FR-5, the 160-character Brief cap, the Style-versus-Constraint rule (CL-4), the id conventions (AD-6), and a slot for the previous gate report when regenerating
**And** RUBRIC.md scores each rendered Challenge on: concrete deliverable and completion condition (FR-7), Brief stands alone, Level fit, Skill fit, Medium realism, Style/Constraint distinctness, no contradiction, and the anchor quality bar, each with pass/fail definitions

**Given** a new batch
**When** the author runs `npm run library:new-batch -- <kind> <scope>`
**Then** a folder `content/library/batches/<YYYY-MM-DD>-<kind>-<scope>-<nn>/` is created with a `manifest.json` (`status: draft`, `generator {tool, model, promptVersion}`, `rubricVersion`, `review {judge, founderSample, rejectedIds, date}`, `edits[]`, `retire[]`) and an empty kind file

**Given** a draft batch that passed the hard gate
**When** the author runs `npm run library:sample -- <batchId>`
**Then** it writes every rendered Challenge for the judge pass and a random sample of 20 for the founder skim, as a readable Markdown file next to the manifest

**Given** the pipeline rules
**When** `content/library/pipeline/README.md` is written
**Then** it documents the AD-17 loop exactly: hard gate first, soft gate second, whole-batch rejection on a hard failure, at most 3 regenerations with the report appended and then escalation to the founder, rubric-rejected ids regenerated inside the batch, typo-only hand edits logged in `edits[]`, one PR per batch, accepted batches never edited, and fixes via patch batches with `retire[]`
**And** any optional `scripts/library/generate.ts` reads an LLM key only from a gitignored local `.env`, and nothing under `src/` imports it (CL-6)

### Story 1.9: Pilot batches through the full lifecycle

As the founder,
I want the first fill batches and one Template batch generated, reviewed, and accepted,
So that the pipeline is proven end to end and the app has real Challenges to compose while the full library is built.

**Acceptance Criteria:**

**Given** the pipeline kit from Story 1.8
**When** the executor generates the `topics-01` (40), `styles-01` (up to 40), and `constraints-01` (40) fill batches, each in its own PR
**Then** each passes `library:validate`, records its judge pass and founder skim in `manifest.review`, and merges with `status: accepted`
**And** the fills include the `person`, `camera`, and other traits that the anchors' requires/excludes rules rely on

**Given** accepted fills
**When** the executor generates the Template batch for Observation × Explore (12 Templates, at least 3 per Medium)
**Then** it passes the hard gate and the soft gate and lands as an accepted batch in its own PR
**And** `npm run build` emits a `library.json` that contains the anchors and the pilot batches

**Given** the pilot run
**When** it completes
**Then** the PR description records batch sizes, regeneration count, rejected ids, and any prompt or rubric change, and PROMPT.md or RUBRIC.md get a version bump if they changed

## Epic 2: Launch Challenge Library

The library reaches launch coverage: every Skill × Level × Medium cell has at least 2 active Templates, every Level × Medium setup has repeat headroom, and coverage enforcement is switched on. This epic depends only on Epic 1 and runs in parallel with Epics 3–8 `[ASSUMPTION]`. Each story is one executor session producing several batches, and **each batch is its own PR** (AD-17). Volume targets follow ARCHITECTURE-SPINE → Deferred → Library tuning (about 288 Templates, 160 Topics, 32–40 Styles, 64–80 Constraints).

Shared acceptance rule for every story in this epic: every batch passes `library:validate` (hard gate), then the soft gate (AI judge against `RUBRIC.md` plus the founder skim of 20 from `library:sample`), records the review in `manifest.review`, merges as `status: accepted`, and follows the AD-17 failure loop (at most 3 regenerations, then escalate the cell to the founder). A batch never ships on a failed hard gate.

### Story 2.1: Complete the fill library (Topics and Constraints)

As the library author,
I want the remaining Topic and Constraint batches accepted,
So that Templates have enough compatible fills for variety and repeat headroom (CL-2, CL-6).

**Acceptance Criteria:**

**Given** the accepted pilot fills from Story 1.9
**When** the executor generates `topics-02`, `topics-03`, and `topics-04` (40 each) and `constraints-02` (40)
**Then** each batch passes the hard and soft gates and lands in its own PR as accepted
**And** the active library holds at least 160 Topics and at least 64 Constraints, with no new tag outside `tags.json` unless a separate PR first adds it to the vocabulary

**Given** CL-4
**When** the CL-4 lint and the rubric's Style/Constraint check run on the new Constraints
**Then** every Constraint states a rule (what you may or may not do) and none reads as a treatment or mood

**Given** the new Topics
**When** the founder skim runs
**Then** Topics needing a person, an outdoor location, or another physical trait carry the matching `requires` or tags, so contradiction rules stay in data (FR-6)

### Story 2.2: Observation Templates for Experiment, Develop, and Perform

As a creative practicing Observation,
I want Observation exercises at every Level in every Medium,
So that any setup with Observation (focused or random) produces a real exercise (CL-2).

**Acceptance Criteria:**

**Given** accepted fills
**When** the executor generates Template batches `observation-experiment`, `observation-develop`, and `observation-perform` (12 Templates each, at least 3 per Medium)
**Then** each passes the hard and soft gates and lands as an accepted batch
**And** each Brief follows the FR-5 Level semantics: Experiment asks for multiple interpretations or unexpected combinations; Develop asks for a specific effect and then a deliberate revision; Perform uses the full Input set with added demands

**Given** the Perform batch
**When** it is validated
**Then** it contains both timed and untimed Templates, so the Timed, Untimed, and Either choices each have options in every Medium, and every Time Limit is one of the configured values (5, 10, or 20 minutes, matched to the task per the PRD addendum)

### Story 2.3: Idea generation Templates for all four Levels

As a creative practicing Idea generation,
I want Idea generation exercises at every Level in every Medium,
So that this Skill is fully covered (CL-2).

**Acceptance Criteria:**

**Given** accepted fills and the CL-5 Perform anchor (Idea generation · Writing)
**When** the executor generates Template batches for Idea generation × Explore, Experiment, Develop, and Perform (12 Templates each, at least 3 per Medium)
**Then** each passes the hard and soft gates and lands as an accepted batch
**And** the rubric scores the Perform batch against the anchor "Write three premises for a first date that feels like horror, even though nothing bad happens." as the quality bar

**Given** the Perform batch
**When** it is validated
**Then** it includes both timed and untimed Templates in every Medium

### Story 2.4: Connection Templates for all four Levels

As a creative practicing Connection,
I want Connection exercises at every Level in every Medium,
So that this Skill is fully covered (CL-2).

**Acceptance Criteria:**

**Given** accepted fills
**When** the executor generates Template batches for Connection × Explore, Experiment, Develop, and Perform (12 Templates each, at least 3 per Medium)
**Then** each passes the hard and soft gates and lands as an accepted batch
**And** Explore Templates have one task and one simple Constraint, may omit the Style slot, and may carry a `guidance` line (FR-5)
**And** the Perform batch includes both timed and untimed Templates in every Medium

### Story 2.5: Perspective Templates for all four Levels

As a creative practicing Perspective,
I want Perspective exercises at every Level in every Medium,
So that this Skill is fully covered (CL-2).

**Acceptance Criteria:**

**Given** accepted fills
**When** the executor generates Template batches for Perspective × Explore, Experiment, Develop, and Perform (12 Templates each, at least 3 per Medium)
**Then** each passes the hard and soft gates and lands as an accepted batch
**And** the Perform batch includes both timed and untimed Templates in every Medium

### Story 2.6: Expression Templates for all four Levels

As a creative practicing Expression,
I want Expression exercises at every Level in every Medium,
So that this Skill is fully covered (CL-2).

**Acceptance Criteria:**

**Given** accepted fills and the CL-5 Experiment anchor (Expression · Photography)
**When** the executor generates Template batches for Expression × Explore, Experiment, Develop, and Perform (12 Templates each, at least 3 per Medium)
**Then** each passes the hard and soft gates and lands as an accepted batch
**And** the rubric scores the Experiment batch against the anchor "Take two photos of coming home. Make one feel comforting and the other lonely. Keep people out of both." as the quality bar
**And** the Perform batch includes both timed and untimed Templates in every Medium

### Story 2.7: Revision Templates for all four Levels

As a creative practicing Revision,
I want Revision exercises at every Level in every Medium,
So that this Skill is fully covered (CL-2).

**Acceptance Criteria:**

**Given** accepted fills
**When** the executor generates Template batches for Revision × Explore, Experiment, Develop, and Perform (12 Templates each, at least 3 per Medium)
**Then** each passes the hard and soft gates and lands as an accepted batch
**And** each Revision Brief names a deliverable that the user can finish outside the site with no upload (for example "make it, then change one thing on purpose and keep both"), since Impromptu has no canvas or upload (PRD §8)
**And** the Perform batch includes both timed and untimed Templates in every Medium

### Story 2.8: Switch on coverage enforcement and audit the launch library

As the founder,
I want the build to refuse any library that falls below launch coverage, plus an audit report for SM-3,
So that the shipped library meets CL-2 and every reachable Challenge has a concrete deliverable.

**Acceptance Criteria:**

**Given** all Template batches from Stories 1.9 and 2.2–2.7 are accepted
**When** `coverage.enforce` is set to `true` in the gate config
**Then** `npm run build` passes: every Skill × Level × Medium cell has at least 2 active Templates, and every Level × Medium setup with Skill random has at least 60 distinct `templateId+topicId` combinations (AD-16)
**And** any cell or setup that falls short is filled by a new patch batch, never by hand edits

**Given** the full library
**When** `npm run library:audit` runs
**Then** it writes a report with: counts per kind and per cell, Skill-focused setups below 31 combinations (warnings), the CL-4 lint result, and a simulated first-30 run for every Level × Medium setup (seeded sampling over the gate's enumerated valid combinations, excluding the last 30 `templateId+topicId` keys as AD-11 does) showing no repeated Brief (CL-2)
**And** the report records that 100% of reachable Challenges passed the hard gate's deliverable and contradiction checks (SM-3)

**Given** the audit
**When** the founder reviews it
**Then** the founder's sign-off and date are recorded in the report, and any Skill-focused warning is either accepted or turned into a patch batch

## Epic 3: Get a Challenge

A visitor configures Level, Mediums, and Skill focus on the landing page, taps **Get a challenge**, and gets a valid, stable Challenge on its own Challenge Stage page. The Challenge survives reloads and navigation, and setup persists. In this epic pieces land instantly. Epic 4 adds the theatrical motion.

### Story 3.1: Design tokens, fonts, and base action components

As a visitor,
I want the site to look and feel like Impromptu from the first screen,
So that the Challenge reads as part of a designed show, not a utility widget.

**Acceptance Criteria:**

**Given** DESIGN.md front matter
**When** `src/styles/tokens.css` is written as a Tailwind v4 `@theme`
**Then** it defines every DESIGN color, every typography role (including the Stage ramp and the phone ramp), the radii, the spacing scale and named spacings (`safe-area-width: min(56.25vh, 640px)`, `target-min: 52px`, `stage-gap`, `stage-gap-compact`, `focus-offset`, `gutter-phone`, `header-inset`, `content-max`), and the five shadows from DESIGN → Elevation & Depth
**And** a lint or test fails on raw hex colors or px font sizes in `src/components` (Styling convention)
**And** `prefers-color-scheme` changes nothing (DESIGN → Colors, "No dark mode")

**Given** AD-13 and DESIGN → Typography
**When** fonts load
**Then** Bodoni Moda (400–900 with italic), Unbounded (200–900), and Instrument Sans (400–700) are self-hosted through `next/font/google` with `display: swap` and the DESIGN fallbacks, and the browser requests no third-party origin

**Given** DESIGN → Components → Actions and EXPERIENCE → Component Patterns
**When** the Sun button, Ink button, Line button, and Stage icon button components are built
**Then** each is a native `<button>` with a minimum 52px target, the DESIGN visual states (hover lift, pressed, disabled, focus), and a focus ring of 2px at a 3px offset whose color follows the ground (`focus` on night, lilac, and paper; `focus-on-sun` on sun; `focus-on-lilac-deep` on lilac-deep)
**And** `src/components/copy.ts` exists as the single copy map, seeded with the working copy from EXPERIENCE → Voice and Tone (Level one-liners, button labels, state strings)

**Given** NFR-1
**When** each button variant is checked on its intended ground
**Then** label and focus-ring contrast match DESIGN → Colors verified pairs, and no state is shown by color alone

### Story 3.2: Setup and session schemas and the setup reducer

As a visitor,
I want my setup choices to follow consistent rules, including never losing my last Medium,
So that I can't put the generator in an impossible state (FR-2, FR-4).

**Acceptance Criteria:**

**Given** AD-5 and AD-9
**When** `src/domain/session/schema.ts` is written
**Then** it defines zod schemas for `Setup` (Level, Perform timing `timed|untimed|either`, enabled Medium ids, chosen Medium id or random, Skill focus id or random, Quick reveal, sound, `ambientMotion`), `Challenge` (exactly the AD-5 fields, with `origin`), `Attempt` (AD-8 fields), `Rep`, `Session`, and `Export`, and types come only from `z.infer`

**Given** the setup reducer in `src/domain/session`
**When** it handles `set_level`, `set_perform_timing`, `toggle_medium`, `choose_medium`, `set_skill_focus`, `set_quick_reveal`, and `set_sound`
**Then** each produces the expected next `Setup`, and the reducer is pure (no `Date.now`, `Math.random`, or storage)
**And** `toggle_medium` on the last enabled Medium is a no-op that returns a `last_medium` notice for the UI (FR-2)
**And** disabling the Medium chosen under "This time" falls back to random (EXPERIENCE → Chip toggle)

**Given** colocated Vitest tests
**When** they run
**Then** they cover every setup event, the last-Medium guard, and the "This time" fallback

### Story 3.3: Compose a Challenge from setup, Locks, and the recent window

As a visitor,
I want every Challenge to fit my Level, Skill focus, and enabled Mediums and never contradict itself,
So that I always get a real exercise I can start right away (FR-5, FR-6, FR-7, FR-8).

**Acceptance Criteria:**

**Given** AD-3
**When** `compose(request, library, recent, random)` in `src/domain/compose` is called
**Then** it filters Templates by Level, Skill focus, enabled Mediums (or the chosen Medium), and at Perform by the timing choice (Timed keeps only Templates with `timeLimitSec`, Untimed only those without, Either both); skips retired entries; picks a Medium, fills, and a Template only through `isCompatible()`; renders the Brief with `render.ts`; and returns `{ok:true, challenge}` with a full AD-5 snapshot (uuid from `Random.uuid()`, `createdAt` ISO, `libraryVersion`, `templateId`, `level`, `timeLimitSec`, `brief`, `guidance`, `inputs`, `origin`)
**And** the generator never selects a Medium that is not enabled (FR-2)

**Given** a `recent` ring of `templateId+topicId` keys (AD-11)
**When** at least one compatible alternative exists outside the ring
**Then** `compose()` never returns a key in the ring, and when no alternative exists it allows the repeat instead of failing (FR-8)

**Given** a request with `locks` (Input kind → value id) and `mustDiffer` (Input kind → current value id)
**When** `compose()` runs
**Then** every locked Input in the result equals the lock, every `mustDiffer` kind has a different value, and when nothing compatible exists it returns `{ok:false, reason:'no_compatible', blockingLock}` naming the Lock whose release would make a result possible (FR-9 groundwork; Epic 4 uses it in the UI)
**And** `compose()` never returns a partial Challenge and never writes the recent ring

**Given** seeded `Random` tests against a fixture library and the generated library
**When** they run
**Then** they cover each Level's filtering, the Perform timing choice, Medium enablement, Skill focus, the repeat window, Locks, `mustDiffer`, and `blockingLock`

### Story 3.4: Session reducer for commits and reveal progress

As a visitor,
I want the app to have exactly one current Challenge whose reveal progress is tracked step by step,
So that the Stage, setup, and a reload all agree on what I'm looking at (FR-10, FR-13, FR-14, AD-7, AD-18).

**Acceptance Criteria:**

**Given** the AD-7 state machine (states None and Held in this story)
**When** the session reducer handles `challenge_committed {challenge, recentKey}`
**Then** the Challenge becomes the held Challenge, `recentKey` is pushed onto a ring capped at `config.generator.recentWindow` in the same state (AD-11), and `revealed` is empty, unless `setup.quickReveal` is on, in which case every kind present is landed at once (AD-18)
**And** `compose_failed` keeps the current state and sets `lastComposeError`

**Given** a held Challenge
**When** `reveal_next` is dispatched
**Then** the next kind in `config.reveal.order` that the Challenge has is added to `revealed`, skipping kinds the Template omits, and the Brief lands last
**And** once everything has landed, further `reveal_next` events are no-ops (nothing auto-advances, FR-15)

**Given** any (state, event) pair not in the AD-7 diagram
**When** it is dispatched
**Then** it is a no-op, verified by a table-driven Vitest test

### Story 3.5: Versioned browser storage with a memory fallback

As a returning visitor,
I want my setup and current Challenge kept in this browser, even after updates, and the app to still work in private mode,
So that I never lose data to a schema change or a blocked storage API (FR-4, FR-27, FR-29, AD-9).

**Acceptance Criteria:**

**Given** AD-9
**When** `src/adapters/storage` implements the `Repository` port
**Then** it is the only module that touches `localStorage`, it uses exactly the keys `impromptu:setup`, `impromptu:session`, and `impromptu:history`, and each value is an envelope `{v, rev, data}` with `rev` incremented on every write

**Given** a stored value with an older `v`
**When** it is read
**Then** forward-only migrations from `src/adapters/storage/migrations` run, and a value with a higher `v` than known is left untouched and treated as read-only
**And** if a migration throws, the stored value is untouched, that key runs on memory, and the Repository reports `migrationFailed` for the UX banner (EXPERIENCE → Practice → Schema migrated)

**Given** startup
**When** the availability probe (write, read, remove) fails
**Then** a memory adapter with the same interface is used and `storageAvailable` is `false`

**Given** a write
**When** the stored `rev` differs from the one last read
**Then** the Repository re-reads and returns the fresh state so the store can re-apply or drop the event, and another tab's change arrives through a `storage` event subscription
**And** `Repository.clearAll()` removes every `impromptu:*` key
**And** Vitest tests cover envelopes, migrations, the future-version case, the failed migration, the probe failure, the rev conflict, and `clearAll`

### Story 3.6: The app store and the library loader

As a visitor,
I want one source of truth that loads my saved state and the library before anything depends on them,
So that pages never flash wrong content or create two different Challenges (AD-7, AD-10, AD-11).

**Acceptance Criteria:**

**Given** AD-7
**When** `src/store` is implemented with `useSyncExternalStore`
**Then** it holds one store with `setup`, `session`, and `history` slices, runs only domain reducers, persists each changed slice through the Repository after every transition, and exposes a command layer separate from events, starting with `new_challenge` (later stories add `reroll`, `retry`, and `vary` to the same layer)
**And** `new_challenge` calls `compose()` with the current setup, `recent` ring, and production `Random`, then dispatches `challenge_committed` or `compose_failed`; components never call `compose()` or pass a Challenge in an event payload

**Given** AD-10
**When** a page first renders
**Then** the store reports `status: 'loading'` and components render a neutral placeholder without branching on stored values, then hydrate from the Repository in an effect and switch to `'ready'`

**Given** the library loader adapter
**When** setup is idle
**Then** `src/generated/library.json` is loaded as a separate chunk (prefetched on idle from setup per ARCHITECTURE-SPINE → Capability Map, NFR-3), `libraryStatus` moves from `'loading'` to `'ready'`, and compose commands wait for `ready`
**And** hydrating a held Challenge never needs the library, because snapshots are self-contained (AD-5)

**Given** a `storage` event from another tab
**When** it arrives
**Then** the store re-reads and re-renders, so two tabs never show different Challenges (EXPERIENCE → Second tab)

### Story 3.7: Difficulty Dial and Perform timing

As a visitor,
I want to turn the Difficulty Dial to any Level and, at Perform, choose timed or untimed,
So that I control how hard the exercise is without being gated (FR-1).

**Acceptance Criteria:**

**Given** the Setup page section 01 on night (EXPERIENCE → Setup page sections; DESIGN → Setup controls)
**When** it renders
**Then** it shows a header with the brand mark and a Practice link, the headline "Make something unexpected." as the page `h1`, and the one-line explanation, and no account prompt or onboarding exists (FR-4)

**Given** the Difficulty Dial (DESIGN → Difficulty Dial; EXPERIENCE → Component Patterns)
**When** a user operates it by click on a label, drag, touch, or keyboard (arrows step, Home and End jump)
**Then** all four Levels are always selectable, the value is one ARIA slider whose value text joins the Level name and its one-liner ("Experiment. Try more than one way in."), the description beside the dial updates, and the active label shows a cream underline and a grape star
**And** there are no Level suggestions, locks, or Rep-count gates (FR-1, no-penalty guardrail)

**Given** the dial is set to Perform
**When** the timing control appears
**Then** it is a segmented radio group with Timed, Untimed, and Either (default), arrows move the selection, and the choice dispatches `set_perform_timing`
**And** at ≤ 860px the dial renders as the horizontal four-stop track from DESIGN with the same ARIA slider semantics (UX-DR6)

**Given** a reload
**When** the page hydrates
**Then** the Level and timing choice are restored (FR-4)

### Story 3.8: Mediums, Skill focus, Quick reveal, and Get a challenge

As a visitor,
I want to pick the Mediums I can use, optionally a Skill, and Quick reveal, then get a challenge,
So that the Challenge fits what I can actually make right now (FR-2, FR-3, FR-4, FR-14).

**Acceptance Criteria:**

**Given** the Mediums row (DESIGN → Chip toggle; EXPERIENCE → Chip toggle)
**When** a user toggles Medium chips
**Then** each chip is a toggle button with `aria-pressed` and a tick glyph when on, turning off the last enabled Medium is blocked with the inline message "Keep at least one medium on." linked by `aria-describedby` and announced politely, and the defaults on first visit are all Mediums on with "This time" Random (FR-2)

**Given** the select fields
**When** the user opens "This time" or Skill
**Then** they are styled native `<select>`s: "This time" lists Random plus each enabled Medium, and Skill lists Random plus the six Skills read from `skills.json`

**Given** the Skill info button beside the Skill select
**When** it is activated
**Then** a Popover shows each Skill's one-sentence `info`, opens only on click or Enter, closes on Esc, an outside click, or a second activation, and returns focus to the button (FR-3, UX-DR9)

**Given** the Quick reveal switch and the sun button
**When** the user toggles Quick reveal and activates **Get a challenge**
**Then** the switch is `role="switch"` with a visible label and an ON/OFF word, its state persists, and **Get a challenge** dispatches `new_challenge` and navigates to `/stage`
**And** at 1280×800 the whole section 01 stack, including **Get a challenge**, is visible without scrolling (DESIGN → Layout, height budget ≈ 718 of 800), and at ≤ 860px it becomes one column with a 20px gutter (UX-DR33)

**Given** a reload
**When** the page hydrates
**Then** Mediums, "This time", Skill focus, and Quick reveal are restored (FR-4)

### Story 3.9: The Challenge Stage page shell

As a creator,
I want the Challenge on its own clean page with only back and sound outside a centered safe area,
So that I can film it without navigation, setup, or footer in the shot (FR-30, FR-31, FR-32).

**Acceptance Criteria:**

**Given** `/stage` (AD-1, EXPERIENCE → Information Architecture)
**When** it renders
**Then** it has a lilac ground, no global navigation, footer, setup controls, or signup, a visually hidden `h1` "Challenge", `lang="en"`, and a centered safe-area column `{spacing.safe-area-width}` wide holding the Stage mark ("impromptu" with a grape star, not a link, decorative to screen readers) and the Level and mode meta (UX-DR19, UX-DR21)
**And** the grain overlay is suppressed inside the safe area, and the lilac-deep edge fade starts at least 120px from the corner controls (DESIGN → Colors)

**Given** the corner controls
**When** the page renders
**Then** the back and sound Stage icon buttons sit in the viewport corners at `{spacing.header-inset}`, outside the safe area; the sound button shows its state in a glyph plus a "SOUND OFF"/"SOUND ON" caption, is announced as "Sound, off" or "Sound, on", toggles `set_sound`, and persists (FR-16 control; cues come in Epic 4)

**Given** the AD-7 keyboard rule (Cross-Document Resolution 3)
**When** the user presses Esc with no Attempt running
**Then** the app returns to `/` without changing the session, and back does the same (FR-10, FR-30); focus lands on the Setup `h1` or the notice banner (UX-DR31)

**Given** a user opens `/stage` with nothing held
**When** `libraryStatus` is `ready`
**Then** `new_challenge` is dispatched once with the saved setup (AD-7, EXPERIENCE → Information Architecture)
**And** while the store or library is loading, the Stage shows a neutral placeholder and waits for fonts (Bodoni Moda and Instrument Sans, 100ms max wait, then swap) so a filmed Reveal never reflows (EXPERIENCE → Cold load)

### Story 3.10: Challenge composition and stepping through the Reveal

As a creator,
I want empty slots that fill one labeled Input at a time when I press Reveal next, or all at once with Quick reveal,
So that I control the pacing and every Input is clearly identified (FR-13, FR-14, FR-31).

**Acceptance Criteria:**

**Given** a held Challenge with nothing landed
**When** the Stage renders
**Then** each Input kind present shows an Empty slot in its final footprint (1px dashed plum-muted, label inside, same tilt, not focusable, read as "Topic, not revealed yet."), and the sun button reads **Reveal next** and has focus (FR-13, UX-DR12, UX-DR31)

**Given** the user activates **Reveal next** by click, Space, or Enter
**When** `reveal_next` is dispatched
**Then** the next Input lands as its piece: Skill and Medium as Ticket tabs, Topic as the Paper scrap, Style as the Foil slip tucked over the scrap's top-right corner, and Constraint as the Ink stamp on the scrap's bottom band (DESIGN → On the Stage), each with its visible piece label, and label and value counter-rotated to horizontal (UX-DR11)
**And** landed pieces stay readable, the Brief lands last in the Brief block (`{typography.brief-stage}`, plum, 34ch, selectable), and an Explore guidance line appears under it in `{typography.lede}` plum-muted (UX-DR13)
**And** in this story pieces appear instantly; Epic 4 adds shuffle and landing motion

**Given** Quick reveal is on
**When** a Challenge is committed
**Then** the full Challenge appears in one transition no longer than `config.reveal.quickMaxMs` (FR-14)

**Given** screen readers (AD-18, EXPERIENCE → Accessibility Floor)
**When** an Input or the Brief lands
**Then** one Stage-owned `aria-live="polite"` region announces "Topic: coming home." or the full Brief, Quick reveal announces "Challenge ready." followed by each Input and the Brief, and the pieces form a list labeled "Challenge inputs"

**Given** the Stage layout (DESIGN → Challenge Stage)
**When** all pieces have landed at 1280×800, 1440×900, and 1920×1080
**Then** the order inside the column is mark and meta, tabs, scrap with foil and stamp, Brief, Time Limit (a timed Challenge shows "TIME LIMIT 5 MIN"), then the action row; each Input's text box is a keep-out; desktop Input values are at least 24px and the Brief at least 32px (FR-31)
**And** at ≤ 860px the phone ramp applies, the stamp drops below the Topic inside the scrap's band, and the action row is fixed to the column's bottom (UX-DR33)
**And** with everything landed, the action row has no primary action yet; Story 4.3 adds Reroll and Story 5.1 adds **Start creating**

### Story 3.11: A stable Challenge across navigation and reload

As a visitor,
I want my current Challenge to stay exactly as it is when I go back to setup or reload,
So that nothing changes unless I ask for a new one (FR-10, FR-29).

**Acceptance Criteria:**

**Given** a held Challenge (revealed fully or partly)
**When** the user reloads `/stage`
**Then** the same Challenge, Inputs, Brief, and `revealed` progress are restored, and the whole Challenge (or the landed part) is announced once (EXPERIENCE → Reload or Resume)

**Given** a held Challenge
**When** the user goes back to setup, changes setup, and returns to `/stage`
**Then** the held Challenge is unchanged, and the new setup applies only to the next `new_challenge` (FR-10, AD-3)

**Given** Setup with a held, not-started Challenge
**When** section 01 renders
**Then** a Notice banner reads "Your challenge is waiting." with an ink "Back to your challenge" button, and **Get a challenge** remains the sun button and replaces the held Challenge with a new one (UX-DR26)

**Given** `storageAvailable` is `false`
**When** Setup renders
**Then** a Notice banner reads "This browser isn't saving data, so your history won't be kept. Challenges still work.", and generating and revealing still work in memory (FR-29)
**And** when the Repository reports `migrationFailed`, a banner reads "Some older reps couldn't be read. They're still stored."

**Given** the connection drops after first load
**When** the user gets a new Challenge or continues a Reveal
**Then** it works, because the library is bundled client-side (NFR-4)

## Epic 4: The Reveal Show and a Filming-Ready Stage

A creator reveals a Challenge one Input at a time at their own pace, with collage motion, optional sound, and reduced-motion parity. They can Lock and Reroll, and the held Challenge sits still and legible on camera. The 3D shuffle layer is added in Epic 8; this epic is DOM-only.

### Story 4.1: Shuffle and landing motion for each reveal piece

As a creator filming a Reveal,
I want each piece to flick through candidate values and then land with its material feel,
So that each step is a beat I can react to on camera (FR-13, UJ-1).

**Acceptance Criteria:**

**Given** a press of **Reveal next** (EXPERIENCE → State Patterns → Revealing; DESIGN → On the Stage)
**When** the next piece lands
**Then** it shuffles for about 900ms, flicking only values the user's setup allows, in an `aria-hidden` layer, then lands over 550ms (scrap and tabs), 420ms (foil), or 320ms (stamp), and its accessible value is written once, on landing (UX-DR22)
**And** the foil shimmer runs only during a shuffle, and between presses the Stage is still

**Given** a press during a shuffle
**When** the user activates **Reveal next** again
**Then** the current piece completes at once and the next piece does not start until the following press (no skipped step)

**Given** an Input with only one possible value (for example Drawing as the only enabled Medium)
**When** it is revealed
**Then** it lands without a shuffle

**Given** the final press
**When** the Brief arrives
**Then** it fades in over 250ms with no shuffle, together with any guidance line
**And** animations only render `revealed` from the store and never change it (AD-18); a reload mid-shuffle restores the landed pieces and waits for **Reveal next**

**Given** EXPERIENCE → Interaction Primitives → Photosensitivity
**When** a shuffle runs
**Then** flicks swap text only, with no full-area luminance change and no more than 3 flashes per second

### Story 4.2: Reduced-motion parity for the Reveal

As a user who has asked the system for reduced motion,
I want the Reveal to use simple fades,
So that I get the same Challenge with nothing moving that I didn't ask for (FR-17).

**Acceptance Criteria:**

**Given** a single `usePrefersReducedMotion` hook (Accessibility convention)
**When** `prefers-reduced-motion: reduce` is set
**Then** there is no shuffle, no foil shimmer, and no stamp thump; each piece fades in over 120ms; and Quick reveal uses the same fade (EXPERIENCE → Reduced motion)

**Given** reduced motion
**When** a Challenge is fully revealed
**Then** every Input, its label, and the Brief are identical in content, position, and size to the motion version
**And** a Playwright test with reduced-motion emulation reveals a Challenge with the keyboard and checks each landed Input and the Brief are present and announced

### Story 4.3: Lock Inputs and Reroll the rest

As a user who likes part of a Challenge,
I want to lock the Inputs I want to keep and reroll the others as often as I like,
So that I can steer the Challenge without losing what I liked (FR-9).

**Acceptance Criteria:**

**Given** a fully revealed, held Challenge before **Start creating** (AD-7)
**When** the Held state renders
**Then** each piece shows a Lock toggle (52px disc on the piece's outer left edge, fixed name such as "Lock Topic", `aria-pressed`, outline padlock unlocked, ink disc with cream padlock and a "LOCKED" caption when locked), and a **Reroll** line button appears (UX-DR14)
**And** Locks are not shown during the Reveal, and `toggle_lock`/`reroll` are no-ops before the reveal completes

**Given** some Inputs are locked
**When** the user activates **Reroll**
**Then** the store calls `compose()` with `locks` for every locked kind, and the committed Challenge keeps every locked Input identical (FR-9), pushes its recent key (AD-11), and un-lands only the kinds that changed (AD-18)
**And** with Quick reveal on, the changed pieces reshuffle together using Quick reveal timing while locked pieces stay still; with Quick reveal off, the user reveals the changed kinds in order (AD-18; EXPERIENCE → Rerolling)
**And** the live region announces "Rerolled." followed by each changed Input and the Brief, and focus stays on **Reroll**

**Given** repeated Rerolls
**When** the user rerolls many times
**Then** there is no counter, limit, cost, or confirmation dialog (FR-9, no-penalty guardrail, UX-DR35)
**And** Locks persist with the held Challenge across a reload

### Story 4.4: Name the Lock to release when nothing fits

As a user whose Locks leave no valid Challenge,
I want to be told which Lock to release, with a one-tap fix,
So that I never see a broken Challenge or a dead end (FR-9).

**Acceptance Criteria:**

**Given** Locks for which `compose()` returns `{ok:false, reason:'no_compatible', blockingLock}`
**When** the user activates **Reroll**
**Then** the held Challenge stays exactly as it was, and an Inline message under the action row reads "No challenge fits these locks. Unlock Medium to try again." with the kind from `blockingLock`, with copy from `copy.ts` (EXPERIENCE → Lock conflict, UX-DR27)
**And** an "Unlock Medium" line button releases that Lock, focus moves to it when the message appears, and after unlocking focus moves to **Reroll** (UX-DR31)

**Given** the message is shown
**When** a screen reader is running
**Then** the message is announced politely and linked to the action row by `aria-describedby`

### Story 4.5: Hold the composition still, with Skill info on request

As a creator,
I want the finished composition to hold perfectly still until I act, with Skill info only if I ask,
So that the shot is clean and readable (FR-3, FR-15, FR-32, FR-33).

**Acceptance Criteria:**

**Given** the last Reveal step has landed
**When** the Stage enters Held
**Then** all DOM motion stops (shimmer, any looping effect), nothing advances on its own, and the page stays still until **Reroll** or a later action (FR-15, FR-33)
**And** a Playwright check confirms no running CSS animations or transitions on the held Stage after the Brief's 250ms fade

**Given** the Held state
**When** the Stage renders its controls
**Then** only the step-relevant controls show: Locks, **Reroll**, back, sound, and a collapsed Skill Info button beside the Skill tab (FR-32)
**And** the Info button opens the Skill info Popover only on request, closes on Esc (Esc closes the popover first, before any navigation), and is never opened automatically during the Reveal (FR-3, UX-DR9)

**Given** EXPERIENCE → Challenge Stage Filming Contract rule 5
**When** the Stage is held
**Then** no toast, banner, or popover appears on its own

### Story 4.6: Optional reveal sounds

As a creator,
I want optional sound cues for each landing that are off until I turn them on,
So that the Reveal can sound like a show without surprising anyone (FR-16).

**Acceptance Criteria:**

**Given** sound is off (the default)
**When** a Reveal runs
**Then** no audio plays and no audio file is fetched

**Given** the user turns sound on with the Stage sound control
**When** pieces land
**Then** a short cue plays per material (paper drop for the scrap, sticker slap for the foil, stamp thump for the stamp, soft tick for tabs), the state persists across reloads, and cues are same-origin files (AD-13)
**And** sound is independent of reduced motion: under reduced motion, cues still play on landing when sound is on, and Time's up plays one soft chime (EXPERIENCE → Sound; the chime is wired in Story 5.3)

**Given** any cue
**When** it plays
**Then** it is never the only signal: every event it marks is also visible and announced (FR-16)
**And** if the founder has not supplied cue assets, the control still ships and the cue player is a no-op behind a single asset manifest `[ASSUMPTION]` (EXPERIENCE → Open Question 4)

### Story 4.7: Filming contract: fit rule and automated legibility checks

As a creator filming on a phone,
I want the essential content to fit, stay inside the safe area, and stay readable when the recording is downscaled,
So that viewers can read the deliverable within seconds (FR-31, FR-34, SM-2).

**Acceptance Criteria:**

**Given** DESIGN → Challenge Stage → Fit rule
**When** a held timed Challenge with a 160-character Brief is shown at 1280×800
**Then** the composition fits without scrolling by applying the compression steps in order (compact gaps; Topic to `{typography.topic-stage-long}`; countdown caption inline; countdown to `{typography.countdown-phone}`), and only then may the column scroll; type never goes below the minimums (UX-DR20)
**And** a Topic value running past two lines drops to `{typography.topic-stage-long}`

**Given** a Playwright legibility suite at 1280×800, 1440×900, 1920×1080, and 390×844 (EXPERIENCE → Filming Contract rule 6)
**When** it runs over the Empty, Revealing, and Held states with fixture Challenges (shortest and longest Brief, Explore without Style, timed Perform)
**Then** every Input, the Brief, the Time Limit, the primary action, and the brand mark have bounding boxes inside the safe-area column; the back and sound controls sit outside it; computed Brief size is at least 32px and Input values at least 24px on desktop; and no decoration overlaps essential text (FR-31)
**And** at 1920×1080 it saves a screenshot downscaled to 960×540 as a CI artifact for review (FR-34; Testing convention)

**Given** a 9:16 portrait crop of the 1920×1080 viewport, centered
**When** the suite computes the crop rectangle
**Then** every essential element lies inside it (FR-31)

## Epic 5: Create, Finish, Reflect, Go Again

A user starts creating, optionally against a countdown, can pause, resume after closing the tab, or discard without penalty, finishes the Rep, reflects, and chooses a Variation, a Retry, or a new Challenge.

### Story 5.1: Start creating and the untimed creating view

As a user with a held Challenge,
I want to tap Start creating and see a calm view with my Brief while I work,
So that I can make the piece in my own tools with the instruction in view (FR-19).

**Acceptance Criteria:**

**Given** a fully revealed held Challenge
**When** the Held state renders
**Then** the sun button reads **Start creating** (relabelled from **Reveal next** with focus kept on it, UX-DR5, UX-DR31)

**Given** the user activates **Start creating**
**When** `start` is dispatched (accepted only when every kind has landed, AD-7)
**Then** the session moves to Attempt with `startedAt = Clock.now()`, `pausedAt: null`, `pausedTotalMs: 0`, and `timeLimitSec` from the snapshot (AD-8), and the Attempt persists
**And** the composition and Brief stay, Locks and **Reroll** disappear, the sun button reads **Finish rep**, a **Discard** line button appears, and the page is still (FR-19, FR-33; EXPERIENCE → Creating (untimed))

**Given** an Attempt exists
**When** any code path dispatches `new_challenge`
**Then** it is rejected by the reducer (AD-7), and Esc on the Stage does nothing (EXPERIENCE → Interaction Primitives)
**And** back returns to Setup while the Attempt keeps running (EXPERIENCE → Stage icon button)

**Given** the user activates **Discard** on the Stage
**When** `discard` is dispatched
**Then** the session returns to None with nothing saved and no confirmation, message, or record, and the app returns to Setup with focus on the Setup `h1` (FR-21, UX-DR35)

### Story 5.2: Countdown for timed Challenges

As a user doing a timed Perform Challenge,
I want a clear countdown that starts only when I tap Start creating and stays accurate if I switch tabs or reload,
So that the time limit is fair and predictable (FR-18, FR-20).

**Acceptance Criteria:**

**Given** `src/domain/timer` (AD-8)
**When** elapsed time is computed
**Then** it equals `now − startedAt − pausedTotalMs − (pausedAt ? now − pausedAt : 0)`, remaining time and `timeUp` are derived and never stored, and no time value exists before `start`
**And** Vitest tests with a fake `Clock` cover running, paused, backgrounded (large clock jumps), reload (rehydrated Attempt), and exactly-zero cases

**Given** a timed held Challenge, during any Reveal step including Quick reveal
**When** the Stage renders
**Then** the caption reads "TIME LIMIT 5 MIN" (from the snapshot) and the digits do not move (FR-18)

**Given** the user activates **Start creating** on a timed Challenge
**When** the creating view renders
**Then** the Countdown shows mm:ss in `{typography.countdown}` plum with tabular numerals, `role="timer"` and `aria-live="off"`, ticking only by re-rendering from the store (UX-DR15)
**And** a separate visually hidden polite region is written only at each minute mark, at 1:00, and at zero

**Given** the tab is backgrounded for 2 minutes or the page is reloaded mid-countdown
**When** the user returns
**Then** the remaining time reflects real elapsed wall-clock time minus paused time (FR-20)

### Story 5.3: Pause, resume, and Time's up without failure

As a user who gets interrupted or runs out of time,
I want to pause, and to finish calmly after time runs out,
So that the timer never punishes me (FR-20).

**Acceptance Criteria:**

**Given** a running countdown
**When** the user activates "Pause"
**Then** `pause` sets `pausedAt`, the digits hold, the caption reads "PAUSED", the line button reads "Resume", and the polite region announces the pause
**And** "Resume" adds the paused span to `pausedTotalMs`, clears `pausedAt`, and announces the resume

**Given** remaining time reaches zero
**When** the creating view renders
**Then** "time's up." replaces the digits in `{typography.card-title}` plum with the line "Finish when you're ready.", there is no red, flashing, alarm, or overtime count, **Finish rep** stays available, and the polite region announces it once (FR-20, EXPERIENCE → Time's up)
**And** if sound is on, one soft chime plays (EXPERIENCE → Sound)

**Given** the user finishes after time is up
**When** `finish` runs
**Then** `timeUsedSec` is stored as elapsed time capped at the Time Limit (AD-8)

### Story 5.4: Resume or discard an Attempt from Setup

As a user who closed the tab mid-Attempt,
I want to see my Attempt waiting and resume or discard it without guilt,
So that I can pick up where I left off or move on (FR-21).

**Acceptance Criteria:**

**Given** an Attempt in progress and the user is on Setup (after back, or on a fresh visit)
**When** section 01 renders
**Then** a Notice banner reads "You have a challenge in progress." with a **Discard** line button, and the section 01 sun button and every other **Get a challenge** entry point read **Resume** (UX-DR26; EXPERIENCE → Setup → Attempt in progress)

**Given** the user activates **Resume**
**When** `/stage` opens
**Then** it shows the creating state with the exact Brief, Inputs, and a countdown computed from wall-clock time, and announces the whole Challenge once (FR-21)

**Given** the user activates **Discard** on the banner
**When** `discard` is dispatched
**Then** the Attempt is gone with no confirmation, no history record, and no message of failure; focus moves to the Setup `h1`, and the sun button reads **Get a challenge** again (FR-21, no-penalty guardrail)

**Given** two tabs are open (AD-9)
**When** one tab starts an Attempt
**Then** the other tab re-renders to show it, and the rev check prevents a second Attempt from being created

### Story 5.5: Finish rep and the rep-done moment

As a user who finished making something,
I want to mark the Rep done with no upload and get a small moment that acknowledges it,
So that finishing feels good without being judged (FR-22).

**Acceptance Criteria:**

**Given** an Attempt (timed or untimed)
**When** the user activates **Finish rep**
**Then** `finish` assigns a Rep id from `Random.uuid()`, sets `finishedAt` (ISO) and `timeUsedSec` (or null when untimed), and appends the Rep with `reflection: null` to history in the same transition, idempotent by id (Cross-Document Resolution 2, AD-5)
**And** no upload, proof, or rating is requested

**Given** the Finished state
**When** it renders
**Then** the REP DONE stamp (grape-deep double rule, frame tilted 6°, lettering level) lands once in the left half of the scrap's bottom band without covering the Topic or Brief, and "Rep done." is announced via `role="status"` (UX-DR16)
**And** under reduced motion the stamp appears without the thump (FR-22, FR-17)
**And** the copy acknowledges effort only, with no quality words (EXPERIENCE → Voice and Tone)

### Story 5.6: Optional Reflection and Save rep

As a user who just finished,
I want to optionally note what worked and what I'd change, then save,
So that I can learn from the Rep without being forced to write anything (FR-23, FR-27, FR-29).

**Acceptance Criteria:**

**Given** the Finished state
**When** the Reflection panel replaces the action row (DESIGN → Reflection panel)
**Then** it shows "What worked?" and "What would you change?" as optional labelled text fields capped at `config.reflection.maxChars` (280), with a live counter from 240 ("24 left"), typing past the cap blocked (not truncated afterwards), a sun "Save rep" button, and focus on the "Rep done." heading (UX-DR18)
**And** the composition compresses (fit-rule steps 1–2) so the Brief stays visible at 1280×800
**And** every keystroke dispatches `update_reflection_draft`, so a reload restores the panel and the draft (AD-7)

**Given** the user activates "Save rep" with any combination of empty or filled fields
**When** `save_rep` is dispatched
**Then** the Rep's reflection is set (null when both are empty), the session moves to Saved with `lastRepId`, "Rep saved." is announced via `role="status"`, and "Reflection saved." is added when either field had text (FR-23)

**Given** the user leaves the Stage from Finished (back or Esc)
**When** navigation happens
**Then** `save_rep` runs with the current draft first, so the Rep is kept and the session reaches Saved (Cross-Document Resolution 2)

**Given** the first saved Rep in this browser
**When** the Saved state renders
**Then** "Your progress is saved in this browser only." appears with a link to Practice (FR-27)
**And** when `storageAvailable` is false, it reads "This browser isn't saving data, so this rep won't be kept." instead (FR-29)

### Story 5.7: Next steps and Retry

As a user who saved a Rep,
I want clear next steps, including retrying the exact same Challenge,
So that I can go again right away (FR-11, FR-24).

**Acceptance Criteria:**

**Given** the Saved state
**When** it renders
**Then** the Next steps layout shows **Try another version** as the full-width sun button with **Retry** and **Get a challenge** as line buttons side by side below, and focus moves to **Try another version** (FR-24, UX-DR18, UX-DR31)
**And** **Get a challenge** dispatches `new_challenge` and starts a fresh Reveal with the current setup

**Given** the user activates **Retry**
**When** the `retry {fromRepId}` command runs
**Then** it copies the Rep's Challenge snapshot under a new Challenge id with `origin:{kind:'retry', fromRepId}`, never calls `compose()`, does not push a recent key, and commits with every kind already landed, so no Reveal plays (AD-3, AD-11, AD-18)
**And** the Stage opens in Held with identical Inputs, Brief, and Time Limit, the meta tag "RETRY", Locks and **Reroll** hidden, and the announcement "Retry. Challenge ready." followed by the Inputs and the Brief (FR-11)

**Given** `retry` or `vary` are dispatched from any state other than Saved
**When** the reducer handles them
**Then** they are no-ops (AD-7)

### Story 5.8: Try another version (Variation)

As a creator making a part two,
I want to keep my strongest choices and change exactly one Input,
So that I get a related Challenge that pushes me in a new direction (FR-12).

**Acceptance Criteria:**

**Given** the user activates **Try another version** from Saved
**When** the Variation pick state renders
**Then** the prompt reads "Keep your strongest choice. Change one other thing.", each changeable piece (Topic, Style, Constraint, and Medium when another enabled Medium is allowed by the Template; never Skill) becomes a radio option labelled "Change Topic" and so on with the DESIGN Variation option outlines, focus moves to the first option, and the sun button reads "Change it" (UX-DR17)
**And** activating "Change it" with nothing chosen shows "Pick one thing to change."

**Given** the user picks one Input and activates "Change it"
**When** the `vary {fromRepId, kind}` command runs
**Then** it calls `compose()` with every other kind locked and `mustDiffer` on the chosen kind, commits with `origin:{kind:'variation', fromRepId}`, pushes the recent key, and un-lands only the changed kind (AD-3, AD-11, AD-18)
**And** the chosen piece reshuffles while the rest stay, the change is announced ("Style changed: risograph print."), the meta shows "VARIATION", the result is Held without Locks or Reroll, and a "Change it again" line button varies the same kind again against the held value

**Given** the chosen kind has no other compatible value, or its id was retired from the library
**When** `compose()` fails
**Then** the picker stays open with "Nothing else fits here. Pick a different one." and nothing changes (AD-5; EXPERIENCE → Variation with no alternative)
**And** Variation never creates links between Reps beyond the `origin` marker (UX-DR35, no linked Reps)

## Epic 6: Practice History and Practice Map

A user sees what they have practiced, by Skill, Medium, and Level, and every Rep with its Reflection, without quality judgments. They can export to JSON and clear everything.

### Story 6.1: Practice page with empty and storage states

As a user,
I want a Practice page that tells me plainly where my progress lives and what to do when there's nothing yet,
So that I understand my history without an empty table or a guilt message (FR-27, FR-29).

**Acceptance Criteria:**

**Given** `/practice` (AD-1; DESIGN → Practice page)
**When** it renders
**Then** a night header band holds the brand mark, a back-to-setup link, and the `h1` "Practice", and the paper body is a single column at most 760px wide; the page is a Client Component that shows a neutral placeholder until the store is ready (AD-10)

**Given** no Reps
**When** the page renders
**Then** it shows "Nothing here yet." and a **Get a challenge** action (reading **Resume** while an Attempt exists), and the Practice Map is hidden (FR-29)

**Given** at least one Rep
**When** the page renders
**Then** "Your progress is saved in this browser only." appears at the top (FR-27)

**Given** `storageAvailable` is false
**When** the page renders
**Then** it shows "This browser isn't saving data, so there's no history to show." with **Get a challenge**, and Export and Clear are hidden (EXPERIENCE → Practice → Storage unavailable)

### Story 6.2: Practice History Rep cards

As a user,
I want to see every Rep newest first with its Brief, details, and Reflection,
So that I can look back at what I made and what I noticed (FR-25).

**Acceptance Criteria:**

**Given** Reps in history
**When** the Practice History list renders
**Then** Reps appear newest first as Rep cards (DESIGN → Rep card): a meta row (SKILL · MEDIUM · LEVEL · DATE, plus "TIMED 4:12" when `challenge.timeLimitSec` is set, using `timeUsedSec`), the Brief in `{typography.lede}`, and both Reflection answers expanded under small question labels
**And** Retries and Variations show a RETRY or VARIATION outline pill derived from `challenge.origin.kind` (FR-25)

**Given** AD-5
**When** cards render
**Then** every value comes from the Rep's snapshot text only, never from a library lookup, so retired library entries still display correctly
**And** Skill and Medium display names come from the snapshot `revealText`, and kind labels come from `copy.ts`

**Given** v1 scope (EXPERIENCE → Rep card)
**When** a card renders
**Then** it is read-only, with no edit, delete-one, Retry, Variation, share, or link actions (UX-DR35)

### Story 6.3: Practice Map

As a user,
I want counts of my Reps by Skill, Medium, and Level,
So that I can see where I've been practicing without being scored (FR-26).

**Acceptance Criteria:**

**Given** Reps in history
**When** the Practice Map renders above the history
**Then** it shows three groups (Skill, Medium, Level), each a labelled table for screen readers, with every Skill, Medium, and Level listed, counts in `{typography.index-number}`, and an em dash for zero (DESIGN → Practice Map cell)
**And** counts come from the pure derivation in `src/domain/practice`, using the snapshot's `skill`, `medium`, and `level`, with Retries and Variations counted as Reps (AD-5)

**Given** FR-26 and the no-penalty guardrail
**When** the Map renders
**Then** its caption reads "Counts show what you've practiced, not how good it was.", and there are no bars, rings, percentages, goals, streaks, day-gap figures, or quality words anywhere on the page
**And** at 320px the cells wrap two per row (UX-DR33)

### Story 6.4: Export Practice History as JSON

As a user switching laptops,
I want to download my Practice History as a file,
So that I keep a copy of everything I've done (FR-28).

**Acceptance Criteria:**

**Given** Reps in history
**When** the user activates the Export ink button
**Then** the browser downloads `impromptu-practice-YYYY-MM-DD.json` containing `{app:'impromptu', exportVersion, exportedAt, reps}`, validated against the `Export` zod schema (AD-5), and "Exported." is announced via `role="status"` inline
**And** no network request is made

**Given** CSV export is a stretch goal (PRD FR-28; ARCHITECTURE-SPINE → Deferred)
**When** this story ships
**Then** only JSON is offered, and import is not offered (EXPERIENCE → Flow 5)

### Story 6.5: Clear all data with confirmation

As a user,
I want to clear everything stored in this browser after confirming,
So that I can leave nothing behind on a shared or old machine (FR-28).

**Acceptance Criteria:**

**Given** the user activates "Clear all data"
**When** the Dialog opens (DESIGN → Dialog; EXPERIENCE → Dialog)
**Then** it is a modal titled "Clear everything in this browser?" with a focus trap, initial focus on the "Keep my data" line button, an ink "Clear everything" button, and Esc cancels and returns focus to the opener

**Given** the user confirms
**When** `clear_all_data` is dispatched
**Then** the setup, session, and history slices are emptied, setup resets to `config.setup.defaults`, `Repository.clearAll()` removes every `impromptu:*` key, the page shows the Empty state, and "All data cleared." is announced via `role="status"` (AD-7, AD-9)
**And** the held Challenge and any Attempt are gone

## Epic 7: Email Updates and Privacy

A visitor can opt in to occasional emails after a saved Rep or from the footer, with explicit consent and a privacy note, and every email can be unsubscribed. The production environment is ready to send.

### Story 7.1: Subscribe endpoint with consent, honeypot, and Resend

As a visitor who wants updates,
I want my signup handled securely on the server with my consent recorded,
So that my email is used only as I agreed and no key is exposed (FR-35, FR-36, AD-14).

**Acceptance Criteria:**

**Given** `src/shared/subscribe.ts`
**When** it is written
**Then** one zod schema defines the request `{email, consent, consentTextVersion, website}` and the response `{ok:true} | {ok:false, error:'invalid_email'|'consent_required'|'rate_limited'|'unavailable'}`, and it imports only `zod`

**Given** `POST /api/subscribe` as a Node runtime Route Handler using `src/server/email` (resend 6.32.1 added in this story)
**When** a request arrives
**Then** a non-empty `website` returns `{ok:true}` without calling Resend; a malformed email returns `invalid_email`; `consent !== true` returns `consent_required`; otherwise it calls `resend.contacts.create({email, unsubscribed:false, segments:[{id: RESEND_SEGMENT_ID}], properties:{consent_at, consent_text_version}})` with `consent_at` set by the server (ISO 8601)
**And** if `create` errors, it looks the contact up by email; if it exists, it adds the contact to the Segment and updates the two properties without touching `unsubscribed`, and returns `{ok:true}`; any other error returns `unavailable` (AD-14)

**Given** AD-13 and AD-20
**When** the route logs
**Then** no log line contains an email address, `RESEND_API_KEY` and `RESEND_SEGMENT_ID` come from server-only env vars with no `NEXT_PUBLIC_` prefix, and nothing in client code imports `src/server`
**And** Vitest tests with a mocked Resend client cover the honeypot, invalid email, missing consent, new contact, existing contact, and provider failure

### Story 7.2: Email signup form on the Stage and in a reusable footer variant

As a visitor,
I want a quiet signup form that tells me what I'll get and never interrupts a Reveal,
So that I can opt in on my own terms (FR-35, FR-36, NFR-4).

**Acceptance Criteria:**

**Given** the Email signup component (DESIGN → Email signup; EXPERIENCE → Email signup)
**When** it renders
**Then** it has an email field (`type="email"`, `autocomplete="email"`), an unticked consent checkbox with the line "Occasional emails when there's something new. Unsubscribe any time.", a "Sign up" button, a privacy link that opens `/privacy` in a new tab, and a honeypot `website` field off-screen with `aria-hidden="true"`, `tabindex="-1"`, and `autocomplete="off"`
**And** it has a night variant (for the footer, placed by Story 8.1) and a lilac-card variant

**Given** a submission
**When** the client validates with the shared schema
**Then** a malformed email shows "That email doesn't look right." and returns focus to the field; an unticked box shows "Tick the box to confirm you want emails."; errors use `aria-describedby` and `aria-invalid`
**And** while submitting the button reads "Signing up…" and is disabled while fields stay editable

**Given** a response
**When** it arrives
**Then** success replaces the form with "You're on the list." and moves focus there, including for an existing address; a 429 maps to "Too many tries. Wait a minute and try again."; `unavailable` shows "Couldn't sign you up just now. Try again in a moment."; a failed fetch shows "You're offline. Try again when you're connected."; values are kept on every error (FR-36, NFR-4)

**Given** the Saved state on the Stage (Story 5.6)
**When** it renders
**Then** the lilac signup card appears below the next steps and storage note, and the form never appears during a Reveal, Held, or an Attempt, as a modal, or as a gate (FR-35; ARCHITECTURE-SPINE → Signup placement; SM-C1)

### Story 7.3: Privacy note page

As a visitor,
I want a plain privacy note,
So that I know exactly what is stored, where, and how to leave (NFR-5, FR-35).

**Acceptance Criteria:**

**Given** `/privacy` on a paper ground (UX-DR30)
**When** it renders
**Then** it states that practice data stays in this browser only, there is no analytics or tracking, the only personal data is an opted-in email held by Resend with the consent time and text version, emails are occasional updates, every email has an unsubscribe link, and erasure requests are handled by deleting the contact in Resend, with a contact route for such requests (AD-20)
**And** it is statically prerendered, has one `h1`, and links back to Setup

### Story 7.4: Email environments, rate limit, and the launch email checklist

As the founder,
I want production and preview email set up safely with rate limiting and compliant emails,
So that test signups never reach the real list and every email can be unsubscribed (FR-36, FR-37, AD-14, AD-20).

**Acceptance Criteria:**

**Given** AD-20
**When** environments are configured
**Then** Production and Preview each have their own `RESEND_API_KEY` and `RESEND_SEGMENT_ID`, Preview points at a separate test Segment, and Vercel Deployment Protection is on for Preview

**Given** AD-14
**When** the Vercel WAF rule is added
**Then** `/api/subscribe` is limited to 5 requests per 60 s per IP (fixed window, 429), it is confirmed to apply to Preview traffic, and a Preview smoke test shows the 6th request in a minute maps to `rate_limited` in the UI (FR-36)

**Given** the launch checklist (`docs/launch-checklist.md`)
**When** it is completed
**Then** it records: custom domain attached; Resend sending domain on it with SPF and DKIM verified; the two Segments and the `consent_at` and `consent_text_version` string contact properties created in each Resend environment; WAF rule live; Deployment Protection on; and a Preview smoke test that signs up the same address twice and gets `{ok:true}` both times

**Given** FR-37
**When** the Broadcast template is created in Resend
**Then** it includes `{{{RESEND_UNSUBSCRIBE_URL}}}` and the sender's physical address (CAN-SPAM), a test Broadcast to the Preview Segment shows a working one-click unsubscribe, and the app has no unsubscribe route (Cross-Document Resolution 4)

## Epic 8: The Setup Journey and 3D Decor

The landing page becomes the full collage journey (night → lilac → paper → sun → night) with tickers, posters, the footer, the Motion toggle, and the three.js hero and Reveal shuffle layers, all progressive and freezable.

### Story 8.1: Setup journey sections 02–04 and the night footer

As a first-time visitor,
I want the page below the setup to show what's in a Challenge, the four Levels, and the loop,
So that I understand Impromptu after I've already tried it (UX-DR24).

**Acceptance Criteria:**

**Given** EXPERIENCE → Setup page sections and DESIGN → Layout & Spacing
**When** the Setup page renders below section 01
**Then** it shows 02 lilac "what's in a challenge." with a static labelled sample of the five Inputs and a Brief (CL-5 example 2, Brief in `{typography.brief-setup}`) next to the six Skill descriptions; 03 paper "four levels, all open." with the four Level one-liners matching the dial and three poster cards (reveal / make / reflect) staggered 0 / 90 / 40px; and 04 sun with "reveal. make. again." and a second **Get a challenge** (ink button on sun, reading **Resume** while an Attempt exists)
**And** grounds fade across 120–260px seams, never butted, and headlines are lowercase fragments ending in a full stop

**Given** the night footer on Setup, Practice, and Privacy
**When** it renders
**Then** it holds the night Email signup variant from Story 7.2, Practice and Privacy links, "Your progress is saved in this browser only.", and the cream wordmark in `{typography.display}` (FR-35)

**Given** phones (≤ 860px)
**When** the journey renders
**Then** it is one column with a 20px gutter, posters and chrome are hidden, and long text wraps without horizontal scroll at 320px (NFR-2)

### Story 8.2: Journey furniture: tickers, orbit thread, chrome, and assets

As a visitor,
I want the collage-and-Y2K details that make the page feel alive,
So that Impromptu looks like the show it is, without ever covering an instruction (PRD §6).

**Acceptance Criteria:**

**Given** DESIGN → Journey furniture
**When** the Setup page renders
**Then** a sun ticker crosses the night/lilac seam (-2.4°) and a grape-deep ticker crosses the paper/sun seam (2°), each carrying real Topic and Style fragments read from the library in `{typography.style-italic}`, `aria-hidden`, pausing on hover and on focus within
**And** one 2.5px grape orbit thread runs from the hero orbit ring through margins and gutters to the footer and never crosses text; two to four chrome or cutout pieces appear per screen, never behind text, hidden on phones

**Given** the asset list in DESIGN → Assets
**When** assets are added under `public/`
**Then** `hero-bloom-orange`, the three posters, `chrome-*` (6), `paper-scrap.webp`, `ink-mask.png`, `grain.png`, ornaments, cutouts, and the static 3D fallback still are present as original artwork with a manifest (`public/decor/manifest.json`) noting source (Higgsfield or drawn), and each has its DESIGN fallback when missing
**And** poster images carry alt text, decorative images are `aria-hidden`, and the grain overlay (0.1, overlay blend) never sits behind essential text

**Given** the PRD §6 hard rules
**When** a Playwright overlap check runs at 1280, 1440, 1920, and 390px
**Then** no decoration overlaps essential text or controls

### Story 8.3: Motion toggle and ambient motion control

As a visitor sensitive to movement,
I want one switch that stops all ambient motion and stays off,
So that I can use the page comfortably (WCAG 2.2.2, UX-DR10).

**Acceptance Criteria:**

**Given** the Setup and Practice headers
**When** they render
**Then** a Motion toggle button reads "MOTION ON" or "MOTION OFF" with a play or pause glyph and `aria-pressed`, defaults on unless the system requests reduced motion, and persists in `setup.ambientMotion` (Cross-Document Resolution 5)

**Given** Motion off, or `prefers-reduced-motion: reduce`
**When** the Setup page renders
**Then** tickers, cursor depth, chrome bob, orbit drawing, arrival rise-and-fade, and poster tilt all stop, tickers render static, and the 3D hero shows its static fallback (EXPERIENCE → Motion and 3D)
**And** the toggle never appears on the Stage, where motion runs only during shuffles (Cross-Document Resolution 7)

### Story 8.4: Decor component, gate, and the 3D hero

As a visitor on a capable device,
I want the chrome hero piece to tilt with my cursor without slowing the page,
So that the landing feels Y2K-bright while setup stays instant (NFR-3, NFR-7).

**Acceptance Criteria:**

**Given** AD-12
**When** `src/decor` exports `<Decor scene="hero"|"shuffle" mode="ambient"|"shuffle"|"frozen" />` (three 0.186.1 and @types/three added in this story)
**Then** it renders the static fallback image from `public/decor/` immediately; a gate module that does not import three runs after mount and passes only if a WebGL2 context can be created, reduced motion is not requested, Motion is on, and the device is not low-power (`deviceMemory ≤ 4`, `hardwareConcurrency ≤ 4`, or `saveData`; Cross-Document Resolution 6)
**And** only when the gate passes is the three.js scene loaded with `next/dynamic` and `ssr:false`, using plain three.js (no React Three Fiber)

**Given** the hero scene
**When** it runs on `/`
**Then** it renders chrome stars, an inflated shape, or orbital rings in the mockup's Y2K style with cursor-driven depth at the nearest layer depth (DESIGN → Elevation & Depth), fades in over the static art, stays `ambient` even while an Attempt exists, never draws text, and its canvas is `aria-hidden` with `pointer-events:none`
**And** the render loop stops on `document.hidden`, and all GPU resources are disposed on unmount

**Given** a mid-range laptop on broadband and a throttled mid-range phone profile on 4G
**When** Setup loads
**Then** the setup controls are usable within 2 s and 3 s respectively, and the three.js chunk is not on the critical path (NFR-3)
**And** AD-2 import boundaries still pass: `src/decor` imports nothing from `src/domain`, `src/store`, or `src/adapters`

### Story 8.5: The 3D shuffle layer on the Stage and the freeze rule

As a creator filming a Reveal,
I want a 3D flourish behind the column during each shuffle that freezes once the Challenge is held,
So that the Reveal feels like a show and the held shot is perfectly still (FR-33, NFR-7).

**Acceptance Criteria:**

**Given** `/stage` (AD-12 → Control)
**When** a shuffle runs before the Challenge is first held on this visit
**Then** the page sets `<Decor scene="shuffle" mode="shuffle">` behind and around the safe-area column, outside it, never under text, using the same gate and static fallback as Story 8.4

**Given** the reveal completes, or an Attempt exists
**When** the Stage renders
**Then** `mode` is `frozen`, which calls `renderer.setAnimationLoop(null)` and keeps the last frame, and decor stays frozen for the rest of that Stage visit, including during Reroll or Variation piece shuffles, which use DOM animation only (FR-33)
**And** a Playwright check confirms no animation frames are requested by the decor canvas while held or creating

**Given** WebGL is missing or reduced motion is on
**When** a shuffle runs
**Then** the shuffle runs with DOM motion only (or fades under reduced motion), and nothing on the Stage depends on the 3D layer (NFR-7; EXPERIENCE → Flow 1 failure paths)

## Epic 9: Launch Readiness

The release is verified against the PRD's acceptance bars. Each story is a verification pass that fixes what it finds or files a defect against the owning story.

### Story 9.1: Accessibility audit and keyboard end-to-end path

As a keyboard or screen-reader user,
I want every action reachable and every Reveal step announced,
So that Impromptu meets WCAG 2.1 AA (NFR-1).

**Acceptance Criteria:**

**Given** a Playwright keyboard suite
**When** it runs the full loop with the keyboard only (set the dial with arrows, toggle a Medium, Get a challenge, Reveal next with Space and Enter, Lock, Reroll, Start creating, Pause, Resume, Finish rep, Reflection, Save rep, Retry, Variation, Practice, Export, Clear dialog, signup)
**Then** every action works, focus is always visible, and focus moves per EXPERIENCE → Focus targets (UX-DR31)

**Given** an axe scan of every page and Stage state
**When** it runs
**Then** there are no serious or critical violations, every page has one `h1` and `lang="en"`, and every target is at least 52px (UX-DR32)

**Given** DESIGN → Colors verified pairs
**When** contrast is checked in the actual rendered combinations, including text on grape, sun, and foil
**Then** body text is at least 4.5:1 and large display text at least 3:1, and no unverified pair carries text

**Given** a manual screen-reader pass (VoiceOver on Safari and NVDA on Firefox)
**When** the tester runs Flow 1 and Flow 3 from EXPERIENCE → Key Flows
**Then** each landing, the Brief, Reroll, Retry, countdown minute marks, and status messages are announced as specified, and the result is recorded in `docs/a11y-audit.md`

### Story 9.2: Responsive and browser matrix

As a user on any supported device,
I want every feature to work from 320px up, best on desktop,
So that I can use Impromptu on my laptop and my phone (NFR-2).

**Acceptance Criteria:**

**Given** the breakpoints in EXPERIENCE → Responsive & Platform
**When** Playwright runs Setup, Stage (all states), and Practice at 1920, 1440, 1280, 1024, 860, 390, and 320px widths in Chromium, WebKit, and Firefox
**Then** there is no horizontal scroll, long Briefs and values wrap without clipping or overlapping decoration, and the phone Stage keeps the fixed bottom action bar and the stamp below the Topic (UX-DR33)
**And** at 200% zoom nothing is lost, and at 320px CSS width the page reflows without horizontal scrolling

**Given** the browser support matrix (ARCHITECTURE-SPINE → Browser support)
**When** a manual smoke test runs on current and previous Chrome, Safari, Firefox, Edge, iOS Safari, and Android Chrome
**Then** the core loop works in each, and results are recorded in `docs/browser-matrix.md`

### Story 9.3: Performance budgets and offline-after-load

As a visitor,
I want setup to be usable fast and my Reveal or Attempt to keep working if the connection drops,
So that the app never gets in the way (NFR-3, NFR-4).

**Acceptance Criteria:**

**Given** a Lighthouse or Playwright trace on a mid-range laptop profile over broadband and a mid-range phone profile over 4G
**When** Setup loads cold
**Then** setup controls are interactive within 2 s and 3 s respectively, and neither three.js nor the library chunk blocks first interaction (NFR-3); results are recorded in CI or `docs/perf.md`

**Given** a loaded app
**When** the network is set offline in Playwright
**Then** a new Challenge can be composed and revealed, an Attempt can be started and finished, History stays readable, and signup shows the offline error (NFR-4)

### Story 9.4: Privacy verification

As a privacy-conscious visitor,
I want proof that nothing tracks me,
So that the privacy note is true (NFR-5, AD-13).

**Acceptance Criteria:**

**Given** a Playwright run of the full loop with request interception
**When** it records every request
**Then** every browser request is same-origin, there are no analytics, tracking, font CDN, or third-party script requests, and the test fails on any cross-origin request

**Given** the deployed Preview
**When** a signup is made and Vercel function logs are inspected
**Then** no log line contains the email address (AD-13)
**And** the repo contains no `NEXT_PUBLIC_` secret and no runtime AI client under `src/` (AD-1, CL-6)

### Story 9.5: Design sign-off: visual acceptance, filming contract, and photosensitivity

As the founder,
I want the release checked against the PRD §6 visual acceptance check and the filming contract,
So that it looks like Impromptu and films cleanly (PRD §6, FR-31, FR-33, UX-DR34).

**Acceptance Criteria:**

**Given** PRD §6 → Visual acceptance check
**When** a reviewer inspects the build
**Then** they confirm and record in `docs/design-signoff.md`: reveal pieces read as material collage (torn paper, foil, ink stamp); grape and the sun gradient appear as signatures; Bodoni Moda is used on reveal words; at least two Y2K accents appear on Setup; all motion is settled once a Challenge is held; and no decoration overlaps essential text at 1280, 1440, 1920, and 390px

**Given** EXPERIENCE → Challenge Stage Filming Contract
**When** each Stage state is checked at 1280×800, 1440×900, 1920×1080, and 390×844
**Then** all six contract rules hold, including the 160-character fit rule at 1280×800

**Given** the shuffle, chrome glints, and 3D highlights
**When** a PEAT (or equivalent) photosensitivity check runs on a recorded Reveal
**Then** it passes with no more than 3 flashes per second

**Given** the Banned list in EXPERIENCE → Interaction Primitives
**When** the reviewer walks every surface
**Then** none of the banned patterns appears: linked Reps, hashtags, analytics, accounts, auto-advance, an early timer, pop-ups, signup during a Reveal or Attempt, streaks, badges, level-ups, "you missed" messaging, confirmation on Discard or Reroll, infinite scroll, hover-only affordances, or a camera mode (UX-DR35)

### Story 9.6: Moderated test kit for the success metrics

As the founder,
I want ready-to-run protocols for the moderated tests,
So that I can measure SM-1, SM-2, SM-4, and SM-6 without analytics (PRD §10).

**Acceptance Criteria:**

**Given** PRD §10
**When** `docs/moderated-tests.md` is written
**Then** it contains a script, task wording, pass thresholds, and a results table for: SM-1 (≥ 4 of 5 first-time visitors reveal a Challenge within 60 s with no guidance); SM-2 (viewers of a phone recording at feed size state the deliverable within 3 s in ≥ 4 of 5 trials); SM-4 (≥ 3 of 5 testers return within a week and save a Reflection); and SM-6 (≥ 3 of 5 creators film a Reveal and would post it unedited)
**And** it includes the counter-metrics SM-C1 to SM-C3 as explicit "do not optimize" notes

**Given** SM-2 and FR-34
**When** the kit is prepared
**Then** it includes three phone recordings of the Stage (short Brief, 160-character timed Brief, Explore without Style) filmed from a 1920×1080 laptop and the 960×540 downscaled screenshots from Story 4.7, ready to show testers

## Story Coverage Map

Every PRD requirement, Architecture requirement, and UX Design requirement maps to at least one story.

### PRD requirements → stories

| Req | Stories |
|---|---|
| FR-1 | 3.7 |
| FR-2 | 3.2, 3.3, 3.8 |
| FR-3 | 1.3 (Skill `info` data), 3.8, 4.5 |
| FR-4 | 3.2, 3.5, 3.7, 3.8 |
| FR-5 | 1.3, 2.2–2.7, 3.3 |
| FR-6 | 1.4, 1.7, 2.1, 3.3 |
| FR-7 | 1.4, 1.6, 1.8, 2.2–2.8 |
| FR-8 | 3.3, 3.4 |
| FR-9 | 3.3, 4.3, 4.4 |
| FR-10 | 3.4, 3.9, 3.11 |
| FR-11 | 5.7 |
| FR-12 | 5.8 |
| FR-13 | 3.4, 3.10, 4.1 |
| FR-14 | 3.4, 3.8, 3.10 |
| FR-15 | 3.4, 4.5 |
| FR-16 | 3.9, 4.6 |
| FR-17 | 4.2, 5.5 |
| FR-18 | 5.2 |
| FR-19 | 5.1 |
| FR-20 | 5.2, 5.3 |
| FR-21 | 5.1, 5.4 |
| FR-22 | 5.5 |
| FR-23 | 5.6 |
| FR-24 | 5.7 |
| FR-25 | 6.2 |
| FR-26 | 6.3 |
| FR-27 | 3.5, 5.6, 6.1 |
| FR-28 | 6.4, 6.5 |
| FR-29 | 3.5, 3.11, 5.6, 6.1 |
| FR-30 | 3.9 |
| FR-31 | 3.9, 3.10, 4.7, 9.5 |
| FR-32 | 3.9, 4.5, 5.1 |
| FR-33 | 4.5, 5.1, 8.5, 9.5 |
| FR-34 | 4.7, 9.6 |
| FR-35 | 7.1, 7.2, 7.3, 8.1 |
| FR-36 | 7.1, 7.2, 7.4 |
| FR-37 | 7.4 |
| CL-1 | 1.3 |
| CL-2 | 1.7, 2.1–2.8 |
| CL-3 | 1.6, 1.7 |
| CL-4 | 1.6, 2.1, 2.8 |
| CL-5 | 1.5, 2.3, 2.6 |
| CL-6 | 1.8, 1.9, 2.1–2.7, 9.4 |
| NFR-1 | 3.1, 3.7–3.10, 4.2, 4.4, 5.2, 9.1 |
| NFR-2 | 3.7, 3.8, 3.10, 6.3, 8.1, 9.2 |
| NFR-3 | 3.6, 8.4, 9.3 |
| NFR-4 | 3.11, 7.2, 9.3 |
| NFR-5 | 1.2, 3.1, 7.1, 7.3, 9.4 |
| NFR-6 | 1.2, 1.3, 1.6 |
| NFR-7 | 8.4, 8.5 |

### Architecture requirements → stories

| Req | Stories |
|---|---|
| AR-1 starter | 1.1 |
| AR-2 static routes | 1.1, 3.9, 6.1, 7.3 |
| AR-3 layering | 1.2, 8.4 |
| AR-4 ports | 1.2 |
| AR-5 compose | 3.3, 3.6, 4.3, 5.7, 5.8 |
| AR-6 isCompatible | 1.4 |
| AR-7 snapshot schemas | 3.2, 6.2, 6.4 |
| AR-8 ids | 1.3, 1.6 |
| AR-9 reducer + store | 3.2, 3.4, 3.6, 5.1 |
| AR-10 timer | 5.2, 5.3 |
| AR-11 Repository | 3.5, 6.5 |
| AR-12 no stored state in first render | 3.6, 6.1 |
| AR-13 recent ring | 3.3, 3.4 |
| AR-14 decor | 8.4, 8.5 |
| AR-15 no third-party requests | 1.2, 3.1, 4.6, 9.4 |
| AR-16 signup contract | 7.1, 7.2, 7.4 |
| AR-17 library schema | 1.3, 1.4 |
| AR-18 hard gate | 1.6, 1.7, 2.8 |
| AR-19 batch lifecycle | 1.8, 1.9, 2.1–2.7 |
| AR-20 reveal progress | 3.4, 3.10, 4.1, 4.3, 5.7, 5.8 |
| AR-21 config | 1.2 |
| AR-22 environments | 1.1, 7.4 |
| AR-23 conventions | 1.2, 3.1, and every UI story |
| AR-24 volume targets | Epic 2 |

### UX Design requirements → stories

| Req | Stories | Req | Stories |
|---|---|---|---|
| UX-DR1 tokens | 3.1 | UX-DR19 Stage layout | 3.9, 3.10 |
| UX-DR2 fonts | 3.1, 3.9 | UX-DR20 fit rule | 4.7 |
| UX-DR3 focus ring | 3.1 | UX-DR21 Stage meta, mark, `h1` | 3.9, 5.7, 5.8 |
| UX-DR4 grain | 3.9, 8.2 | UX-DR22 motion budget | 4.1, 4.2 |
| UX-DR5 action buttons | 3.1, 5.1 | UX-DR23 sound cues | 4.6, 5.3 |
| UX-DR6 dial | 3.7 | UX-DR24 setup journey | 3.7, 3.8, 8.1 |
| UX-DR7 chip toggle | 3.2, 3.8 | UX-DR25 journey furniture | 8.2 |
| UX-DR8 select, segmented, switch | 3.7, 3.8 | UX-DR26 notice banners | 3.11, 5.4 |
| UX-DR9 info popover | 3.8, 4.5 | UX-DR27 inline message | 3.8, 4.4 |
| UX-DR10 Motion toggle | 8.3 | UX-DR28 Practice page | 6.1–6.5 |
| UX-DR11 reveal pieces | 3.10 | UX-DR29 email signup | 7.2 |
| UX-DR12 empty slots | 3.10 | UX-DR30 privacy page | 7.3 |
| UX-DR13 Brief block, guidance | 3.10 | UX-DR31 focus targets | 3.9, 3.10, 4.4, 5.1, 5.7, 5.8, 9.1 |
| UX-DR14 lock toggle | 4.3 | UX-DR32 accessibility floor | 9.1 (and per story) |
| UX-DR15 countdown | 5.2, 5.3 | UX-DR33 responsive | 3.7, 3.8, 3.10, 6.3, 8.1, 9.2 |
| UX-DR16 rep-done stamp | 5.5 | UX-DR34 filming checks | 4.7, 9.5 |
| UX-DR17 Variation option | 5.8 | UX-DR35 banned patterns | 4.3, 5.1, 6.2, 9.5 |
| UX-DR18 Reflection, next steps | 5.6, 5.7 | UX-DR36 voice / copy map | 3.1 |

## Final Validation Notes

- **Starter template:** Story 1.1 is the AD-1 scaffold (`create-next-app@16.4.0 … --src-dir --no-cache-components`). ✔
- **Entities created when first needed:** library schema in 1.3; session and setup schemas in 3.2; Attempt timing used from 5.1; Export used in 6.4; signup schema in 7.1. three.js is added in 8.4 and resend in 7.1. ✔
- **No forward dependencies:** each story builds only on earlier stories. Where a story mentions a later story (for example 3.10 noting that 4.3 adds Reroll), it is informational, and the earlier story is complete without it. ✔
- **Epic independence:** E2 needs only E1 and runs in parallel with E3–E8 (the E1 pilot batches give the app real data). No epic needs a later epic. ✔
- **File churn (considered and accepted):** Stage components are touched by E3, E4, and E5. The split is kept on purpose: E3 delivers a working, testable Challenge flow first; E4 (the Reveal show) is the riskiest taste work and benefits from a filming feedback loop before E5 builds on the Stage; E5 adds the Attempt lifecycle. Each epic touches distinct states of the same state machine.
- **Story sizing:** each Epic 2 story covers 3–4 batches in one executor session, each batch its own PR. If a session runs long, split a story by Level without changing the acceptance criteria. `[ASSUMPTION]`
- **Story count:** 63 stories across 9 epics.

### Assumptions made in this breakdown

- `[ASSUMPTION]` Coverage enforcement in the hard gate starts off and is switched on in Story 2.8, so the app can build while the library is incomplete. Batch-scoped sizing and every other hard check are always enforced.
- `[ASSUMPTION]` The Epic 1 pilot is `topics-01`, `styles-01`, `constraints-01`, and Observation × Explore.
- `[ASSUMPTION]` Fill targets: 160 Topics, up to 40 Styles (one batch), 80 Constraints (two batches), slightly above the AD Deferred figures because fill batches are 40 entries.
- `[ASSUMPTION]` Each Perform Template batch contains both timed and untimed Templates in every Medium, so the Timed, Untimed, and Either choices always have options.
- `[ASSUMPTION]` If the founder supplies no sound cues, the sound control ships and the cue player is a no-op behind one asset manifest.
- `[ASSUMPTION]` The privacy note gives a contact route for erasure requests.
- `[ASSUMPTION]` The `bmad-help` hand-off at the end of the workflow was skipped in this autonomous run. The next BMad step is `bmad-sprint-planning`.
- Cross-Document Resolutions 2, 3, 5, and 6 above are also assumptions that bind the stories.

### Corrections needed in other documents (applied 2026-10-08)

1. **ARCHITECTURE-SPINE AD-16 and Deferred → Library tuning:** Brief cap 220 → **160** characters (founder-resolved, matches DESIGN `stage-brief-max-chars`).
2. **ARCHITECTURE-SPINE AD-7 state diagram:** `finish` appends the Rep, and `save_rep` attaches the Reflection; leaving the Stage from Finished saves the draft (Resolution 2).
3. **ARCHITECTURE-SPINE AD-9 and AD-19:** add `ambientMotion` to the `Setup` schema and defaults (Resolution 5).
4. **EXPERIENCE → Interaction Primitives:** align the "no page-level key handler" wording with AD-7's Stage handler (Esc, plus Space/Enter only when no control has focus) (Resolution 3).
5. **EXPERIENCE → Information Architecture:** remove the conditional `/unsubscribed` route, since AD-14 uses Resend's managed unsubscribe (Resolution 4).
