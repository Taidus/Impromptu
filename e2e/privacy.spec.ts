import { expect, test } from "@playwright/test";
import { copy } from "../src/components/copy";

// Story 7.3 AC: the note states what is stored, where, and how to leave; it
// links back to Setup and offers an erasure contact route (AD-20).
test("/privacy states every section and links out correctly", async ({ page }) => {
  await page.goto("/privacy");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(copy.privacy.title);
  for (const section of copy.privacy.sections) {
    await expect(page.getByRole("heading", { level: 2, name: section.heading })).toBeVisible();
    await expect(page.getByText(section.body)).toBeVisible();
  }
  await expect(page.getByRole("link", { name: copy.privacy.contactEmail })).toHaveAttribute(
    "href",
    `mailto:${copy.privacy.contactEmail}`,
  );
  await expect(page.getByRole("link", { name: copy.stage.back })).toHaveAttribute("href", "/");
  await expect(page).toHaveTitle("Privacy · Impromptu");
});
