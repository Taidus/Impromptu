import { expect, test } from "@playwright/test";
import anchors from "../content/library/anchors/anchors.json";
import { copy } from "../src/components/copy";

const anchor2 = anchors[1];

test("the journey sections, sample Brief, closing link and footer render on /", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: copy.journey.whatsInAChallenge.title })).toBeVisible();
  await expect(page.getByRole("heading", { name: copy.journey.fourLevels.title })).toBeVisible();
  await expect(page.getByRole("heading", { name: copy.journey.closing })).toBeVisible();

  await expect(page.getByText(anchor2.expectedBrief)).toBeVisible();

  await expect(page.getByText(copy.skill.ideaGeneration)).toBeVisible();
  await expect(page.getByText(copy.level.perform)).toBeVisible();

  // Scoped to 04 (sun): the setup hero (01) carries its own "Get a challenge".
  await expect(
    page.locator("section.bg-sun").getByRole("button", { name: copy.button.getAChallenge }),
  ).toBeVisible();

  // Scoped to the footer nav: the setup hero's header (Story 3.7) has its own "Practice" link too.
  const footerNav = page.getByRole("navigation", { name: "Footer" });
  await expect(footerNav.getByRole("link", { name: copy.journey.footer.practice, exact: true })).toHaveAttribute(
    "href",
    "/practice",
  );
  // Exact: the signup form's own "Privacy note" link also contains "Privacy".
  await expect(footerNav.getByRole("link", { name: copy.journey.footer.privacy, exact: true })).toHaveAttribute(
    "href",
    "/privacy",
  );
  await expect(page.getByLabel(copy.signup.emailLabel, { exact: true })).toBeVisible();
});

test("the closing call's Get a challenge composes and opens the Stage", async ({ page }) => {
  await page.goto("/");
  const closingButton = page.locator("section.bg-sun").getByRole("button", { name: copy.button.getAChallenge });
  await expect(closingButton).toBeEnabled({ timeout: 15_000 });
  await closingButton.click();
  await expect(page).toHaveURL("/stage");
});

test("the page never scrolls horizontally at 320px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("/");
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(scrollWidth).toBeLessThanOrEqual(320);
});

test("posters are hidden on phones and visible on desktop", async ({ page }) => {
  await page.goto("/");
  // Scope to the figcaption, the only place the poster title renders.
  const poster = page.locator("figcaption", { hasText: copy.journey.posters.reveal.title });

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(poster).toBeHidden();

  await page.setViewportSize({ width: 1280, height: 800 });
  await expect(poster).toBeVisible();
});
