---
title: 'A stable Challenge across navigation and reload'
type: 'feature'
created: '2026-10-09'
status: 'in-progress'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: '8d9401cd92b02b862027c4e9b775961830098a9b'
story_key: '3-11-a-stable-challenge-across-navigation-and-reload'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-3-context.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux-designs/ux-impromptu-2026-10-08/EXPERIENCE.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux-designs/ux-impromptu-2026-10-08/DESIGN.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** A reload of `/stage` already restores the held Challenge, Inputs, Brief, and `revealed` progress (Story 3.6's hydrate path), but `StagePage`'s live region seeds itself silently on that first render (Story 3.10's own deferred item), so a mid-Reveal or fully-revealed restore announces nothing. Setup has no notice for a held, not-started Challenge, nor for `storageAvailable:false`/`migrationFailed`, even though `StoreState` already carries both flags (Story 6.1, merged to `main`).

**Approach:** Teach the Stage's existing live region to announce once on its first non-loading render whenever it already finds a held Challenge with some `revealed` progress — the landed part if partial, or the whole Challenge (reusing the existing Quick-reveal wording) once everything has landed. Add a stacked Notice-banner area to Setup section 01 — challenge waiting, storage unavailable, migration failed — each independently gated, reusing `copy.button.backToYourChallenge` and the existing cream/ink panel precedent (`EmailSignup`'s lilac-variant card). No reducer, store, or domain change: this is UI-only.

**Founder decisions (keep building, conservative defaults):**
1. DESIGN.md's "Notice banner" row lists challenge-waiting/storage-unavailable/history-not-kept as examples of one banner type, not as mutually exclusive states — they are independent conditions (a held Challenge and a storage problem can both be true). Each applicable banner stacks as its own panel, in this order: challenge waiting, storage unavailable, migration failed.
2. A partial-Reveal restore announcement omits the "Challenge ready." opener (reserved for a fully-landed Challenge) and reads only the already-landed pieces, in `config.reveal.order`, exactly as Story 3.10's per-kind wording already does for everything except a fully-landed restore.
3. `StagePage`'s live region re-seeds on every fresh mount of `/stage` — a hard reload, or a client-side return via "Back to your challenge" or the Setup↔Stage round trip — since the component has no durable way to tell these apart, and EXPERIENCE.md's "Reload or Resume in any state" row describes both as the same "already here" moment.

## Boundaries & Constraints

**Always:**
- Own only `src/components/setup/**`, `src/components/stage/**`, `src/app/stage/**`. A Motion-toggle header is being moved out of `SetupHero` by another session — never add to or edit `SetupHero`'s `<Header>`.
- Notice banner(s) render inside `SetupHero`'s existing `relative z-10` content column, under `<Header>` and above the headline — never a separate page-level wrapper.
- Reuse `copy.button.backToYourChallenge`, `InkButton`, `useAppStore`/`getAppStore` (Story 3.6), and `useGetAChallenge()` (Story 3.8) exactly as built. The branch-y selection logic for both the live-region text and which banners show lives in small pure, colocated, unit-tested functions (matching `reveal-logic.ts`'s and `logic.ts`'s existing convention).
- **Get a challenge** stays the sun button on Setup and always replaces a held, not-started Challenge via the existing `useGetAChallenge()` hook — no new compose path.

**Never:**
- No Attempt-in-progress banner or **Resume** entry point (Story 5.4) — `session.state` never reaches `"attempt"` yet, so the banner set only ever checks for `"held"`.
- No change to `src/domain/session/**`, `src/store/**`, or `copy.ts`'s existing keys — additive only.
- No new npm dependency.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Stage first render, mid-Reveal restore | `session.state:'held'`, `revealed` a strict, non-empty subset of present kinds | The live region announces the already-landed part once, in reveal order | N/A |
| Stage first render, fully-revealed restore | `revealed` contains every present kind incl. `brief` | The live region announces once with the existing "Challenge ready." + full-Challenge wording | N/A |
| Stage first render, held but nothing revealed | `revealed: []` | Live region stays silent (unchanged from Story 3.10) | N/A |
| Stage first render, nothing held | `session.state:'none'` | Live region stays silent (unchanged from Story 3.10) | N/A |
| Setup render, held Challenge | `session.state:'held'` | Notice banner "Your challenge is waiting." with an ink "Back to your challenge" button → `/stage` | N/A |
| Setup render, storage unavailable | `state.storageAvailable:false` | Notice banner "This browser isn't saving data, so your history won't be kept. Challenges still work." | N/A |
| Setup render, migration failed | `state.migrationFailed:true` | Notice banner "Some older reps couldn't be read. They're still stored." | N/A |
| More than one condition true | e.g. held + storage unavailable | Each applicable banner renders, stacked in the founder-decided order | N/A |
| Setup↔Stage round trip | `/stage` (held) → `/` → change a setup field (not **Get a challenge**) → `/stage` | The held Challenge is byte-identical; the changed setup applies only to the next `new_challenge` | N/A |

</frozen-after-approval>

## Code Map

- `src/components/stage/reveal-logic.ts` — add `restoreAnnouncement(challenge, revealed)`, reusing `isFullyRevealed`/`quickRevealAnnouncement`/`announcementFor`/`presentKinds` exactly as built (Story 3.10). Returns `null` when `revealed` is empty.
- `src/components/stage/StagePage.tsx` — the one-shot `live` seed branch (`if (!live.seeded) { if (store.status !== "loading") setLive({...text: ""}) }`) currently always seeds silent text; call `restoreAnnouncement(heldChallenge, store.session.revealed)` there when a Challenge is already held at that first render.
- `src/components/setup/SetupHero.tsx` — render the new `NoticeBanners` between `<Header/>` and the headline `<div>`, inside the existing `<div className="relative z-10 ...">` column; `state` (`useAppStore()`) is already in scope at that point.
- `src/store/types.ts` — `StoreState.storageAvailable`, `.migrationFailed` (Story 6.1), `.session.state` (Story 3.4). Read-only; do not modify.
- `src/components/copy.ts` — add a `notice` map with the three banner strings; reuse the existing `button.backToYourChallenge`.
- `src/components/InkButton.tsx`, `src/components/EmailSignup.tsx` (its lilac-variant `rounded-scrap border border-ink bg-cream p-6` card) — reused for the banner's visual shell and action button.
- `src/components/setup/useGetAChallenge.ts` — reused unchanged; it already composes and replaces any held Challenge before navigating.
- `src/domain/session/session-fixture.ts` (`baseChallenge`, `fullChallenge`, `noneSession`) — reuse for e2e seeding, matching `e2e/stage.spec.ts`'s existing `page.addInitScript` convention.
- `e2e/stage.spec.ts`, `e2e/setup-mediums-and-challenge.spec.ts` — existing e2e conventions (`copy` imports, `getByRole`, viewport overrides) to match in the new spec file.
- Not touched: `src/domain/session/**`, `src/store/**`, `src/adapters/**`.

## Tasks & Acceptance

**Execution:**
- [x] `src/components/stage/reveal-logic.ts` + `reveal-logic.test.ts` — `restoreAnnouncement`, unit-tested over empty/partial/full `revealed`
- [x] `src/components/stage/StagePage.tsx` — wire `restoreAnnouncement` into the live-region seed
- [x] `src/components/copy.ts` — add `notice.{challengeWaiting,storageUnavailable,migrationFailed}`
- [x] `src/components/setup/notice-banners.ts` + `notice-banners.test.ts` — pure `activeNoticeBanners()`
- [x] `src/components/setup/NoticeBanners.tsx` — the cream/ink panel(s) + "Back to your challenge" action
- [x] `src/components/setup/SetupHero.tsx` — render `<NoticeBanners>` under the header
- [x] `e2e/stable-challenge.spec.ts` — new Playwright spec: reload mid-Reveal + full-Reveal announcement, Setup↔Stage round trip keeps the held Challenge, the three Notice banners (+ "Back to your challenge" → `/stage`), and offline generate/reveal after first load

**Acceptance Criteria:**
- Given a held Challenge (revealed fully or partly), when the user reloads `/stage`, then the same Challenge/Inputs/Brief/`revealed` are restored and the whole Challenge (or the landed part) is announced once
- Given a held Challenge, when the user goes back to Setup, changes setup, and returns to `/stage`, then the held Challenge is unchanged
- Given Setup with a held, not-started Challenge, when section 01 renders, then the Notice banner "Your challenge is waiting." shows with "Back to your challenge" → `/stage`, and **Get a challenge** still replaces it
- Given `storageAvailable:false`, when Setup renders, then its banner shows and generating/revealing still work in memory; given `migrationFailed`, an additional banner shows
- Given the connection drops after first load, when the user gets a new Challenge or continues a Reveal, then it still works (the library is bundled client-side)

## Implementation Notes

- Implemented directly (per build-session override), no subagent dispatch.
- `restoreAnnouncement` added to `src/components/stage/reveal-logic.ts`: `null` when `revealed.length === 0`; `quickRevealAnnouncement(challenge)` when fully revealed; otherwise the landed kinds' own `announcementFor` text, in `presentKinds` order. Wired into `StagePage.tsx`'s existing one-shot `live` seed branch in place of the hardcoded `text: ""`.
- `src/components/setup/notice-banners.ts`: pure `activeNoticeBanners({sessionState, storageAvailable, migrationFailed})` returns the ordered list of applicable banner kinds (`challengeWaiting` only for `session.state === "held"`, never `"attempt"`/`"none"`). `NoticeBanners.tsx` maps each kind to `copy.notice[kind]` and, for `challengeWaiting` only, an `InkButton` that `router.push("/stage")`s (the Challenge is already held, so `/stage` finds it without composing again).
- `SetupHero.tsx`: `<NoticeBanners state={state} />` placed between `<Header/>` and the headline, inside the pre-existing `relative z-10` column — satisfies the file-ownership note without touching `<Header>` itself.
- `e2e/stable-challenge.spec.ts` (new): seeds `impromptu:session`/`impromptu:setup` via `page.addInitScript` (same convention as `e2e/stage.spec.ts`) for the mid-Reveal and fully-revealed restore-announcement cases; drives a real Setup↔Stage round trip for the "held Challenge unchanged" case (returning via the Notice banner's "Back to your challenge", since that is the only in-spec path back to `/stage` that does not recompose); simulates storage-unavailable by overriding the `window.localStorage` getter to throw in an init script (so `tryGlobalLocalStorage()` returns `null` and the Repository's probe never runs); simulates a migration failure by seeding an envelope at `v: 0` (below the only registered schema version, `1`, with no migration step registered — `migrate()` throws deterministically) for the `history` key, which doesn't disturb Setup's own first-visit defaulting.
- Offline (NFR-4) ended up as two separate tests, not one combined round trip: an initial attempt chained `/stage` → `/` → `/stage` entirely offline after one online visit, reasoning that Next's client Router Cache would keep both segments servable without the network. A real run (all three browsers) proved that wrong — a `router.push`/`router.replace` to a route not literally the one `page.goto` hard-loaded still issues a fresh RSC fetch, which fails offline (one browser surfaced a `chrome-error://chromewebdata/` page). Split into: (1) hard-load `/stage` online, go offline, click **Reveal next** — pure client reducer state, no navigation, unambiguously passes; (2) hard-load `/` online, go offline, click **Get a challenge**, and assert the compose succeeded by reading `impromptu:session` from `localStorage` directly rather than asserting the post-click URL — `useGetAChallenge` calls `store.dispatch({type:"new_challenge"})` synchronously before `router.push`, so the Repository write is already done by the time `.click()` resolves, regardless of whether the SPA route transition that follows also completes offline. The resulting route transition's own offline behavior is Next.js router infrastructure, not what NFR-4 (the library is bundled client-side) is about.
- `npm run lint`, `npm run typecheck`, `npm test` (607/607, 36 files), `npm run build`, `npm run check:static`, `npm run check:privacy`, and `npm run test:e2e` (192/192 across chromium/webkit/firefox, `E2E_PORT=3104`) all pass.

## Design Notes

- **Why the restore announcement lives in the existing seed branch, not a new effect:** `StagePage`'s `live` state already distinguishes "not yet seeded" (first non-loading render) from every later render via `live.seeded`; the seed is precisely the moment a restore (reload, resume, or round trip) is first observed, so no second effect or ref is needed.
- **Why banners stack instead of picking one:** a held Challenge and a storage problem are orthogonal facts about the browser and the session; showing less than the true state (e.g. hiding the storage note because a Challenge happens to be held) would contradict FR-29's "Challenges still work" promise being visibly true alongside the FR-10 "nothing changes unless you ask" promise.

## Verification

**Commands:**
- `npm run lint` -- expected: no errors
- `npm run typecheck` -- expected: no errors
- `npm test` -- expected: all Vitest suites pass, including `reveal-logic.test.ts`'s new `restoreAnnouncement` cases and `notice-banners.test.ts`
- `npm run build` -- expected: production build succeeds
- `npm run check:static` -- expected: every route still statically prerendered
- `npm run check:privacy` -- expected: no analytics/error-monitoring SDKs
- `npm run test:e2e` -- expected: all Playwright specs pass, including the new `e2e/stable-challenge.spec.ts`
