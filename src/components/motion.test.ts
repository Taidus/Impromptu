import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { copy } from "@/components/copy";
import { MotionToggleButton } from "./MotionToggle";
import { effectiveMotion } from "./motion";

describe("effectiveMotion", () => {
  it("is on when the toggle is on and motion isn't reduced", () => {
    expect(effectiveMotion(true, false)).toBe(true);
  });

  it("is off when the toggle is off", () => {
    expect(effectiveMotion(false, false)).toBe(false);
  });

  it("is off under reduced motion even when the toggle is on (AD-19: reduced motion always wins)", () => {
    expect(effectiveMotion(true, true)).toBe(false);
  });

  it("stays off under reduced motion when the toggle is also off", () => {
    expect(effectiveMotion(false, true)).toBe(false);
  });
});

const render = (props: Parameters<typeof MotionToggleButton>[0]) =>
  renderToStaticMarkup(createElement(MotionToggleButton, props));

describe("MotionToggleButton", () => {
  it("reads MOTION ON, aria-pressed=true, enabled", () => {
    const html = render({ on: true, disabled: false, onToggle: () => {} });
    expect(html).toContain(copy.motion.on);
    expect(html).toContain('aria-pressed="true"');
    expect(html).not.toMatch(/<button[^>]*\sdisabled/);
  });

  it("reads MOTION OFF, aria-pressed=false, enabled", () => {
    const html = render({ on: false, disabled: false, onToggle: () => {} });
    expect(html).toContain(copy.motion.off);
    expect(html).toContain('aria-pressed="false"');
    expect(html).not.toMatch(/<button[^>]*\sdisabled/);
  });

  it("renders disabled with a title when reduced motion wins", () => {
    const html = render({ on: false, disabled: true, title: copy.motion.reducedTitle, onToggle: () => {} });
    expect(html).toContain(copy.motion.off);
    expect(html).toMatch(/<button[^>]*\sdisabled/);
    expect(html).toContain(copy.motion.reducedTitle);
  });

  it("renders disabled and neutral ON before the store is ready, never OFF", () => {
    const html = render({ on: true, disabled: true, onToggle: () => {} });
    expect(html).toContain(copy.motion.on);
    expect(html).not.toContain(copy.motion.off);
    expect(html).toMatch(/<button[^>]*\sdisabled/);
  });
});
