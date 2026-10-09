import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { focusRingClassName, groundTextClassName, type Ground } from "./ground";
import { SunButton } from "./SunButton";

// Pins DESIGN.md -> Colors: the focus-ring color and (for plain-text
// controls) the text color per ground.
const FOCUS_RING_EXPECTED: Record<Ground, string> = {
  night: "focus-visible:outline-focus",
  lilac: "focus-visible:outline-focus",
  paper: "focus-visible:outline-focus",
  sun: "focus-visible:outline-focus-on-sun",
  "lilac-deep": "focus-visible:outline-focus-on-lilac-deep",
};

const TEXT_EXPECTED: Record<Ground, string> = {
  night: "text-cream",
  lilac: "text-plum",
  "lilac-deep": "text-plum",
  paper: "text-ink",
  sun: "text-ink",
};

const GROUNDS = Object.keys(FOCUS_RING_EXPECTED) as Ground[];

describe("focusRingClassName", () => {
  for (const ground of GROUNDS) {
    it(`maps "${ground}" to ${FOCUS_RING_EXPECTED[ground]}`, () => {
      expect(focusRingClassName(ground)).toBe(FOCUS_RING_EXPECTED[ground]);
    });
  }
});

describe("groundTextClassName", () => {
  for (const ground of GROUNDS) {
    it(`maps "${ground}" to ${TEXT_EXPECTED[ground]}`, () => {
      expect(groundTextClassName(ground)).toBe(TEXT_EXPECTED[ground]);
    });
  }
});

describe("SunButton", () => {
  it("renders a native disabled button when disabled", () => {
    const html = renderToStaticMarkup(createElement(SunButton, { disabled: true }, "Get a challenge"));
    expect(html).toMatch(/<button type="button" disabled/);
  });
});
