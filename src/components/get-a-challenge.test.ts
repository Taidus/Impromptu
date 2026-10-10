import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { copy } from "@/components/copy";
import { GetAChallengeButtonView } from "./GetAChallengeButton";

const render = (props: Partial<Parameters<typeof GetAChallengeButtonView>[0]> = {}) =>
  renderToStaticMarkup(
    createElement(GetAChallengeButtonView, {
      ground: "paper",
      label: copy.button.getAChallenge,
      failed: false,
      errorId: "err",
      onClick: () => {},
      ...props,
    }),
  );

describe("GetAChallengeButtonView", () => {
  it("renders a button with the label and no error", () => {
    const html = render();
    expect(html).toContain(`<button type="button"`);
    expect(html).toContain(copy.button.getAChallenge);
    expect(html).not.toContain(copy.stage.composeError);
    expect(html).not.toContain("aria-describedby");
  });

  it("reads Resume when told to", () => {
    expect(render({ label: copy.button.resume })).toContain(copy.button.resume);
  });

  it("shows the compose error and links it from the button when failed", () => {
    const html = render({ failed: true });
    expect(html).toContain(copy.stage.composeError);
    expect(html).toContain('aria-describedby="err"');
  });

  it("is disabled before the store is ready", () => {
    expect(render({ disabled: true })).toMatch(/<button[^>]*\sdisabled/);
  });
});
