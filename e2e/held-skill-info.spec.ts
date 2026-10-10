import { expect, test, type Page } from "@playwright/test";
import { copy } from "../src/components/copy";
import { config } from "../src/config/app";
import type { Challenge, RevealedKind } from "../src/domain/session/schema";
import { fullChallenge } from "../src/domain/session/session-fixture";
import { presentKinds } from "../src/domain/session/session-reducer";

// Story 4.5: from Held onward the Stage sits completely still (EXPERIENCE.md
// -> Challenge Stage Filming Contract rule 4/5) and the only extra control is
// a collapsed Skill Info button beside the Skill tab (reused from Setup's
// SkillInfo, generalized with a `ground` prop rather than duplicated -- see
// src/components/setup/SkillInfo.tsx). Esc must close that popover before the
// Stage's own Esc-to-Setup handler acts on the key (StagePage.tsx's
// `isPlainEscape`): SkillInfo's Escape listener runs in the capture phase and
// calls `preventDefault()`, which the Stage's bubble-phase listener skips.
const meta = (page: Page) => page.locator("p.text-stage-meta-phone");
const revealNext = (page: Page) => page.getByRole("button", { name: copy.button.revealNext });
const infoButton = (page: Page) => page.getByRole("button", { name: copy.setup.skillInfoLabel });
const dialog = (page: Page) => page.getByRole("dialog");

/** The shortest real Skill name, on a Retry Challenge (no Lock/Reroll): the tightest fit for the popover, and the non-lockable origin. */
const retryRevisionChallenge: Challenge = {
  ...fullChallenge,
  inputs: { ...fullChallenge.inputs, skill: { id: "skl.revision", revealText: "Revision" } },
  origin: { kind: "retry", fromRepId: "223e4567-e89b-42d3-a456-426614174000" },
};

/** The widest real Skill and Medium (content/library), so the tab row is at its widest. */
const widestChallenge: Challenge = {
  ...fullChallenge,
  inputs: {
    ...fullChallenge.inputs,
    skill: { id: "skl.idea-generation", revealText: "Idea generation" },
    medium: { id: "med.spoken-storytelling", revealText: "Spoken storytelling" },
  },
};

async function waitForPieceToLand(page: Page) {
  await page.waitForFunction(() => {
    const row = document.querySelector('[data-testid="stage-action-row"]');
    return row === null || row.getAttribute("data-motion-status") === "idle";
  });
}

/** Presses Reveal next until the Challenge is fully Held, using real timers (matches e2e/lock-reroll.spec.ts); the popover must never open on its own along the way. */
async function revealToHeld(page: Page) {
  while ((await revealNext(page).count()) > 0) {
    await expect(dialog(page)).toHaveCount(0);
    await revealNext(page).click();
    await waitForPieceToLand(page);
  }
}

async function openFullyRevealedStage(page: Page) {
  await page.goto("/stage");
  await expect(meta(page)).toContainText("·", { timeout: 15_000 });
  await revealToHeld(page);
}

/** Seeds a held Challenge straight into storage, skipping (part of) the Reveal. One seed per page: each test gets a fresh page/context. */
async function seedHeldSession(page: Page, revealed: RevealedKind[], challenge: Challenge = fullChallenge) {
  const envelope = JSON.stringify({
    v: config.storage.schemaVersions.session,
    rev: 1,
    data: {
      state: "held",
      challenge,
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

test("the held Stage runs no CSS animations or transitions once the Brief's fade completes", async ({ page }) => {
  await openFullyRevealedStage(page);
  await expect(page.locator('[data-kind="brief"]')).toBeFocused();
  await expect.poll(() => page.evaluate(() => document.getAnimations().length)).toBe(0);
});

test("the Skill Info button is absent mid-Reveal and appears beside the Skill tab once Held, without shifting the Skill/Medium row", async ({
  page,
}) => {
  await seedHeldSession(page, presentKinds(fullChallenge).filter((kind) => kind !== "brief"));
  await page.goto("/stage");
  await expect(revealNext(page)).toBeVisible({ timeout: 15_000 });
  await expect(infoButton(page)).toHaveCount(0);
  const skillTab = page.locator('[data-kind="skill"]');
  const mediumTab = page.locator('[data-kind="medium"]');
  const skillBefore = (await skillTab.boundingBox())!;
  const mediumBefore = (await mediumTab.boundingBox())!;

  await revealToHeld(page);
  await expect(infoButton(page)).toBeVisible();
  await expect(infoButton(page)).toHaveAttribute("aria-expanded", "false");
  await expect(dialog(page)).toHaveCount(0);

  // The button's slot was reserved from the start: nothing in the row moves
  // sideways or re-wraps (the whole column may re-center vertically as the
  // Brief lands, so vertical position is compared Skill-to-Medium).
  const skillAfter = (await skillTab.boundingBox())!;
  const mediumAfter = (await mediumTab.boundingBox())!;
  expect(skillAfter.x).toBe(skillBefore.x);
  expect(mediumAfter.x).toBe(mediumBefore.x);
  expect(mediumAfter.y - skillAfter.y).toBeCloseTo(mediumBefore.y - skillBefore.y, 1);

  const infoBox = (await infoButton(page).boundingBox())!;
  expect(Math.abs(infoBox.y + infoBox.height / 2 - (skillAfter.y + skillAfter.height / 2))).toBeLessThan(skillAfter.height / 2 + 4);
  // Desktop: in the margin left of the Skill tab, past its Lock disc, so it costs the tab row no width.
  expect(infoBox.x + infoBox.width).toBeLessThanOrEqual(skillAfter.x - 44);
});

test("the Skill Info button also appears once Held on a Retry Challenge (no Lock/Reroll)", async ({ page }) => {
  await seedHeldSession(page, presentKinds(retryRevisionChallenge), retryRevisionChallenge);
  await page.goto("/stage");
  await expect(infoButton(page)).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("button", { name: copy.button.reroll })).toHaveCount(0);
});

test("the popover never auto-opens during the Reveal, and opens only on click/Enter once Held", async ({ page }) => {
  // revealToHeld asserts no dialog before every Reveal next press (mid-Reveal).
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

test("Esc closes the popover first (consumed before the Stage sees it); a second Esc then returns to Setup", async ({ page }) => {
  await openFullyRevealedStage(page);
  // A bubble-phase listener on window runs after every document listener
  // (including the Stage's), so it records what the Stage's handler saw.
  await page.evaluate(() => {
    const log: boolean[] = [];
    (window as unknown as { escLog: boolean[] }).escLog = log;
    window.addEventListener("keydown", (event) => {
      if (event.key === "Escape") log.push(event.defaultPrevented);
    });
  });
  const escLog = () => page.evaluate(() => (window as unknown as { escLog: boolean[] }).escLog);

  await infoButton(page).click();
  await expect(dialog(page)).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(dialog(page)).toHaveCount(0);
  await expect(infoButton(page)).toBeFocused();
  expect(await escLog()).toEqual([true]);
  expect(new URL(page.url()).pathname).toBe("/stage");

  await page.keyboard.press("Escape");
  await expect(page).toHaveURL("/");
});

test("no toast, banner, or popover appears on its own while held", async ({ page }) => {
  await page.clock.install();
  await seedHeldSession(page, presentKinds(fullChallenge));
  await page.goto("/stage");
  await expect(infoButton(page)).toBeVisible({ timeout: 15_000 });
  const before = await page.locator("body").innerText();

  await page.clock.runFor(10_000);
  // Nothing new rendered anywhere on the page, and no dialog opened.
  expect(await page.locator("body").innerText()).toBe(before);
  await expect(dialog(page)).toHaveCount(0);
  await expect(page.getByRole("status")).toHaveText("");
});

for (const viewport of [
  { width: 1280, height: 800 },
  { width: 390, height: 844 },
  { width: 375, height: 667 },
]) {
  for (const challenge of [fullChallenge, retryRevisionChallenge, widestChallenge]) {
    const skill = challenge.inputs.skill.revealText;
    test(`the open Skill info popover (${skill}) stays within the viewport and above the action bar at ${viewport.width}x${viewport.height}`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await seedHeldSession(page, presentKinds(challenge), challenge);
      await page.goto("/stage");
      await expect(infoButton(page)).toBeVisible({ timeout: 15_000 });

      await infoButton(page).click();
      const box = (await dialog(page).boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 0.5);
      expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 0.5);
      const actionRow = page.getByTestId("stage-action-row");
      if ((await actionRow.count()) > 0) {
        const rowBox = (await actionRow.boundingBox())!;
        if (rowBox.y > box.y) expect(box.y + box.height).toBeLessThanOrEqual(rowBox.y + 0.5);
      }
    });
  }
}
