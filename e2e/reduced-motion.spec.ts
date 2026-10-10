import { expect, test, type Locator, type Page } from "@playwright/test";
import { copy } from "../src/components/copy";
import { fullChallenge } from "../src/domain/session/session-fixture";

// Story 4.2: reduced-motion parity for the Reveal. The shuffle/landing state
// machine and its reduced-motion gate are Story 4.1's (reveal-motion.ts /
// useRevealMotion.ts) -- unit/render-tested there. This spec proves the
// user-visible contract at the Stage: under `prefers-reduced-motion: reduce`
// a keyboard reveal never shuffles, every landed Input and the Brief are
// present and announced, and the held composition's layout is pixel- and
// type-identical to the motion version -- never a second source of truth
// for "what the Reveal looks like", just a different entrance.
//
// Both passes seed the identical held Challenge directly into storage
// (`fullChallenge`: every Input kind, so Skill/Medium/Topic/Style/Constraint
// and the Brief are all covered) rather than composing one, so a layout
// difference can only come from the motion path itself, never from two
// different Challenges.
const meta = (page: Page) => page.locator("p.text-stage-meta-phone");
const actionRow = (page: Page) => page.getByTestId("stage-action-row");

async function seedHeldChallenge(page: Page) {
  await page.addInitScript((challenge) => {
    const session = {
      state: "held",
      challenge,
      revealed: [],
      locks: {},
      attempt: null,
      reflectionDraft: null,
      lastRepId: null,
      lastComposeError: null,
      recent: [],
    };
    localStorage.setItem("impromptu:session", JSON.stringify({ v: 1, rev: 1, data: session }));
  }, fullChallenge);
}

/** Records every `data-motion-status` the action row takes, across its own unmount (the Brief's landing). */
async function recordMotionStatuses(page: Page) {
  await page.evaluate(() => {
    const seen: string[] = [(document.querySelector('[data-testid="stage-action-row"]')?.getAttribute("data-motion-status")) ?? ""];
    (window as unknown as { __motionStatuses: string[] }).__motionStatuses = seen;
    new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === "attributes") seen.push((m.target as Element).getAttribute("data-motion-status") ?? "");
      }
    }).observe(document.body, { attributes: true, attributeFilter: ["data-motion-status"], subtree: true });
  });
  return () => page.evaluate(() => (window as unknown as { __motionStatuses: string[] }).__motionStatuses);
}

/** Presses Reveal next/Space via the keyboard once per present kind (6 for `fullChallenge`: skill, medium, topic, style, constraint, brief), waiting out each landing. */
async function revealAllByKeyboard(page: Page) {
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press(" ");
    await page.waitForFunction(() => {
      const row = document.querySelector('[data-testid="stage-action-row"]');
      return row === null || row.getAttribute("data-motion-status") === "idle";
    });
  }
}

interface PieceMetrics {
  box: { x: number; y: number; width: number; height: number } | null;
  fontSize: string;
}

// The Brief's own visible paragraph, distinct from the (also sr-only, also
// exact-text) live region that echoes it once it lands.
const briefBlock = (page: Page) => page.locator("p.text-brief-stage-phone");

/** Bounding box + computed font-size for every landed piece and the Brief, by their exact accessible text. */
async function collectMetrics(page: Page): Promise<Record<string, PieceMetrics>> {
  const locators: Record<string, Locator> = {
    skill: page.getByText("Skill: Observation", { exact: true }),
    medium: page.getByText("Medium: Drawing", { exact: true }),
    topic: page.getByText("Topic: An object near you", { exact: true }),
    style: page.getByText("Style: Minimal", { exact: true }),
    constraint: page.getByText("Constraint: One color only", { exact: true }),
    brief: briefBlock(page),
  };
  const out: Record<string, PieceMetrics> = {};
  for (const [kind, locator] of Object.entries(locators)) {
    const box = await locator.boundingBox();
    const fontSize = await locator.evaluate((el) => getComputedStyle(el).fontSize);
    out[kind] = { box, fontSize };
  }
  return out;
}

test("reduced motion: no shuffle, every piece present and announced, identical layout to the motion version", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });

  // --- Pass 1: the motion version (the baseline to compare against) -------
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await seedHeldChallenge(page);
  await page.goto("/stage");
  await expect(meta(page)).toContainText("·", { timeout: 15_000 });
  await revealAllByKeyboard(page);
  await page.waitForTimeout(100); // lets the Topic's ResizeObserver (fit-rule) settle before measuring
  const motionMetrics = await collectMetrics(page);
  await page.evaluate(() => localStorage.clear());

  // --- Pass 2: reduced motion -----------------------------------------------
  await page.emulateMedia({ reducedMotion: "reduce" });
  await seedHeldChallenge(page);
  await page.goto("/stage");
  await expect(meta(page)).toContainText("·", { timeout: 15_000 });

  const live = page.locator('[aria-live="polite"]');
  const statuses = await recordMotionStatuses(page);
  await revealAllByKeyboard(page);
  await page.waitForTimeout(100); // lets the Topic's ResizeObserver (fit-rule) settle before measuring

  // Never reaches "shuffling" at any point across the whole keyboard reveal.
  expect(await statuses()).not.toContain("shuffling");

  // Every landed Input and the Brief are present...
  await expect(page.getByText("Skill: Observation", { exact: true })).toBeVisible();
  await expect(page.getByText("Medium: Drawing", { exact: true })).toBeVisible();
  await expect(page.getByText("Topic: An object near you", { exact: true })).toBeVisible();
  await expect(page.getByText("Style: Minimal", { exact: true })).toBeVisible();
  await expect(page.getByText("Constraint: One color only", { exact: true })).toBeVisible();
  await expect(briefBlock(page)).toHaveText(fullChallenge.brief);
  // ...and announced: the live region's last word is the Brief itself (Story
  // 3.10's `announcementFor`), the final thing a full keyboard reveal lands.
  await expect(live).toHaveText(fullChallenge.brief);
  await expect(actionRow(page)).toHaveCount(0); // nothing left to reveal

  const reducedMetrics = await collectMetrics(page);

  // Content, position, and size are identical to the motion version -- only
  // the entrance differs. Opacity-only keyframes (Story 4.2) never move or
  // resize anything, so this holds exactly, not just approximately.
  for (const kind of Object.keys(motionMetrics)) {
    expect(reducedMetrics[kind].box, kind).toEqual(motionMetrics[kind].box);
    expect(reducedMetrics[kind].fontSize, kind).toBe(motionMetrics[kind].fontSize);
  }
});

test("reduced motion: a landed piece's entrance is the plain fade, never its full-motion material transition", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/stage");
  await expect(meta(page)).toContainText("·", { timeout: 15_000 });

  await page.keyboard.press(" ");
  await page.waitForFunction(() => document.querySelector('[data-testid="stage-action-row"]')?.getAttribute("data-motion-status") === "idle");

  // `motion.className` is on TicketTab's outer (tilted, rotate-transform)
  // div, two levels up from the label/value text itself (pieces.tsx).
  const skillTile = page.getByText("Skill: Observation", { exact: true }).locator("xpath=../..");
  expect(await skillTile.evaluate((el) => getComputedStyle(el).animationName)).toBe("reduced-fade");
});

test("full motion (no emulation): the Stage still shows Reveal next on entry, as a sanity check the two passes above are actually different modes", async ({
  page,
}) => {
  await page.goto("/stage");
  await expect(meta(page)).toContainText("·", { timeout: 15_000 });
  await expect(page.getByRole("button", { name: copy.button.revealNext })).toBeFocused();
});
