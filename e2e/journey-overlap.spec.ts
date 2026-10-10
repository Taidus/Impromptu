import { expect, test } from "@playwright/test";
import { copy } from "../src/components/copy";

const VIEWPORTS = [
  { width: 1280, height: 800 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
  { width: 390, height: 844 },
];

const TEXT_SELECTOR = "h1, h2, h3, p, a, button, input, label, li, dt, dd, figcaption";

for (const viewport of VIEWPORTS) {
  test(`no decoration overlaps text or controls at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);

    const overlaps = await page.evaluate((textSelector) => {
      const isVisible = (el: Element) => {
        const style = getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        return style.visibility !== "hidden" && style.display !== "none" && rect.width > 0 && rect.height > 0;
      };
      const intersects = (a: DOMRect, b: DOMRect) =>
        a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;

      const decor = [...document.querySelectorAll("[data-decor]")].filter(isVisible);
      const text = [...document.querySelectorAll(textSelector)].filter(isVisible);

      const hits: string[] = [];
      for (const d of decor) {
        const dRect = d.getBoundingClientRect();
        for (const t of text) {
          if (intersects(dRect, t.getBoundingClientRect())) {
            hits.push(`[data-decor] (${d.tagName.toLowerCase()}) over <${t.tagName.toLowerCase()}> "${t.textContent?.trim().slice(0, 40)}"`);
          }
        }
      }
      return hits;
    }, TEXT_SELECTOR);

    expect(overlaps).toEqual([]);
  });
}

test("ticker bands and chrome pieces are hidden from the accessibility tree", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");

  const tickers = page.locator("[data-decor]:has(.animate-ticker)");
  expect(await tickers.count()).toBeGreaterThan(0);
  for (const ticker of await tickers.all()) {
    expect((await ticker.ariaSnapshot()).trim()).toBe("");
  }
});

test("ticker track does not animate under reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");

  const track = page.locator(".animate-ticker").first();
  expect(await track.evaluate((el) => getComputedStyle(el).animationName)).toBe("none");
});

test("hovering the sun ticker band pauses its track", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");

  const band = page.locator(".bg-sun:has(> .animate-ticker)");
  await band.hover();
  const track = band.locator(".animate-ticker");
  expect(await track.evaluate((el) => getComputedStyle(el).animationPlayState)).toBe("paused");
});

test("chrome pieces and the orbit thread are hidden on phones and shown on desktop", async ({ page }) => {
  const decor = page.locator("img[data-decor], path[data-decor]");

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const phoneCount = await decor.count();
  expect(phoneCount).toBeGreaterThan(0);
  for (let i = 0; i < phoneCount; i++) await expect(decor.nth(i)).toBeHidden();

  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  const desktopCount = await decor.count();
  expect(desktopCount).toBeGreaterThan(0);
  for (let i = 0; i < desktopCount; i++) await expect(decor.nth(i)).toBeVisible();
});

for (const viewport of [
  { width: 1280, height: 800 },
  { width: 390, height: 844 },
]) {
  test(`footer email input is fillable under the overlays at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/");

    const email = page.getByLabel(copy.signup.emailLabel, { exact: true });
    await email.click(); // a real pointer action: fails if Grain or OrbitThread intercepts
    await email.fill("a@b.co");
    await expect(email).toHaveValue("a@b.co");
  });
}

test("poster artwork carries alt text", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");

  const posterImages = page.locator("figure img");
  const count = await posterImages.count();
  expect(count).toBe(3);
  for (let i = 0; i < count; i++) {
    const alt = await posterImages.nth(i).getAttribute("alt");
    expect(alt?.trim()).toBeTruthy();
  }
});
