import { expect, test, type Page } from "@playwright/test";
import { copy } from "../src/components/copy";

// Story 4.3. The default Setup always composes the same Template
// (tpl.observation.explore.nearby-object -- Skill: Observation, Medium:
// Drawing, a Constraint, no Style, Quick reveal off), the same production-
// library fact e2e/stage.spec.ts documents. It is also the *only* compatible
// combo at that Level, so an unlocked Reroll still redraws the identical
// values every time -- there is nothing in the thin, pre-Epic-2 library to
// vary with. That is exactly why these tests only check what holds
// regardless of that (visibility, locked-value identity, focus, the
// announcement shape, persistence, no confirmation); session-reducer.test.ts
// and store.test.ts cover the "un-lands only the changed kinds" variety with
// a synthetic multi-candidate library.
const meta = (page: Page) => page.locator("p.text-stage-meta-phone");
const revealNext = (page: Page) => page.getByRole("button", { name: copy.button.revealNext });
const reroll = (page: Page) => page.getByRole("button", { name: copy.button.reroll });
const skillLock = (page: Page) => page.getByRole("button", { name: copy.stage.lock.toggleLabel(copy.stage.piece.skill) });

async function waitForPieceToLand(page: Page) {
  await page.waitForFunction(() => {
    const row = document.querySelector('[data-testid="stage-action-row"]');
    return row === null || row.getAttribute("data-motion-status") === "idle";
  });
}

async function openFullyRevealedStage(page: Page) {
  await page.goto("/stage");
  await expect(meta(page)).toContainText("·", { timeout: 15_000 });
  while ((await revealNext(page).count()) > 0) {
    await revealNext(page).click();
    await waitForPieceToLand(page);
  }
}

test("Lock toggles and Reroll appear only once the Challenge is fully revealed", async ({ page }) => {
  await page.goto("/stage");
  await expect(meta(page)).toContainText("·", { timeout: 15_000 });
  await expect(skillLock(page)).toHaveCount(0);
  await expect(reroll(page)).toHaveCount(0);

  await openFullyRevealedStage(page);

  await expect(skillLock(page)).toBeVisible();
  await expect(skillLock(page)).toHaveAttribute("aria-pressed", "false");
  await expect(reroll(page)).toBeVisible();
});

test("Reroll keeps a locked Input's value, announces, and leaves no confirmation", async ({ page }) => {
  await openFullyRevealedStage(page);
  const live = page.locator('[aria-live="polite"]');

  await skillLock(page).click();
  await expect(skillLock(page)).toHaveAttribute("aria-pressed", "true");

  await reroll(page).click();

  await expect(page.getByText("Skill: Observation", { exact: true })).toBeVisible();
  await expect(live).toContainText(copy.stage.rerolled);
  await expect(page.getByRole("dialog")).toHaveCount(0);

  // No counter/limit/cost: pressing it again is still just as available.
  await reroll(page).click();
  await expect(reroll(page)).toBeVisible();
});

test("focus stays on Reroll after it is pressed", async ({ page }) => {
  await openFullyRevealedStage(page);

  await reroll(page).click();

  await expect(reroll(page)).toBeFocused();
});

test("Locks persist across reload", async ({ page }) => {
  await openFullyRevealedStage(page);

  await skillLock(page).click();
  await expect(skillLock(page)).toHaveAttribute("aria-pressed", "true");

  await page.reload();
  await expect(meta(page)).toContainText("·", { timeout: 15_000 });

  await expect(skillLock(page)).toHaveAttribute("aria-pressed", "true");
});
