import { expect, test, type Page } from "@playwright/test";
import { copy } from "../src/components/copy";
import { emptySlotLabel } from "../src/components/stage/reveal-logic";
import { fullChallenge, noneSession } from "../src/domain/session/session-fixture";

const meta = (page: Page) => page.locator("p.text-stage-meta-phone");

// Deferred-work follow-up from spec-3-6 (src/store is first rendered by this
// story): proves the production store resolves the real, built
// src/generated/library.json (via `npm run build`'s prebuild step), not
// just an injected test fixture -- CI's unit tests never execute that
// dynamic import, since they run before the library is generated.
test("opening /stage composes a held Challenge from the production library", async ({ page }) => {
  await page.goto("/stage");

  await expect(page.getByRole("heading", { level: 1 })).toHaveText(copy.stage.h1);

  // Nothing is held on a brand-new visit, so the store dispatches
  // `new_challenge` once libraryStatus is ready; the Level/mode meta line
  // then shows a real "LEVEL · MODE" value instead of its placeholder.
  await expect(meta(page)).toContainText("·", { timeout: 15_000 });
  await expect(page.getByText(copy.stage.loadError)).toHaveCount(0);
});

test("the back and sound corner controls are present with their accessible names", async ({ page }) => {
  await page.goto("/stage");

  await expect(page.getByRole("button", { name: copy.stage.back })).toBeVisible();
  await expect(page.getByRole("button", { name: copy.stage.soundOffAnnounced })).toBeVisible();
});

test("the sound control toggles its announced state and persists across reload", async ({ page }) => {
  await page.goto("/stage");

  await page.getByRole("button", { name: copy.stage.soundOffAnnounced }).click();
  await expect(page.getByRole("button", { name: copy.stage.soundOnAnnounced })).toBeVisible();

  await page.reload();
  await expect(page.getByRole("button", { name: copy.stage.soundOnAnnounced })).toBeVisible();
});

// A Challenge is held by then, so focus lands on Setup's "challenge waiting"
// Notice banner rather than the h1 (EXPERIENCE.md -> Focus targets).
test("after hydration, Esc returns to Setup and focuses its Notice banner", async ({ page }) => {
  await page.goto("/stage");
  await expect(meta(page)).toContainText("·", { timeout: 15_000 });

  await page.keyboard.press("Escape");
  await expect(page).toHaveURL("/");
  await expect(page.locator("[data-notice-banner]").first()).toBeFocused();
});

test("clicking Back returns to Setup, replacing /stage in history", async ({ page }) => {
  await page.goto("/stage");
  await expect(meta(page)).toContainText("·", { timeout: 15_000 });
  const historyLength = await page.evaluate(() => history.length);

  await page.getByRole("button", { name: copy.stage.back }).click();
  await expect(page).toHaveURL("/");
  await expect(page.locator("[data-notice-banner]").first()).toBeFocused();
  expect(await page.evaluate(() => history.length)).toBe(historyLength);
});

test("a held Challenge survives reload unchanged", async ({ page }) => {
  await page.goto("/stage");
  await expect(meta(page)).toContainText("·", { timeout: 15_000 });
  const heldChallenge = () =>
    page.evaluate(() => JSON.parse(localStorage.getItem("impromptu:session") ?? "null")?.data?.challenge ?? null);
  const before = await heldChallenge();
  expect(before).not.toBeNull();

  await page.reload();
  await expect(meta(page)).toContainText("·", { timeout: 15_000 });
  expect(await heldChallenge()).toEqual(before);
});

// Story 3.10. The default Setup (Level Explore, all Mediums enabled,
// "This time"/Skill random) always resolves to the same compatible
// Template -- tpl.observation.explore.nearby-object (Skill: Observation,
// Medium: Drawing, a Constraint, no Style) -- the same fact Story 3.9's own
// production-library e2e test relies on (see its Implementation Notes).
const revealNext = (page: Page) => page.getByRole("button", { name: copy.button.revealNext });

/**
 * Story 4.1: waits out a just-pressed piece's full shuffle-then-land cycle
 * -- either the action row settles back to `idle` (more pieces left) or it
 * unmounts entirely (the Brief just landed, no action row anymore). Its
 * candidate flicks live in an `aria-hidden` layer and may coincidentally
 * echo the real value (e.g. Skill focus "random" flicks through every real
 * Skill name, including the one that will land), so a plain text assertion
 * right after a press can otherwise race a shuffle still in flight.
 */
async function waitForPieceToLand(page: Page) {
  await page.waitForFunction(() => {
    const row = document.querySelector('[data-testid="stage-action-row"]');
    return row === null || row.getAttribute("data-motion-status") === "idle";
  });
}

test("the Stage shows empty slots and focuses Reveal next on entry", async ({ page }) => {
  await page.goto("/stage");
  await expect(meta(page)).toContainText("·", { timeout: 15_000 });

  await expect(page.getByText(emptySlotLabel("skill"))).toBeAttached();
  await expect(page.getByText(emptySlotLabel("medium"))).toBeAttached();
  await expect(page.getByText(emptySlotLabel("topic"))).toBeAttached();
  await expect(revealNext(page)).toBeFocused();
});

test("keyboard stepping lands each labelled piece in order, with the Brief last", async ({ page }) => {
  await page.goto("/stage");
  await expect(meta(page)).toContainText("·", { timeout: 15_000 });

  await page.keyboard.press("Enter");
  await waitForPieceToLand(page);
  await expect(page.getByText("Skill: Observation", { exact: true })).toBeVisible();

  await page.keyboard.press("Enter");
  await waitForPieceToLand(page);
  await expect(page.getByText("Medium: Drawing", { exact: true })).toBeVisible();

  await page.keyboard.press("Enter");
  await waitForPieceToLand(page);
  await expect(page.locator("p.text-topic-stage-phone")).toBeVisible();

  await page.keyboard.press("Enter");
  await waitForPieceToLand(page);
  await expect(page.locator("p.text-stamp-stage-phone")).toBeVisible();

  await page.keyboard.press(" ");
  await waitForPieceToLand(page);
  await expect(page.locator("p.text-brief-stage-phone")).toBeVisible();
  // Nothing landed is unrevealed anymore, and Reroll/Start creating aren't
  // built yet -- the action row has no primary action.
  await expect(revealNext(page)).toHaveCount(0);
});

test("the live region announces each landing, then the Brief in full, unprefixed", async ({ page }) => {
  await page.goto("/stage");
  await expect(meta(page)).toContainText("·", { timeout: 15_000 });
  const live = page.locator('[aria-live="polite"]');

  await revealNext(page).click();
  await expect(live).toHaveText("Skill: Observation.");

  await revealNext(page).click();
  await expect(live).toHaveText("Medium: Drawing.");

  await revealNext(page).click();
  await expect(live).toHaveText(/^Topic: .+\.$/);

  await revealNext(page).click();
  await expect(live).toHaveText(/^Constraint: .+\.$/);

  await revealNext(page).click();
  const brief = await page.locator("p.text-brief-stage-phone").textContent();
  expect(brief).toBeTruthy();
  await expect(live).toHaveText(brief!);
});

test("Space/Enter with focus on the body lands the next piece", async ({ page }) => {
  await page.goto("/stage");
  await expect(meta(page)).toContainText("·", { timeout: 15_000 });
  const blur = () => page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());

  await blur();
  await page.keyboard.press("Enter");
  await waitForPieceToLand(page);
  await expect(page.getByText("Skill: Observation", { exact: true })).toBeVisible();

  await blur();
  await page.keyboard.press(" ");
  await waitForPieceToLand(page);
  await expect(page.getByText("Medium: Drawing", { exact: true })).toBeVisible();
});

test("focus moves to the Brief when the last piece lands", async ({ page }) => {
  await page.goto("/stage");
  await expect(meta(page)).toContainText("·", { timeout: 15_000 });

  while ((await revealNext(page).count()) > 0) {
    await page.keyboard.press("Enter");
    await waitForPieceToLand(page);
  }
  await expect(page.locator("p.text-brief-stage-phone").locator("..")).toBeFocused();
});

test("holding Enter on Reveal next lands only one piece", async ({ page }) => {
  await page.goto("/stage");
  await expect(meta(page)).toContainText("·", { timeout: 15_000 });
  await expect(revealNext(page)).toBeFocused();

  // After the first keyboard.down, Playwright sends repeat: true -- like a held key.
  await page.keyboard.down("Enter");
  await page.keyboard.down("Enter");
  await page.keyboard.down("Enter");
  await page.keyboard.up("Enter");
  await waitForPieceToLand(page);

  await expect(page.getByText("Skill: Observation", { exact: true })).toBeVisible();
  await expect(page.getByText(emptySlotLabel("medium"))).toBeAttached();
});

test("Quick reveal lands every piece in one transition, with no Reveal next button", async ({ page }) => {
  await page.addInitScript(() => {
    const setup = {
      level: "explore",
      performTiming: "either",
      enabledMediums: ["med.drawing"],
      medium: "random",
      skillFocus: "random",
      quickReveal: true,
      sound: false,
      ambientMotion: true,
    };
    localStorage.setItem("impromptu:setup", JSON.stringify({ v: 1, rev: 1, data: setup }));
  });

  await page.goto("/stage");
  await expect(meta(page)).toContainText("·", { timeout: 15_000 });

  await expect(page.getByText("Skill: Observation", { exact: true })).toBeVisible();
  await expect(page.getByText("Medium: Drawing", { exact: true })).toBeVisible();
  await expect(page.locator("p.text-topic-stage-phone")).toBeVisible();
  await expect(page.locator("p.text-stamp-stage-phone")).toBeVisible();
  await expect(page.locator("p.text-brief-stage-phone")).toBeVisible();
  await expect(revealNext(page)).toHaveCount(0);
  await expect(page.locator('[aria-live="polite"]')).toContainText(copy.stage.challengeReady);
});

test("desktop type minimums at 1280x800: Brief at least 32px, Inputs at least 24px", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/stage");
  await expect(meta(page)).toContainText("·", { timeout: 15_000 });

  while ((await revealNext(page).count()) > 0) {
    await revealNext(page).click();
    await waitForPieceToLand(page);
  }
  await expect(page.locator("p.text-brief-stage-phone")).toBeVisible();

  const fontSizePx = async (locator: ReturnType<Page["locator"]>) =>
    parseFloat(await locator.first().evaluate((el) => getComputedStyle(el).fontSize));

  expect(await fontSizePx(page.locator("p.text-brief-stage-phone"))).toBeGreaterThanOrEqual(32);
  expect(await fontSizePx(page.locator("p.text-tab-value-stage-phone"))).toBeGreaterThanOrEqual(24);
  expect(await fontSizePx(page.locator("p.text-topic-stage-phone"))).toBeGreaterThanOrEqual(24);
  expect(await fontSizePx(page.locator("p.text-stamp-stage-phone"))).toBeGreaterThanOrEqual(24);
});

test("a landed Style computes at 24px or more at 1280x800", async ({ page }) => {
  await page.addInitScript(
    ({ challenge, session }) => {
      const setup = {
        level: "explore",
        performTiming: "either",
        enabledMediums: ["med.drawing"],
        medium: "random",
        skillFocus: "random",
        quickReveal: false,
        sound: false,
        ambientMotion: true,
      };
      const revealed = ["skill", "medium", "topic", "style", "constraint", "brief"];
      localStorage.setItem("impromptu:setup", JSON.stringify({ v: 1, rev: 1, data: setup }));
      localStorage.setItem(
        "impromptu:session",
        JSON.stringify({ v: 1, rev: 1, data: { ...session, state: "held", challenge, revealed } }),
      );
    },
    { challenge: fullChallenge, session: noneSession },
  );
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/stage");

  const style = page.locator("p.text-style-stage-phone");
  await expect(style).toHaveText("Style: Minimal");
  expect(parseFloat(await style.evaluate((el) => getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(24);
});

test("phone layout at 390x844: the Constraint stamp lands below Topic, and the action row is fixed to the column's bottom edge", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/stage");
  await expect(meta(page)).toContainText("·", { timeout: 15_000 });

  await expect(page.getByTestId("stage-action-row")).toHaveCSS("position", "fixed");

  await revealNext(page).click(); // skill
  await waitForPieceToLand(page);
  await revealNext(page).click(); // medium
  await waitForPieceToLand(page);
  await revealNext(page).click(); // topic
  await waitForPieceToLand(page);
  const topicBox = await page.locator("p.text-topic-stage-phone").boundingBox();
  await revealNext(page).click(); // constraint
  await waitForPieceToLand(page);
  const stampBox = await page.locator("p.text-stamp-stage-phone").boundingBox();

  expect(topicBox).not.toBeNull();
  expect(stampBox).not.toBeNull();
  expect(stampBox!.y).toBeGreaterThan(topicBox!.y);

  // Scrolled to the end, nothing in the composition sits under the fixed bar.
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  const rowBox = await page.getByTestId("stage-action-row").boundingBox();
  const listBox = await page.getByRole("list", { name: copy.stage.inputsListLabel }).boundingBox();
  expect(rowBox).not.toBeNull();
  expect(listBox!.y + listBox!.height).toBeLessThanOrEqual(rowBox!.y);
});

test("a repeating Escape is ignored, and holding Esc navigates once", async ({ page }) => {
  await page.goto("/stage");
  await expect(meta(page)).toContainText("·", { timeout: 15_000 });
  const historyLength = await page.evaluate(() => history.length);

  await page.evaluate(() =>
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", repeat: true, bubbles: true })),
  );
  await expect(page).toHaveURL("/stage");

  await page.keyboard.down("Escape");
  await page.keyboard.down("Escape");
  await page.keyboard.down("Escape");
  await page.keyboard.up("Escape");
  await expect(page).toHaveURL("/");
  expect(await page.evaluate(() => history.length)).toBe(historyLength);
});

// Production defect: the Constraint stamp's -7° double rule ran through the
// counter-rotated "CONSTRAINT" label and its rotated corner clipped the Topic
// text above it. Seeds the reported held Challenge, every piece revealed.
const stampChallenge = {
  ...fullChallenge,
  inputs: {
    skill: { id: "skl.observation", revealText: "Observation" },
    medium: { id: "med.drawing", revealText: "Drawing" },
    topic: { id: "top.near-object", revealText: "A nearby object" },
    constraint: { id: "con.three-details", revealText: "Three new details" },
  },
};

for (const viewport of [
  { width: 1528, height: 784 },
  { width: 1280, height: 800 },
  { width: 390, height: 844 },
]) {
  test(`the Constraint stamp's rules frame its label and value and clear the Topic at ${viewport.width}x${viewport.height}`, async ({
    page,
  }) => {
    await page.addInitScript(
      ({ challenge, session }) => {
        const revealed = ["skill", "medium", "topic", "constraint", "brief"];
        localStorage.setItem(
          "impromptu:session",
          JSON.stringify({ v: 1, rev: 1, data: { ...session, state: "held", challenge, revealed } }),
        );
      },
      { challenge: stampChallenge, session: noneSession },
    );
    await page.setViewportSize(viewport);
    await page.goto("/stage");
    await expect(page.locator("p.text-stamp-stage-phone")).toContainText("Three new details");
    await page.evaluate(() => document.fonts.ready);

    const result = await page.locator("p.text-stamp-stage-phone").evaluate((value) => {
      const label = value.previousElementSibling!;
      const stamp = value.parentElement!.parentElement!;
      const topic = document.querySelector("p.text-topic-stage-phone")!;
      // Map a screen point into the stamp's own (un-tilted) frame, about its center.
      const m = new DOMMatrix(getComputedStyle(stamp).transform);
      const angle = Math.atan2(m.b, m.a);
      const s = stamp.getBoundingClientRect();
      const cx = s.left + s.width / 2;
      const cy = s.top + s.height / 2;
      const cs = getComputedStyle(stamp);
      const halfW = stamp.offsetWidth / 2 - parseFloat(cs.borderLeftWidth);
      const top = -stamp.offsetHeight / 2 + parseFloat(cs.borderTopWidth);
      const bottom = stamp.offsetHeight / 2 - parseFloat(cs.borderBottomWidth);
      const outside = (el: Element) => {
        const r = el.getBoundingClientRect();
        const corners = [
          [r.left, r.top],
          [r.right, r.top],
          [r.left, r.bottom],
          [r.right, r.bottom],
        ];
        return corners
          .map(([x, y]) => {
            const dx = x - cx;
            const dy = y - cy;
            const lx = dx * Math.cos(-angle) - dy * Math.sin(-angle);
            const ly = dx * Math.sin(-angle) + dy * Math.cos(-angle);
            return Math.max(top - ly, ly - bottom, Math.abs(lx) - halfW, 0);
          })
          .reduce((a, b) => Math.max(a, b), 0);
      };
      const t = topic.getBoundingClientRect();
      return {
        labelOutsidePx: outside(label),
        valueOutsidePx: outside(value),
        stampTopicOverlapPx:
          s.left < t.right && s.right > t.left ? Math.max(0, Math.min(s.bottom, t.bottom) - Math.max(s.top, t.top)) : 0,
      };
    });

    expect(result).toEqual({ labelOutsidePx: 0, valueOutsidePx: 0, stampTopicOverlapPx: 0 });
  });
}
