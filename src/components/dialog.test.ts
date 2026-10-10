import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { copy } from "@/components/copy";
import { InkButton } from "@/components/InkButton";
import { LineButton } from "@/components/LineButton";
import { Dialog } from "./Dialog";

// The Story 6.5 Clear all data shape: title plus the two buttons it holds as children.
const render = () =>
  renderToStaticMarkup(
    createElement(
      Dialog,
      { title: copy.practice.clearAllTitle },
      createElement(LineButton, { key: "keep", ground: "paper" }, copy.button.keepMyData),
      createElement(InkButton, { key: "clear", ground: "paper" }, copy.button.clearEverything),
    ),
  );

describe("Dialog", () => {
  const html = render();

  it("renders a native <dialog> labelled by its title", () => {
    expect(html).toContain("<dialog");
    expect(html).toContain(copy.practice.clearAllTitle);
    expect(html).toMatch(/aria-labelledby="[^"]+"/);
  });

  it("renders both buttons", () => {
    expect(html).toContain(copy.button.keepMyData);
    expect(html).toContain(copy.button.clearEverything);
  });
});
