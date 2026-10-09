import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BatchManifest } from "../../src/domain/library/schema";
import { buildManifest, createBatch, isSlug, nextBatchSeq, parseVersionHeader, todayDate } from "./new-batch";

// Only `readdirSync` is wrapped (as a pass-through spy); every other fs export is real.
// This lets one test simulate a stale directory listing (a concurrent-run race) without
// touching the real filesystem for anything else.
vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>();
  return { ...actual, readdirSync: vi.fn(actual.readdirSync) };
});

describe("isSlug", () => {
  it("accepts lowercase kebab slugs", () => {
    expect(isSlug("general")).toBe(true);
    expect(isSlug("observation-explore")).toBe(true);
  });

  it("rejects anything else", () => {
    for (const bad of ["General", "has space", "trailing-", "-leading", "has/slash", "has.dot", ""]) {
      expect(isSlug(bad)).toBe(false);
    }
  });
});

describe("parseVersionHeader", () => {
  it("reads the version from a 'Version: x' line", () => {
    expect(parseVersionHeader("Version: 1.2.3\n\n# Title\n")).toBe("1.2.3");
  });

  it("throws when no version header exists", () => {
    expect(() => parseVersionHeader("# Title\n")).toThrow(/version/i);
  });

  it("does not cross a newline between 'Version:' and the value", () => {
    expect(() => parseVersionHeader("Version:\n\n1.2.3\n")).toThrow(/version/i);
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

  it("does not let a scope that is a prefix of another collide", () => {
    // "general-2" is a different scope than "general"; the old indexOf-based scan
    // could be fooled into reading its "-01" as a sequence number for "general".
    const existing = ["2026-10-01-topics-general-2-01"];
    expect(nextBatchSeq(existing, "topics", "general")).toBe("01");
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
  it("formats as YYYY-MM-DD using local calendar fields", () => {
    expect(todayDate(new Date(2026, 9, 9, 23, 30))).toBe("2026-10-09");
  });
});

describe("createBatch (integration)", () => {
  let dir: string;

  afterEach(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  function setup() {
    dir = mkdtempSync(join(tmpdir(), "library-new-batch-"));
    const promptPath = join(dir, "PROMPT.md");
    const rubricPath = join(dir, "RUBRIC.md");
    writeFileSync(promptPath, "Version: 2.0.0\n\n# Prompt\n");
    writeFileSync(rubricPath, "Version: 3.0.0\n\n# Rubric\n");
    const batchesDir = join(dir, "batches");
    mkdirSync(batchesDir, { recursive: true });
    const now = new Date(2026, 9, 9);
    return { promptPath, rubricPath, batchesDir, now };
  }

  it("scaffolds a folder with a valid manifest and an empty kind file, auto-incrementing on repeat", () => {
    const { promptPath, rubricPath, batchesDir, now } = setup();

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

  it("rejects a scope that is not a lowercase kebab slug", () => {
    const { promptPath, rubricPath, batchesDir, now } = setup();
    expect(() => createBatch({ kind: "topics", scope: "Not A Slug", batchesDir, promptPath, rubricPath, now })).toThrow(/slug/i);
  });

  it("throws instead of overwriting when the target folder already exists (stale listing / race)", () => {
    const { promptPath, rubricPath, batchesDir, now } = setup();
    const collidingName = `${todayDate(now)}-topics-general-01`;
    mkdirSync(join(batchesDir, collidingName));
    // Simulate a listing read before the race's winner created its folder.
    vi.mocked(readdirSync).mockReturnValueOnce([] as unknown as ReturnType<typeof readdirSync>);
    expect(() => createBatch({ kind: "topics", scope: "general", batchesDir, promptPath, rubricPath, now })).toThrow();
  });
});
