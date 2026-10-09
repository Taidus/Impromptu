import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { loadLibrary } from "./load";

function writeJson(filePath: string, data: unknown) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data));
}

describe("loadLibrary — real content tree", () => {
  it("loads content/library with zero issues (anchors only, no batches yet)", () => {
    const lib = loadLibrary(path.resolve(__dirname, "../.."));
    expect(lib.issues).toEqual([]);
    expect(lib.skills).toHaveLength(6);
    expect(lib.mediums).toHaveLength(4);
    expect(lib.templates).toHaveLength(3);
    expect(lib.anchors).toHaveLength(3);
    expect(lib.manifests).toHaveLength(0); // content/library/batches/ holds only .gitkeep so far
  });
});

describe("loadLibrary — batch folders", () => {
  let root: string;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), "library-load-test-"));
    const lib = path.join(root, "content", "library");
    writeJson(path.join(lib, "skills.json"), []);
    writeJson(path.join(lib, "mediums.json"), []);
    writeJson(path.join(lib, "tags.json"), [{ id: "t", description: "t" }]);
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  it("applies batches in folder-name order and carries each entity's source batch", () => {
    const batches = path.join(root, "content", "library", "batches");
    const manifest = (extra: Record<string, unknown>) => ({
      status: "draft",
      generator: { tool: "cli", model: "m", promptVersion: "1" },
      rubricVersion: "1",
      review: null,
      ...extra,
    });

    // Written out of order on disk; folder-name order (AD-6) is what matters.
    writeJson(path.join(batches, "2026-02-01-topics-pilot-02", "manifest.json"), manifest({}));
    writeJson(path.join(batches, "2026-02-01-topics-pilot-02", "topics.json"), [
      { id: "top.beta", revealText: "Beta", briefText: "beta", tags: ["t"], requires: [], excludes: [] },
    ]);
    writeJson(
      path.join(batches, "2026-01-01-topics-pilot-01", "manifest.json"),
      manifest({ status: "accepted", review: { judge: "m", founderSample: 1, rejectedIds: [], date: "2026-01-01" } }),
    );
    writeJson(path.join(batches, "2026-01-01-topics-pilot-01", "topics.json"), [
      { id: "top.alpha", revealText: "Alpha", briefText: "alpha", tags: ["t"], requires: [], excludes: [] },
    ]);

    const lib = loadLibrary(root);
    expect(lib.issues).toEqual([]);
    expect(lib.manifests.map((m) => m.source)).toEqual(["2026-01-01-topics-pilot-01", "2026-02-01-topics-pilot-02"]);
    expect(lib.topics.map((t) => [t.value.id, t.source])).toEqual([
      ["top.alpha", "2026-01-01-topics-pilot-01"],
      ["top.beta", "2026-02-01-topics-pilot-02"],
    ]);
  });

  it("reports a missing manifest.json as an issue and skips that folder's content", () => {
    const batches = path.join(root, "content", "library", "batches");
    fs.mkdirSync(path.join(batches, "2026-03-01-topics-oops"), { recursive: true });

    const lib = loadLibrary(root);
    expect(lib.issues).toHaveLength(1);
    expect(lib.issues[0].message).toMatch(/no manifest\.json/);
    expect(lib.manifests).toEqual([]);
  });

  it("reports an invalid manifest as an issue, naming the folder", () => {
    const batches = path.join(root, "content", "library", "batches");
    writeJson(path.join(batches, "2026-03-01-topics-bad-manifest", "manifest.json"), { status: "not-a-status" });

    const lib = loadLibrary(root);
    expect(lib.issues).toHaveLength(1);
    expect(lib.issues[0].source).toContain("2026-03-01-topics-bad-manifest");
  });

  it("reports one bad entry without blocking the rest of the file", () => {
    const batches = path.join(root, "content", "library", "batches");
    writeJson(path.join(batches, "2026-04-01-topics-mixed", "manifest.json"), {
      status: "draft",
      generator: { tool: "cli", model: "m", promptVersion: "1" },
      rubricVersion: "1",
      review: null,
    });
    writeJson(path.join(batches, "2026-04-01-topics-mixed", "topics.json"), [
      { id: "top.good", revealText: "Good", briefText: "good", tags: [], requires: [], excludes: [] },
      { id: "not-a-topic-id", revealText: "Bad", briefText: "bad", tags: [], requires: [], excludes: [] },
    ]);

    const lib = loadLibrary(root);
    expect(lib.topics.map((t) => t.value.id)).toEqual(["top.good"]);
    expect(lib.issues).toHaveLength(1);
    expect(lib.issues[0].message).toContain("not-a-topic-id");
  });
});
