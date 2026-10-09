import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement, Fragment } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { copy } from "@/components/copy";
import { FourLevels } from "./FourLevels";
import { resolveSetupSample } from "./sample";
import { Seam } from "./Seam";
import { WhatsInAChallenge } from "./WhatsInAChallenge";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const anchors = JSON.parse(readFileSync(join(ROOT, "content/library/anchors/anchors.json"), "utf8")) as Array<{
  expectedBrief: string;
}>;

describe("resolveSetupSample", () => {
  it("resolves CL-5 anchor 2 (template, medium, topic, constraint found) and renders its Brief", () => {
    const sample = resolveSetupSample();
    expect(sample.skill).toBe("Expression");
    expect(sample.medium).toBe("Photography");
    expect(sample.topic).toBe("Coming home");
    expect(sample.constraint).toBe("No people");
    // Resolved via @/domain/library/render inside resolveSetupSample; this
    // pins it against the anchor's own recorded expectedBrief.
    expect(sample.brief).toBe(anchors[1].expectedBrief);
  });
});

// Copy as it appears in markup (React escapes apostrophes to &#x27;).
const escaped = (text: string) => renderToStaticMarkup(createElement(Fragment, null, text));

describe("WhatsInAChallenge", () => {
  const html = renderToStaticMarkup(createElement(WhatsInAChallenge));
  for (const [name, description] of Object.entries(copy.skill)) {
    it(`renders the "${name}" Skill description`, () => {
      expect(html).toContain(escaped(description));
    });
  }
});

describe("FourLevels", () => {
  const html = renderToStaticMarkup(createElement(FourLevels));
  for (const [name, line] of Object.entries(copy.level)) {
    it(`renders the "${name}" Level one-liner`, () => {
      expect(html).toContain(escaped(line));
    });
  }
});

describe("Seam", () => {
  it("fades between the two grounds' color tokens", () => {
    const html = renderToStaticMarkup(createElement(Seam, { from: "night", to: "lilac" }));
    expect(html).toContain("linear-gradient(to bottom, var(--color-night), var(--color-lilac))");
  });
});

describe("copy.journey.posters", () => {
  for (const [name, title] of Object.entries(copy.journey.posters)) {
    it(`"${name}" title ends with a full stop`, () => {
      expect(title.endsWith(".")).toBe(true);
    });
  }
});
