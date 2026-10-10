import { expect, test, type Page } from "@playwright/test";
import { copy } from "../src/components/copy";
import { config } from "../src/config/app";
import { fullChallenge } from "../src/domain/session/session-fixture";
import { presentKinds } from "../src/domain/session/session-reducer";

// Story 4.5: from Held onward the Stage sits completely still (EXPERIENCE.md
// -> Challenge Stage Filming Contract rule 4/5) and the only extra control is
// a collapsed Skill Info button beside the Skill tab (reused from Setup's
// SkillInfo, generalized with a `ground`/`anchor` prop rather than
// duplicated -- see src/components/setup/SkillInfo.tsx). Esc must close that
// popover before the Stage's own Esc-to-Setup handler ever sees the key
// (StagePage.tsx's `isPlainEscape`): SkillInfo's own Escape listener runs in
// the capture phase and calls `preventDefault()`, which always fires before
// any bubble-phase document listener (including the Stage's), regardless of
// which was attached first.
const meta = (page: Page) => page.locator("p.text-stage-meta-phone");
const revealNext = (page: Page) => page.getByRole("button", { name: copy.button.revealNext });
const infoButton = (page: Page) => page.getByRole("button", { name: copy.setup.skillInfoLabel });
const dialog = (page: Page) => page.getByRole("dialog");

async function waitForPieceToLand(page: Page) {
  await page.waitForFunction(() => {
    const row = document.querySelector('[data-testid="stage-action-row"]');
    return row === null || row.getAttribute("data-motion-status") === "idle";
  });
}

/** Presses Reveal next until the Challenge is fully Held, using real timers (matches e2e/lock-reroll.spec.ts). */
async function openFullyRevealedStage(page: Page) {
  await page.goto("/stage");
  await expect(meta(page)).toContainText("·", { timeout: 15_000 });
  while ((await revealNext(page).count()) > 0) {
    await revealNext(page).click();
    await waitForPieceToLand(page);
  }
}

/** Seeds a held Challenge straight into storage, skipping the Reveal entirely -- `revealed: []` for mid-Reveal, every kind for fully Held. */
async function seedHeldSession(page: Page, revealed: ReturnType<typeof presentKinds> | []) {
  const envelope = JSON.stringify({
    v: config.storage.schemaVersions.session,
    rev: 1,
    data: {
      state: "held",
      challenge: fullChallenge,
      revealed,
      locks: {},
      attempt: null,
      reflectionDraft: null,
      lastRepId: null,
      lastComposeError: null,
      recent: [],
    },
  });
  await page.addInitScript((value) => window.localStorage.setItem("impromptu:session", value), envelope);
}

/** `document.getAnimations()`, excluding any future decor/3D layer (AD-12: a separate, aria-hidden, text-free canvas) -- none exists on the Stage yet, so today this is just the plain count. */
async function livingAnimationCount(page: Page): Promise<number> {
  return page.evaluate(() =>
    document
      .getAnimations()
      .filter((a) => !(a.effect instanceof KeyframeEffect && a.effect.target?.closest("[data-decor], canvas"))).length,
  );
}

test("the held Stage runs no CSS animations or transitions once the Brief's fade completes", async ({ page }) => {
  await openFullyRevealedStage(page);
  await expect(page.locator('[data-kind="brief"]')).toBeFocused();
  await expect.poll(() => livingAnimationCount(page)).toBe(0);
});

test("the Skill Info button is absent mid-Reveal and appears beside the Skill tab only once Held", async ({ page }) => {
  await seedHeldSession(page, []);
  await page.goto("/stage");
  await expect(meta(page)).toContainText("·", { timeout: 15_000 });
  await expect(infoButton(page)).toHaveCount(0);

  await seedHeldSession(page, presentKinds(fullChallenge));
  await page.goto("/stage");
  await expect(infoButton(page)).toBeVisible({ timeout: 15_000 });
  await expect(infoButton(page)).toHaveAttribute("aria-expanded", "false");
  await expect(dialog(page)).toHaveCount(0);

  const skillBox = (await page.locator('[data-kind="skill"]').boundingBox())!;
  const infoBox = (await infoButton(page).boundingBox())!;
  expect(Math.abs(infoBox.y + infoBox.height / 2 - (skillBox.y + skillBox.height / 2))).toBeLessThan(skillBox.height / 2 + 4);
  expect(infoBox.x).toBeGreaterThanOrEqual(skillBox.x + skillBox.width - 1);
});

test("the popover never auto-opens during the Reveal, and opens only on click/Enter once Held", async ({ page }) => {
  await openFullyRevealedStage(page);
  await expect(dialog(page)).toHaveCount(0);

  await infoButton(page).click();
  await expect(dialog(page)).toBeVisible();
  await expect(infoButton(page)).toHaveAttribute("aria-expanded", "true");
  for (const skill of [copy.skill.observation, copy.skill.connection]) await expect(dialog(page)).toContainText(skill);

  await infoButton(page).click();
  await expect(dialog(page)).toHaveCount(0);

  await infoButton(page).focus();
  await page.keyboard.press("Enter");
  await expect(dialog(page)).toBeVisible();
});

test("Esc closes the popover first without navigating; a second Esc then returns to Setup", async ({ page }) => {
  await openFullyRevealedStage(page);
  await infoButton(page).click();
  await expect(dialog(page)).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(dialog(page)).toHaveCount(0);
  await expect(infoButton(page)).toBeFocused();
  expect(new URL(page.url()).pathname).toBe("/stage");

  await page.keyboard.press("Escape");
  await expect(page).toHaveURL("/");
});

test("no toast, banner, or popover appears on its own while held", async ({ page }) => {
  await page.clock.install();
  await seedHeldSession(page, presentKinds(fullChallenge));
  await page.goto("/stage");
  await expect(infoButton(page)).toBeVisible({ timeout: 15_000 });

  await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 1_000);
  await page.clock.runFor(10_000);
  await expect(dialog(page)).toHaveCount(0);
  // The Stage's one load-error status line stays empty -- no banner appears unprompted.
  await expect(page.getByRole("status")).toHaveText("");
});

for (const viewport of [
  { width: 1280, height: 800 },
  { width: 390, height: 844 },
]) {
  test(`the open Skill info popover stays within the viewport at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await seedHeldSession(page, presentKinds(fullChallenge));
    await page.goto("/stage");
    await expect(infoButton(page)).toBeVisible({ timeout: 15_000 });

    await infoButton(page).click();
    const box = (await dialog(page).boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 0.5);
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 0.5);
  });
}
