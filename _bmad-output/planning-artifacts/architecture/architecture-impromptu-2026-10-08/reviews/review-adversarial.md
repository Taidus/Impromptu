# Adversarial Review — Architecture Spine, Impromptu v1

- **Target:** `../ARCHITECTURE-SPINE.md` (draft, 2026-10-08)
- **Context:** `../../../prds/prd-impromptu-2026-10-08/prd.md`
- **Lens:** Attack the spine as an adversary. Build two units one level down (epics) that each obey every AD to the letter and still build incompatibly. Each such pair is a hole to close with a new or tightened AD.
- **Units considered:** E1 Setup · E2 Generator/compose · E3 Reveal/Stage · E4 Creating+Timer · E5 Completion/Reflection · E6 Practice History/Map + export · E7 Email signup · E8 Library pipeline (validator/build/batches) · E9 Decor.

## Verdict

The spine is strong on dependency direction, the library gate, timing math, and decor isolation. It still leaves the **write side of the client** open. The one reducer cannot call `compose()` as its signature is written. The Rep record has no defined shape. Setup and History have no mutation path. Medium has no identity. Patch-batch retirement contradicts the id-uniqueness gate. Two conforming teams would ship code that type-checks against each other's interfaces only by accident.

## Findings

Severity: **Critical** = epics cannot integrate without rework. **High** = integration works but data or behavior diverges. **Medium** = a visible inconsistency or a latent bug. **Low** = cosmetic or easily reconciled.

---

### F1 — Critical — Where does `compose()` run? The pure reducer cannot call it

**The hole.** AD-7 fixes the reducer as `(state, event, now) → state` and says the store is the only place it runs. AD-3 requires `compose(request, library, recent, random)`. The reducer gets no `library`, `recent`, or `random`. AD-11 says a key is pushed to the ring "when a composed Challenge is committed to the held state". The ring lives in a separate storage key (`impromptu:recent`) from the session (`impromptu:session`).

**Divergent pair.**
- **E1 Setup** reads "components dispatch named events" and wires **Get a challenge** to call `compose()` in the component (it has the library chunk it prefetched). It dispatches `new_challenge` with `{challenge}` as payload and pushes the recent key itself through the Repository.
- **E3 Reveal/Stage** reads the same ADs. It dispatches `reroll` with `{locks}` and no payload, expecting the store to compose. E2 then adds `library` and `random` parameters to the reducer so it can.
- The result is two event payload shapes for the same family of events, a reducer that is impure in one branch, and the recent ring pushed in two places (once by E1, once by the store), or not at all.

**Also.** Two separate keys mean a crash or a cross-tab write between the `session` write and the `recent` write leaves a held Challenge whose key is not in the ring, or the reverse.

**Close it (tighten AD-7 + AD-11).**
- The store has a **command layer**: `store.dispatch(intent)` for `new_challenge | reroll | vary`. It calls `compose()` with the `Library`, `Random`, and current ring ports. On `{ok:true}` it feeds the reducer a single internal event, `challenge_committed {challenge, recentKey}`. On `{ok:false}` it feeds `compose_failed {reason, blockingLock}`, so the failure is session state the Stage renders. The reducer stays `(state, event, now)` and never sees ports.
- Components never call `compose()`. Only `src/store` imports `src/domain/compose`. Add this to the ESLint boundary rule.
- The recent ring moves inside the `impromptu:session` envelope (or the store writes both keys in one `Repository.commit({session, recent})` call that writes the envelope atomically). Pick one and state it.

---

### F2 — Critical — The Rep record has no shape

**The hole.** AD-5 defines the Challenge snapshot. AD-8 defines Attempt timing fields and `timeUsedSec`. Nothing defines a **Rep**: its id, how it holds the Challenge, its timestamps, whether it was timed, or the Reflection fields. The export "uses the AD-5 snapshot shape", but a Rep is more than a snapshot. `origin.fromRepId` (AD-3) points at a Rep id that no AD mints.

**Divergent pair.**
- **E5 Completion** writes `{id, challengeId, finishedAt: Date.now(), timeUsedSec, reflection: {worked, change}}` and keeps the Challenge only in session state. That is lean and conforms to every AD.
- **E6 Practice History** reads `impromptu:history` expecting `rep.challenge.brief`, `rep.challenge.skill`, and `rep.timed`, so it can render FR-25 and derive the Practice Map. It also expects `finishedAt` as ISO 8601 (Consistency Conventions: "ISO 8601 strings everywhere else"). E5 used epoch ms, which is legal under AD-8's "epoch ms in Attempt timing" if E5 counts finish as Attempt timing.
- Retry (E5) copies "the stored Challenge snapshot", but E5 didn't store one in the Rep. After a reload into Saved, that snapshot is gone.

**Close it (new AD, "Rep record").** Define in `src/domain/practice/schema.ts` (zod, types via `z.infer`, same rule as AD-15):
```
Rep = {
  id: uuid, savedAt: ISO 8601,
  challenge: Challenge,            // full AD-5 snapshot, embedded, never a reference
  startedAt: ISO 8601, finishedAt: ISO 8601,
  timed: boolean,                  // = challenge.timeLimitSec !== null
  timeUsedSec: number,
  reflection: { worked: string, change: string }   // '' when empty, each <= config.reflection.maxChars
}
```
- `impromptu:history` holds `Rep[]`, newest last. Sorting is a view concern.
- The export file is `{format:'impromptu-history', v, exportedAt, reps: Rep[]}`.
- The Practice Map is a pure `deriveMap(reps)` in `src/domain/practice` and is never stored.

---

### F3 — High — Setup, sound, and History have no mutation path, so two owners appear

**The hole.** AD-7 lists 13 events, all about the session. The State-mutation convention says mutation happens "only through store events". AD-9 gives setup and history their own keys. No event exists for changing setup, toggling sound, toggling Quick reveal, clearing data, or (stretch) importing. FR-16 puts sound state in setup, but the control lives on the Stage (FR-30). AD-12 places the store in `src/store` as "the one session store".

**Divergent pair.**
- **E1 Setup** builds `useSetup()`, a second `useSyncExternalStore` over `Repository.setup`. It argues that AD-7 only governs the session.
- **E3 Stage** needs the sound toggle. It sees no event for it and writes `Repository.setup` directly from the Stage component. That conforms to AD-9, since the Repository is still the sole storage accessor.
- **E6 Practice** implements **Clear all data** as `Repository.clear()`, called from the page. The session store still holds an in-memory Attempt and immediately re-persists it, so the "cleared" data comes back.
- The result is two setup owners with separate in-memory copies. Sound toggled on the Stage is not reflected on setup until reload. The `storage` event does not fire in the tab that made the write.

**Close it (tighten AD-7).**
- There is **one app store** with slices `setup`, `session`, `history`, `recent`, and `storageAvailable`.
- Add the events `update_setup {patch}`, `set_sound {on}`, `set_quick_reveal {on}`, `clear_all_data`, and (stretch) `import_history {reps}`.
- `clear_all_data` resets every slice and then persists, in that order.
- No component calls the Repository. Only `src/store` imports `src/adapters/storage`, and lint enforces it.

---

### F4 — High — Medium (and Skill) have no identity, and Template medium eligibility has no field

**The hole.**
- AD-6 namespaces Templates, Topics, Styles, and Constraints, but not Mediums. AD-15 says "the Medium list is library data", but `schema.ts` has no `Medium` entity.
- `locks` is "Input kind → value id" (AD-3), and Skill and Medium are lockable Inputs (FR-9 "any Input").
- CL-1 requires "at least one eligible Medium" per Template. AD-15 only says `briefPattern` is "a string, or a per-Medium map". No `mediums[]` field exists, so a string pattern says nothing about eligibility.
- AD-4 requires/excludes look at "the other parts" but list only template, topic, style, and constraint. Whether a Medium carries tags (for example, Photography needs a `visual` Constraint) is undefined.

**Divergent pair.**
- **E8 Pipeline** emits `briefPattern: {"drawing": …, "photography": …}` and treats the map keys as eligibility. For string patterns it assumes "all Mediums".
- **E2 Generator** adds `mediums: ['Drawing','Photography']` (display labels), because AD-15 doesn't forbid it, and filters on that.
- **E1 Setup** persists enabled Mediums as `['writing','drawing']`.
- The three disagree on the key (label vs. slug) and on the source of eligibility. The FR-2 guarantee ("never a Medium not enabled") then depends on which one wins. The AD-16 coverage gate counts cells using E8's rule while runtime uses E2's.

**Close it (tighten AD-6 + AD-15 + AD-4).**
- Add a `Medium` entity, `{id:'med.<slug>', label, tags[]}`, in `content/library/mediums.json`. Skill ids stay the fixed six from config, as kebab-case ids.
- A Template has a required `mediums: MediumId[]` (min 1).
- `briefPattern` is a string, or a map whose keys must equal `mediums` exactly. The gate checks this.
- `isCompatible(template, medium, topic, style, constraint)` counts the Medium's tags as a part.
- The lock map type is `Partial<Record<InputKind, string>>`, where skill values are Skill ids and medium values are `med.*` ids.

---

### F5 — High — Patch-batch retirement contradicts the id-uniqueness gate

**The hole.**
- AD-6: "Removal is `retired: true`, delivered by a patch batch."
- AD-16: "ids unique across batches."
- AD-17: "Accepted batches are never edited."
- A patch batch therefore has to mention an existing id in order to retire it, and that mention trips the uniqueness check. Nothing defines how build.ts merges batches, or in what order.

**Divergent pair.**
- **E8a validator** implements "unique across batches" literally. A patch that re-declares `top.coming-home` with `retired:true` fails, so the patch author ships a new id plus a manifest note and the old id stays live.
- **E8b build** implements patches as full-entry overrides, ordered by folder name, where the last one wins. Under that rule a patch could silently rewrite any field, not just `retired`. That is an in-place rewrite of accepted content by another name.

**Close it (tighten AD-6 + AD-17).**
- A patch batch has `kind: 'patch'`. Its only payload is `manifest.retire: string[]`. It may also add new entries under fresh ids.
- Uniqueness applies to *declarations*. A `retire` entry must reference an id that is already declared, and no id may be declared twice.
- The build applies batches in lexical folder order, which is date-prefixed. Retiring is idempotent, and un-retiring is impossible.
- The gate re-runs coverage and headroom *after* retirements.

---

### F6 — High — The state machine is incomplete at the edges the epics own

**Gaps:**
- `new_challenge` from **Attempt** or **Finished** is not in the diagram. FR-10 lets the user go back to setup. Setup shows Resume / Discard, but it can also show **Get a challenge**.
- No **Finished → anything** except `save_rep`. If the user reloads in Finished and navigates away, what happens?
- **Retry/Vary** are only allowed from **Saved**, yet Rep ids exist in History. Is Retry from a History row allowed?
- The **Variation picker** (choosing which Input to change) has no state or event payload. `vary` needs `{kind}`.
- `compose_failed` (FR-9 "names the Lock to release") is not a state.

**Divergent pair.**
- **E1 Setup** enables **Get a challenge** while an Attempt exists and dispatches `new_challenge`. Under the existing `Held → Held: new_challenge` arm, a reducer author lets it replace the Attempt, and the Attempt is silently lost.
- **E4 Timer** assumes the Attempt is protected until `finish` or `discard`.
- **E6** adds a "Retry" button on History rows. **E5's** reducer ignores `retry` outside Saved, so the button does nothing.

**Close it (tighten AD-7 diagram).**
- Add an explicit transition table, with every (state, event) pair listed and anything not listed being a no-op.
- `new_challenge` from Attempt is rejected. The UI must offer Discard first.
- Finished persists across reload, and `save_rep` is the only exit (Reflection may be empty).
- Retry and vary from History rows are allowed in state None or Held (replacing a held, unstarted Challenge) and carry `{fromRepId}`.
- `vary` carries `{fromRepId, kind}`.
- `Held` carries `lastComposeError: {reason, blockingLock} | null`.

---

### F7 — Medium — Cross-tab last-write-wins breaks "at most one Attempt"

AD-9 says the store re-reads on `storage` events and last write wins. Two tabs open on `/stage` can each `start` from the same Held state. One tab's `startedAt` overwrites the other's, and the losing tab keeps showing a countdown for an Attempt that no longer exists until it re-reads. **E4** (timer, which trusts its own in-memory `startedAt`) and **E3** (which re-renders from the store) will disagree.

**Close it:**
- Every session envelope carries `rev` (a monotonic int).
- The store rejects a local transition if storage `rev` has moved since it last read. It re-reads and re-applies or drops the event.
- On a `storage` event, the UI always re-derives from the store and never from a component-local copy.

### F8 — Medium — Shape of Inputs in the Challenge snapshot

AD-5 says "each Input's `label` and `revealText`" but not the container. **E2** emits `inputs: Array<{kind,label,revealText}>` in reveal order. **E3** indexes `challenge.inputs.topic`, and **E6** prints `challenge.inputs.medium.label`.

**Close it:** `inputs: Partial<Record<InputKind, {id, label, revealText}>>`. Omitted slots are absent. Reveal order always comes from `config.reveal.order` filtered by the keys that are present, and never from the snapshot.

### F9 — Medium — Anchor format is undefined

AD-16 requires the three CL-5 anchors "present verbatim", and CL-5 calls them Challenges. **E8a** stores them as rendered Brief strings in `anchors/*.json`. **E8b** expects anchors to be Templates plus fixed fills, so they can be reached at runtime.

**Close it:**
- An anchor is a Template plus a pinned fill set: `{templateId, topicId, styleId, constraintId, mediumId, expectedBrief}`.
- The gate renders the anchor and string-compares the result to `expectedBrief`.
- The anchor's Template and fills are ordinary entries in an accepted batch.

### F10 — Medium — The Library port is async or sync, unstated

The NFR-3 map row says "the library chunk is prefetched on idle from setup". **E2** writes `compose(…, library: Library, …)` assuming the data is in memory. **E1** implements the loader as `await import()`. The **E3** Stage, opened by a deep link or reload, then calls compose before the chunk is loaded.

**Close it:**
- `Library` is synchronous data.
- The store exposes `libraryStatus: 'loading'|'ready'`. Compose intents wait for `ready`.
- Session hydration does not depend on the library, because snapshots are self-contained.

### F11 — Low — Decor freeze rule on the setup page while an Attempt exists

AD-12 says `frozen` is required "whenever the reveal is complete or an Attempt exists", but only "the Stage sets `mode`". **E1** renders the hero `ambient` while an Attempt is running. **E9** assumes that is a contract violation.

**Close it:** state that the freeze rule applies to `/stage` only, and that the hero stays `ambient` on `/`.

### F12 — Low — Signup client vs. server error mapping

- AD-14 has the client import the schema type-only, so the client cannot run zod validation, and **E7** builds a hand-rolled regex that can disagree with the server.
- The spine maps 429 to `rate_limited`, but a network failure (NFR-4 offline) has no code.
- `src/server` is "never imported by client code", which is in tension with the type-only import.

**Close it:**
- Move the request schema to a shared `src/shared/subscribe-schema.ts`, so client and server both run it at runtime.
- Add a client-only `'offline'` code for fetch rejection.
- Copy map keys = `SubscribeError ∪ 'offline'`.

## Summary of AD changes

| Finding | Change |
| --- | --- |
| F1 | AD-7: store command layer owns `compose()`; reducer receives `challenge_committed` and `compose_failed`. AD-11: atomic session+recent write. |
| F2 | New AD: zod `Rep` schema with an embedded snapshot, ISO timestamps, and the export envelope. |
| F3 | AD-7: one app store with slices, plus setup, sound, and clear events. No component imports the Repository. |
| F4 | AD-6/AD-15/AD-4: `Medium` entity with `med.*` ids, required `Template.mediums`, Medium tags count in `isCompatible`. |
| F5 | AD-6/AD-17: patch batches retire via `manifest.retire[]`; uniqueness applies to declarations; lexical apply order. |
| F6 | AD-7: full transition table; Attempt protected; Retry/Vary from History; `vary {kind}`. |
| F7 | AD-9: `rev` counter on the session envelope. |
| F8 | AD-5: `inputs` keyed by `InputKind`. |
| F9 | AD-16: anchor = pinned fill set + `expectedBrief`. |
| F10 | Ports: sync `Library` + `libraryStatus`. |
| F11 | AD-12: freeze scope is `/stage`. |
| F12 | AD-14: shared runtime schema, `offline` code. |
