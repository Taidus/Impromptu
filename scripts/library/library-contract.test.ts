import path from "node:path";
import { describe, expect, it } from "vitest";
import { loadLibrary as loadAppLibrary } from "@/adapters/library";
import { buildPayload } from "./build";
import { gateConfig } from "./gate-config";
import { runGate } from "./gate";
import { filterAccepted, loadLibrary } from "./load";

// Contract between Story 1.7's build output and Story 3.6's runtime loader: the payload that
// build.ts writes to src/generated/library.json must pass the app's LibraryFile validation.
describe("generated library contract", () => {
  it("the real content's build payload loads through the app's library loader", async () => {
    const root = path.resolve(__dirname, "../..");
    const lib = filterAccepted(loadLibrary(root), root);
    const report = runGate(lib, gateConfig);
    expect(report.ok).toBe(true);

    const result = await loadAppLibrary(async () => JSON.parse(JSON.stringify(buildPayload(lib, report))));
    expect(result).toMatchObject({ ok: true });
  });
});
