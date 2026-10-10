import { createElement, Fragment } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { copy } from "@/components/copy";
import { PracticeView, type PracticeViewProps } from "./PracticeView";

const render = (props: PracticeViewProps) => renderToStaticMarkup(createElement(PracticeView, props));
// Copy as it appears in markup (React escapes apostrophes to &#x27;).
const escaped = (text: string) => renderToStaticMarkup(createElement(Fragment, null, text));

const base: PracticeViewProps = {
  status: "ready",
  storageAvailable: true,
  repCount: 0,
  attemptActive: false,
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
});

describe("PracticeView — empty (no Reps)", () => {
  const html = render({ ...base, repCount: 0 });

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
});

describe("PracticeView — empty, Attempt active", () => {
  const html = render({ ...base, repCount: 0, attemptActive: true });

  it("shows Resume instead of Get a challenge", () => {
    expect(html).toContain(copy.button.resume);
    expect(html).not.toContain(copy.button.getAChallenge);
  });
});

describe("PracticeView — with Reps", () => {
  const html = render({ ...base, repCount: 3 });

  it("shows the storage note at the top", () => {
    expect(html).toContain(copy.state.progressSavedInBrowserOnly);
  });

  it('shows no "Nothing here yet."', () => {
    expect(html).not.toContain(copy.state.nothingHereYet);
  });
});

describe("PracticeView — storage unavailable", () => {
  const html = render({ ...base, storageAvailable: false, repCount: 0 });

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
});

describe("PracticeView — error status", () => {
  it("renders like ready", () => {
    for (const props of [{ ...base }, { ...base, repCount: 3 }, { ...base, storageAvailable: false }]) {
      expect(render({ ...props, status: "error" })).toBe(render(props));
    }
  });
});

describe("PracticeView — storage unavailable, with Reps", () => {
  const html = render({ ...base, storageAvailable: false, repCount: 3 });

  it("shows the unavailable copy and no storage note", () => {
    expect(html).toContain(escaped(copy.practice.storageUnavailable));
    expect(html).not.toContain(copy.state.progressSavedInBrowserOnly);
  });
});
