---
title: 'Subscribe endpoint with consent, honeypot, and Resend'
type: 'feature' # feature | bugfix | refactor | chore
created: '2026-10-09'
status: 'in-review' # draft | ready-for-dev | in-progress | in-review | done
route: 'dispatch' # oneshot | dispatch
review_loop_iteration: 0
context: []
baseline_commit: '4518307a414e701c12864257206d9604c8495338'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The site needs a way to collect opt-in email signups without ever exposing the Resend API key to the browser, without recording a contact without explicit consent, and without a bot-filled form silently polluting the mailing list.

**Approach:** Add `POST /api/subscribe`, a Node-runtime Route Handler backed by one shared zod schema (`src/shared/subscribe.ts`) and a `src/server/email` module that wraps `resend.contacts.create`, with a honeypot short-circuit, a consent gate, and a create-then-fall-back-to-update path for an email that is already a contact.

## Boundaries & Constraints

**Always:** Validate with the one shared zod schema (AD-14). Set `consent_at` server-side (ISO 8601); never trust a client-sent value. Keep the five response codes exactly as specified. Honor import boundaries (`src/shared` imports only `zod`; `src/server` imports only `@/shared`, `@/config`; `src/app/api/**` imports only `@/server`, `@/shared`, `@/config`). Never log an email address.

**Never:** No rate limiting in app code (Vercel WAF, Story 7.4). No unsubscribe route (Story 7.4). No real `RESEND_API_KEY`/`RESEND_SEGMENT_ID` env vars, Vercel settings, or Resend resources — tests mock the Resend client. No changes to `/`, `/stage`, `/practice`, `/privacy` statically-prerendered status.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Honeypot filled | `website: "x"`, any other fields | `{ok:true}`, Resend never called | N/A |
| Malformed email | `email: "nope"`, `website: ""` | `{ok:false, error:'invalid_email'}` | Resend never called |
| Consent missing/false | valid email, `consent: false` | `{ok:false, error:'consent_required'}` | Resend never called |
| New contact | valid email+consent, Resend `create` succeeds | `{ok:true}` | N/A |
| Existing contact | `create` errors, `get` finds the contact | `segments.add` + `update` (properties only, `unsubscribed` untouched) called, `{ok:true}` | N/A |
| Provider failure | `create` errors, `get` also errors/not found, or `segments.add`/`update` errors, or client throws | `{ok:false, error:'unavailable'}` | Caught, never throws out of the route |

</frozen-after-approval>

## Code Map

- `src/server/email/.gitkeep`, `src/shared/.gitkeep` -- placeholders from Story 1.1/1.2 marking the intended module locations; this story fills them.
- `eslint.config.mjs` -- defines the `src/shared` (zod only), `src/server` (`@/shared`, `@/config`), and `src/app/api` (`@/server`, `@/shared`, `@/config`) import allow-lists already in place; no change needed.
- `scripts/check-static.mjs` -- filters required routes to keys ending in `/page`; a Route Handler's manifest key ends in `/route`, so `/api/subscribe` is already outside its scope — no change needed.
- `vitest.config.ts` -- `include: ["src/**/*.test.ts", "scripts/**/*.test.ts"]`; colocated `*.test.ts` files are picked up automatically.
- `node_modules/resend/dist/index.d.mts` -- real SDK shape confirms `contacts.create({email, unsubscribed, properties, segments:[{id}]})`, `contacts.get({email})`, `contacts.segments.add({email, segmentId})`, `contacts.update({email, properties})`, and that every call resolves `{data,error}` (never throws for API errors).

## Tasks & Acceptance

**Execution:**
- [x] `package.json` -- add `resend` pinned to `6.32.1` via `npm install resend@6.32.1 --save-exact` -- AD-14 stack pin
- [x] `src/shared/subscribe.ts` -- zod schema for `{email, consent, consentTextVersion, website}` plus the `SubscribeResponse` union type; imports only `zod` -- single source of truth for client+server validation
- [x] `src/server/email/subscribe.ts` -- `ResendContactsClient` type (narrow, mock-friendly), `createResendClient(apiKey)`, and `handleSubscribe(rawBody, client, segmentId)` implementing honeypot → schema → consent → create-or-update-existing logic -- AD-14 contract, testable without env vars
- [x] `src/app/api/subscribe/route.ts` -- `export const runtime = "nodejs"`; `POST` reads the body, reads `RESEND_API_KEY`/`RESEND_SEGMENT_ID` from `process.env`, builds the client, calls `handleSubscribe`, returns `Response.json(result)` (falls back to `unavailable` if either env var is unset) -- the Route Handler itself
- [x] `src/server/email/subscribe.test.ts` -- Vitest covering every I/O Matrix row with a fake `ResendContactsClient` -- AC proof
- [x] `src/app/api/subscribe/route.test.ts` -- one smoke test per happy/honeypot path calling `POST` directly with `resend` mocked via `vi.mock`, plus the missing-env-var fallback -- proves the wiring, not just the logic

**Acceptance Criteria:**
- Given a request with a non-empty `website`, when `POST /api/subscribe` is called, then it returns `{ok:true}` and Resend is never invoked.
- Given a malformed email, when the route runs, then it returns `{ok:false, error:'invalid_email'}`.
- Given `consent !== true`, when the route runs, then it returns `{ok:false, error:'consent_required'}`.
- Given a brand-new email with consent, when `resend.contacts.create` succeeds, then the route returns `{ok:true}` with `segments:[{id:RESEND_SEGMENT_ID}]` and `properties:{consent_at, consent_text_version}` in the call.
- Given `create` errors for an email that already exists, when the route looks it up, then it adds the Segment and updates the two properties without setting `unsubscribed`, and returns `{ok:true}`.
- Given any other provider failure, when the route runs, then it returns `{ok:false, error:'unavailable'}` and never throws.
- Given `npm run check:static`, when it runs after `npm run build`, then `/`, `/stage`, `/practice`, `/privacy` still report fully static and `/api/subscribe` is not required to be.

## Implementation Notes

- `resend.contacts.get`/`.update` require `SelectingField` (`{email}` or `{id}`); `segments.add` requires `{email|contactId, segmentId}` — confirmed directly against `node_modules/resend/dist/index.d.mts` rather than guessing at the API.
- `ResendContactsClient` is a hand-written narrow interface (not `Pick<Resend, "contacts">`), because `Contacts`/`ContactSegments` are `declare class`es with private fields — a plain mock object is not structurally assignable to them. This also keeps test fakes trivial.
- `check:static` needed no change: its route list comes from `app-path-routes-manifest.json` filtered to keys ending in `/page`; Route Handlers are keyed `/route` and were already outside scope. Verified by inspection of `scripts/check-static.mjs`, confirmed by running it after `next build`.
- Missing `RESEND_API_KEY`/`RESEND_SEGMENT_ID` at request time (never expected in a real deploy per AD-20, but reachable in a misconfigured preview) returns `unavailable` rather than throwing — the conservative choice; real env wiring is Story 7.4's job.
- No logging was added at all (not required by the AC), which trivially satisfies "no log line contains an email address."

## Review Triage Log

| # | Layer | Finding | Verdict | Evidence | Route |
|---|---|---|---|---|---|
| 1 | verif-gap, edge | Missing/non-boolean `consent` returns `invalid_email`, not `consent_required` | medium | Code: schema failure short-circuits before the consent check; AC requires `consent !== true` → `consent_required` | patch |
| 2 | blind | Response is a hand-written type, AC says one zod schema defines request and response | low | `src/shared/subscribe.ts` exports a TS union only | patch |
| 3 | blind, edge | Deprecated `z.string().email()`; pasted email with spaces rejected; `consentTextVersion` unbounded | low | zod 4.6.5 deprecates the method; no trim; empty/huge version reaches Resend consent record | patch |
| 4 | blind | Provider failures are silent | medium | Every error branch returns `unavailable` with no log; AD-13 only forbids logging the email, and Vercel logs are the sole operational signal (AD-20) | patch |
| 5 | verif-gap, blind | `update` failure on existing-contact path untested | low | Pre-verified: reducing the check to `added.error` passes all tests | patch |
| 6 | verif-gap, blind, edge | Route test doesn't assert env wiring; honeypot test title is wrong | low | Pre-verified: swapping key/segment still passes; `route.ts` constructs `Resend` before `handleSubscribe` | patch |
| 7 | blind | `package-lock.json` missing | false | Orchestrator excluded the lockfile from the review diff; commit `e68d001` includes it (+50 lines) | reject |
| 8 | edge | `rate_limited` never produced | false | AD-14: rate limiting is the Vercel WAF 429, mapped to `rate_limited` by the client; server never emits it | reject |
| 9 | edge | Any `create` error falls into the existing-contact lookup | false | AD-14 prescribes exactly this because Resend documents no duplicate error | reject |
| 10 | edge | Env check precedes honeypot | low | Only when Production env is missing; config failure, not user-facing | reject |
| 11 | edge | `segments.add`/`update` run in parallel; partial success | low | Both failures already return `unavailable`; retry is idempotent | reject |
| 12 | edge | Unbounded request body | low | Platform body limit plus WAF 5 req/60 s; adds guard complexity | reject |
| 13 | edge | Non-string honeypot value returns `invalid_email` | low | Bots fill text fields with strings; unlikely | reject |
| 14 | blind | All responses HTTP 200 | low | AD-14 contract is the JSON body; 503 is optional | reject |
| 15 | blind | Env vars undocumented locally | low | Story 7.4 owns environments and the launch checklist | reject |
| 16 | blind | Missing tests for non-JSON body, missing segment env, `get` null data | low | Covered by the same branches as patched tests; marginal | reject |

## Verification

**Commands:**
- `npm run lint` -- expected: no import-boundary or other lint violations
- `npm run typecheck` -- expected: clean `tsc --noEmit`
- `npm test` -- expected: all Vitest suites pass, including the new subscribe tests
- `npm run build` -- expected: production build succeeds with the new Route Handler
- `npm run check:static` -- expected: `/`, `/stage`, `/practice`, `/privacy` still report fully static
- `npm run check:privacy` -- expected: `resend` (server-only Node SDK) is not a banned analytics/error-monitoring package, so this still passes
