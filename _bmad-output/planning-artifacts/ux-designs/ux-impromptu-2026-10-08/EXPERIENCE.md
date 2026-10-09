---
name: Impromptu
status: final
created: 2026-10-08
updated: 2026-10-08
sources:
  - ../../prds/prd-impromptu-2026-10-08/prd.md
  - ../../prds/prd-impromptu-2026-10-08/addendum.md
  - ../../prds/prd-impromptu-2026-10-08/.memlog.md
  - ../../briefs/brief-impromptu-2026-10-08/brief.md
  - 'Cutout design system (style reference only): https://claude.ai/artifact/SnnfBhnRo7Y21JMoWy5qFE'
---

# Impromptu: Experience Spine

## Foundation

Impromptu is responsive web. Desktop (≥ 1280px) is the primary design and test target, and phones (320px and up) come second. It is built in Next.js on Vercel with no account, all state in the browser, and one server route (email signup). There is no third-party UI component library. Components are custom, built to `DESIGN.md`, on native HTML controls wherever one exists. `DESIGN.md` is the visual identity reference. This spine owns the experience, and the PRD owns requirements: FR, NFR, and UJ numbers below point to it, and glossary terms (Challenge, Input, Rep, Attempt, Lock, Reroll, Retry, Variation, Practice History, Practice Map, Challenge Stage) are used exactly as the PRD defines them.

**All UI copy here is working copy.** Final copy is undecided (PRD §11). Labels in **bold** are the PRD's working labels. Other quoted strings are this spine's working proposals `[ASSUMPTION]`.

No mockups or wireframes were produced for this run. Every surface is built from these spines alone.

## Information Architecture

| Surface | Route (working) | Reached from | Purpose | Ground |
|---|---|---|---|---|
| Setup | `/` | Direct entry; back control on the Stage; links in the Practice and Privacy headers | The challenge experience: headline, setup controls, **Get a challenge**; below the fold, a journey that explains Inputs and Levels; footer signup | night → lilac → paper → sun → night |
| Challenge Stage | `/stage` | **Get a challenge**; "Back to your challenge"; **Resume**; **Retry** / **Try another version** | Reveal, held Challenge, creating view, finish, Reflection, next step | lilac |
| Practice | `/practice` | Setup header link; footer link; the storage note after the first saved Rep | Practice Map + Practice History; export; clear | night header, paper body |
| Privacy note | `/privacy` | Signup form link; footer link | What is stored where; what email is for; how to unsubscribe | paper |

- The Stage has no global navigation, footer, or setup controls (FR-30, FR-32). It shows only the composition, the step's controls, back, and sound.
- There is never more than one held Challenge and one Attempt (PRD §3). Both live in browser storage, not in the URL. A Challenge cannot be shared by URL in v1.
- Opening `/stage` directly with nothing held behaves like **Get a challenge** with the saved setup: empty slots appear and wait for **Reveal next**.
- At most one overlay is open at a time: the Clear-all dialog or the Skill info popover. Neither ever opens over the Reveal.

### Setup page sections

| # | Ground | Content |
|---|---|---|
| 01 | night | Headline "Make something unexpected.", the one-line explanation, the setup stack, **Get a challenge**, hero art and the three.js chrome piece; a header with the brand mark and a Practice link |
| — | seam | Sun ticker of real Topic and Style fragments |
| 02 | lilac | "what's in a challenge." A static labeled sample of the five Inputs and a Brief (CL-5 example 2), plus the six Skill descriptions |
| 03 | paper | "four levels, all open." Four Level descriptions matching the dial, and three poster cards for the loop (reveal / make / reflect) |
| — | seam | Grape ticker |
| 04 | sun | One Y2K line (working: "reveal. make. again.") and a second **Get a challenge** (ink button on sun) |
| — | night footer | Email signup, Practice and Privacy links, "Your progress is saved in this browser only." |

Sections 02–04 are explanation, not steps. A first-time visitor can reveal a Challenge without scrolling (SM-1).

## Voice and Tone

Microcopy. The brand voice lives in `DESIGN.md` → Brand & Style. Use the PRD voice: direct, one instruction per step, no motivational fluff, no claims of improvement. Headlines are lowercase fragments ending in a full stop. Buttons are verbs.

| Do (working copy) | Don't |
|---|---|
| "Make something unexpected." | "Unleash your creativity!" |
| **Get a challenge** · **Reveal next** · **Start creating** · **Finish rep** · **Try another version** | "Spin!", "Let's go!", "Submit" |
| "Time's up. Finish when you're ready." | "Time's up! You ran out of time." |
| "Rep saved." / "Reflection saved." | "Amazing work! 🎉", "You're getting better!" |
| "No challenge fits these locks. Unlock Medium to try again." | "Error: no results." |
| "Keep at least one medium on." | "Invalid selection." |
| "Your progress is saved in this browser only." | "Sign up to save your progress!" |
| "You have a challenge in progress." **Resume** / **Discard** | "Don't lose your streak!", "You abandoned a challenge." |
| "Nothing here yet." **Get a challenge** | "You haven't done anything yet." |
| "Counts show what you've practiced, not how good it was." | "Skill level", "Score", "Mastery" |
| "Occasional emails when there's something new. Unsubscribe any time." | "Join 10,000 creators!" |

Rules:
- Never refer to missed days, streaks, decline, or failure. Discard and Time's up are neutral.
- Never praise quality. The completion and Reflection acknowledgements recognize effort ("Rep saved.") and nothing more.
- Error messages name the cause and the fix in one sentence.
- Skill descriptions are one sentence, starting with a verb `[ASSUMPTION]`.

Working copy for the Level one-liners (FR-1) and Skill descriptions (FR-3). The final wording comes from the founder.

| Level | One-liner |
|---|---|
| Explore | "One task, one simple rule." |
| Experiment | "Try more than one way in." |
| Develop | "Aim for an effect, then revise." |
| Perform | "Everything at once. Timed if you want." |

| Skill | Description |
|---|---|
| Observation | "Notice what's actually there." |
| Idea generation | "Come up with many options, fast." |
| Connection | "Join things that don't belong together." |
| Perspective | "See it from somewhere else." |
| Expression | "Make a feeling land." |
| Revision | "Change it on purpose." |

## Component Patterns

Behavioral. Visual specs are in `DESIGN.md` → Components. Names match across both files.

| Component | Use | Behavioral rules |
|---|---|---|
| Sun button | One primary action per view | Activates on click, Enter, or Space. On the Stage it relabels per step (**Reveal next** → **Start creating** → **Finish rep** → "Save rep") and keeps focus across relabels. It is never disabled during a Reveal step. On the focused button, Space/Enter use native activation. The Stage's one key handler (AD-7) adds only Esc, plus Space/Enter for **Reveal next** when no control has focus. |
| Ink button | Secondary strong action | Standard button. "Back to your challenge", Export, the night email signup button. |
| Line button | Quiet actions | **Reroll**, **Discard**, "Pause" / "Resume", "Change it again", "Keep my data". |
| Stage icon button | Back, sound | Always visible on the Stage. Back: with no Attempt running, returns to Setup and keeps the held Challenge (FR-10). With an Attempt running, returns to Setup and the Attempt keeps running. Sound: toggles and persists (FR-16). Its name and state are announced ("Sound, off"). |
| Difficulty Dial | Level (FR-1) | One ARIA slider with four stops. Arrow keys step, Home and End jump, a click on a label or a drag sets the value. The value text joins the Level name and its one-liner ("Experiment. Try more than one way in."). All four stops are always enabled. Choosing Perform shows the Perform timing control beside it. |
| Chip toggle | Enabled Mediums (FR-2) | Toggle buttons (`aria-pressed`). Turning off the last enabled Medium is blocked: the chip stays on and an inline message says "Keep at least one medium on." If the Medium picked under "This time" is turned off, "This time" falls back to Random. |
| Select field | "This time" Medium, Skill focus (FR-2, FR-3) | Native `<select>` styled to `DESIGN.md`. "This time" lists Random plus each enabled Medium. Skill lists Random plus the six Skills. |
| Segmented control | Perform timing | Radio group. Arrows move the selection, and Tab enters and leaves the group. Defaults to Either. |
| Switch | Quick reveal (FR-14) | `role="switch"` with a visible label and an ON/OFF word. The state persists. |
| Info button | Skill info (FR-3) | A toggle button (`aria-expanded`) that opens the Popover. On Setup it sits beside the Skill select. On the Stage it exists only beside the Skill tab, collapsed until asked for. |
| Popover | Skill info | Opens on click or Enter and closes on Esc, an outside click, or a second activation. It returns focus to the Info button. It is never opened automatically. |
| Motion toggle | Setup and Practice headers | Toggle button "Motion" with `aria-pressed`. It stops all ambient motion (WCAG 2.2.2) and persists. It is on by default unless the system requests reduced motion. |
| Ticket tab | Skill, Medium pieces | Static text, plus a Lock toggle while held. |
| Paper scrap / Foil slip / Ink stamp | Topic / Style / Constraint pieces | Static text, plus a Lock toggle while held. Once landed, they never move again during the Reveal (FR-13). |
| Brief block | The Brief | Arrives last. Text is selectable, so users can copy it. |
| Stage mark | Brand mark inside the safe area (FR-31) | Static and not a link on the Stage, so a stray click never leaves mid-shot. It is decorative to screen readers; the Stage `h1` names the page. |
| Empty slot | Pieces before they land | Not focusable. Its label is readable by screen readers as "Topic, not revealed yet." |
| Lock toggle | Lock an Input (FR-9) | Toggle button with a fixed name per piece (for example, "Lock Topic") and `aria-pressed` for its state. Shown only in the held state before **Start creating**, and hidden for a Variation or Retry. Locks persist with the held Challenge. |
| Countdown | Timed Attempt (FR-20) | Before start it shows the Time Limit statically. After **Start creating** it counts down mm:ss from stored wall-clock time minus pauses, correct after backgrounding and reload. "Pause" / "Resume" toggles it. The digits are `role="timer"` with `aria-live="off"`. A separate visually hidden polite region is written only at each minute mark, at 1:00, on pause and resume, and at zero. |
| Rep-done stamp | Completion moment (FR-22) | Lands once on **Finish rep**. Decorative: the accompanying text "Rep done." carries the meaning. |
| Variation option | Pick the Input to change (FR-12) | A radio group over the changeable pieces, labeled "Change Topic" and so on. Changeable: Topic, Style, Constraint, and Medium (only to another enabled Medium the Exercise Template allows). Skill is not changeable, because it defines the exercise `[ASSUMPTION]`. |
| Reflection panel | After **Finish rep** (FR-23) | Holds the two Reflection fields and "Save rep". Focus moves to the "Rep done." heading at its top. |
| Next steps | After "Save rep" (FR-24) | **Try another version**, **Retry**, **Get a challenge**. Focus moves to **Try another version**. |
| Text field | Email, Reflection | Reflection: two optional fields, capped at 280 characters, with a live counter from 240 ("24 left"). Typing past the cap is blocked, not truncated afterwards. Email: `type="email"`, `autocomplete="email"`, validated on submit, not on each keystroke. |
| Consent checkbox | Email opt-in (FR-35) | Unticked by default. Submit is blocked until it is ticked, with an inline message "Tick the box to confirm you want emails." |
| Notice banner | Attempt in progress, Challenge waiting, storage unavailable | Appears at the top of Setup section 01, under the header. It does not dismiss itself and is never a modal. |
| Inline message | Lock conflict, last Medium, form errors | Sits next to the control it concerns and is linked by `aria-describedby`. Announced politely. |
| Email signup | Footer; after a saved Rep (FR-35, FR-36) | Email field + consent checkbox + "Sign up" + a privacy link + a honeypot. The honeypot sits off-screen with `aria-hidden="true"`, `tabindex="-1"`, and `autocomplete="off"`, so keyboard and screen-reader users never reach it. States are listed under State Patterns. Never shown during a Reveal or an Attempt. |
| Dialog | Clear all data (FR-28) | Modal with a focus trap. Initial focus goes to "Keep my data". Esc cancels. Confirming clears Practice History, setup, the held Challenge, and the Attempt, then lands on the empty Practice state. |
| Rep card | Practice History entries (FR-25) | Read-only. Reflection answers are expanded. There are no edit, delete-one, Retry, or Variation actions from Practice History in v1 `[ASSUMPTION]`. |
| Practice Map cell | Practice Map (FR-26) | Read-only counts. Each group (Skill, Medium, Level) is a labeled table for screen readers. |
| Ticker, Orbit thread, Chrome and cutouts (including the three.js hero piece) | Decoration | `aria-hidden`. Tickers pause on hover and on focus within. All stop under reduced motion or the Motion toggle. |
| Setup header, Section header, Poster card, Footer | Journey furniture | Static. The header holds the brand mark (a link to Setup), the Practice link, and the Motion toggle. Poster images carry alt text. |

## State Patterns

### Setup

| State | Treatment |
|---|---|
| First visit | Defaults: Level Explore `[ASSUMPTION]`, all Mediums on, "This time" Random, Skill Random, Quick reveal off, Perform timing Either, sound off. No onboarding and no prompts. |
| Returning | All setup choices restored (FR-4). |
| Challenge waiting (held, not started) | Notice banner: "Your challenge is waiting." with an ink "Back to your challenge" button. **Get a challenge** stays the sun button and replaces the held Challenge with a new one. |
| Attempt in progress | Notice banner: "You have a challenge in progress." with **Discard** (line). The section 01 sun button reads **Resume**, and so does every other **Get a challenge** entry point (section 04, Practice empty state). All of them open the Stage in its creating state until the Attempt is finished or discarded `[ASSUMPTION]`. Discard needs no confirmation and saves nothing (FR-21). |
| Reveal in progress | When the user left mid-Reveal: notice banner "Your challenge is waiting." with "Back to your challenge". Returning resumes at the next unrevealed piece. |
| Storage unavailable | Notice banner: "This browser isn't saving data, so your history won't be kept. Challenges still work." Setup works in memory (FR-29). |
| 3D loading or unavailable | Static hero art shows immediately, and the three.js piece fades in over it once loaded. If WebGL is missing, the static art stays. Setup is never blocked (NFR-3). |
| Offline after load | Generation works. Only the signup reports offline. |

### Challenge Stage

| State | Treatment |
|---|---|
| Empty (pre-Reveal) | Empty slots in their final positions. Sun button **Reveal next**. **Quick reveal** on skips this state. |
| Revealing (step n of 5 or 6) | The current piece shuffles (about 900ms of candidate flicks), then lands. The flicks live in an `aria-hidden` layer, and the piece's accessible value is written once, on landing. The 3D shuffle layer and foil shimmer run only during a shuffle, so between presses the Stage is still. An Input with only one possible value (for example, Drawing as the only enabled Medium) lands without a shuffle. Otherwise the flicks show only values the user's setup allows. Earlier pieces stay readable. The sun button keeps reading **Reveal next**. A press during a shuffle completes that piece at once and does not skip the next one. |
| Brief arrives | The final **Reveal next** brings in the Brief, with a plain 250ms fade and no shuffle. An Explore Challenge with a guidance line shows it directly under the Brief in `{typography.lede}` plum-muted, arriving with the Brief. |
| Explore without Style | No Style slot exists, so the foil slip's corner stays empty and the Reveal has one step fewer. |
| Held | All motion stops and 3D freezes (FR-15, FR-33). Locks appear on each piece, **Reroll** (line) appears, and the sun button reads **Start creating**. A timed Challenge shows "TIME LIMIT 5 MIN". Nothing advances on its own. |
| Rerolling | Unlocked pieces reshuffle together using Quick reveal timing; locked pieces stay still. The result returns to Held and announces "Rerolled." followed by each changed Input and the Brief. Focus stays on **Reroll**. |
| Lock conflict | Unlocked pieces stay as they were. An inline message under the action row reads "No challenge fits these locks. Unlock Medium to try again.", with an "Unlock Medium" line button that releases that Lock (FR-9). Focus moves to the message's button, and after unlocking, to **Reroll**. A broken Challenge is never shown. |
| Creating (untimed) | The composition and Brief stay. Locks and Reroll are gone. The sun button reads **Finish rep**, with a **Discard** line button. Still page. |
| Creating (timed) | As untimed, plus the countdown running and "Pause". The countdown never starts before **Start creating** (FR-18). |
| Paused | The digits hold, the caption reads "PAUSED", and the button reads "Resume". |
| Time's up | "time's up." replaces the digits, plus "Finish when you're ready." **Finish rep** stays. Time used is recorded, and there is no failure state (FR-20). |
| Finished | **Finish rep** writes the Rep to Practice History immediately, with an empty Reflection. The rep-done stamp lands, and "Rep done." is announced (`role="status"`). The Reflection panel replaces the action row: "What worked?" and "What would you change?" (both optional) and a sun "Save rep" (FR-23). "Save rep" attaches the Reflection to that Rep. Back, Esc, or a tab close here keeps the Rep without a Reflection. A reload restores the panel until the user leaves the Stage. Esc is allowed here, because the Attempt is no longer running. |
| Saved | "Rep saved." (plus "Reflection saved." when either field had text), announced via `role="status"`. Next-step actions: **Try another version** (sun), **Retry** (line), **Get a challenge** (line) (FR-24). Below them, the first saved Rep only, "Your progress is saved in this browser only." with a link to Practice (FR-27). Below that, the quiet email-signup card (FR-35). |
| Variation pick | Prompt: "Keep your strongest choice. Change one other thing." Each changeable piece becomes a Variation option ("Change Style"). Focus moves to the first option. The sun button reads "Change it". If it is pressed with nothing chosen, the message "Pick one thing to change." appears. The chosen piece reshuffles and the rest stay, and the change is announced ("Style changed: risograph print."). The result goes to Held without Locks or Reroll; a line "Change it again" changes the same Input again. |
| Variation with no alternative | When the chosen Input has no other compatible value: "Nothing else fits here. Pick a different one." The picker stays open. |
| Retry | The Stage opens straight into Held with the identical Challenge and the meta tag "RETRY". There is no Reveal. "Retry. Challenge ready." is announced, followed by the Inputs and the Brief. Locks and Reroll are hidden, because the Challenge must stay identical (FR-11). |
| Discarded | Returns to Setup, with no message and no record (FR-21). Focus lands on the Setup `h1`. |
| Reload or Resume in any state | Restores the exact state: held Challenge, Locks, Attempt, and countdown (FR-10, FR-20). The whole Challenge is announced once. A mid-shuffle reload restores the pieces already landed and waits for **Reveal next**. |
| Second tab | Last write wins. Each tab listens for `storage` events and re-renders to the latest held Challenge or Attempt, so two tabs never show different Challenges `[ASSUMPTION]`. |
| Cold load | Fonts are preloaded. The Stage renders after Bodoni Moda and Instrument Sans load (100ms max wait, then swap), so a filmed Reveal never reflows mid-shot. |
| Reduced motion | No shuffle and no 3D. Each piece fades in over 120ms. The stamp and rep-done stamp appear without the thump (FR-17). |
| Storage unavailable | Everything works in memory, and a reload loses the held Challenge. The first saved Rep shows "This browser isn't saving data, so this rep won't be kept." in place of the storage note. |

### Practice

| State | Treatment |
|---|---|
| Empty | "Nothing here yet." plus **Get a challenge**. The Practice Map is hidden. No empty table (FR-29). |
| With Reps | Practice Map, then Practice History newest first, with the storage note at the top (FR-27). |
| Storage unavailable | "This browser isn't saving data, so there's no history to show." plus **Get a challenge**. Export and Clear are hidden. |
| Exporting | Export downloads `impromptu-practice-YYYY-MM-DD.json` and confirms with "Exported." inline. CSV is a stretch goal and appears as a second option only if built (FR-28). |
| Cleared | Returns to the Empty state with "All data cleared." announced. |
| Schema migrated | Silent. If a migration fails, the old data is kept untouched and the banner reads "Some older reps couldn't be read. They're still stored." `[ASSUMPTION]` |

### Email signup

| State | Treatment |
|---|---|
| Idle | Email field, unticked consent box, "Sign up", privacy link. |
| Malformed email | "That email doesn't look right." Focus returns to the field. |
| Consent unticked | "Tick the box to confirm you want emails." |
| Submitting | The button reads "Signing up…" and is disabled. Fields stay editable. |
| Success | The form is replaced with "You're on the list." Focus moves to the message. An address that is already on the list gets the same message, so the form never reveals who is subscribed. |
| Rate-limited | "Too many tries. Wait a minute and try again." |
| Offline | "You're offline. Try again when you're connected." The form keeps its values (NFR-4). |
| Server error | "Couldn't sign you up just now. Try again in a moment." The form keeps its values. |

## Interaction Primitives

- **Pointer and touch:** click or tap to act. The Difficulty Dial also drags. Nothing else drags. There are no swipe gestures.
- **Keyboard** (every action reachable, FR-1, FR-13, NFR-1):
  - **Space** and **Enter** activate the focused control. Focus sits on the sun button through the whole Reveal, so either key fires **Reveal next** (FR-13). The Stage key handler (AD-7) handles only Esc, plus Space/Enter when no control has focus; with focus on a control, keys keep their native behavior.
  - **Esc** closes an open popover or dialog first. Otherwise, on the Stage it returns to Setup when no Attempt is running (FR-30), keeping any held or partly revealed Challenge. During an Attempt it does nothing.
  - **Arrow keys** move within the dial and radio groups.
  - No single-letter shortcuts in v1 `[ASSUMPTION]`.
- **Focus targets.** Focus is never lost when a control disappears:

  | Change | Focus goes to |
  |---|---|
  | Stage opens (any entry) | Sun button |
  | Sun button relabels | Stays on it |
  | Reroll | Stays on **Reroll** |
  | Lock conflict → unlock | Unlock button, then **Reroll** |
  | Finish rep | "Rep done." heading in the Reflection panel |
  | Save rep | **Try another version** |
  | Variation pick | First Variation option |
  | Back, Esc, or Discard to Setup | Setup `h1` (or the notice banner when one is shown) |
  | Dialog or popover closes | The control that opened it |
- **Motion budget:**
  - Shuffle ≈ 900ms per piece, then a land of 550ms (scrap), 420ms (foil), or 320ms (stamp). Tabs land like the scrap.
  - Quick reveal: pieces 120ms apart at 260ms each, ≤ 860ms in total (FR-14).
  - Everything ambient (cursor depth, chrome bob, tickers, foil shimmer, orbit drawing) is limited to Setup and the Reveal.
- **Sound:** off by default. When on, each landing plays a short cue (paper drop, sticker slap, stamp thump, soft tick for tabs) and Time's up plays one soft chime. No sound is the only signal for anything (FR-16).
- **Persistence:** setup, the held Challenge, Locks, the Attempt, sound state, and Practice History all write to versioned browser storage on change (FR-4, FR-27).
- **Multi-tab:** last write wins, and other tabs refresh on `storage` events (see State Patterns → Second tab).
- **Photosensitivity:** shuffle flicks swap text only (no full-area luminance change), and chrome glints and 3D highlights stay under 3 flashes per second at any size. A PEAT (or equivalent) check is part of design sign-off.
- **Banned:** linked Reps, hashtags, analytics, accounts, auto-advancing Reveal steps, a timer starting before **Start creating**, pop-ups or interstitials of any kind, signup prompts during a Reveal or Attempt, streaks, badges, level-ups, "you missed" messaging, confirmation dialogs on Discard or Reroll, infinite scroll, and hover-only affordances.

## Accessibility Floor

Behavioral. Visual contrast is verified in `DESIGN.md` → Colors. The target is WCAG 2.1 AA (NFR-1).

- **Keyboard:** every action is operable by keyboard. Tab order follows the visual order. Focus is always visible as the 2px `{colors.focus}` ring at a 3px offset. There are no keyboard traps outside the Clear-all dialog, which traps focus by design and releases it on close.
- **Screen reader, Reveal:** one `aria-live="polite"` region on the Stage announces each landing as "Topic: coming home." and announces the Brief in full when it arrives. Quick reveal announces the whole Challenge once, as "Challenge ready." followed by each Input and the Brief. Empty slots read as "not revealed yet".
- **Screen reader, other changes:** Reroll, Variation, Retry, Resume, and restore-on-reload each announce through the same Stage region (see State Patterns). "Rep done.", "Rep saved.", "Reflection saved.", "Exported.", and "All data cleared." use `role="status"`.
- **Motion control:** besides honoring `prefers-reduced-motion`, the Motion toggle in the Setup and Practice headers stops all ambient motion (WCAG 2.2.2). Stage motion runs only during each shuffle, which lasts under 5 seconds.
- **Screen reader, structure:** each page has one `h1` (Setup: the headline; Stage: visually hidden "Challenge"; Practice: "Practice"). The pieces are a list labeled "Challenge inputs". Decoration, tickers, the orbit thread, and the 3D canvas are `aria-hidden`.
- **Reduced motion** (`prefers-reduced-motion: reduce`): no shuffle, parallax, bob, tickers, shimmer, or 3D. The static hero fallback is shown. Pieces fade in over 120ms. Every Input and the Brief are equally readable (FR-17, NFR-7).
- **Targets:** at least 52px for every control (above the 44px floor), including lock toggles and the Stage icon buttons.
- **Text and reflow:** zoom to 200% without loss, and reflow at 320px CSS width (400% zoom) without horizontal scrolling. The phone column has no minimum width. At 200% the Stage column scrolls rather than clipping. Long values wrap (`overflow-wrap: anywhere`) at every breakpoint.
- **Not by color alone:** lock, sound, toggle, selected, and error states each carry a glyph or a word.
- **Timing:** the countdown never ends the Attempt. Pause is always available. Time's up removes no options (this meets WCAG 2.2.1).
- **Forms:** labels are visible and programmatically tied to their fields. Errors use `aria-describedby` with `aria-invalid`. Success and error messages are announced.
- **Language:** `lang="en"` on every page.

## Challenge Stage Filming Contract

This section is added because filming is the product's social job (UJ-1, SM-2, SM-6). These rules hold on every Stage state:

1. **Safe area.** Every Input, the Brief, the Time Limit or countdown, the primary action, and the brand mark sit inside the centered column (`{spacing.safe-area-width}`, at most 9/16 of the viewport height). This survives a 9:16 portrait crop of a landscape screen (FR-31).
2. **Outside the safe area:** the back control, the sound control, and decoration only. Cropping them away loses nothing essential.
3. **Minimum sizes on desktop:** Brief 32px, Input values 24px (`DESIGN.md` → Typography, Stage ramp). Type never shrinks to fit.
4. **Stillness.** From Held onward, nothing on the page moves except the countdown digits: no 3D, foil, chrome, cursor depth, or ambient loops (FR-33).
5. **No overlays.** No toasts, banners, or popovers appear on their own while held or creating. The Skill info popover opens only when asked for and closes on Esc.
6. **Legibility test.** A 1920×1080 recording downscaled to 960×540 keeps the Brief readable (FR-34). Designers check each Stage state at 1280×800, 1440×900, 1920×1080, and 390×844 before sign-off, alongside the PRD §6 visual acceptance check.

## Motion and 3D

This section is added to give one place to the ownership rules for three.js (NFR-7).

| Where | What moves | Stops when |
|---|---|---|
| Setup hero | three.js chrome piece with cursor depth; image chrome bob; orbit ring | Reduced motion, the Motion toggle, no WebGL, a low-power device (`navigator.hardwareConcurrency` ≤ 4 or a Save-Data hint) `[ASSUMPTION]`, or a hidden tab (the render loop pauses) |
| Setup journey | Tickers, orbit thread drawing on scroll, arrival rise-and-fade, poster tilt on hover | Reduced motion or the Motion toggle |
| Stage, Revealing | Piece shuffles; three.js shuffle layer behind and around the column; foil shimmer, all only during a shuffle | The end of each shuffle; permanently at Held for that Challenge. Reroll replays only the piece shuffles, and the 3D layer stays frozen `[ASSUMPTION]` |
| Stage, Held and after | Countdown digits only | — |

3D is loaded client-side after first paint and never blocks user interaction. Text is never rendered in the canvas.

## Responsive & Platform

| Breakpoint | Setup | Stage | Practice |
|---|---|---|---|
| ≥ 1280px (primary) | Two-column hero, setup stack left, art right; full journey with tickers and chrome | Lilac ground, centered safe-area column, corner controls, edge decoration | Single 760px column on paper |
| 861–1279px | Hero stacks art behind controls at reduced size; journey kept | Same as desktop; decoration narrows to the visible margins | Same |
| ≤ 860px (phone) | One column, 20px gutter; hero art masked into night below the controls; dial becomes a horizontal track; chrome, posters, and orbit thread hidden; tickers kept, static under reduced motion | Full-width column; stamp drops below the Topic; type at the phone ramp; action row fixed at the bottom of the column; back and sound stay in the top corners | Same column at gutter width |
| 320px floor | All features work; segmented controls wrap onto two lines | Pieces stack fully; the column scrolls if needed | Map cells wrap two per row |

Desktop Chrome, Safari, Firefox, and Edge (current and previous versions); iOS Safari and Android Chrome on phones `[ASSUMPTION]`. No install, no PWA in v1.

## Inspiration & Anti-patterns

- **Lifted from the filmed "let the wheel decide" format:** the Reveal as a beat the creator reacts to, with one press per beat so the creator sets the pacing on camera (product brief; PRD §1).
- **Lifted from Cutout:** the journey-not-stack setup page, material reveal pieces, and huge serif against tiny meta.
- **Rejected: generic spinner widgets.** A wheel UI, random word mashups, and a utility look. The Reveal is part of the show.
- **Rejected: habit-app mechanics.** Streaks, reminders, badges, and "you missed a day" messaging (PRD §8).
- **Rejected: a camera mode toggle.** Filming readiness is the Stage's default, not a mode (founder decision).
- **Rejected: an in-site canvas or upload.** Making happens in the user's own tools (PRD §8).
- **Rejected: quality signals.** No scores, ratings, or fill-to-goal Practice Map visuals.

## Key Flows

### Flow 1: Dani films a reveal for her next post (UJ-1)

Dani is an illustrator with about 8k followers. It is her first visit, on a laptop filmed by a phone on a tripod.

1. Dani opens Impromptu. Section 01 shows "Make something unexpected.", the setup stack, and the chrome piece tilting with her cursor.
2. She turns the Difficulty Dial to Experiment, and the description updates beneath it.
3. She turns off every Medium chip except Drawing. "This time" now offers Random and Drawing. She leaves Skill on Random.
4. She clicks **Get a challenge**. The Stage opens on lilac with empty dashed slots, the brand mark, and **Reveal next**.
5. She presses **Reveal next** five times. The Skill tab shuffles and lands, then the Drawing tab lands straight away (it was her only Medium). The torn-paper Topic, the foil Style, and the stamped Constraint each shuffle before landing, and she reacts to each on camera.
6. She presses once more and the Brief fades in last.
7. **Climax:** everything stops. The composition holds still, with the Brief at 32px in the center column. Her phone's 9:16 frame crops the sides of the laptop and loses only the back and sound controls. Her viewers can read exactly what she has to draw.
8. She clicks **Start creating**, draws off-camera, comes back, and clicks **Finish rep**. The REP DONE stamp lands.
9. She leaves both Reflection fields empty and clicks "Save rep". The Stage shows "Rep saved.", "Your progress is saved in this browser only.", and the next steps.
10. She clicks **Try another version**, picks Style, and clicks "Change it". The foil slip reshuffles while everything else holds. Part two is ready.

Failure paths: pressing **Reveal next** mid-shuffle completes that piece instead of skipping one. Reloading mid-Reveal keeps the landed pieces. If WebGL is missing, the shuffle runs without the 3D layer.

### Flow 2: Marcus gets a quick daily rep in (UJ-2)

Marcus is a product designer who practices photography on his lunch break. He is a returning visitor, and his Practice History is in this browser.

1. Marcus opens Impromptu. His setup is restored, with **Quick reveal** on.
2. He clicks **Get a challenge**. The full Challenge appears in under a second, and the screen reader region announces "Challenge ready."
3. He locks Medium (Photography) and clicks **Reroll**. The unlocked pieces reshuffle together while Photography stays put.
4. **Climax:** the Brief reads "Take two photos of coming home. Make one feel comforting and the other lonely. Keep people out of both."
5. He clicks **Start creating**. Then he gets pulled into a meeting and closes the tab.
6. Next day he opens Impromptu. The banner reads "You have a challenge in progress." He clicks **Resume**, and the Stage opens in the creating state.
7. He shoots, clicks **Finish rep**, writes one line under "What would you change?", and clicks "Save rep". The Stage shows "Rep saved." and "Reflection saved."
8. He opens Practice. The Expression count has gone up by one, and the newest Rep card shows his line.

Failure paths: if he had locked Medium, Topic, and Constraint into a set with no compatible Exercise Template, the Stage would say "No challenge fits these locks. Unlock Constraint to try again." and offer the unlock. If he had clicked **Discard** on the banner instead, the Attempt would be gone with no record and no message.

### Flow 3: Priya runs a timed Perform challenge (UJ-3)

Priya is a writer and spoken-word performer who has been doing untimed Reps for a month.

1. Priya turns the dial to Perform. The Perform timing control appears, and she picks **Timed**.
2. She clicks **Get a challenge** and reveals each piece in turn. The Brief lands last: "Write three premises for a first date that feels like horror, even though nothing bad happens." The caption reads "TIME LIMIT 5 MIN", and the digits are not moving.
3. She clicks **Start creating**. The countdown begins at 05:00.
4. At 02:10 she clicks "Pause" to answer the door, then "Resume". The digits continue from where they stopped.
5. **Climax:** at zero the digits become "time's up." and the caption reads "Finish when you're ready." There is no alarm and no red. She finishes her sentence.
6. She clicks **Finish rep** and saves without a Reflection. The Rep records the time used.
7. She clicks **Retry**. The identical Challenge opens already held, tagged RETRY, with the same 5-minute limit.
8. After her second Rep she opens Practice. Both Reps appear, the newer one marked Retry, each with its time used.

Failure path: if she reloads mid-countdown, the countdown resumes from wall-clock time minus pauses.

### Flow 4: Dani signs up for updates (FR-35, FR-36)

Dani continues from Flow 1, after saving her Variation Rep.

1. Under the next-step actions, the quiet card reads "Occasional emails when there's something new. Unsubscribe any time."
2. She types her email and clicks "Sign up" without ticking the box. The form shows "Tick the box to confirm you want emails."
3. She opens the privacy link, which opens the Privacy note in a new tab so the Stage is undisturbed `[ASSUMPTION]`. She reads that her email is the only data collected and returns.
4. She ticks the box and clicks "Sign up". The button reads "Signing up…".
5. **Climax:** the card becomes "You're on the list." Her Stage and Rep are untouched, and the signup never interrupted the show.

Failure paths: a malformed address shows "That email doesn't look right."; offline shows "You're offline. Try again when you're connected." with values kept; rate-limited shows "Too many tries. Wait a minute and try again."

### Flow 5: Marcus exports and clears his history (FR-28)

Marcus continues from Flow 2, months later, switching laptops.

1. On Practice, he clicks Export. `impromptu-practice-2027-02-01.json` downloads, and "Exported." appears.
2. He clicks "Clear all data". The dialog asks "Clear everything in this browser?" with focus on "Keep my data".
3. He tabs to "Clear everything" and confirms.
4. **Climax:** Practice shows "Nothing here yet." with **Get a challenge**. The old laptop holds nothing, and his file holds everything.

Not in v1: importing the JSON on the new laptop. This is a deliberate gap (no accounts or sync, PRD §9.2).

## Open Questions

1. **Final UI copy** (founder). Every label and string here is working copy (PRD §11).
2. **Stage ground** (founder taste). This spine puts the Stage on lilac for even camera exposure. Should it be night instead, for a more dramatic look on film?
3. **Skill and Medium pieces** (founder taste). Cutout defines only three pieces. This spine adds cream ticket tabs for Skill and Medium. Confirm, or name another material.
4. **Reveal sounds** (founder). Are sounds wanted at launch, and who produces the four cues? If not, the sound control still ships (FR-16) and defaults to off.

Non-founder items handed off:
- The email template design, including the sender address and the one-click unsubscribe (FR-37). Owner: architecture and story-dev.
- The asset build manifest and the static 3D fallback still. Owner: architecture (`DESIGN.md` → Components, Assets).
- The 160-character Brief cap. Owner: the library validator (CL-3).

## Assumptions Index

Every assumption is logged in `.memlog.md`. The load-bearing ones are:

- **Surfaces:** IA and routes; the Setup journey content in 02–04; Practice on paper. (No Unsubscribed page: AD-14 uses Resend's managed unsubscribe.)
- **Stage materials and type:** the Stage ground (lilac); ticket tabs for Skill and Medium; reveal order Skill → Medium → Topic → Style → Constraint → Brief; the Stage type ramp and phone sizes; the safe-area formula and scroll-instead-of-shrink.
- **Reveal behavior:** Quick reveal timing; a press during a shuffle completes the piece.
- **Attempts and repeats:** back during an Attempt keeps it running; **Resume** replaces **Get a challenge** while an Attempt exists; Variation hides Locks and Reroll; Retry skips the Reveal.
- **Practice History:** Rep cards have no actions in v1.
- **Setup defaults:** default Level Explore; the dial renders as a horizontal track on phones.
- **Review fixes:**
  - Select fields replace segments for "This time" and Skill.
  - **Finish rep** writes the Rep, and "Save rep" attaches the Reflection.
  - Skill is not changeable in a Variation.
  - Multi-tab is last-write-wins.
  - A single-value Input lands without a shuffle.
  - The Motion toggle.
  - The low-power 3D trigger.
  - The 160-character Brief cap.
- **Platform:** sound cues; no single-letter shortcuts; the browser support matrix.
