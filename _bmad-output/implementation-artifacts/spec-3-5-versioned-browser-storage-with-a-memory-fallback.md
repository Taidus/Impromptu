---
title: 'Versioned browser storage with a memory fallback'
type: 'feature'
created: '2026-10-09'
status: 'in-review'
route: 'dispatch'
review_loop_iteration: 0
context: []
baseline_commit: '4518307a414e701c12864257206d9604c8495338'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Nothing in the codebase yet touches `localStorage`. Setup, the held Challenge, and Practice History need to survive a reload in this browser, keep working (in memory) when storage is blocked or in private mode, and never lose data to a future schema change or to a race between two open tabs.

**Approach:** Implement the `Repository` port (AD-9) in `src/adapters/storage` as the sole module that touches `localStorage`, using envelopes `{v, rev, data}` under the three existing keys. Probe availability once at startup and fall back to an in-memory implementation of the same interface. Run forward-only per-key migrations on read, leaving a value with an unknown-future version untouched, and falling that one key back to memory (without touching its stored data) if a migration throws. Detect cross-tab write races via `rev` and let the caller decide; expose a `storage`-event subscription so another tab's write is noticed. Story 3.2 (Setup/Session schemas) does not exist yet, so the Repository stays generic over `data` — it is not aware of what a Setup, Session, or History value looks like.

## Boundaries & Constraints

**Always:** Only `src/adapters/storage/**` reads or writes `localStorage`, under exactly the keys `impromptu:setup`, `impromptu:session`, `impromptu:history`. Every stored value is `{v, rev, data}`; `rev` is caller-assigned (current rev + 1) and checked against the actually-stored rev before a write is accepted. A value whose `v` exceeds the known schema version for that key is returned as-is and never written back. A value whose migration throws is left byte-for-byte untouched in `localStorage`; that key then serves reads/writes from an in-memory copy for the rest of the session, and `migrationFailed(key)` reports it. `src/adapters` may import only `@/domain`, `@/config`, `@/generated` (existing ESLint boundary) — no React, no new dependencies. Every new module stays importable from Node (the Vitest environment is `"node"`, not `jsdom`): no code path may assume `window`/`localStorage` exist unconditionally outside of optional, injectable seams.

**Never:** Do not create Setup/Session/History zod schemas or any shape-specific logic — the Repository is generic over `T`. Do not implement the app store, reducers, or `compose()` (Stories 3.2–3.6). Do not add a new runtime dependency. Do not persist a migrated value back to storage eagerly on read (it is returned to the caller; the next explicit write naturally carries the upgraded `v`).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| First load, nothing stored | `load("setup")`, key absent | `{ok:true, value:null}` | N/A |
| Normal round-trip | `save("setup", {v:1,rev:1,data})` then `load("setup")` | load returns the same envelope | N/A |
| Older version on read | stored `v:1`, known `v:2`, a registered `v1→v2` step | `load` returns data migrated to `v:2`; storage itself still holds `v:1` until the next write | N/A |
| Future version on read | stored `v:3`, known `v:2` | `load` returns the `v:3` envelope unchanged; `save` with `v:3` is rejected | `{ok:false, reason:"unsupported_version"}` |
| Migration throws | stored `v:1`, known `v:2`, step throws | `load` returns the untouched `v:1` envelope; `migrationFailed("setup")` becomes `true`; localStorage keeps the original bytes | caught internally, never thrown to the caller |
| Availability probe fails | `localStorage` missing or every op throws | `Repository.storageAvailable === false`; load/save/clearAll behave identically against an in-memory store | N/A |
| Rev conflict on save | stored `rev:2`, caller writes `envelope.rev:2` (believes current is 1) | write rejected, nothing persisted | `{ok:false, reason:"rev_conflict", fresh:<stored envelope>}` |
| Cross-tab change | another tab writes `impromptu:session` | a `subscribe("session", listener)` registrant's `listener()` fires | N/A |
| Clear | `clearAll()` | all three `impromptu:*` keys removed (primary and any memory fallback); `migrationFailed(*)` resets to `false` | N/A |

</frozen-after-approval>

## Code Map

- `src/domain/ports.ts` -- defines `Repository`, `Envelope<T>`, `StorageKey`, `Result<T>` today with `save<T>(key, envelope): Result`. Extend in place: widen `save`'s return type to a new `SaveResult<T>` (success carries the written envelope; rev conflict carries the fresh stored envelope), and add `storageAvailable: boolean`, `migrationFailed(key): boolean`, and `subscribe(key, listener): () => void` to the `Repository` interface. Keep `load`/`clearAll` signatures as-is.
- `src/config/app.ts` -- `config.storage.schemaVersions = {setup:1, session:1, history:1}` is the known-version source; do not hardcode versions elsewhere.
- `src/adapters/clock.ts`, `src/adapters/random.ts` + their colocated `*.test.ts` -- the existing adapter pattern to match: a small factory/const exported from a flat file, pure, no React.
- `src/domain/test-doubles.ts` -- the existing pattern for test seams (`fakeClock`, `seededRandom`); follow the same colocated-test, dependency-injected style for the new storage test doubles (inject a fake `RawStore` / schema-versions / migrations / event target rather than relying on jsdom, since `vitest.config.ts` runs `environment:"node"`).
- `eslint.config.mjs` -- confirms `src/adapters/**` may import `@/domain`, `@/config`, `@/generated` and has no `no-restricted-globals` rule (unlike `src/domain`), so `localStorage`/`window` access is allowed here and only here.
- `vitest.config.ts` -- `environment: "node"`; no DOM globals exist unless a test supplies them. All storage tests must inject a fake raw store / event target rather than assume `window`.

## Tasks & Acceptance

**Execution:**
- [x] `src/domain/ports.ts` -- add `SaveResult<T>`; change `Repository.save` to return it; add `storageAvailable`, `migrationFailed(key)`, `subscribe(key, listener)` to `Repository` -- the behaviours AD-9 needs that the original port shape couldn't express.
- [x] `src/adapters/storage/raw.ts` -- define a minimal `RawStore` interface (`getItem`/`setItem`/`removeItem`), `createMemoryRawStore()`, and `probe(raw)` (write, read-back, remove; `false` on any throw or mismatch) -- the shared primitive both the real and fallback paths use.
- [x] `src/adapters/storage/migrations/index.ts` -- `MigrationFn`, `MigrationTable`, an empty default `migrations` registry (no key is above `v1` yet), and `migrate(key, envelope, targetVersion, table?)` that steps `v→v+1` and throws if a required step is missing -- the forward-only migration runner AD-9 requires.
- [x] `src/adapters/storage/index.ts` -- `createRepository(options?)`: resolve `storage` (default `globalThis.localStorage`, swallowing any throw from merely accessing it), `schemaVersions` (default `config.storage.schemaVersions`), `migrations` (default the registry above), and `eventTarget` (default `window` when defined); probe once; build one `Repository` (shared `load`/`save`/`clearAll`/`migrationFailed`/`subscribe` implementation) over either the real store (`storageAvailable:true`, with a per-key in-memory fallback Map for migration failures) or a full memory store (`storageAvailable:false`) -- the single factory other stories (3.6) will import.
- [x] `src/adapters/storage/index.test.ts` -- Vitest, covering every row of the I/O matrix above plus `clearAll` resetting `migrationFailed`, using injected `RawStore`/`schemaVersions`/`migrations`/`eventTarget` test doubles (no jsdom).

**Acceptance Criteria:**
- Given a fresh `createRepository({storage: fakeRaw})` with nothing stored, when `load("history")` runs, then it returns `{ok:true, value:null}` and no exception.
- Given `save` is called twice in a row without an intervening `load`, when the second call reuses the first call's `rev`, then it is rejected with `reason:"rev_conflict"` and the fresh envelope, and the stored value from the first `save` is unchanged.
- Given a storage object whose every method throws, when `createRepository({storage: thatObject})` is created, then `storageAvailable` is `false` and `load`/`save`/`clearAll` still succeed against memory.
- Given two `Repository` instances share the same injected `eventTarget`, when one calls `save` and manually fires the storage event on that target for the written key, then a listener registered via the other instance's `subscribe` is invoked.

## Implementation Notes

- No Setup/Session/History zod schemas exist yet (Story 3.2 is unbuilt); this story deliberately keeps the Repository generic over `T` per the orchestrating session's scope note, using only the existing `Repository`/`Envelope`/`StorageKey` types.
- Conservative default chosen for an unstated edge case: corrupted/non-JSON bytes under a known key are treated as if the key were absent (`load` returns `{ok:true, value:null}`) rather than surfacing a parse error — the app should never hard-fail on a garbled value it can simply treat as missing. Noted here per the "choose the most conservative option" instruction rather than raised as an Open Question, since no user-visible behavior hinges on which of the two safe choices is picked.
- Migrated data is intentionally not written back to storage on read; it is returned to the caller only. The next explicit `save` naturally carries the upgraded `v`. This avoids a write path that would also need its own rev bookkeeping for a read.
- Implemented directly (no subagent dispatch), per the orchestrating session's override for this story.
- Files touched: `src/domain/ports.ts` (extended `Repository`/added `SaveResult<T>`), `src/adapters/storage/raw.ts`, `src/adapters/storage/migrations/index.ts`, `src/adapters/storage/index.ts`, `src/adapters/storage/index.test.ts` (new).
- Matrix Test Audit: all 9 I/O & Edge-Case Matrix rows map 1:1 to a passing test in `src/adapters/storage/index.test.ts` (first load, normal round-trip, older-version migration, future-version read-only, migration-throws fallback, probe-failure fallback (both the throwing-store and no-storage-supplied cases), rev conflict, cross-tab subscription, `clearAll`). `npm test` ran all 36 tests (6 files) and all passed, including the new file.
- Verification run: `npm run lint` (clean), `npm run typecheck` (clean), `npm test` (36/36 passed), `npm run build` (succeeded, all 5 routes still static).
- Review fix-up pass: a stored version above the known schema version is now protected on `save()` too (previously only the incoming envelope's `v` was checked, so a lower-`v` write could overwrite newer stored data). `getItem`/`setItem`/`removeItem` failures after a successful probe (quota exceeded, revoked mid-session) now surface as `read_failed`/`write_failed`/`clear_failed` instead of throwing or silently falling back. `readEnvelope` was replaced with raw-text + `isEnvelope()`/`parseEnvelope()` so non-envelope JSON (`5`, `{}`) is treated as absent, and the migration-failure memory fallback is seeded from the original raw text rather than the parsed/migrated object. `SaveResult<T>`'s catch-all `{reason:string}` was replaced with the exact literal union `save()` returns, so `fresh` narrows correctly on `"rev_conflict"`. `RawStore` gained `length`/`key(i)` (implemented in the memory store; native `localStorage` already has them) so `clearAll()` enumerates and removes every `impromptu:*` key, not just the three known ones. `subscribe()` now ignores events from a different `storageArea` and returns a no-op unsubscribe when storage is unavailable or the key is already on its migration-failure fallback. `migrationFailed`'s docstring now notes it is only accurate after `load(key)` has run. Added tests for each case (18 tests total in the file now).

## Review Triage Log

| # | Layer | Finding | Verdict | Evidence | Route |
|---|---|---|---|---|---|
| 1 | blind, edge, verif-gap | Stored future-version value overwritten by a lower-`v` save | high | Reproduced: `{v:3}` replaced by `{v:1}`; violates AD-9 read-only future versions | patch |
| 2 | blind, edge, verif-gap | Storage calls throwing after the probe escape the `Result` contract | medium | Reproduced: `save` threw `Error: Quota` | patch |
| 3 | blind, edge, verif-gap | Non-envelope JSON returned as a valid envelope | medium | Reproduced: bytes `5` → `{ok:true, value:{}}` | patch |
| 4 | verif-gap | Corrupted-bytes path untested | low | Pre-verified: removing the try/catch passes all tests | patch |
| 5 | edge | Fallback seeded from possibly mutated parsed object | low | AD-9: stored value left untouched | patch |
| 6 | blind | `SaveResult` cannot narrow to `rev_conflict` | low | Catch-all string reason overlaps the literal | patch |
| 7 | blind, edge | `clearAll` removes only known keys | low | AD-9: "removes every `impromptu:*` key" | patch |
| 8 | blind, edge | `subscribe` ignores `storageArea`; fires for memory-backed keys | low | Listener re-reads a memory copy | patch |
| 9 | blind | `migrationFailed` accurate only after `load` | low | Docstring fix | patch |
| 10 | verif-gap | AC 4 tested with one instance, not two | low | Spec says two instances | patch |
| 11 | blind | Missing migration step silently sends users to memory | low | No migrations exist yet | reject |
| 12 | blind | `unsupported_version` skips returning `fresh` | low | Callers never save above known version | reject |
| 13 | edge | Save at `v` below current allowed | low | No path produces it | reject |
| 14 | edge | Migration re-runs on every load of failed key | low | Pure cost | reject |
| 15 | edge | Cross-tab read-check-write not atomic | low | AD-9 rev check is the specified mitigation | reject |
| 16 | edge | Probe `removeItem` failure marks storage unavailable | low | Conservative, rare | reject |

## Verification

**Commands:**
- `npm run lint` -- expected: no ESLint errors, including the `src/adapters` import-boundary rule.
- `npm run typecheck` -- expected: no TypeScript errors across `src/domain/ports.ts` and the new `src/adapters/storage/**` files.
- `npm test` -- expected: all existing tests plus the new `src/adapters/storage/index.test.ts` pass.
- `npm run build` -- expected: production build still succeeds (no new module breaks the static build).
