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

test("clicking a Level label sets that Level", async ({ page }) => {
  await page.goto("/");
  const dial = page.getByRole("slider", { name: copy.setup.dialLabel });
  await expect(dial).toHaveAttribute("aria-valuetext", `Explore. ${copy.level.explore}`);

  await page.getByText("Develop", { exact: true }).filter({ visible: true }).click();
  await expect(dial).toHaveAttribute("aria-valuetext", `Develop. ${copy.level.develop}`);
  await expect(dial).toBeFocused();
});

test.describe("phone", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("dragging the track to its right end sets Perform", async ({ page }) => {
    await page.goto("/");
    const dial = page.getByRole("slider", { name: copy.setup.dialLabel });
    await expect(dial).toHaveAttribute("aria-valuetext", `Explore. ${copy.level.explore}`);

    const box = await dial.boundingBox();
    if (!box) throw new Error("dial has no box");
    const y = box.y + 28; // the track row is the slider's top 56px (h-14)
    await page.mouse.move(box.x + 2, y);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2, y, { steps: 4 });
    await page.mouse.move(box.x + box.width - 1, y, { steps: 4 });
    await page.mouse.up();
    await expect(dial).toHaveAttribute("aria-valuetext", `Perform. ${copy.level.perform}`);
  });
});

test("the timing control appears only at Perform and its choice survives a reload", async ({ page }) => {
  await page.goto("/");
  const dial = page.getByRole("slider", { name: copy.setup.dialLabel });
  const timed = page.getByRole("radio", { name: copy.performTiming.timed, exact: true });
  await expect(dial).toHaveAttribute("aria-valuetext", `Explore. ${copy.level.explore}`);
  await expect(page.getByRole("radio")).toHaveCount(0);

  await dial.focus();
  for (const key of ["ArrowRight", "ArrowRight"]) {
    await page.keyboard.press(key);
    await expect(page.getByRole("radio")).toHaveCount(0);
  }
  await page.keyboard.press("ArrowRight");
  await expect(dial).toHaveAttribute("aria-valuetext", `Perform. ${copy.level.perform}`);
  await expect(page.getByRole("radio")).toHaveCount(3);

  await page.getByText(copy.performTiming.timed, { exact: true }).click();
  await expect(timed).toBeChecked();

  await page.reload();
  await expect(timed).toBeChecked();
});
