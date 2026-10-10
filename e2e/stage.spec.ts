import { expect, test, type Page } from "@playwright/test";
import { copy } from "../src/components/copy";

const meta = (page: Page) => page.locator("p.text-stage-meta-phone");

// Deferred-work follow-up from spec-3-6 (src/store is first rendered by this
// story): proves the production store resolves the real, built
// src/generated/library.json (via `npm run build`'s prebuild step), not
// just an injected test fixture -- CI's unit tests never execute that
// dynamic import, since they run before the library is generated.
test("opening /stage composes a held Challenge from the production library", async ({ page }) => {
  await page.goto("/stage");

  await expect(page.getByRole("heading", { level: 1 })).toHaveText(copy.stage.h1);

  // Nothing is held on a brand-new visit, so the store dispatches
  // `new_challenge` once libraryStatus is ready; the Level/mode meta line
  // then shows a real "LEVEL · MODE" value instead of its placeholder.
  await expect(meta(page)).toContainText("·", { timeout: 15_000 });
  await expect(page.getByText(copy.stage.loadError)).toHaveCount(0);
});

test("the back and sound corner controls are present with their accessible names", async ({ page }) => {
  await page.goto("/stage");

  await expect(page.getByRole("button", { name: copy.stage.back })).toBeVisible();
  await expect(page.getByRole("button", { name: copy.stage.soundOffAnnounced })).toBeVisible();
});

test("the sound control toggles its announced state and persists across reload", async ({ page }) => {
  await page.goto("/stage");

  await page.getByRole("button", { name: copy.stage.soundOffAnnounced }).click();
  await expect(page.getByRole("button", { name: copy.stage.soundOnAnnounced })).toBeVisible();

  await page.reload();
  await expect(page.getByRole("button", { name: copy.stage.soundOnAnnounced })).toBeVisible();
});

test("after hydration, Esc returns to Setup and focuses its h1", async ({ page }) => {
  await page.goto("/stage");
  await expect(meta(page)).toContainText("·", { timeout: 15_000 });

  await page.keyboard.press("Escape");
  await expect(page).toHaveURL("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeFocused();
});

test("clicking Back returns to Setup, replacing /stage in history", async ({ page }) => {
  await page.goto("/stage");
  await expect(meta(page)).toContainText("·", { timeout: 15_000 });
  const historyLength = await page.evaluate(() => history.length);

  await page.getByRole("button", { name: copy.stage.back }).click();
  await expect(page).toHaveURL("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeFocused();
  expect(await page.evaluate(() => history.length)).toBe(historyLength);
});

test("a held Challenge survives reload unchanged", async ({ page }) => {
  await page.goto("/stage");
  await expect(meta(page)).toContainText("·", { timeout: 15_000 });
  const heldChallenge = () =>
    page.evaluate(() => JSON.parse(localStorage.getItem("impromptu:session") ?? "null")?.data?.challenge ?? null);
  const before = await heldChallenge();
  expect(before).not.toBeNull();

  await page.reload();
  await expect(meta(page)).toContainText("·", { timeout: 15_000 });
  expect(await heldChallenge()).toEqual(before);
});

test("a repeating Escape is ignored, and holding Esc navigates once", async ({ page }) => {
  await page.goto("/stage");
  await expect(meta(page)).toContainText("·", { timeout: 15_000 });
  const historyLength = await page.evaluate(() => history.length);

  await page.evaluate(() =>
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", repeat: true, bubbles: true })),
  );
  await expect(page).toHaveURL("/stage");

  await page.keyboard.down("Escape");
  await page.keyboard.down("Escape");
  await page.keyboard.down("Escape");
  await page.keyboard.up("Escape");
  await expect(page).toHaveURL("/");
  expect(await page.evaluate(() => history.length)).toBe(historyLength);
});
