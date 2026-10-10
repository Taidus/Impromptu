import type { Page } from "@playwright/test";

// Lifted from Story 8.4's decor.spec.ts (now shared with stage-decor.spec.ts,
// Story 8.5): device/WebGL stubs and the three-chunk detector, common to any
// e2e case that needs to force or deny the Decor gate's verdict.

export async function stubNoWebGL(page: Page) {
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

export async function stubCapableDevice(page: Page) {
  await page.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, "hardwareConcurrency", { value: 8, configurable: true });
    Object.defineProperty(Navigator.prototype, "deviceMemory", { value: 8, configurable: true });
  });
}

export async function countRaf(page: Page) {
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
export function threeChunks(page: Page, baseURL: string) {
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

export const rafCalls = (page: Page) => page.evaluate(() => (window as unknown as { __rafCalls: number }).__rafCalls);

export async function webgl2Available(page: Page) {
  return page.evaluate(() => !!document.createElement("canvas").getContext("webgl2"));
}

/** Records, for the page's whole life, whether any Decor ever reported `data-decor-state="running"`. */
export async function watchDecorRunning(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { __decorRan: boolean };
    w.__decorRan = false;
    // oldValue catches a running -> frozen flip inside one batch; the query catches the current value.
    new MutationObserver((records) => {
      if (records.some((r) => r.oldValue === "running") || document.querySelector('[data-decor-state="running"]')) {
        w.__decorRan = true;
      }
    }).observe(document, { subtree: true, childList: true, attributes: true, attributeOldValue: true, attributeFilter: ["data-decor-state"] });
  });
}

export const decorEverRan = (page: Page) => page.evaluate(() => (window as unknown as { __decorRan: boolean }).__decorRan);
