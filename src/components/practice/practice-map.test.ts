import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { copy } from "@/components/copy";
import { practiceMap } from "@/domain/practice/practice-map";
import type { Rep } from "@/domain/session/schema";
import { baseChallenge } from "@/domain/session/session-fixture";
import { PracticeMap } from "./PracticeMap";

const library = {
  skills: [
    { id: "skl.observation", revealText: "Observation" },
    { id: "skl.connection", revealText: "Connection" },
  ],
  mediums: [{ id: "med.drawing", revealText: "Drawing" }],
};

const makeRep = (overrides: Partial<Rep> = {}): Rep => ({
  id: "323e4567-e89b-42d3-a456-426614174000",
  challenge: baseChallenge,
  finishedAt: "2026-10-09T12:00:00.000Z",
  timeUsedSec: null,
  reflection: null,
  ...overrides,
});

const render = (reps: Rep[]) => renderToStaticMarkup(createElement(PracticeMap, { map: practiceMap(reps, library) }));

describe("PracticeMap", () => {
  it("shows three captions, one per group", () => {
    const html = render([]);
    expect(html).toContain(copy.practice.mapGroups.skill);
    expect(html).toContain(copy.practice.mapGroups.medium);
    expect(html).toContain(copy.practice.mapGroups.level);
  });

  it("shows the FR-26 disclaimer", () => {
    expect(render([])).toContain("Counts show what you");
  });

  it("shows a zero count as an aria-hidden em dash in ink-soft, with an sr-only 0", () => {
    expect(render([])).toContain(
      '<span class="text-index-number text-ink-soft"><span aria-hidden="true">—</span><span class="sr-only">0</span></span>',
    );
  });

  it("shows the count for a Skill/Medium/Level with Reps in index-number ink", () => {
    const html = render([makeRep()]);
    expect(html).toContain('text-index-number text-ink">1<');
  });

  it("renders a trailing row for a retired Skill under its snapshot name", () => {
    const rep = makeRep({
      challenge: {
        ...baseChallenge,
        inputs: { ...baseChallenge.inputs, skill: { id: "skl.retired", revealText: "Retired Skill" } },
      },
    });
    const html = render([rep]);
    expect(html).toMatch(/<tr[^>]*><th scope="row"[^>]*>Retired Skill<\/th><td><span class="text-index-number text-ink">1<\/span><\/td><\/tr>/);
  });

  it("labels Level rows from copy.levelName, not the raw id", () => {
    const html = render([]);
    expect(html).toContain(copy.levelName.explore);
    expect(html).not.toContain(">explore<");
  });

  it("contains no %, and none of the banned no-scoring words", () => {
    const html = render([makeRep()]);
    expect(html).not.toContain("%");
    const banned = ["score", "streak", "goal", "better", "best", "level up"];
    for (const word of banned) {
      expect(html.toLowerCase()).not.toContain(word);
    }
  });
});
