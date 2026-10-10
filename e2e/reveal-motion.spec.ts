import { expect, test, type Page } from "@playwright/test";
import { copy } from "../src/components/copy";
import { config } from "../src/config/app";
import { emptySlotLabel } from "../src/components/stage/reveal-logic";

// Story 4.1: the shuffle-then-land motion on top of Story 3.10's instant
// Reveal. The default Setup always composes the same Template
// (tpl.observation.explore.nearby-object -- Skill: Observation, Medium:
// Drawing) per stage.spec.ts's own documented fact. The current (thin,
// pre-Epic-2) production library has one Template per Level, each with one
// compatible Medium/Topic/Constraint, so with setup-allowed-only flick pools
// no piece has a second candidate: every press lands without a shuffle. The
// shuffle itself (aria-hidden flicks, shimmer) is unit/render-tested in
// reveal-motion.test.ts. These tests pause the page clock so the landing
// phase can be observed deterministically.
const meta = (page: Page) => page.locator("p.text-stage-meta-phone");
const revealNext = (page: Page) => page.getByRole("button", { name: copy.button.revealNext });
const actionRow = (page: Page) => page.getByTestId("stage-action-row");
const storedRevealed = (page: Page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem("impromptu:session") ?? "null")?.data?.revealed ?? null);

async function openStagePaused(page: Page) {
  await page.clock.install();
  await page.goto("/stage");
  await expect(meta(page)).toContainText("·", { timeout: 15_000 });
  const now = await page.evaluate(() => Date.now());
  await page.clock.pauseAt(now + 1_000);
}

/** Records every `data-motion-status` the action row takes, so a test can prove a phase never happened. */
async function recordMotionStatuses(page: Page) {
  await page.evaluate(() => {
    const row = document.querySelector('[data-testid="stage-action-row"]')!;
    const seen: string[] = [];
    (window as unknown as { __motionStatuses: string[] }).__motionStatuses = seen;
    new MutationObserver(() => seen.push(row.getAttribute("data-motion-status") ?? "")).observe(row, {
      attributes: true,
      attributeFilter: ["data-motion-status"],
    });
  });
  return () => page.evaluate(() => (window as unknown as { __motionStatuses: string[] }).__motionStatuses);
}

test("a press lands the piece; `revealed` and the live region update only once the landing elapses", async ({ page }) => {
  await openStagePaused(page);
  const live = page.locator('[aria-live="polite"]');

  await revealNext(page).click();
  await expect(actionRow(page)).toHaveAttribute("data-motion-status", "landing");
  await expect(actionRow(page)).toHaveAttribute("data-motion-kind", "skill");
  await expect(live).toHaveText("");
  expect(await storedRevealed(page)).toEqual([]);

  await page.clock.runFor(config.reveal.motion.landMs.skill);
  await expect(live).toHaveText("Skill: Observation.");
  await expect(actionRow(page)).toHaveAttribute("data-motion-status", "idle");
  expect(await storedRevealed(page)).toEqual(["skill"]);
});

test("a second press mid-landing completes that piece at once and does not start the next one", async ({ page }) => {
  await openStagePaused(page);

  await revealNext(page).click();
  await expect(actionRow(page)).toHaveAttribute("data-motion-status", "landing");

  await revealNext(page).click(); // force-completes Skill, clock still paused
  await expect(actionRow(page)).toHaveAttribute("data-motion-status", "idle");
  expect(await storedRevealed(page)).toEqual(["skill"]);
  // No skipped step: Medium hasn't started.
  await expect(page.getByText(emptySlotLabel("medium"))).toBeAttached();
});

test("a single-value Medium (one enabled Medium) lands without a shuffle", async ({ page }) => {
  await page.addInitScript(() => {
    const setup = {
      level: "explore",
      performTiming: "either",
      enabledMediums: ["med.drawing"],
      medium: "random",
      skillFocus: "random",
      quickReveal: false,
      sound: false,
      ambientMotion: true,
    };
    localStorage.setItem("impromptu:setup", JSON.stringify({ v: 1, rev: 1, data: setup }));
  });
  await page.goto("/stage");
  await expect(meta(page)).toContainText("·", { timeout: 15_000 });

  await revealNext(page).click(); // Skill
  await revealNext(page).click(); // force-complete it
  await expect(actionRow(page)).toHaveAttribute("data-motion-status", "idle");

  const statuses = await recordMotionStatuses(page);
  await revealNext(page).click(); // Medium
  await expect(page.getByText("Medium: Drawing", { exact: true })).toBeVisible();
  await expect(actionRow(page)).toHaveAttribute("data-motion-status", "idle");
  const seen = await statuses();
  expect(seen).toContain("landing");
  expect(seen).not.toContain("shuffling");
});

test("a reload mid-landing keeps the landed pieces and waits for Reveal next", async ({ page }) => {
  await openStagePaused(page);

  await revealNext(page).click();
  await expect(actionRow(page)).toHaveAttribute("data-motion-status", "landing");
  expect(await storedRevealed(page)).toEqual([]); // nothing committed mid-landing

  await page.clock.resume();
  await page.reload();
  await expect(meta(page)).toContainText("·", { timeout: 15_000 });

  expect(await storedRevealed(page)).toEqual([]);
  await expect(page.getByText(emptySlotLabel("skill"))).toBeAttached();
  await expect(revealNext(page)).toBeFocused();
});
