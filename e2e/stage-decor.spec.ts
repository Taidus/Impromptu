import { expect, test, type Page } from "@playwright/test";
import { copy } from "../src/components/copy";
import { config } from "../src/config/app";
import { attemptSession, fullChallenge, noneSession, savedSession } from "../src/domain/session/session-fixture";
import { baseSetup } from "../src/domain/session/setup-fixture";
import {
  countRaf,
  decorEverRan,
  rafCalls,
  stubCapableDevice,
  stubNoWebGL,
  threeChunks,
  watchDecorRunning,
  webgl2Available,
} from "./helpers/decor";

// Story 8.5 / AD-12's freeze rule: the 3D shuffle layer behind the Stage
// (Story 8.4's <Decor scene="shuffle">) must never animate once a Challenge
// is held (or an Attempt exists), so a filmed shot of the Stage is perfectly
// still. `stageDecorMode`'s unit table (logic.test.ts) covers the decision
// itself; these prove no canvas, no three chunk, and no `requestAnimationFrame`
// call reach the real page in exactly the situations AD-12 cares about.

test.use({ viewport: { width: 1280, height: 800 } });

const meta = (page: Page) => page.locator("p.text-stage-meta-phone");
const column = (page: Page) => page.getByTestId("stage-column");
const revealNext = (page: Page) => page.getByRole("button", { name: copy.button.revealNext });
const reroll = (page: Page) => page.getByRole("button", { name: copy.button.reroll });
const heldIncomplete = { ...noneSession, state: "held", challenge: fullChallenge, revealed: [] };

const seedStage = (page: Page, data: unknown) =>
  page.addInitScript(
    ({ setup, data, schemaVersions }) => {
      localStorage.setItem("impromptu:setup", JSON.stringify({ v: schemaVersions.setup, rev: 1, data: setup }));
      localStorage.setItem("impromptu:session", JSON.stringify({ v: schemaVersions.session, rev: 1, data }));
    },
    { setup: baseSetup, data, schemaVersions: config.storage.schemaVersions },
  );

/** Mirrors stage.spec.ts's own helper: waits for the current piece's motion to settle. */
async function waitForPieceToLand(page: Page) {
  await page.waitForFunction(() => {
    const row = document.querySelector('[data-testid="stage-action-row"]');
    return row === null || row.getAttribute("data-motion-status") === "idle";
  });
}

test("an already-held Stage is frozen: no animation frames, no canvas, no three chunk", async ({ page, baseURL }) => {
  await stubCapableDevice(page);
  await countRaf(page);
  const getThreeChunks = threeChunks(page, baseURL ?? "");
  await seedStage(page, { ...noneSession, state: "held", challenge: fullChallenge, revealed: [...config.reveal.order] });

  await page.goto("/stage");
  await expect(meta(page)).toContainText("·", { timeout: 15_000 });
  // The seed is on screen (a dropped seed would compose a fresh, unrevealed Stage).
  await expect(page.locator('[data-kind="brief"]').getByText(fullChallenge.brief, { exact: true })).toBeVisible();
  await expect(column(page)).toHaveAttribute("data-stage-frozen", "true");

  const decor = page.locator('[data-decor-scene="shuffle"]');
  await expect(decor).toHaveAttribute("data-decor-state", "fallback");
  await expect(decor.locator("canvas")).toHaveCount(0);

  const before = await rafCalls(page);
  await page.waitForTimeout(600);
  expect(await rafCalls(page)).toBe(before);
  expect(await getThreeChunks()).toEqual([]);
});

test("a Stage with a running Attempt is frozen", async ({ page, baseURL }) => {
  await stubCapableDevice(page);
  await countRaf(page);
  const getThreeChunks = threeChunks(page, baseURL ?? "");
  await seedStage(page, attemptSession);

  await page.goto("/stage");
  await expect(meta(page)).toContainText("·", { timeout: 15_000 });
  // The Attempt seed is on screen: no reveal UI (a dropped seed would compose a fresh Stage with an action row).
  await expect(page.locator('[data-testid="stage-action-row"]')).toHaveCount(0);
  await expect(revealNext(page)).toHaveCount(0);
  await expect(column(page)).toHaveAttribute("data-stage-frozen", "true");

  const decor = page.locator('[data-decor-scene="shuffle"]');
  await expect(decor).toHaveAttribute("data-decor-state", "fallback");
  await expect(decor.locator("canvas")).toHaveCount(0);

  const before = await rafCalls(page);
  await page.waitForTimeout(600);
  expect(await rafCalls(page)).toBe(before);
  expect(await getThreeChunks()).toEqual([]);
});

test("without WebGL the reveal still steps, DOM-only", async ({ page }) => {
  await stubNoWebGL(page);
  await countRaf(page);
  await watchDecorRunning(page);

  await page.goto("/stage");
  await expect(meta(page)).toContainText("·", { timeout: 15_000 });

  await page.keyboard.press("Enter");
  await waitForPieceToLand(page);
  await expect(page.getByText("Skill: Observation", { exact: true })).toBeVisible();

  await page.keyboard.press("Enter");
  await waitForPieceToLand(page);
  await expect(page.getByText("Medium: Drawing", { exact: true })).toBeVisible();

  await expect(page.locator('[data-decor-scene="shuffle"] canvas')).toHaveCount(0);
  await expect(page.locator('img[src*="chrome-burst"]')).toBeVisible();
  expect(await decorEverRan(page)).toBe(false);

  // No app-started RAF loop (the piece animations are CSS and setTimeout):
  // checked as a delta over a quiet window, not an absolute reading, because
  // Playwright's own `waitForFunction`/auto-retrying `expect` polling (used
  // just above, and by `waitForPieceToLand`) is itself implemented with
  // `requestAnimationFrame` and bumps the same counter while it's polling.
  const before = await rafCalls(page);
  await page.waitForTimeout(600);
  expect(await rafCalls(page)).toBe(before);
});

test("reduced motion: no canvas and no shuffle phase", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await stubCapableDevice(page);
  await watchDecorRunning(page);

  await page.goto("/stage");
  await expect(meta(page)).toContainText("·", { timeout: 15_000 });

  await page.keyboard.press("Enter");
  await waitForPieceToLand(page);
  expect(await decorEverRan(page)).toBe(false);

  await expect(page.locator('[data-decor-scene="shuffle"] canvas')).toHaveCount(0);
  await expect(page.locator('[data-decor-scene="shuffle"]')).toHaveAttribute("data-decor-state", "fallback");
});

test.describe("the still never sits under the column", () => {
  for (const viewport of [
    { width: 1280, height: 800 },
    { width: 1440, height: 900 },
    // Narrow-tall desktop: the still's width is clamped to the side band.
    { width: 861, height: 1200 },
  ]) {
    test(`at ${viewport.width}x${viewport.height}`, async ({ page }) => {
      await stubNoWebGL(page);
      await page.setViewportSize(viewport);
      await page.goto("/stage");
      await expect(meta(page)).toContainText("·", { timeout: 15_000 });

      const decor = page.locator('[data-decor-scene="shuffle"]');
      await expect(decor).toHaveAttribute("data-decor-state", "fallback");
      const still = decor.locator("img");
      await expect(still).toHaveCSS("opacity", "1");
      expect(await stillOverlapsColumn(page)).toBe(false);

      await expect(decor).toHaveAttribute("aria-hidden", "true");
      await expect(decor).toHaveCSS("pointer-events", "none");
    });
  }
});

/** Asserts the still has a real box and returns whether it intersects the safe-area column. */
async function stillOverlapsColumn(page: Page) {
  const stillBox = await page.locator('[data-decor-scene="shuffle"] img').boundingBox();
  const columnBox = await column(page).boundingBox();
  expect(stillBox).not.toBeNull();
  expect(columnBox).not.toBeNull();
  expect(stillBox!.width).toBeGreaterThan(0);
  return (
    stillBox!.x < columnBox!.x + columnBox!.width &&
    stillBox!.x + stillBox!.width > columnBox!.x &&
    stillBox!.y < columnBox!.y + columnBox!.height &&
    stillBox!.y + stillBox!.height > columnBox!.y
  );
}

test.describe("the layer appears only from the desktop breakpoint", () => {
  test("at 860x800 the layer is display: none", async ({ page }) => {
    await page.setViewportSize({ width: 860, height: 800 });
    await page.goto("/stage");
    await expect(meta(page)).toContainText("·", { timeout: 15_000 });
    await expect(page.locator('[data-decor-scene="shuffle"]')).toHaveCSS("display", "none");
  });

  test("at 861x800 the layer is shown and the still clears the column", async ({ page }) => {
    await page.setViewportSize({ width: 861, height: 800 });
    await page.goto("/stage");
    await expect(meta(page)).toContainText("·", { timeout: 15_000 });
    const decor = page.locator('[data-decor-scene="shuffle"]');
    await expect(decor).toHaveCSS("display", "block");
    await expect(decor.locator("img")).toBeVisible();
    expect(await stillOverlapsColumn(page)).toBe(false);
  });
});

test.describe("the freeze latch (data-stage-frozen) over one visit", () => {
  test("a held-incomplete reload is not frozen; landing the Brief freezes it; Reroll keeps it frozen", async ({ page }) => {
    await seedStage(page, heldIncomplete);
    await page.goto("/stage");
    await expect(meta(page)).toContainText("·", { timeout: 15_000 });
    await expect(column(page)).toHaveAttribute("data-stage-frozen", "false");

    while ((await revealNext(page).count()) > 0) {
      await revealNext(page).click();
      await waitForPieceToLand(page);
    }
    await expect(page.locator('[data-kind="brief"]').getByText(fullChallenge.brief, { exact: true })).toBeVisible();
    await expect(column(page)).toHaveAttribute("data-stage-frozen", "true");

    await reroll(page).click();
    await expect(reroll(page)).not.toHaveAttribute("aria-disabled", "true");
    await expect(column(page)).toHaveAttribute("data-stage-frozen", "true");
  });

  test("from a saved session, Get a challenge opens an unfrozen visit that freezes once the new Challenge lands", async ({ page }) => {
    await seedStage(page, savedSession);
    await page.goto("/");
    await page.locator("#setup").getByRole("button", { name: copy.button.getAChallenge }).click();
    await expect(page).toHaveURL("/stage");
    await expect(meta(page)).toContainText("·", { timeout: 15_000 });
    // A Stage visit starts over: the `saved` seed never reached this mount.
    await expect(column(page)).toHaveAttribute("data-stage-frozen", "false");

    while ((await revealNext(page).count()) > 0) {
      await revealNext(page).click();
      await waitForPieceToLand(page);
    }
    await expect(column(page)).toHaveAttribute("data-stage-frozen", "true");
  });
});

test("a fresh held-incomplete Stage warms the scene but never starts the loop before a shuffle", async ({ page, baseURL, browserName }) => {
  test.skip(browserName !== "chromium", "positive-path WebGL case is chromium-only");
  test.skip(!(await webgl2Available(page)) && !process.env.CI, "WebGL2 is unavailable in this chromium instance");

  await stubCapableDevice(page);
  await countRaf(page);
  const getThreeChunks = threeChunks(page, baseURL ?? "");
  await seedStage(page, heldIncomplete);

  await page.goto("/stage");
  await expect(meta(page)).toContainText("·", { timeout: 15_000 });
  await expect(column(page)).toHaveAttribute("data-stage-frozen", "false");

  // `idle`: chunk requested, scene built (canvas attached), nothing painted.
  const decor = page.locator('[data-decor-scene="shuffle"]');
  await expect(decor.locator("canvas")).toHaveCount(1, { timeout: 15_000 });
  await expect(decor).toHaveAttribute("data-decor-state", "loading");
  await expect(decor.locator("img")).toHaveCSS("opacity", "1");
  expect(await getThreeChunks()).not.toEqual([]);

  const before = await rafCalls(page);
  await page.waitForTimeout(600);
  expect(await rafCalls(page)).toBe(before);
  await expect(decor).toHaveAttribute("data-decor-state", "loading");
});

test("a fresh Stage ignores the hero's ambient rule: idle, never running before a press", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "positive-path WebGL case is chromium-only");
  test.skip(!(await webgl2Available(page)) && !process.env.CI, "WebGL2 is unavailable in this chromium instance");

  await stubCapableDevice(page);
  await countRaf(page);

  await page.goto("/");
  await expect(page.locator('[data-decor-scene="hero"]')).toHaveAttribute("data-decor-state", "running", {
    timeout: 15_000,
  });

  await page.locator("#setup").getByRole("button", { name: copy.button.getAChallenge }).click();
  await expect(page).toHaveURL("/stage");
  await expect(meta(page)).toContainText("·", { timeout: 15_000 });
  await expect(column(page)).toHaveAttribute("data-stage-frozen", "false");

  // Before the first press the layer is `idle` (warm, loop stopped, still showing), never `running`.
  const decor = page.locator('[data-decor-scene="shuffle"]');
  await expect(decor).toHaveAttribute("data-decor-state", "loading", { timeout: 15_000 });
  await expect(decor.locator("img")).toHaveCSS("opacity", "1");

  // Delta over a quiet window: Playwright's own expect polling uses RAF.
  const before = await rafCalls(page);
  await page.waitForTimeout(600);
  expect(await rafCalls(page)).toBe(before);
  await expect(decor).toHaveAttribute("data-decor-state", "loading");
});
