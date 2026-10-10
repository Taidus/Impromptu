import { createElement, Fragment } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { copy } from "@/components/copy";
import { Rep } from "@/domain/session/schema";
import { baseChallenge } from "@/domain/session/session-fixture";
import { PracticeView, type PracticeViewProps } from "./PracticeView";

const render = (props: PracticeViewProps) => renderToStaticMarkup(createElement(PracticeView, props));
// Copy as it appears in markup (React escapes apostrophes to &#x27;).
const escaped = (text: string) => renderToStaticMarkup(createElement(Fragment, null, text));

const action = createElement("a", { href: "/stage" }, copy.button.getAChallenge);
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
  action,
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
});
