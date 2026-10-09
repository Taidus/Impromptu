# Epic 7 Context: Email Updates and Privacy

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

A visitor can opt in to occasional emails after a saved Rep or from the footer, with explicit consent and a privacy note, and every email can be unsubscribed. Email signup is the only data the site collects. The production environment must be ready to send before launch.

## Stories

- Story 7.1: Subscribe endpoint with consent, honeypot, and Resend
- Story 7.2: Email signup form on the Stage and in a reusable footer variant
- Story 7.3: Privacy note page
- Story 7.4: Email environments, rate limit, and the launch email checklist

## Requirements & Constraints

- **FR-35 (Optional signup):** One address, one list. The offer appears after a saved Rep and in the footer, never blocking or interrupting a Reveal or an Attempt. The form states what the user receives, links to a privacy note, and records explicit opt-in consent. Submission goes through a server-side endpoint; no email-service key ever reaches the browser.
- **FR-36 (Signup feedback and abuse resistance):** The form shows success and error states, rejects malformed addresses, and is rate-limited per client.
- **FR-37 (Unsubscribe):** Every email sent includes a working unsubscribe link.
- **NFR-4 (Reliability):** If the connection drops, email signup shows a clear offline error.
- **NFR-5 (Privacy):** No analytics or tracking. The only personal data is an opted-in email address held by the email provider. A privacy note states this.

## Technical Decisions

- **Signup contract (one Resend Segment, explicit consent, edge rate limit):**
  - `POST /api/subscribe` is a Node runtime Route Handler. Request/response are validated by one zod schema in `src/shared/subscribe.ts`, shared by client and server so the email check never differs between them.
  - Request: `{email, consent, consentTextVersion, website}`. `website` is a honeypot: non-empty means a bot, and the route returns `{ok:true}` without calling Resend.
  - `consent` must be `true`, or the route returns `consent_required`.
  - On success it calls `resend.contacts.create({email, unsubscribed:false, segments:[{id: RESEND_SEGMENT_ID}], properties:{consent_at, consent_text_version}})`. The server sets `consent_at` (ISO 8601); the client never sends it.
  - Resend documents no duplicate-email error, so the route does not rely on one: if `create` errors, it looks the contact up by email. If found, it adds the contact to the Segment and updates the two properties without touching `unsubscribed`, then returns `{ok:true}`. Any other failure returns `unavailable`.
  - Response is exactly `{ok:true}` or `{ok:false, error:'invalid_email'|'consent_required'|'rate_limited'|'unavailable'}`. The client (Story 7.2) adds `offline` for a failed fetch.
  - Rate limiting is one Vercel WAF rule (5 req/60s/IP, 429) added in Story 7.4 — not application code.
  - Unsubscribe is handled entirely through Resend Broadcasts (Story 7.4); the app has no unsubscribe route.
- **No third-party runtime requests:** the browser never calls Resend or any analytics/tracking service. The only outbound call is server-side, from `/api/subscribe`. Server logs never contain an email address.
- **Secrets and environments:** `RESEND_API_KEY` and `RESEND_SEGMENT_ID` are server-only env vars, never `NEXT_PUBLIC_`-prefixed, set per Vercel environment (Production/Preview) in Story 7.4. Client code never imports `src/server`.
- **Layering (import boundaries):** `src/shared` imports only `zod`. `src/server` imports only `@/shared` and `@/config`. `src/app/api/**` imports only `@/server`, `@/shared`, `@/config`. Only `src/app/api/**` may import `@/server` from under `src/app`.
- **Config:** `src/config/app.ts` holds `signup.consentTextVersion`, the only source for that value; the client sends whichever version it was built with.
- **Static-first routing:** `/`, `/stage`, `/practice`, `/privacy` stay fully statically prerendered (`npm run check:static`); `/api/subscribe` is the one dynamic exception and is a Route Handler, not a page, so it is outside that check's scope.
- **Stack:** `resend` (Node SDK) 6.32.1 is added in Story 7.1 (not installed before this epic).

## UX & Interaction Patterns

- Signup placement: the form appears only in the footer and after a saved Rep. It never appears as a modal, during a Reveal or Attempt, or as a gate.
- Honeypot field is off-screen with `aria-hidden="true"`, `tabindex="-1"`, `autocomplete="off"`, and a non-email field name, so keyboard/screen-reader users and autofill never reach or fill it.
- Error copy maps 1:1 to the five response codes (`invalid_email`, `consent_required`, `rate_limited`, `unavailable`, plus client-only `offline`); values are kept on every error.

## Cross-Story Dependencies

- Story 7.1 (this story) delivers the endpoint and shared schema that Story 7.2's form calls directly.
- Story 7.2's footer variant is placed into the page by Story 8.1 (different epic); the lilac Stage card depends on the Saved state from Epic 5.
- Story 7.3 (privacy note) and Story 7.4 (real env vars, WAF rate limit, Resend domain/segments) are out of scope for Story 7.1 and must not be anticipated with real credentials or routes.
