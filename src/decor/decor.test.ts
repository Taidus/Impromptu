import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DecorView, modeLoops, SceneBoundary, shouldRequestScene } from "./Decor";

describe("DecorView", () => {
  it("renders the hero fallback with no canvas", () => {
    const html = renderToStaticMarkup(
      createElement(DecorView, { scene: "hero", state: "fallback", className: "" }),
    );
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain("data-decor");
    expect(html).toContain('data-decor-scene="hero"');
    expect(html).toContain('data-decor-state="fallback"');
    expect(html).toContain("chrome-ring.webp");
    expect(html).toContain('alt=""');
    expect(html).not.toContain("data-decor-keep-out");
    expect(html).not.toContain("<canvas");
  });

  it("renders the shuffle fallback with the keep-out probe and no canvas", () => {
    const html = renderToStaticMarkup(
      createElement(DecorView, { scene: "shuffle", state: "fallback", className: "" }),
    );
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain("data-decor");
    expect(html).toContain('data-decor-scene="shuffle"');
    expect(html).toContain('data-decor-state="fallback"');
    expect(html).toContain("chrome-burst.webp");
    expect(html).toContain('alt=""');
    expect(html).toContain("data-decor-keep-out");
    expect(html).not.toContain("<canvas");
  });
});

describe("shouldRequestScene", () => {
  it("stays false while not requested, no gate verdict yet, in ambient mode", () => {
    expect(shouldRequestScene(false, null, "ambient")).toBe(false);
  });

  it("stays false for a frozen mode even once the gate passes", () => {
    expect(shouldRequestScene(false, true, "frozen")).toBe(false);
  });

  it("becomes true once the gate passes in a non-frozen mode", () => {
    expect(shouldRequestScene(false, true, "ambient")).toBe(true);
  });

  it("requests the chunk for idle once the gate passes (warm before the first shuffle)", () => {
    expect(shouldRequestScene(false, true, "idle")).toBe(true);
  });

  it("latches true once already requested, regardless of gate/mode", () => {
    expect(shouldRequestScene(true, false, "frozen")).toBe(true);
  });
});

describe("modeLoops", () => {
  it("runs the loop only for ambient and shuffle; idle and frozen keep it stopped", () => {
    expect(modeLoops("ambient")).toBe(true);
    expect(modeLoops("shuffle")).toBe(true);
    expect(modeLoops("idle")).toBe(false);
    expect(modeLoops("frozen")).toBe(false);
  });
});

describe("DecorView while loading (idle before the first shuffle)", () => {
  it("keeps the still showing", () => {
    const html = renderToStaticMarkup(createElement(DecorView, { scene: "shuffle", state: "loading", className: "" }));
    expect(html).toContain("opacity-100");
    expect(html).not.toContain("opacity-0");
  });
});

describe("DecorView once painted", () => {
  it("fades the still out under a running scene", () => {
    const html = renderToStaticMarkup(createElement(DecorView, { scene: "hero", state: "running", className: "" }));
    expect(html).toContain("opacity-0");
  });
});

describe("SceneBoundary", () => {
  it("turns a thrown scene into nothing and reports the failure once", () => {
    let failures = 0;
    expect(SceneBoundary.getDerivedStateFromError()).toEqual({ failed: true });
    const boundary = new SceneBoundary({ onFail: () => failures++, children: "scene" });
    expect(boundary.render()).toBe("scene");
    boundary.state = SceneBoundary.getDerivedStateFromError();
    boundary.componentDidCatch();
    expect(boundary.render()).toBeNull();
    expect(failures).toBe(1);
  });
});
