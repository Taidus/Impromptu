---
review: reconcile
target: ../ARCHITECTURE-SPINE.md
inputs:
  - ../../../prds/prd-impromptu-2026-10-08/prd.md
  - ../../../prds/prd-impromptu-2026-10-08/addendum.md
  - ../../../prds/prd-impromptu-2026-10-08/.memlog.md
  - ../../../ux-designs/ux-impromptu-2026-10-08/.memlog.md
  - ../../../ux-designs/ux-impromptu-2026-10-08/DESIGN.md (EXPERIENCE.md not present)
date: 2026-10-08
---

# Reconciliation review: Architecture Spine vs PRD / addendum / UX

## Verdict

**Pass with required additions.** The spine covers all FR/NFR/CL areas and contains no hard contradiction with the PRD. It has two **High** gaps: the Rep record and the Finished/Saved lifecycle are undefined, so independent builders will produce incompatible history, export, and reload behavior. It also has several **Medium** gaps where builders would make different choices: setup state and events, Stage keyboard and navigation, Reroll/Variation semantics, the no-penalty guardrail, and the Explore guidance line. There are two soft conflicts with the UX memlog: Locks before the reveal completes, and Quick reveal as a preference versus an event. No High finding needs a new ADR. Each one fits as a clause in an existing AD.

Only gaps where builders could diverge, and contradictions, are listed. Deliberate terseness is not flagged.

---

## High

### R-1. Rep record and export shape are undefined
- **Sources:** FR-23, FR-25, FR-26, FR-27 (versioned), FR-28 (JSON export); spine AD-5, AD-9, Deferred ("Export is JSON only, using the AD-5 snapshot shape").
- **Gap:** AD-5 defines the Challenge snapshot and AD-8 defines Attempt timing, but nothing defines a **Rep**. Unspecified: `repId`, `finishedAt`, whether the full Challenge snapshot is embedded or referenced, `timeUsedSec`, `wasTimed`, Reflection field names (`worked` / `change`?), whether empty Reflection is stored as `""` or `null`, and where `origin` lives (on the Challenge or on the Rep). The export file also has no envelope: no `{v, exportedAt, reps}` and no reuse of the storage version. History rendering, Practice Map derivation, migrations, and export will each invent their own shape.
- **Fix:** Add to AD-5 (or a new AD-5b) one zod `Rep` schema in `src/domain`: `{id, challenge: ChallengeSnapshot, startedAt, finishedAt (ISO), timeUsedSec, timed: boolean, reflection: {worked: string|null, change: string|null}}`, with `origin` kept on the embedded Challenge. Define export as `{v, exportedAt, reps: Rep[]}`, newest first, the same shape `impromptu:history` stores.

### R-2. Finished and Saved states are not persisted or bounded
- **Sources:** Glossary (Rep = finished Attempt *saved*), FR-21, FR-22, FR-23, FR-24, FR-27 ("the active Attempt persist[s]").
- **Gap:** AD-9 says `impromptu:session` holds "held Challenge, reveal progress, Attempt". It does not say whether **Finished** (Reflection pending) or **Saved** (next-step choice) persist. If the user reloads, closes the tab, or presses back after **Finish rep** but before **Save rep**, one builder loses the Rep, one auto-saves it, and one restores the Reflection form. The state machine also has no exit from Finished other than `save_rep`: there is no `discard`, no `new_challenge`, and nothing for leaving the page. Saved → `retry`/`vary` needs `fromRepId`, but it is not stated that Saved keeps it. FR-35 ("offer appears after a saved Rep") also depends on Saved being a real state.
- **Fix:** In AD-7 and AD-9, state that `impromptu:session` persists the Finished state (with `finishedAt`, `timeUsedSec`, and the draft Reflection) and the Saved state (with `lastRepId`). Decide what leaving Finished does. Recommended: it stays Finished and resumes on return, matching the FR-21 posture, and `new_challenge` from Finished auto-saves with an empty Reflection. Put that decision in the diagram.

---

## Medium

### R-3. Setup state: fields, defaults, and mutation events are unspecified
- **Sources:** FR-1 (Perform default Either), FR-2 (pick one Medium *or* random among enabled; default all enabled + random), FR-3, FR-4 (persists Level, timing, Mediums, Skill focus, **Quick reveal**, **sound/mute**), FR-16 (sound off by default, toggled on the Stage).
- **Gap:**
  - AD-9 names `impromptu:setup` but not its fields.
  - The AD-3 compose request carries "enabled Mediums" but not the "This time" choice (one Medium versus random), which the UX segmented control exposes.
  - Quick reveal and sound appear nowhere except the Deferred note on sound.
  - The first-visit defaults are not in `config`. The default **Level** is not stated anywhere, in the PRD or the spine.
  - AD-7 lists only session events, yet "State mutation: only through store events" applies. Builders will either write setup directly or invent their own events, and the Stage sound toggle has to write setup from `/stage`.
- **Fix:** Add a `Setup` zod schema to `src/domain`: `{level, performTiming: 'timed'|'untimed'|'either', enabledMediums[], mediumChoice: 'random'|mediumId, skillFocus: 'random'|skillId, quickReveal: boolean, soundOn: boolean}`. Put `setup.defaults` in `src/config/app.ts` (Level explore?, Either, all Mediums, random, random, false, false). Add setup events such as `set_setup` and `toggle_sound` to AD-7. Enforce "at least one enabled Medium" (FR-2) in the reducer.

### R-4. Stage keyboard and navigation rules are missing (Esc, Space/Enter, entry guards)
- **Sources:** FR-13 (Space/Enter activate Reveal next), FR-30 (Esc returns to setup when no Attempt is running), UX memlog ("Esc does nothing while an Attempt runs"; back during an Attempt returns to Setup and the Attempt keeps running).
- **Gap:**
  - The spine never mentions Esc or the Space/Enter shortcut.
  - It does not say how Space/Enter interact with a focused Lock toggle, Reroll, or the Skill info button, since native Space activates the focused control. Two builders will bind the shortcut differently (global listener versus Reveal-next autofocus).
  - It does not say what Esc does in the Finished or Saved state, or while a popover is open (popover close first?).
  - A direct visit to `/stage` with no held Challenge (state None) is undefined: redirect, compose, or empty state?
  - **Get a challenge** on setup while an Attempt exists has no transition in the diagram. Is it disabled, does it prompt Discard, or does it replace the Attempt?
- **Fix:** Add a short "Stage input map" clause to AD-7 or AD-18:
  - Space/Enter dispatch `reveal_next` only while reveal is incomplete and focus is on the body or Reveal next.
  - Esc closes the open popover first. Otherwise it navigates to `/` when no Attempt exists and does nothing during an Attempt.
  - `/stage` in None redirects to `/`.
  - With an Attempt, setup replaces Get a challenge with the Resume/Discard banner.

### R-5. Reroll and Variation semantics: setup source, reveal replay, Lock timing
- **Sources:** FR-9, FR-10 ("new setup applies to the next Challenge"), FR-12, FR-15; UX memlog (Lock toggles appear only in the held state before Start creating; Variation turns pieces into a single-choice picker, the chosen piece re-shuffles, Locks and Reroll are hidden and replaced by "Change it again").
- **Gap:**
  - **Which setup does Reroll use?** It could be the current setup or the held Challenge's own Level, Medium, and Skill. After FR-10's "setup changed meanwhile", builders will differ. The same question applies to Variation's filters. AD-3 fixes only the Level.
  - **Reveal after Reroll and Variation.** It is not stated whether these reset `revealedCount` and replay the sequential reveal, honour Quick reveal, or land complete. The UX implies that only the changed piece re-shuffles for Variation.
  - **Soft conflict with UX.** The state machine allows `toggle_lock` and `reroll` in Held at any reveal step. The UX shows Locks only after the reveal is complete.
  - **"Change it again"** has no event. It is unclear whether `mustDiffer` is computed against the original Rep or the previous variation, and whether each attempt pushes to the recent ring.
- **Fix:** Add to AD-3:
  - Reroll and Variation use the held Challenge's `level`, and the current setup's Medium and Skill filters for unlocked Inputs.
  - Locked Inputs always win.
  - Reroll resets `revealedCount` to 0, or to complete when `quickReveal` is on.
  - Variation commits with every piece revealed except the changed one.
  - `toggle_lock` and `reroll` are only valid when the reveal is complete.
  - "Change it again" is `vary` again with the same Input and `mustDiffer` set to the current value. Each one pushes to the ring.

### R-6. The no-penalty and tone stance has no architectural guardrail
- **Sources:** §2.1 (emotional JTBD), FR-1 (no Level suggestions or gating), FR-9 (unlimited Reroll, no penalty), FR-20 ("Time's up", no failure state), FR-21 (Discard: no penalty or failure message), FR-22 (never judges quality), FR-26 (no streaks, "missed a day", or penalties), §6 Voice, §8, SM-C3.
- **Gap:** The spine has a copy map but no rule about what the domain may derive or what the UI may say. Builders could plausibly add any of these:
  - a "you'll lose your progress" confirmation on Discard;
  - red or flashing Time's up (the UX forbids it, but the spine does not);
  - overtime or negative countdown;
  - "days practiced" or a last-active date in Practice Map derivation;
  - a Reroll counter;
  - a Level suggestion after N Reps (stale suggested-level thresholds remain in the PRD memlog line 12, superseded by line 19).
- **Fix:** Add a Consistency Conventions row, "Tone & no-penalty":
  - `src/domain/practice` derives only counts by Skill, Medium, and Level (no dates, gaps, streaks, ratios, or scores);
  - nothing counts Reroll or Discard;
  - Discard needs no confirmation and shows no message;
  - `timeUp` is a neutral state with no overtime display;
  - no Level suggestion logic exists;
  - every copy-map string follows §6 Voice (direct, no motivational fluff, no claims of improvement).

### R-7. The Explore guidance line and Brief slot text are missing from the schema and snapshot
- **Sources:** FR-5 (Explore: "optional guidance line"), addendum Template shape (`guidance` optional), FR-7.
- **Gap:** AD-15 and AD-5 omit `guidance`. One builder will put it inside the Brief, which counts against the 1–3 sentence and 220-character gate, and another will drop it. It is also unspecified whether a slot renders the fill's `label` or its `revealText` into the Brief, and what the pieces display. AD-5 stores both, but their roles are not given.
- **Fix:** Add `guidance?: string` (Explore only, gated) to the Template schema and `guidance|null` to the snapshot. State that the Brief renders `revealText` into slots and that pieces display `label`, or the reverse, but state it once in `src/domain/library/render`.

### R-8. Quick reveal is modeled as an event, but the PRD and UX treat it as a preference
- **Sources:** FR-14, UJ-2 ("taps Get a challenge with Quick reveal on. The full Challenge appears at once"), UX memlog (120 ms stagger and 260 ms per piece, at most 860 ms).
- **Gap:** AD-18 lists `quick_reveal` as an event with no statement of who dispatches it. One builder will require a tap. Another will auto-dispatch on Stage entry when `setup.quickReveal` is true. The interaction with Retry, which already lands complete, is clear. The interaction with Reroll is not (see R-5).
- **Fix:** In AD-18, state that when `setup.quickReveal` is true, committing a new or rerolled Challenge dispatches `quick_reveal` automatically. A manual `quick_reveal` (a "show all" control) is optional.

---

## Low

### R-9. Signup details: consent timestamp, offline errors, client validation
- **Sources:** addendum (stored consent timestamp), FR-36, NFR-4 ("email signup shows a clear offline error").
- **Gaps:**
  - AD-14 sends `consent_at` but does not say who sets it or in what format. It should be set server-side as an ISO 8601 string at request time and never trusted from the client.
  - The response union has no network or offline case, so builders will map a failed `fetch` differently. Add a client-only `offline` reason to the copy map.
  - "The client form imports the schema type-only" rules out shared runtime validation. Either allow a value import of the zod schema (it is client-safe) or say explicitly that the client does no format validation and relies on the server's `invalid_email`.
  - "An existing contact counts as success" leaves open whether consent properties are updated, and whether a previously unsubscribed contact is re-subscribed. State the choice. Recommended: no update, and never flip `unsubscribed`.
  - Trim and lowercase the email before the call.

### R-10. Scope of "clear all data"
- **Source:** FR-28.
- **Gap:** It is unclear whether Clear removes all four keys, including setup and a running Attempt, or only history and recent. Builders will diverge.
- **Fix:** In AD-9, specify `clearAll()` = remove all four `impromptu:*` keys and reset the store to defaults. The Attempt goes too, behind the confirm dialog the UX already specifies.

### R-11. The FR-8 window counts "revealed" Challenges; AD-11 counts "committed" ones
- **Source:** FR-8 ("revealed in the last N Challenges, finished or not"), PRD memlog line 30.
- **Gap:** Under AD-11, a Reroll fired mid-reveal (allowed by the current diagram) pushes keys the user never saw. This is mostly moot if R-5 restricts Reroll to a complete reveal.
- **Fix:** Note in AD-11 that "committed" is the deliberate proxy for "revealed", or push on reveal completion.

### R-12. Brief cap versus the Stage layout
- **Sources:** AD-16 (220 characters), DESIGN.md (`brief-block` 34ch at 32/44, and the column "scrolls" when the viewport is too short).
- **Gap:** A 220-character Brief at 34ch is about 7 lines, roughly 300 px. Add the pieces and the countdown, and the column may scroll at 1280×800, which is the UX filming baseline. Scrolling on a filmed Stage breaks FR-31. This is a cross-check, not a contradiction.
- **Fix:** Add a Playwright case: the longest Brief in the library at 1280×800 is fully visible without scrolling. Alternatively, tune the cap in the validator config (already listed as tunable in Deferred).

### R-13. Where Skill and Level copy lives
- **Sources:** FR-1 (a one-line description per Level), FR-3 (Skill info explanations).
- **Gap:** Mediums are library data. Skills (six, fixed) and the Level descriptions have no stated home: code constants, `copy.ts`, or library data. This matters because Skill ids appear in Templates and in the validator.
- **Fix:** State that Skill and Level ids are domain constants in `src/domain` (enums the zod schema uses), and that their descriptions live in `copy.ts`.

---

## Checked and consistent (no action)

- Back during an Attempt keeps it running, and setup shows Resume/Discard: AD-7 matches the UX memlog.
- Retry lands held with no reveal (AD-18 `revealComplete`). The RETRY and VARIATION tags come from `origin` (AD-3), consistent with "no linked reps".
- Unsubscribe uses the Resend-managed link (AD-14), matching UX memlog line 33.
- Routes `/`, `/stage`, `/practice`, `/privacy` (AD-1) match the UX IA assumption.
- Timers come from wall-clock time, can pause, and record time used capped at the limit (AD-8), matching FR-20.
- 3D is limited to the hero and shuffle, freezes when held, renders no text, and falls back to static images (AD-12), matching NFR-7 and the UX.
- The "storage unavailable" copy (AD-9 `storageAvailable`) matches FR-29.
- No analytics and fonts self-hosted (AD-13), matching NFR-5 and the DESIGN.md self-hosted WOFF2.
- Time Limits live in library data rather than the addendum's config table. NFR-6 permits either, and AD-15 and AD-16 gate them.
- The stale "suggested-level thresholds" in PRD memlog line 12 are superseded by line 19. The spine correctly has none (see R-6 for the guard).
