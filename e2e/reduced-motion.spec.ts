import { expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { copy } from "../src/components/copy";
import { config } from "../src/config/app";
import { announcementFor } from "../src/components/stage/reveal-logic";
import { fullChallenge } from "../src/domain/session/session-fixture";
import { baseSetup } from "../src/domain/session/setup-fixture";
import type { RevealedKind } from "../src/domain/session/schema";

// Story 4.2: reduced-motion parity for the Reveal. The shuffle/landing state
// machine and its reduced-motion gate are Story 4.1's (reveal-motion.ts /
// useRevealMotion.ts) -- unit/render-tested there. This spec proves the
// user-visible contract at the Stage: under `prefers-reduced-motion: reduce`
// a keyboard reveal never shuffles, every piece lands with the plain 120ms
// fade and is announced as it lands, and the held composition's layout is
// identical to the motion version -- just a different entrance.
//
// Each pass runs in its own fresh browser context (no init script or storage
// leaks between modes) and seeds the identical held `fullChallenge` (every
// Input kind) directly into storage, so a layout difference can only come
// from the motion path itself, never from two different Challenges.
const KINDS: RevealedKind[] = ["skill", "medium", "topic", "style", "constraint", "brief"];
const piece = (page: Page, kind: string) => page.locator(`[data-kind="${kind}"]`);
const actionRow = (page: Page) => page.getByTestId("stage-action-row");
const meta = (page: Page) => page.locator("p.text-stage-meta-phone");
const live = (page: Page) => page.locator('[aria-live="polite"]');
const VIEWPORT = { width: 1280, height: 800 };

async function openStage(
  browser: Browser,
  reducedMotion: "reduce" | "no-preference",
  storage: Record<string, unknown>,
): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext({ baseURL: test.info().project.use.baseURL, viewport: VIEWPORT, reducedMotion });
  await context.addInitScript((items) => {
    for (const [key, value] of Object.entries(items)) localStorage.setItem(key, value);
  }, Object.fromEntries(Object.entries(storage).map(([key, value]) => [key, JSON.stringify(value)])));
  const page = await context.newPage();
  return { context, page };
}

const heldFullChallenge = {
  "impromptu:session": {
    v: config.storage.schemaVersions.session,
    rev: 1,
    data: {
      state: "held",
      challenge: fullChallenge,
      revealed: [],
      locks: {},
      attempt: null,
      reflectionDraft: null,
      lastRepId: null,
      lastComposeError: null,
      recent: [],
    },
  },
};

/** Records every `data-motion-status` the action row takes, including a row that (re)mounts already mid-motion. */
async function recordMotionStatuses(page: Page) {
  await page.evaluate(() => {
    const attr = "data-motion-status";
    const seen: string[] = [document.querySelector(`[${attr}]`)?.getAttribute(attr) ?? ""];
    (window as unknown as { __motionStatuses: string[] }).__motionStatuses = seen;
    new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === "attributes") seen.push((m.target as Element).getAttribute(attr) ?? "");
        for (const node of m.addedNodes) {
          if (!(node instanceof Element)) continue;
          for (const el of [node, ...node.querySelectorAll(`[${attr}]`)]) {
            if (el.hasAttribute(attr)) seen.push(el.getAttribute(attr) ?? "");
          }
        }
      }
    }).observe(document.body, { attributes: true, attributeFilter: [attr], childList: true, subtree: true });
  });
  return () => page.evaluate(() => (window as unknown as { __motionStatuses: string[] }).__motionStatuses);
}

interface Entrance {
  name: string;
  duration: string;
  motionMs: string;
}

const entranceOf = (page: Page, kind: string): Promise<Entrance> =>
  piece(page, kind).evaluate((el) => {
    const cs = getComputedStyle(el);
    return { name: cs.animationName, duration: cs.animationDuration, motionMs: cs.getPropertyValue("--motion-ms").trim() };
  });

/**
 * One keyboard press per kind, with the page clock paused so each landing
 * can be measured mid-flight: waits for the row to leave idle, records the
 * landing piece's entrance, runs out its timer, waits for idle (or the row's
 * unmount after the Brief), then checks that press's own announcement.
 */
async function revealAllByKeyboard(page: Page, reduced: boolean): Promise<Record<string, Entrance>> {
  const entrances: Record<string, Entrance> = {};
  for (const kind of KINDS) {
    await page.keyboard.press(" ");
    await expect(actionRow(page)).not.toHaveAttribute("data-motion-status", "idle");
    if ((await actionRow(page).getAttribute("data-motion-status")) === "shuffling") {
      await page.clock.runFor(config.reveal.motion.shuffleMs);
    }
    await expect(actionRow(page)).toHaveAttribute("data-motion-status", "landing");
    await expect(actionRow(page)).toHaveAttribute("data-motion-kind", kind);
    entrances[kind] = await entranceOf(page, kind);
    await page.clock.runFor(reduced ? config.reveal.motion.reducedLandMs : config.reveal.motion.landMs[kind]);
    // Fully landed: the action row stays (it now holds Reroll, Story 4.3) but Reveal next is gone.
    if (kind === "brief") await expect(page.getByRole("button", { name: copy.button.revealNext })).toHaveCount(0);
    else await expect(actionRow(page)).toHaveAttribute("data-motion-status", "idle");
    await expect(live(page)).toHaveText(announcementFor(kind, fullChallenge));
  }
  return entrances;
}

interface Metrics {
  box: { x: number; y: number; width: number; height: number } | null;
  fontSize: string;
}

/** Bounding box + font-size of every piece's container, its label and value, and the Brief's container and text, once every animation has finished and the Topic's fit rule has settled. */
async function collectMetrics(page: Page, kinds: readonly string[]): Promise<Record<string, Metrics>> {
  await expect.poll(() => page.evaluate(() => document.getAnimations().length)).toBe(0);
  let last = "";
  await expect
    .poll(async () => {
      const box = JSON.stringify(await piece(page, "topic").boundingBox());
      const stable = box === last;
      last = box;
      return stable;
    })
    .toBe(true);

  const targets: Record<string, ReturnType<Page["locator"]>> = {};
  for (const kind of kinds) {
    targets[kind] = piece(page, kind);
    if (kind === "brief") targets["brief.text"] = piece(page, kind).locator("p").first();
    else {
      targets[`${kind}.label`] = piece(page, kind).locator('p[aria-hidden="true"]');
      targets[`${kind}.value`] = piece(page, kind).locator("p:not([aria-hidden])");
    }
  }
  const out: Record<string, Metrics> = {};
  for (const [name, locator] of Object.entries(targets)) {
    out[name] = { box: await locator.boundingBox(), fontSize: await locator.evaluate((el) => getComputedStyle(el).fontSize) };
  }
  return out;
}

async function keyboardPass(browser: Browser, reduced: boolean) {
  const { context, page } = await openStage(browser, reduced ? "reduce" : "no-preference", heldFullChallenge);
  await page.clock.install();
  await page.goto("/stage");
  await expect(meta(page)).toContainText("·", { timeout: 15_000 });
  await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 1_000);
  const statuses = await recordMotionStatuses(page);
  const entrances = await revealAllByKeyboard(page, reduced);
  await page.clock.resume();
  const metrics = await collectMetrics(page, KINDS);
  const seen = await statuses();
  await context.close();
  return { entrances, metrics, seen };
}

test("reduced motion: no shuffle, each piece fades over reducedLandMs and is announced, layout identical to the motion version", async ({
  browser,
}) => {
  const motion = await keyboardPass(browser, false);
  const reduced = await keyboardPass(browser, true);

  // Positive control: the motion pass really played each material's own
  // entrance at its own duration, so the comparison below is between two
  // different modes. (The seeded Challenge's flick pools are single-value
  // in the thin production library, so neither pass shuffles; the landing
  // animation is what differs.)
  for (const kind of KINDS) {
    expect(motion.entrances[kind].name, kind).not.toMatch(/^(none|reduced-fade)$/);
    expect(motion.entrances[kind].motionMs, kind).toBe(`${config.reveal.motion.landMs[kind]}ms`);
  }

  // Reduced: never shuffles, and every piece (the Skill tile and the Brief
  // included) fades over reducedLandMs -- not its material duration.
  expect(reduced.seen).not.toContain("shuffling");
  expect(reduced.seen).toContain("landing");
  for (const kind of KINDS) {
    expect(reduced.entrances[kind], kind).toEqual({
      name: "reduced-fade",
      duration: `${config.reveal.motion.reducedLandMs / 1000}s`,
      motionMs: `${config.reveal.motion.reducedLandMs}ms`,
    });
  }

  // Content, position, and size are identical -- only the entrance differs.
  expect(reduced.metrics).toEqual(motion.metrics);
});

test("Quick reveal under reduced motion: every piece lands with the fade, in the same layout as the motion version", async ({
  browser,
}) => {
  const quickRevealSetup = {
    "impromptu:setup": {
      v: config.storage.schemaVersions.setup,
      rev: 1,
      data: { ...baseSetup, enabledMediums: ["med.drawing"], quickReveal: true },
    },
  };

  async function pass(mode: "reduce" | "no-preference") {
    const { context, page } = await openStage(browser, mode, quickRevealSetup);
    await page.goto("/stage");
    await expect(meta(page)).toContainText("·", { timeout: 15_000 });
    await expect(piece(page, "brief")).toBeVisible();
    await expect(page.getByRole("button", { name: copy.button.revealNext })).toHaveCount(0); // landed in full at once
    const kinds: string[] = [];
    for (const kind of KINDS) if ((await piece(page, kind).count()) > 0) kinds.push(kind);
    const names = Object.fromEntries(await Promise.all(kinds.map(async (k) => [k, (await entranceOf(page, k)).name])));
    const texts = Object.fromEntries(await Promise.all(kinds.map(async (k) => [k, await piece(page, k).innerText()])));
    const metrics = await collectMetrics(page, kinds);
    await context.close();
    return { kinds, names, texts, metrics };
  }

  const motion = await pass("no-preference");
  const reduced = await pass("reduce");

  expect(reduced.kinds).toEqual(motion.kinds);
  expect(reduced.kinds).toEqual(expect.arrayContaining(["skill", "medium", "brief"]));
  for (const kind of reduced.kinds) {
    expect(reduced.names[kind], kind).toBe("reduced-fade");
    expect(motion.names[kind], kind).toBe("none"); // Quick reveal plays no entrance under full motion
  }
  expect(reduced.texts).toEqual(motion.texts);
  expect(reduced.metrics).toEqual(motion.metrics);
});
