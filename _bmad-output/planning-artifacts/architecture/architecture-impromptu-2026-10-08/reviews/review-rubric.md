# Rubric Review — ARCHITECTURE-SPINE.md (Impromptu v1)

- **Reviewed:** `../ARCHITECTURE-SPINE.md` (status: draft, 2026-10-08)
- **Driving PRD:** `../../../prds/prd-impromptu-2026-10-08/prd.md`
- **Reviewer stance:** good-spine checklist. The spine was not edited.
- **Date:** 2026-10-08

## Verdict

**Strong spine, nearly ready. Fix before epics.** The paradigm, dependency direction, compose/compat single-sourcing, immutable snapshot, timer math, Repository, decor isolation, library gate, and batch lifecycle are well chosen and mostly enforceable. Three gaps would still let stories diverge: no Rep/setup/export record shapes, an incomplete event list (setup, sound, clear, and Finished-state exits have no events), and reveal-reset semantics for Reroll and Variation. One adopted rule (AD-14) contradicts the import rule and has the Resend call shape wrong. The operational envelope covers environments and secrets but leaves out the sending domain, rollback, and data-erasure operations.

## Scorecard

| Criterion | Result | Notes |
| --- | --- | --- |
| Fixes real divergence points, misses none | Partial | Strong on generator, storage, timing, and decor. Misses Rep, setup, and export shapes; events for setup and clear; reveal reset on Reroll and Variation; id generation purity (F-1 to F-4). |
| Each Rule enforceable and prevents its divergence | Mostly | AD-2 is enforced by ESLint, AD-16 by the build. AD-7's "never write state directly" breaks without setup and clear events. AD-14's type-only import contradicts the "src/server never imported by client" rule (F-5). |
| Deferred items cannot cause divergence | Mostly | "Library tuning in the validator config" creates a second config home next to AD-19 (F-9). The export envelope is underspecified (F-1). The other items are safe. |
| Named tech is verified-current | Pass, with one API error | All versions match the npm registry on 2026-10-08 (see below). The Resend `segments` shape is wrong (F-6). Vercel Hobby WAF rate-limit availability is unverified (F-7). |
| Covers the spec's capabilities | Mostly | The map covers FR-1 to FR-37, CL-1 to CL-6, and NFR-1 to NFR-7. Thin spots: FR-28 clear, FR-16 sound persistence path, FR-25 Rep fields, direct `/stage` entry with no held Challenge. |
| Altitude dimensions decided, deferred, or open | Partial | Hosting, environments, secrets, CI, and monitoring are decided or deferred. Missing: sending domain and DNS, custom domain, rollback, contact-erasure and privacy operations, Resend property provisioning, the runtime for `.ts` build scripts (F-8). |
| Mermaid diagrams valid and consistent | Valid syntax. State machine inconsistent with AD-7 | See the Diagrams section. |

## Findings

### F-1 — HIGH — Rep, setup, and export records have no defined shape
AD-5 defines the Challenge snapshot only. Nothing defines the **Rep** (id, challenge snapshot or reference, `finishedAt`, `timeUsedSec`, `timed`, `reflection {worked, change}`), the **setup** value (`level`, `performTiming: 'timed'|'untimed'|'either'`, `mediums[]`, `skillFocus|null`, `quickReveal`, `soundOn`), the **held-session** value (`revealedCount`, locks, Attempt), or the **export file** envelope. Practice History (FR-25), the Practice Map (FR-26), export (FR-28), the reflection step (FR-23), and storage migrations (AD-9) are separate stories, and each would invent its own fields.
**Fix:** add an AD, or extend AD-5, with zod schemas in `src/domain` for `Rep`, `Setup`, `Session`, and `ExportFile {format:'impromptu-history', v, exportedAt, reps[]}`. State that the stored history envelope `data` is `Rep[]` and that Rep embeds the full Challenge snapshot.

### F-2 — HIGH — The event list is incomplete, so AD-7's "only through store events" cannot hold
AD-7 lists 13 events. There is no event to change setup (FR-1 to FR-4), toggle sound (FR-16), clear all data (FR-28), or leave the `Finished` state other than `save_rep`. The setup screen and the sound control will either write the Repository directly, which violates AD-7 and AD-9, or each story will invent its own event names. `Finished` currently has no discard or abandon path. A reload during reflection is undefined.
**Fix:** add `update_setup` (partial Setup), `set_sound`, `clear_all_data`, and `discard` (or `skip_reflection`) from `Finished`. Say whether `Finished` persists across reload and whether reflection drafts persist. Decide whether setup lives in the session reducer or in a second, sibling reducer in the same store.

### F-3 — MEDIUM — Reveal reset on Reroll and Variation is undefined
AD-18 says Retry commits with `revealComplete: true`. It says nothing about Reroll (in the middle of a reveal or after it) or Variation. One Stage story could replay the full sequential Reveal after a Reroll while another keeps already-locked Inputs revealed. This is visible in the filmed experience (UJ-1 part two is a Variation). AD-11 also pushes to the recent ring on commit, but the PRD says "revealed" (FR-8). That interpretation is fine but should be stated.
**Fix:** in AD-18, state the `revealedCount` after `reroll`, `vary`, and `new_challenge`, and whether Locked Inputs count as already revealed. Note in AD-11 that "committed" deliberately replaces the PRD's "revealed".

### F-4 — MEDIUM — Id and timestamp generation contradicts the pure core
Under Conventions, ids are `crypto.randomUUID()` and `createdAt` is ISO 8601. `compose()` and the reducer (`retry` creates a new Challenge id, `save_rep` creates a Rep id) live in `src/domain`, which AD-2 forbids from using browser APIs or reading the time directly. Implementers will either break purity or mint ids in the store, and those two approaches diverge.
**Fix:** add `Random.uuid()` (or an `Ids` port) to `ports.ts`, and derive `createdAt` from `Clock.now()`. Say explicitly that the domain mints all ids through ports.

### F-5 — MEDIUM — AD-14 contradicts the import rule and leaves client validation unowned
AD-14 has the client form import `src/server/email/schema.ts` type-only. The Design Paradigm section says "`src/server` is never imported by client code", and the dependency diagram has no such arrow. A type-only import also gives the client no runtime validation, so FR-36's "rejects malformed addresses" check would be hand-written separately in the form and drift from the server.
**Fix:** move the schema to a shared module, for example `src/domain/signup/schema.ts` or `src/shared/`. Import it at runtime from both sides, add the arrow to the diagram, and keep only the Resend client in `src/server/email` (with `import 'server-only'`).

### F-6 — MEDIUM — The Resend `contacts.create` shape is wrong, and the duplicate-contact semantics are unsafe
The current Resend API (Global Contacts model) takes `segments: [{ id }]`, not `segments: [RESEND_SEGMENT_ID]`. Custom `properties` keys (`consent_at`, `consent_text_version`) must exist as contact properties beforehand. "An existing contact counts as success" is a problem under Global Contacts: a contact that already exists (for example from Preview testing, or from a person who unsubscribed and then signs up again) is *not* added to the Segment, and the new consent is not recorded.
**Fix:** write the call as `segments:[{id: RESEND_SEGMENT_ID}]`. On a conflict, add the existing contact to the Segment and update its consent properties, or state explicitly that a re-signup does not resubscribe someone who unsubscribed. Add "create the contact properties and the Segment in each environment" to an ops checklist (see F-8).

### F-7 — MEDIUM — Hosting assumptions are unverified: Hobby plan and WAF rate limiting
AD-14 rests on "one Vercel WAF rate-limit rule" on Hobby. I could not confirm from Vercel docs during this review that rate-limit rules are included on Hobby, or how many. Vercel's Hobby terms also limit use to non-commercial, personal projects. An email list for a product launch may already count as commercial, not "if it turns commercial" as the Deferred section says.
**Fix:** verify Hobby WAF rate-limit availability and quotas. Record a fallback in AD-14 (Pro plan, or `@vercel/firewall` `checkRateLimit`, which still needs a dashboard rule). Move the Hobby-vs-Pro choice from Deferred to an Open Question that the founder must answer before launch.

### F-8 — MEDIUM — Gaps in the operational envelope
AD-20 covers environments and secrets well. Not decided, deferred, or listed as open:
- **Sending domain:** verified Resend domain plus SPF, DKIM, and DMARC DNS records, the from-address, and the physical address used in Broadcasts.
- **Production domain:** the custom domain and DNS owner.
- **Rollback:** a broken library batch or bad deploy is reverted with Vercel Instant Rollback or a revert PR. Say which.
- **Privacy operations:** handling an erasure or access request (deleting the Resend contact), and who owns the `/privacy` text and consent-text versioning.
- **Build-script runtime:** `scripts/library/*.ts` run on `predev` and `prebuild`. Name the runner (`tsx`, or Node 24 native type stripping, which needs explicit `.ts` import extensions and no tsconfig path aliases into `src/domain`).
- **Preview behavior:** whether Preview deployments are protected (Vercel Authentication), and whether the WAF rule also applies to Preview.

**Fix:** add an "Operations" AD or a short ops table covering these, or list each item under Deferred or Open Questions with an owner.

### F-9 — LOW — A second config home for library thresholds
The Deferred section says the 2-per-cell bar, the 220-character cap, and the volumes are tuned "in the validator config". AD-16 also hard-codes ≥3 combinations and ≥60 headroom, and AD-19 claims `src/config/app.ts` as the only tunables source.
**Fix:** name one file (for example `content/library/pipeline/gate.config.json`, or a `library` section in `src/config/app.ts`) and reference it from AD-16 and AD-19.

### F-10 — LOW — Smaller gaps
- **Direct `/stage` entry:** visiting `/stage` with no held Challenge (state `None`) is undefined. It could redirect to `/`, show an empty state, or compose one. Pick one in AD-1 or AD-7.
- **Recent-ring key:** `templateId+topicId` when `topicId` is null needs a defined key format, for example `${templateId}|${topicId ?? '-'}`.
- **Cross-tab safety:** AD-9 says last write wins. Two tabs can each start an Attempt, which breaks "at most one Attempt". Accept this explicitly, or have `start` re-read storage and refuse when an Attempt already exists.
- **Signup offline (NFR-4):** state that a network failure on the client maps to `unavailable`, with offline copy.
- **Server consent version:** the server accepts any `consentTextVersion`. Validate it against `config.signup.consentTextVersion`, which also requires an `api → config` arrow in the diagram.

## Diagrams

All five mermaid blocks parse as valid syntax: the flowcharts, `stateDiagram-v2`, `erDiagram` (relationship cardinalities `||--o{`, `|o--o{`, `}o--o{`, `||--|{`, and `||--o|` are all valid), and the pipeline flowchart. Consistency problems:

**Session state machine vs AD-7, AD-8, AD-18**
1. `tick` appears as an `Attempt` self-transition, but it is not an AD-7 event. AD-8 says ticks only re-render. Remove it, or label it "(render only, not an event)".
2. `toggle_lock` and `reroll` are not restricted to a completed reveal. This is fine, but the diagram does not show what `reroll` does to reveal progress (F-3).
3. `Finished` has only `save_rep` as an exit. There is no `discard` and no reload behavior (F-2).
4. `Saved` has no exit to `None`, and `Held` has no `discard`. Can a user drop a held Challenge without starting it? FR-10 says it stays until Reroll or **Get a challenge**, so this may be intentional. Say so.
5. Compose failure is not modeled. `reroll`, `vary`, and `new_challenge` returning `no_compatible` should be self-loops with a `blockingLock` error, and `vary` with a retired id should prompt (AD-5).
6. The setup, sound, and clear events from F-2 are missing.
7. `new_challenge` while in `Attempt` is not shown. The setup screen offers Resume/Discard, so `new_challenge` should be explicitly disallowed there.
8. `Held --> Held: new_challenge` plus `None --> Held: new_challenge` is correct for FR-10.

**Dependency flowchart vs text**
- There is no `app → src/server` arrow, yet AD-14 imports from `src/server/email` (F-5).
- There is no `api → config` arrow, but a consent-version check would need one (F-10).
- `adapters → gen` is the only path to the library, which matches AD-16. `scripts → domain` matches AD-4.

**ER diagram**
- `BATCH contains` and the `TAG` relations list only TEMPLATE and TOPIC. STYLE and CONSTRAINT are omitted, though AD-4 and AD-17 cover all fill kinds.
- `REP |o--o{ CHALLENGE : origin` looks like a linking graph, which AD-3 says origin "never forms". Label it "origin marker (not traversed)".
- `CHALLENGE ||--o| ATTEMPT` agrees with Retry minting a new Challenge id (AD-3). Good.

**System/deployment and pipeline diagrams:** consistent with AD-1, AD-13, AD-14, AD-16, AD-17, and AD-20.

## Tech currency (npm registry, checked 2026-10-08)

| Package | Spine | Registry latest | Status |
| --- | --- | --- | --- |
| next / eslint-config-next | 16.4.0 | 16.4.0 | current |
| react | 19.3.0 | 19.3.0 | current |
| typescript | 5.9.3 | 7.0.2 (latest 5.x is 5.9.3) | deliberate hold, justified under Deferred |
| tailwindcss | 4.3.3 | 4.3.3 | current |
| three / @types/three | 0.186.1 / 0.186.0 | 0.186.1 / 0.186.0 | current |
| zod | 4.6.5 | 4.6.5 | current |
| resend | 6.32.1 | 6.32.1 | current. The call shape is wrong (F-6). |
| vitest | 5.0.3 | 5.0.3 | current |
| @playwright/test | 1.64.0 | 1.64.0 | current |
| Node | 24.x | next@16.4.0 requires >=20.9.0 | OK |

The API facts check out: `proxy.ts` is the Next 16 name for middleware, `{{{RESEND_UNSUBSCRIBE_URL}}}` is Resend's Broadcast placeholder, and `renderer.setAnimationLoop(null)` is valid three.js. Resend's Audiences have moved to Segments under Global Contacts, and the spine's use of "Segment" is current.

## What is good (keep)

- AD-3 and AD-4: one `compose()` and one `isCompatible()`, shared by runtime and validator. This removes the largest divergence risk.
- AD-5 and AD-6: immutable snapshots with retire-never-delete ids.
- AD-8: wall-clock timer math, with nothing derived stored.
- AD-9 and AD-10: a single Repository with envelopes, migrations, memory fallback, and a hydration-safe `status`.
- AD-12: a precise decor gate, freeze, and containment.
- AD-16 and AD-17: a hard gate inside the build plus a batch contract. This concretely resolves PRD OQ-1.
- AD-20: a separate Preview Segment and no `NEXT_PUBLIC_` secrets.

## Recommended fix order

F-1 and F-2 (record shapes and events) → F-5 and F-6 (signup contract) → F-3 and F-4 → F-7 and F-8 (ops envelope) → the diagram fixes → F-9 and F-10.
