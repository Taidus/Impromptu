import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { copy } from "@/components/copy";
import { ExportButtonView } from "./ExportButton";

const render = (message: string | null) =>
  renderToStaticMarkup(createElement(ExportButtonView, { onExport: () => {}, message }));

describe("ExportButtonView", () => {
  it("renders the Export button and an empty, always-mounted status before exporting", () => {
    const html = render(null);
    expect(html).toContain(`<button type="button"`);
    expect(html).toContain(copy.button.export);
    expect(html).toMatch(/role="status"/);
    expect(html).not.toContain(copy.state.exported);
    expect(html).not.toContain("aria-describedby");
  });

  it('shows "Exported." in ink-soft body type, linked from the button', () => {
    const html = render(copy.state.exported);
    expect(html).toContain(copy.state.exported);
    expect(html).toMatch(/role="status"/);
    expect(html).toContain("text-ink-soft");
    expect(html).not.toContain("text-cream-dim");
    const id = /<p id="([^"]+)" role="status"/.exec(html)?.[1];
    expect(id).toBeTruthy();
    expect(html).toContain(`aria-describedby="${id}"`);
  });

  it('shows "Export failed." when the export threw', () => {
    expect(render(copy.state.exportFailed)).toContain(copy.state.exportFailed);
  });
});
