# Reconcile — Cutout design system → Impromptu spines

Input: Cutout design system (https://claude.ai/artifact/SnnfBhnRo7Y21JMoWy5qFE), `project/README.md` and `project/tokens.json` (version 1791522140-b33e). The local `design-system.json` copy is an asset index only. Status: **style reference only**. Naming, labels, page structure, and reveal mechanics are non-binding (PRD §6, founder decision).

## Carried verbatim into DESIGN.md

- All 33 color tokens (hex unchanged). `focus` aliases `grape`.
- Three families and their jobs, and all 16 type styles (wordmark expressed as `25vw`, Cutout's stated scaling).
- The spacing scale 4–120. Radii: none, scrap, pill (as `full`), disc.
- Shadow, tilt, depth, duration, and easing values, used in prose and component tokens.
- Grain opacity 0.1 (overlay, once per page).
- Grounds order night → lilac → paper → sun → night; seam fades of 120–260px; tickers; crossing pieces; orbit thread; numbered section header; red dots; vertical side text (journey furniture, Setup and Practice only).
- Contrast notes (re-measured; all match within 0.1).
- Controls: sun, ink, and line buttons; 52px targets; 2px grape focus ring at a 3px offset; no hard offset shadows.
- Phone rule: ≤ 860px, one column, 20px gutter, chrome hidden, stamp below the Topic.
- Reduced motion: everything stops, and pieces fade in over 120ms.

## Adapted (Impromptu requirement wins)

| Cutout | Impromptu spine | Why |
|---|---|---|
| Three reveal pieces (topic, style, constraint) | Five Inputs: Skill and Medium added as ticket tabs | PRD §3: an Input is any of five; FR-13 reveals each Input |
| `brief` 21px | `brief-stage` 32px desktop / 24px phone | FR-31 filming minimum |
| `stamp` 17px | `stamp-stage` 24px | Input values ≥ 24px |
| `topic` 56px | `topic-stage` 48px, falling to 32px when long | Fits the 9/16 safe-area column with wrapping |
| "Reveal a challenge", "Next", "Reveal all", "Start timer" | **Get a challenge**, **Reveal next**, **Quick reveal**, **Start creating** (working) | PRD working copy; Cutout labels non-binding |
| Brief appears after three pieces | Brief after all Inputs; reveal order Skill → Medium → Topic → Style → Constraint | FR-13 |
| Continuous motion as part of the brand | Stage still once held; motion limited to Setup and the Reveal | FR-15, FR-33 |
| Chrome image-based | three.js chrome on the Setup hero and the Reveal shuffle; images elsewhere and as the fallback | NFR-7, addendum |
| Section "Today's challenge" on lilac | The lilac ground hosts the Challenge Stage, a separate page | FR-30 |
| Foil shimmers continuously | Shimmer only while revealing | FR-33 |
| Wordmark "cutout" | Wordmark "impromptu" | Product name |
| `meta` header "01 — Cutout.Studio" | "01 — IMPROMPTU" | Product name |

## Dropped qualitative ideas (surface to founder)

- **"Today's challenge" (a daily shared challenge).** Cutout's lilac section implies one challenge of the day for everyone. The PRD has no daily challenge. Not carried; a possible v2 idea alongside themed packs.
- **"reveal. make. share."** Cutout's Y2K headline sample implies a share step. The PRD has no sharing feature (and no hashtags). The working line is "reveal. make. again."
- **Hover light sweep and 6% image zoom on posters.** Kept on Setup poster cards only; nothing similar on the Stage.
- **Alternate hero `hero-bloom-peony`.** Unused. One hero figure per page; the Practice page has no hero figure.
- **`bust` on a pastel sun disc with chrome-ring halo.** Available for Setup section 02 as decoration; not specified as required.
- **Cutouts and ornaments secondary kit** (hands, eyes, flowers, pencil, camera). Available as edge decoration; no placement specified.

## Conflicts found

None remain open. The spine follows the PRD everywhere Cutout and the PRD differ.
