---
title: 'Story 7.4: Email environments, rate limit, and the launch email checklist'
type: 'chore'
created: '2026-10-09'
status: 'in-progress'
baseline_commit: 'da54b04'
route: 'oneshot'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Production and Preview email must be set up so test signups never reach the real list, `/api/subscribe` is rate-limited, and every Broadcast can be unsubscribed (AD-14, AD-20).

**Approach:** Ship `docs/launch-checklist.md` listing every account-level step with owner and evidence fields. Account-level actions (custom domain, Resend domain/Segments/properties/template, env secrets, physical address, WAF rule, Deployment Protection) are the founder's; the overseer records what is already true and what remains.

</frozen-after-approval>

## Implementation Notes

- `docs/launch-checklist.md` written with every AC item. Deployment Protection is already on for all non-custom domains (project default).
- WAF rate-limit rule attempted via the Vercel API on 2026-10-09: `PATCH /v1/security/firewall/config` returned 404 "Seawall Config not found" (no firewall config exists for the project yet). Left as a founder item; the rule body is: path eq `/api/subscribe`, rate_limit fixed_window 60 s, limit 5, key ip, 429.
- Story stays `in-progress` until the founder completes the account items; the Preview smoke tests run after the env vars exist.
