import { expect, test, type Page } from "@playwright/test";
import { copy } from "../src/components/copy";
import { config } from "../src/config/app";
import { Setup } from "../src/domain/session/schema";
import { baseSetup } from "../src/domain/session/setup-fixture";

// Story 4.3. The production library has exactly one compatible combo per
// Level, so an unlocked Reroll could never visibly change anything. These
// tests seed a second compatible Topic for the default Explore Template
// (tpl.observation.explore.nearby-object, tags ["object"]) by patching the
// library's own lazily loaded chunk on its way to the page -- the library
// is bundled JS, not a fetched JSON file, so there is no data URL to route.
const TOPIC_MARKER = 'topics:[{id:"top.nearby-object"';
const EXTRA_TOPIC = '{id:"top.window-view",revealText:"A window view",briefText:"the view from a window",tags:["object"],requires:[],excludes:[]},';

async function seedSecondTopic(page: Page) {
  const patched = { done: false };
  await page.route("**/_next/static/chunks/**/*.js", async (route) => {
    const response = await route.fetch();
    const body = await response.text();
    if (!body.includes(TOPIC_MARKER)) return route.fulfill({ response, body });
    patched.done = true;
    await route.fulfill({ response, body: body.replace(TOPIC_MARKER, `topics:[${EXTRA_TOPIC}{id:"top.nearby-object"`) });
  });
  return patched;
}

async function seedSetup(page: Page, over: Partial<Setup>) {
  const envelope = JSON.stringify({ v: config.storage.schemaVersions.setup, rev: 1, data: Setup.parse({ ...baseSetup, ...over }) });
  await page.addInitScript((value) => window.localStorage.setItem("impromptu:setup", value), envelope);
}

const meta = (page: Page) => page.locator("p.text-stage-meta-phone");
const revealNext = (page: Page) => page.getByRole("button", { name: copy.button.revealNext });
const reroll = (page: Page) => page.getByRole("button", { name: copy.button.reroll });
const lockFor = (page: Page, piece: keyof typeof copy.stage.piece) =>
  page.getByRole("button", { name: copy.stage.lock.toggleLabel(copy.stage.piece[piece]) });
const live = (page: Page) => page.locator('[aria-live="polite"]');
const topicValue = (page: Page) => page.locator('[data-kind="topic"] p').nth(1);

async function waitForPieceToLand(page: Page) {
  await page.waitForFunction(() => {
    const row = document.querySelector('[data-testid="stage-action-row"]');
    return row === null || row.getAttribute("data-motion-status") === "idle";
  });
}

async function openFullyRevealedStage(page: Page) {
  await page.goto("/stage");
  await expect(meta(page)).toContainText("·", { timeout: 15_000 });
  while ((await revealNext(page).count()) > 0) {
    await revealNext(page).click();
    await waitForPieceToLand(page);
  }
}

/** Reroll's reshuffle has finished (it is aria-disabled only while that plays). */
async function waitForReshuffle(page: Page) {
  await expect(reroll(page)).not.toHaveAttribute("aria-disabled", "true");
}

test("Lock toggles and Reroll appear only once fully revealed, and the last landing focuses the Brief", async ({ page }) => {
  await page.goto("/stage");
  await expect(meta(page)).toContainText("·", { timeout: 15_000 });
  await expect(lockFor(page, "skill")).toHaveCount(0);
  await expect(reroll(page)).toHaveCount(0);

  await openFullyRevealedStage(page);

  await expect(page.locator('[data-kind="brief"]')).toBeFocused();
  await expect(lockFor(page, "skill")).toBeVisible();
  await expect(lockFor(page, "skill")).toHaveAttribute("aria-pressed", "false");
  await expect(reroll(page)).toBeVisible();
});

test("Reroll changes an unlocked piece, keeps the locked ones, stays Held with focus on Reroll, and announces", async ({ page }) => {
  const patched = await seedSecondTopic(page);
  await openFullyRevealedStage(page);
  expect(patched.done).toBe(true);

  for (const piece of ["skill", "medium", "constraint"] as const) await lockFor(page, piece).click();
  const lockedTexts = await page.locator('[data-kind="skill"], [data-kind="medium"], [data-kind="constraint"]').allInnerTexts();
  const before = await topicValue(page).textContent();

  await reroll(page).click();
  await expect(reroll(page)).toBeFocused();
  await waitForReshuffle(page);

  const after = await topicValue(page).textContent();
  expect(after).not.toBe(before);
  expect(await page.locator('[data-kind="skill"], [data-kind="medium"], [data-kind="constraint"]').allInnerTexts()).toEqual(lockedTexts);
  // Every slot filled, nothing back to "not revealed yet", no Reveal next.
  for (const kind of ["skill", "medium", "topic", "constraint", "brief"]) await expect(page.locator(`[data-kind="${kind}"]`)).toHaveCount(1);
  await expect(page.getByText(copy.stage.notRevealedYet, { exact: false })).toHaveCount(0);
  await expect(revealNext(page)).toHaveCount(0);
  await expect(reroll(page)).toBeFocused();

  const brief = await page.locator('[data-kind="brief"] p').first().innerText();
  // The value's textContent is already "Topic: <value>" (its sr-only prefix).
  await expect(live(page)).toHaveText(`${copy.stage.rerolled} ${after}. ${brief}`);
  await expect(page.getByRole("dialog")).toHaveCount(0);

  // No counter/limit/confirmation: Reroll again, it changes again.
  await reroll(page).click();
  await waitForReshuffle(page);
  await expect(topicValue(page)).toHaveText(before ?? "");
  await expect(reroll(page)).toBeFocused();
});

test("Locks persist across reload", async ({ page }) => {
  await openFullyRevealedStage(page);

  await lockFor(page, "skill").click();
  await expect(lockFor(page, "skill")).toHaveAttribute("aria-pressed", "true");

  await page.reload();
  await expect(meta(page)).toContainText("·", { timeout: 15_000 });

  await expect(lockFor(page, "skill")).toHaveAttribute("aria-pressed", "true");
  await expect(live(page)).not.toContainText(copy.stage.rerolled);
});

type Box = { x: number; y: number; width: number; height: number };
const intersects = (a: Box, b: Box) =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

for (const viewport of [
  { width: 1280, height: 800 },
  { width: 390, height: 844 },
]) {
  for (const level of ["explore", "perform"] as const) {
    test(`lock discs sit on each piece's left edge, clear of every text box and the action bar (${level}, ${viewport.width}x${viewport.height})`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await seedSetup(page, { level, quickReveal: true });
      await page.goto("/stage");
      await expect(reroll(page)).toBeVisible({ timeout: 15_000 });

      // Lock every piece, so each LOCKED caption is showing too.
      const discs = page.locator("[data-lock]");
      const count = await discs.count();
      expect(count).toBeGreaterThanOrEqual(4);
      for (let i = 0; i < count; i++) await discs.nth(i).click();

      const result = await page.evaluate(() => {
        const box = (el: Element) => {
          const r = el.getBoundingClientRect();
          return { x: r.x, y: r.y, width: r.width, height: r.height };
        };
        // The text itself (each line box), not the block-level <p>, which runs under floats.
        const textBoxes = [...document.querySelectorAll("[data-kind] p")].flatMap((p) => {
          const range = document.createRange();
          range.selectNodeContents(p);
          return [...range.getClientRects()].filter((r) => r.width > 1 && r.height > 1).map((r) => ({ x: r.x, y: r.y, width: r.width, height: r.height }));
        });
        return [...document.querySelectorAll("[data-lock]")].map((disc) => {
          const piece = disc.closest("[data-kind]")!;
          const caption = disc.parentElement!.querySelector("span[aria-hidden]");
          return {
            kind: disc.getAttribute("data-lock"),
            disc: box(disc),
            caption: caption ? box(caption) : null,
            piece: box(piece),
            textBoxes,
          };
        });
      });

      for (const { kind, disc, caption, piece, textBoxes } of result) {
        expect(disc.width, kind ?? "").toBeCloseTo(52, 1);
        // On the piece's outer left edge: mostly outside it, vertically centred on it.
        expect(disc.x + disc.width, kind ?? "").toBeLessThanOrEqual(piece.x + 16);
        expect(disc.x + disc.width, kind ?? "").toBeGreaterThan(piece.x - 24);
        expect(Math.abs(disc.y + disc.height / 2 - (piece.y + piece.height / 2)), kind ?? "").toBeLessThan(8);
        expect(disc.x, kind ?? "").toBeGreaterThanOrEqual(0);
        expect(caption, kind ?? "").not.toBeNull();
        for (const text of textBoxes) {
          expect(intersects(disc, text), `${kind} disc vs a text box`).toBe(false);
          expect(intersects(caption!, text), `${kind} caption vs a text box`).toBe(false);
        }
      }

      // Phone: scrolled into view, no disc ever sits under the fixed action bar.
      const bar = page.getByTestId("stage-action-row");
      for (let i = 0; i < count; i++) {
        await discs.nth(i).scrollIntoViewIfNeeded();
        const discBox = await discs.nth(i).boundingBox();
        const barBox = await bar.boundingBox();
        expect(intersects(discBox!, barBox!)).toBe(false);
      }
    });
  }
}
