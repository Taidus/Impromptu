import { expect, test } from "@playwright/test";
import { copy } from "../src/components/copy";

test("the Difficulty Dial is keyboard-operable and its Level persists across reload", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1, name: copy.setup.headline })).toBeVisible();

  const dial = page.getByRole("slider", { name: copy.setup.dialLabel });
  await expect(dial).toHaveAttribute("aria-valuetext", `Explore. ${copy.level.explore}`);

  await dial.focus();
  await page.keyboard.press("End");
  await expect(dial).toHaveAttribute("aria-valuetext", `Perform. ${copy.level.perform}`);

  await page.keyboard.press("Home");
  await expect(dial).toHaveAttribute("aria-valuetext", `Explore. ${copy.level.explore}`);

  await page.keyboard.press("ArrowRight");
  await expect(dial).toHaveAttribute("aria-valuetext", `Experiment. ${copy.level.experiment}`);

  await page.reload();
  await expect(page.getByRole("slider", { name: copy.setup.dialLabel })).toHaveAttribute(
    "aria-valuetext",
    `Experiment. ${copy.level.experiment}`,
  );
});

test("Perform shows the timing control, defaulting to Either", async ({ page }) => {
  await page.goto("/");

  const dial = page.getByRole("slider", { name: copy.setup.dialLabel });
  await dial.focus();
  await page.keyboard.press("End");
  await expect(dial).toHaveAttribute("aria-valuetext", `Perform. ${copy.level.perform}`);

  const either = page.getByRole("radio", { name: copy.performTiming.either, exact: true });
  await expect(either).toBeChecked();

  await page.getByText(copy.performTiming.timed, { exact: true }).click();
  await expect(page.getByRole("radio", { name: copy.performTiming.timed, exact: true })).toBeChecked();
});
