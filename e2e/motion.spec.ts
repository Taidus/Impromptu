import { expect, test, type Page } from "@playwright/test";
import { copy } from "../src/components/copy";
import { config } from "../src/config/app";
import { Setup } from "../src/domain/session/schema";
import { baseSetup } from "../src/domain/session/setup-fixture";

const track = (page: Page) => page.locator(".animate-ticker").first();

async function expectAllTickers(page: Page, animationName: string) {
  const tracks = await page.locator(".animate-ticker").all();
  expect(tracks.length).toBeGreaterThan(0);
  for (const el of tracks) {
    expect(await el.evaluate((node) => getComputedStyle(node).animationName)).toBe(animationName);
  }
}

test("the Motion toggle starts on and the sun ticker animates", async ({ page }) => {
  await page.goto("/");

  const toggle = page.getByRole("button", { name: copy.motion.on });
  await expect(toggle).toBeEnabled();
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  expect(await track(page).evaluate((el) => getComputedStyle(el).animationName)).toBe("ticker-scroll");
});

test("turning the toggle off stops the ticker, flips html[data-motion], and persists across reload", async ({
  page,
}) => {
  await page.goto("/");

  await page.getByRole("button", { name: copy.motion.on }).click();

  const off = page.getByRole("button", { name: copy.motion.off });
  await expect(off).toHaveAttribute("aria-pressed", "false");
  await expect(page.locator("html")).toHaveAttribute("data-motion", "off");
  await expectAllTickers(page, "none");

  await page.reload();
  await expect(page.getByRole("button", { name: copy.motion.off })).toHaveAttribute("aria-pressed", "false");
  await expect(page.locator("html")).toHaveAttribute("data-motion", "off");
});

test("/practice shows the Motion toggle", async ({ page }) => {
  await page.goto("/practice");
  await expect(page.getByRole("button", { name: copy.motion.on })).toBeVisible({ timeout: 15_000 });
});

test("/stage has no Motion toggle", async ({ page }) => {
  await page.goto("/stage");
  await expect(page.getByRole("button", { name: copy.motion.on })).toHaveCount(0);
  await expect(page.getByRole("button", { name: copy.motion.off })).toHaveCount(0);
});

test("reduced motion disables the toggle and reads MOTION OFF", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");

  const toggle = page.getByRole("button", { name: copy.motion.off });
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  await expect(toggle).toBeDisabled();
  await expect(page.locator("html")).toHaveAttribute("data-motion", "off");
  await expectAllTickers(page, "none");
});

test("/ server-renders the toggle disabled and neutral ON", async ({ request }) => {
  const html = await (await request.get("/")).text();
  expect(html).toContain(copy.motion.on);
  expect(html).not.toContain(copy.motion.off);
  const button = html.match(/<button[^>]*aria-pressed="true"[^>]*>/)?.[0] ?? "";
  expect(button).toMatch(/\sdisabled/);
});

test("/stage mirrors a stored ambientMotion:false as html[data-motion=off]", async ({ page }) => {
  const setup = Setup.parse({ ...baseSetup, ambientMotion: false });
  const envelope = JSON.stringify({ v: config.storage.schemaVersions.setup, rev: 1, data: setup });
  await page.addInitScript((value) => window.localStorage.setItem("impromptu:setup", value), envelope);
  await page.goto("/stage");
  await expect(page.locator("html")).toHaveAttribute("data-motion", "off", { timeout: 15_000 });
});
