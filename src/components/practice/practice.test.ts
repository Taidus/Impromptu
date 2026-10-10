import { createElement, Fragment } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { copy } from "@/components/copy";
import { practiceMap } from "@/domain/practice/practice-map";
import { Rep } from "@/domain/session/schema";
import { baseChallenge } from "@/domain/session/session-fixture";
import { PracticeView, type PracticeViewProps } from "./PracticeView";

const render = (props: PracticeViewProps) => renderToStaticMarkup(createElement(PracticeView, props));
// Copy as it appears in markup (React escapes apostrophes to &#x27;).
const escaped = (text: string) => renderToStaticMarkup(createElement(Fragment, null, text));

const action = createElement("a", { href: "/stage" }, copy.button.getAChallenge);
const exportControl = createElement("button", { type: "button" }, "EXPORT_MARKER");
const clearControl = createElement("button", { type: "button" }, "CLEAR_MARKER");
const reps = [
  Rep.parse({
    id: "323e4567-e89b-42d3-a456-426614174000",
    challenge: baseChallenge,
    finishedAt: "2026-10-09T12:00:00.000Z",
    timeUsedSec: null,
    reflection: null,
  }),
];
const base: PracticeViewProps = {
  status: "ready",
  storageAvailable: true,
  reps: [],
  map: null,
  action,
  exportControl,
  clearControl,
};

describe("PracticeView — loading", () => {
  const html = render({ ...base, status: "loading" });

  it("shows the quiet placeholder", () => {
    expect(html).toContain(copy.practice.loading);
    expect(html).toContain('aria-busy="true"');
  });

  it("renders no action", () => {
    expect(html).not.toContain(copy.button.getAChallenge);
    expect(html).not.toContain(copy.button.resume);
  });

  it("renders no history", () => {
    expect(html).not.toContain(copy.practice.historyTitle);
  });
});

describe("PracticeView — empty (no Reps)", () => {
  const html = render({ ...base, reps: [] });

  it('shows "Nothing here yet."', () => {
    expect(html).toContain(copy.state.nothingHereYet);
  });

  it("shows the Get a challenge link to /stage", () => {
    expect(html).toContain(copy.button.getAChallenge);
    expect(html).toContain('href="/stage"');
  });

  it("shows no storage note", () => {
    expect(html).not.toContain(copy.state.progressSavedInBrowserOnly);
  });

  it("renders no history", () => {
    expect(html).not.toContain(copy.practice.historyTitle);
  });

  it("renders no exportControl", () => {
    expect(html).not.toContain("EXPORT_MARKER");
  });

  it("renders no clearControl", () => {
    expect(html).not.toContain("CLEAR_MARKER");
  });
});

describe("PracticeView — with Reps", () => {
  const html = render({ ...base, reps });

  it("shows the storage note at the top", () => {
    expect(html).toContain(copy.state.progressSavedInBrowserOnly);
  });

  it('shows no "Nothing here yet."', () => {
    expect(html).not.toContain(copy.state.nothingHereYet);
  });

  it("renders the history", () => {
    expect(html).toContain(copy.practice.historyTitle);
  });

  it("renders no Map when map is null (library not loaded yet)", () => {
    expect(html).not.toContain(copy.practice.mapGroups.skill);
    expect(html).not.toContain(copy.state.practiceMapDisclaimer);
  });

  it("renders exportControl right-aligned above the history", () => {
    expect(html).toContain("EXPORT_MARKER");
    expect(html.indexOf("EXPORT_MARKER")).toBeLessThan(html.indexOf(copy.practice.historyTitle));
  });

  it("renders clearControl beside exportControl, above the history", () => {
    expect(html).toContain("CLEAR_MARKER");
    expect(html.indexOf("CLEAR_MARKER")).toBeLessThan(html.indexOf(copy.practice.historyTitle));
  });
});

describe("PracticeView — with Reps and a Map", () => {
  const library = {
    skills: [{ id: baseChallenge.inputs.skill.id, revealText: baseChallenge.inputs.skill.revealText }],
    mediums: [{ id: baseChallenge.inputs.medium.id, revealText: baseChallenge.inputs.medium.revealText }],
  };
  const html = render({ ...base, reps, map: practiceMap(reps, library) });

  it("renders the Map above the history", () => {
    const mapIndex = html.indexOf(escaped(copy.state.practiceMapDisclaimer));
    const historyIndex = html.indexOf(copy.practice.historyTitle);
    expect(mapIndex).toBeGreaterThan(-1);
    expect(historyIndex).toBeGreaterThan(mapIndex);
  });
});

describe("PracticeView — a non-null Map is hidden without Reps or storage", () => {
  const library = { skills: [], mediums: [] };

  it("renders no Map with reps: []", () => {
    const html = render({ ...base, reps: [], map: practiceMap([], library) });
    expect(html).not.toContain(escaped(copy.state.practiceMapDisclaimer));
  });

  it("renders no Map when storage is unavailable", () => {
    const html = render({ ...base, storageAvailable: false, reps, map: practiceMap(reps, library) });
    expect(html).not.toContain(escaped(copy.state.practiceMapDisclaimer));
  });
});

describe("PracticeView — storage unavailable", () => {
  const html = render({ ...base, storageAvailable: false, reps: [] });

  it("shows the unavailable copy", () => {
    expect(html).toContain(escaped(copy.practice.storageUnavailable));
  });

  it("shows the action", () => {
    expect(html).toContain(copy.button.getAChallenge);
    expect(html).toContain('href="/stage"');
  });

  it("shows no storage note", () => {
    expect(html).not.toContain(copy.state.progressSavedInBrowserOnly);
  });

  it("renders no history", () => {
    expect(html).not.toContain(copy.practice.historyTitle);
  });

  it("renders no exportControl", () => {
    expect(html).not.toContain("EXPORT_MARKER");
  });

  it("renders no clearControl", () => {
    expect(html).not.toContain("CLEAR_MARKER");
  });
});

describe("PracticeView — error status", () => {
  it("renders like ready", () => {
    for (const props of [{ ...base }, { ...base, reps }, { ...base, storageAvailable: false }]) {
      expect(render({ ...props, status: "error" })).toBe(render(props));
    }
  });
});

describe("PracticeView — storage unavailable, with Reps", () => {
  const html = render({ ...base, storageAvailable: false, reps });

  it("shows the unavailable copy and no storage note", () => {
    expect(html).toContain(escaped(copy.practice.storageUnavailable));
    expect(html).not.toContain(copy.state.progressSavedInBrowserOnly);
  });

  it("renders no exportControl", () => {
    expect(html).not.toContain("EXPORT_MARKER");
  });

  it("renders no clearControl", () => {
    expect(html).not.toContain("CLEAR_MARKER");
  });
});
