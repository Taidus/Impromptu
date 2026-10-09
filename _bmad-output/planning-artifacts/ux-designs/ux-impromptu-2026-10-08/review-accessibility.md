# Accessibility Review — Impromptu

## Verdict
The spines are better than most on accessibility. The type ramp, 52px targets, the countdown that never ends the Attempt (2.2.1), the reduced-motion rules, and the "never by color alone" rule are all real strengths, and most of the text pairs that are listed check out. AA still fails in a few specific places, though. The focus ring drops below 3:1 on four of the grounds actually used (lilac-deep, night-glow, sun-orange, sun-deep). Two text pairs fail outright: the cream "LOCKED" caption on lilac, and the dial labels if they sit on the sun face. Ambient motion on Setup has no pause control (2.2.2). Several Stage step changes destroy the focused control, or change content without announcing it. No finding is critical. Each high finding is a defect a builder will ship unless the spine is fixed first.

## Findings

- **[high]** The focus ring (`{colors.focus}` #7a2cff, 2px at 3px offset) is claimed to clear 3:1 "against every ground", but the check only covers base grounds. It fails on the secondary stops the layout really uses: **lilac-deep 2.64:1** (the Stage edges, where the back and sound icon buttons sit at the viewport corners), **night-glow 2.91:1** (the hero glow behind the setup stack), **sun-orange 2.72:1** and **sun-deep 2.21:1** (the Setup 04 sun ground behind the second Get a challenge). (DESIGN.md § Colors, Focus bullet; § Layout, Challenge Stage corners; EXPERIENCE.md § Accessibility Floor, Keyboard). *Fix:* use a two-tone ring, a 2px `{colors.focus}` ring plus a 2px outer `{colors.cream}` halo (the halo separates the ring from mid-tone grounds; each ground then needs either ring or halo at ≥ 3:1 — re-verify). Or switch the ring to `{colors.grape-deep}` on lilac-deep (5.24:1 vs lilac; recompute for lilac-deep) and to `{colors.ink}` on any sun stop (≥ 7.07:1). Keep corner controls off lilac-deep, or add the halo there. Re-list ring/ground pairs for every gradient stop.

- **[high]** The "LOCKED" caption is specified as cream meta text under the piece, which puts it on the lilac ground: **cream on lilac 1.45:1** (needs 4.5:1, since meta is 10.5–14px). (DESIGN.md § Components, Lock toggle; frontmatter `lock-toggle`). *Fix:* set the caption in `{colors.plum}` (9.33:1 on lilac) or `{colors.plum-muted}` (5.87:1, but only 4.63:1 on lilac-deep). Or place it inside an ink chip (cream on ink 15.55:1).

- **[high]** The Difficulty Dial position labels are "`{typography.button}` in `{colors.cream}`" on the "upper arc" of a 220px sun disc. If a builder puts them on the disc face, they measure **1.17–2.20:1** (cream on sun-light/sun/sun-deep). The spec never says whether the labels sit on the face or on the night ground outside it. (DESIGN.md § Components, Setup controls, Difficulty Dial; frontmatter `difficulty-dial.position-label`). *Fix:* state that the labels sit outside the disc on `{colors.night}` (cream 15.97:1, and 14.17:1 on night-glow). If they must sit on the face, use `{colors.ink}` (≥ 7.07:1 on every stop).

- **[high]** Ambient motion on Setup runs forever with no user control: the three.js chrome piece, the chrome bob, the orbit ring, and the tickers (also kept on phones). The only stop is `prefers-reduced-motion`, an OS setting. That does not meet WCAG 2.2.2 (Pause, Stop, Hide) for auto-starting motion that lasts more than 5s next to other content. The foil shimmer (6s loop) and the 3D shuffle layer also run for the whole Revealing state, which can last indefinitely between presses. (EXPERIENCE.md § Motion and 3D, Setup hero row "Stops when: Never"; § Component Patterns, Ticker; DESIGN.md § Components, Foil slip). *Fix:* add a visible, keyboard-operable "Pause motion" toggle in the Setup header that persists in storage and also stops the Stage shuffle layer and shimmer. Or stop the shimmer and 3D between presses, so motion only runs during the ≈ 900ms shuffle.

- **[high]** Focus is lost when the focused control is removed. **Finish rep**: "The Reflection panel replaces the action row", so the focused sun button disappears and focus falls to `<body>`. **Unlock Medium** in a lock conflict removes itself. **Discard** and **Back** navigate to Setup with no focus target, and so do Setup → Stage and Practice → Get a challenge. Next.js client routing does not move focus. (EXPERIENCE.md § Interaction Primitives, Focus on the Stage; § State Patterns, Finished / Lock conflict / Discarded). *Fix:* define a focus target for every transition. Finished goes to the "Rep done." heading, made focusable with `tabindex="-1"`, or to the first Reflection field. Unlock Medium goes to **Reroll**. Arriving on Setup focuses the notice banner if one is shown, otherwise the `h1`. Arriving on the Stage focuses the sun button and announces the visually hidden `h1` "Challenge". Variation pick → Held goes to the relabeled sun button.

- **[high]** Content changes go unannounced outside the Reveal. The live region covers each landing and Quick reveal, but nothing is specified for **Reroll** (unlocked values change silently), the result of **Change it** / "Change it again", **Retry** and **Resume** opening into Held or Creating, or a reload restoring state. Screen-reader users would not know what changed. (EXPERIENCE.md § Accessibility Floor, Screen reader, Reveal; § State Patterns, Rerolling / Variation pick / Retry). *Fix:* reuse the Stage polite region. Reroll announces "Rerolled. Topic: …, Style: …" (changed Inputs only). Variation announces "Style changed: …". Retry and Resume announce "Retry. Challenge ready." followed by the Inputs and the Brief.

- **[medium]** The global key handler conflicts with scrolling. "When focus is on the page body, Space or Enter fires **Reveal next**", but the spec also says the Stage column scrolls at 200% zoom and on short viewports, where Space is the keyboard scroll key. Focus also lands on `<body>` exactly when a focused control is removed (see above), so stray Enter presses fire reveals. Screen readers in browse mode either swallow these keys or have them hijacked. (EXPERIENCE.md § Interaction Primitives, Keyboard). *Fix:* only handle the keys when `document.activeElement === document.body` and the column is not scrollable, or bind Enter only. Never `preventDefault` on Space when the column can scroll. Better still, since focus already rests on the sun button, drop the body handler.

- **[medium]** Esc navigates away from the Stage whenever no Attempt is running, including mid-Reveal. Screen-reader and voice-control users press Esc routinely to leave modes, so Esc becomes an accidental page exit. (EXPERIENCE.md § Interaction Primitives, Keyboard, Esc). *Fix:* let Esc only close popovers and dialogs, and leave the back button as the way to exit. If Esc-to-Setup is kept, make sure the mid-Reveal state is fully restored, which is stated for reload but not for Esc, and say so.

- **[medium]** The Quick reveal switch's off state does not meet non-text contrast. The cream thumb on the cream-dim track measures **≈ 1.8:1**, and the switch has no ON/OFF word or glyph. That breaks the spine's own rule that toggles carry a glyph or word. The on state passes (cream thumb on grape 4.87:1; grape vs night 3.28:1). (DESIGN.md § Components, Switch; frontmatter `switch`; EXPERIENCE.md § Accessibility Floor, Not by color alone). *Fix:* give the thumb a 1.5px `{colors.ink}` border (ink vs cream-dim 8.61:1), or make the off track `{colors.ink-soft}` with a cream border. Add a visible "ON"/"OFF" meta word, or a tick/cross glyph in the thumb.

- **[medium]** The countdown's live region is liable to be built wrong. The spec says "aria-live polite… announces only at minute marks", but if `aria-live` wraps the mm:ss digits it fires every second. "time's up." also replaces the digits in the same node. (EXPERIENCE.md § Component Patterns, Countdown). *Fix:* render the digits with `role="timer"` (implicit `aria-live="off"`). Use a separate visually hidden polite region that is written only at each whole minute, at 1:00, at "Paused"/"Resumed", and at "Time's up. Finish when you're ready."

- **[medium]** Shuffle "candidate flicks" are not hidden from assistive tech. If the value node cycles through candidates for about 900ms, the virtual cursor and braille displays read noise, and the list "Challenge inputs" changes mid-read. (EXPERIENCE.md § State Patterns, Revealing; § Accessibility Floor). *Fix:* render the flicker in an `aria-hidden` layer and keep the accessible value as "Topic, not revealed yet" until it lands. Then update the value and the polite announcement once.

- **[medium]** There is no photosensitivity check. The shuffle flicks candidates, and the three.js chrome shuffle layer animates "liquid chrome" glints behind the column. No limit is set on flash frequency or area (WCAG 2.3.1). (DESIGN.md § Elevation & Depth; EXPERIENCE.md § Motion and 3D). *Fix:* cap candidate changes at 3 per second or fewer, or keep each change below the general-flash area threshold. Ban full-field luminance swings in the 3D layer, so specular highlights stay under 25% of the viewport with no more than 3 bright-dark transitions per second. Add a PEAT/Harding check to the filming sign-off.

- **[medium]** Constraint stamp text can land on lilac. On phones the stamp "drops below the Topic", which may put it off the scrap and onto lilac. On desktop it hangs off the scrap's lower right corner. The 13px/12px piece label in `{colors.stamp}` on lilac is **3.93:1**, which fails 4.5:1. The 24px bold value passes as large text. The ink-mask wear also lowers the label's ratio from a starting point of only 5.47:1 on paper. (DESIGN.md § Components, Ink stamp; § Layout, Phone). *Fix:* keep the whole stamp on the scrap at every breakpoint, or give the stamp its own paper/cream backing (stamp on cream 5.72:1). Apply no mask wear to the piece label.

- **[medium]** The 320px and 400% reflow will break. The safe-area column has `minWidth: 360px` (`{spacing.safe-area-min}`), which is wider than a 320px viewport, or 1280px at 400%. Stage type also "never shrinks", so long Bodoni topics at 32px and the uppercase, tracked, tilted Unbounded stamp at 20px can overflow horizontally (WCAG 1.4.10). (DESIGN.md frontmatter `stage-safe-area`; § Typography, Stage ramp; EXPERIENCE.md § Responsive, 320px floor). *Fix:* apply `min-width: 360px` only above 860px, and use `width: calc(100% - 2*{spacing.gutter-phone})` below. Add `overflow-wrap: anywhere; hyphens: auto` on Topic, Style, the stamp, and the Brief. Let the stamp's box wrap onto two lines.

- **[medium]** Async confirmations are not announced: "Rep saved." / "Reflection saved." (focus moves to **Try another version**, so a screen reader reads only the button), "Exported.", and "Rep done." Only "All data cleared." and the form messages are flagged as announced. (EXPERIENCE.md § State Patterns, Saved / Exporting / Finished). *Fix:* send each one through a `role="status"` region, and say so in the spine.

- **[medium]** The signup honeypot is "hidden", but how is not defined. If it is hidden visually but still focusable or exposed, keyboard and screen-reader users (and autofill) fill it and get silently rejected. (EXPERIENCE.md § Component Patterns, Email signup). *Fix:* wrap it in `aria-hidden="true"` with `tabindex="-1"`, `autocomplete="off"` and a non-email name, positioned off-screen. Never use `display:none` on its own, since bots skip that.

- **[medium]** Phone controls sit over imagery. "Hero art is masked into night beneath the setup controls", so the cream text, cream chip outlines, and the grape focus ring land on an unverified, image-derived ground. (DESIGN.md § Layout, Phone; EXPERIENCE.md § Responsive). *Fix:* require a solid `{colors.night}` (or a night scrim ≥ 0.85) behind the full setup stack. Mask the art only outside the stack's bounding box.

- **[medium]** The phone Difficulty Dial ("horizontal four-stop track with a sun-gradient thumb") has no track color, stop labels, or focus treatment. The thumb vs night ground is fine, but the track vs night is undefined, and the grape ring on the sun thumb fails (2.21–4.18:1). (DESIGN.md § Components, Difficulty Dial; EXPERIENCE.md § Responsive). *Fix:* use a `{colors.cream-dim}` track (8.85:1 on night) with cream stop labels outside it. Draw the ring on night around the thumb at the 3px offset (3.28:1), or use the cream halo from the first finding.

- **[low]** The disabled sun button on the Stage ("Change it", disabled until a pick) is a cream-dim fill on lilac at **1.24:1**, which makes it nearly invisible. Disabled controls are exempt, but the button also gives no reason it is disabled. *Fix:* use `aria-disabled="true"` so it stays focusable, and put "Pick one to change." in an `aria-describedby` hint. Give the disabled state a 1px `{colors.plum-muted}` border (5.87:1).
- **[low]** The consent checkbox is 24px, against the spine's own "at least 52px for every control" floor. *Fix:* make the whole label row the hit area (≥ 52px tall), or state the exception explicitly.
- **[low]** The lock toggle and the sound button change both the accessible name ("Lock Topic"/"Unlock Topic") and, by implication, `aria-pressed`. That pairing announces contradictory states. *Fix:* use a fixed name ("Lock Topic") with `aria-pressed`. For sound, use `aria-pressed` on "Sound", or a switch.
- **[low]** The segmented control's selected segment is shown only by an inverted fill. Chips get a tick, but segments get none, which is inconsistent with the "glyph or word" rule. *Fix:* add a leading tick to the selected segment, as on chips.
- **[low]** The Reflection counter is announced "live from 240", which risks a per-keystroke announcement. *Fix:* announce at 240, 260, 270, and 280 only, or set `aria-live="polite"` with a debounce.
- **[low]** Colors are left unspecified for the countdown caption, the "SOUND OFF" caption, the RETRY/VARIATION meta, and the outline-pill tag. DESIGN.md says unlisted pairs must not carry text. *Fix:* name `{colors.plum}` for all Stage meta.
- **[low]** The privacy link opens in a new tab without warning. *Fix:* add a visible or hidden "(opens in new tab)".
- **[low]** The rep-done stamp "never covers the Brief" but may cover Topic text, and the Constraint stamp on desktop can overlap long, three-line Topic values. *Fix:* forbid either stamp from overlapping any value text box.
- **[low]** Piece labels (SKILL, TOPIC…) should be written in sentence case with CSS `text-transform: uppercase`, so screen readers don't spell them out. Decorative images (hero portrait, poster images, chrome) need `alt=""`. Name landmarks (`header`, `main`, `footer`).
- **[low]** Practice: the night header band and the ink button sit on night at **1.03:1**, so the button boundary disappears if an ink button is ever placed on night (for example the footer "Sign up"). *Fix:* on night, use button-line (cream) or button-sun.

## Verified pairs

Ratios were computed from the DESIGN.md frontmatter hex values (WCAG 2.x relative luminance). Thresholds: 4.5:1 for small text, 3:1 for large text (≥ 24px, or ≥ 18.66px bold) and for non-text components.

| fg | bg | ratio | result | where used |
|---|---|---|---|---|
| cream #f1ebdf | night #121010 | 15.97 | pass | hero text, chips, segments, dial labels (if off-face), footer |
| cream | night-glow #221c19 | 14.17 | pass | hero glow area |
| cream-dim #b9b0a2 | night | 8.85 | pass | dial description, footer secondary, switch off track vs ground |
| cream-dim | night-glow | 7.85 | pass | same, on glow |
| amber #e9a24a | night | 8.79 | pass | floating italics |
| plum #241f2a | lilac #c7c2db | 9.33 | pass | Brief, countdown, Stage text |
| plum | lilac-deep #b3abca | 7.36 | pass | Stage edges |
| plum-muted #463e52 | lilac | 5.87 | pass | empty-slot dashed border + label, icon-button border, guidance line |
| plum-muted | lilac-deep | 4.63 | pass (barely) | same, at edges |
| plum-muted | cream | 8.54 | pass | unlocked padlock on ticket tab |
| ink #171311 | paper #ece6dc | 14.87 | pass | Practice body, dialog |
| ink | paper-blush #d9d2d6 | 12.43 | pass | seam |
| ink-soft #3f3830 | paper | 9.30 | pass | secondary text |
| ink-soft | cream | 9.72 | pass | text-field border, rep-card meta |
| ink-soft | cream-dim | 5.38 | pass | disabled sun button text |
| ink | cream | 15.55 | pass | ticket value, scrap value, banner, popover, chip-on |
| ink | cream-dim | 8.61 | pass | proposed switch thumb border |
| vermilion-ink #a8361f | paper | 5.27 | pass | small red labels |
| vermilion-ink | cream | 5.51 | pass | ticket/scrap piece labels, error border |
| vermilion-ink | lilac | 3.79 | **fail** (small) | must not be used on lilac |
| vermilion #c9452f | paper | 3.87 | large only | display italics, poster last word (40px) |
| vermilion | cream | 4.04 | large only | — |
| stamp #a92e1c | paper | 5.47 | pass | Constraint stamp on scrap |
| stamp | cream | 5.72 | pass | proposed stamp backing |
| stamp | lilac | 3.93 | **fail** (small label) / pass (24px bold value) | stamp off-scrap, phone stamp |
| ink | sun-light #ffd84a | 13.34 | pass | sun button top |
| ink | sun #ffb21a | 10.23 | pass | sun button, Setup 04 |
| ink | sun-orange #ff9a14 | 8.69 | pass | Setup 04 |
| ink | sun-deep #ff7a0a | 7.07 | pass | sun button bottom stop |
| grape-deep #5414c9 | sun | 5.01 | pass | Y2K headline on sun |
| grape-deep | sun-orange | 4.26 | large only | Y2K headline (92px OK) |
| grape-deep | sun-deep | 3.46 | large / non-text only | dial pointer notch |
| grape-deep | sun-light | 6.54 | pass | dial pointer |
| grape-deep | lilac | 5.24 | pass | rep-done stamp over lilac |
| grape-deep | paper | 7.29 | pass | rep-done stamp on scrap |
| cream | grape #7a2cff | 4.87 | pass (spec limits to 24px+) | switch-on thumb, checkbox tick |
| cream | grape-deep | 7.62 | pass | grape ticker |
| plum | foil-a/b/c/d | 10.45 / 12.90 / 13.18 / 14.34 | pass | foil slip label + value |
| focus grape | night | 3.28 | pass | ring on night |
| focus grape | night-glow | 2.91 | **fail** | ring in hero glow |
| focus grape | lilac | 3.35 | pass | ring on Stage centre |
| focus grape | lilac-deep | 2.64 | **fail** | ring at Stage edges/corners (back, sound) |
| focus grape | paper | 4.66 | pass | ring on paper |
| focus grape | cream | 4.87 | pass | ring inside banners/cards |
| focus grape | sun | 3.20 | pass | ring on sun |
| focus grape | sun-light | 4.18 | pass | — |
| focus grape | sun-orange | 2.72 | **fail** | Setup 04 sun ground |
| focus grape | sun-deep | 2.21 | **fail** | sun button / dial face / phone thumb |
| focus grape | cream-dim | 2.70 | **fail** | ring touching switch-off track |
| cream | lilac | 1.45 | **fail** | "LOCKED" caption |
| cream | sun-light / sun / sun-deep | 1.17 / 1.52 / 2.20 | **fail** | dial labels if on disc face |
| cream (thumb) | cream-dim (track) | ≈ 1.8 | **fail** (non-text) | switch off state |
| cream-dim | lilac | 1.24 | fail (disabled, exempt) | disabled "Change it" on Stage |
| ink | night | 1.03 | fail (boundary) | ink button on night |
