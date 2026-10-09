---
title: 'Story 7.2: Email signup form on the Stage and in a reusable footer variant'
type: 'feature'
created: '2026-10-09'
status: 'done'
baseline_commit: '31c678c'
route: 'oneshot'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The subscribe endpoint (7.1) exists but nothing in the UI can call it. The night footer (8.1) and the Stage Saved state (5.6) both need the same quiet signup form.

**Approach:** Build `EmailSignup` as a standalone client component in `src/components/` with `variant: "night" | "lilac"` per DESIGN → Email signup: email field (`type="email"`, `autocomplete="email"`), unticked consent checkbox with the consent line, "Sign up" button (ink button on night, line button on lilac), privacy link to `/privacy` opening in a new tab with a visually hidden "(opens in new tab)", and an off-screen honeypot `website` field (`aria-hidden`, `tabindex=-1`, `autocomplete="off"`). Client validation runs the shared zod schema from `src/shared/subscribe.ts`; errors use `aria-describedby` and `aria-invalid`, the malformed-email error returns focus to the field. Submitting disables the button ("Signing up…") while fields stay editable. Responses map to the EXPERIENCE copy: success replaces the form with "You're on the list." and moves focus there; 429 → rate-limited copy; `unavailable` → server-error copy; failed fetch → offline copy; values are kept on every error. The component sends `consentTextVersion` from `config.signup.consentTextVersion`. All strings live in `copy.ts`. Placement on the Stage (5.6) and in the footer (8.1) is out of scope. No page hosts the form yet, so there is no e2e; the submit logic is a pure `submitSignup(fetchLike, values)` function covered by Vitest for every branch, and the component is thin over it.

**Decisions (overseer, under founder delegation):** no storybook or demo route; the form's fetch logic is a pure function so Vitest covers every response branch without a DOM. The "(opens in new tab)" hint is visually hidden text (accessibility review finding).

</frozen-after-approval>

## Implementation Notes

- `src/components/signup.ts`: `validateSignup` (email first, then consent, via the shared zod schema) and `submitSignup(fetchLike, values)` which maps 429, `{ok:false}` bodies, malformed bodies and thrown fetches to the five error codes. `signup.test.ts` covers every branch.
- `src/components/EmailSignup.tsx` ("use client"): night and lilac variants; the lilac card wraps both the form and the success line so the card never disappears; its controls use `ground="paper"` because they sit on cream. Focus moves in a `useEffect` after commit (field on invalid email, button on form-level errors, success line on done). Inline messages are `role="status"` (polite) and linked with `aria-describedby`; the submit button is linked to the form-level message. Validation runs before the button is disabled so focus is never dropped.
- `tokens.css`: `text-label` and `checkbox-consent` utilities (grape fill, cream tick as an inline SVG pinned to `--color-cream`, native box under forced-colors).
- `copy.signup` holds every string; the duplicate `state.emailSignupPitch` was removed and `config.signup.consentTextVersion` is cross-referenced from both files.
- `InkButton`/`LineButton` now type their props as `ComponentProps<"button">` so a `ref` can be passed (React 19).
- Checked in Chrome on a throwaway page (not committed): both variants, invalid-email and consent errors, grape tick, and the real endpoint's `unavailable` response without env keys.
- Verification: lint, typecheck, 248 unit tests pass. No e2e (no page hosts the form until 5.6 / 8.1).

## Review Triage Log

| # | Finding | Verdict | Evidence | Route |
|---|---|---|---|---|
| 1 | Disabled button drops focus; validation ran after `submitting` | medium | Chrome blurs a disabled control; EXPERIENCE focus rule | patch |
| 2 | `role="alert"` is assertive; design says polite | low | Double announcement with `aria-describedby` | patch |
| 3 | Form-level error not linked to a control | low | `aria-describedby` now on the button | patch |
| 4 | rAF focus races the React commit | medium | Replaced by `useEffect` keyed on status/error/attempt | patch |
| 5 | Lilac success loses the card | low | Card now wraps both states | patch |
| 6 | Lilac controls used `ground="lilac"` on a cream card | low | Now `paper` | patch |
| 7 | Consent line duplicated in copy | low | Removed `state.emailSignupPitch` | patch |
| 8 | Version not tied to the consent text | low | Comments in both files | patch |
| 9 | Hardcoded honeypot label | low | Moved to `copy.signup.honeypotLabel` | patch |
| 10 | Cream hex in tick SVG; no forced-colors fallback | low | Comment pins it; `appearance: auto` under forced-colors | patch |
| 11 | Honeypot had no positioned ancestor | low | Form is `relative` | patch |
| 12 | Error border changed field height | low | 1px border + inset shadow keeps height | patch |
| 13 | Tests missed 200 `rate_limited` body and trimming | low | Added | patch |
| 14 | Implementation Notes empty | low | Filled | patch |
