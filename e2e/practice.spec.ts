import { expect, test, type Page } from "@playwright/test";
import { config } from "../src/config/app";
import { copy } from "../src/components/copy";
import { Rep, Session } from "../src/domain/session/schema";
import { attemptSession, baseChallenge } from "../src/domain/session/session-fixture";

// Story 6.1 AC: a fresh browser (no Reps yet) sees the empty state, the
// night header's back link, and the shared footer's Practice link.
test("/practice shows the empty state and header/footer links", async ({ page }) => {
  await page.goto("/practice");

  // First visit hydrates after the library loads; that can exceed the default 5 s.
  await expect(page.getByText(copy.state.nothingHereYet)).toBeVisible({ timeout: 15_000 });
  await expect(page).toHaveTitle("Practice · Impromptu");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(copy.practice.title);
  const getAChallenge = page.getByRole("button", { name: copy.button.getAChallenge });
  await expect(getAChallenge).toBeEnabled({ timeout: 15_000 });
  await expect(page.getByRole("link", { name: copy.stage.back })).toHaveAttribute("href", "/");
  await expect(page.getByRole("banner").getByRole("link", { name: copy.journey.footer.wordmark })).toHaveAttribute(
    "href",
    "/",
  );

  await expect(
    page.getByRole("navigation", { name: "Footer" }).getByRole("link", { name: copy.journey.footer.practice }),
  ).toHaveAttribute("href", "/practice");
});

test("/practice server-renders the neutral loading state", async ({ request }) => {
  const html = await (await request.get("/practice")).text();
  expect(html).toContain(copy.practice.loading);
  expect(html).not.toContain(copy.state.nothingHereYet);
});

test("/practice shows the unavailable copy when storage is blocked", async ({ page }) => {
  await page.addInitScript(() => {
    const blocked = {
      getItem: () => null,
      setItem: () => {
        throw new Error("blocked");
      },
      removeItem: () => {},
      key: () => null,
      length: 0,
    };
    Object.defineProperty(window, "localStorage", { configurable: true, get: () => blocked });
  });
  await page.goto("/practice");

  await expect(page.getByText(copy.practice.storageUnavailable)).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(copy.state.nothingHereYet)).toHaveCount(0);
});

async function seed(page: Page, entries: Record<string, unknown>) {
  await page.addInitScript((items) => {
    for (const [key, value] of Object.entries(items)) window.localStorage.setItem(key, value);
  }, Object.fromEntries(Object.entries(entries).map(([key, value]) => [key, JSON.stringify(value)])));
}

test("/practice with Reps shows the storage note in the body", async ({ page }) => {
  const rep = Rep.parse({
    id: "323e4567-e89b-42d3-a456-426614174000",
    challenge: baseChallenge,
    finishedAt: "2026-10-09T12:30:00.000Z",
    timeUsedSec: null,
    reflection: null,
  });
  await seed(page, { "impromptu:history": { v: config.storage.schemaVersions.history, rev: 1, data: [rep] } });
  await page.goto("/practice");

  await expect(page.locator("main").getByText(copy.state.progressSavedInBrowserOnly)).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(copy.state.nothingHereYet)).toHaveCount(0);
});

// Story 6.2 AC: Reps render newest first with the meta row, the Brief and
// Reflection, the TIMED segment, and the Retry/Variation pill.
test("/practice shows Rep cards: newest first, the RETRY pill, TIMED, and Reflection", async ({ page }) => {
  const olderNewRep = Rep.parse({
    id: "323e4567-e89b-42d3-a456-426614174000",
    challenge: baseChallenge,
    finishedAt: "2026-10-01T09:00:00.000Z",
    timeUsedSec: null,
    reflection: null,
  });
  const newerRetryRep = Rep.parse({
    id: "423e4567-e89b-42d3-a456-426614174000",
    challenge: { ...baseChallenge, timeLimitSec: 300, origin: { kind: "retry", fromRepId: olderNewRep.id } },
    finishedAt: "2026-10-09T09:00:00.000Z",
    timeUsedSec: 252,
    reflection: { worked: "The loose grip.", change: "Slow down more." },
  });
  await seed(page, {
    "impromptu:history": { v: config.storage.schemaVersions.history, rev: 1, data: [olderNewRep, newerRetryRep] },
  });
  await page.goto("/practice");

  const main = page.locator("main");
  await expect(main.getByText(copy.state.progressSavedInBrowserOnly)).toBeVisible({ timeout: 15_000 });

  const cards = main.getByRole("listitem");
  await expect(cards).toHaveCount(2);
  // Newest (the retry) first.
  await expect(cards.nth(0)).toContainText(copy.rep.retry);
  await expect(cards.nth(0)).toContainText(`${copy.stage.mode.timed} 4:12`);
  await expect(cards.nth(0)).toContainText(copy.rep.worked);
  await expect(cards.nth(0)).toContainText("The loose grip.");
  await expect(cards.nth(0)).toContainText(copy.rep.change);
  await expect(cards.nth(0)).toContainText("Slow down more.");
  await expect(cards.nth(1)).not.toContainText(copy.rep.retry);
  await expect(cards.nth(1)).not.toContainText(copy.stage.mode.timed);
});

test("/practice with an active Attempt offers Resume", async ({ page }) => {
  const session = Session.parse(attemptSession);
  await seed(page, { "impromptu:session": { v: config.storage.schemaVersions.session, rev: 1, data: session } });
  await page.goto("/practice");

  const resume = page.locator("main").getByRole("button", { name: copy.button.resume });
  await expect(resume).toBeEnabled({ timeout: 15_000 });
  await resume.click();
  await expect(page).toHaveURL("/stage");
});

test("/practice's Get a challenge composes and opens the Stage", async ({ page }) => {
  await page.goto("/practice");
  const getAChallenge = page.getByRole("button", { name: copy.button.getAChallenge });
  await expect(getAChallenge).toBeEnabled({ timeout: 15_000 });
  await getAChallenge.click();
  await expect(page).toHaveURL("/stage");
});

test("/practice never scrolls horizontally at 320px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("/practice");
  await expect(page.getByText(copy.state.nothingHereYet)).toBeVisible({ timeout: 15_000 });
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(scrollWidth).toBeLessThanOrEqual(320);
});
