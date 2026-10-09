import { expect, test } from "@playwright/test";

const routes = [
  ["/", "Impromptu"],
  ["/stage", "Stage"],
  ["/practice", "Practice"],
  ["/privacy", "privacy."],
] as const;

for (const [path, heading] of routes) {
  test(`${path} responds 200 and shows "${heading}"`, async ({ page }) => {
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(heading);
  });
}
