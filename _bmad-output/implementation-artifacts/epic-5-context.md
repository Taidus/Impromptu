# Epic 5 Context: Create, Finish, Reflect, Go Again

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

A user who holds a revealed Challenge moves into making the piece, with a calm creating view and (for Perform) a fair wall-clock countdown that can be paused and never fails them, even after backgrounding, reload, or closing the tab. Finishing the Rep gives a small, non-judging acknowledgement and an optional, uncapped-skip Reflection, and saving opens three honest next moves: an identical Retry, a one-change Variation, or a fresh Challenge. Nothing here is gated, scored, or penalized — Discard at any point loses nothing and leaves no trace.

## Stories

- Story 5.1: Start creating and the untimed creating view
- Story 5.2: Countdown for timed Challenges
- Story 5.3: Pause, resume, and Time's up without failure
- Story 5.4: Resume or discard an Attempt from Setup
- Story 5.5: Finish rep and the rep-done moment
- Story 5.6: Optional Reflection and Save rep
- Story 5.7: Next steps and Retry
- Story 5.8: Try another version (Variation)

## Requirements & Constraints

- Start creating converts the held Challenge into the one active Attempt; Brief stays visible; only Finish rep and Discard are available (no upload/proof ever).
- Timed Attempts show a pausable countdown starting only on Start creating and accurate across backgrounding/reload (wall-clock minus paused time). At zero: no failure state, no red/flashing, Finish rep still works, time used still recorded (capped at the limit).
- An Attempt survives reload or tab close; returning offers Resume or Discard, instantly, with no confirmation, message, or history record.
- Finish rep needs no upload or proof; gives a brief effort-acknowledging moment respecting reduced motion, with no quality language.
- Reflection (two optional fields, 280 chars each, live counter from 240) is valid empty; saving with content gets its own small acknowledgement.
- After saving, the app always offers Try another version, Retry, and Get a challenge.
- No Reroll counters, overtime count, streaks, "you missed" messaging, or confirmation dialogs on Discard anywhere in this epic.
- Browser-only, versioned persistence that survives schema changes; if storage is unavailable, Challenges still work and the Rep won't be kept.
- Accessibility: every control keyboard-operable, visible focus, equal-information reduced-motion fallback; countdown is `role="timer"`/`aria-live="off"` with a separate polite region at minute marks, 1:00, and zero.

## Technical Decisions

- **State machine:** one pure reducer in `src/domain/session` drives None → Held → Attempt → Finished → Saved → Held (via retry/vary/new); at most one held Challenge and one Attempt ever exist. Events owned here: `start`, `pause`, `resume`, `finish`, `update_reflection_draft`, `save_rep`, `discard`, plus commands `retry {fromRepId}` and `vary {fromRepId, kind}`. Any (state, event) pair outside the diagram is a no-op (`new_challenge` rejected during an Attempt; `retry`/`vary` only from Saved).
- **Timers are derived, never stored:** an Attempt stores only `startedAt` (epoch ms), `pausedAt|null`, `pausedTotalMs`, `timeLimitSec|null`. Elapsed = `now − startedAt − pausedTotalMs − (pausedAt ? now − pausedAt : 0)`; remaining and `timeUp` are always computed, never stored. Time comes only from an injected `Clock.now()`. `timeUsedSec` is written at `finish`, capped at the limit when timed.
- **Rep write sequencing** (resolves an EXPERIENCE/AD-7 conflict): `finish` appends the Rep immediately with `reflection: null` (id from `Random.uuid()`, idempotent by id) and sets `lastRepId`; `save_rep` idempotently upserts the reflection and moves to Saved. The Finished draft persists across reloads; leaving `/stage` from Finished (back or Esc) dispatches `save_rep` with whatever draft exists, so a Rep is never silently lost.
- **Retry bypasses the generator:** copies the stored Challenge snapshot verbatim under a new id with `origin:{kind:'retry', fromRepId}`, commits with every Input already landed (no Reveal plays), and skips the recent-repeat ring.
- **Variation calls the same `compose()`** as everything else: every other Input locked, `mustDiffer` set on the chosen kind, origin `{kind:'variation', fromRepId}`, recent key pushed, only the changed kind un-landed. Changeable: Topic, Style, Constraint, Medium (to another enabled Medium the Template allows) — never Skill. No compatible alternative, or a retired id, surfaces `{ok:false, reason:'no_compatible'}` with nothing changed.
- **Keyboard** (resolves an EXPERIENCE/AD-7 conflict): the one Stage-level handler owns Esc plus Space/Enter only when no control has focus; a focused button uses native activation. During an Attempt, Esc does nothing; back still returns to Setup with the Attempt running.
- **Storage:** Repository is the only `localStorage` accessor, versioned envelopes with a `rev` check preventing two tabs from creating two Attempts (last write wins, tabs re-render on `storage` events). `config.reflection.maxChars = 280` is the sole source for the cap.

## UX & Interaction Patterns

- Creating view: composition and Brief stay as revealed; Locks/Reroll disappear; sun button reads "Finish rep" with a "Discard" line button; otherwise still.
- Countdown caption reads "TIME LIMIT 5 MIN" before start, "PAUSED" while paused; at zero the digits are replaced by "time's up." plus "Finish when you're ready." — no overtime count. One soft chime on Time's up if sound is on.
- Setup shows a Notice banner "You have a challenge in progress." with Discard whenever an Attempt exists; every "Get a challenge" entry point relabels to "Resume" and opens `/stage` into the creating state.
- Finished: the "REP DONE" stamp (grape-deep, tilted frame, level lettering) lands once in the scrap's bottom band without covering Topic or Brief; "Rep done." announces via `role="status"`; under reduced motion it appears without the thump.
- Reflection panel replaces the action row (cream, ink border), two stacked optional fields and sun "Save rep"; focus lands on the "Rep done." heading; composition compresses so the Brief stays visible.
- Saved: "Rep saved." (+ "Reflection saved." if either field had text) via `role="status"`. Next steps: full-width sun "Try another version" with "Retry" and "Get a challenge" as line buttons side by side below; focus moves to "Try another version". First saved Rep ever shows the browser-only storage note (or its unavailable variant).
- Retry opens straight into Held with meta tag "RETRY", Locks/Reroll hidden, one announcement "Retry. Challenge ready." then Inputs and Brief — no Reveal plays.
- Variation pick: prompt "Keep your strongest choice. Change one other thing."; each changeable piece is a dashed-outline radio option ("Change Topic" etc.); choosing one reshuffles and announces the change (e.g. "Style changed: risograph print."); "Change it again" repeats against the held value. No alternative → "Nothing else fits here. Pick a different one.", picker stays open.
- Focus targets: Finish rep → "Rep done." heading; Save rep → "Try another version"; Variation pick → first option; Discard/Back/Esc → Setup `h1`.

## Cross-Story Dependencies

- Depends on Epic 3's `compose()`, session store, and recent-repeat ring, and on Epic 4's completed Reveal (every Input landed) as the precondition for `start`.
- Within the epic: 5.1 creates the Attempt that 5.2/5.3 render the countdown from; 5.4 is the Setup-side mirror of 5.1–5.3 (same Attempt, via Resume); 5.5 → 5.6 → 5.7 are sequential transitions (Finished → Saved); 5.8 and the Retry half of 5.7 fire only from Saved and both land back in the Held state that Epic 4's Reveal/Lock UI renders.
- Epic 6 (Practice History and Map) reads only the Rep records written here at `finish`/`save_rep`, including the `origin` tag for Retry/Variation marking.
- Epic 7's email signup card appears on Saved only after the first saved Rep, below Next steps — never during an Attempt or Finished.
