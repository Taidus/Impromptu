import { expect, test, type Page } from "@playwright/test";
import { copy } from "../src/components/copy";
import { config } from "../src/config/app";
import { Setup } from "../src/domain/session/schema";
import { baseSetup } from "../src/domain/session/setup-fixture";

test.use({ viewport: { width: 1280, height: 800 } });

async function stubNoWebGL(page: Page) {
  await page.addInitScript(() => {
    const orig = HTMLCanvasElement.prototype.getContext as (
      this: HTMLCanvasElement,
      type: string,
      ...rest: unknown[]
    ) => unknown;
    // @ts-expect-error -- overriding the overloaded native signature for the stub.
    HTMLCanvasElement.prototype.getContext = function (type: string, ...rest: unknown[]) {
      return type === "webgl2" || type === "webgl" ? null : orig.call(this, type, ...rest);
    };
  });
}

async function stubCapableDevice(page: Page) {
  await page.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, "hardwareConcurrency", { value: 8, configurable: true });
    Object.defineProperty(Navigator.prototype, "deviceMemory", { value: 8, configurable: true });
  });
}

async function countRaf(page: Page) {
  await page.addInitScript(() => {
    (window as unknown as { __rafCalls: number }).__rafCalls = 0;
    const orig = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (cb: FrameRequestCallback) => {
      (window as unknown as { __rafCalls: number }).__rafCalls++;
      return orig(cb);
    };
  });
}

/** Collects same-origin .js responses whose body contains "THREE.WebGLRenderer" (survives minification). */
function threeChunks(page: Page, baseURL: string) {
  const urls = new Set<string>();
  const pending: Promise<void>[] = [];
  page.on("response", (response) => {
    const url = response.url();
    if (!url.startsWith(baseURL) || !url.endsWith(".js")) return;
    pending.push(
      response.text().then(
        (body) => {
          if (body.includes("THREE.WebGLRenderer")) urls.add(url);
        },
        () => {
          // Aborted or non-text response; not a three chunk either way.
        },
      ),
    );
  });
  return async () => {
    await Promise.all(pending);
    return [...urls];
  };
}

/** The gate decides only once MotionSync has written html[data-motion]; give it a second after that. */
async function waitForGateVerdict(page: Page) {
  await expect(page.locator("html")).toHaveAttribute("data-motion", /on|off/);
  await page.waitForTimeout(1_000);
}

const rafCalls = (page: Page) => page.evaluate(() => (window as unknown as { __rafCalls: number }).__rafCalls);

async function webgl2Available(page: Page) {
  return page.evaluate(() => !!document.createElement("canvas").getContext("webgl2"));
}

test("/ server-renders the hero fallback with no canvas", async ({ request }) => {
  const html = await (await request.get("/")).text();
  expect(html).toContain('data-decor-scene="hero"');
  expect(html).toContain('data-decor-state="fallback"');
  expect(html).toContain("/decor/chrome/chrome-ring");
  expect(html).not.toContain("<canvas");
});

test("without WebGL the fallback stays and no three chunk loads", async ({ page, baseURL }) => {
  await stubNoWebGL(page);
  const getThreeChunks = threeChunks(page, baseURL ?? "");

  await page.goto("/");

  const decor = page.locator('[data-decor-scene="hero"]');
  await expect(decor).toBeVisible();
  await expect(decor.locator("canvas")).toHaveCount(0);
  await page.waitForTimeout(1_000);
  await expect(decor).toHaveAttribute("data-decor-state", "fallback");
  expect(await getThreeChunks()).toEqual([]);
  await expect(page.locator('img[src*="hero-bloom-orange"]')).toBeVisible();
});

test("reduced motion keeps the fallback", async ({ page, baseURL }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await stubCapableDevice(page);
  const getThreeChunks = threeChunks(page, baseURL ?? "");

  await page.goto("/");
  await waitForGateVerdict(page);

  const decor = page.locator('[data-decor-scene="hero"]');
  await expect(decor.locator("canvas")).toHaveCount(0);
  await expect(decor).toHaveAttribute("data-decor-state", "fallback");
  expect(await getThreeChunks()).toEqual([]);
});

test("a low-power device keeps the fallback", async ({ page, baseURL }) => {
  await page.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, "hardwareConcurrency", { value: 2, configurable: true });
    Object.defineProperty(Navigator.prototype, "deviceMemory", { value: 8, configurable: true });
  });
  const getThreeChunks = threeChunks(page, baseURL ?? "");

  await page.goto("/");
  await waitForGateVerdict(page);

  const decor = page.locator('[data-decor-scene="hero"]');
  await expect(decor.locator("canvas")).toHaveCount(0);
  await expect(decor).toHaveAttribute("data-decor-state", "fallback");
  expect(await getThreeChunks()).toEqual([]);
});

test("below 1280px there is no hero art and no Decor", async ({ page, baseURL }) => {
  await page.setViewportSize({ width: 1279, height: 800 });
  await stubCapableDevice(page);
  const getThreeChunks = threeChunks(page, baseURL ?? "");

  await page.goto("/");
  await waitForGateVerdict(page);

  await expect(page.locator('[data-decor-scene="hero"]')).toBeHidden();
  await expect(page.locator('img[src*="hero-bloom-orange"]')).toBeHidden();
  // The 0x0 box counts as frozen, so three is never fetched.
  expect(await getThreeChunks()).toEqual([]);
});

test("a stored Motion OFF keeps the fallback", async ({ page, baseURL }) => {
  const setup = Setup.parse({ ...baseSetup, ambientMotion: false });
  const envelope = JSON.stringify({ v: config.storage.schemaVersions.setup, rev: 1, data: setup });
  await page.addInitScript((value) => window.localStorage.setItem("impromptu:setup", value), envelope);
  await stubCapableDevice(page);
  const getThreeChunks = threeChunks(page, baseURL ?? "");

  await page.goto("/");

  await expect(page.locator("html")).toHaveAttribute("data-motion", "off");
  await page.waitForTimeout(500);
  const decor = page.locator('[data-decor-scene="hero"]');
  await expect(decor.locator("canvas")).toHaveCount(0);
  expect(await getThreeChunks()).toEqual([]);
});

test("a capable device with Motion on runs the hero scene, freezes when the tab hides, and stops on Motion off", async ({
  page,
  browserName,
  baseURL,
}) => {
  test.skip(browserName !== "chromium", "positive-path WebGL case is chromium-only");
  // Locally a GPU-less chromium may skip; in CI a missing WebGL2 must fail loudly instead.
  test.skip(!(await webgl2Available(page)) && !process.env.CI, "WebGL2 is unavailable in this chromium instance");

  await stubCapableDevice(page);
  await countRaf(page);
  const getThreeChunks = threeChunks(page, baseURL ?? "");

  await page.goto("/");

  const decor = page.locator('[data-decor-scene="hero"]');
  const canvas = decor.locator("canvas");
  await expect(canvas).toHaveCount(1);
  await expect(canvas).toHaveAttribute("aria-hidden", "true");
  await expect(decor).toHaveAttribute("data-decor-state", "running", { timeout: 15_000 });
  await expect(decor).toHaveCSS("pointer-events", "none");

  const html = await (await page.request.get("/")).text();
  const chunks = await getThreeChunks();
  expect(chunks.length).toBe(1);
  // Response URLs are absolute, the HTML's script srcs root-relative.
  expect(html).not.toContain(new URL(chunks[0]).pathname);

  const rafBefore = await rafCalls(page);
  await page.waitForTimeout(300);
  expect(await rafCalls(page)).toBeGreaterThan(rafBefore);

  await page.getByRole("button", { name: copy.motion.on }).click();
  await expect(canvas).toHaveCount(0);
  await expect(decor).toHaveAttribute("data-decor-state", "fallback");
  // The renderer's loop stopped with the unmount.
  const rafOff = await rafCalls(page);
  await page.waitForTimeout(500);
  expect((await rafCalls(page)) - rafOff).toBeLessThanOrEqual(1);

  // New page in a fresh context (not page.context(): the Motion-off click
  // above just persisted ambientMotion:false to that context's storage,
  // which a same-context page would inherit), same stubs: a hidden tab stops the loop.
  const page2 = await page.context().browser()!.newPage();
  await stubCapableDevice(page2);
  await countRaf(page2);
  await page2.goto("/");
  await expect(page2.locator('[data-decor-scene="hero"]')).toHaveAttribute("data-decor-state", "running", {
    timeout: 15_000,
  });

  const setHidden = (hidden: boolean) =>
    page2.evaluate((value) => {
      Object.defineProperty(document, "hidden", { value, configurable: true });
      Object.defineProperty(document, "visibilityState", { value: value ? "hidden" : "visible", configurable: true });
      document.dispatchEvent(new Event("visibilitychange"));
    }, hidden);

  await setHidden(true);
  const rafHiddenBefore = await rafCalls(page2);
  await page2.waitForTimeout(500);
  expect((await rafCalls(page2)) - rafHiddenBefore).toBeLessThanOrEqual(1);

  await setHidden(false);
  const rafVisibleBefore = await rafCalls(page2);
  await page2.waitForTimeout(300);
  expect(await rafCalls(page2)).toBeGreaterThan(rafVisibleBefore);

  await page2.context().close();
});

test("a renderer that throws leaves Setup up and the still in place", async ({ page, browserName, baseURL }) => {
  test.skip(browserName !== "chromium", "needs a real WebGL2 context to break; chromium-only");
  test.skip(!(await webgl2Available(page)) && !process.env.CI, "WebGL2 is unavailable in this chromium instance");

  await stubCapableDevice(page);
  // The gate sees a WebGL2 context; THREE then reads `.precision` of null and throws.
  await page.addInitScript(() => {
    const orig = HTMLCanvasElement.prototype.getContext as (
      this: HTMLCanvasElement,
      type: string,
      ...rest: unknown[]
    ) => unknown;
    // @ts-expect-error -- overriding the overloaded native signature for the stub.
    HTMLCanvasElement.prototype.getContext = function (type: string, ...rest: unknown[]) {
      const ctx = orig.call(this, type, ...rest) as { getShaderPrecisionFormat?: unknown } | null;
      if (ctx && (type === "webgl2" || type === "webgl")) ctx.getShaderPrecisionFormat = () => null;
      return ctx;
    };
  });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const getThreeChunks = threeChunks(page, baseURL ?? "");

  await page.goto("/");
  await waitForGateVerdict(page);

  // The chunk did load (the failure path really ran), yet Setup is intact.
  expect((await getThreeChunks()).length).toBe(1);
  const decor = page.locator('[data-decor-scene="hero"]');
  await expect(decor).toHaveAttribute("data-decor-state", "fallback");
  await expect(decor.locator("canvas")).toHaveCount(0);
  await expect(page.locator("h1")).toBeVisible();
  await expect(page.locator("#setup").getByRole("button", { name: copy.button.getAChallenge })).toBeVisible();
  expect(errors).toEqual([]);
});
