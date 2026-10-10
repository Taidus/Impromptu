import { expect, test, type Page } from "@playwright/test";
import { copy } from "../src/components/copy";

const heldChallenge = (page: Page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem("impromptu:session") ?? "null")?.data?.challenge ?? null);

test("Medium chips toggle, and disabling the last enabled one is blocked with an inline message", async ({ page }) => {
  await page.goto("/");
  const writing = page.getByRole("button", { name: "Writing", exact: true });
  const drawing = page.getByRole("button", { name: "Drawing", exact: true });
  const photography = page.getByRole("button", { name: "Photography", exact: true });
  const storytelling = page.getByRole("button", { name: "Spoken storytelling", exact: true });

  // Default: all Mediums on (FR-2).
  for (const chip of [writing, drawing, photography, storytelling]) {
    await expect(chip).toHaveAttribute("aria-pressed", "true");
  }

  await drawing.click();
  await expect(drawing).toHaveAttribute("aria-pressed", "false");
  await photography.click();
  await storytelling.click();

  // Only Writing is left enabled: turning it off is blocked.
  await writing.click();
  await expect(writing).toHaveAttribute("aria-pressed", "true");
  const notice = page.getByRole("status").filter({ hasText: copy.state.keepAtLeastOneMediumOn });
  await expect(notice).toBeVisible();
  const noticeId = await notice.getAttribute("id");
  await expect(writing).toHaveAttribute("aria-describedby", noticeId ?? "");

  // Re-enabling a different Medium clears the message.
  await drawing.click();
  await expect(notice).toBeHidden();
});

test('"This time" lists Random plus each enabled Medium, and falls back to Random when its Medium is disabled', async ({ page }) => {
  await page.goto("/");
  const thisTime = page.getByLabel(copy.setup.thisTimeLabel, { exact: true });
  await expect(thisTime).toHaveValue("random");
  expect(await thisTime.locator("option").allTextContents()).toEqual(["Random", "Writing", "Drawing", "Photography", "Spoken storytelling"]);

  await thisTime.selectOption({ label: "Drawing" });
  await expect(thisTime).toHaveValue("med.drawing");
  await page.reload();
  await expect(thisTime).toHaveValue("med.drawing");

  await page.getByRole("button", { name: "Drawing", exact: true }).click(); // disable it
  await expect(thisTime).toHaveValue("random");
  expect(await thisTime.locator("option").allTextContents()).not.toContain("Drawing");
});

test("the Skill select lists Random plus the six Skills from the library", async ({ page }) => {
  await page.goto("/");
  const skill = page.getByLabel(copy.setup.skillLabel, { exact: true });
  await expect(skill).toHaveValue("random");
  expect(await skill.locator("option").allTextContents()).toEqual([
    "Random",
    "Observation",
    "Idea generation",
    "Connection",
    "Perspective",
    "Expression",
    "Revision",
  ]);

  await skill.selectOption({ label: "Connection" });
  await expect(skill).toHaveValue("skl.connection");
  await page.reload();
  await expect(page.getByLabel(copy.setup.skillLabel, { exact: true })).toHaveValue("skl.connection");
});

test("the Skill info popover opens on click, shows every Skill's info, closes on Esc, and returns focus to the button", async ({ page }) => {
  await page.goto("/");
  const infoButton = page.getByRole("button", { name: copy.setup.skillInfoLabel });
  await expect(infoButton).toHaveAttribute("aria-expanded", "false");

  await infoButton.click();
  await expect(infoButton).toHaveAttribute("aria-expanded", "true");
  // Scoped to the popover panel: Journey section 02 (out of scope here) also
  // renders these same Skill one-liners as static marketing copy.
  const panel = page.locator(`#${await infoButton.getAttribute("aria-controls")}`);
  await expect(panel.getByText("Notice what's actually there.")).toBeVisible();
  await expect(panel.getByText("Change it on purpose.")).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(infoButton).toHaveAttribute("aria-expanded", "false");
  await expect(infoButton).toBeFocused();

  // A second activation also closes it.
  await infoButton.click();
  await expect(infoButton).toHaveAttribute("aria-expanded", "true");
  await infoButton.click();
  await expect(infoButton).toHaveAttribute("aria-expanded", "false");

  // An outside click closes it too (without stealing focus from the click target).
  await infoButton.click();
  await expect(infoButton).toHaveAttribute("aria-expanded", "true");
  await page.getByRole("heading", { level: 1 }).click();
  await expect(infoButton).toHaveAttribute("aria-expanded", "false");
  await expect(infoButton).not.toBeFocused();
});

test("Quick reveal switches on and the state survives a reload", async ({ page }) => {
  await page.goto("/");
  const quickReveal = page.getByRole("switch", { name: copy.setup.quickRevealLabel });
  await expect(quickReveal).not.toBeChecked();

  // The sr-only input is clicked via its visible label text, same as the
  // (also sr-only) Perform timing radios in e2e/difficulty-dial.spec.ts.
  await page.getByText(copy.setup.quickRevealLabel, { exact: true }).click();
  await expect(quickReveal).toBeChecked();

  await page.reload();
  await expect(page.getByRole("switch", { name: copy.setup.quickRevealLabel })).toBeChecked();
});

test("Get a challenge dispatches a new Challenge and navigates to /stage", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: copy.button.getAChallenge }).click();
  await expect(page).toHaveURL("/stage");
});

test("with a Challenge already held, Get a challenge on Setup replaces it with a different one", async ({ page }) => {
  // Seed a held session through the real app: opening /stage with nothing held composes one.
  await page.goto("/stage");
  await expect.poll(() => heldChallenge(page), { timeout: 15_000 }).not.toBeNull();
  const before = await heldChallenge(page);

  await page.goto("/");
  await page.getByRole("button", { name: copy.button.getAChallenge }).click();
  await expect(page).toHaveURL("/stage");
  const after = await heldChallenge(page);
  expect(after).not.toBeNull();
  expect(after).not.toEqual(before);
});

test("a compose failure keeps the user on Setup with the inline message", async ({ page }) => {
  await page.goto("/");
  // Spoken storytelling has no Templates yet, so with only it on nothing can compose.
  for (const name of ["Writing", "Drawing", "Photography"]) {
    await page.getByRole("button", { name, exact: true }).click();
  }
  const button = page.getByRole("button", { name: copy.button.getAChallenge });
  await button.click();

  const message = page.getByRole("status").filter({ hasText: copy.stage.composeError });
  await expect(message).toBeVisible();
  await expect(button).toHaveAttribute("aria-describedby", (await message.getAttribute("id")) ?? "");
  await expect(page).toHaveURL("/");
});

test.describe("1280x800", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("the whole section 01 stack, including Get a challenge, is visible without scrolling", async ({ page }) => {
    await page.goto("/");
    const controls = [
      page.getByRole("slider"),
      ...["Writing", "Drawing", "Photography", "Spoken storytelling"].map((name) => page.getByRole("button", { name, exact: true })),
      page.getByLabel(copy.setup.thisTimeLabel, { exact: true }),
      page.getByLabel(copy.setup.skillLabel, { exact: true }),
      page.getByRole("button", { name: copy.setup.skillInfoLabel }),
      page.getByText(copy.setup.quickRevealLabel, { exact: true }),
      page.getByRole("button", { name: copy.button.getAChallenge }),
    ];
    for (const control of controls) {
      await expect(control).toBeInViewport({ ratio: 1 });
    }
  });
});
