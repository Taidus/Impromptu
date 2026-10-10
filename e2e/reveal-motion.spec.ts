import { expect, test, type Page } from "@playwright/test";
import { copy } from "../src/components/copy";
import { emptySlotLabel } from "../src/components/stage/reveal-logic";

// Story 4.1: the shuffle-then-land motion on top of Story 3.10's instant
// Reveal. The default Setup always composes the same Template
// (tpl.observation.explore.nearby-object -- Skill: Observation, Medium:
// Drawing) per stage.spec.ts's own documented fact. In the current (thin,
// pre-Epic-2) production library that Template has exactly one compatible
// Medium/Topic/Constraint, so only Skill (Skill focus: random, six Skills)
// naturally shuffles -- the piece these tests drive.
const meta = (page: Page) => page.locator("p.text-stage-meta-phone");
const revealNext = (page: Page) => page.getByRole("button", { name: copy.button.revealNext });
const actionRow = (page: Page) => page.getByTestId("stage-action-row");

test("a press shuffles the piece (aria-hidden flicks) before the landed value appears", async ({ page }) => {
  await page.goto("/stage");
  await expect(meta(page)).toContainText("·", { timeout: 15_000 });

  await revealNext(page).click();
  await expect(actionRow(page)).toHaveAttribute("data-motion-status", "shuffling");
  await expect(actionRow(page)).toHaveAttribute("data-motion-kind", "skill");
  // Still mid-shuffle: the accessible value hasn't landed yet.
  await expect(page.getByText("Skill: Observation", { exact: true })).toHaveCount(0);

  await expect(page.getByText("Skill: Observation", { exact: true })).toBeVisible({ timeout: 3_000 });
  await expect(actionRow(page)).toHaveAttribute("data-motion-status", "idle");
});

test("a second press during a shuffle completes that piece at once and does not start the next one", async ({ page }) => {
  await page.goto("/stage");
  await expect(meta(page)).toContainText("·", { timeout: 15_000 });

  await revealNext(page).click();
  await expect(actionRow(page)).toHaveAttribute("data-motion-status", "shuffling");

  await revealNext(page).click(); // force-completes Skill
  await expect(page.getByText("Skill: Observation", { exact: true })).toBeVisible();
  await expect(actionRow(page)).toHaveAttribute("data-motion-status", "idle");
  // No skipped step: Medium hasn't started shuffling or landing.
  await expect(page.getByText(emptySlotLabel("medium"))).toBeAttached();
});

test("the live region announces the landed value once, not the flicks", async ({ page }) => {
  await page.goto("/stage");
  await expect(meta(page)).toContainText("·", { timeout: 15_000 });
  const live = page.locator('[aria-live="polite"]');

  await revealNext(page).click();
  await expect(actionRow(page)).toHaveAttribute("data-motion-status", "shuffling");
  await expect(live).toHaveText("");

  await expect(live).toHaveText("Skill: Observation.", { timeout: 3_000 });
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

  await revealNext(page).click(); // Skill (shuffles)
  await revealNext(page).click(); // force-complete it
  await expect(page.getByText("Skill: Observation", { exact: true })).toBeVisible();

  await revealNext(page).click(); // Medium: never shuffles with one enabled Medium
  // Lands within well under one shuffle's 900ms -- proof no shuffle ran.
  await expect(page.getByText("Medium: Drawing", { exact: true })).toBeVisible({ timeout: 700 });
});

test("a reload mid-shuffle keeps the landed pieces and waits for Reveal next", async ({ page }) => {
  await page.goto("/stage");
  await expect(meta(page)).toContainText("·", { timeout: 15_000 });

  await revealNext(page).click();
  await expect(actionRow(page)).toHaveAttribute("data-motion-status", "shuffling"); // confirms we reload before the 900ms timer fires

  await page.reload();
  await expect(meta(page)).toContainText("·", { timeout: 15_000 });

  const revealed = await page.evaluate(
    () => JSON.parse(localStorage.getItem("impromptu:session") ?? "null")?.data?.revealed ?? null,
  );
  expect(revealed).toEqual([]);
  await expect(page.getByText(emptySlotLabel("skill"))).toBeAttached();
  await expect(revealNext(page)).toBeFocused();
});
