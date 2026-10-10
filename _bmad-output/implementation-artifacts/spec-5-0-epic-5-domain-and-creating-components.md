---
title: 'Epic 5 phase 1: session events, timer domain, and the creating components (Stories 5.1–5.8, pure parts)'
type: 'feature'
created: '2026-10-10'
status: 'done'
baseline_commit: 'b3558d8'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-5-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Epic 5 (create, finish, reflect, go again) needs the AD-7 session events beyond `reveal_next`, the AD-8 timer math, and the creating-view components. The Stage files (`StagePage.tsx`, `RevealComposition.tsx`) are being rewritten by the Epic 4 stories in another session, so the wiring must wait.

**Approach:** Phase 1 ships everything pure and standalone, with no edit to `src/components/stage/StagePage.tsx`, `RevealComposition.tsx`, `pieces.tsx`, `logic.ts`, `reveal-logic.ts`, or `src/components/setup/NoticeBanners.tsx`:
1. **Timer domain** `src/domain/timer/timer.ts`: `elapsedMs(attempt, nowMs)`, `remainingSec(attempt, nowMs)` (null when untimed), `timeUp(attempt, nowMs)`, `timeUsedSec(attempt, nowMs)` (elapsed in whole seconds, capped at the limit when timed), `formatCountdown(sec)` → `mm:ss`. Pure, Clock-free (callers pass `nowMs`).
2. **Session events** in `src/domain/session/session-reducer.ts`: `start {nowMs}` (Held → Attempt only when every present kind has landed; Attempt `{ startedAt: nowMs, pausedAt: null, pausedTotalMs: 0, timeLimitSec: challenge.timeLimitSec }`; locks cleared), `pause {nowMs}` / `resume {nowMs}` (Attempt only; no-op when already paused/running), `finish {nowMs, repId}` (Attempt → Finished: a `Rep { id: repId, challenge, finishedAt: new Date(nowMs).toISOString(), timeUsedSec: timed ? timeUsedSec : null, reflection: null }` is returned alongside the session so the store appends it to history in the same transition and sets `lastRepId`; `reflectionDraft` reset to `{ worked: "", change: "" }`), `update_reflection_draft {reflection}` (Finished only), `save_rep` (Finished → Saved; the store attaches the draft to the Rep by id, `null` when both fields are blank), `discard` (Attempt → None, attempt and challenge cleared, nothing recorded), `challenge_committed` also accepted from Saved (→ Held; `retry` commits with every present kind already landed when `recentKey === null` and `origin.kind === "retry"`), `compose_failed` also accepted from Saved (stays Saved). `new_challenge`-driven `challenge_committed` stays rejected during Attempt/Finished. The reducer signature becomes `sessionReducer(session, event, setup) → { session, rep?: Rep }`? No: keep `(session, event, setup) → Session` and export a separate pure `finishRep(session, nowMs, repId): { session: Session; rep: Rep } | null` used by the store; `finish` as a reducer event is then not needed (document this in Implementation Notes).
3. **Store**: `dispatchSession` handles the new events; a new command `finish_rep` calls `finishRep` with `clock.now()` and `random.uuid()`, appends the Rep to `history` (idempotent by id) and persists session + history in one transition; `save_rep` attaches `reflectionDraft` to the Rep with `lastRepId` (idempotent upsert, null when both blank) and persists; `retry {fromRepId}` copies that Rep's Challenge under `random.uuid()` with `origin {kind:"retry", fromRepId}` and dispatches `challenge_committed` with `recentKey: null` (never composes); `vary {fromRepId, kind}` is NOT in this phase (needs compose changes; Story 5.8 phase 2). `new_challenge` is rejected by the reducer during an Attempt (already true via Held-only commit) and the command layer must not compose while `session.state === "attempt" || "finished"`.
4. **Components** under `src/components/stage/creating/` (prop-driven, no store, unit-tested with `renderToStaticMarkup`): `Countdown` (`{ remainingSec, paused, timeUp }` → digits in `text-countdown` plum with tabular numerals, `role="timer" aria-live="off"`; caption `TIME LIMIT n MIN` / `PAUSED`; at zero the "time's up." `card-title` line plus "Finish when you're ready."), `CountdownAnnouncer` (`{ remainingSec, paused, timeUp }` → a visually hidden `aria-live="polite"` region whose text changes only at minute marks, 1:00, zero, pause and resume), `RepDoneStamp` (grape-deep double rule, `text-stamp-stage`, frame tilted 6°, lettering level, `data-decor`), `ReflectionPanel` (`{ draft, onChange, onSave, saving? }` → cream panel, two labelled textareas capped at `config.reflection.maxChars` with a live counter from 240 ("24 left") and `maxLength`, sun "Save rep"), `NextSteps` (`{ onVariation, onRetry, onNew, firstSave, storageAvailable }` → full-width sun "Try another version", line "Retry" and "Get a challenge" side by side, the FR-27/FR-29 note), `VariationPicker` (`{ options: {kind, label}[], value, onChange, onConfirm, error }` → prompt, radio group "Change Topic" etc., sun "Change it", the "Pick one thing to change." / "Nothing else fits here." messages).
5. **Copy**: every string above in `copy.ts` (`copy.stage.*`, `copy.button.*`, `copy.state.*` as they exist; add what is missing).

## Boundaries & Constraints

**Always:**
- Pure domain: no `Date.now`, `Math.random`, `crypto`, storage, or React in `src/domain`; times come in as `nowMs`.
- AD-8 math exactly: `elapsed = now − startedAt − pausedTotalMs − (pausedAt ? now − pausedAt : 0)`; remaining and timeUp derived, never stored; `timeUsedSec = min(floor(elapsed/1000), timeLimitSec)` when timed.
- Reducer: any (state, event) pair outside AD-7 is a no-op returning the same reference; keep the exhaustiveness guard; tests for every transition and every rejected pair (including `new_challenge` commit during Attempt and Finished, `retry` from non-Saved).
- Timer tests with a fake clock: running, paused, resumed, backgrounded (large jumps), rehydrated Attempt (construct the Attempt from stored numbers), exactly zero, negative guard (never below 0), untimed (`remainingSec === null`, `timeUp === false`).
- Store tests: finish appends exactly one Rep (idempotent on a repeated command with the same id), save_rep attaches/upserts, retry copies with a new id and no recent key, commands rejected during Attempt/Finished.
- Components: tokens only; `role="timer"`; reduced motion is a class hook (`motion-reduce:`) only, no animation in this phase; no imports from `StagePage`/`RevealComposition`.
- Nothing in this phase changes what the Stage renders today.

**Never:**
- Do not edit `StagePage.tsx`, `RevealComposition.tsx`, `pieces.tsx`, `logic.ts`, `reveal-logic.ts`, `NoticeBanners.tsx`, or e2e/stage.spec.ts (Epic 4 owns them until the 4.5 ping). No `vary`. No sound. No new dependencies.

</frozen-after-approval>

## Code Map

- `src/domain/session/schema.ts` -- `Session` (`state`, `challenge`, `revealed`, `locks`, `attempt`, `reflectionDraft`, `lastRepId`, `lastComposeError`, `recent`), `Attempt`, `Rep`, `Reflection`, `ReflectionInput`, `Origin`; `session-reducer.ts` -- `SessionEvent` (`challenge_committed`, `compose_failed`, `reveal_next`), `presentKinds`, `commitChallenge`; `session-fixture.ts` -- `baseChallenge`, `fullChallenge`, `noneSession`, `heldSession`, `attemptSession`, `finishedSession`, `savedSession`.
- `src/store/store.ts` -- `dispatch` (commands: `new_challenge`; `pendingCommands` queue; `runCommand`), `dispatchSession`, `persist`, slices with revs; `src/store/types.ts` -- `StoreCommand`, `StoreDeps { clock, random, repository, librarySource }`; `src/store/store.test.ts` -- `makeDeps`, fake clock/random patterns; `src/domain/test-doubles.ts` -- `fakeClock`, `seededRandom`.
- `src/config/app.ts` -- `reflection.maxChars: 280`, `reveal.order`.
- `src/components/stage/` -- existing `pieces.tsx` (piece markup), `icons.tsx`; `src/components/SunButton.tsx`, `LineButton.tsx`, `InkButton.tsx`, `ground.ts`, `setup/InlineStatus.tsx` (`className` prop).
- `src/styles/tokens.css` -- `--typography-countdown-*`, `--typography-countdown-phone-*`, `--typography-stamp-stage-*`, `--typography-card-title-*` vars; utilities `text-card-title`, `text-meta`, `text-body`, `text-lede`, `text-button` exist; add `text-countdown`, `text-countdown-phone`, `text-stamp-stage` in the `@utility` form.
- `src/components/copy.ts` -- `copy.button` (`startCreating`, `finishRep`, `tryAnotherVersion`, `retry`, `saveRep`, `discard`, `resume`, `pause`, `changeItAgain`, `getAChallenge`), `copy.state` (`timesUp`, `repSaved`, `reflectionSaved`, `progressSavedInBrowserOnly`), `copy.stage.*`.

## Tasks & Acceptance

**Execution:**
- [ ] `src/domain/timer/timer.ts` + `timer.test.ts`.
- [ ] `src/domain/session/session-reducer.ts` + tests -- `start`, `pause`, `resume`, `update_reflection_draft`, `save_rep`, `discard`, Saved → Held / Saved → Saved; `finishRep`; rejected pairs.
- [ ] `src/store/types.ts`, `store.ts`, `store.test.ts` -- `finish_rep`, `save_rep` path, `retry`; guards during Attempt/Finished.
- [ ] `src/styles/tokens.css` -- countdown and stamp-stage utilities.
- [ ] `src/components/copy.ts` -- missing strings.
- [ ] `src/components/stage/creating/{Countdown,CountdownAnnouncer,RepDoneStamp,ReflectionPanel,NextSteps,VariationPicker}.tsx` + `creating.test.ts`.

**Acceptance Criteria:**
- Given an Attempt and a fake clock, then elapsed, remaining, timeUp and timeUsedSec follow AD-8 across running, paused, backgrounded and rehydrated cases.
- Given the reducer, then every AD-7 transition for start/pause/resume/finish/save_rep/discard and Saved → Held works and every other pair is a no-op.
- Given the store, then finishing appends one Rep idempotently, saving attaches the reflection, retry copies without composing, and new_challenge is refused during an Attempt or Finished.
- Given the components, then each renders its design state from props with the required roles and copy.
- Given lint, typecheck, unit tests, build, check:static and the full e2e suite, then all pass with the Stage unchanged.

## Implementation Notes

- `finish` is not a `SessionEvent`: the store calls the pure `finishRep(session, nowMs, repId, finishedAt)` (it returns the Rep too); the store builds `finishedAt` from the same Clock reading so `src/domain` never touches `Date`.
- Command gating: only `new_challenge` waits for the library (`isReadyToCompose()`); `finish_rep`/`save_rep`/`retry` need only `status === "ready"`. `hydrate()` drains anything already runnable, and the library-error path drops only a queued `new_challenge`.
- `runFinishRep` persists the session first (reapply re-runs `finishRep` on the fresh session), then appends the Rep to history only if the persisted session is Finished with `lastRepId === repId`; the history reapply falls back to `[]`. A repeated `finish_rep` is a no-op once Finished (idempotent). `runSaveRep` sets `saveFailed` and stays Finished when the Rep is missing from history, and trims each field (blank → `null`).
- `retry` is refused outside Saved (AD-7). `resume` clamps the paused span at 0; `update_reflection_draft` slices both fields to `config.reflection.maxChars`; `formatCountdown` renders non-finite input as `00:00`.
- `Countdown` takes `timeLimitSec`: the caption `TIME LIMIT n MIN` (`Math.round(timeLimitSec / 60)`) or `PAUSED` sits above the digits in `text-stage-meta` (phone variant below desktop). `copy.state.timesUp` was removed as an unused duplicate of `copy.stage.countdown.timesUp*`.
- `VariationPicker`: prompt "Keep your strongest choice. Change one other thing." always rendered and labelling the radiogroup; `error?: "nothing_chosen" | "no_alternative"` shows its message in a separate `<p role="alert">`; with no options the no-alternative alert shows. Change it stays enabled with nothing picked and is disabled only for a value the picker doesn't offer (or with no options at all).
- `ReflectionPanel`: labels "What worked?" / "What would you change?" (`copy.reflection.*Label`) in `text-label`; each counter is an always-mounted `aria-live="polite"` element the textarea `aria-describedby`s, showing "n left" from 240 characters, clamped at 0.
- Deferred: CountdownAnnouncer crossing-based minute marks and the resume announcement go to the phase 2 Stage wiring (deferred-work.md).

## Spec Change Log

## Review Triage Log

- [patch] `resume` can write a negative `pausedTotalMs` when the clock steps back, which makes the stored Session unparseable and wipes the Attempt: clamp with `Math.max(0, nowMs - pausedAt)`; reducer test that the result parses. (blind-hunter)
- [patch] `finish_rep`, `save_rep`, `retry` are gated behind `isReadyToCompose()` though none needs the library: gate only `new_challenge` on the library; the others need only hydration. Test: `finish_rep` works while `libraryStatus === "error"`. (blind-hunter)
- [patch] Countdown caption derives from `remainingSec` and counts down: add `timeLimitSec` prop, caption `TIME LIMIT n MIN` from `Math.round(timeLimitSec / 60)`, caption above the digits in `text-stage-meta`. (blind-hunter)
- [patch] Variation copy: prompt "Keep your strongest choice. Change one other thing.", message "Pick one thing to change." only when Change it is pressed with nothing chosen, "Nothing else fits here. Pick a different one." for no alternative; keep the prompt rendered, message in its own `<p role="alert">`, `error?: "nothing_chosen" | "no_alternative"`, button not disabled, radiogroup `aria-labelledby` the prompt. (blind-hunter)
- [patch] `runFinishRep` persists history before session, so a session rev conflict can orphan a Rep: persist the session first, append the Rep only when the persisted session is Finished with `lastRepId === repId`; history `reapply(null)` falls back to `[]`, not the stale in-memory list. (blind-hunter)
- [patch] `retry` must be accepted only from Saved (AD-7): guard `state.session.state !== "saved"` and add the test. (blind-hunter)
- [patch] ReflectionPanel labels "What worked?" / "What would you change?" (new `copy.reflection.workedLabel` / `changeLabel`) in `text-label`; counter gets an id, `aria-live="polite"`, and the textarea `aria-describedby` it. (blind-hunter)
- [patch] Store tests: force the history rev-conflict path (second repository handle writes history between hydrate and `finish_rep`), a timed run with `clock.advance` asserting `timeUsedSec` and `finishedAt`, and the retry-from-non-Saved guard. (blind-hunter)
- [defer] CountdownAnnouncer minute-mark equality can miss a mark on a late tick, and resume is not announced: the Stage wiring (phase 2) owns the previous tick and will announce on crossing. Recorded in deferred-work.md. (blind-hunter)
- [patch] Copy duplication: derive the countdown time's-up body from `copy.state.timesUp` or delete the unused entry. (blind-hunter)
- [patch] `finishRep` test strictly under the limit with paused time excluded: `pausedTotalMs: 5_000`, `finishRep(s, 70_500, ...)` → `timeUsedSec === 65`. (verification-gap)
- [patch] Store asserts `finishedAt` equals the fake clock's ISO time. (verification-gap)
- [patch] `new_challenge` guard during Attempt/Finished observed via a spy on `random.next` (no compose calls). (verification-gap)
- [patch] VariationPicker tests assert `role="alert"` present only with a message and the radiogroup labelling. (verification-gap)
- [patch] ReflectionPanel counter boundary tests at 240 (shows "40 left") and 239 (hidden); `save_rep` with whitespace-only reflection → `null`. (verification-gap)
- [patch] RepDoneStamp test pins `rotate(6deg)` on the frame and `rotate(-6deg)` on the lettering. (verification-gap)
- [patch] `runSaveRep` when `lastRepId` is missing from history (history write failed earlier): set `saveFailed: true` and return instead of silently bumping the rev and moving to Saved. (edge-case)
- [patch] Over-cap reflection drafts: the reducer's `update_reflection_draft` slices both fields to `config.reflection.maxChars`; the panel clamps `left` at 0. (edge-case)
- [patch] VariationPicker with no options shows the no-alternative message as the alert; the confirm button is disabled only when `value` is not one of the offered kinds. (edge-case)
- [patch] `formatCountdown` guards non-finite input (renders 0:00); `save_rep` trims each field before the blank check and stores trimmed text. (edge-case)
- [accept] Verified-correct boundaries: pause while paused, resume without pause, finish during pause, elapsed exactly at the limit, rehydrated pausedAt, double finish, unknown retry id, counter at 0, formatCountdown above 59:59. (edge-case)
- [accept] `appendRepIfAbsent` only reachable on a rev conflict; `remainingSec` floor vs ceil mid-second; `saveFailed` OR-ing; `onChange` field wiring untestable without a DOM (e2e in phase 2). (verification-gap)

## Verification

**Commands:**
- `npm run lint && npm run typecheck && npm test` -- expected: clean
- `npm run build && npm run check:static` -- expected: all pages static
- `E2E_PORT=3103 npm run test:e2e` -- expected: all existing specs pass unchanged

**Results:**
- `npm run lint && npm run typecheck && npm test` -- clean; 40 test files, 774 tests passed
- `npm run build && npm run check:static` -- `check:static OK — prerendered: /, /practice, /privacy, /stage`
- `E2E_PORT=3103 npm run test:e2e` -- 198 passed (34.4s)
