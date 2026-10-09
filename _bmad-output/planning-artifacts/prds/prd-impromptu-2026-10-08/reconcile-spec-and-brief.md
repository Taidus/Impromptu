# Reconciliation: founder spec + brief → PRD

- **Inputs compared:** founder's 16-section spec (conversation, 2026-10-08); `briefs/brief-impromptu-2026-10-08/brief.md`
- **Against:** `prd.md` and `addendum.md` (current on disk)
- **Excluded:** changes the founder made deliberately later in the session. These are camera mode → Challenge Stage, no linked reps, the Difficulty Dial with no gating, the generated library, no hashtag, no analytics, a single Resend list, desktop first, the Impromptu name, Cutout as a style reference only, and Intermediate → Experiment.

## Gaps (dropped or contradicted)

1. **Spec §6 says "Reward completing and reflecting on an attempt", but no reward exists.** FR-22 and FR-23 complete and save a Rep with no acknowledgement. Fix: add a short completion moment to FR-22, for example a stamp or sticker landing on the Rep with plain copy. It must make no quality judgement. Saving a Reflection gets its own small acknowledgement in FR-23.

2. **Spec §5 says to explain a skill "when requested", but the Challenge Stage has no way to request it.** FR-3 puts the Skill info control in setup only. FR-32 lists the Stage's allowed controls and leaves a skill-info control out, so a user who is mid-challenge cannot ask what "Perspective" means. Fix: add a quiet, collapsed skill-info control to the FR-32 list, outside the safe area and never opened automatically.

3. **Spec §6 says "advanced untimed practice should remain available", but there is no control for it.** FR-5 makes both timed and untimed Templates eligible at Perform, but the user cannot choose between them. A Perform user who wants untimed practice only gets it at random. Fix: add a Timed / Untimed / Either choice to FR-1 (shown only at Perform, default Either) and honor it in FR-5.

4. **Spec §8 says to "begin with a prominent action", but the entry to the Reveal contradicts itself.** UJ-1 has her tap **Get a challenge** on setup, which opens the Challenge Stage, and then tap **Get a challenge** again. FR-13 and FR-30 never say whether arriving on the Stage starts the Reveal or waits for a second prominent action. Fix: in FR-30, state that arriving on the Stage shows empty slots plus one prominent start action. That keeps the filmed "moment of pull". Then remove the duplicate tap from UJ-1, or rename it.

5. **Spec §8 says "keep sound optional", and the PRD never sets a default.** FR-16 makes sound optional with a persistent mute, but does not say whether sound starts on or off. The style reference has sound off until turned on, and autoplay policy forces that anyway. Fix: in FR-16, sound is off by default. The user turns it on, and the choice persists.

6. **Spec §16 asks that the "collage and Y2K direction is evident in composition, typography, artwork, and motion", but nothing tests it.** §6 describes the direction but nothing verifies it, and the qualities the spec calls theatrical, tactile and playful have no acceptance hook. Fix: add an NFR or §6 acceptance line. A design review of the Challenge Stage and the landing page should confirm each of four elements is present: material collage pieces for the reveal, the signature colors, the display typeface on reveal words, and Y2K accents. The same review confirms decoration settles (FR-33).

7. **Spec §16 says "understands the purpose without signing in", but no FR states it.** No account appears only in prose in the §4.1 description and in SM-1. Fix: add a consequence to FR-1 or FR-4: no account, sign-in, or email is needed to generate, reveal, complete, or save a Rep, and the headline and one-line explanation are visible before the first action.

8. **Spec §3 asks that the style vs. constraint distinction be understandable, but this is enforced in content only.** CL-4 covers the content, but nothing in the Reveal tells the user which piece is which. Fix: in FR-13, each landed Input carries a short visible label (Topic, Style, Constraint, Skill, Medium). The distinct treatments (torn paper, sticker, stamp) back up the label but do not replace it.

## Mechanical inconsistencies noticed (not input gaps)

- §0 says the assumptions are indexed in §11, but they are in §12.
- SM-C2 says it "Counterbalances SM-6", but SM-6 was removed. It should counterbalance SM-1 or SM-2.
- §9.1 lists "CL-1 to CL-5", but CL-6 exists.
- NFR-3a appears before NFR-3, so the numbering is out of order.
- NFR-3's performance target is "a mid-range phone over 4G", but the product is now desktop first. Add a desktop target, or confirm phones stay the stricter bar.
- §9.1 still says "the Cutout design system" is in scope, but §6 now calls it a style reference only.
- FR-27: the spec says to explain that progress is browser-only "clearly". The PRD only states it on the History screen. Consider also stating it at the first Save rep.

## §16 acceptance criteria → PRD mapping

| # | Spec §16 criterion | PRD home | Status |
|---|---|---|---|
| 1 | First-time visitor understands the purpose and can generate without signing in | §4.1 prose, SM-1 | **Weak**: no FR (gap 7) |
| 2 | Every challenge has an actionable deliverable | FR-7, CL-1, CL-3, SM-3 | Covered |
| 3 | Locks persist through rerolls | FR-9 | Covered |
| 4 | Unsupported or contradictory combinations are prevented | FR-2, FR-6, CL-3 | Covered |
| 5 | Early levels have no required timer | FR-5 | Covered |
| 6 | Timers start only after explicit action | FR-18, FR-20 | Covered |
| 7 | Reveal supports filming and quick use | FR-13, FR-14, FR-15, FR-31 | Covered |
| 8 | Challenge text readable and central (was camera mode) | FR-31, FR-34, SM-2 | Covered (now the Challenge Stage) |
| 9 | Collage and Y2K direction evident in composition, type, art, and motion | §6 only | **No testable home** (gap 6) |
| 10 | Decoration never covers instructions or controls | §6 hard rules, FR-31 | Covered |
| 11 | Keyboard, visible focus, reduced motion, mute | NFR-1, FR-17, FR-16 | Covered |
| 12 | Completing a rep saves and survives a refresh | FR-22, FR-23, FR-27 | Covered |
| 13 | Mobile handles long prompts without clipping | NFR-2 | Covered |
| 14 | Empty states and incomplete attempts behave clearly | FR-29, FR-21 | Covered |

**Verdict:** 12 of 14 are covered by FRs or NFRs. #1 lives only in prose and SM-1. #9 has no testable requirement.
