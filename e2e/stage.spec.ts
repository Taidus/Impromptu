import { expect, test } from "@playwright/test";
import { copy } from "../src/components/copy";

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
  await expect(page.locator("p.text-stage-meta")).toContainText("·", { timeout: 15_000 });
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

test("Esc on /stage with nothing held returns to Setup without a confirmation", async ({ page }) => {
  await page.goto("/stage");

  await page.keyboard.press("Escape");
  await expect(page).toHaveURL("/");
});
