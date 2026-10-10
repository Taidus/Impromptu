# Launch email checklist (Story 7.4)

Everything here is account-level (AD-20, AD-14). Items marked **founder** need the founder's account, money, or legal details; Claude cannot do them. Tick each box with the date and who did it.

## Vercel

- [ ] **founder** Custom domain attached to the `impromptu` project (Production). Domain: ______
- [ ] Vercel Deployment Protection on for Preview. _Already on: the project was created with Vercel Authentication for every non-custom domain (`ssoProtection.deploymentType = all_except_custom_domains`), so Preview URLs need a Vercel login and test signups are not publicly reachable._
- [ ] WAF rate-limit rule on `/api/subscribe`: fixed window, keyed by IP, 5 requests per 60 s, responds 429. Confirm it applies to Preview traffic (the rule is project-wide, not per environment).
- [ ] **founder** Environment variables, set per environment and never with a `NEXT_PUBLIC_` prefix:
  - Production: `RESEND_API_KEY`, `RESEND_SEGMENT_ID` (the real list)
  - Preview: `RESEND_API_KEY`, `RESEND_SEGMENT_ID` (the test list)
  - Development: none committed; a gitignored local `.env` only

## Resend

- [ ] **founder** Resend account; sending domain on the custom domain above with SPF and DKIM verified.
- [ ] **founder** Two Segments: `impromptu-updates` (Production) and `impromptu-updates-test` (Preview).
- [ ] **founder** In each Resend environment, two custom contact properties of type string: `consent_at` and `consent_text_version`.
- [ ] **founder** Broadcast template that includes `{{{RESEND_UNSUBSCRIBE_URL}}}` and the sender's physical postal address (CAN-SPAM). Address: ______
- [ ] Test Broadcast to the Preview Segment; one-click unsubscribe works. The app has no unsubscribe route (Cross-Document Resolution 4).

## Preview smoke tests (after the env vars exist)

- [ ] Sign up the same address twice on a Preview deployment: `{ok:true}` both times, one contact in the test Segment.
- [ ] Send 6 requests to `/api/subscribe` within a minute from one IP: the 6th gets 429 and the form shows "Too many tries. Wait a minute and try again."
- [ ] Erasure path: delete the contact in Resend; the privacy note's contact address (`copy.privacy.contactEmail`) is confirmed and monitored. Address: ______

## Design decisions

- [ ] **founder** Setup hero layout (Story 8.4): keep the wide single-line headline with a narrow (20%) art column, or switch to DESIGN's two-line headline so the bloom and 3D hero get a ~590px column. See `_bmad-output/implementation-artifacts/deferred-work.md`.

## Rollback

Vercel Instant Rollback to the previous Production deployment. No server data migrates; user data lives in browsers and contacts live in Resend.
