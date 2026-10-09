import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { BatchManifest } from "../../src/domain/library/schema";
import { buildManifest, createBatch, nextBatchSeq, parseVersionHeader, todayDate } from "./new-batch";

describe("parseVersionHeader", () => {
  it("reads the version from a 'Version: x' line", () => {
    expect(parseVersionHeader("Version: 1.2.3\n\n# Title\n")).toBe("1.2.3");
  });

  it("throws when no version header exists", () => {
    expect(() => parseVersionHeader("# Title\n")).toThrow(/version/i);
  });
});

describe("nextBatchSeq", () => {
  it("starts at 01 with no existing folders", () => {
    expect(nextBatchSeq([], "topics", "general")).toBe("01");
  });

  it("increments past the highest existing sequence for the same kind+scope", () => {
    const existing = ["2026-10-01-topics-general-01", "2026-10-05-topics-general-02"];
    expect(nextBatchSeq(existing, "topics", "general")).toBe("03");
  });

  it("ignores folders for a different kind or scope", () => {
    const existing = ["2026-10-01-topics-general-09", "2026-10-01-styles-general-05"];
    expect(nextBatchSeq(existing, "constraints", "general")).toBe("01");
  });
});

describe("buildManifest", () => {
  it("produces a schema-valid draft manifest", () => {
    const manifest = buildManifest("1.0.0", "1.0.0");
    expect(BatchManifest.parse(manifest)).toEqual(manifest);
    expect(manifest.status).toBe("draft");
    expect(manifest.review).toBeNull();
  });
});

describe("todayDate", () => {
  it("formats as YYYY-MM-DD", () => {
    expect(todayDate(new Date("2026-10-09T15:00:00Z"))).toBe("2026-10-09");
  });
});

describe("createBatch (integration)", () => {
  let dir: string;

  afterEach(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
  });

  it("scaffolds a folder with a valid manifest and an empty kind file, auto-incrementing on repeat", () => {
    dir = mkdtempSync(join(tmpdir(), "library-new-batch-"));
    const promptPath = join(dir, "PROMPT.md");
    const rubricPath = join(dir, "RUBRIC.md");
    writeFileSync(promptPath, "Version: 2.0.0\n\n# Prompt\n");
    writeFileSync(rubricPath, "Version: 3.0.0\n\n# Rubric\n");
    const batchesDir = join(dir, "batches");
    const now = new Date("2026-10-09T00:00:00Z");

    const first = createBatch({ kind: "topics", scope: "general", batchesDir, promptPath, rubricPath, now });
    expect(first.folderPath.endsWith("2026-10-09-topics-general-01")).toBe(true);

    const manifest = BatchManifest.parse(JSON.parse(readFileSync(first.manifestPath, "utf8")));
    expect(manifest).toEqual({
      status: "draft",
      generator: { tool: "TBD", model: "TBD", promptVersion: "2.0.0" },
      rubricVersion: "3.0.0",
      review: null,
      edits: [],
      retire: [],
    });
    expect(JSON.parse(readFileSync(first.kindFilePath, "utf8"))).toEqual([]);

    const second = createBatch({ kind: "topics", scope: "general", batchesDir, promptPath, rubricPath, now });
    expect(second.folderPath.endsWith("2026-10-09-topics-general-02")).toBe(true);
  });
});
