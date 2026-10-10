// Story 4.5: SkillInfo gained a `ground` prop so the Stage could reuse it
// instead of duplicating it. Setup's own popover open/close/Esc/focus
// behavior is already covered end to end by
// e2e/setup-mediums-and-challenge.spec.ts; this just locks down the new
// render branch (default night stays byte-for-byte what Setup already
// shipped; lilac is what the Stage asks for).
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { Skill } from "@/domain/library/schema";
import { SkillInfo } from "./SkillInfo";

const skills: Skill[] = [{ id: "skl.observation", revealText: "Observation", info: "Notice what's actually there.", tags: [] }];

function render(props: Partial<Parameters<typeof SkillInfo>[0]> = {}) {
  return renderToStaticMarkup(createElement(SkillInfo, { skills, ...props }));
}

describe("SkillInfo ground/anchor (Story 4.5)", () => {
  it("defaults to Setup's existing night treatment", () => {
    const html = render();
    expect(html).toContain("border-cream");
    expect(html).not.toContain("border-plum-muted");
  });

  it("takes a lilac tone for the Stage", () => {
    const html = render({ ground: "lilac" });
    expect(html).toContain("border-plum-muted");
    expect(html).toContain("text-plum");
  });

  // The panel only renders while open, which this environment's static
  // server render can't reach (no DOM, no click) -- e2e/setup-mediums-and-
  // challenge.spec.ts and the new Stage spec cover the open panel end to end.
  it("starts closed regardless of ground", () => {
    expect(render({ ground: "lilac" })).toContain('aria-expanded="false"');
  });
});
