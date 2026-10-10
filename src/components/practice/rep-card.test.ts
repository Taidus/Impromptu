import { createElement, Fragment } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { copy } from "@/components/copy";
import { Rep } from "@/domain/session/schema";
import { baseChallenge } from "@/domain/session/session-fixture";
import { PracticeHistory } from "./PracticeHistory";
import { RepCard } from "./RepCard";

const renderCard = (rep: Rep) => renderToStaticMarkup(createElement(RepCard, { rep }));
const renderHistory = (reps: Rep[]) => renderToStaticMarkup(createElement(PracticeHistory, { reps }));
// Copy as it appears in markup (React escapes apostrophes to &#x27;).
const escaped = (text: string) => renderToStaticMarkup(createElement(Fragment, null, text));

/** A valid Rep, overridable per case. `challenge` defaults to the untimed, `origin: new` fixture. */
const makeRep = (overrides: Partial<Rep> = {}): Rep =>
  Rep.parse({
    id: "323e4567-e89b-42d3-a456-426614174000",
    challenge: baseChallenge,
    finishedAt: "2026-10-09T12:00:00.000Z",
    timeUsedSec: null,
    reflection: null,
    ...overrides,
  });

describe("RepCard — meta row", () => {
  it("shows Skill, Medium, Level and the date from the snapshot only", () => {
    const html = renderCard(makeRep());
    expect(html).toContain(baseChallenge.inputs.skill.revealText);
    expect(html).toContain(baseChallenge.inputs.medium.revealText);
    expect(html).toContain(copy.levelName.explore);
    expect(html).toContain('<time dateTime="2026-10-09T12:00:00.000Z"');
    expect(html).toContain(new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date("2026-10-09T12:00:00.000Z")));
  });

  it("shows the Brief as the lede", () => {
    expect(renderCard(makeRep())).toContain(baseChallenge.brief);
  });
});

describe("RepCard — TIMED segment", () => {
  it("is absent when the challenge has no time limit", () => {
    const html = renderCard(makeRep());
    expect(html).not.toContain(copy.stage.mode.timed);
  });

  it("shows TIMED m:ss, formatted from timeUsedSec, when the challenge is timed", () => {
    const html = renderCard(
      makeRep({ challenge: { ...baseChallenge, timeLimitSec: 300 }, timeUsedSec: 252 }),
    );
    expect(html).toContain(copy.stage.mode.timed);
    expect(html).toContain("4:12");
  });

  it("formats 245 seconds as 4:05", () => {
    const html = renderCard(makeRep({ challenge: { ...baseChallenge, timeLimitSec: 300 }, timeUsedSec: 245 }));
    expect(html).toContain("4:05");
  });

  it("is absent when the challenge is timed but timeUsedSec is null", () => {
    const html = renderCard(makeRep({ challenge: { ...baseChallenge, timeLimitSec: 300 }, timeUsedSec: null }));
    expect(html).not.toContain(copy.stage.mode.timed);
  });
});

describe("RepCard — Retry/Variation pill", () => {
  const fromRepId = "423e4567-e89b-42d3-a456-426614174000";

  it("shows no pill for a new or reroll Challenge", () => {
    for (const kind of ["new", "reroll"] as const) {
      const html = renderCard(makeRep({ challenge: { ...baseChallenge, origin: { kind, fromRepId: null } } }));
      expect(html).not.toContain(copy.rep.retry);
      expect(html).not.toContain(copy.rep.variation);
    }
  });

  it("shows the RETRY pill for a retry Challenge", () => {
    const html = renderCard(makeRep({ challenge: { ...baseChallenge, origin: { kind: "retry", fromRepId } } }));
    expect(html).toContain(copy.rep.retry);
    expect(html).not.toContain(copy.rep.variation);
  });

  it("shows the VARIATION pill for a variation Challenge", () => {
    const html = renderCard(makeRep({ challenge: { ...baseChallenge, origin: { kind: "variation", fromRepId } } }));
    expect(html).toContain(copy.rep.variation);
    expect(html).not.toContain(copy.rep.retry);
  });
});

describe("RepCard — Reflection", () => {
  it("shows no reflection block when reflection is null", () => {
    const html = renderCard(makeRep({ reflection: null }));
    expect(html).not.toContain(copy.rep.worked);
    expect(html).not.toContain(escaped(copy.rep.change));
  });

  it("shows both expanded answers under their question labels when reflection is present", () => {
    const html = renderCard(makeRep({ reflection: { worked: "The loose grip.", change: "Slow down more." } }));
    expect(html).toContain(copy.rep.worked);
    expect(html).toContain("The loose grip.");
    expect(html).toContain(escaped(copy.rep.change));
    expect(html).toContain("Slow down more.");
  });

  it("shows no reflection block when both answers are blank", () => {
    const html = renderCard(makeRep({ reflection: { worked: "", change: "" } }));
    expect(html).not.toContain(copy.rep.worked);
    expect(html).not.toContain(escaped(copy.rep.change));
  });

  it("shows only the non-blank answer", () => {
    const html = renderCard(makeRep({ reflection: { worked: " ", change: "Slow down more." } }));
    expect(html).not.toContain(copy.rep.worked);
    expect(html).toContain(escaped(copy.rep.change));
    expect(html).toContain("Slow down more.");
  });
});

describe("RepCard — read-only (UX-DR35)", () => {
  it("contains no links or buttons", () => {
    const html = renderCard(
      makeRep({
        challenge: { ...baseChallenge, timeLimitSec: 300 },
        timeUsedSec: 245,
        reflection: { worked: "The loose grip.", change: "Slow down more." },
      }),
    );
    expect(html).not.toContain("<a");
    expect(html).not.toContain("<button");
  });
});

describe("RepCard — snapshot only (AD-5)", () => {
  it("displays a retired library entry correctly, because it only reads the snapshot's revealText", () => {
    const html = renderCard(
      makeRep({
        challenge: {
          ...baseChallenge,
          inputs: {
            ...baseChallenge.inputs,
            skill: { id: "skl.long-since-removed", revealText: "A skill no longer in the library" },
          },
        },
      }),
    );
    expect(html).toContain("A skill no longer in the library");
  });
});

describe("PracticeHistory — ordering", () => {
  it("renders every Rep newest first by finishedAt, ties kept in array order", () => {
    // Markers distinguish cards in the rendered HTML (RepCard never renders a Rep's id); each
    // Rep gets its own Brief text so position in the markup reveals render order.
    const oldest = makeRep({
      id: "523e4567-e89b-42d3-a456-426614174000",
      finishedAt: "2026-10-01T00:00:00.000Z",
      challenge: { ...baseChallenge, brief: "Brief oldest" },
    });
    const newest = makeRep({
      id: "623e4567-e89b-42d3-a456-426614174000",
      finishedAt: "2026-10-09T00:00:00.000Z",
      challenge: { ...baseChallenge, brief: "Brief newest" },
    });
    const tieA = makeRep({
      id: "723e4567-e89b-42d3-a456-426614174000",
      finishedAt: "2026-10-05T00:00:00.000Z",
      challenge: { ...baseChallenge, brief: "Brief tieA" },
    });
    const tieB = makeRep({
      id: "823e4567-e89b-42d3-a456-426614174000",
      finishedAt: "2026-10-05T00:00:00.000Z",
      challenge: { ...baseChallenge, brief: "Brief tieB" },
    });

    const html = renderHistory([oldest, tieA, tieB, newest]);
    const order = ["Brief newest", "Brief tieA", "Brief tieB", "Brief oldest"].map((marker) => html.indexOf(marker));

    expect(order).toEqual([...order].sort((a, b) => a - b));
    for (const position of order) expect(position).toBeGreaterThanOrEqual(0);
  });

  it("has a visually hidden heading", () => {
    const html = renderHistory([makeRep()]);
    expect(html).toContain(copy.practice.historyTitle);
  });
});
