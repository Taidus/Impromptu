---
title: 'Session reducer for commits and reveal progress'
type: 'feature'
created: '2026-10-09'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: '635c4b68f7a70c164571565bca640ab059d0b26a'
story_key: '3-4-session-reducer-for-commits-and-reveal-progress'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-3-context.md'
  - '{project-root}/_bmad-output/planning-artifacts/architecture/architecture-impromptu-2026-10-08/ARCHITECTURE-SPINE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The domain has no session state machine yet: nothing turns a composed Challenge into a held session or tracks step-by-step reveal progress, so the Stage, setup, and a reload have no shared source of truth for "what Challenge is showing and how much has landed" (FR-10, FR-13, FR-14).

**Approach:** Add a pure session reducer in `src/domain/session/session-reducer.ts` implementing only the AD-7 state machine's None and Held states: `challenge_committed` and `compose_failed` (the two events the future store's command layer dispatches after calling `compose()`) and `reveal_next` (AD-18). Any other (state, event) pair is a no-op.

## Boundaries & Constraints

**Always:**
- Pure: same `src/domain` rules already ESLint-enforced (no `Date.now`, `Math.random`, storage, globals, React/Next imports).
- Reuse `Session`, `Challenge`, `ComposeError`, `RevealedKind`, `InputKind`, `Setup` from `./schema` (Story 3.2) unchanged — confirmed sufficient, see Design Notes.
- The `recent` ring push caps at `config.generator.recentWindow` inside the reducer itself (not only on a later schema parse), matching AD-11.
- "Present kinds" (for both Quick reveal and `reveal_next`) come only from `config.reveal.order` filtered to kinds actually present in `challenge.inputs`; `brief` always counts as present.

**Never:**
- Do not implement or import `compose()` (Story 3.3, built in parallel on another branch) — only consume the two events its command layer would dispatch.
- Do not implement Attempt/Finished/Saved, `toggle_lock`, `start`, `pause`, `resume`, `finish`, `update_reflection_draft`, `save_rep`, `discard`, `retry`, `vary`, or any store/command layer — later stories. Any event outside `{challenge_committed, compose_failed, reveal_next}` must be a safe no-op.
- Do not edit `src/domain/ports.ts` or `src/config/app.ts`.
- Do not modify `src/domain/session/schema.ts`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| None + challenge_committed | `state:'none'`, event `{challenge, recentKey:'k1'}`, `quickReveal:false` | `state:'held'`, `challenge` set, `revealed:[]`, `recent` has `'k1'` appended | N/A |
| Held + challenge_committed, Quick reveal on | held session, `quickReveal:true`, challenge with only skill/medium/topic | `revealed` = every present kind with `brief` last, e.g. `['skill','medium','topic','brief']` | N/A |
| challenge_committed, recentKey null (retry) | event `{challenge, recentKey:null}` | `recent` unchanged | N/A |
| compose_failed from None | `state:'none'`, event `{reason:'no_compatible', blockingLock:'topic'}` | `state` stays `'none'`, `lastComposeError` set to the event's `{reason, blockingLock}` | N/A |
| compose_failed from Held | held session, event `{reason:'no_compatible', blockingLock:null}` | `state` stays `'held'`, `challenge`/`revealed` unchanged, `lastComposeError` set | N/A |
| Held + reveal_next | `revealed:[]`, challenge has skill/medium/topic | `revealed` becomes `['skill']` | N/A |
| Held + reveal_next, everything landed | `revealed` already holds every present kind plus `brief` | returns the same session reference (no-op, FR-15) | N/A |
| None + reveal_next | `state:'none'` | returns the same session reference (no-op) — not in the AD-7 diagram | N/A |
| An AD-7 event not yet implemented, any scoped state | e.g. `toggle_lock`, `start` dispatched against None or Held | returns the same session reference (no-op) | N/A |

</frozen-after-approval>

## Code Map

- `src/domain/session/schema.ts` -- reuse `Session`, `Challenge`, `ComposeError`, `RevealedKind`, `InputKind`, `Setup` as-is; no changes (see Design Notes).
- `src/config/app.ts` -- reuse `config.reveal.order`, `config.generator.recentWindow`. Do not modify.
- `src/domain/session/setup-reducer.ts` -- match its established style: named exports, a discriminated `*Event` union, a `switch` with a defensive `default: return <unchanged>` no-op branch, small private helper functions.
- `src/domain/session/setup-fixture.ts` and the inline `challenge` fixture atop `schema.test.ts` -- base this story's own `session-fixture.ts` on the same Challenge shape and id conventions (`skl.*`, `med.*`, `tpl.*`, `top.*`).
- No existing `session-reducer.ts` or `session-fixture.ts` -- both new files.

## Tasks & Acceptance

**Execution:**
- [x] `src/domain/session/session-reducer.ts` -- define `SessionEvent` (`challenge_committed`, `compose_failed`, `reveal_next`) and `sessionReducer(session: Session, event: SessionEvent, setup: Pick<Setup, "quickReveal">): Session` -- AD-7, AD-11, AD-18
- [x] `src/domain/session/session-fixture.ts` -- shared `noneSession`, `heldSession`, and a challenge fixture with style and constraint present (for the full-order Quick reveal case), reusing `session-fixture`-local ids -- avoids duplicating fixture literals across test files
- [x] `src/domain/session/session-reducer.test.ts` -- cover every I/O matrix row, plus a table-driven sweep of (state, event) pairs outside the diagram -- required by the story's AC

**Acceptance Criteria:**
- Given the AD-7 diagram, when `challenge_committed` is dispatched from None or Held, then the result is Held with the new challenge, the recent ring pushed (or unchanged when `recentKey` is null) and capped at `config.generator.recentWindow`, and `revealed` empty unless `setup.quickReveal` is on, in which case every present kind lands with `brief` last
- Given any state, when `compose_failed` is dispatched, then the state is unchanged and `lastComposeError` is set to `{reason, blockingLock}` from the event
- Given a Held session, when `reveal_next` is dispatched, then the next present kind in `config.reveal.order` not yet in `revealed` is appended, and once every present kind (including `brief`) has landed, further `reveal_next` calls return the same session unchanged
- Given any other (state, event) pair, when dispatched, then `sessionReducer` returns the same session reference unchanged, verified by a table-driven test

## Implementation Notes

- Implemented exactly as planned: `src/domain/session/session-reducer.ts` (reducer + private helpers `commitChallenge`, `revealNext`, `presentKinds`, `isPresent`), `src/domain/session/session-fixture.ts` (`baseChallenge`, `fullChallenge`, `noneSession`, `heldSession`), `src/domain/session/session-reducer.test.ts`.
- `schema.ts` needed no changes, confirming the Design Notes prediction.
- No ESLint boundary changes needed either — Story 3.2 already widened `src/domain`'s allow-list to permit intra-domain (`@/domain/**`) imports, and this story's only new import is `./schema` (same directory).
- All four commands (`npm run lint`, `npm run typecheck`, `npm test`, `npm run build`) pass; `npm test` shows 187/187 passing (13 test files, up from 117/12 after Story 3.2).
- Every I/O & Edge-Case Matrix row has a dedicated test; the "AD-7 event not yet implemented" row is covered by a table-driven sweep over `{None, Held} × {toggle_lock, start, pause, resume, finish, update_reflection_draft, save_rep, discard, a bogus type}`, asserting the exact same session reference is returned (18 cases).

## Spec Change Log

- Review patches applied in `a695469` (triage rows 1–5). Full verification passes.

## Review Triage Log

| # | Layer | Finding | Verdict | Evidence | Route |
|---|---|---|---|---|---|
| 1 | blind, edge, verif-gap | `challenge_committed`/`compose_failed` apply in every state; from Attempt yields held+attempt | medium | Reducer has no state guard on those cases; schema refine rejects held with attempt; spec says other pairs are no-ops. AD-7's Saved→Held belongs to Story 5.7 | patch |
| 2 | blind, edge | Event payload types looser than stored schema (empty reason / recentKey) | low | `reason: string` vs `ComposeError.reason` trimmed min(1) | patch |
| 3 | blind | No exhaustiveness check; `reveal_next` casts `challenge` | low | `default` swallows new variants; cast would throw on a null challenge | patch |
| 4 | blind, edge, verif-gap | Sweep omits Attempt/Finished/Saved; outputs never schema-validated; pass-through, quick-from-None, over-window ring, brief-last untested | low | Pre-verified: wiping locks on commit passes all tests | patch |
| 5 | blind | Challenge fixture duplicated across test files | low | Two copies to keep in sync | patch |
| 6 | edge | `recentWindow: 0` makes `slice(-0)` keep everything | low | Config is a fixed 30; not reachable | reject |

## Design Notes

- **No schema change needed:** Story 3.2 flagged `Session` as "pending Story 3.4" amendment. Every field this story touches — `state`, `challenge`, `revealed: RevealedKind[]`, `recent: string[]`, `lastComposeError: ComposeError|null` — already maps 1:1 onto AD-7/AD-11/AD-18 with no gaps, so `schema.ts` stays untouched.
- **Signature:** `sessionReducer(session, event, setup)` takes `setup: Pick<Setup, "quickReveal">` as a third argument rather than duplicating `quickReveal` onto `Session` (it already lives on `Setup`, AD-9) or taking a bare boolean — the call site can pass its `Setup` object directly once Story 3.6 wires the store, without destructuring first.
- **Present-kinds helper:** `config.reveal.order` filtered to `kind === 'brief' || challenge.inputs[kind] !== undefined` is how both Quick reveal and `reveal_next` learn which kinds a Challenge actually has, without needing the Template — the AD-5 snapshot already omits kinds the Template lacks.
- **`lastComposeError` reset on commit:** a successful `challenge_committed` also clears any prior `lastComposeError` to `null` — not stated explicitly in AD-7, but a stale error from a previous failed attempt should not linger once a new Challenge is showing. `locks`, `attempt`, `reflectionDraft`, and `lastRepId` pass through untouched (none of this story's events define behavior for them).

## Verification

**Commands:**
- `npm run lint` -- expected: no errors
- `npm run typecheck` -- expected: no errors
- `npm test` -- expected: all existing and new Vitest suites pass, including full I/O matrix coverage
- `npm run build` -- expected: production build succeeds
