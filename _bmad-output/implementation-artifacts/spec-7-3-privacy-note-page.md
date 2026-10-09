---
title: 'Story 7.3: Privacy note page'
type: 'feature'
created: '2026-10-09'
status: 'done'
baseline_commit: 'fb23230'
route: 'oneshot'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `/privacy` is a placeholder. The signup form (7.2) and the night footer (8.1) link to it, and NFR-5 needs a plain statement of what is stored, where, and how to leave.

**Approach:** Replace the placeholder with a static paper-ground page (UX-DR30) using the 3.1 tokens and fonts: one lowercase `h1`, a lede, and short sections stating that practice data stays in this browser only; there is no analytics or tracking; the only personal data is an opted-in email held by Resend with the consent time and consent text version; emails are occasional updates; every email has an unsubscribe link; erasure requests are handled by deleting the contact in Resend, via a contact route (AD-20). All copy lives in `src/components/copy.ts`. A link back to Setup. Statically prerendered.

**Decisions (overseer, under founder delegation):** the erasure contact route is a `mailto:` link whose address is a copy entry (`copy.privacy.contactEmail`, working value `hello@impromptu.app`) for the founder to confirm in the Story 7.4 launch checklist. Reading-role utilities (`text-display-setup`, `text-lede`, `text-body`) are added to `tokens.css` in the same `@utility` form 3.1 used for buttons.

</frozen-after-approval>

## Implementation Notes

- Added `@utility` reading roles (`text-display-setup`, `text-display-phone`, `text-lede`, `text-body`, `text-meta`), `--spacing-reading-max: 760px`, and `--breakpoint-desktop: 861px` (DESIGN.md phone ≤ 860px) to `tokens.css`. Page uses `desktop:` instead of Tailwind's `md:`.
- All copy in `copy.privacy` (title, lede, five sections, contact lead, contact email). Back link reuses `copy.stage.back`. Root layout now sets a title template (`%s · Impromptu`).
- Back-to-setup link sits in the page header per EXPERIENCE.md IA; Story 8.1 adds the night band furniture.
- `e2e/privacy.spec.ts` iterates `copy.privacy.sections` and asserts the mailto route, the back link target, and the document title. The `/privacy` row in `routes.spec.ts` now expects the lowercase headline.
- Deviation noted: DESIGN.md lists `display-setup`/`display-phone` as Setup-only; used here for the paper-page headline (no other paper headline role exists). Contact address is a working value tracked in deferred-work.md.
- Verification: lint, typecheck, 176 unit tests, build (5 static routes), check:static, 15 e2e (5 × 3 browsers) all pass.

## Review Triage Log

| # | Finding | Verdict | Evidence | Route |
|---|---|---|---|---|
| 1 | `md:` breakpoint (768) instead of DESIGN's 860px phone cutoff | low | Real; added `--breakpoint-desktop` token | patch |
| 2 | Phone gutter used on desktop | low | DESIGN Layout: desktop side padding spacing.14 | patch |
| 3 | Raw `max-w-[760px]` | low | AR-23; token guard only scans components | patch |
| 4 | Hand-rolled focus ring, missing `focus:outline-none` | low | `ground.ts` helpers exist | patch |
| 5 | Duplicate "Back to setup" copy | low | `copy.stage.back` already exists | patch |
| 6 | Hardcoded title suffix | low | Title template in layout | patch |
| 7 | No test for the AC statements/links | medium | Only the h1 string was asserted | patch |
| 8 | Back link at bottom, IA says header | low | EXPERIENCE.md line 28 | patch |
| 9 | `nav aria-label="Page"` uninformative | low | Removed with #8 | patch |
| 10 | tokens.css comment overstates reuse | low | Comment trimmed, deviation recorded above | patch |
| 11 | Working contact address untracked | low | deferred-work entry added | patch |
