import { expect, test, type Page } from "@playwright/test";
import { copy } from "../src/components/copy";
import { baseChallenge, noneSession } from "../src/domain/session/session-fixture";
import { presentKinds } from "../src/domain/session/session-reducer";
import { announcementFor, quickRevealAnnouncement } from "../src/components/stage/reveal-logic";

const setupFixture = {
  level: "explore",
  performTiming: "either",
  enabledMediums: ["med.drawing"],
  medium: "random",
  skillFocus: "random",
  quickReveal: false,
  sound: false,
  ambientMotion: true,
};

const seedStage = (page: Page, revealed: string[]) =>
  page.addInitScript(
    ({ challenge, session, setup, revealed }) => {
      localStorage.setItem("impromptu:setup", JSON.stringify({ v: 1, rev: 1, data: setup }));
      localStorage.setItem(
        "impromptu:session",
        JSON.stringify({ v: 1, rev: 1, data: { ...session, state: "held", challenge, revealed } }),
      );
    },
    { challenge: baseChallenge, session: noneSession, setup: setupFixture, revealed },
  );

const heldChallenge = (page: Page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem("impromptu:session") ?? "null")?.data?.challenge ?? null);

// Story 3.11: a fresh /stage mount (reload, resume, or a round trip through
// Setup) that already finds a held Challenge with some revealed progress
// announces it once -- deferred from Story 3.10 (StagePage previously seeded
// its live region silently).
test("a reload mid-Reveal restores the pieces already landed and announces only that part, once", async ({ page }) => {
  await seedStage(page, ["skill", "medium"]);
  await page.goto("/stage");

  await expect(page.getByText("Skill: Observation", { exact: true })).toBeVisible();
  await expect(page.getByText("Medium: Drawing", { exact: true })).toBeVisible();
  await expect(page.getByText(/Topic, not revealed yet\./)).toBeAttached();

  const live = page.locator('[aria-live="polite"]');
  await expect(live).toHaveText(`${announcementFor("skill", baseChallenge)} ${announcementFor("medium", baseChallenge)}`);
  await expect(page.getByRole("button", { name: copy.button.revealNext })).toBeVisible();
});

test("a reload of a fully-revealed Challenge announces the whole Challenge once, with no Reveal next button", async ({
  page,
}) => {
  const revealed = presentKinds(baseChallenge);
  await seedStage(page, revealed);
  await page.goto("/stage");

  await expect(page.locator("p.text-brief-stage-phone")).toBeVisible();
  const live = page.locator('[aria-live="polite"]');
  await expect(live).toHaveText(quickRevealAnnouncement(baseChallenge));
  await expect(page.getByRole("button", { name: copy.button.revealNext })).toHaveCount(0);
});

test('Setup shows "Your challenge is waiting." with a "Back to your challenge" button that opens /stage', async ({
  page,
}) => {
  // Hold a Challenge the ordinary way (nothing seeded): opening /stage with
  // nothing held composes one.
  await page.goto("/stage");
  await expect.poll(() => heldChallenge(page), { timeout: 15_000 }).not.toBeNull();

  await page.goto("/");
  const banner = page.getByText(copy.notice.challengeWaiting);
  await expect(banner).toBeVisible();
  const backToChallenge = page.getByRole("button", { name: copy.button.backToYourChallenge });
  await backToChallenge.click();
  await expect(page).toHaveURL("/stage");
});

test("going back to Setup, changing setup, and returning via Back to your challenge keeps the held Challenge unchanged", async ({
  page,
}) => {
  await page.goto("/stage");
  await expect.poll(() => heldChallenge(page), { timeout: 15_000 }).not.toBeNull();
  const before = await heldChallenge(page);

  await page.getByRole("button", { name: copy.stage.back }).click();
  await expect(page).toHaveURL("/");

  // Change setup (not via Get a challenge) -- this must never touch the held Challenge.
  await page.getByRole("button", { name: "Drawing", exact: true }).click();

  await page.getByRole("button", { name: copy.button.backToYourChallenge }).click();
  await expect(page).toHaveURL("/stage");
  expect(await heldChallenge(page)).toEqual(before);
});

test("a storage-unavailable browser shows the Notice banner and still generates a Challenge in memory", async ({ page }) => {
  // Simulate a browser that blocks localStorage (e.g. Safari private mode):
  // the Repository's probe never runs because window.localStorage itself throws.
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new Error("blocked");
      },
    });
  });

  await page.goto("/");
  await expect(page.getByText(copy.notice.storageUnavailable)).toBeVisible({ timeout: 15_000 });

  await page.locator("#setup").getByRole("button", { name: copy.button.getAChallenge }).click();
  await expect(page).toHaveURL("/stage");
});

test("a migration failure on an older stored value shows its own Notice banner", async ({ page }) => {
  // v:0 is below the only registered schema version (1) with no migration
  // step registered, so the Repository's migrate() throws deterministically.
  await page.addInitScript(() => {
    localStorage.setItem("impromptu:history", JSON.stringify({ v: 0, rev: 1, data: [] }));
  });

  await page.goto("/");
  await expect(page.getByText(copy.notice.migrationFailed)).toBeVisible({ timeout: 15_000 });
});

test("continuing a Reveal still works after the connection drops (NFR-4)", async ({ page, context }) => {
  await page.goto("/stage");
  await expect.poll(() => heldChallenge(page), { timeout: 15_000 }).not.toBeNull();
  const revealNext = page.getByRole("button", { name: copy.button.revealNext });
  await expect(revealNext).toBeVisible();

  await context.setOffline(true);

  // Pure client-side reducer state -- no network involved either way.
  await revealNext.click();
  await expect(page.locator('[aria-live="polite"]')).not.toHaveText("");
});

test("generating a new Challenge still works after the connection drops (NFR-4)", async ({ page, context }) => {
  // Load the library while still online (prefetched on idle, Story 3.6).
  await page.goto("/");
  const getAChallenge = page.locator("#setup").getByRole("button", { name: copy.button.getAChallenge });
  await expect(getAChallenge).toBeVisible({ timeout: 15_000 });
  expect(await heldChallenge(page)).toBeNull();

  await context.setOffline(true);

  // `compose()` reads the library already bundled into this client -- no
  // fetch is involved. Checked via storage rather than the resulting
  // navigation: the generic SPA route transition that follows is Next.js
  // router infrastructure, not what NFR-4 is about.
  await getAChallenge.click();
  await expect.poll(() => heldChallenge(page)).not.toBeNull();
});
