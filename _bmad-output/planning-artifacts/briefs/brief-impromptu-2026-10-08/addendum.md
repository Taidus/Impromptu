---
title: "Addendum: Impromptu Product Brief"
created: 2026-10-08
updated: 2026-10-08
---

# Addendum

## Landscape scan (2026-10-08, single-pass web research — not a full market study)

| Comparable | What it does | Progression | Filmable | Weakness |
|---|---|---|---|---|
| The Brainstormer | 3-wheel plot/subject/setting slot spin | No | Partly | Word mashups, no skill purpose; native only |
| Scritch (iPad) | Topic + materials + support + constraint prompts; community Jams | Light | No | Closest structural analog; drawing/iPad only |
| Sketch a Day / Oh Sketch! / Draw Every Day | Daily single prompt, reminders | No | No | Thin one-word prompts; habit-driven |
| Inktober-style 31-day lists | Shared monthly word list | No | Outputs only | Seasonal; Inktober brand has lost goodwill |
| Oblique Strategies apps | Random lateral-thinking cards | No | Minimal | Unblocking, not practice |
| Blank App ("Duolingo for creativity") | AI exercises + AI image tools, streaks, ~$9.99/mo | Streaks | Feed | AI does the making; streak pressure; paywall |
| Caprice (concept case study, may be unshipped) | One constraint/day, 11 disciplines, reflection over streaks | No | No | Philosophically closest |
| Generic spinners (Wheel Decide, SpinWheely) | Blank wheels | No | Yes — what TikTokers actually use | Zero creative content |

**Social reveal format:** TikTok has multiple discover clusters ("spin the wheel drawing challenge", "letting the wheel decide what I draw"). Pattern: filmed spin → reveal → timelapse → "masterpiece or flop". Viewers suggest wheel entries for the next video. Creators use generic or homemade spinners — no branded product owns the format. No reliable view-count aggregates found.

**AI vs curated:** visible anti-AI sentiment in art communities (#NoAI, #ThisMAIfreeArt, AI-less prompt lists) makes "human-curated" a credible positioning, not just a cost-saving default.

**Gaps:** skill-purposed prompts; progression without streak guilt (streak anxiety is a documented churn cause); a reveal designed for vertical video; multi-medium web access with no account; timed challenges (none seen among comparables).

Sources: engadget.com (Brainstormer), apps.apple.com (Scritch, Draw Every Day, Oblique Strategies), contra.com (Caprice), tiktok.com/discover/spin-the-wheel-drawing-challenge, printmag.com, habitdoom.com, networkcultures.org (2026-01-19).

## Carry-forward for PRD / UX

The founder's original 16-section spec (supplied in the brief session, 2026-10-08) holds PRD- and UX-level detail that the brief intentionally omits. Carry it forward as the primary input for `bmad-prd` and `bmad-ux`:

- **Randomizer rules:** compatible combinations; skill + exercise structure chosen per level; avoid recent combinations; lock/reroll; stable active challenge; exact retry.
- **Challenge inputs:** skill / topic / medium / style / constraint / time, with the style-vs-constraint distinction kept understandable.
- **Reveal choreography:** torn-paper topic, sticker style, stamped constraint; advance one step at a time; quick reveal; hold the final composition; optional sound with an obvious mute control.
- **Design system:** purple + yellow-orange signature colors, cream + near-black surfaces; one display face plus one readable sans; artwork motifs (hands, eyes, flowers, pencils, cameras, chrome, stars, orbital lines, inflated shapes).
- **Copy:** "Make something unexpected." / "Get a challenge" / "Reveal next" / "Start creating" / "Finish rep" / "Try another version". Variation prompt: "Keep your strongest choice. Change one other thing."
- **Example challenges** for the Explore, Develop and Perform levels (timed, writing).
- **Acceptance criteria:** all 14 items in spec §16.

## Level gating — option considered

The spec proposed rep-count unlock thresholds. Options considered: (a) all levels open from the start, (b) an "I already practice" skip to Develop, (c) keep the gates. **Chose (a).** Primary users are experienced creatives, and gating them into beginner prompts would drive them away; gates also contradict the no-penalty principle. Keep thresholds in config only as *suggested-level* hints.
